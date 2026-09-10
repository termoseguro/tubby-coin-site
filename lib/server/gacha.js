// THE ROLL HAPPENS HERE, AND IT CAN BE CHECKED AFTERWARDS.
//
// Publishing the odds is transparency. Letting the client compute the result is
// suicide — docs/security.md §4, "Gacha". So the wheel is spun on the server,
// with a CSPRNG, and the currency is spent in the same write that records what
// came out. Disconnecting after a bad result must not undo it.
//
// COMMIT–REVEAL, and it protects US as much as the player.
//
//   1. The server holds a secret seed and publishes `sha256(secret)` up front.
//   2. A roll is HMAC(secret, `clientSeed:nonce:counter`) — deterministic, and
//      unguessable without the secret.
//   3. When the seed retires, the secret is revealed. Anyone can then replay
//      every roll made under it and confirm the game did what it said.
//
// The third step is the one that matters commercially. When an angry whale says
// the box was rigged, "trust us" is not an answer and a screenshot is not
// evidence. A published seed and a reproducible HMAC is.
//
// The nonce is per player and MONOTONIC, enforced by a unique constraint. The
// same client seed cannot be replayed for the same result, and two concurrent
// spins cannot land on the same nonce — the database decides, not an `if`.

import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { db } from "./db.js";

/** Get the seed in use, minting one on first ever spin. */
export async function activeSeed() {
  const row = await db.one("gacha_seeds", "active=is.true&select=id,secret,seed_hash");
  if (row?.secret) return row;

  const secret = randomBytes(32).toString("hex");
  const seed_hash = createHash("sha256").update(secret).digest("hex");
  // `claim` because two first-ever spins can race here, and the partial unique
  // index on `active` means exactly one of them wins.
  const made = await db.claim("gacha_seeds", { secret, seed_hash, active: true });
  if (made) return made;
  return db.one("gacha_seeds", "active=is.true&select=id,secret,seed_hash");
}

/** What the player is told before they spin: the commitment, and nothing that
 *  would let them predict a roll. */
export async function commitment() {
  const seed = await activeSeed();
  return { seedId: seed.id, seedHash: seed.seed_hash };
}

/**
 * A deterministic stream of floats in [0, 1).
 *
 * Every call advances a counter that is part of the HMAC message, so a spin
 * that needs three numbers (pity check, rarity, which hero) uses three
 * different ones and all three are reproducible from the same inputs.
 */
export function makeRng(secret, clientSeed, nonce) {
  let counter = 0;
  return () => {
    const mac = createHmac("sha256", secret)
      .update(`${clientSeed}:${nonce}:${counter++}`)
      .digest();
    // 52 bits, the most a double holds exactly. Taking 32 would quietly halve
    // the resolution of every odds comparison.
    const value = mac.readUIntBE(0, 6) / 2 ** 48;
    return value;
  };
}

/**
 * Claim the next nonce for this player.
 *
 * Bumped with a CONDITIONAL update: `gacha_nonce=eq.<what we read>`. Two spins
 * in flight cannot both take the same number — the loser affects zero rows and
 * is told to try again, which is the same mechanism the town uses for its
 * version. An `UPDATE ... SET n = n + 1` without the condition would look
 * atomic and would let both callers read the same value first.
 */
export async function nextNonce(playerId) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await db.one("towns", `player_id=eq.${playerId}&select=gacha_nonce`);
    const current = row?.gacha_nonce ?? 0;
    const written = await db.update(
      "towns",
      `player_id=eq.${playerId}&gacha_nonce=eq.${current}`,
      { gacha_nonce: current + 1 }
    );
    if (written && written.length === 1) return current + 1;
  }
  const e = new Error("The wheel is busy. Try again.");
  e.status = 409;
  e.expose = true;
  throw e;
}

/**
 * Record what happened, in the same breath as the spend.
 *
 * The unique constraint on (player_id, nonce) is the last line of defence: if
 * anything upstream ever hands the same nonce out twice, the second write
 * fails rather than producing two rolls from one payment.
 */
export async function recordRoll({ playerId, seedId, nonce, clientSeed, wheel, result, cost }) {
  const row = await db.claim("gacha_rolls", {
    player_id: playerId,
    seed_id: seedId,
    nonce,
    client_seed: clientSeed,
    wheel,
    result,
    cost,
  });
  if (!row) {
    const e = new Error("That spin was already recorded.");
    e.status = 409;
    e.expose = true;
    throw e;
  }
  return row;
}

/** A player's own roll history — the receipts they can check later. */
export function rollsFor(playerId, limit = 50) {
  return db.select(
    "gacha_rolls",
    `player_id=eq.${playerId}&select=nonce,wheel,result,cost,created_at,seed_id&order=nonce.desc&limit=${limit}`
  );
}
