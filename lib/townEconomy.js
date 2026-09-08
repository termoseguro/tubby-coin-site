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

import { RARITIES } from "./gameConfig.js";
import { BUILDING_BY_ID, COTTAGE_IDS, MAX_COTTAGES } from "./townConfig.js";
import { bonusesAt, seatsFromLevel, townComfort } from "./townFurniture.js";
import { idleGoldMultiplier } from "./conquest.js";

/** The five soft resources plus the premium one. Order matters: this is the
 *  order they appear in the top bar. */
export const RESOURCES = {
  fish: { id: "fish", name: "Fish", short: "Fish", color: "#5bb8e8", abundance: 20 },
  wood: { id: "wood", name: "Wood", short: "Wood", color: "#c08b4f", abundance: 20 },
  stone: { id: "stone", name: "Stone", short: "Stone", color: "#8a97ad", abundance: 4 },
  catnip: { id: "catnip", name: "Catnip", short: "Nip", color: "#78be4f", abundance: 1 },
  treats: { id: "treats", name: "Treats", short: "Treats", color: "#f2a03d", abundance: 12 },
  // GOLD — a soft currency, and a completely different thing from the premium
  // one. In Kingshot Gold comes from Houses and from Rebel Invasion, and its
  // only sinks are FURNITURE and RESEARCH. That is why it can be handed out by
  // a raid without touching the money: it buys depth, never speed.
  coin: { id: "coin", name: "Gold", short: "Gold", color: "#e0a520", abundance: 2 },
  // The premium one. Buys TIME and nothing else — Kingshot's gems.
  gold: { id: "gold", name: "Golden Fish", short: "G.Fish", color: "#ffc327", premium: true },
};

export const RESOURCE_ORDER = ["fish", "wood", "stone", "catnip", "treats", "coin"];

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

// ---------------------------------------------------------------------------
//  PRODUCTION IS CONTINUOUS. THERE IS NO TAP.
//
//  The town used to hold each building's output in its own little store until
//  the player tapped it — the Hay Day loop. Kingshot does not do that: a
//  Farmland pours into the global stockpile at a rate per hour, forever, and
//  the only thing that ever stops it is the Storehouse cap.
//
//  That single change moves the retention hook. It is no longer "come back and
//  tap five buildings"; it is "come back before the stockpile overflows and you
//  start losing what the town made". Which is a better hook, because the wall
//  it puts up — the cap — is the thing the shop actually sells past.
//
//  The consequence for the UI is the whole point of this change: with no tap,
//  a building's panel has to SAY what it makes per hour and per day, so the
//  player can read a building instead of milking it.
// ---------------------------------------------------------------------------

/** What one building pays out over a stretch of time, at a given rate. */
export function producedOver(ratePerHourNow, seconds) {
  return (ratePerHourNow * Math.max(0, seconds)) / 3600;
}

/** Global cap per resource, set by the Storehouse. Hit it and production is
 *  wasted — which is exactly when the player upgrades, or buys. */
export function storeCap(storehouseLevel, res) {
  // Clamped to 1: the Storehouse does not exist until Cat Hall 2, and a town
  // whose global cap is literally zero cannot hold its starting resources.
  const base = 4000 * Math.pow(Math.max(1, storehouseLevel), 1.55);
  const scale = { fish: 1, wood: 1, stone: 0.25, catnip: 0.08, treats: 0.6, coin: 0.35 }[res] ?? 1;
  return Math.round(base * scale);
}

/** Cat Hall level caps every other building — the single funnel that Kingshot
 *  runs everything through. You cannot out-run the town centre. */
export function maxLevelFor(buildingId, hallLevel) {
  return buildingId === "hall" ? 30 : Math.max(1, hallLevel);
}

// ---------------------------------------------------------------------------
//  UNLOCKS — the reason there is always something to do
//
//  In Kingshot no building simply exists: each one appears at a Town Center
//  level (Embassy at TC8, Storehouse at TC9, Governor Gear at TC22). A player
//  who logs in on day one can see the shape of the whole town and knows exactly
//  which building buys them the next piece of it.
//
//  So a building here is in one of three states, and the whole UI keys off it:
//
//     LOCKED  hall level too low   → shown greyed, with the level it needs
//     PLOT    unlocked, level 0    → an empty site with a Build button
//     BUILT   level ≥ 1            → the normal building
//
//  Level 0 is what makes construction and upgrading one code path: building a
//  plot is just the 0 → 1 upgrade, with the same cost, timer and builder.
// ---------------------------------------------------------------------------

