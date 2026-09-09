// Solana, from the server, with no dependency.
//
// Two jobs: decode a base58 address, and check an ed25519 signature. Node's
// crypto does ed25519 natively; a Solana public key is the raw 32-byte key, so
// it only needs wrapping in the SPKI header the WebCrypto/OpenSSL API expects.
// That is twelve constant bytes, and it saves pulling a signature library into
// a codebase whose whole security argument is "the server decides".

import "server-only";
import { createPublicKey, verify as cryptoVerify } from "node:crypto";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** base58 → bytes. Returns null for anything that is not valid base58, which
 *  is a rejection rather than a throw: a malformed address is a 400, and the
 *  caller says so in its own words.
 *
 *  THE LENGTH BOUND IS 128, NOT 64. It was 64 — a number picked for addresses,
 *  which are 44 characters — and a 64-byte ed25519 signature is EIGHTY-EIGHT
 *  characters in base58. So every real signature decoded to null and every
 *  sign-in was refused, while the test that checks a forged signature is
 *  refused passed for entirely the wrong reason. The bound is a sanity limit on
 *  input size; the actual length check belongs to the caller, which knows
 *  whether it wanted 32 bytes or 64. */
export function base58Decode(str) {
  if (typeof str !== "string" || !str.length || str.length > 128) return null;
  const bytes = [0];
  for (const ch of str) {
    const value = B58.indexOf(ch);
    if (value === -1) return null;
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading '1's are leading zero bytes.
  for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

/** A Solana address is a 32-byte ed25519 public key in base58. */
export function isAddress(str) {
  const b = base58Decode(str);
  return !!b && b.length === 32;
}

// ASN.1 SPKI header for an ed25519 public key. Constant.
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Verify that `address` signed `message`.
 *
 * Returns false rather than throwing on every kind of malformed input — a
 * forged signature and a corrupt one are the same answer to the caller, and a
 * thrown exception here would be a way to tell them apart.
 */
export function verifySignature(address, message, signatureBase58) {
  try {
    const pub = base58Decode(address);
    const sig = base58Decode(signatureBase58);
    if (!pub || pub.length !== 32) return false;
    if (!sig || sig.length !== 64) return false;

    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(pub)]),
      format: "der",
      type: "spki",
    });
    return cryptoVerify(null, Buffer.from(message, "utf8"), key, Buffer.from(sig));
  } catch {
    return false;
  }
}

/**
 * The message a wallet is asked to sign.
 *
 * IT NAMES THE DOMAIN, and that is the point. A signature that says only
 * "prove you own this wallet" can be collected by any site and replayed here.
 * Binding the domain and a single-use nonce into the text means a signature
 * phished elsewhere is a signature for somewhere else. This is the SIWS shape
 * — docs/security.md §4, "Phish a signature from another site".
 */
export function loginMessage({ domain, address, nonce, issuedAt }) {
  return [
    `${domain} wants you to sign in with your Solana account:`,
    address,
    "",
    "Sign this message to prove the wallet is yours. It is not a transaction and it moves nothing.",
    "",
    `Domain: ${domain}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}
