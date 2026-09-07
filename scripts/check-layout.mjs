// npm run check:layout — proves no building can cover another's name plate.
//
// This exists because the eye is bad at it. The Treat Factory's label sat
// invisibly inside the Adoption Center's ribbon for a whole session: they are
// 225px apart vertically, which looks like plenty, and the Adoption Center's
// art is 219px tall plus a 42px label — so it needed 261. A fixed "200px is
// fine" rule passed it. Only the real art height catches it.
//
// The rule, for a back building A and a front building B that overlap
// horizontally:  B.y - A.y  must exceed  artHeight(B) + 42
// because B is drawn over A, and A's plate sits in its own y+6..y+34 band.
//
// Run it after moving anything in lib/townConfig.js.

import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../lib/townConfig.js", import.meta.url), "utf8");

const B = {};
const shape =
  /id: "([a-z0-9]+)", name: "([^"]+)", short: "[^"]+",\s*\n\s*x: (\d+), y: (\d+), w: (\d+), h: (\d+), scale: ([\d.]+)/g;
for (const m of src.matchAll(shape)) {
  B[m[1]] = {
    name: m[2],
    x: +m[3], y: +m[4], w: +m[5], h: +m[6], s: +m[7],
  };
}
// The cottages are generated from a coordinate list and share one shape.
const cots = [...src.matchAll(/\{ x: (\d+), y: (\d+), at: \d+(?:, built: true)? \}/g)];
cots.forEach((m, i) => {
  B[`cottage${i + 1}`] = { name: `Cat Cottage ${i + 1}`, x: +m[1], y: +m[2], w: 112, h: 90, s: 0.96 };
});

// Matches spriteBuilding(): the sprite is scaled to b.h * 1.75, then the whole
// container is scaled by b.scale.
const artH = (b) => b.h * 1.75 * b.s;
// Art is wider than the box it is described by, so allow for the overhang.
const halfW = (b) => (b.w * b.s) / 2 + 40;
const LABEL_BOTTOM = 42;

const bad = [];
const ids = Object.keys(B);
for (const a of ids) {
  for (const b of ids) {
    if (a === b) continue;
    const A = B[a], F = B[b];
    if (F.y <= A.y) continue; // F must be in front of A to cover it
    if (Math.abs(A.x - F.x) > halfW(A) + halfW(F)) continue;
    const gap = F.y - A.y;
    const need = artH(F) + LABEL_BOTTOM;
    if (gap < need) bad.push({ covered: A.name, by: F.name, gap: Math.round(gap), need: Math.round(need) });
  }
}

console.log(`${ids.length} buildings checked`);
if (!bad.length) {
  console.log("✓ every name plate is legible");
  process.exit(0);
}
for (const x of bad) {
  console.log(`  ✗ "${x.by}" covers "${x.covered}" — gap ${x.gap}, needs ${x.need}`);
}
process.exit(1);
