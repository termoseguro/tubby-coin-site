// ============================================================================
//  TUBBY TOWN — HERO PROGRESSION
//
//  Stars, shards, levels and skills. Kingshot's numbers, verified against two
//  independent figures that agree:
//
//      "Full ascension from star level 0 to 5 stars costs 1,065 shards"
//      "zero stars to 4★ requires 465 shards; 4★ to 5★ alone costs 600"
//
//  Per-star totals that satisfy both: 10 / 40 / 115 / 300 / 600.
//  (10+40+115+300 = 465 ✓   and the whole run = 1,065 ✓)
//
//  Six steps per star rank, thirty steps end to end, and ten shards to recruit
//  a hero you do not own yet.
//
//  ---------------------------------------------------------------------------
//  WHY THE CURVE IS SHAPED LIKE THAT
//
//  Look at the shape rather than the totals: the first four stars together cost
//  less than the fifth. That is not a mistake, it is the entire business model.
//  Every player reaches 4★ on a favourite and feels the whole system working;
//  almost nobody reaches 5★ without paying, and the ones who do have spent
//  months. A curve that is flat throughout sells nothing and a curve that is
//  steep throughout sells nothing either, because nobody starts a climb they
//  can see the top of.
//
//  Duplicates are never dead. A hero you already own turns into their shards,
//  which is what stops a Legendary pull feeling like a loss — and it is why the
//  gacha can publish honest odds and still be exciting.
//
//  ⚠ Client-side, therefore advisory. Rolls and grants move to the server
//  before anything of value is attached — docs/security.md §1. A gacha the
//  client rolls is a gacha won with a debugger.
// ============================================================================

import { HERO_BY_ID, skillValue } from "./heroes.js";

/** Shards to recruit a hero you have never owned. */
export const RECRUIT_SHARDS = 10;

/** Total shards inside each star rank, and the six steps it is split across. */
export const STAR_TOTALS = [10, 40, 115, 300, 600];
export const STEPS_PER_STAR = 6;
export const MAX_STARS = 5;

/** Every step, flattened: 30 entries, each the shards that step costs. */
export const STEPS = STAR_TOTALS.flatMap((total) => {
  // Kingshot's own split puts a heavier final step on each rank, so the last
  // push into a new star is the one you feel.
  const small = Math.round((total * 0.6) / (STEPS_PER_STAR - 1));
  const rest = total - small * (STEPS_PER_STAR - 1);
  return [...Array(STEPS_PER_STAR - 1).fill(small), rest];
});

export const TOTAL_SHARDS = STEPS.reduce((a, b) => a + b, 0);

/** Stars from steps completed. */
export const starsFor = (steps = 0) => Math.min(MAX_STARS, Math.floor(steps / STEPS_PER_STAR));

/** What the next step costs, or null when the hero is finished. */
export const nextStepCost = (steps = 0) => (steps >= STEPS.length ? null : STEPS[steps]);

/** Shards still needed to reach a given star rank from here. */
export function shardsToStar(steps = 0, star = MAX_STARS) {
  const target = Math.min(STEPS.length, star * STEPS_PER_STAR);
  let n = 0;
  for (let i = steps; i < target; i++) n += STEPS[i];
  return n;
}

// ---------------------------------------------------------------------------
//  LEVELS
//
//  A separate track from stars, and gated by them — which is the point. Levels
//  are cheap and constant, so a player always has something to spend on; the
//  star rank is the ceiling, so they always know what is holding them back.
// ---------------------------------------------------------------------------

/** Level ceiling at a star rank: 20 per star, 100 at 5★. */
export const levelCapFor = (stars = 0) => Math.max(10, stars * 20);

/** Gold to take a hero from `level` to the next. Gold, not Golden Fish: this is
 *  a sink for the currency the cottages and Palis pay out, which is what gives
 *  Gold somewhere to go besides furniture. */
export function levelCost(level = 1) {
  return Math.round(60 * Math.pow(Math.max(1, level), 1.45));
}

