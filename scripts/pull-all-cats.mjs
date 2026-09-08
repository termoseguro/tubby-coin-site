// npm run cats:all — pull the ENTIRE 20,000-cat collection.
//
// pull-cats.mjs takes a sample. This takes the lot, and it is a different job
// with different failure modes, so it is a different script.
//
// THE NUMBERS, because they decide the design:
//   · 20,000 tokens. Metadata is a small JSON each; art is a ~1.4MB PNG each.
//   · That is ~28GB of downloads to produce ~340MB of 320px WebP.
//   · Exactly two public gateways still serve these CIDs. ipfs.io, dweb.link,
//     w3s.link and nftstorage.link all answer 410 for them now, and
//     cloudflare-ipfs.com no longer resolves at all. Pinata serves both the
//     metadata and the art; 4everland serves the metadata only (its image
//     route times out). Both rate-limit.
//
// So this is a LONG job — hours, not minutes — and the only thing that matters
// is that stopping it costs nothing:
//
//   · Art already on disk is skipped.
//   · Metadata is cached to data/cat-traits.ndjson as it arrives, append-only,
//     so a re-run never re-fetches a token it has already read. Without this,
//     indexing 20,000 cats would mean 20,000 more gateway requests.
//   · Tokens are visited in an EVENLY SPREAD order rather than 0,1,2,3…, so an
//     interrupted run leaves a fair sample of the whole collection instead of
//     everything from the low ids. Stopping halfway still gives a usable pool.
//   · A 429 slows every worker down together, then they speed back up. Hammering
//     a throttled gateway is how a run that would have finished does not.
//
// Re-run it as often as you like. Then `npm run cats:index` to rebuild the
// manifest from whatever is on disk.

import { appendFileSync, createReadStream, existsSync, mkdirSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { execFile } from "node:child_process";
import { createInterface } from "node:readline";

const META_CID = "QmeN7ZdrTGpbGoo8URqzvyiDtcgJxwoxULbQowaTGhTeZc";
const TOTAL = 20000;
const OUT_DIR = new URL("../public/cats/", import.meta.url);
const DATA_DIR = new URL("../data/", import.meta.url);
const TRAITS = new URL("../data/cat-traits.ndjson", import.meta.url);

// Metadata is cheap and two gateways answer for it. Art is expensive and only
// one does, so it gets no rotation and all of the politeness.
const META_GW = ["https://gateway.pinata.cloud/ipfs", "https://4everland.io/ipfs"];
const ART_GW = "https://gateway.pinata.cloud/ipfs";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
};
const CONC = arg("--conc", 8);
const LIMIT = arg("--limit", TOTAL);

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(DATA_DIR, { recursive: true });

const win = (u) => u.pathname.replace(/^\/([A-Za-z]:)/, "$1");
const run = (cmd, args) =>
  new Promise((res) => execFile(cmd, args, { shell: true }, (e) => res(!e)));

// ---- what is already paid for ---------------------------------------------
const haveArt = new Set(
  readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".webp"))
    .map((f) => Number(f.slice(0, -5)))
    .filter(Number.isFinite)
);

/** Token id -> { image, traits }, read back from the append-only cache. */
const haveMeta = new Map();
if (existsSync(TRAITS)) {
  const rl = createInterface({ input: createReadStream(TRAITS), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const j = JSON.parse(line);
      haveMeta.set(j.id, j);
    } catch {}
  }
}

/** Every token id, ordered so that ANY PREFIX is spread evenly across the
 *  collection. Halving the stride each pass fills the gaps between what the
 *  previous pass took, which is the cheapest way to make an interrupted run
 *  still representative. */
function spreadOrder() {
  const seen = new Uint8Array(TOTAL);
  const order = [];
  for (let step = 4096; step >= 1; step >>= 1) {
    for (let i = 0; i < TOTAL; i += step) {
      if (!seen[i]) {
        seen[i] = 1;
        order.push(i);
      }
    }
  }
  return order;
}

const queue = spreadOrder()
  .filter((id) => !(haveArt.has(id) && haveMeta.has(id)))
  .slice(0, LIMIT);

