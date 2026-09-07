// ============================================================================
//  TUBBY TOWN — THE LUCKY LITTER
//
//  Kingshot's Hero Roulette, and the second of its two gachas. Running two is
//  the design, not duplication: the permanent one and the event one take
//  DIFFERENT currencies, so they can be sold to the same player in the same
//  week without competing.
//
//      Adoption Center   permanent, Treats          (Kingshot: Hero Hall)
//      Lucky Litter      3-day event, two key types (Kingshot: Hero Roulette)
//
//  TWO KEYS, TWO WHEELS. Kingshot calls them Advanced and Epic Recruitment
//  Keys; ours are Silver and Gold. The Silver wheel is cheap, earnable, and
//  mostly gives you cats you half-wanted. The Gold wheel costs real money and
//  cannot give you a common at all. Both spin the same drum, which matters —
//  a player who has watched the Gold wheel land a Mythic knows exactly what
//  they are buying.
//
//  ---------------------------------------------------------------------------
//  THE MECHANIC IS THE MILESTONE, NOT THE SPIN
//
//  Milestones sit at 5 / 15 / 35 / 70 / 120 spins — Kingshot's own numbers. The
//  gaps are the whole trick. Three free spins put you two away from the first
//  reward, so you buy two. That lands you at 5 and the next is ten away. Nobody
//  ever buys "a spin"; they buy the distance to a prize they can already see.
//
//  We publish the odds on the wheel, the pity counter is visible, and the pity
//  NEVER resets between events — three decisions that cost a little revenue and
//  buy the thing this project actually needs, which is a game still alive in a
//  year. See docs/monetization.md.
//
//  ⚠ Every roll here happens on the client, which makes it a suggestion. Rolls,
//  pity and grants move to the server before this is worth anything —
//  docs/security.md §1. A gacha the client rolls is a gacha won with a
//  debugger, and a published odds table you cannot verify is worse than none.
// ============================================================================

import { HEROES, heroesOf } from "./heroes.js";

export const EVENT_DAYS = 3;

/** One free spin a day, on the Silver wheel. The free spin is not generosity —
 *  it is what gets the screen opened, and the screen is where the paid spins
 *  are sold. */
export const FREE_SPINS_PER_DAY = 1;

/** The two wheels. `odds` are percentages and must total 100 — the table is
 *  shown to the player verbatim, so it has to be true on its face. */
export const WHEELS = {
  silver: {
    id: "silver",
    name: "Silver Litter",
    key: "Silver Key",
    blurb: "The everyday wheel. Kind enough to be worth spinning, honest about it.",
    color: "#b9c4d4",
    odds: { common: 60, rare: 32, epic: 7, legendary: 0.9, mythic: 0.1 },
    // Golden Fish per spin, and what a ten-spin costs (one free).
    goldFish: 60,
    // Pulls before a guaranteed Legendary or better. Never resets.
    pity: 80,
    pityFloor: "legendary",
    shards: { common: 2, rare: 4, epic: 8, legendary: 18, mythic: 40 },
  },
  gold: {
    id: "gold",
    name: "Gold Litter",
    key: "Gold Key",
    blurb: "No commons. At all. Every spin is a hero worth putting on patrol.",
    color: "#ffd23f",
    odds: { common: 0, rare: 45, epic: 40, legendary: 13, mythic: 2 },
    goldFish: 260,
    pity: 30,
    pityFloor: "mythic",
    shards: { common: 0, rare: 10, epic: 20, legendary: 45, mythic: 100 },
  },
};

export const RARITY_ORDER = ["common", "rare", "epic", "legendary", "mythic"];
const atLeast = (r, floor) => RARITY_ORDER.indexOf(r) >= RARITY_ORDER.indexOf(floor);

/** The odds as a list, ready to print. Computed rather than typed twice,
 *  because a published table that drifts from the code is a lie with a
 *  timestamp on it. */
