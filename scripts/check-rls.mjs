// npm run check:rls — attacks the live database with the PUBLIC key.
//
// The anon key ships inside the JavaScript bundle every visitor downloads, so
// this is not a hypothetical attacker: it is anyone with devtools and five
// minutes. This script is that attacker, run on purpose.
//
// It reads with the anon key (must return nothing, even from a table that has
// rows) and writes with it (must be refused). A single passing write here would
// mean free items, forged payments, or an edited town — so the script exits
// non-zero and says which table let it through.
//
// Run it after every migration. RLS is one `alter table` away from being off,
// and nothing about the app would look different if it were.

import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const envPath = new URL(".env.local", ROOT);
if (!existsSync(envPath)) {
  console.error("\n✗ .env.local not found — see docs/backend-setup.md §2b.\n");
  process.exit(1);
}
const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const URL_BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) {
  console.error("\n✗ NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY missing from .env.local\n");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const TABLES = [
  "players", "wallets", "wallet_nonces", "towns", "town_events",
  "shop_items", "orders", "payments", "hold_snapshots",
  "seasons", "season_scores", "prize_claims",
  // Added by 20260909120000_server_authority.sql. A table that is not in this
  // list is a table nobody is attacking, which is how one ships open.
  "sessions", "idempotency_keys", "gacha_seeds", "gacha_rolls",
  "town_actions", "rate_limits",
];

// What an attacker would actually try, not a generic row. Each of these is a
// specific way to steal something if RLS were off.
const WRITES = [
  {
    table: "towns",
    why: "give itself a town with a billion Gold",
    row: { player_id: "00000000-0000-0000-0000-000000000000", state: { res: { coin: 999999999 } } },
  },
  {
    table: "orders",
    why: "create an order it never paid for",
    row: {
      player_id: "00000000-0000-0000-0000-000000000000", item_id: "builder_2",
      currency: "SOL", destination: "x", reference: "probe", expires_at: "2099-01-01",
    },
  },
  {
    table: "payments",
    why: "mark a payment verified without a transaction",
    row: {
      tx_signature: "probe", order_id: "00000000-0000-0000-0000-000000000000",
      player_id: "00000000-0000-0000-0000-000000000000", slot: 1,
    },
  },
  {
    table: "wallets",
    why: "claim a whale's wallet without signing for it",
    row: { address: "probe", player_id: "00000000-0000-0000-0000-000000000000" },
  },
  {
    table: "season_scores",
    why: "write itself to the top of the leaderboard",
    row: { season_id: "s1", player_id: "00000000-0000-0000-0000-000000000000", score: 999999999 },
  },
  {
    table: "shop_items",
    why: "set every price to one cent",
    row: { id: "probe", name: "probe", usd_cents: 1 },
  },
];

let failures = 0;

console.log("Reading every table with the public key…");
for (const t of TABLES) {
  const r = await fetch(`${URL_BASE}/${t}?select=*&limit=1`, { headers: H });
  const body = await r.json().catch(() => null);
  const leaked = Array.isArray(body) && body.length > 0;
  if (leaked) {
    console.log(`  ✗ ${t} — READABLE by the public key`);
    failures++;
  } else {
    console.log(`  · ${t} — nothing`);
  }
}

console.log("\nWriting with the public key (all of these must be refused)…");
for (const w of WRITES) {
  const r = await fetch(`${URL_BASE}/${w.table}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(w.row),
  });
  if (r.ok) {
    console.log(`  ✗ ${w.table} — ACCEPTED a write: could ${w.why}`);
    failures++;
  } else {
    console.log(`  · ${w.table} — refused (${r.status})`);
  }
}

if (failures) {
  console.error(
    `\n✗ ${failures} hole${failures === 1 ? "" : "s"}. Every table needs RLS on ` +
      `with no policy granting anon anything — see supabase/migrations/*_init.sql §5.\n`
  );
  process.exit(1);
}
console.log("\n✓ the public key can read nothing and write nothing\n");
