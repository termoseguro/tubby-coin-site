// npm run cats:index — build lib/catPool.json from the art already on disk.
//
// Separate from the pull scripts on purpose, because the two halves of the job
// fail in different ways: art comes from a gateway that rate-limits hard, and a
// single script that does both stalls on the images and leaves the manifest
// unwritten. That is exactly what happened once — 130 cats downloaded and a
// manifest still describing 24 — so pulling and indexing are separate commands
// and indexing works entirely from what is already paid for.
//
// IT READS THE TRAITS CACHE FIRST. pull-all-cats.mjs writes every token's
// metadata to data/cat-traits.ndjson as it arrives. Without using that, this
// script re-fetched all of it: 950 cats on disk meant 950 more gateway
// requests through the same throttle that made the pull slow in the first
// place, which is why the manifest sat at 375 while the disk held 950.
//
// Rarity is computed from TRAIT FREQUENCY across whatever is indexed, so a cat
// wearing things nobody else wears ranks high. Same thing the NFT market
// prices, arrived at independently — and it re-ranks itself sensibly however
// many cats there happen to be.

import { createReadStream, existsSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const META_CID = "QmeN7ZdrTGpbGoo8URqzvyiDtcgJxwoxULbQowaTGhTeZc";
const OUT_DIR = new URL("../public/cats/", import.meta.url);
const TRAITS = new URL("../data/cat-traits.ndjson", import.meta.url);
const MANIFEST = new URL("../lib/catPool.json", import.meta.url);

// Tried in order, for the stragglers the cache does not cover. Most public
// gateways answer 410 for these CIDs now; these two still serve them.
const GATEWAYS = ["https://gateway.pinata.cloud/ipfs", "https://4everland.io/ipfs"];

const TIERS = [
  { id: "mythic", take: (n) => Math.max(3, Math.round(n * 0.02)) },
  { id: "legendary", take: (n) => Math.max(6, Math.round(n * 0.05)) },
  { id: "epic", take: (n) => Math.max(12, Math.round(n * 0.12)) },
  { id: "rare", take: (n) => Math.max(24, Math.round(n * 0.28)) },
  { id: "common", take: (n) => n },
];

const ids = readdirSync(OUT_DIR)
  .filter((f) => f.endsWith(".webp"))
  .map((f) => Number(f.replace(".webp", "")))
  .filter((n) => Number.isFinite(n))
  .sort((a, b) => a - b);

// ---- the cache -------------------------------------------------------------
const cached = new Map();
if (existsSync(TRAITS)) {
  const rl = createInterface({ input: createReadStream(TRAITS), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const j = JSON.parse(line);
      if (j && j.id != null) cached.set(j.id, j.traits || {});
    } catch {}
  }
}

const missing = ids.filter((id) => !cached.has(id));
console.log(
  `Indexing ${ids.length} cats on disk — ${ids.length - missing.length} from cache, ` +
    `${missing.length} to fetch.`
);

async function meta(id) {
  for (const gw of GATEWAYS) {
    for (let t = 0; t < 2; t++) {
      try {
        const r = await fetch(`${gw}/${META_CID}/${id}.json`, {
          signal: AbortSignal.timeout(20_000),
        });
        if (r.ok) return await r.json();
        if (r.status === 429) await new Promise((s) => setTimeout(s, 1500));
        else break;
      } catch {}
    }
  }
  return null;
}

const CONC = 4;
for (let i = 0; i < missing.length; i += CONC) {
  const batch = missing.slice(i, i + CONC);
  const got = await Promise.all(batch.map(meta));
  got.forEach((m, j) => {
    if (!m) return;
    const traits = {};
    for (const a of m.attributes || []) {
      if (a.value === false || a.value === "" || a.value == null) continue;
      traits[a.trait_type] = String(a.value);
    }
    cached.set(batch[j], traits);
  });
  process.stdout.write(`\r  fetched ${Math.min(i + CONC, missing.length)} of ${missing.length}`);
}
if (missing.length) console.log();

// A cat whose traits never arrived still belongs in the pool — it has art, it
// can be adopted, and it is simply unranked. Dropping it is how the manifest
// ends up smaller than the folder.
const cats = ids.map((id) => ({ id, traits: cached.get(id) || null }));

if (!cats.length) {
  console.error("\n✗ No art on disk. Run `npm run cats:all` first.\n");
  process.exit(1);
}

// ---- rarity from the art itself -------------------------------------------
const freq = {};
const ranked = cats.filter((c) => c.traits);
for (const c of ranked) {
  for (const [k, v] of Object.entries(c.traits)) freq[`${k}=${v}`] = (freq[`${k}=${v}`] || 0) + 1;
}
for (const c of ranked) {
  c.score = Object.entries(c.traits).reduce(
    (a, [k, v]) => a + ranked.length / (freq[`${k}=${v}`] || 1),
    0
  );
}
ranked.sort((a, b) => b.score - a.score);

let cursor = 0;
for (const t of TIERS) {
  const n = t.take(ranked.length);
  for (let i = 0; i < n && cursor < ranked.length; i++, cursor++) ranked[cursor].rarity = t.id;
}
for (const c of cats) if (!c.rarity) c.rarity = "common";

writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      source: "tubby cats, CC0 — 0xca7ca7bcc765f77339be2d648ba53ce9c8a262bd",
      pulled: cats.length,
      // Sorted by id so the file diffs sanely as the pull grows.
      cats: cats
        .sort((a, b) => a.id - b.id)
        .map((c) => ({
          id: c.id,
          name: String(c.id),
          rarity: c.rarity,
          art: `/cats/${c.id}.webp`,
        })),
    },
    null,
    2
  )
);

const by = {};
for (const c of cats) by[c.rarity] = (by[c.rarity] || 0) + 1;
console.log(`\n✓ ${cats.length} cats in lib/catPool.json`);
for (const t of ["mythic", "legendary", "epic", "rare", "common"]) {
  console.log(`   ${t.padEnd(10)} ${by[t] || 0}`);
}
