// ============================================================================
//  TUBBY TOWN — the economy
//
//  Modelled directly on Kingshot / Whiteout Survival (Century Games), which is
//  the structure this project is copying:
//
//   · Four gathered resources on a 20 : 20 : 4 : 1 abundance ratio, so two are
//     everywhere and two are the ones you are always short of. That imbalance
//     is what creates the "one resource short" moment the shop sells into.
//   · Every producer building accumulates output on its own and STOPS when its
//     little store is full — so you come back, tap, and collect. That tap is
//     the whole retention loop.
//   · A Storehouse caps everything globally, so success itself forces the next
//     upgrade.
//   · The Town Center (our Cat Hall) gates the maximum level of every other
//     building, so progress always funnels back through one decision.
//
//  ⚠ Every number here is client-side and therefore a suggestion, not a fact.
//  Production, caps and collection move to the server before anything of value
//  is attached — see docs/security.md §1 and §4b.
// ============================================================================

import { RARITIES } from "./gameConfig";

/** The five soft resources plus the premium one. Order matters: this is the
 *  order they appear in the top bar. */
export const RESOURCES = {
  fish: { id: "fish", name: "Fish", short: "Fish", color: "#5bb8e8", abundance: 20 },
  wood: { id: "wood", name: "Wood", short: "Wood", color: "#c08b4f", abundance: 20 },
  stone: { id: "stone", name: "Stone", short: "Stone", color: "#8a97ad", abundance: 4 },
  catnip: { id: "catnip", name: "Catnip", short: "Nip", color: "#78be4f", abundance: 1 },
  treats: { id: "treats", name: "Treats", short: "Treats", color: "#f2a03d", abundance: 12 },
  gold: { id: "gold", name: "Golden Fish", short: "Gold", color: "#ffc327", premium: true },
};

export const RESOURCE_ORDER = ["fish", "wood", "stone", "catnip", "treats"];

/** Which building produces what. Buildings not listed here produce nothing —
 *  they gate, store, recruit or defend. */
export const PRODUCERS = {
  kitchen: { res: "fish", base: 320 },
  lumber: { res: "wood", base: 320 },
  quarry: { res: "stone", base: 64 },
  garden: { res: "catnip", base: 16 },
  treats: { res: "treats", base: 190 },
};

/** Units per hour at a given level. */
export function ratePerHour(buildingId, level) {
  const p = PRODUCERS[buildingId];
  if (!p) return 0;
  return Math.round(p.base * Math.pow(level, 1.35));
}

/** How long a building can accumulate before its own little store is full.
 *  Short on purpose: this is the timer that pulls the player back. */
export const HOLD_HOURS = 4;

export function holdCap(buildingId, level) {
  return Math.round(ratePerHour(buildingId, level) * HOLD_HOURS);
}

/** Global cap per resource, set by the Storehouse. Hit it and production is
 *  wasted — which is exactly when the player upgrades, or buys. */
export function storeCap(storehouseLevel, res) {
  const base = 4000 * Math.pow(storehouseLevel, 1.55);
  const scale = { fish: 1, wood: 1, stone: 0.25, catnip: 0.08, treats: 0.6 }[res] ?? 1;
  return Math.round(base * scale);
}

/** How much a building has waiting to be collected, right now. */
export function pending(buildingId, level, sinceMs, nowMs = Date.now()) {
  if (!PRODUCERS[buildingId]) return 0;
  const hours = Math.max(0, (nowMs - sinceMs) / 3_600_000);
  return Math.min(holdCap(buildingId, level), Math.floor(ratePerHour(buildingId, level) * hours));
}

/** Cat Hall level caps every other building — the single funnel that Kingshot
 *  runs everything through. You cannot out-run the town centre. */
export function maxLevelFor(buildingId, hallLevel) {
  return buildingId === "hall" ? 30 : Math.max(1, hallLevel);
}

/** Upgrade cost. Wood and Fish carry the bulk; Stone and Catnip are the
 *  bottleneck, entering at higher levels — the 20:20:4:1 shape. */
export function upgradeCostFor(buildingId, level) {
  const k = buildingId === "hall" ? 2.4 : 1;
  const cost = {
    wood: Math.round(180 * k * Math.pow(level, 1.85)),
    fish: Math.round(150 * k * Math.pow(level, 1.85)),
  };
  if (level >= 2) cost.stone = Math.round(40 * k * Math.pow(level, 1.9));
  if (level >= 4) cost.catnip = Math.round(8 * k * Math.pow(level, 1.95));
  return cost;
}