export function oddsTable(wheelId) {
  const w = WHEELS[wheelId];
  return RARITY_ORDER.filter((r) => w.odds[r] > 0).map((r) => ({
    rarity: r,
    pct: w.odds[r],
    shards: w.shards[r],
  }));
}

/** Sanity: the printed table must add to exactly 100. */
export function oddsTotal(wheelId) {
  return Object.values(WHEELS[wheelId].odds).reduce((a, b) => a + b, 0);
}

/** One spin. `pity` is how many spins since the last floor-or-better result. */
export function spin(wheelId, pity = 0, rng = Math.random) {
  const w = WHEELS[wheelId];

  // Pity first, so a player at the threshold cannot be robbed by a bad roll.
  if (pity + 1 >= w.pity) {
    const pool = HEROES.filter((h) => atLeast(h.rarity, w.pityFloor));
    const hero = pool[Math.floor(rng() * pool.length)];
    return { hero, rarity: hero.rarity, shards: w.shards[hero.rarity], pity: true };
  }

  let roll = rng() * 100;
  let rarity = "common";
  for (const r of RARITY_ORDER) {
    if (w.odds[r] <= 0) continue;
    if (roll < w.odds[r]) {
      rarity = r;
      break;
    }
    roll -= w.odds[r];
  }

  // "Common" on the Silver wheel means an ordinary cat rather than a named
  // hero: shards toward the roster, not a face. That is what keeps the common
  // slot from feeling like nothing while still not being a hero.
  if (rarity === "common") {
    return { hero: null, rarity, shards: w.shards.common, pity: false };
  }

  const pool = heroesOf(rarity);
  const hero = pool[Math.floor(rng() * pool.length)];
  return { hero, rarity, shards: w.shards[rarity], pity: false };
}

// ---------------------------------------------------------------------------
//  MILESTONES — Kingshot's 5 / 15 / 35 / 70 / 120
//
//  Read the gaps, not the numbers. Three free spins leave you two short of the
//  first; the second is ten past that; by 70 the player has stopped counting
//  spins and started counting the distance to the next box. Every reward is
//  placed just past where the previous one left you standing.
// ---------------------------------------------------------------------------

export const MILESTONES = [
  { at: 5, reward: { gold: 400, keys: { silver: 2 } }, label: "400 Gold · 2 Silver Keys" },
  { at: 15, reward: { gold: 1200, shards: 30 }, label: "1,200 Gold · 30 shards" },
  { at: 35, reward: { gold: 3000, keys: { gold: 1 } }, label: "3,000 Gold · a Gold Key" },
  { at: 70, reward: { gold: 8000, shards: 120 }, label: "8,000 Gold · 120 shards" },
  {
    at: 120,
    reward: { gold: 20000, keys: { gold: 3 }, guaranteed: "mythic" },
    label: "20,000 Gold · 3 Gold Keys · a guaranteed Mythic",
  },
];

/** The next milestone and how far it is. This one line is the product. */
export function nextMilestone(spins = 0) {
  const m = MILESTONES.find((x) => x.at > spins);
  return m ? { ...m, away: m.at - spins } : null;
}

export const milestonesReached = (spins = 0) => MILESTONES.filter((m) => m.at <= spins);

/** Free spins available right now, given when the last one was taken and how
 *  many days the event has run. Unused days do NOT stack past the event. */
export function freeSpinsReady(lastFreeAt, startedAt, now = Date.now()) {
  if (!startedAt) return 0;
  const day = 86_400_000;
  const dayNow = Math.min(EVENT_DAYS - 1, Math.floor((now - startedAt) / day));
  const dayLast = lastFreeAt ? Math.floor((lastFreeAt - startedAt) / day) : -1;
  if (dayNow < 0) return 0;
  return dayNow > dayLast ? FREE_SPINS_PER_DAY : 0;
}

/** Milliseconds left in the event, or 0 when it is over. */
export function eventLeft(startedAt, now = Date.now()) {
  if (!startedAt) return 0;
  return Math.max(0, startedAt + EVENT_DAYS * 86_400_000 - now);
}
