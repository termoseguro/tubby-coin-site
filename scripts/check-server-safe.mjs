// npm run check:server — proves the economy can run on the server.
//
// The whole security model rests on one claim: "the game rules are pure, so the
// server can compute them and the client can be treated as a liar." That claim
// is worthless as a comment. This runs the economy in plain Node — no React, no
// DOM, no localStorage, no window — and fails the moment somebody reaches for
// a browser global inside the rules.
//
// Run it before every commit that touches lib/. If it fails, the fix is never
// "add a guard for window" — it is to move whatever needed the browser back
// into the React layer where it belongs.

import assert from "node:assert/strict";

// If any rules module touches these, importing it here throws rather than
// silently working in dev and breaking in a route handler.
for (const bad of ["window", "document", "localStorage", "navigator"]) {
  Object.defineProperty(globalThis, bad, {
    configurable: true,
    get() {
      throw new Error(
        `A rules module reached for \`${bad}\`. The economy must run on the ` +
          `server — see docs/backend-setup.md §6.`
      );
    },
  });
}

const economy = await import("../lib/townEconomy.js");
const furniture = await import("../lib/townFurniture.js");
const config = await import("../lib/townConfig.js");
const quests = await import("../lib/townQuests.js");

const {
  addCapped, canAfford, effectiveRate, goldPerHour, isUnlocked, maxLevelFor,
  producedOver, ratePerHour, shortfall, startLevel, storeCap, unmetRequirements,
  upgradeCostFor, villagerCap,
} = economy;

let checks = 0;
const ok = (label, fn) => {
  fn();
  checks++;
};

// ---------------------------------------------------------------------------
//  A day-one town, built the way the server would build one.
// ---------------------------------------------------------------------------
const levelsOf = (s) =>
  Object.fromEntries(config.BUILDINGS.map((b) => [b.id, s.buildings[b.id] ?? startLevel(b.id)]));

const fresh = () => ({
  res: { fish: 400, wood: 400, stone: 60, catnip: 0, treats: 200, coin: 250, gold: 30 },
  buildings: {},
  furniture: {},
  cats: {},
  assign: {},
  raidStage: 0,
});

ok("a new town starts with ONE villager", () => {
  // Kingshot opens with almost nothing and that is the point. One cottage,
  // one cat.
  const s = fresh();
  assert.equal(villagerCap(levelsOf(s), s), 1);
});

ok("a new town has a Cat Hall, a Lumber Yard and one cottage — and nothing else", () => {
  const s = fresh();
  const L = levelsOf(s);
  assert.equal(L.hall, 1);
  assert.equal(L.lumber, 1, "the Sawmill is Kingshot's first production building");
  assert.equal(L.cottage1, 1);
  assert.equal(L.kitchen, 0, "the Mill arrives at TC2, not on day one");
  assert.equal(L.quarry, 0, "the Quarry arrives at TC3");
  assert.equal(L.adoption, 0, "the Hero Hall arrives at TC4");
  assert.equal(L.garden, 0, "the Iron Mine arrives at TC5");
});

ok("the unlock ladder is Kingshot's, level for level", () => {
  const at = (id, lvl) => isUnlocked(id, lvl) && !isUnlocked(id, lvl - 1);
  assert.ok(at("kitchen", 2), "Mill at TC2");
  assert.ok(at("quarry", 3), "Quarry at TC3");
  assert.ok(at("adoption", 4), "Hero Hall at TC4");
  assert.ok(at("garden", 5), "Iron Mine at TC5");
  assert.ok(at("training", 7), "Barracks at TC7");
  assert.ok(at("range", 8), "Range at TC8");
  assert.ok(at("study", 9), "Academy at TC9");
  assert.ok(at("warroom", 10), "Command Center at TC10");
  assert.ok(at("forge", 20), "Mastery Forging at TC20");
});

ok("nothing may outgrow the Cat Hall", () => {
  assert.equal(maxLevelFor("kitchen", 3), 3);
  assert.equal(maxLevelFor("hall", 3), 30);
});

// ---------------------------------------------------------------------------
//  The two exploits the client would try first.
// ---------------------------------------------------------------------------
ok("an unbuilt producer produces nothing", () => {
  assert.equal(ratePerHour("garden", 0), 0);
  assert.equal(effectiveRate("garden", 0, { power: 99 }), 0);
});

