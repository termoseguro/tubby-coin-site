// ============================================================================
//  TUBBY TOWN — TROOPS
//
//  Kingshot's Barracks, Range and Stable, which train Infantry, Archers and
//  Cavalry. Ours are the Training Yard, the Slingshot Range and the Runner's
//  Stable, training Guards, Slingers and Runners — the same three classes the
//  heroes already belong to, so a Guard hero leads Guard troops.
//
//  Researched, and the numbers are Kingshot's:
//
//   · TIERS T1 TO T10, unlocked by the TRAINING BUILDING'S level, at exactly
//     1, 4, 7, 11, 13, 16, 19, 22, 26 and 30.
//   · CAPACITY grows with that level too: 17 at level 1, 209 at level 30.
//   · TRAINING SPEED likewise, 0.3% at level 1 to 8.0% at level 30, and it
//     stacks multiplicatively with research.
//   · "All troop types at the same tier have identical training times, power
//     and event points" — the classes differ in what they DO, never in cost.
//
//  ---------------------------------------------------------------------------
//  TRAINING VERSUS PROMOTION
//
//  Kingshot's real decision, and the one worth copying carefully: you can train
//  new troops at a tier, or promote existing lower-tier ones up. "Promoting is
//  faster but gives less total power per speedup compared to training new
//  troops." So promotion buys TIME at the cost of efficiency — which is exactly
//  the shape of every good decision in this genre, and it means a player with
//  an idle army always has something to spend on.
//
//  ⚠ Client-side, therefore advisory. docs/security.md §1.
// ============================================================================

import { CLASSES } from "./heroes.js";

/** Which building trains which class. Named for the buildings that already
 *  exist on the map. */
export const TRAINERS = {
  training: { cls: "guard", name: "Training Yard", unit: "Guard" },
  range: { cls: "slinger", name: "Slingshot Range", unit: "Slinger" },
  stable: { cls: "runner", name: "Runner's Stable", unit: "Runner" },
};

export const TRAINER_OF = Object.fromEntries(
  Object.entries(TRAINERS).map(([id, t]) => [t.cls, id])
);

/** Kingshot's tier table, verbatim: the building level each tier needs. */
export const TIER_AT = [1, 4, 7, 11, 13, 16, 19, 22, 26, 30];
export const MAX_TIER = TIER_AT.length;

/** The highest tier a building of this level can train. */
export function topTier(buildingLevel) {
  let t = 0;
  for (let i = 0; i < TIER_AT.length; i++) if (buildingLevel >= TIER_AT[i]) t = i + 1;
  return t;
}

/** How many may be in the oven at once. Kingshot: 17 at level 1, 209 at 30. */
export function capacity(buildingLevel) {
  if (buildingLevel < 1) return 0;
  return Math.round(17 + (Math.min(30, buildingLevel) - 1) * ((209 - 17) / 29));
}

/** The building's own training-speed bonus, as a percentage. Kingshot: 0.3% at
 *  level 1 to 8.0% at level 30. Small on its own — it is meant to stack. */
export function speedBonus(buildingLevel) {
  if (buildingLevel < 1) return 0;
  return 0.3 + (Math.min(30, buildingLevel) - 1) * ((8.0 - 0.3) / 29);
}

/** What one troop of a tier is worth in a fight. */
export function troopPower(tier) {
  return Math.round(6 * Math.pow(tier, 1.7));
}

/** Cost per troop. Identical across classes, which is Kingshot's rule. */
export function troopCost(tier, count = 1) {
  const each = {
    fish: Math.round(20 * Math.pow(tier, 1.6)),
    wood: Math.round(16 * Math.pow(tier, 1.6)),
  };
  if (tier >= 3) each.stone = Math.round(6 * Math.pow(tier, 1.55));
  if (tier >= 6) each.catnip = Math.round(1.2 * Math.pow(tier, 1.5));
  return Object.fromEntries(Object.entries(each).map(([k, v]) => [k, Math.round(v * count)]));
}

/** Seconds to train a batch, before speed bonuses. */
export function trainSeconds(tier, count, buildingLevel, researchSpeed = 0) {
  const base = 3.2 * Math.pow(tier, 1.45) * count;
  // Building speed and research stack multiplicatively — Kingshot's own note,
  // and the reason both are worth investing in rather than one.
  const mult = (1 + speedBonus(buildingLevel) / 100) * (1 + researchSpeed / 100);
  return Math.max(3, Math.round(base / mult));
}