/** Is this building available to build at all yet? */
export function isUnlocked(buildingId, hallLevel) {
  const b = BUILDING_BY_ID[buildingId];
  return !b || hallLevel >= (b.unlockAt || 1);
}

/** The level a building starts at: 1 for the handful the town opens with,
 *  0 (an empty plot) for everything else. */
export function startLevel(buildingId) {
  return BUILDING_BY_ID[buildingId]?.built ? 1 : 0;
}

/** Upgrade cost. Wood and Fish carry the bulk; Stone and Catnip are the
 *  bottleneck, entering at higher levels — the 20:20:4:1 shape.
 *
 *  Level 0 (first construction) is priced as level 1: Math.pow(0, …) is zero,
 *  and a free building is not a decision. */
export function upgradeCostFor(buildingId, level) {
  const L = Math.max(1, level);
  const k = buildingId === "hall" ? 2.4 : BUILDING_BY_ID[buildingId]?.cottage ? 0.7 : 1;
  const cost = {
    wood: Math.round(180 * k * Math.pow(L, 1.85)),
    fish: Math.round(150 * k * Math.pow(L, 1.85)),
  };
  if (L >= 2) cost.stone = Math.round(40 * k * Math.pow(L, 1.9));
  if (L >= 4) cost.catnip = Math.round(8 * k * Math.pow(L, 1.95));
  return cost;
}

/** Build time in seconds. SHORT here so the loop can be play-tested end to
 *  end; the real curve is hours and the server owns the clock. */
export function buildSecondsFor(buildingId, level) {
  const k = buildingId === "hall" ? 2 : 1;
  return Math.round(18 * k * Math.pow(Math.max(1, level), 1.55));
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
    // Waste is what did not FIT, measured against the cap directly. Deriving it
    // from (after - before) instead looks equivalent and is not: production now
    // runs four times a second, so v is a fraction, and float noise of ~1e-14
    // read as overflow — the town warned it was losing resources while the
    // Storehouse sat at a tenth full.
    // What of THIS gain did not fit. Clamped to v, or a stockpile that is
    // already over the cap reports its whole excess as freshly wasted every
    // single tick.
    wasted += Math.max(0, Math.min(v, before + v - cap));
    // Never REDUCE a stockpile. Math.min(cap, ...) alone silently deleted
    // everything above the cap the moment anything was added — so a save that
    // was over the line for any reason (a migration, a balance change, a
    // Storehouse that has not been built yet) lost the excess on the next tick
    // rather than simply stopping there. Over-cap stock is frozen, not stolen.
    next[k] = Math.max(before, Math.min(cap, before + v));
  }
  // Sub-unit waste is rounding, not loss, and is not worth telling anyone about.
  return { res: next, wasted: wasted < 1 ? 0 : wasted };
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
  // THE CAT HALL IS THE HARDEST THING IN THE GAME TO RAISE, and it gets harder
  // in a specific way: every building the ladder unlocks becomes, from then on,
  // another thing the Cat Hall waits for. Kingshot's TC30 needs Embassy 29 AND
  // Range 29 — the town centre is the last thing to move, never the first.
  //
  // Each clause switches on at the level that unlocks the building it names, so
  // nothing is ever required before it exists. That is the rule that keeps this
  // web from bricking a save, and it is checked by scripts/check-progress.mjs.
  //
  // The `adoption` line is Kingshot's, verbatim: "From Level 5, Hero Hall must
  // be at least Level 1."
  hall: (level) => {
    const need = [{ id: "lumber", level }];
    if (level >= 2) need.push({ id: "kitchen", level: level - 1 });
    if (level >= 3) need.push({ id: "quarry", level: level - 2 });
    if (level >= 4) need.push({ id: "adoption", level: 1 });
    if (level >= 5) need.push({ id: "garden", level: level - 4 });
    if (level >= 9) need.push({ id: "storehouse", level: level - 8 });
    if (level >= 9) need.push({ id: "study", level: level - 8 });
    return need;
  },

  // A producer leans on the one that came before it, so the ladder is felt on
  // the way up rather than only at the Cat Hall.
  kitchen: (level) => [{ id: "lumber", level: Math.max(0, level - 1) }],
  quarry: (level) => [{ id: "kitchen", level: Math.max(0, level - 1) }],
  garden: (level) => [{ id: "quarry", level: Math.max(0, level - 1) }],
  treats: (level) => [{ id: "kitchen", level: Math.max(0, level - 1) }],
  adoption: (level) => [{ id: "treats", level: Math.max(0, level - 1) }],
  storehouse: (level) => [{ id: "lumber", level }],

  // The late buildings lean on the mid ones.
  watchtower: (level) => [{ id: "quarry", level }],
  clinic: (level) => [{ id: "garden", level: Math.max(0, level - 1) }],
  study: (level) => [{ id: "quarry", level }],
  guildhall: (level) => [{ id: "storehouse", level: Math.max(0, level - 1) }],
  training: (level) => [{ id: "quarry", level: Math.max(0, level - 1) }],
  range: (level) => [{ id: "training", level: Math.max(0, level - 1) }],
  stable: (level) => [{ id: "range", level: Math.max(0, level - 1) }],
  warroom: (level) => [{ id: "study", level: Math.max(0, level - 1) }],
  gatehouse: (level) => [{ id: "watchtower", level: Math.max(0, level - 1) }],
  forge: (level) => [{ id: "study", level: Math.max(0, level - 2) }],
};