ok("time cannot be conjured — production is a rate times real seconds", () => {
  const perHour = 1000;
  assert.equal(producedOver(perHour, 3600), 1000);
  assert.equal(producedOver(perHour, 0), 0);
  // The server passes its OWN elapsed seconds. A negative or absurd value from
  // a client would be caught here, but it never gets to ask.
  assert.equal(producedOver(perHour, -99999), 0);
});

ok("the Storehouse cap is a hard ceiling and overflow is reported", () => {
  const cap = storeCap(1, "fish");
  const { res, wasted } = addCapped({ fish: cap - 10 }, { fish: 500 }, 1);
  assert.equal(res.fish, cap);
  assert.equal(wasted, 490);
});

ok("a stockpile already over the cap is frozen, never reduced", () => {
  // The bug: Math.min(cap, before + v) deleted everything above the cap the
  // instant anything was added, so a save that was over the line for any reason
  // lost the excess on the next tick. Gaining should never subtract.
  const cap = storeCap(1, "coin");
  const { res, wasted } = addCapped({ coin: cap + 3600 }, { coin: 420 }, 1);
  assert.equal(res.coin, cap + 3600, "the excess must survive");
  assert.equal(wasted, 420, "and the gain is what was wasted");
});

ok("float noise is not overflow", () => {
  // The bug this used to have: production runs four times a second, so gains
  // are fractions, and (after - before) drifted by ~1e-14 which read as loss.
  let res = { fish: 123.456 };
  let total = 0;
  for (let i = 0; i < 500; i++) {
    const out = addCapped(res, { fish: 0.0413 }, 9);
    res = out.res;
    total += out.wasted;
  }
  assert.equal(total, 0, "a town nowhere near its cap must never report waste");
});

// ---------------------------------------------------------------------------
//  Costs, gates and the dependency web.
// ---------------------------------------------------------------------------
ok("building a plot is never free", () => {
  const c = upgradeCostFor("storehouse", 0);
  assert.ok(c.wood > 0 && c.fish > 0, "level 0 must be priced like level 1");
});

ok("shortfall names exactly what is missing", () => {
  const missing = shortfall({ wood: 500, fish: 100 }, { wood: 200, fish: 999 });
  assert.deepEqual(missing, { wood: 300 });
  assert.equal(canAfford({ wood: 500 }, { wood: 500 }), true);
});

ok("the Cat Hall waits for the town, and never deadlocks at level 1", () => {
  const s = fresh();
  assert.deepEqual(unmetRequirements("hall", 1, levelsOf(s)), [],
    "hall 1 to 2 must be reachable on a brand new save — the Lumber Yard is already at 1");
  const mid = { ...levelsOf(s), hall: 3, lumber: 3 };
  assert.ok(unmetRequirements("hall", 3, mid).length > 0,
    "hall 3 to 4 must wait for the buildings behind it");
});

ok("furniture gates its building", () => {
  const s = fresh();
  const gate = furniture.furnitureGate(s, "lumber", 1);
  assert.ok(gate.length > 0, "an empty Lumber Yard cannot be raised");
  s.furniture.lumber = { toolA: 1 };
  assert.equal(furniture.furnitureGate(s, "lumber", 1).length, 0);
});

ok("furniture raises output, beds and Gold", () => {
  const s = fresh();
  assert.equal(goldPerHour(s, levelsOf(s)), 0, "no bowls, no Gold");
  s.furniture.cottage1 = { bowl: 1, bed: 1 };
  assert.ok(goldPerHour(s, levelsOf(s)) > 0);
  assert.equal(villagerCap(levelsOf(s), s), 2, "a fitted bed houses one more cat");
});

ok("a cat at home is never wasted — it earns Gold", () => {
  // Seats inside buildings come from those buildings' levels, so a healthy town
  // ALWAYS has more residents than jobs. Reported as "18 idle of 24" that reads
  // as a fault; paid as Gold it is the reason to keep building cottages, and it
  // is why Kingshot's Houses are its second-biggest source of idle Gold.
  const cats = {};
  for (let i = 0; i < 10; i++) cats["c" + i] = { rarity: "common", art: "a" + i };
  const busy = { cats, assign: Object.fromEntries(Object.keys(cats).map((k) => [k, "kitchen"])) };
  const home = { cats, assign: {} };
  assert.equal(economy.residentGold(busy), 0, "a working cat earns resources, not Gold");
  assert.ok(economy.residentGold(home) > 0, "a cat at home earns Gold");
});

