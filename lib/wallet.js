// Talking to a Solana wallet in the browser.
//
// No adapter library. Every wallet worth supporting injects the same handful of
// methods on `window`, and the three this needs — connect, signMessage, the
// public key — have been stable for years. A wallet adapter is ~200KB to call
// them, and this game's first paint already carries a renderer.
//
// NOTHING HERE PROVES ANYTHING. The signature it produces is checked on the
// server (lib/server/solana.js); this file's only job is to ask for one. A
// wallet that lies about its own address gets nowhere, because the server
// verifies the signature against the address it was given.

/** The injected provider, or null. Phantom and Solflare both expose
 *  `window.solana`; Solflare also uses `window.solflare`. */
export function getProvider() {
  if (typeof window === "undefined") return null;
  const p = window.phantom?.solana || window.solana || window.solflare || null;
  return p && (p.isPhantom || p.isSolflare || p.signMessage) ? p : null;
}

export const hasWallet = () => !!getProvider();

/** Where to send somebody who has no wallet at all. Phantom is the default
 *  because it is the one most people already have. */
export const INSTALL_URL = "https://phantom.app/";

/**
 * Connect, sign the server's challenge, and come back with a session cookie.
 *
 * The message is built by the SERVER and signed as-is. Building it here would
 * mean the client decides what it is agreeing to, and a wallet that signs
 * whatever it is handed is exactly the phishing surface the domain binding
 * exists to close.
 */
export async function signIn() {
  const provider = getProvider();
  if (!provider) {
    const e = new Error("No Solana wallet found in this browser.");
    e.code = "NO_WALLET";
    throw e;
  }

  const { publicKey } = await provider.connect();
  const address = publicKey.toString();

  const challenge = await postJSON("/api/auth/nonce", { address });
  const encoded = new TextEncoder().encode(challenge.message);
  const signed = await provider.signMessage(encoded, "utf8");

  // Wallets differ: some hand back `{ signature }`, some the bytes directly.
  const bytes = signed?.signature ?? signed;
  const signature = base58Encode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));

  await postJSON("/api/auth/verify", {
    address,
    nonce: challenge.nonce,
    issuedAt: challenge.issuedAt,
    signature,
  });
  return { address };
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
}

// ---------------------------------------------------------------------------

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** bytes → base58. The mirror of the decoder on the server. */
export function base58Encode(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (const b of bytes) {
    if (b === 0) out += "1";
    else break;
  }
  return out + digits.reverse().map((d) => B58[d]).join("");
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // The session cookie is the point of the whole exchange.
    credentials: "same-origin",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Sign-in failed (${res.status})`);
  }
  return json;
}