// Every Cat Cottage needs the Kitchen to keep up: more homes means more mouths,
// and a town that houses cats it cannot feed is how a player learns what Fish
// is for. Cottage 1 is exempt, because it exists before the Kitchen does.
for (const id of COTTAGE_IDS.slice(1)) {
  REQUIRES[id] = (level) => [{ id: "kitchen", level: Math.max(0, level - 1) }];
}

/** Which buildings this one is holding back — shown in its panel so the player
 *  can see WHY they should care about a building that produces nothing. */
export const UNLOCKS = {
  lumber: ["storehouse", "quarry"],
  kitchen: ["garden", "every Cat Cottage"],
  storehouse: ["hall", "study"],
  cottage1: ["hall"],
  treats: ["adoption", "hall"],
  garden: ["treats", "clinic", "hall"],
  quarry: ["watchtower", "study", "gatehouse"],
  watchtower: ["gatehouse"],
  clinic: ["hall"],
  study: ["hall"],
  gatehouse: ["hall"],
  hall: ["every building"],
};

/** Unmet prerequisites for the next level of `id`. Empty means good to go.
 *  An unbuilt building is level 0, so a missing prerequisite reads as "level 0
 *  of 3" rather than silently passing. */
export function unmetRequirements(id, level, levels) {
  const need = REQUIRES[id]?.(level) || [];
  return need.filter((r) => (levels[r.id] ?? 0) < r.level);
}

// ---------------------------------------------------------------------------
//  CATS, FOOD AND THE NAP HOUSE
//
//  A quarry that makes stone out of nothing is not a game. Cats do the work,
//  cats eat, and cats get tired — so every extra cat costs Fish and costs a
//  bed, and the Kitchen and Nap House stop being decoration.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  CAT VILLAGERS — the town's population
//
//  Where population comes from was the one thing worth getting exactly right,
//  because every other number leans on it. Kingshot's answer, confirmed in the
//  research (docs/kingshot-teardown.md §1), is a MIX and not a single building:
//
//     · Houses hold the residents. Up to EIGHT houses, and upgrading a house
//       and the furniture in it raises how many residents can live there, to a
//       hard ceiling of 32 across the whole town.
//     · The Town Center does not hold anyone. It gates which houses may be
//       built at all, and how far each one may be raised.
//
//  So ours: eight Cat Cottages hold the villagers, four each at full level, 32
//  in total. The Cat Hall unlocks cottages 3 through 8 as it grows and caps
//  their level. Population is therefore something you BUILD, level by level,
//  instead of a number that arrives on its own — which is the difference
//  between a stat and a goal.
//
//  A cottage at level 0 is an unbuilt plot and houses nobody.
// ---------------------------------------------------------------------------

