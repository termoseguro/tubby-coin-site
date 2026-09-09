// The database, from the server only.
//
// No @supabase/supabase-js. PostgREST is an HTTP API and `fetch` speaks it —
// which keeps the dependency out of the tree entirely and, more usefully,
// makes it impossible to import this by accident in a client component and
// have it "work" until the day it ships the service_role key to a browser.
//
// The key here BYPASSES ROW LEVEL SECURITY. Everything in docs/security.md §2
// depends on it never leaving the server.

import "server-only";

// ---------------------------------------------------------------------------
//  CONFIG IS READ WHEN IT IS USED, NOT WHEN THIS FILE IS IMPORTED.
//
//  The first version threw at module scope, which meant `next build` failed on
//  any machine without the key — CI, a fresh clone, a teammate. That is a
//  deployment breaking because a SECRET is missing at BUILD time, when the
//  build needs no secret at all. Worse, the loud failure it was trying to
//  produce ("your key is missing") arrived as "Failed to collect page data",
//  which explains nothing.
//
//  So the check runs on the first query. A machine with no key builds fine and
//  fails, clearly, the moment something actually tries to reach the database.
// ---------------------------------------------------------------------------
let cached = null;

function config() {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw fail("SUPABASE_URL is not set — the server cannot reach the database.");
  }
  if (!key) {
    throw fail(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from the Supabase dashboard " +
        "(Project Settings → API → service_role) into .env.local. It is server-only " +
        "and must never be prefixed NEXT_PUBLIC_."
    );
  }

  // The one mistake that ends a project: pasting the service key into a
  // NEXT_PUBLIC_ variable, where Next inlines it into every page every visitor
  // downloads. Checked here so it is caught on the first request in any
  // environment, including production.
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith("NEXT_PUBLIC_") && v && v === key) {
      throw fail(`${k} holds the service_role key. That ships it to every browser. Rotate it now.`);
    }
  }

  cached = { rest: `${url.replace(/\/$/, "")}/rest/v1`, key };
  return cached;
}

function fail(message) {
  const e = new Error(message);
  e.status = 500;
  e.config = true;
  return e;
}

/** One PostgREST call. Throws on anything that is not 2xx, because a silent
 *  failure here is a grant that did not happen and a player who was charged. */
async function call(path, { method = "GET", body, prefer, signal } = {}) {
  const { rest, key } = config();
  const res = await fetch(`${rest}/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Never cached. Reading a stale town is reading a town somebody has since
    // spent out of.
    cache: "no-store",
    signal,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(json?.message || `db ${res.status}`);
    err.status = res.status;
    err.code = json?.code;
    err.detail = json?.details;
    throw err;
  }
  return json;
}

/** Is the server configured to reach the database at all? Lets a route answer
 *  "the backend is not switched on here" instead of a 500. */
export function dbReady() {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}

export const db = {
  /** SELECT. `query` is a PostgREST querystring, already encoded. */
  select: (table, query = "") => call(`${table}${query ? `?${query}` : ""}`),

  /** SELECT one row, or null. */
  async one(table, query) {
    const rows = await call(`${table}?${query}&limit=1`);
    return rows?.[0] ?? null;
  },

  /** INSERT. Returns the inserted rows. */
  insert: (table, row, { upsert = false } = {}) =>
    call(table, {
      method: "POST",
      body: Array.isArray(row) ? row : [row],
      prefer: `return=representation${upsert ? ",resolution=merge-duplicates" : ""}`,
    }),

  /** INSERT that is ALLOWED to collide. Returns null when the row already
   *  exists rather than throwing — this is how idempotency keys and single-use
   *  nonces are claimed: the database decides the race, not an `if`. */
  async claim(table, row) {
    try {
      const out = await call(table, {
        method: "POST",
        body: [row],
        prefer: "return=representation",
      });
      return out?.[0] ?? null;
    } catch (e) {
      if (e.code === "23505") return null; // unique_violation — somebody won
      throw e;
    }
  },

  /** UPDATE. Returns the affected rows, so a caller can check it was ONE.
   *  Every conditional update in this codebase reads that count: "rows
   *  affected is 0" is how a lost race is detected. */
  update: (table, query, patch) =>
    call(`${table}?${query}`, { method: "PATCH", body: patch, prefer: "return=representation" }),

  delete: (table, query) =>
    call(`${table}?${query}`, { method: "DELETE", prefer: "return=representation" }),

  /** Call a Postgres function. */
  rpc: (fn, args = {}) => call(`rpc/${fn}`, { method: "POST", body: args }),
};
