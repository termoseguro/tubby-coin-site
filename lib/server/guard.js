// The things every mutating endpoint has to do before it does anything.
//
// Rate limit, idempotency, and input validation. All three are boring and all
// three are the difference between a game and a faucet — docs/security.md §4
// "Input handling".

import "server-only";
import { db } from "./db.js";

// ---------------------------------------------------------------------------
//  RATE LIMITING
//
//  In the database, not in memory. A serverless function's memory does not
//  survive a cold start and is not shared between instances, so an in-memory
//  counter is a rate limit that resets whenever the attacker is lucky — which,
//  at the request rate an attacker uses, is constantly.
// ---------------------------------------------------------------------------

/** Windows are fixed rather than sliding: one row per bucket per window, and
 *  the primary key does the work. A sliding window needs a sorted set and a
 *  round trip per request; this needs one statement.
 *
 *  THE INCREMENT IS IN THE DATABASE, IN ONE STATEMENT. The first version read
 *  the row, added one in JavaScript and wrote it back — so two concurrent
 *  requests read the same number and wrote the same number, and the ceiling was
 *  bypassed by sending requests in parallel, which is how they arrive when it
 *  matters. Moving the counter to the database fixed durability across cold
 *  starts and left atomicity out; `bump_rate_limit` closes it. */
export async function rateLimit(playerId, bucket, { max, windowSec }) {
  const now = Date.now();
  const start = new Date(Math.floor(now / (windowSec * 1000)) * windowSec * 1000).toISOString();

  let count;
  try {
    count = await db.rpc("bump_rate_limit", {
      p_bucket: bucket,
      p_player: playerId,
      p_window: start,
    });
  } catch (e) {
    // PostgREST answers a missing function with 404 / PGRST202, and db.rpc
    // THROWS rather than returning — so the first version of this, which only
    // checked the return value, never ran its own fallback and turned every
    // intent into a 400 instead. npm run check:api caught it.
    //
    // A missing function means the migration has not been run: a deployment
    // step, not something the player got wrong. Fail open and say so loudly.
    // Anything else is a real database failure and still throws, because a
    // rate limiter that swallows errors is one that silently stops limiting.
    const missing = e?.status === 404 || e?.code === "PGRST202";
    if (!missing) throw e;
    console.error(
      "[guard] bump_rate_limit does not exist — run 'npm run db:push'. " +
        "Rate limiting is NOT being enforced until it does."
    );
    return { ok: true, remaining: max };
  }

  const n = Number(count);
  if (!Number.isFinite(n)) {
    console.error("[guard] bump_rate_limit returned", count, "— not a count.");
    return { ok: true, remaining: max };
  }
  if (n > max) throw userError("Too many requests. Slow down.", 429);
  return { ok: true, remaining: max - n };
}

// ---------------------------------------------------------------------------
//  IDEMPOTENCY
//
//  "The network dropped, tap it again" and "double-submit to get two rewards"
//  are the same request. The key decides which one it was.
// ---------------------------------------------------------------------------

/** Claim a key. Returns { fresh: true } to proceed, or { fresh: false,
 *  response } to replay a stored answer. Throws 409 if the same key was used
 *  for a DIFFERENT intent — that is not a retry, that is confusion or an
 *  attack, and replaying the wrong stored response would be worse than both. */
export async function claimIdempotency(playerId, key, intent) {
  if (!key) return { fresh: true, key: null };
  const made = await db.claim("idempotency_keys", { key, player_id: playerId, intent });
  if (made) return { fresh: true, key };

  const row = await db.one(
    "idempotency_keys",
    `player_id=eq.${playerId}&key=eq.${encodeURIComponent(key)}&select=intent,response`
  );
  if (row && row.intent !== intent) {
    throw userError("That idempotency key was used for a different action.", 409);
  }
  return { fresh: false, response: row?.response ?? null, key };
}

export async function storeIdempotentResponse(playerId, key, response) {
  if (!key) return;
  await db
    .update("idempotency_keys", `player_id=eq.${playerId}&key=eq.${encodeURIComponent(key)}`, {
      response,
    })
    .catch(() => {});
}

