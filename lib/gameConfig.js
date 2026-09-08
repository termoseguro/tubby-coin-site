// ============================================================================
//  TUBBY TOWN — GAME TUNING (single source of truth)
//  Prototype build. Everything here is a knob: rates, odds, prices, curves.
//
//  ⚠ ARCHITECTURE NOTE (read before shipping)
//  This file + /app/game runs 100% in the browser on localStorage. That is FINE
//  for feeling the loop and tuning numbers, and NOT fine the moment a real
//  reward is attached. Before anything of value is on the line:
//    - all production / gacha rolls / balances move to the server (authoritative)
//    - the client only renders what the server says it has
//    - localStorage keeps nothing but a cache + the session token
//
//  ⚠ ANTI-SYBIL RULES (these are economic, not technical — keep them)
//   1. No flat per-wallet reward. Ever. No daily login SOL, no free pull for
//      signing up, no airdrop per address. Flat rewards are what farms attack.
//      Free stuff is only ever TREATS (soft currency, cannot cash out).
//   2. Anything that pays out is proportional to time-weighted hold × play
//      score. Splitting capital across N wallets splits the payout N ways →
//      sybil earns the same and pays N× the gas. Not worth doing.
//   3. Leaderboard eligibility = minimum hold, sampled at RANDOM times, not at
//      payout time. Kills the buy-5-minutes-before-snapshot play.
//   4. Physical prizes (plushies) dedupe by shipping address — naturally
//      sybil-proof, and the scarcest thing we can give.
//   5. Idle production is time-gated. A bot cannot compress wall-clock time.
//      This is exactly why the core loop is idle and not a clicker.
// ============================================================================

import { config } from "./config.js";

const ART = config.art;

// ---- rarities --------------------------------------------------------------
// `odds` are published to the player verbatim in the Litter Box tab. If you
// change a number here, change nothing else — the odds table reads from this.
// The odds MUST add up to 100.
export const RARITIES = {
  common: { key: "common", name: "Common", odds: 63.95, mult: 1, color: "#b3a3c4", shards: 3 },
  rare: { key: "rare", name: "Rare", odds: 30, mult: 3, color: "#6cc2f7", shards: 4 },
  epic: { key: "epic", name: "Epic", odds: 5, mult: 9, color: "#c489ff", shards: 5 },
  legendary: { key: "legendary", name: "Legendary", odds: 1, mult: 30, color: "#ffbe2e", shards: 6 },
  mythic: { key: "mythic", name: "Mythic", odds: 0.05, mult: 100, color: "#ff7a9c", shards: 8 },
};

/** Sum of the published odds. MUST be 100 — the table is shown to players and
 *  a total that does not close at 100 reads as rigged. */
export const ODDS_TOTAL = Object.values(RARITIES).reduce((a, r) => a + r.odds, 0);

export const RARITY_ORDER = ["common", "rare", "epic", "legendary", "mythic"];

// ---- which art belongs to which rarity -------------------------------------
// Deterministic split of the CC0 tubby art we already ship in /public/art.
// A given picture is ALWAYS the same rarity, so players learn to recognise them.
export const POOLS = {
  mythic: ART.slice(0, 1), //  1 piece
  legendary: ART.slice(1, 3), //  2 pieces
  epic: ART.slice(3, 7), //  4 pieces
  rare: ART.slice(7, 14), //  7 pieces
  common: ART.slice(14), // 11 pieces
};