/** Build time in seconds. SHORT here so the loop can be play-tested end to
 *  end; the real curve is hours and the server owns the clock. */
export function buildSecondsFor(buildingId, level) {
  const k = buildingId === "hall" ? 2 : 1;
  return Math.round(18 * k * Math.pow(level, 1.55));
}

/** Golden Fish to skip the remaining time. Kingshot prices speed-ups by what
 *  is LEFT, not by the total — so a nearly-finished job is cheap to nudge and
 *  a fresh one is not. */
export function rushCost(secondsLeft) {
  return Math.max(1, Math.ceil(secondsLeft / 45));
}

/** Can this upgrade be paid for right now? Returns what is missing. */
export function shortfall(cost, res) {
  const missing = {};
  for (const [k, v] of Object.entries(cost)) {
    const have = res?.[k] || 0;
    if (have < v) missing[k] = v - have;
  }
  return missing;
}

export const canAfford = (cost, res) => Object.keys(shortfall(cost, res)).length === 0;

/** Add resources without exceeding the Storehouse cap. Overflow is lost, and
 *  the player is told — that loss is the Storehouse upgrade's whole argument. */
export function addCapped(res, gains, storehouseLevel) {
  const next = { ...res };
  let wasted = 0;
  for (const [k, v] of Object.entries(gains)) {
    if (!v) continue;
    const cap = storeCap(storehouseLevel, k);
    const before = next[k] || 0;
    const after = Math.min(cap, before + v);
    wasted += v - (after - before);
    next[k] = after;
  }
  return { res: next, wasted };
}

// ============================================================================
//  THE DEPENDENCY WEB
//
//  This is the part that makes Kingshot a game instead of five independent
//  timers. In Kingshot the Town Center does not merely cap the others — you
//  cannot raise it at all until specific other buildings catch up (TC30 needs
//  Embassy 29 AND Range 29). Everything pulls on everything.
//
//  Ours, in the same shape:
//
//     Lumber Yard ──> Storehouse ──┐
//                                  ├──> CAT HALL ──> (caps every building)
//     Kitchen ─────> Nap House ────┘
//
//     Treat Factory ──> Adoption Center
//     Stone Quarry ───> Watchtower
//
//  So raising the Cat Hall means raising the Storehouse and the Nap House
//  first, which means raising the Lumber Yard and the Kitchen first. There is
//  never one thing to do, and never nothing to do.
// ============================================================================

/** To take `id` from `level` to `level + 1`, these buildings must be at least
 *  at `level`. Producers need nothing but the Cat Hall cap. */
export const REQUIRES = {
  hall: (level) => [
    { id: "storehouse", level },
    { id: "nap", level },
  ],
  storehouse: (level) => [{ id: "lumber", level }],
  nap: (level) => [{ id: "kitchen", level }],
  adoption: (level) => [{ id: "treats", level }],
  watchtower: (level) => [{ id: "quarry", level }],
};

/** Which buildings this one is holding back — shown in its panel so the player
 *  can see WHY they should care about a building that produces nothing. */
export const UNLOCKS = {
  lumber: ["storehouse"],
  kitchen: ["nap"],
  storehouse: ["hall"],
  nap: ["hall"],
  treats: ["adoption"],
  quarry: ["watchtower"],
  hall: ["every building"],
};

/** Unmet prerequisites for the next level of `id`. Empty means good to go. */
export function unmetRequirements(id, level, levels) {
  const need = REQUIRES[id]?.(level) || [];
  return need.filter((r) => (levels[r.id] || 1) < r.level);
}

// ---------------------------------------------------------------------------
//  CATS, FOOD AND THE NAP HOUSE
//
//  A quarry that makes stone out of nothing is not a game. Cats do the work,
//  cats eat, and cats get tired — so every extra cat costs Fish and costs a
//  bed, and the Kitchen and Nap House stop being decoration.
// ---------------------------------------------------------------------------

/** How many cats can be on shift at once, set by the Nap House. Every cat
 *  needs somewhere to sleep, so beds are the real worker cap. */
export const workerCap = (napLevel) => 1 + napLevel * 2;

/** Fish eaten per hour by the whole workforce. Scales faster than linearly on
 *  purpose: doubling your cats more than doubles the Kitchen you need. */
export const upkeepPerHour = (cats) => Math.round(26 * Math.pow(Math.max(0, cats), 1.15));

