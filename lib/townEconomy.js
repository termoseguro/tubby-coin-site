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
