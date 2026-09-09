// npm run project — how long the game actually lasts, for three wallets.
//
// check-progress.mjs proves the ladder never DEADLOCKS. This one is the other
// half of the question, the one that decides whether anybody is still here in
// a month: how long is the wait between good things, for a player who pays
// nothing, a player who pays about ten dollars, and a player who pays properly.
//
// It does not estimate. It runs the real economy out of lib/ on an hourly
// tick, with a policy that behaves like a person: assign every villager, keep
// the builders busy, build a new plot before upgrading an old one, and spend
// premium currency the way that archetype would.
//
// WHAT WE ARE LOOKING FOR is not "who wins". The paying player is supposed to
// be ahead — that is the product. What kills a game is a WALL: a stretch where
// nothing good happens for so long that the player closes it and does not come
// back. So the output is the gap between unlocks, per archetype, and the
// warning it prints is "N hours with nothing to show for it".
//
//   node scripts/project-players.mjs [days]

import {
  BUILDINGS,
  BUILDING_BY_ID,
  COTTAGE_IDS,
} from "../lib/townConfig.js";
import {
  PRODUCERS,
  addCapped,
  buildSecondsFor,
  canAfford,
  catPower,
  effectiveRate,
  goldPerHour,
  isUnlocked,
  maxLevelFor,
  slotsIn,
  startLevel,
  storeCap,
  unmetRequirements,
  upgradeCostFor,
  upkeepPerHour,
  villagerCap,
  workersAllowed,
} from "../lib/townEconomy.js";
import { furnitureGate, itemCost, seatsFromLevel } from "../lib/townFurniture.js";
import { stageReward } from "../lib/conquest.js";

const DAYS = Number(process.argv[2] || 30);
const HOURS = DAYS * 24;

// How long a player is awake and able to react. A build that finishes at 04:00
// is not collected at 04:00 — modelling 16 waking hours stops the simulation
// quietly assuming a player who never sleeps.
const AWAKE_FROM = 8;
const AWAKE_TO = 24;
const awake = (h) => {
  const t = h % 24;
  return t >= AWAKE_FROM && t < AWAKE_TO;
};

// ---------------------------------------------------------------------------
//  The three wallets
// ---------------------------------------------------------------------------
const PROFILES = {
  f2p: {
    name: "Free to play",
    spend: 0,
    builders: 1,
    boughtSlots: 0,
    // Golden Fish only from the Town Book. Modest, and it is all they get.
    goldFish: 120,
    rushes: false,
    // How far this wallet's roster pushes The Long Alley. Measured against the
    // real curve with scripts/.sweep.mjs, not guessed: a free player fields a
    // few unascended Rares, a spender fields five Epics with stars on them.
    alleyCeiling: 9,
  },
  ten: {
    name: "The $10 player",
    spend: 9.97,
    // $2.99 starter (builder 2) + $4.99 (builder 3) + $1.99 fish.
    builders: 3,
    boughtSlots: 0,
    goldFish: 120 + 500 + 240,
    alleyCeiling: 17,
    // Rushes only when a build would otherwise straddle the night.
    rushes: "night",
  },
  whale: {
    name: "The spender",
    spend: 149.9,
    // Every builder, two extra worker spots, and the fish to keep moving.
    builders: 5,
    boughtSlots: 2,
    goldFish: 120 + 500 + 3000 + 3000,
    alleyCeiling: 29,
    rushes: true,
  },
};

// ---------------------------------------------------------------------------
//  A town
// ---------------------------------------------------------------------------
function freshTown(profile) {
  return {
    buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, startLevel(b.id)])),
    furniture: {},
    res: { fish: 400, wood: 400, stone: 0, catnip: 0, treats: 0, coin: 250, gold: profile.goldFish },
    jobs: {},
    cats: {},
    assign: {},
    buildingSlots: {},
    builders: profile.builders,
    profile,
    // The Long Alley: the next stage this town will try.
    stage: 1,
    // what the player has actually seen happen
    events: [],
    lastGoodAt: 0,
  };
}

const lvl = (s, id) => s.buildings[id] ?? 0;
const slotsAt = (s, id) => slotsIn(s.buildingSlots?.[id] || 0, lvl(s, id));

/** Villagers move in to fill the beds, the way fillVillagers does in the game.
 *  All Common — the honest default. A paid player's better cats are modelled
 *  separately below rather than pretended into existence here. */