/** What one cat is worth at work.
 *
 *  This is the answer to "what is a Legendary actually better AT". Rarity was
 *  decorative before: the output multiplier counted how MANY cats were in a
 *  building and never which ones, so a Mythic and a stray did identical work.
 *
 *  Raw rarity multipliers run 1 / 3 / 9 / 30 / 100, which is far too swingy for
 *  a three-slot building — one Mythic would be worth a hundred strays and every
 *  other cat would be litter. Taking them to the power 0.45 keeps the ORDER and
 *  compresses the spread to roughly 1 / 1.6 / 2.6 / 4.5 / 8.1, so a Mythic is
 *  worth about eight strays: unmistakably better, still not the whole game.
 *  Levelling a cat adds 22% on top, which is what makes duplicates matter. */
export function catPower(rarity, level = 1) {
  const mult = RARITIES[rarity]?.mult ?? 1;
  return Math.pow(mult, 0.45) * (1 + 0.22 * (level - 1));
}

/** A building's output multiplier from the crew standing in it. Zero cats still
 *  produces something — the town should never fully stall — and a great crew
 *  is worth many times a full one of strays. */
export function staffing(crewPower = 0) {
  return Math.min(8, 0.45 + crewPower * 0.25);
}

/** Sum of the crew's power at one building. */
export const crewPower = (crew = []) =>
  crew.reduce((a, c) => a + catPower(c.rarity, c.level || 1), 0);

/** Hungry towns work badly. This is the whole reason Fish matters, and the
 *  reason the Kitchen is not optional. */
export const STARVING_MULTIPLIER = 0.25;

/** Everything that scales a producer's rate, in one place. */
export function effectiveRate(buildingId, level, { power = 0, starving = false } = {}) {
  const base = ratePerHour(buildingId, level);
  return base * staffing(power) * (starving ? STARVING_MULTIPLIER : 1);
}

/** The Treat Factory refines rather than conjures: it turns Fish and Catnip
 *  into Treats. If the inputs are not there, it makes less — which is what
 *  ties the Kitchen and the Garden to the currency the gacha runs on. */
export const REFINERS = {
  treats: { fish: 0.6, catnip: 0.02 },
};

/** How much of `amount` a refiner can actually produce from what is in store,
 *  and what that costs in inputs. */
export function refine(buildingId, amount, res) {
  const recipe = REFINERS[buildingId];
  if (!recipe) return { amount, inputs: {} };
  let possible = amount;
  for (const [k, per] of Object.entries(recipe)) {
    if (per <= 0) continue;
    possible = Math.min(possible, Math.floor((res[k] || 0) / per));
  }
  possible = Math.max(0, possible);
  const inputs = {};
  for (const [k, per] of Object.entries(recipe)) inputs[k] = Math.ceil(possible * per);
  return { amount: possible, inputs, short: possible < amount };
}

// ============================================================================
//  WHAT EACH RESOURCE IS ACTUALLY FOR
//
//  A resource that only pays for building upgrades has no identity — you never
//  think about it, you just watch a number. In Kingshot Bread feeds troops AND
//  trains them AND heals them; Stone builds AND researches. Every resource has
//  several places to go, and that is what makes running out of one of them feel
//  like a specific problem instead of a generic delay.
//
//  This table is shown to the player verbatim, so a resource is never a mystery.
// ============================================================================

export const RESOURCE_USES = {
  fish: [
    "Feeds every cat on shift, every hour",
    "Wakes a tired cat instantly",
    "Part of most building upgrades",
  ],
  wood: ["The backbone of every construction", "Extra worker spots at the Nap House"],
  stone: ["Construction from level 2 up", "Training a cat to the next level"],
  catnip: [
    "Boosts one building to double output for a while",
    "Upgrades from level 4 up",
  ],
  treats: ["Adoption Center pulls", "Training cats", "Speeding small jobs"],
  gold: ["Finish any timer instantly", "Extra builders", "Extra worker spots", "Premium pulls"],
};

/** Cats one building can hold. Three is enough to matter and few enough to
 *  make you choose — which is the point of a cap. */
export const MAX_PER_BUILDING = 3;

/** Extra worker spots bought with Golden Fish, on top of what the Nap House
 *  gives. Escalating, because the Nap House should stay the main route. */
export const extraSlotCost = (bought) => 120 + bought * 90;

/** Catnip needed to boost a building, and how long the boost lasts. */
export const BOOST = { catnip: 40, seconds: 900, multiplier: 2 };
