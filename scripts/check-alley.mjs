// npm run check:alley — how far does each kind of roster get in The Long Alley?
//
// The difficulty curve is the one number in this game that cannot be reasoned
// about on paper: it is the interaction of hero power, class stats, the enemy
// formula, the ultimate each cat happens to have, and how many rounds a wave
// lasts. So it gets measured, against real rosters, every time any of that
// moves.
//
// A fresh hero clearing NOTHING is a bug — Kingshot's Conquest opens with a run
// you clear in one sitting. A fully-built team clearing everything is also a
// bug: the ladder is supposed to stop you and send you back to ascend someone.
//
//   node scripts/check-alley.mjs

import { HEROES } from "../lib/heroes.js";
import { simulate } from "../lib/conquest.js";
import { combatKit } from "../lib/heroCombat.js";

const rare = HEROES.filter((h) => h.rarity === "rare");
const epic = HEROES.filter((h) => h.rarity === "epic");
const myth = HEROES.filter((h) => h.rarity === "mythic");
// What every account is handed on day one — the row that actually matters.
const starter = ["amadeu", "timber", "biscuit", "pebble", "sprout"].map((id) =>
  HEROES.find((h) => h.id === id)
);

/** How far a roster gets before it dies. Deterministic rng so the answer is
 *  the curve and not the dice. */
function reach(heroes, state, max = 600) {
  const save = { heroes: {}, patrol: [] };
  for (const h of heroes) save.heroes[h.id] = { ...state };
  const lineup = heroes.slice(0, 5).map((h) => h.id);
  while (lineup.length < 5) lineup.push(null);
  for (let st = 1; st <= max; st++) {
    if (!simulate(lineup, save, st, {}, () => 0.5).won) return st - 1;
  }
  return max;
}

const ROWS = [
  ["1 fresh Rare", rare.slice(0, 1), { steps: 0, level: 1, shards: 0 }],
  ["the day-one five", starter, { steps: 0, level: 1, shards: 0 }],
  ["day-one, 1* L10", starter, { steps: 6, level: 10, shards: 0 }],
  ["5 Rare 2* L20", rare.slice(0, 5), { steps: 12, level: 20, shards: 0 }],
  ["5 Epic 2* L20", epic.slice(0, 5), { steps: 12, level: 20, shards: 0 }],
  ["5 Epic 3* L40", epic.slice(0, 5), { steps: 18, level: 40, shards: 0 }],
  ["5 Mythic 4* L60", myth.slice(0, 5), { steps: 24, level: 60, shards: 0 }],
  ["5 Mythic 5* L100", myth.slice(0, 5), { steps: 30, level: 100, shards: 0 }],
];

console.log("\n  How far each roster gets in The Long Alley:\n");
const got = [];
for (const [label, hs, st] of ROWS) {
  const n = reach(hs, st);
  got.push([label, n]);
  console.log("  " + label.padEnd(18) + "stage " + n);
}

console.log("\n  Every hero's kit:\n");
for (const h of HEROES) {
  const k = combatKit(h.id, 0);
  if (!k) {
    console.log("  ✗ " + h.id + " has NO combat kit");
    process.exitCode = 1;
    continue;
  }
  console.log(
    "  " + h.name.padEnd(12) + k.ultName.padEnd(14) + k.passiveName.padEnd(10) + `(${k.passiveAt}★)`
  );
}

// ---- the two failures that matter ------------------------------------------
const dayOne = got.find(([l]) => l === "the day-one five")[1];
const top = got.find(([l]) => l === "5 Mythic 5* L100")[1];
console.log();
if (dayOne < 3) {
  console.error(`  ✗ the day-one roster clears only ${dayOne} — there is no grace period`);
  process.exitCode = 1;
}
if (top >= 600) {
  console.error("  ✗ a maxed roster clears everything — the ladder never stops anyone");
  process.exitCode = 1;
}
if (!process.exitCode) {
  console.log(`  ✓ day one clears ${dayOne}, a maxed roster stops at ${top}`);
}
console.log();