/** Villagers housed by ONE cottage at a given level: one per level, four at
 *  most. Eight cottages × four = the 32 ceiling. */
export const cottageBeds = (level) => (level < 1 ? 0 : Math.min(4, level));

/** The hard ceiling on the town's population, matching Kingshot's 32. */
export const MAX_VILLAGERS = MAX_COTTAGES * 4;

/** How many cat villagers the town can have, from the cottages that exist.
 *  Takes the LEVELS OBJECT, not the hall level — population is the sum of the
 *  homes you built, and that is the whole point of the change. */
export function villagerCap(levels = {}, save = null) {
  let beds = 0;
  for (const id of COTTAGE_IDS) {
    const lvl = levels[id] ?? 0;
    if (lvl < 1) continue;
    // The cottage itself houses one; every bed, basket and shelf inside it
    // houses another. This is Kingshot's rule exactly — "as you upgrade the
    // Houses AND THE FURNITURE INSIDE THEM, the amount of Residents that can
    // join your town increases" — and it is why furniture is not decoration.
    beds += save ? Math.min(4, 1 + bonusesAt(save, id, lvl).beds) : cottageBeds(lvl);
  }
  return Math.min(MAX_VILLAGERS, beds);
}

/** Villager places INSIDE one building come from the BUILDING'S OWN LEVEL, at
 *  levels 1 / 4 / 7 — Kingshot's Kitchen reads "+1 Working Survivor" at exactly
 *  those three levels and stops at three. Buying a place early is still on the
 *  table; it is now a shortcut past a wait rather than the only route, which is
 *  the difference between pay-to-speed and pay-to-win. */
export const BASE_SLOTS_PER_BUILDING = 1;

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

/** Everything that scales a producer's rate, in one place — including the
 *  furniture inside it, which is the whole reason to open a building. */
export function effectiveRate(buildingId, level, { power = 0, starving = false, furniture = 0 } = {}) {
  const base = ratePerHour(buildingId, level);
  return base * staffing(power) * (starving ? STARVING_MULTIPLIER : 1) * (1 + furniture / 100);
}

// ---------------------------------------------------------------------------
//  GOLD — where it comes from
//
//  Kingshot: Houses and Rebel Invasion. Nothing else idles Gold, which is what
//  keeps furniture and research feeling like they cost something real.
//
//  Ours: the Cat Cottages pay Gold every hour from their bowls and windows, and
//  every comfort item anywhere in town raises what ALL of them pay. So a Clinic
//  with a warm bath in it makes the whole town richer, and no building is ever
//  dead weight.
// ---------------------------------------------------------------------------

/** What one villager sitting at home pays every hour.
 *
 *  A cat that is not in a building is NOT wasted, and getting this wrong is
 *  what made the villager count read as a bug: cottage beds outgrow the seats
 *  inside buildings — seats come from a building's own level, 1 then 4 then 7 —
 *  so a healthy town always has more residents than jobs. Reported as "18 idle
 *  of 24" that looks broken. It is not; they are at home earning, which is
 *  exactly why Kingshot's Houses are the second-biggest source of idle Gold in
 *  the game.
 *
 *  So the choice is real in both directions: send a cat to work for RESOURCES,
 *  or leave it at home for GOLD. */
export const RESIDENT_GOLD = 5;

/** Gold from the cats currently at home, weighted by what they are. */
export function residentGold(save) {
  const assigned = new Set(Object.keys(save?.assign || {}));
  let g = 0;
  for (const [key, cat] of Object.entries(save?.cats || {})) {
    if (assigned.has(key)) continue;
    g += RESIDENT_GOLD * Math.pow(RARITIES[cat.rarity]?.mult ?? 1, 0.3);
  }
  return g;
}