console.log(
  `${haveArt.size} cats on disk, ${haveMeta.size} traits cached. ` +
    `${queue.length} to fetch (of ${TOTAL}).`
);
if (!queue.length) {
  console.log("Nothing to do. Run `npm run cats:index` to rebuild the manifest.");
  process.exit(0);
}

// ---- politeness ------------------------------------------------------------
// One shared brake. A 429 anywhere slows everybody; success bleeds it back off.
let brakeMs = 0;
const brake = () => (brakeMs = Math.min(6000, brakeMs ? brakeMs * 1.6 : 600));
const ease = () => (brakeMs = brakeMs > 60 ? brakeMs * 0.9 : 0);
const wait = (ms) => new Promise((s) => setTimeout(s, ms));

async function get(url, tries = 4) {
  for (let t = 0; t < tries; t++) {
    if (brakeMs) await wait(brakeMs * (0.6 + Math.random() * 0.8));
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (r.ok) {
        ease();
        return r;
      }
      if (r.status === 429 || r.status >= 500) brake();
      else return null; // a 404 or 410 will not become a 200
    } catch {
      brake();
    }
    await wait(500 * (t + 1));
  }
  return null;
}

async function meta(id) {
  const cached = haveMeta.get(id);
  if (cached) return cached;
  for (const gw of META_GW) {
    const r = await get(`${gw}/${META_CID}/${id}.json`, 2);
    if (!r) continue;
    let j;
    try {
      j = await r.json();
    } catch {
      continue;
    }
    const traits = {};
    for (const a of j.attributes || []) {
      if (a.value === false || a.value === "" || a.value == null) continue;
      traits[a.trait_type] = String(a.value);
    }
    const rec = { id, image: String(j.image || ""), traits };
    // Written the moment it arrives, so a kill -9 loses one token, not a run.
    appendFileSync(TRAITS, JSON.stringify(rec) + "\n");
    haveMeta.set(id, rec);
    return rec;
  }
  return null;
}

async function art(id, rec) {
  if (haveArt.has(id)) return true;
  // The collection is split across several image CIDs — token 0 and token
  // 19999 live in different directories — so the path always comes from the
  // metadata rather than from a constant.
  const path = rec.image.replace("ipfs://", "");
  if (!path) return false;
  const r = await get(`${ART_GW}/${path}`, 3);
  if (!r) return false;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.byteLength < 1024) return false;
  const tmp = new URL(`${id}.src.png`, OUT_DIR);
  const out = new URL(`${id}.webp`, OUT_DIR);
  writeFileSync(tmp, buf);
  // 320px is what the album and the pull animation display. Keeping the
  // original 2160px would be 80x the bytes for pixels nobody ever sees.
  const ok = await run("magick", [win(tmp), "-resize", "320x320", "-quality", "88", win(out)]);
  try {
    unlinkSync(tmp);
  } catch {}
  if (ok) haveArt.add(id);
  return ok;
}

// ---- the pool --------------------------------------------------------------
let cursor = 0;
let ok = 0;
let failed = 0;
const startedAt = Date.now();

function report() {
  const done = ok + failed;
  const per = (Date.now() - startedAt) / Math.max(1, done);
  const left = ((queue.length - done) * per) / 60000;
  process.stdout.write(
    `\r  ${ok} done · ${failed} failed · ${haveArt.size}/${TOTAL} on disk · ` +
      `${left < 90 ? left.toFixed(0) + "m" : (left / 60).toFixed(1) + "h"} left · ` +
      `brake ${Math.round(brakeMs)}ms   `
  );
}

async function worker() {
  while (cursor < queue.length) {
    const id = queue[cursor++];
    const rec = await meta(id);
    if (rec && (await art(id, rec))) ok++;
    else failed++;
    if ((ok + failed) % 20 === 0) report();
  }
}

await Promise.all(Array.from({ length: CONC }, worker));
report();
console.log(`\n\n✓ ${haveArt.size} of ${TOTAL} cats on disk, ${haveMeta.size} traits cached.`);
console.log(`  Re-run this to continue. Then: npm run cats:index`);