export const game = {
  // ---- economy -------------------------------------------------------------
  // A level-1 Common produces `baseRate` treats/second. Everything scales off
  // this one number — raise it to speed the whole game up.
  baseRate: 0.5,
  levelBonus: 0.3, // +30% production per level above 1

  // ---- town ----------------------------------------------------------------
  startSlots: 4,
  maxSlots: 12,
  freeSlotLimit: 8, // slots past this are shop-only (paid)
  slotCost: (n) => Math.round(2500 * Math.pow(2.2, n - 4)),

  // ---- the bowl (offline earnings cap) -------------------------------------
  // Classic idle monetisation: production continues while away, but only until
  // the bowl is full. Bigger bowl = longer you can stay away. This is the #1
  // reason players come back, and the #1 thing they pay to skip.
  startBowlHours: 2,
  maxBowlHours: 24,
  bowlStep: 2, // +2h per upgrade
  bowlCost: (h) => Math.round(1500 * Math.pow(1.9, (h - 2) / 2)),

  // ---- gacha (Litter Box) --------------------------------------------------
  pullCostTreats: 400, // the free-to-play path
  pity: {
    // Published to the player. Guarantees stop the "200 pulls, no legendary"
    // rage-quit, and are what makes disclosed odds actually honest.
    hardAt: 50, // pulls without Legendary+ → next pull IS Legendary+
    tenPullFloor: "epic", // every 10x pull contains at least one Epic+
  },

  // ---- upgrade costs -------------------------------------------------------
  levelUpTreats: (level, mult) => Math.round(200 * level * (1 + mult / 4)),

  // ---- $TUBBY hold → production multiplier ---------------------------------
  // `min` is the USD VALUE of $TUBBY held, not a token count.
  //
  // Why USD and not tokens: with a 1B supply, any fixed token threshold means a
  // wildly different amount of money as the price moves. If the coin does 100x,
  // a newcomer would need $10,000 to reach the tier an early holder got for
  // $100 — new players get priced out and the population stops growing.
  // USD-denominated keeps the door open forever and quietly promotes early
  // holders as the price rises.
  //
  // Deliberately SUB-LINEAR and capped at 2.25x. Money buys pace, never
  // position — see docs/monetization.md. A whale who could simply buy rank 1
  // would empty the board of the free players he is paying to be seen by.
  //
  // Server phase: read the wallet balance over RPC, price it from an oracle,
  // time-weight it, and sample at RANDOM times. No demotion within a season.
  holdTiers: [
    { min: 0, mult: 1.0, name: "Stray" },
    { min: 25, mult: 1.15, name: "Housecat" }, // also: season board eligibility
    { min: 100, mult: 1.35, name: "Fat Cat" },
    { min: 500, mult: 1.75, name: "Tubby" },
    { min: 2500, mult: 2.25, name: "Absolute Unit" },
  ],

  // ---- shop (PRICES ARE MOCKED IN THE PROTOTYPE — nothing charges) ---------
  shop: [
    { id: "pull1", name: "Single pull", desc: "One roll on the Litter Box.", sol: 0.02, kind: "pull", qty: 1 },
    { id: "pull10", name: "10× pull", desc: "Ten rolls. At least one Epic or better, guaranteed.", sol: 0.18, kind: "pull", qty: 10, best: true },
    { id: "bowl", name: "Fill the bowl", desc: "Instantly collect a full bowl of treats.", sol: 0.05, kind: "bowl" },
    { id: "slot", name: "Extra slot", desc: "One more cat earning in your town, permanently.", sol: 0.1, kind: "slot" },
    { id: "skin", name: "Golden Town skin", desc: "Cosmetic only. Does not affect production.", sol: 0.15, kind: "skin" },
  ],

  // ---- leaderboard ---------------------------------------------------------
  // Payout weight = timeWeightedHold × playScore. Linear in hold ON PURPOSE:
  // see anti-sybil rule 2 at the top of this file.
  board: {
    // USD value of $TUBBY that must be held to be ELIGIBLE for the season pool.
    // Stated up front, never applied retroactively — see docs/monetization.md:
    // eligibility is fine, a withdrawal gate discovered after earning is not.
    minHoldToRank: 25,
    plushieTopN: 3, // 1st takes both plushies, 2nd black, 3rd pink
  },
};

// ---- helpers ---------------------------------------------------------------

export function holdTier(balance) {
  let tier = game.holdTiers[0];
  for (const t of game.holdTiers) if (balance >= t.min) tier = t;
  return tier;
}

/** treats/second for one cat, before the town-wide hold multiplier */
export function catRate(rarity, level) {
  const mult = RARITIES[rarity].mult;
  return game.baseRate * mult * (1 + game.levelBonus * (level - 1));
}

/** shards needed to take a cat from `level` to `level + 1` */
export function shardsToLevel(rarity, level) {
  return RARITIES[rarity].shards * level;
}

/** Roll one cat. `forceMin` bumps the result up to at least that rarity.
 *
 *  Rolls against ODDS_TOTAL rather than a hardcoded 100, so a mistuned table
 *  can never silently dump its leftover probability into Common — it stays
 *  proportional to whatever the published numbers actually say.
 *
 *  ⚠ This roll is CLIENT-SIDE and therefore trivially cheatable. It moves to
 *  the server (CSPRNG + commit–reveal) before anything of value is attached —
 *  see docs/security.md §4. */
export function rollRarity(forceMin) {
  const r = Math.random() * ODDS_TOTAL;
  let acc = 0;
  let rarity = RARITY_ORDER[0];
  for (const key of RARITY_ORDER) {
    acc += RARITIES[key].odds;
    if (r < acc) {
      rarity = key;
      break;
    }
  }
  if (forceMin && RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(forceMin)) {
    rarity = forceMin;
  }
  return rarity;
}

/** The rarity plus a piece of the old placeholder art.
 *
 *  KEPT ONLY FOR THE PLACEHOLDER SET. Adoption hands out villagers now, and a
 *  villager's face is drawn from its id — see lib/villagerLook.js. Rolling a
 *  picture here is what tied the Adoption Center to the same 25 images the
 *  Album was built on, and to the same artwork the heroes use. */
export function rollCat(forceMin) {
  const rarity = rollRarity(forceMin);
  const pool = POOLS[rarity];
  return { rarity, art: pool[Math.floor(Math.random() * pool.length)] };
}