export function goldPerHour(save, levels = {}) {
  let base = residentGold(save);
  for (const id of COTTAGE_IDS) {
    const lvl = levels[id] || 0;
    if (lvl > 0) base += bonusesAt(save, id, lvl).coin;
  }
  // Comfort raises it, and the LONG ALLEY multiplies it. That second term is
  // the reason to push a stage you might lose: in Kingshot "clearing stages
  // raises your idle resource generation, so the payout is continuous". It
  // belongs to Conquest, not to the raid — an earlier version had it bolted
  // onto Palis, which the research corrected. See lib/conquest.js.
  return (
    base *
    (1 + townComfort(save, levels) / 100) *
    idleGoldMultiplier(save?.conquest?.cleared || 0)
  );
}

/** The Treat Factory refines rather than conjures: it turns Fish and Catnip
 *  into Treats. If the inputs are not there, it makes less — which is what
 *  ties the Kitchen and the Garden to the currency the gacha runs on. */
export const REFINERS = {
  // Fish only. It used to want Catnip as well, which was fine when everything
  // existed on day one and became a deadlock the moment the unlock ladder put
  // the Catnip Garden two Cat Hall levels AFTER the Treat Factory. Catnip's job
  // is boosts and late upgrades; it is not a gate on the gacha currency.
  treats: { fish: 0.6 },
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
  // Two routes to more villagers, and the text has to make the difference
  // obvious: cottages house them, the Cat Hall unlocks more cottages.
  wood: [
    "The backbone of every construction",
    "Building and raising Cat Cottages, which is where villagers live",
  ],
  stone: ["Construction from level 2 up", "Training a cat to the next level"],
  catnip: [
    "Boosts one building to double output for a while",
    "Upgrades from level 4 up",
  ],
  treats: ["Adoption Center pulls", "Training cats", "Speeding small jobs"],
  coin: [
    "Every piece of furniture inside every building",
    "Research at the Study",
    "Earned by the Cat Cottages every hour, and by beating Palis",
  ],
  gold: [
    "Finish any timer instantly",
    "Top up a resource you are short of",
    "Empty a building's store early",
    "Premium pulls",
    "Earned from the Town Book — it is not how builders or worker spots are bought",
  ],
};

/** The most villager places one building can ever have: the one it comes with
 *  plus two bought. Three is enough to matter and few enough to make you
 *  choose, which is the point of a cap. */
export const MAX_PER_BUILDING = 3;

/** Places in ONE building: earned by levelling it, or bought early. */
export const slotsIn = (bought = 0, level = 1) =>
  Math.min(MAX_PER_BUILDING, Math.max(1, seatsFromLevel(level)) + bought);

/** Kept only so old saves and callers do not break; worker spots are a real
 *  purchase now (buildingSlotPriceUsd). */
export const extraSlotCost = (bought) => 120 + bought * 90;

// ---------------------------------------------------------------------------
//  THE CATNIP BOOST — and why it was priced wrong
//
//  A flat 40 Catnip for "double this building for 15 minutes" looks scarce on
//  day one and is free by the mid game, because the Catnip Garden's output
//  scales with level^1.35 while the price did not move at all. Run the numbers:
//
//     Garden L1, one common cat   ~11 Catnip/h   → a boost costs 3.6 HOURS
//     Garden L4, three good cats  ~273 Catnip/h  → a boost costs 9 MINUTES
//
//  So the resource that multiplies every other resource gets cheaper exactly as
//  the player gets better at farming it. That is backwards, and it is the real
//  reason the Catnip economy felt too easy — not that the Garden exists.
//
//  The fix is a price that rides the same curve as production, so a boost stays
//  the same fraction of a day's Catnip forever. Paywalling the Garden would
//  have been the other option and it is the wrong one: Catnip is also required
//  by every upgrade past level 4 and by the Cat Hall itself, so gating its only
//  source would turn pay-to-speed into pay-to-play — the one thing that kills
//  the town inside a year.
// ---------------------------------------------------------------------------

/** How long a boost lasts and what it multiplies. */
export const BOOST = { seconds: 900, multiplier: 2 };

/** Catnip to boost a building, priced off the level of the building being
 *  boosted — a bigger building is a bigger boost, and costs like one. */
export function boostCost(level) {
  return Math.round(30 * Math.pow(Math.max(1, level), 1.35));
}