function fillVillagers(s) {
  const beds = villagerCap(s.buildings, s);
  while (Object.keys(s.cats).length < beds) {
    const i = Object.keys(s.cats).length;
    s.cats["v" + i] = { rarity: "common", level: 1, id: i };
  }
}

/** Put every free villager in the best empty seat. Kitchen first — a starving
 *  town produces at a quarter rate, so food beats everything. */
const STAFF_ORDER = ["kitchen", "lumber", "quarry", "garden", "treats"];
function staff(s) {
  const cap = Math.min(workersAllowed(lvl(s, "hall")), villagerCap(s.buildings, s));
  const free = Object.keys(s.cats).filter((k) => !s.assign[k]);
  for (const id of STAFF_ORDER) {
    if (lvl(s, id) < 1) continue;
    const seats = slotsAt(s, id);
    let here = Object.values(s.assign).filter((b) => b === id).length;
    while (here < seats && free.length && Object.keys(s.assign).length < cap) {
      s.assign[free.shift()] = id;
      here++;
    }
  }
}

function crewAt(s, id) {
  return Object.entries(s.assign)
    .filter(([, b]) => b === id)
    .map(([k]) => s.cats[k])
    .filter(Boolean);
}

/** What the town makes in an hour, with staffing, hunger and furniture in. */
function rates(s) {
  const out = {};
  const fishRate = producerRate(s, "kitchen");
  // Nothing eats before there is a Kitchen — the same rule applyUpkeep()
  // applies in the game. A simulator stricter than the game tests a
  // different game.
  const eaten = lvl(s, "kitchen") < 1 ? 0 : upkeepPerHour(Object.keys(s.assign).length);
  const starving = s.res.fish <= 0 && fishRate < eaten;
  for (const id of Object.keys(PRODUCERS)) {
    if (lvl(s, id) < 1) continue;
    const r = producerRate(s, id, starving);
    out[PRODUCERS[id].res] = (out[PRODUCERS[id].res] || 0) + r;
  }
  out.fish = (out.fish || 0) - eaten;
  out.coin = goldPerHour(s, s.buildings);
  return out;
}

function producerRate(s, id, starving = false) {
  if (lvl(s, id) < 1) return 0;
  const crew = crewAt(s, id);
  const power = crew.reduce((a, c) => a + catPower(c.rarity, c.level), 0);
  return effectiveRate(id, lvl(s, id), { power, starving, furniture: 0 });
}

// ---------------------------------------------------------------------------
//  What the player does with an hour
// ---------------------------------------------------------------------------

/** Everything the town could legally start right now, best first.
 *  A brand new building beats an upgrade: a new plot is the most exciting
 *  thing the game can offer and it is what the unlock ladder just promised. */
