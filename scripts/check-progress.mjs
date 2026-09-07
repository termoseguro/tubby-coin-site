// npm run check:progress — plays the game and proves the ladder never bricks.
//
// A dependency web is easy to write and almost impossible to eyeball. Every
// clause looks reasonable on its own; the failure mode is a cycle three
// buildings long that nobody notices until a player is stuck at Cat Hall 4 with
// no legal move and a week of progress behind them.
//
// So this does not inspect the rules. It PLAYS: it starts a brand new town,
// grants it unlimited resources, and repeatedly does the first legal thing it
// can find, until it either reaches the target Cat Hall level or gets stuck.
// If it gets stuck it prints exactly what every building was waiting for.
//
// Unlimited resources are the point, not a cheat: this is a check for
// DEADLOCKS, not for balance. "You cannot afford it yet" is a pacing question;
// "there is nothing you could ever do" is a bug.

import {
  isUnlocked,
  maxLevelFor,
  startLevel,
  unmetRequirements,
} from "../lib/townEconomy.js";
import { furnitureGate, itemCap, itemLevel, unlockedItems } from "../lib/townFurniture.js";
import { BUILDINGS } from "../lib/townConfig.js";

const TARGET_HALL = Number(process.argv[2] || 12);

const save = {
  buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, startLevel(b.id)])),
  furniture: {},
};

const levels = () => save.buildings;
const lvl = (id) => save.buildings[id] ?? 0;

/** Fit one piece of furniture, if anything is gating. Returns what it did. */
function fitSomething() {
  for (const b of BUILDINGS) {
    if (lvl(b.id) < 1) continue;
    const gate = furnitureGate(save, b.id, lvl(b.id));
    if (!gate.length) continue;
    const g = gate[0];
    save.furniture[b.id] = save.furniture[b.id] || {};
    save.furniture[b.id][g.it.id] = (save.furniture[b.id][g.it.id] || 0) + 1;
    return { text: `fit ${g.it.name} in ${b.name}`, first: null, hall: lvl("hall") };
  }
  return null;
}

/** Build any brand new plot first. A real player does not walk past a thing
 *  that just unlocked to go and raise the Cat Hall again, and a bot that does
 *  produces a misleading picture of the opening hours. */
function buildNewPlot() {
  for (const b of BUILDINGS) {
    if (lvl(b.id) !== 0) continue;
    if (!isUnlocked(b.id, lvl("hall"))) continue;
    if (unmetRequirements(b.id, 0, levels()).length) continue;
    save.buildings[b.id] = 1;
    return { text: `built ${b.name} to 1`, first: b.name, hall: lvl("hall") };
  }
  return null;
}

/** Raise or build one thing, if anything is legal. */
function buildSomething() {
  for (const b of BUILDINGS) {
    const at = lvl(b.id);
    if (!isUnlocked(b.id, lvl("hall"))) continue;
    if (at >= maxLevelFor(b.id, lvl("hall"))) continue;
    if (unmetRequirements(b.id, at, levels()).length) continue;
    if (furnitureGate(save, b.id, at).length) continue;
    save.buildings[b.id] = at + 1;
    return { text: `${at === 0 ? "built" : "raised"} ${b.name} to ${at + 1}`, first: at === 0 ? b.name : null, hall: lvl("hall") };
  }
  return null;
}

const trail = [];
let stuck = false;

for (let step = 0; step < 4000; step++) {
  if (lvl("hall") >= TARGET_HALL) break;
  const did = buildNewPlot() || fitSomething() || buildSomething();
  if (!did) {
    stuck = true;
    break;
  }
  trail.push(did);
}

if (!stuck && lvl("hall") >= TARGET_HALL) {
  console.log(`✓ a new town reaches Cat Hall ${TARGET_HALL} in ${trail.length} moves`);
  // What a new player actually sees, and at which Cat Hall level. This is the
  // one output worth reading even when the check passes — it is the shape of
  // the opening hours, and a gap in it is a boring afternoon.
  console.log("  what appears, and when:");
  const seen = new Set();
  for (const t of trail) {
    if (!t.first || seen.has(t.first)) continue;
    seen.add(t.first);
    console.log(`    Cat Hall ${String(t.hall).padStart(2)}  →  ${t.first}`);
  }
  process.exit(0);
}

console.error(`\n✗ STUCK at Cat Hall ${lvl("hall")} after ${trail.length} moves.\n`);
console.error("  Nothing was legal. What each unlocked building was waiting for:\n");
for (const b of BUILDINGS) {
  if (!isUnlocked(b.id, lvl("hall"))) continue;
  const at = lvl(b.id);
  const capped = at >= maxLevelFor(b.id, lvl("hall"));
  const unmet = unmetRequirements(b.id, at, levels());
  const gate = furnitureGate(save, b.id, at);
  const why = capped
    ? `capped by the Cat Hall (${lvl("hall")})`
    : unmet.length
      ? `needs ${unmet.map((r) => `${r.id} ${r.level}`).join(", ")}`
      : gate.length
        ? `needs ${gate[0].it.name} at ${gate[0].need}`
        : "should have been legal — this is the bug";
  console.error(`    ${b.name.padEnd(18)} lv ${String(at).padStart(2)}  ${why}`);
}
console.error("");
process.exit(1);
