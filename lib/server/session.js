// Who is asking.
//
// THE SESSION TOKEN NEVER TOUCHES localStorage. It is an httpOnly, Secure,
// SameSite cookie, because script can read localStorage and cannot read an
// httpOnly cookie — docs/security.md §4 "Ownership and identity".
//
// The token is stored HASHED. A leaked database dump must not be a stack of
// working logins; the server hashes what the browser sends and looks up the
// hash, exactly as it would with a password.
//
// Everything downstream takes the player id FROM HERE and never from the
// request body. That single rule is what closes IDOR: there is no code path
// where a client-supplied id decides whose cats get levelled.

import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db.js";

export const COOKIE = "tt_session";
const TTL_DAYS = 30;

const hash = (token) => createHash("sha256").update(token).digest("hex");

/** Mint a session for a player and set the cookie. */
export async function startSession(playerId, userAgent = null) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TTL_DAYS * 86_400_000);

  await db.insert("sessions", {
    token_hash: hash(token),
    player_id: playerId,
    expires_at: expires.toISOString(),
    user_agent: userAgent ? String(userAgent).slice(0, 300) : null,
  });

  cookies().set(COOKIE, token, {
    httpOnly: true,
    // Secure is unconditional in production. In local development over plain
    // http a Secure cookie is simply dropped, and the whole app looks logged
    // out for reasons nothing explains.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return token;
}

/** The player id for this request, or null. Never throws — a missing or bad
 *  cookie is an anonymous visitor, not an error. */
export async function currentPlayerId() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const row = await db.one(
    "sessions",
    `token_hash=eq.${encodeURIComponent(hash(token))}&select=player_id,expires_at,revoked_at`
  );
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row.player_id;
}

/** The player id, or a 401. For route handlers that require a login. */
export async function requirePlayerId() {
  const id = await currentPlayerId();
  if (!id) {
    const err = new Error("Sign in first.");
    err.status = 401;
    err.expose = true;
    throw err;
  }
  return id;
}

export async function endSession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) {
    await db
      .update("sessions", `token_hash=eq.${encodeURIComponent(hash(token))}`, {
        revoked_at: new Date().toISOString(),
      })
      .catch(() => {});
  }
  cookies().delete(COOKIE);
}

/** Constant-time compare, for anywhere a secret is checked by value.
 *  A plain `===` on a secret leaks its prefix through timing. */
export function sameSecret(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}