// ============================================================================
//  PAY TO SPEED
//
//  The rule: the game is not pay-to-win, it is pay-to-SKIP-THE-WAIT. Nothing
//  bought is unreachable by playing; everything bought arrives sooner. That
//  framing only holds if EVERY bottleneck has a paid way past it — a wall with
//  no door is pay-to-win by omission, because the only players who get through
//  are the ones who wait, and the ones who wanted to pay just leave.
//
//  So each of these exists to be the door on a specific wall:
//
//    wall: the build timer          → rush it (rushCost, priced by time LEFT)
//    wall: every builder is busy    → buy another builder
//    wall: short on a resource      → top up exactly what is missing
//    wall: a building's store is full → collect it early
//    wall: no worker spots left     → buy a spot (extraSlotCost)
//
//  Prices are deliberately small and repeatable rather than large and rare.
//  A cheap nudge taken twenty times beats one purchase the player has to think
//  about — and thinking is where the sale is lost.
// ============================================================================

// ---------------------------------------------------------------------------
//  THE LINE BETWEEN EARNED AND PAID
//
//  Golden Fish is a QUEST REWARD. The Town Book hands it out, so every player
//  ends up with some. That makes it the wrong currency for anything permanent:
//  charging Golden Fish for builders and worker spots means the quest book
//  quietly gives away the two things worth selling.
//
//  So the line is drawn by what the thing IS, not by how much it costs:
//
//    CONSUMABLE  → Golden Fish (earnable)
//        rushing a timer · topping up a resource · emptying a store early
//        · a Catnip boost. Spend it and it is gone; everyone gets a taste.
//
//    PERMANENT CAPACITY → real payment only, in $TUBBY or SOL. Never earnable.
//        a builder · a worker spot. These raise the ceiling forever, and a
//        ceiling that can be earned is a ceiling nobody buys.
//
//  This is also the flywheel: paying in $TUBBY is trading volume, and volume
//  is the creator fee that funds the rewards. See docs/monetization.md.
// ---------------------------------------------------------------------------

/** Permanent unlocks. Priced in USD; the charge is taken in SOL or in $TUBBY
 *  at a discount, converted at order time. Never purchasable with Golden Fish. */
export const REAL_PRICES = {
  // You start with ONE builder, and the second is the gateway purchase.
  //
  // Kingshot prices its permanent second construction queue at $2.99 and it is
  // the single most recommended purchase in the game — cheap enough that it is
  // not a decision. Matching that number rather than guessing a higher one.
  builder: [null, 2.99, 14.99, 29.99, 49.99],
  // A villager place, bought for one specific building. Paid again for the
  // next building — capacity is local, so the spend repeats naturally.
  buildingSlot: [4.99, 9.99],
};

/** $TUBBY payers get a quarter off — that discount is what routes buying
 *  pressure through the token. */
export const TUBBY_DISCOUNT = 0.25;
export const inTubby = (usd) => usd * (1 - TUBBY_DISCOUNT);

export function builderPriceUsd(current) {
  return REAL_PRICES.builder[current] ?? null;
}
export function buildingSlotPriceUsd(bought) {
  return REAL_PRICES.buildingSlot[bought] ?? null;
}
export const MAX_BUILDERS = 5;

/** A RENTED second builder — Kingshot's other half of the same offer: gems buy
 *  it for two days, real money buys it forever. The rental is deliberately poor
 *  value against the pack, and that is the point: it lets everyone taste two
 *  builders, and tasting is what makes the permanent one sell. */
export const BUILDER_RENTAL = { gold: 400, days: 2 };

/** Golden Fish to buy a missing amount outright, by how scarce the resource is.
 *  Sells at the exact moment of frustration, which is the only moment it is
 *  worth anything. */
const PER_GOLD = { wood: 70, fish: 70, treats: 60, stone: 18, catnip: 5, coin: 22 };

export function topUpCost(missing) {
  let g = 0;
  for (const [k, v] of Object.entries(missing || {})) {
    if (v > 0) g += v / (PER_GOLD[k] || 60);
  }
  return Math.max(1, Math.ceil(g));
}

// (earlyCollectCost lived here. It priced emptying a building's store before it
//  filled — a door on a wall that no longer exists now production is continuous.
//  Its replacement is buying a building's next few hours outright, in page.jsx.)