function moves(s) {
  const hall = lvl(s, "hall");
  const out = [];
  for (const b of BUILDINGS) {
    const level = lvl(s, b.id);
    if (!isUnlocked(b.id, hall)) continue;
    if (level >= maxLevelFor(b.id, hall)) continue;
    if (s.jobs[b.id]) continue;
    if (unmetRequirements(b.id, level, s.buildings).length) continue;
    if (level >= 1 && furnitureGate(s, b.id, level).length) continue;
    const cost = upgradeCostFor(b.id, level);
    if (!canAfford(cost, s.res)) continue;
    out.push({
      id: b.id,
      cost,
      seconds: buildSecondsFor(b.id, level),
      isNew: level < 1,
      // The Cat Hall opens everything else, so it is always the best upgrade.
      score: (level < 1 ? 1000 : 0) + (b.id === "hall" ? 800 : 0) + (PRODUCERS[b.id] ? 200 : 0),
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Fit a piece of furniture if one is blocking an upgrade. */
function fitFurniture(s) {
  for (const b of BUILDINGS) {
    const level = lvl(s, b.id);
    if (level < 1) continue;
    const gate = furnitureGate(s, b.id, level);
    if (!gate.length) continue;
    const g = gate[0];
    const cost = itemCost(g.it, g.at);
    if (!canAfford(cost, s.res)) continue;
    for (const [k, v] of Object.entries(cost)) s.res[k] -= v;
    s.furniture[b.id] = s.furniture[b.id] || {};
    s.furniture[b.id][g.it.id] = (s.furniture[b.id][g.it.id] || 0) + 1;
    return g.it.name + " in " + b.name;
  }
  return null;
}

function tick(s, hour) {
  // production
  const r = rates(s);
  const gains = {};
  for (const [k, v] of Object.entries(r)) if (v > 0) gains[k] = v;
  const { res } = addCapped(s.res, gains, lvl(s, "storehouse"), lvl(s, "hall"));
  s.res = res;
  if (r.fish < 0) s.res.fish = Math.max(0, s.res.fish + r.fish);

  // finish builds
  for (const [id, j] of Object.entries(s.jobs)) {
    if (hour >= j.doneAt) {
      s.buildings[id] = j.to;
      delete s.jobs[id];
      const b = BUILDING_BY_ID[id];
      s.events.push({ hour, what: `${b.name} → ${j.to}`, hall: lvl(s, "hall") });
      s.lastGoodAt = hour;
      fillVillagers(s);
      staff(s);
    }
  }

  // THE LONG ALLEY, once a day.
  //
  // Kingshot's own advice is to push one or two stages a day, and clearing a
  // stage pays Gold — which is the resource that gates furniture, which gates
  // every building upgrade. Leaving Conquest out of the projection made Gold
  // look far scarcer than it is and hid the fact that the hero loop and the
  // town loop are the same loop.
  if (hour % 24 === 10 && s.stage <= s.profile.alleyCeiling) {
    const pushes = Math.min(2, s.profile.alleyCeiling - s.stage + 1);
    for (let i = 0; i < pushes; i++) {
      const r = stageReward(s.stage);
      const { res } = addCapped(s.res, { coin: r.coin }, lvl(s, "storehouse"), lvl(s, "hall"));
      s.res = res;
      s.events.push({ hour, what: `Alley stage ${s.stage} cleared · +${Math.round(r.coin)} Gold`, hall: lvl(s, "hall") });
      s.lastGoodAt = hour;
      s.stage++;
    }
  }

  if (!awake(hour)) return;

  // spend, in a person's order: unblock furniture, then start whatever fits
  let guard = 0;
  while (guard++ < 12) {
    const free = s.builders - Object.keys(s.jobs).length;
    if (free <= 0) break;
    const fitted = fitFurniture(s);
    if (fitted) {
      s.events.push({ hour, what: `fitted ${fitted}`, hall: lvl(s, "hall"), small: true });
      s.lastGoodAt = hour;
      continue;
    }
    const m = moves(s)[0];
    if (!m) break;
    for (const [k, v] of Object.entries(m.cost)) s.res[k] -= v;
    let secs = m.seconds;
    // A spender rushes rather than waiting through the night.
    const p = s.profile;
    const endsAsleep = !awake(hour + Math.ceil(secs / 3600));
    if (p.rushes === true || (p.rushes === "night" && endsAsleep && secs > 3 * 3600)) {
      const cost = Math.max(1, Math.ceil(secs / 300));
      if (s.res.gold >= cost) {
        s.res.gold -= cost;
        secs = 0;
      }
    }
    s.jobs[m.id] = { to: lvl(s, m.id) + 1, doneAt: hour + Math.max(0, Math.ceil(secs / 3600)) };
    if (secs === 0) {
      s.buildings[m.id] = s.jobs[m.id].to;
      delete s.jobs[m.id];
      s.events.push({ hour, what: `${BUILDING_BY_ID[m.id].name} → ${lvl(s, m.id)} (rushed)`, hall: lvl(s, "hall") });
      s.lastGoodAt = hour;
      fillVillagers(s);
      staff(s);
    }
  }
  staff(s);
}

// ---------------------------------------------------------------------------
//  Run
// ---------------------------------------------------------------------------
const results = {};
for (const [key, profile] of Object.entries(PROFILES)) {
  const s = freshTown(profile);
  fillVillagers(s);
  staff(s);
  const gaps = [];
  let prevGood = 0;
  for (let h = 0; h < HOURS; h++) {
    const before = s.events.length;
    tick(s, h);
    if (s.events.length > before) {
      const big = s.events.slice(before).some((e) => !e.small);
      if (big) {
        // Only count waking hours: a gap the player slept through is not a gap.
        let waking = 0;
        for (let x = prevGood; x < h; x++) if (awake(x)) waking++;
        gaps.push({ at: h, waking });
        prevGood = h;
      }
    }
  }
  results[key] = { save: s, gaps };
}

// ---------------------------------------------------------------------------
//  Report
// ---------------------------------------------------------------------------
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.round(n)));
const pad = (s2, n) => String(s2).padEnd(n);

console.log(`\n  ${DAYS} days, hour by hour, on the real economy.\n`);
console.log(
  "  " + pad("", 16) + pad("spend", 8) + pad("Hall", 6) + pad("built", 7) +
    pad("cats", 6) + pad("working", 9) + pad("wood/h", 9) + pad("alley", 7) + "worst wait"
);
console.log("  " + "-".repeat(78));

for (const [key, { save: s, gaps }] of Object.entries(results)) {
  const built = BUILDINGS.filter((b) => lvl(s, b.id) >= 1).length;
  const r = rates(s);
  const worst = gaps.reduce((m, g) => Math.max(m, g.waking), 0);
  console.log(
    "  " +
      pad(PROFILES[key].name, 16) +
      pad("$" + PROFILES[key].spend.toFixed(0), 8) +
      pad(lvl(s, "hall"), 6) +
      pad(built + "/" + BUILDINGS.length, 7) +
      pad(Object.keys(s.cats).length, 6) +
      pad(Object.keys(s.assign).length + "/" + Math.min(workersAllowed(lvl(s, "hall")), villagerCap(s.buildings, s)), 9) +
      pad(fmt(r.wood || 0), 9) +
      pad("s" + (s.stage - 1), 7) +
      worst + "h awake"
  );
}

// ---- where each one stalls -------------------------------------------------
console.log("\n  Longest waits with nothing to show for them (waking hours):\n");
for (const [key, { gaps, save: s }] of Object.entries(results)) {
  const bad = gaps.filter((g) => g.waking >= 6).sort((a, b) => b.waking - a.waking).slice(0, 5);
  console.log(`  ${PROFILES[key].name}`);
  if (!bad.length) {
    console.log("    nothing over 6h — the drip never stops\n");
    continue;
  }
  for (const g of bad) {
    const ev = s.events.find((e) => e.hour === g.at);
    console.log(
      `    day ${String(Math.floor(g.at / 24) + 1).padStart(2)} · ${String(g.waking).padStart(3)}h waiting → ${ev ? ev.what : "?"}`
    );
  }
  console.log();
}

// ---- the shape of the first week, which is where players are lost ----------
// ---- what each one is waiting for at the end -------------------------------
console.log("  Blocked on, at the end:");
console.log();
for (const [key, { save: s }] of Object.entries(results)) {
  console.log(`  ${PROFILES[key].name}`);
  const hall = lvl(s, "hall");
  let said = 0;
  for (const b of BUILDINGS) {
    const level = lvl(s, b.id);
    if (!isUnlocked(b.id, hall) || level >= maxLevelFor(b.id, hall)) continue;
    const un = unmetRequirements(b.id, level, s.buildings);
    const gate = level >= 1 ? furnitureGate(s, b.id, level) : [];
    const cost = upgradeCostFor(b.id, level);
    const why = un.length
      ? "needs " + un.map((r) => `${BUILDING_BY_ID[r.id]?.name || r.id} ${r.level}`).join(", ")
      : gate.length
        ? "needs the " + gate[0].it.name
        : canAfford(cost, s.res)
          ? "affordable — the builders are the wall"
          : "short " + Object.entries(cost).filter(([k, v]) => (s.res[k] || 0) < v).map(([k, v]) => `${k} ${Math.round(v - (s.res[k] || 0))}`).join(", ");
    console.log(`    ${(BUILDING_BY_ID[b.id]?.name || b.id).padEnd(18)} L${level} · ${why}`);
    if (++said >= 5) break;
  }
  console.log();
}

console.log("  Cat Hall by day:\n");
console.log("  " + pad("", 16) + [1, 2, 3, 5, 7, 14, 21, 30].filter((d) => d <= DAYS).map((d) => "d" + String(d).padEnd(4)).join(""));
for (const [key, { save: s }] of Object.entries(results)) {
  const row = [1, 2, 3, 5, 7, 14, 21, 30]
    .filter((d) => d <= DAYS)
    .map((d) => {
      const h = d * 24;
      const last = s.events.filter((e) => e.hour < h && !e.small).reduce((m, e) => Math.max(m, e.hall), 1);
      return String(last).padEnd(5);
    })
    .join("");
  console.log("  " + pad(PROFILES[key].name, 16) + row);
}
console.log();
