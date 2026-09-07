// npm run cats:index — build lib/catPool.json from the art already on disk.
//
// Separate from pull-cats.mjs on purpose, because the two halves of the job
// fail in different ways and for different reasons:
//
//   IMAGES come from a gateway that serves this CID and rate-limits hard
//     (Pinata answers 429 after a few hundred requests).
//   METADATA is served by several gateways, and a different one to the images.
//
// A single script that does both stalls on the images and leaves the metadata
// unwritten, which is exactly what happened: 130 cats downloaded and a manifest
// still describing 24. So pulling and indexing are now separate commands, and
// indexing works entirely from what is already paid for.
//
// Rarity is computed from TRAIT FREQUENCY across whatever is indexed, so a cat
// wearing things nobody else wears ranks high. That is the same thing the NFT
// market prices, arrived at independently — and it means the pool re-ranks
// itself sensibly however many cats there happen to be.

import { readdirSync, writeFileSync } from "node:fs";

const META_CID = "QmeN7ZdrTGpbGoo8URqzvyiDtcgJxwoxULbQowaTGhTeZc";
const OUT_DIR = new URL("../public/cats/", import.meta.url);
const MANIFEST = new URL("../lib/catPool.json", import.meta.url);

// Tried in order. Rotating spreads the load and survives any one of them
// going down or throttling, which they all do eventually.
const GATEWAYS = [
  "https://ipfs.raribleuserdata.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs.filebase.io/ipfs",
];

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

console.log(`Indexing ${ids.length} cats already on disk…`);

async function meta(id) {
  for (const gw of GATEWAYS) {
    for (let t = 0; t < 2; t++) {
      try {
        const r = await fetch(`${gw}/${META_CID}/${id}.json`, {
          signal: AbortSignal.timeout(20_000),
        });
        if (r.ok) return await r.json();
        if (r.status === 429) await new Promise((s) => setTimeout(s, 1500));
      } catch {}
    }
  }
  return null;
}

const cats = [];
const CONC = 5;
for (let i = 0; i < ids.length; i += CONC) {
  const got = await Promise.all(ids.slice(i, i + CONC).map(meta));
  got.forEach((m, j) => {
    if (!m) return;
    const id = ids[i + j];
    const traits = {};
    for (const a of m.attributes || []) {
      if (a.value === false || a.value === "" || a.value == null) continue;
      traits[a.trait_type] = String(a.value);
    }
    cats.push({ id, name: String(m.name ?? id), traits });
  });
  process.stdout.write(`\r  ${cats.length} of ${Math.min(i + CONC, ids.length)}`);
}
console.log();

if (!cats.length) {
  console.error("\n✗ No metadata came back. Every gateway is refusing — wait and retry.\n");
  process.exit(1);
}

// ---- rarity from the art itself -------------------------------------------
const freq = {};
for (const c of cats) {
  for (const [k, v] of Object.entries(c.traits)) freq[`${k}=${v}`] = (freq[`${k}=${v}`] || 0) + 1;
}
for (const c of cats) {
  c.score = Object.entries(c.traits).reduce(
    (a, [k, v]) => a + cats.length / (freq[`${k}=${v}`] || 1),
    0
  );
}
cats.sort((a, b) => b.score - a.score);

let cursor = 0;
for (const t of TIERS) {
  const n = t.take(cats.length);
  for (let i = 0; i < n && cursor < cats.length; i++, cursor++) cats[cursor].rarity = t.id;
}
for (const c of cats) if (!c.rarity) c.rarity = "common";

writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      source: "tubby cats, CC0 — 0xca7ca7bcc765f77339be2d648ba53ce9c8a262bd",
      pulled: cats.length,
      cats: cats.map((c) => ({
        id: c.id,
        name: c.name,
        rarity: c.rarity,
        art: `/cats/${c.id}.webp`,
        traits: c.traits,
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