/** A hero's raw contribution, before skills. Rarity sets the floor, stars are
 *  the multiplier, level is the steady climb. */
const RARITY_BASE = { common: 6, rare: 10, epic: 18, legendary: 34, mythic: 60 };

export function heroPower(hero, { steps = 0, level = 1 } = {}) {
  const stars = starsFor(steps);
  const base = RARITY_BASE[hero?.rarity] ?? 6;
  return Math.round(base * (1 + 0.45 * stars) * (1 + 0.06 * (level - 1)));
}

// ---------------------------------------------------------------------------
//  WHAT A ROSTER IS WORTH
//
//  Only DEPLOYED heroes count. The bench does nothing, because a game where
//  every hero you own stacks is a game with one strategy: own more heroes.
// ---------------------------------------------------------------------------

/** How many heroes may be on patrol at once. The War Room raises it, which is
 *  what that building is for. */
export const patrolSlots = (warRoomLevel = 0) => Math.min(5, 2 + Math.floor(warRoomLevel / 3));

/** One hero's owned state, defaulted. */
export const heroState = (save, id) => save?.heroes?.[id] || null;
export const ownsHero = (save, id) => !!heroState(save, id);

/** Every skill a hero currently has unlocked, with its value at their stars. */
export function activeSkills(hero, steps = 0) {
  const stars = starsFor(steps);
  return (hero?.skills || [])
    .filter((sk) => stars >= sk.at)
    .map((sk) => ({ ...sk, value: skillValue(sk, stars) }));
}

/** Everything the DEPLOYED roster adds up to, by skill kind. This is the object
 *  the town and the raid both read, so a hero's card and the town's actual
 *  numbers can never disagree. */
export function rosterBonuses(save) {
  const out = {
    produce: {}, allProduce: 0, build: 0, gold: 0, store: 0, upkeep: 0,
    power: 0, loot: 0, guardUp: 0, mend: 0, shield: 0,
  };
  for (const id of save?.patrol || []) {
    const st = heroState(save, id);
    const hero = HERO_BY_ID[id];
    if (!st || !hero) continue;
    for (const sk of activeSkills(hero, st.steps || 0)) {
      if (sk.kind === "produce") {
        out.produce[sk.res] = (out.produce[sk.res] || 0) + sk.value;
      } else {
        out[sk.kind] += sk.value;
      }
    }
  }
  return out;
}

/** The roster's raw power, for the raid. */
export function rosterPower(save) {
  let p = 0;
  for (const id of save?.patrol || []) {
    const st = heroState(save, id);
    const hero = HERO_BY_ID[id];
    if (st && hero) p += heroPower(hero, st);
  }
  const b = rosterBonuses(save);
  return Math.round(p * (1 + b.power / 100));
}

/** Grant shards, recruiting the hero on the way past if they are new. Returns
 *  the new hero map and what actually happened, so the UI can say "recruited!"
 *  rather than silently adding to a number. */
export function grantShards(save, id, amount) {
  const heroes = { ...(save.heroes || {}) };
  const had = heroes[id];
  if (!had) {
    if (amount < RECRUIT_SHARDS) {
      // Not enough to recruit yet — shards bank against the requirement, which
      // is what makes a duplicate-heavy pull still feel like progress.
      const pending = { ...(save.pendingShards || {}) };
      pending[id] = (pending[id] || 0) + amount;
      if (pending[id] < RECRUIT_SHARDS) return { heroes, pendingShards: pending, recruited: false };
      const left = pending[id] - RECRUIT_SHARDS;
      delete pending[id];
      heroes[id] = { steps: 0, level: 1, shards: left };
      return { heroes, pendingShards: pending, recruited: true };
    }
    heroes[id] = { steps: 0, level: 1, shards: amount - RECRUIT_SHARDS };
    return { heroes, pendingShards: save.pendingShards || {}, recruited: true };
  }
  heroes[id] = { ...had, shards: (had.shards || 0) + amount };
  return { heroes, pendingShards: save.pendingShards || {}, recruited: false };
}