/** Give a key back after an intent FAILED.
 *
 *  Leaving it claimed with a null response is worse than never claiming it:
 *  the retry the player is about to make finds the row, replays "nothing
 *  happened", and the action can never succeed for them again. A failure is
 *  not a result, so it does not get stored as one. */
export async function releaseIdempotency(playerId, key) {
  if (!key) return;
  await db
    .delete("idempotency_keys", `player_id=eq.${playerId}&key=eq.${encodeURIComponent(key)}`)
    .catch(() => {});
}

// ---------------------------------------------------------------------------
//  INPUT
//
//  No zod, because the whole surface is a closed set of intents with a handful
//  of scalar arguments each, and a schema library for that is more code than
//  the checks. What matters is the RULES, not the library:
//
//    · integers are integers, with explicit bounds — `{qty: -10}` is rejected,
//      never multiplied
//    · ids are matched against a KNOWN LIST, never used as-is
//    · nothing is ever spread from client JSON into a database update
// ---------------------------------------------------------------------------

export function int(value, { min = 0, max = 1_000_000, name = "value" }) {
  // Number() is not a type check. Number(true) is 1, Number([]) is 0,
  // Number(["5"]) is 5 and Number(null) is 0 — every one of them an integer as
  // far as Number.isInteger cares. Bounds contained the damage, but `qty: true`
  // arriving as 1 is a type confusion nothing downstream is expecting.
  const isNumeric =
    typeof value === "number" || (typeof value === "string" && /^-?\d+$/.test(value.trim()));
  if (!isNumeric) {
    throw userError(`${name} must be a whole number`);
  }
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw userError(`${name} must be a whole number`);
  }
  if (n < min || n > max) {
    throw userError(`${name} must be between ${min} and ${max}`);
  }
  return n;
}

/** A string that must be one of a fixed set. Anything else is a 400, never a
 *  lookup that returns undefined and quietly does nothing. */
export function oneOf(value, allowed, name = "value") {
  const v = String(value ?? "");
  if (!allowed.includes(v)) {
    throw userError(`${name} is not something this game has`);
  }
  return v;
}

/** A short opaque string — a key, a client seed. Bounded and character-limited
 *  so it cannot be used to smuggle a payload into a log or a query. */
export function token(value, { max = 128, name = "value", optional = false } = {}) {
  if (value == null || value === "") {
    if (optional) return null;
    throw userError(`${name} is required`);
  }
  const v = String(value);
  if (v.length > max || !/^[A-Za-z0-9_.:-]+$/.test(v)) {
    throw userError(`${name} is malformed`);
  }
  return v;
}

/** Make an error whose message is SAFE to show a player.
 *
 *  Everything else is masked. This is opt-in rather than opt-out because the
 *  first version keyed off the status code — and PostgREST answers a failed
 *  insert with 400, so a database error sailed straight through to the browser
 *  as `null value in column "id" of relation "players"`. That names a table, a
 *  column and a constraint: free reconnaissance, handed over by the code whose
 *  comment said it prevented exactly that. */
export function userError(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  e.expose = true;
  return e;
}

/** Turn a thrown error into a response body.
 *
 *  Only messages deliberately marked `expose` reach the client. A 401 and a 429
 *  are safe to name because they carry no detail; anything else the player sees
 *  is a sentence somebody wrote for them on purpose. */
export function errorBody(e) {
  const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
  const safe = e?.expose || status === 401 || status === 429 || status === 409;
  const message = safe && e?.message ? e.message : defaultMessage(status);
  // The real error still needs to be findable. It goes to the server log, where
  // only we can read it, and never into the response.
  if (!safe) console.error("[api]", status, e?.code || "", e?.message, e?.detail || "");
  return { status: safe ? status : status >= 500 ? 500 : 400, body: { ok: false, error: message } };
}

function defaultMessage(status) {
  if (status === 401) return "Sign in first.";
  if (status === 429) return "Too many requests. Slow down.";
  if (status >= 500) return "Something went wrong. Nothing was charged.";
  return "That request was not something the game accepts.";
}
