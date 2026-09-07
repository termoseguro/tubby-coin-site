// npm run cats:pull [count] — pull tubby cats art and traits from IPFS.
//
// The collection is 20,000 cats, CC0, contract
// 0xca7ca7bcc765f77339be2d648ba53ce9c8a262bd. tokenURI resolves to
// ipfs://QmeN7Zdr.../<n>.json and each metadata names an image in a second CID.
//
// WE DO NOT PULL ALL 20,000, and that is a design decision rather than a
// limitation. Each PNG is ~2.6MB, so the full set is ~52GB of downloads through
// a rate-limited public gateway to produce ~420MB of WebP. More to the point:
// Kingshot ships 34 heroes, not 20,000. A roster is something a player can hold
// in their head and want a specific member of; 20,000 is a spreadsheet.
//
// So this pulls a sample big enough to cast the heroes from and to fill the
// album, and takes a count so it can be re-run larger at any time. It resumes:
// anything already on disk is skipped.
//
// RARITY COMES FROM THE ART, which is what makes it honest. Every cat's score
// is the sum of 1/frequency over its traits, computed across the sample, so a
// cat wearing things almost nobody wears ranks high. Then the ranked list is
// sliced into the game's five tiers. That is the same thing the NFT market
// prices, arrived at independently.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const META_CID = "QmeN7ZdrTGpbGoo8URqzvyiDtcgJxwoxULbQowaTGhTeZc";
const TOTAL = 20000;
const GATEWAY = "https://gateway.pinata.cloud/ipfs";
const OUT_DIR = new URL("../public/cats/", import.meta.url);
const MANIFEST = new URL("../lib/catPool.json", import.meta.url);

const COUNT = Number(process.argv[2] || 320);
const CONCURRENCY = 4;

// How the ranked sample is cut into tiers. Proportions echo the published pull
// odds, floored so every tier has enough members to feel like a set.
const TIERS = [
  { id: "mythic", take: (n) => Math.max(3, Math.round(n * 0.01)) },
  { id: "legendary", take: (n) => Math.max(8, Math.round(n * 0.04)) },
  { id: "epic", take: (n) => Math.max(20, Math.round(n * 0.11)) },
  { id: "rare", take: (n) => Math.max(40, Math.round(n * 0.28)) },
  { id: "common", take: (n) => n }, // everything left
];

mkdirSync(OUT_DIR, { recursive: true });

const outPath = (i) => new URL(`${i}.webp`, OUT_DIR);

async function grab(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(45_000) });
      if (r.ok) return r;
      // 429 means the gateway wants us to slow down. Obliging is faster than
      // being throttled harder.
      if (r.status === 429) await new Promise((s) => setTimeout(s, 2500 * (t + 1)));
    } catch {}
    await new Promise((s) => setTimeout(s, 800 * (t + 1)));
  }
  return null;
}

/** A deterministic spread across the collection, so re-running with a bigger
 *  count keeps everything already pulled and simply adds more. */
function pickIndices(n) {
  const step = TOTAL / n;
  return Array.from({ length: n }, (_, i) => Math.floor(i * step));
}

const indices = pickIndices(COUNT);
const cats = [];
let done = 0;

async function pullOne(idx) {
  const file = outPath(idx);
  let meta = null;

  const mr = await grab(`${GATEWAY}/${META_CID}/${idx}.json`);
  if (!mr) return null;
  try {
    meta = await mr.json();
  } catch {
    return null;
  }

  const traits = {};
  for (const a of meta.attributes || []) {
    if (a.value === false || a.value === "" || a.value == null) continue;
    traits[a.trait_type] = String(a.value);
  }

  if (!existsSync(file)) {
    const path = (meta.image || "").replace("ipfs://", "");
    const ir = await grab(`${GATEWAY}/${path}`);
    if (!ir) return null;
    const buf = Buffer.from(await ir.arrayBuffer());
    const tmp = new URL(`${idx}.src.png`, OUT_DIR);
    writeFileSync(tmp, buf);
    // 320px is what the album and the pull animation actually display. Shipping
    // 2160px would be 100x the bytes for pixels nobody sees.
    const r = spawnSync(
      "magick",
      [tmp.pathname.replace(/^\/([A-Za-z]:)/, "$1"), "-resize", "320x320", "-quality", "88",
       file.pathname.replace(/^\/([A-Za-z]:)/, "$1")],
      { shell: true }
    );
    spawnSync("rm", ["-f", tmp.pathname.replace(/^\/([A-Za-z]:)/, "$1")], { shell: true });
    if (r.status !== 0) return null;
  }

  return { id: idx, name: String(meta.name ?? idx), traits };
}

console.log(`Pulling ${COUNT} of ${TOTAL} tubby cats…`);
for (let i = 0; i < indices.length; i += CONCURRENCY) {
  const batch = indices.slice(i, i + CONCURRENCY);
  const got = await Promise.all(batch.map(pullOne));
  for (const c of got) if (c) cats.push(c);
  done += batch.length;
  if (done % 40 === 0 || done >= indices.length) {
    process.stdout.write(`\r  ${cats.length} of ${done} pulled`);
  }
}
console.log();

if (cats.length < 10) {
  console.error("\n✗ Almost nothing came back. The gateway is probably throttling — wait and re-run; finished cats are kept.\n");
  process.exit(1);
}

// ---- rarity, computed from the art itself ---------------------------------
const freq = {};
for (const c of cats) {
  for (const [k, v] of Object.entries(c.traits)) {
    freq[`${k}=${v}`] = (freq[`${k}=${v}`] || 0) + 1;
  }
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

const byTier = {};
for (const c of cats) byTier[c.rarity] = (byTier[c.rarity] || 0) + 1;

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

console.log(`\n✓ ${cats.length} cats in lib/catPool.json`);
for (const t of ["mythic", "legendary", "epic", "rare", "common"]) {
  console.log(`   ${t.padEnd(10)} ${byTier[t] || 0}`);
}