// ---------------------------------------------------------------------------
//  PROMOTION
//
//  Take troops you already have up a tier. Faster than training the same power
//  from scratch, and worth less per second spent — which is the trade Kingshot
//  makes and the reason both options stay live.
// ---------------------------------------------------------------------------

/** Lower-tier troops consumed to make one of the tier above.
 *
 *  ONE. Promotion keeps the head count and raises the tier; what you pay is
 *  equipment, not cats. Two-for-one looked plausible and was arithmetically
 *  broken: at a power curve of tier^1.7, two T4 are worth 126 and one T5 is
 *  worth 93, so promoting DESTROYED power and nobody would ever have done it.
 *  A trade only works when both sides are positive. */
export const PROMOTE_RATIO = 1;

export function promoteCost(toTier, count = 1) {
  // Cheaper in materials than training outright, because you are supplying the
  // cats. The cost here is the equipment.
  const c = troopCost(toTier, count);
  return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v * 0.45)]));
}

export function promoteSeconds(toTier, count, buildingLevel, researchSpeed = 0) {
  return Math.max(3, Math.round(trainSeconds(toTier, count, buildingLevel, researchSpeed) * 0.55));
}

/** Power gained per second spent, for each route. The UI shows both, because
 *  the decision is only interesting if the player can see the trade. */
export function efficiency(tier, buildingLevel, researchSpeed = 0) {
  const train = troopPower(tier) / trainSeconds(tier, 1, buildingLevel, researchSpeed);
  const gained = troopPower(tier) - troopPower(tier - 1) * PROMOTE_RATIO;
  const promote = gained / promoteSeconds(tier, 1, buildingLevel, researchSpeed);
  // Kingshot's own trade, stated plainly so the UI can show it: "promoting is
  // faster but gives less total power per speedup than training new troops."
  // Promotion buys TIME and costs efficiency, and both numbers are shown.
  return { train, promote, promoteWorse: promote < train, gained };
}

// ---------------------------------------------------------------------------
//  THE ARMY
//
//  Stored as counts per class per tier: { guard: { 1: 40, 2: 12 }, ... }
// ---------------------------------------------------------------------------

export const emptyArmy = () => ({ guard: {}, slinger: {}, runner: {} });

export function armyCount(army = {}, cls = null) {
  let n = 0;
  for (const [c, tiers] of Object.entries(army)) {
    if (cls && c !== cls) continue;
    for (const v of Object.values(tiers || {})) n += v;
  }
  return n;
}

/** What the army is worth, with research and the deployment cap applied.
 *
 *  Only the best troops march. A cap that counts your worst troops first would
 *  punish a player for having trained anything early, which is the opposite of
 *  what a progression system should do. */
export function armyPower(army = {}, { bonuses = null, cap = Infinity } = {}) {
  const all = [];
  for (const [cls, tiers] of Object.entries(army)) {
    for (const [tier, n] of Object.entries(tiers || {})) {
      if (n > 0) all.push({ cls, tier: Number(tier), n });
    }
  }
  all.sort((a, b) => b.tier - a.tier);

  let left = cap;
  let power = 0;
  for (const g of all) {
    if (left <= 0) break;
    const take = Math.min(g.n, left);
    left -= take;
    let p = troopPower(g.tier) * take;
    if (bonuses) {
      // Attack and health both raise what a troop is worth; lethality and
      // defence are folded in at half weight so no single tech dominates.
      const atk = 1 + (bonuses.atk.all + (bonuses.atk[g.cls] || 0)) / 100;
      const hp = 1 + (bonuses.hp.all + (bonuses.hp[g.cls] || 0)) / 100;
      const half =
        1 +
        (bonuses.def.all + (bonuses.def[g.cls] || 0) + bonuses.leth.all + (bonuses.leth[g.cls] || 0)) /
          200;
      p *= atk * hp * half;
    }
    power += p;
  }
  return Math.round(power);
}

/** How many troops may march at once. The War Room sets the base; Bigger
 *  Patrols research raises it. */
export function deployCap(warRoomLevel = 0, bonuses = null) {
  const base = 20 + warRoomLevel * 25;
  return Math.round(base * (1 + (bonuses?.army || 0) / 100));
}

/** A readable name for a unit. */
export const unitName = (cls, tier) => `T${tier} ${TRAINERS[TRAINER_OF[cls]]?.unit || CLASSES[cls]?.name}`;