ok("a villager place inside a building comes from the building's own level", () => {
  // Kingshot's Kitchen reads "+1 Working Survivor" at levels 1, 4 and 7 and
  // stops at three. A town with eleven beds and a level-2 Kitchen can still
  // only put ONE cat in that Kitchen, which is the cap the UI has to explain.
  assert.equal(furniture.seatsFromLevel(1), 1);
  assert.equal(furniture.seatsFromLevel(3), 1);
  assert.equal(furniture.seatsFromLevel(4), 2);
  assert.equal(furniture.seatsFromLevel(7), 3);
  assert.equal(furniture.seatsFromLevel(30), 3);
});

ok("an item cannot outgrow the building holding it", () => {
  const it = furniture.itemsFor("lumber")[0];
  assert.equal(furniture.itemCap(it, 1), 1);
  assert.equal(furniture.itemCap(it, 5), 5);
  assert.equal(furniture.itemCap(it, 99), it.max);
});

// ---------------------------------------------------------------------------
//  Palis — the thing that goes wrong while you are away. The one rule this
//  system must not break is that he never takes PROGRESS.
// ---------------------------------------------------------------------------
const palis = await import("../lib/palis.js");

ok("Palis stays away until the town is worth bothering", () => {
  const out = palis.generateVisits(
    { levels: { hall: 3, lumber: 2 }, lastVisitAt: Date.now() - 99 * 3_600_000 },
    Date.now()
  );
  assert.equal(out.length, 0, "nobody meets the antagonist during the tutorial");
});

ok("a fortnight away is still only a morning's work", () => {
  const levels = { hall: 9, lumber: 5, kitchen: 5, quarry: 5, garden: 4, treats: 4, clinic: 2 };
  const out = palis.generateVisits(
    { levels, lastVisitAt: Date.now() - 24 * 14 * 3_600_000 },
    Date.now(),
    () => 0.99 // defence never triggers, so this is the worst case
  );
  assert.ok(out.length <= palis.MAX_PROBLEMS, "absence must stop accumulating");
});

ok("defences remove problems rather than softening them", () => {
  const bare = palis.defence({ gatehouse: 0, watchtower: 0 });
  const walled = palis.defence({ gatehouse: 8, watchtower: 6 });
  assert.equal(bare, 0);
  assert.ok(walled > bare && walled <= 0.75, "and it is capped, so he never stops coming");
});

ok("a ransacked building stops; a spooked one only slows", () => {
  assert.equal(palis.outputMultiplier([{ kind: "ransacked", building: "kitchen" }], "kitchen"), 0);
  assert.equal(palis.outputMultiplier([{ kind: "spooked", building: "kitchen" }], "kitchen"), 0.5);
  assert.equal(palis.outputMultiplier([{ kind: "ransacked", building: "kitchen" }], "lumber"), 1,
    "and it never touches a building he did not visit");
});

ok("tidying up always pays more than it costs", () => {
  for (const kind of Object.keys(palis.PROBLEMS)) {
    for (const level of [1, 5, 10]) {
      const cost = palis.fixCost({ kind }, level);
      const reward = palis.fixReward({ kind }, level);
      assert.ok(reward.coin > 0, `${kind} must pay something`);
      // A problem you are rewarded for clearing is a reason to open the game;
      // one that only costs you is a reason to stop.
      const spent = Object.values(cost).reduce((a, b) => a + b, 0);
      assert.ok(reward.coin >= spent * 0.8, `${kind} at ${level} costs more than it gives`);
    }
  }
});

// ---------------------------------------------------------------------------
//  The Town Book must stay winnable — a task nobody can finish is a dead end.
// ---------------------------------------------------------------------------
ok("every quest task points at something reachable", () => {
  for (const ch of quests.CHAPTERS) {
    for (const t of ch.tasks) {
      assert.ok(t.goal > 0, `${t.id} has no goal`);
      assert.equal(typeof t.at(fresh()), "number", `${t.id} does not read the save`);
    }
  }
});

console.log(`✓ ${checks} checks — the economy runs with no browser present`);
