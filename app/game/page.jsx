"use client";

// ============================================================================
//  TUBBY TOWN — playable prototype
//  Loop: idle production → gacha → collection → hold multiplier → leaderboard.
//
//  ⚠ This runs entirely in the browser on localStorage. It exists to FEEL the
//  loop and tune the numbers in lib/gameConfig.js. Nothing here is secure and
//  nothing here charges money. Before real value is attached, production,
//  rolls and balances all move server-side (see the note in gameConfig.js).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { config } from "../../lib/config";
import {
  RARITIES,
  RARITY_ORDER,
  catRate,
  game,
  holdTier,
  rollRarity,
  shardsToLevel,
} from "../../lib/gameConfig";
import {
  IconBack,
  IconBowl,
  IconBox,
  IconCart,
  IconCoin,
  IconHammer,
  IconHouse,
  IconLock,
  IconPaw,
  IconPlus,
  IconGoldFish,
  IconTreat,
  IconTrophy,
} from "./icons";
import TownCanvas from "./town/TownCanvas";
import BuildingSheet from "./town/BuildingSheet";
import QuestBook from "./town/QuestBook";
import BuyModal from "./town/BuyModal";
import LuckyLitter from "./town/LuckyLitter";
import HeroesTab from "./town/HeroesTab";
import SpinReel from "./town/SpinReel";
import Conquest from "./town/Conquest";
import ResearchPanel from "./town/ResearchPanel";
import TrainingPanel from "./town/TrainingPanel";
import {
  TECH_BY_ID,
  effectiveSeconds,
  researchBonuses,
  techBlocked,
  techCost,
  techLevel,
  MAX_TECH_LEVEL,
} from "../../lib/research";
import {
  TRAINERS,
  armyPower,
  capacity as troopCapacity,
  deployCap,
  emptyArmy,
  promoteCost,
  promoteSeconds,
  topTier,
  trainSeconds,
  troopCost,
} from "../../lib/troops";
import {
  LINEUP_SIZE,
  ALLEY_IDLE_CAP_HOURS,
  alleyPending,
  isBoss,
  simulate as simulateStage,
  stageReward,
} from "../../lib/conquest";
import catPool from "../../lib/catPool.json";
import { HERO_BY_ID, heroArt } from "../../lib/heroes";
import {
  makeVillager,
  pickVillager,
  villagerArt,
  villagerIdFromKey,
  villagerName,
} from "../../lib/villagers";
import VillagerFace from "./VillagerFace";
import {
  HELPS_TO_CLEAR,
  PROBLEMS,
  STEAL_CAP_HOURS,
  STEAL_SHARE,
  buildMultiplier,
  defence as palisDefence,
  fixCost as palisFixCost,
  fixReward as palisFixReward,
  generateVisits,
  outputMultiplier,
  summarise as palisSummary,
} from "../../lib/palis";
import {
  MILESTONES,
  WHEELS,
  eventLeft,
  freeSpinsReady,
  nextMilestone,
  keysAccrued,
  nextKeyIn,
  spin as spinWheel,
} from "../../lib/luckyLitter";
import {
  grantShards,
  levelCapFor,
  levelCost,
  nextStepCost,
  patrolSlots,
  rosterBonuses,
  rosterPower,
  starsFor,
  starterHeroes,
} from "../../lib/heroProgress";
import { claimableCount } from "../../lib/townQuests";
import {
  MAX_HELPS_PER_JOB,
  NEIGHBOUR_EVERY_MS,
  TOKENS_PER_HELP,
  applyHelp,
  helpReduction,
  helpsLeft,
  randomNeighbour,
} from "../../lib/townAlliance";
import {
  bonusesAt,
  furnitureGate,
  itemCap,
  itemCost,
  itemLevel,
  itemSeconds,
  itemsFor,
  seatsFromLevel,
  unlockedItems,
  SEAT_LEVELS,
} from "../../lib/townFurniture";
import {
  BUILDINGS,
  BUILDING_BY_ID,
  BUILDING_INFO,
  COTTAGE_IDS,
  nextUnlock,
  unlockedAt,
} from "../../lib/townConfig";
import ResourceBar from "./town/ResourceBar";
import {
  PRODUCERS,
  RESOURCES,
  RESOURCE_ORDER,
  addCapped,
  buildSecondsFor,
  canAfford,
  maxLevelFor,
  ratePerHour,
  rushCost,
  shortfall,
  storeCap,
  upgradeCostFor,
  BOOST,
  boostCost,
  BUILDER_RENTAL,
  MAX_BUILDERS,
  builderPriceUsd,
  buildingSlotPriceUsd,
  slotsIn,
  villagerCap,
  workersAllowed,
  goldPerHour,
  producedOver,
  cottageBeds,
  isUnlocked,
  startLevel,
  MAX_VILLAGERS,
  catPower,
  topUpCost,
  crewPower,
  MAX_PER_BUILDING,
  RESOURCE_USES,
  REFINERS,
  extraSlotCost,
  UNLOCKS,
  effectiveRate,
  refine,
  staffing,
  unmetRequirements,
  upkeepPerHour,
} from "../../lib/townEconomy";
import "./game.css";
import "./heroes.css";

const SAVE_KEY = "tubbytown.v1";
/** Is `r` at least as rare as `floor`? Used to decide whether a spin resets the
 *  pity counter — only a result the counter was PROMISING should clear it. */
const RARITY_LADDER = ["common", "rare", "epic", "legendary", "mythic"];
const RARITY_AT_LEAST = (r, floor) =>
  RARITY_LADDER.indexOf(r) >= RARITY_LADDER.indexOf(floor);
/** How many hours of one building's output a Golden Fish purchase buys. */
const RUSH_HOURS = 4;
const TICK_MS = 250;

// A villager is identified by its rarity and its id, NOT by a picture: the
// picture is drawn from the id now (lib/villagerLook.js), and keying on an
// image path is what let a villager and a hero share an identity.
const catKey = (c) => `${c.rarity}|${c.id ?? villagerIdFromKey(c.art || "")}`;

function freshSave() {
  // The first villager. A real cat with a real name from the first minute —
  // the town is never staffed by an anonymous placeholder.
  const starter = pickVillager(catPool.cats, "common") || {
    rarity: "common",
    id: 0,
    name: villagerName(0),
    level: 1,
    shards: 0,
  };
  return {
    v: 6,
    // Kingshot-shaped economy: five gathered resources plus the premium one,
    // each produced by its own building and capped by the Storehouse.
    // Kingshot opens you with almost nothing and the Sawmill. Ours matches:
    // enough Wood to make the first move, enough Fish that the one cat does not
    // starve before the Kitchen exists at Cat Hall 2, and no Stone, Catnip or
    // Treats at all — those resources have not been introduced yet, and a
    // counter for a thing the player has never seen is noise.
    res: { fish: 250, wood: 350, stone: 0, catnip: 0, treats: 0, coin: 120, gold: 20 },
    // when production was last paid out into the stockpile
    lastProd: Date.now(),
    // furniture levels: { kitchen: { stove: 3, ... } }
    furniture: {},
    // ---- HERO CATS ----
    // Deliberately separate from `cats`, which is the villager pool. Heroes are
    // named, have stars and skills, and never work inside a building.
    // { biscuit: { steps, level, shards } }
    heroes: starterHeroes(),
    // shards banked toward a hero not yet recruited
    pendingShards: {},
    // hero ids currently on patrol — only these count for anything
    patrol: [],
    // ---- THE LONG ALLEY (Kingshot's Conquest) ----
    // The stage ladder the heroes climb. `cleared` is the deepest stage beaten
    // and it permanently multiplies the town's idle Gold — which is where that
    // mechanic belongs, and why it is no longer bolted onto the Palis raid.
    // `bossHp` remembers a wounded boss between attempts.
    conquest: { stage: 1, cleared: 0, bossHp: null, lineup: [], collectedAt: Date.now() },
    // Enough to feel the wheel on day one, and the faucet keeps it coming.
    keys: { silver: 8, gold: 2, silverAt: Date.now(), goldAt: Date.now() },
    litter: { startedAt: Date.now(), spins: 0, pity: { silver: 0, gold: 0 }, claimed: {}, lastFreeAt: 0 },

    // ---- THE STUDY ----
    // One research at a time, which is what makes the order a decision.
    tech: {},
    research: null,

    // ---- TROOPS ----
    // { guard: { 1: 40 }, slinger: {}, runner: {} } and one job per building.
    army: { guard: {}, slinger: {}, runner: {} },
    training: {},

    // ---- PALIS ----
    // Not a boss you attack: what goes wrong while you are away. `problems` is
    // the mess waiting to be sorted; `lastVisitAt` is when he was last through.
    problems: [],
    lastVisitAt: Date.now(),

    cats: { [catKey(starter)]: starter },
    slots: game.startSlots,
    bowlHours: game.startBowlHours,
    lastSeen: Date.now(),
    pulls: 0,
    pity: 0,
    hold: 0, // simulated $TUBBY balance — replaced by a real RPC read later
    skin: false,
    // ---- city builder ----
    // Levels per building, and the jobs currently occupying a builder.
    // Empty on purpose: a building with no entry here sits at its start level,
    // which is 1 for the six the town opens with and 0 (an empty plot) for
    // everything else. Nothing is written until the player builds it.
    // Timers are wall-clock here; the SERVER owns finishesAt once this is real
    // (docs/security.md §4b — a timer the client can influence is free money).
    buildings: {},
    jobs: {},
    // One builder to start. The second is the gateway purchase.
    builders: 1,
    // which building each cat works at — the player's decision, not a rota
    assign: {},
    // villager places bought for a SPECIFIC building: { kitchen: 1, ... }
    buildingSlots: {},
    // active building boosts: { [buildingId]: endsAt }
    boosts: {},
    // where the player has moved buildings to
    positions: {},
    // quest rewards already taken
    claimed: {},
    // Clowder tokens, earned by helping. Spent in the Guild Hall once it does
    // something (lib/townAlliance.js).
    tokens: 0,
  };
}

/** A building's level. 0 means "an unbuilt plot" — only the handful of
 *  buildings the town opens with start at 1 (see townConfig `built`). */
const levelOf = (s, id) => s.buildings?.[id] ?? startLevel(id);
const T = (s) => s?.res?.treats || 0;
const isStarving = (s) => (s?.res?.fish || 0) <= 0;

/** Levels of every building, for the requirement checks. */
const levelsOf = (s) => {
  const out = {};
  for (const b of BUILDINGS) out[b.id] = levelOf(s, b.id);
  return out;
};

/** How many cat villagers the town has — the sum of its Cat Cottages. The Cat
 *  Hall no longer holds anyone; it unlocks the cottages that do. */
const totalSlots = (s) => villagerCap(levelsOf(s), s);

/** Villager places inside one building: the one it comes with, plus bought. */
const slotsAt = (s, id) => slotsIn(s.buildingSlots?.[id] || 0, levelOf(s, id));
const assignedCount = (s) => Object.keys(s.assign || {}).length;

/** Crew POWER per building, not head count. A Legendary pulls far more weight
 *  than a stray, and that difference has to reach the production maths or
 *  rarity is decoration. */
function catsPerBuilding(s) {
  const out = {};
  for (const [key, id] of Object.entries(s.assign || {})) {
    const cat = s.cats[key];
    if (!cat) continue;
    out[id] = (out[id] || 0) + catPower(cat.rarity, cat.level);
  }
  return out;
}

/** Head count per building, for the slot UI. */
function headsPerBuilding(s) {
  const out = {};
  for (const id of Object.values(s.assign || {})) out[id] = (out[id] || 0) + 1;
  return out;
}

/** The worker cap can go DOWN — a balance change, or one day losing a Nap
 *  House level. Assignments made under an older, larger cap have to be
 *  released, or the town shows an impossible "5/2" and the extra cats keep
 *  producing for free. Weakest cats are let go first, so the player keeps the
 *  crew they would have chosen. */
function clampCrew(s) {
  const cap = totalSlots(s);
  const assigned = Object.keys(s.assign || {});
  if (assigned.length <= cap) return s;
  const keep = assigned
    .map((k) => ({ k, p: s.cats[k] ? catPower(s.cats[k].rarity, s.cats[k].level) : -1 }))
    .sort((a, b) => b.p - a.p)
    .slice(0, cap)
    .map((x) => x.k);
  const assign = {};
  for (const k of keep) assign[k] = s.assign[k];
  return { ...s, assign };
}

/** VILLAGERS MOVE IN ON THEIR OWN.
 *
 *  Kingshot: "as you upgrade the Houses and the furniture inside them, the
 *  amount of Residents that CAN JOIN your town increases". They join. You do not
 *  pull them, you make room for them.
 *
 *  Ours did not, and it produced exactly the bug it deserved: the villager chip
 *  counted BEDS while the game counted CATS, so a town with three homes and one
 *  cat cheerfully reported "3 free" and then did nothing when asked to put
 *  somebody to work. There was nobody to put.
 *
 *  So an empty bed fills itself. The cottage is the decision; the cat arriving
 *  is the payoff for having made it. The gacha's common slot still matters —
 *  it sends a BETTER villager than the one who would have wandered in, and
 *  rarity is what a villager is worth at work. */
function fillVillagers(s) {
  const beds = totalSlots(s);
  const have = Object.keys(s.cats || {}).length;
  if (have >= beds) return s;

  const cats = { ...s.cats };
  const taken = new Set(Object.values(cats).map((c) => c.id));
  const free = catPool.cats.filter((c) => c.rarity === "common" && !taken.has(c.id));
  let moved = 0;
  for (let i = have; i < beds && free.length; i++) {
    const v = makeVillager(free.splice(Math.floor(Math.random() * free.length), 1)[0]);
    cats[catKey(v)] = v;
    moved++;
  }
  return moved ? { ...s, cats, movedIn: moved } : s;
}

/** Cats with no job yet — the pool the assign picker draws from. */
function idleCats(s) {
  return Object.keys(s.cats).filter((k) => !s.assign?.[k]);
}

/** What ONE building is producing per hour right now — staffing, hunger,
 *  furniture and any boost all folded in. This is the number the building's
 *  own panel shows, and with no tap-to-collect it is the only number that
 *  matters about a producer. */
function rateAt(s, id, now = Date.now(), cats = null) {
  if (!PRODUCERS[id]) return 0;
  const level = levelOf(s, id);
  if (level < 1) return 0;
  const here = (cats || catsPerBuilding(s))[id] || 0;
  const boosted = (s.boosts?.[id] || 0) > now ? BOOST.multiplier : 1;
  // Hero skills are not decoration: a deployed Biscuit really does add 8% to
  // the Kitchen. Folded in here so a hero's card and the building's stated
  // rate can never disagree.
  const roster = rosterBonuses(s);
  const tech = researchBonuses(s);
  const res = PRODUCERS[id].res;
  const fromHeroes =
    (roster.produce[res] || 0) + roster.allProduce + (tech.produce[res] || 0) + tech.allProduce;
  // Whatever Palis left behind. A ransacked building makes nothing at all; a
  // spooked one works at half speed. It is never permanent and it never takes
  // anything already banked — see lib/palis.js.
  const mess = outputMultiplier(s.problems, id);
  return (
    effectiveRate(id, level, {
      power: here,
      starving: isStarving(s),
      furniture: bonusesAt(s, id, level).produce + fromHeroes,
    }) *
    boosted *
    mess
  );
}

/** Everything the town makes per hour, by resource. */
function townRates(s, now = Date.now()) {
  const cats = catsPerBuilding(s);
  const out = {};
  for (const id of Object.keys(PRODUCERS)) {
    const r = rateAt(s, id, now, cats);
    if (r > 0) out[PRODUCERS[id].res] = (out[PRODUCERS[id].res] || 0) + r;
  }
  const levels = levelsOf(s);
  const roster = rosterBonuses(s);
  const tech = researchBonuses(s);
  const gold = goldPerHour(s, levels) * (1 + (roster.gold + tech.gold) / 100);
  if (gold > 0) out.coin = (out.coin || 0) + gold;
  return out;
}

/** Pour the last stretch of time into the stockpile.
 *
 *  This replaces tapping every building. It runs on the tick AND on load, so
 *  time spent away is worth exactly what time spent watching is worth — which
 *  is what makes an idle game honest.
 *
 *  Refiners are handled here too: the Treat Factory cannot conjure Treats, so
 *  it takes its Fish and Catnip out of the same stockpile it fills. */
function applyProduction(s, now = Date.now()) {
  const since = s.lastProd || s.lastSeen || now;
  const secs = Math.max(0, (now - since) / 1000);
  if (secs <= 0) return s;

  const cats = catsPerBuilding(s);
  const gains = {};
  const spend = {};
  for (const id of Object.keys(PRODUCERS)) {
    const made = producedOver(rateAt(s, id, now, cats), secs);
    if (made <= 0) continue;
    const recipe = REFINERS[id];
    if (recipe) {
      // Only make what the ingredients allow — the Kitchen and the Garden are
      // what the Treat Factory actually runs on.
      let possible = made;
      for (const [k, per] of Object.entries(recipe)) {
        if (per > 0) possible = Math.min(possible, ((s.res[k] || 0) - (spend[k] || 0)) / per);
      }
      possible = Math.max(0, possible);
      if (possible <= 0) continue;
      for (const [k, per] of Object.entries(recipe)) spend[k] = (spend[k] || 0) + possible * per;
      gains[PRODUCERS[id].res] = (gains[PRODUCERS[id].res] || 0) + possible;
    } else {
      gains[PRODUCERS[id].res] = (gains[PRODUCERS[id].res] || 0) + made;
    }
  }

  const levels = levelsOf(s);
  const roster = rosterBonuses(s);
  const tech = researchBonuses(s);
  const gold = producedOver(goldPerHour(s, levels) * (1 + (roster.gold + tech.gold) / 100), secs);
  if (gold > 0) gains.coin = (gains.coin || 0) + gold;

  let res = { ...s.res };
  for (const [k, v] of Object.entries(spend)) res[k] = Math.max(0, (res[k] || 0) - v);
  const capped = addCapped(res, gains, levelOf(s, "storehouse"), levelOf(s, "hall"));
  return { ...s, res: capped.res, lastProd: now, overflow: capped.wasted > 0 };
}

/** Work out what Palis did while nobody was watching, and apply it.
 *
 *  Kept pure-ish and separate so the server can run the same thing: it takes a
 *  save and hands back a new one plus what changed, rather than reaching into
 *  React. The one destructive kind — "pilfered" — is capped twice over, by a
 *  share AND by an absolute number of hours of production, because losing a
 *  percentage of a stockpile is how an idle game turns a holiday into a
 *  betrayal. */
function runPalis(s, now = Date.now()) {
  const levels = levelsOf(s);
  const fresh = generateVisits(
    {
      levels,
      existing: s.problems || [],
      lastVisitAt: s.lastVisitAt,
      defenceLevel: palisDefence(levels, rosterBonuses(s)),
    },
    now
  );
  if (!fresh.length) {
    return { save: { ...s, lastVisitAt: now }, fresh, stolen: null };
  }

  let res = { ...s.res };
  let stolen = null;
  for (const p of fresh) {
    if (!PROBLEMS[p.kind]?.steals) continue;
    // One resource, the one there is most of, capped at a couple of hours of
    // what the town actually makes.
    const rates = townRates(s, now);
    const pick = RESOURCE_ORDER.filter((r) => (res[r] || 0) > 0).sort(
      (a, b) => (res[b] || 0) - (res[a] || 0)
    )[0];
    if (!pick) continue;
    const cap = Math.max(50, (rates[pick] || 0) * STEAL_CAP_HOURS);
    const take = Math.floor(Math.min((res[pick] || 0) * STEAL_SHARE, cap));
    if (take <= 0) continue;
    res[pick] -= take;
    stolen = { res: pick, amount: take };
  }

  return {
    save: { ...s, res, problems: [...(s.problems || []), ...fresh], lastVisitAt: now },
    fresh,
    stolen,
  };
}

/** Cats eat. This is why Fish is not just another number, and why the Kitchen
 *  is not optional — run out and the whole town drops to a quarter speed. */
/** Hand over the free keys that accrued while the player was away.
 *
 *  Kingshot's free player has six heroes after two days because Kingshot hands
 *  out recruitment every day. Ours had one, because keys only came from bosses
 *  and chapters — both of which need heroes you do not have yet. A faucet that
 *  runs on a clock breaks that circle. See lib/luckyLitter.js. */
function applyKeyFaucet(s, now = Date.now()) {
  const keys = { ...(s.keys || {}) };
  let gained = 0;
  for (const kind of ["silver", "gold"]) {
    const field = kind + "At";
    if (!keys[field]) keys[field] = now;
    const { got, at } = keysAccrued(kind, keys[field], now, keys[kind] || 0);
    if (got > 0) {
      keys[kind] = (keys[kind] || 0) + got;
      gained += got;
    }
    keys[field] = at;
  }
  return gained > 0 ? { ...s, keys, keysGained: gained } : { ...s, keys };
}

function applyUpkeep(s, now = Date.now()) {
  // NOTHING EATS BEFORE THERE IS A KITCHEN.
  //
  // This was a hard soft-lock and it took a simulation to find. The Kitchen
  // unlocks at Cat Hall 2, so a Cat Hall 1 town has NO fish income at all —
  // and the Cat Hall 1 -> 2 upgrade costs 360 fish out of the 400 you start
  // with. At 26 fish an hour the window to make that upgrade was TWO HOURS
  // from opening the game for the first time. Miss it, and the save was
  // unwinnable forever with no message explaining why.
  //
  // A town cannot be charged upkeep for a building the ladder has not given it
  // yet. Upkeep starts with the Kitchen, which is also when it starts being a
  // decision rather than a trap.
  if (levelOf(s, "kitchen") < 1) return { ...s, lastUpkeep: now };
  const since = s.lastUpkeep || s.lastSeen || now;
  const hours = Math.max(0, (now - since) / 3_600_000);
  if (hours <= 0) return s;
  const eaten = upkeepPerHour(assignedCount(s)) * hours;
  if (eaten <= 0) return { ...s, lastUpkeep: now };
  return {
    ...s,
    res: { ...s.res, fish: Math.max(0, (s.res.fish || 0) - eaten) },
    lastUpkeep: now,
  };
}

/** Old saves kept a single loose `treats` number. Fold it into the new resource
 *  bag so nobody loses a balance to a schema change.
 *
 *  v3 is the big one: buildings gained a level 0 ("an unbuilt plot"), and
 *  population moved from the Cat Hall to the Cat Cottages. A v2 save has ten
 *  buildings that all existed at level 1 or better and a villager cap of
 *  hall + 1 — both have to survive, or a returning player logs in to a town
 *  that has demolished itself. */
const V2_BUILDINGS = [
  "hall", "adoption", "kitchen", "treats",
  "lumber", "quarry", "garden", "storehouse", "watchtower",
];

function migrateToCottages(s) {
  const b = { ...(s.buildings || {}) };
  // Everything that existed in v2 keeps existing, at least at level 1.
  for (const id of V2_BUILDINGS) if (!b[id]) b[id] = 1;

  // The old cap was hall + 1. Rebuild it out of the two starting cottages so
  // nobody's crew shrinks — clampCrew would otherwise fire cats they earned.
  const hall = b.hall || 1;
  // The old Nap House WAS the villager cap in disguise, so its level is folded
  // into the cottages rather than discarded.
  const want = Math.min(8, Math.max(hall + 1, (s.buildings || {}).nap || 0));
  b.cottage1 = Math.max(b.cottage1 || 0, Math.ceil(want / 2));
  b.cottage2 = Math.max(b.cottage2 || 0, Math.floor(want / 2));
  return { ...s, buildings: b };
}

/** A real cat from the pool, chosen deterministically from an old save key.
 *
 *  Same key always gives the same cat, so a villager the player already knows
 *  does not become somebody else on reload — and it is always a cat whose
 *  artwork is on disk, which a hashed number is not. */
function poolIdFor(key, rarity) {
  const h = villagerIdFromKey(key);
  const of = catPool.cats.filter((c) => c.rarity === rarity);
  const list = of.length ? of : catPool.cats;
  if (!list.length) return h;
  return list[h % list.length].id;
}

function migrate(s) {
  if (!s.res) {
    s.res = { fish: 600, wood: 400, stone: 60, catnip: 0, treats: Math.floor(s.treats || 0), gold: 30 };
  } else if (s.treats != null) {
    s.res = { ...s.res, treats: Math.max(s.res.treats || 0, Math.floor(s.treats)) };
  }
  if (!s.furniture) s.furniture = {};
  // Retired: Palis stopped being a raid you launch and became the thing that
  // goes wrong while you are away (lib/palis.js). Old saves keep the fields
  // harmlessly; nothing reads them.
  if (!s.tech) s.tech = {};
  if (!s.army) s.army = { guard: {}, slinger: {}, runner: {} };
  if (!s.training) s.training = {};
  if (!s.problems) s.problems = [];
  if (!s.lastVisitAt) s.lastVisitAt = Date.now();
  if (s.tokens == null) s.tokens = 0;
  if (!s.heroes) s.heroes = {};
  if (!s.pendingShards) s.pendingShards = {};
  if (!s.patrol) s.patrol = [];
  if (!s.conquest) s.conquest = { stage: 1, cleared: 0, bossHp: null, lineup: [] };
  if (!s.conquest.collectedAt) s.conquest.collectedAt = Date.now();
  if (!s.keys) s.keys = { silver: 8, gold: 2 };
  if (!s.keys.silverAt) s.keys.silverAt = Date.now();
  if (!s.keys.goldAt) s.keys.goldAt = Date.now();
  if (!s.litter) {
    s.litter = { startedAt: Date.now(), spins: 0, pity: { silver: 0, gold: 0 }, claimed: {}, lastFreeAt: 0 };
  }
  if (s.res && s.res.coin == null) s.res.coin = 250;
  if (!s.lastProd) s.lastProd = Date.now();
  delete s.collected;
  if (!s.assign) s.assign = {};
  if (!s.buildingSlots) s.buildingSlots = {};
  delete s.extraSlots;
  if (s.builders > 1 && !s.buildersBought) s.builders = 1;
  if (!s.boosts) s.boosts = {};
  if (!s.positions) s.positions = {};
  if (!s.claimed) s.claimed = {};
  delete s.treats;
  if ((s.v || 0) < 3) {
    s = migrateToCottages(s);
    s.v = 3;
  }

  // ---- v6: the day-one hero roster -----------------------------------------
  // A new account used to start with no heroes at all, so the Conquest screen
  // was unusable until a gacha happened to be kind. Kingshot hands out a
  // Legendary at launch. Existing saves get the same gift rather than being
  // punished for having started earlier — but only the heroes they are missing,
  // so nobody's progress is overwritten.
  if ((s.v || 0) < 6) {
    const gift = starterHeroes();
    s.heroes = { ...gift, ...(s.heroes || {}) };
    s.v = 6;
  }

  // ---- v4: a villager is a token id, not a picture --------------------------
  // Old saves keyed villagers by `rarity|art` and stored no id, so every one of
  // them needs a real one.
  //
  // THE ID HAS TO BE A CAT THAT EXISTS. The first pass hashed the old key into
  // the 0..19999 range, which is a valid-looking token number that almost never
  // has art on disk — so the town filled up with the "no picture" fallback and
  // the player got blobs with two eyes walking around. The id is drawn from the
  // POOL instead: still deterministic from the old key, so a cat keeps its name
  // across the change, but always one whose artwork is actually here.
  if ((s.v || 0) < 5) {
    const cats = {};
    for (const [k, c] of Object.entries(s.cats || {})) {
      const id = poolIdFor(k, c.rarity);
      const next = { ...c, id, name: c.name || villagerName(id) };
      delete next.art;
      cats[k] = next;
    }
    s.cats = cats;
    // The old Album's "send to work" list. Assignment is per building now, and
    // this array has driven nothing for a long time.
    delete s.slotted;
    s.v = 5;
  }

  return clampCrew(s);
}

// ---- formatting ------------------------------------------------------------
function fmt(n) {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.floor(n));
}
function fmtRate(n) {
  return n >= 100 ? fmt(n) : n.toFixed(1);
}
function fmtDur(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(sec)}s`;
}

/** Visual work-cycle length for a cat, in seconds. Rarer cats visibly hustle
 *  faster — the bar filling is what makes idle production *feel* like work. */
function cycleFor(rate) {
  return Math.max(0.7, Math.min(6, 3 / Math.sqrt(Math.max(rate, 0.01))));
}

export default function TubbyTown() {
  const [save, setSave] = useState(null);
  const [tab, setTab] = useState("town");
  const [pullResult, setPullResult] = useState(null);
  const [picked, setPicked] = useState(null);
  const [moving, setMoving] = useState(null);
  const [book, setBook] = useState(false);
  const [buying, setBuying] = useState(null);
  const [welcomeBack, setWelcomeBack] = useState(null);
  const [litterOpen, setLitterOpen] = useState(false);
  const [alleyOpen, setAlleyOpen] = useState(false);

  const [studyOpen, setStudyOpen] = useState(false);
  const [trainOpen, setTrainOpen] = useState(null);
  const [spinResult, setSpinResult] = useState(null);
  const [toast, setToast] = useState(null);
  // A once-a-second clock. Production accrues against wall time now, so the
  // derived values (what is ready, build countdowns) need a reason to recompute
  // even on ticks where the save itself does not change.
  const [clock, setClock] = useState(0);
  const saveRef = useRef(null);
  saveRef.current = save;

  // ---- load + offline earnings --------------------------------------------
  useEffect(() => {
    let s;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      s = raw ? migrate({ ...freshSave(), ...JSON.parse(raw) }) : freshSave();
    } catch {
      s = freshSave();
    }

    // Time away is paid out in full, straight into the stockpile — there is
    // nothing to tap. The welcome-back card exists to SHOW that, because an
    // idle game that pays silently feels like it paid nothing.
    const away = Math.max(0, (Date.now() - (s.lastSeen || Date.now())) / 1000);
    const before = { ...s.res };
    // Palis first: what he took, he took BEFORE the town produced it back.
    const visit = runPalis(s);
    s = visit.save;
    s = fillVillagers(s);
    s = applyKeyFaucet(applyUpkeep(s));
    s = applyProduction(s);
    if (away > 120) {
      const gained = Object.entries(s.res).reduce(
        (a, [k, v]) => a + Math.max(0, v - (before[k] || 0)),
        0
      );
      if (gained > 0 || visit.fresh.length) {
        setWelcomeBack({
          gained,
          away,
          overflow: s.overflow,
          palis: visit.fresh.length ? palisSummary(visit.fresh) : null,
          stolen: visit.stolen,
        });
      }
    }
    s.lastSeen = Date.now();
    setSave(s);
  }, []);

  // ---- persist -------------------------------------------------------------
  useEffect(() => {
    if (!save) return;
    const id = setInterval(() => {
      const s = saveRef.current;
      if (!s) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, lastSeen: Date.now() }));
      } catch {}
    }, 2000);
    const onLeave = () => {
      const s = saveRef.current;
      if (!s) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, lastSeen: Date.now() }));
      } catch {}
    };
    window.addEventListener("beforeunload", onLeave);
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", onLeave);
      onLeave();
    };
  }, [save !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- production tick -----------------------------------------------------
  useEffect(() => {
    if (!save) return;
    const id = setInterval(() => {
      setSave((s) => {
        if (!s) return s;
        const now = Date.now();
        // Resources first, so a build that finishes this tick is paid for out
        // of a stockpile that already includes the seconds it took.
        let next = fillVillagers(applyProduction(s, now));
        // complete any build whose time is up
        // Research and training finish on their own, like builds do.
        if (next.research && next.research.finishesAt <= now) {
          const r = next.research;
          flash(`${TECH_BY_ID[r.tech].name} researched.`);
          next = {
            ...next,
            tech: { ...next.tech, [r.tech]: (next.tech[r.tech] || 0) + 1 },
            research: null,
          };
        }
        const doneTraining = Object.entries(next.training || {}).filter(
          ([, j]) => j.finishesAt <= now
        );
        if (doneTraining.length) {
          const army = { ...next.army };
          const training = { ...next.training };
          for (const [bid, j] of doneTraining) {
            const cls = TRAINERS[bid].cls;
            army[cls] = { ...army[cls], [j.tier]: (army[cls][j.tier] || 0) + j.count };
            delete training[bid];
          }
          next = { ...next, army, training };
        }

        const done = Object.entries(s.jobs || {}).filter(([, j]) => j.finishesAt <= now);
        if (done.length) {
          const jobs = { ...s.jobs };
          const buildings = { ...s.buildings };
          for (const [id, j] of done) {
            buildings[id] = j.toLevel;
            delete jobs[id];
          }
          next = { ...next, jobs, buildings };
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [save !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => {
      setClock((c) => c + 1);
      setSave((s) => (s ? clampCrew(applyKeyFaucet(applyUpkeep(s))) : s));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  /** Empty the Alley's purse into the town.
   *
   *  Opening the Alley collects first and fights second, which is deliberate:
   *  Kingshot's own advice is to collect twice a day and never let the timer
   *  cap out, and a reward you have to remember to press a second button for
   *  is a reward players lose. */
  const collectAlley = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      const p = alleyPending(s);
      const now = Date.now();
      if (p.coin < 1) return { ...s, conquest: { ...s.conquest, collectedAt: now } };
      const { res, wasted } = addCapped(
        s.res,
        { coin: p.coin },
        levelOf(s, "storehouse"),
        levelOf(s, "hall")
      );
      flash(
        wasted > 0
          ? `+${fmt(p.coin - wasted)} Gold from the Alley — the rest did not fit.`
          : `+${fmt(p.coin)} Gold from the Alley.`
      );
      return { ...s, res, conquest: { ...s.conquest, collectedAt: now } };
    });
  }, [flash]);

  // ---- derived -------------------------------------------------------------
  const tier = save ? holdTier(save.hold) : game.holdTiers[0];
  const rate = save ? townRate(save) : 0;
  const collection = useMemo(() => {
    if (!save) return [];
    return Object.values(save.cats).sort(
      (a, b) =>
        RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.level - a.level
    );
  }, [save]);

  // ---- actions -------------------------------------------------------------
  /** Fold adopted villagers into the town. A duplicate becomes a shard on the
   *  cat you already have, so no adoption is ever wasted. */
  const addCats = useCallback((s, rolls) => {
    const cats = { ...s.cats };
    const results = [];
    for (const roll of rolls) {
      if (!roll) continue;
      const k = catKey(roll);
      if (cats[k]) {
        cats[k] = { ...cats[k], shards: cats[k].shards + 1 };
        results.push({ ...roll, dupe: true });
      } else {
        cats[k] = roll;
        results.push({ ...roll, dupe: false });
      }
    }
    return { next: { ...s, cats }, results };
  }, []);

  const doPull = useCallback(
    (count, { free = false } = {}) => {
      setSave((s) => {
        if (!s) return s;
        const cost = free ? 0 : game.pullCostTreats * count;
        if (T(s) < cost) {
          flash("Not enough treats.");
          return s;
        }
        const rolls = [];
        let pity = s.pity;
        for (let i = 0; i < count; i++) {
          pity += 1;
          // hard pity: guaranteed Legendary+ …
          let forceMin = pity >= game.pity.hardAt ? "legendary" : null;
          // …and every 10× carries an Epic+ floor on its last roll if nothing hit
          if (!forceMin && count >= 10 && i === count - 1) {
            const best = rolls.reduce((m, r) => Math.max(m, RARITY_ORDER.indexOf(r.rarity)), -1);
            if (best < RARITY_ORDER.indexOf(game.pity.tenPullFloor)) {
              forceMin = game.pity.tenPullFloor;
            }
          }
          // The wheel decides the RARITY; the collection decides who turns up.
          // Adoption used to roll a picture out of the same 25-image set the
          // heroes use, which is how a worker and a five-star hero ended up
          // being the same cat.
          const rarity = rollRarity(forceMin);
          if (RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf("legendary")) pity = 0;
          rolls.push(pickVillager(catPool.cats, rarity));
        }
        const { next, results } = addCats({ ...s, res: { ...s.res, treats: T(s) - cost }, pity }, rolls);
        setPullResult(results);
        return { ...next, pulls: s.pulls + count };
      });
    },
    [addCats, flash]
  );

  const levelUp = useCallback(
    (key) => {
      setSave((s) => {
        if (!s) return s;
        const cat = s.cats[key];
        if (!cat) return s;
        const needShards = shardsToLevel(cat.rarity, cat.level);
        const needTreats = game.levelUpTreats(cat.level, RARITIES[cat.rarity].mult);
        if (cat.shards < needShards) {
          flash(`Needs ${needShards} shards — pull duplicates of this cat.`);
          return s;
        }
        if (T(s) < needTreats) {
          flash("Not enough treats.");
          return s;
        }
        return {
          ...s,
          res: { ...s.res, treats: T(s) - needTreats },
          cats: {
            ...s.cats,
            [key]: { ...cat, level: cat.level + 1, shards: cat.shards - needShards },
          },
        };
      });
    },
    [flash]
  );

  const buySlot = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      if (s.slots >= game.freeSlotLimit) {
        flash("Slots past 8 are in the shop.");
        return s;
      }
      const cost = game.slotCost(s.slots);
      if (T(s) < cost) {
        flash("Not enough treats.");
        return s;
      }
      return { ...s, res: { ...s.res, treats: T(s) - cost }, slots: s.slots + 1 };
    });
  }, [flash]);

  const buyBowl = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      if (s.bowlHours >= game.maxBowlHours) {
        flash("Bowl is already max size.");
        return s;
      }
      const cost = game.bowlCost(s.bowlHours);
      if (T(s) < cost) {
        flash("Not enough treats.");
        return s;
      }
      return { ...s, res: { ...s.res, treats: T(s) - cost }, bowlHours: s.bowlHours + game.bowlStep };
    });
  }, [flash]);

  // Shop is MOCKED — it grants the item without charging anything.
  const mockBuy = useCallback(
    (item) => {
      if (item.kind === "pull") {
        doPull(item.qty, { free: true });
        return;
      }
      setSave((s) => {
        if (!s) return s;
        if (item.kind === "bowl") {
          flash("Bowl filled.");
          return { ...s, res: { ...s.res, fish: s.res.fish + 2000, wood: s.res.wood + 2000, stone: s.res.stone + 400 } };
        }
        if (item.kind === "slot") {
          if (s.slots >= game.maxSlots) {
            flash("Max slots reached.");
            return s;
          }
          flash("Slot added.");
          return { ...s, slots: s.slots + 1 };
        }
        if (item.kind === "skin") {
          flash(s.skin ? "Skin off." : "Golden Town on.");
          return { ...s, skin: !s.skin };
        }
        return s;
      });
    },
    [doPull, flash]
  );

  const startUpgrade = useCallback(
    (id) => {
      setSave((s) => {
        if (!s) return s;
        if (s.jobs?.[id]) return s;
        const level = levelOf(s, id);
        const hall = levelOf(s, "hall");
        // Locked is a different failure from capped, and saying so is the whole
        // point of the unlock ladder: the player learns that the Cat Hall is
        // the thing that opens the town.
        if (!isUnlocked(id, hall)) {
          const b = BUILDINGS.find((x) => x.id === id);
          flash(`Unlocks at Cat Hall ${b?.unlockAt}.`);
          return s;
        }
        if (level >= maxLevelFor(id, hall)) {
          flash("The Cat Hall has to grow first.");
          return s;
        }
        const gate = furnitureGate(s, id, level);
        if (gate.length) {
          flash(`Fit the ${gate[0].it.name} first — level ${gate[0].need}.`);
          return s;
        }
        const unmet = unmetRequirements(id, level, levelsOf(s));
        if (unmet.length) {
          const names = unmet.map((r) => `${BUILDINGS.find((b) => b.id === r.id).name} ${r.level}`);
          flash(`Needs ${names.join(" and ")} first.`);
          return s;
        }
        const busy = Object.keys(s.jobs || {}).length;
        const totalBuilders = s.builders + ((s.rentedUntil || 0) > Date.now() ? 1 : 0);
        if (busy >= totalBuilders) {
          flash("Every builder is busy.");
          return s;
        }
        const cost = upgradeCostFor(id, level);
        if (!canAfford(cost, s.res)) {
          flash("Not enough resources.");
          return s;
        }
        const res = { ...s.res };
        for (const [k, v] of Object.entries(cost)) res[k] -= v;
        // Research shortens builds; Palis's string lengthens them.
        const tech = researchBonuses(s);
        const secs = Math.max(
          3,
          Math.round(
            (buildSecondsFor(id, level) / (1 + tech.build / 100)) / buildMultiplier(s.problems)
          )
        );
        return {
          ...s,
          res,
          jobs: {
            ...s.jobs,
            [id]: { toLevel: level + 1, startedAt: Date.now(), finishesAt: Date.now() + secs * 1000 },
          },
        };
      });
    },
    [flash]
  );

  // Mocked: in the real build this is a purchase, verified before the state
  // changes — never the other way round (docs/security.md §4b).
  const rushUpgrade = useCallback(
    (id) => {
      setSave((s) => {
        if (!s || !s.jobs?.[id]) return s;
        const left = Math.max(0, (s.jobs[id].finishesAt - Date.now()) / 1000);
        const price = rushCost(left);
        if ((s.res.gold || 0) < price) {
          flash(`Need ${price} Golden Fish.`);
          return s;
        }
        const jobs = { ...s.jobs, [id]: { ...s.jobs[id], finishesAt: Date.now() } };
        flash("Finished instantly.");
        return { ...s, res: { ...s.res, gold: s.res.gold - price }, jobs };
      });
    },
    [flash]
  );

  /** Ask the clowder to speed a job along.
   *
   *  In Kingshot this is the single most-tapped button in the game, and the
   *  reason is the FLOOR rather than the percentage: one tap takes 1% off the
   *  remaining time or a whole minute, whichever is MORE. Small jobs evaporate
   *  under a few taps; a two-day job merely bends. Generous exactly when a new
   *  player needs it, and never trivialising the late game.
   *
   *  Nobody can actually tap yet — there is no server and no clowder — so the
   *  prototype has neighbours wander by instead, and the panel says so. The
   *  maths here is the real thing and moves to the server unchanged. */
  const askForHelp = useCallback(
    (id) => {
      setSave((s) => {
        if (!s?.jobs?.[id]) return s;
        if (s.jobs[id].asked) {
          flash("The clowder already knows.");
          return s;
        }
        flash("Asked the clowder for a hand.");
        return { ...s, jobs: { ...s.jobs, [id]: { ...s.jobs[id], asked: Date.now() } } };
      });
    },
    [flash]
  );

  /** Tap help on someone else's job. Earns tokens, which is the only reason
   *  anyone ever taps — a help system that does not pay the helper is
   *  decoration. Wired to the neighbours until there are real towns to help. */
  const helpOnce = useCallback(
    (id, who) => {
      setSave((s) => {
        const job = s?.jobs?.[id];
        if (!job) return s;
        const { job: next, helped, cut } = applyHelp(job);
        if (!helped) return s;
        flash(`${who} helped · −${Math.round(cut)}s`);
        return {
          ...s,
          jobs: { ...s.jobs, [id]: next },
          tokens: (s.tokens || 0) + TOKENS_PER_HELP,
        };
      });
    },
    [flash]
  );

  // ---- THE STUDY --------------------------------------------------------

  /** Start a research. One at a time — that constraint IS the tech tree. */
  const startResearch = useCallback(
    (techId) => {
      setSave((s) => {
        if (s.research) {
          flash("Something is already being researched.");
          return s;
        }
        const t = TECH_BY_ID[techId];
        const why = techBlocked(s, t, levelOf(s, "study"));
        if (why) {
          flash(why);
          return s;
        }
        const level = techLevel(s, techId);
        const cost = techCost(t, level);
        if (!canAfford(cost, s.res)) {
          const short = Object.keys(shortfall(cost, s.res)).map((k) => RESOURCES[k].short).join(", ");
          flash(`Short on ${short}.`);
          return s;
        }
        const res = { ...s.res };
        for (const [k, v] of Object.entries(cost)) res[k] -= v;
        const secs = effectiveSeconds(t, level, researchBonuses(s));
        return {
          ...s,
          res,
          research: {
            tech: techId,
            level,
            startedAt: Date.now(),
            finishesAt: Date.now() + secs * 1000,
          },
        };
      });
    },
    [flash]
  );

  const rushResearch = useCallback(() => {
    setSave((s) => {
      if (!s.research) return s;
      const left = Math.max(0, (s.research.finishesAt - Date.now()) / 1000);
      const price = Math.max(1, Math.ceil(left / 45));
      if ((s.res.gold || 0) < price) {
        flash(`Need ${price} Golden Fish.`);
        return s;
      }
      return {
        ...s,
        res: { ...s.res, gold: s.res.gold - price },
        research: { ...s.research, finishesAt: Date.now() },
      };
    });
  }, [flash]);

  // ---- TROOPS -----------------------------------------------------------

  /** Train a batch, or promote one up a tier. Same job slot per building,
   *  because a barracks doing two things at once is not a barracks. */
  const startTraining = useCallback(
    (buildingId, tier, count, promote = false) => {
      setSave((s) => {
        if (s.training?.[buildingId]) {
          flash("Already training.");
          return s;
        }
        const level = levelOf(s, buildingId);
        if (tier > topTier(level)) {
          flash(`${TRAINERS[buildingId].name} is not high enough for T${tier}.`);
          return s;
        }
        const n = Math.max(1, Math.min(count, troopCapacity(level)));
        const cls = TRAINERS[buildingId].cls;
        if (promote && (s.army?.[cls]?.[tier - 1] || 0) < n) {
          flash(`Not enough T${tier - 1} to promote.`);
          return s;
        }
        const speed = researchBonuses(s).research;
        const cost = promote ? promoteCost(tier, n) : troopCost(tier, n);
        if (!canAfford(cost, s.res)) {
          const short = Object.keys(shortfall(cost, s.res)).map((k) => RESOURCES[k].short).join(", ");
          flash(`Short on ${short}.`);
          return s;
        }
        const res = { ...s.res };
        for (const [k, v] of Object.entries(cost)) res[k] -= v;

        // Promotion takes the lower-tier cats off the books NOW, so they cannot
        // also be marching while they are being promoted.
        let army = s.army;
        if (promote) {
          army = {
            ...army,
            [cls]: { ...army[cls], [tier - 1]: (army[cls][tier - 1] || 0) - n },
          };
        }
        const secs = promote
          ? promoteSeconds(tier, n, level, speed)
          : trainSeconds(tier, n, level, speed);
        return {
          ...s,
          res,
          army,
          training: {
            ...s.training,
            [buildingId]: {
              tier, count: n, promote,
              startedAt: Date.now(),
              finishesAt: Date.now() + secs * 1000,
            },
          },
        };
      });
    },
    [flash]
  );

  /** Sort out one of Palis's messes.
   *
   *  It PAYS. That is the Hay Day insight and the whole reason this system is
   *  worth having: an obstacle you are rewarded for clearing is a reason to
   *  open the game, while an obstacle that only costs you is a reason to stop.
   *  Some cost a little to fix and all of them give back more. */
  const fixProblem = useCallback(
    (problemId) => {
      setSave((s) => {
        const p = (s.problems || []).find((x) => x.id === problemId);
        if (!p) return s;
        const level = levelOf(s, p.building);
        const cost = palisFixCost(p, level);
        if (!canAfford(cost, s.res)) {
          const short = Object.keys(shortfall(cost, s.res))
            .map((k) => RESOURCES[k].short)
            .join(", ");
          flash(`Short on ${short}.`);
          return s;
        }
        const reward = palisFixReward(p, level);
        let res = { ...s.res };
        for (const [k, v] of Object.entries(cost)) res[k] -= v;
        const out = addCapped(res, reward, levelOf(s, "storehouse"), levelOf(s, "hall"));
        flash(`Sorted — +${Math.floor(reward.coin || 0)} Gold`);
        return {
          ...s,
          res: out.res,
          problems: s.problems.filter((x) => x.id !== problemId),
        };
      });
    },
    [flash]
  );

  /** A neighbour lends a hand. Hay Day revives a wilting tree when a FRIEND
   *  taps it; enough taps here and the mess clears itself, free. Until the
   *  clowder is real the neighbours do it themselves, and the panel says so. */
  const helpProblem = useCallback(
    (problemId, who) => {
      setSave((s) => {
        const p = (s.problems || []).find((x) => x.id === problemId);
        if (!p) return s;
        const helps = (p.helps || 0) + 1;
        if (helps >= HELPS_TO_CLEAR) {
          flash(`${who} finished clearing it.`);
          return { ...s, problems: s.problems.filter((x) => x.id !== problemId) };
        }
        return {
          ...s,
          problems: s.problems.map((x) => (x.id === problemId ? { ...x, helps } : x)),
        };
      });
    },
    [flash]
  );

  // ---- HERO CATS ------------------------------------------------------------

  /** Spin a wheel. `how` is free, key or fish — three doors onto the same
   *  roll, which is the point: the free one gets the screen opened and the
   *  screen is where the other two are sold.
   *
   *  Written against saveRef rather than inside a setSave updater, and that is
   *  not a style preference. React runs updaters twice under StrictMode to
   *  surface impure ones, so rolling the dice in there rolled it TWICE and
   *  threw one away — a gacha that silently discards results is the worst
   *  possible bug for this particular screen. Updaters stay pure; the roll and
   *  the modal happen out here. */
  const doSpin = useCallback(
    (wheelId, how) => {
      const s = saveRef.current;
      if (!s) return;
      const w = WHEELS[wheelId];
      const litter = { ...s.litter };
      const keys = { ...s.keys };
      const res = { ...s.res };

      if (how === "free") {
        if (wheelId !== "silver" || freeSpinsReady(litter.lastFreeAt, litter.startedAt) < 1) {
          flash("No free spin today.");
          return;
        }
        litter.lastFreeAt = Date.now();
      } else if (how === "key") {
        if ((keys[wheelId] || 0) < 1) {
          flash(`No ${w.key}s.`);
          return;
        }
        keys[wheelId] -= 1;
      } else {
        if ((res.gold || 0) < w.goldFish) {
          flash(`Need ${w.goldFish} Golden Fish.`);
          return;
        }
        res.gold -= w.goldFish;
      }

      const pity = { ...(litter.pity || {}) };
      const out = spinWheel(wheelId, pity[wheelId] || 0);
      // The counter clears only on a result it was actually promising.
      pity[wheelId] =
        out.pity || RARITY_AT_LEAST(out.rarity, w.pityFloor) ? 0 : (pity[wheelId] || 0) + 1;
      litter.pity = pity;
      litter.spins = (litter.spins || 0) + 1;

      let next = { ...s, res, keys, litter };
      let recruited = false;
      let villager = null;
      let dupe = false;
      if (out.hero) {
        const g = grantShards(next, out.hero.id, out.shards);
        recruited = g.recruited;
        next = { ...next, heroes: g.heroes, pendingShards: g.pendingShards };
      } else {
        // A villager, with a name and a face, who moves into the town. Not a
        // consolation prize: population is what gates every building, so this
        // is often the more useful half of the wheel early on.
        villager = pickVillager(catPool.cats, "common");
        if (villager) {
          const key = catKey(villager);
          const had = next.cats[key];
          next = {
            ...next,
            cats: {
              ...next.cats,
              // A duplicate villager levels the one you have, the way duplicate
              // heroes become shards. Nothing from a wheel is ever wasted.
              [key]: had ? { ...had, level: had.level + 1 } : villager,
            },
          };
          dupe = !!had;
        }
        next = { ...next, res: { ...next.res, coin: (next.res.coin || 0) + out.shards * 25 } };
      }
      setSave(next);
      setSpinResult({ ...out, recruited, wheelId, villager, dupe });
    },
    [flash]
  );

  /** Fight the current stage of the Long Alley.
   *
   *  Returns the simulated battle so the screen can replay it — the result is
   *  already decided and banked here. Same discipline as the gacha: the
   *  animation reveals, it never resolves. */
  const fightStage = useCallback(
    (lineup) => {
      const s = saveRef.current;
      if (!s) return null;
      const cq = s.conquest;
      const out = simulateStage(lineup, s, cq.stage, { bossHp: cq.bossHp });
      if (out.empty) {
        flash("Put someone in the line-up first.");
        return null;
      }

      let next = { ...s };
      if (out.won) {
        const r = stageReward(cq.stage);
        const keys = { ...s.keys };
        for (const [k, n] of Object.entries(r.keys || {})) keys[k] = (keys[k] || 0) + n;
        const { res } = addCapped(s.res, { coin: r.coin }, levelOf(s, "storehouse"), levelOf(s, "hall"));
        next = {
          ...next,
          res,
          keys,
          conquest: {
            ...cq,
            stage: cq.stage + 1,
            cleared: Math.max(cq.cleared, cq.stage),
            // A new stage means a fresh boss.
            bossHp: null,
            lineup,
          },
        };
        if (r.shards) {
          const target = Object.keys(next.heroes)[0];
          if (target) {
            const g = grantShards(next, target, r.shards);
            next = { ...next, heroes: g.heroes, pendingShards: g.pendingShards };
          }
        }
      } else {
        // Kingshot makes boss damage permanent between attempts, so a wall is
        // something you chip rather than something you bounce off.
        next = {
          ...next,
          conquest: { ...cq, bossHp: isBoss(cq.stage) ? out.bossHp : null, lineup },
        };
      }
      setSave(next);
      return out;
    },
    [flash]
  );

  /** Put a hero in a line-up slot, or clear it. */
  const setLineupSlot = useCallback((slot, heroId) => {
    setSave((s) => {
      const lineup = Array.from({ length: LINEUP_SIZE }, (_, i) => s.conquest.lineup?.[i] || null);
      // A hero can only stand in one place at a time.
      const already = lineup.indexOf(heroId);
      if (heroId && already >= 0) lineup[already] = null;
      lineup[slot] = heroId;
      return { ...s, conquest: { ...s.conquest, lineup } };
    });
  }, []);

  /** Take a milestone reward. */
  const claimMilestone = useCallback(
    (at) => {
      setSave((s) => {
        const m = MILESTONES.find((x) => x.at === at);
        if (!m || (s.litter.spins || 0) < at || s.litter.claimed?.[at]) return s;
        const res = { ...s.res, coin: (s.res.coin || 0) + (m.reward.gold || 0) };
        const keys = { ...s.keys };
        for (const [k, n] of Object.entries(m.reward.keys || {})) keys[k] = (keys[k] || 0) + n;
        let next = {
          ...s,
          res,
          keys,
          litter: { ...s.litter, claimed: { ...s.litter.claimed, [at]: true } },
        };
        if (m.reward.shards) {
          // Banked against whoever the player is already closest to.
          const target = Object.keys(next.heroes)[0] || "biscuit";
          const g = grantShards(next, target, m.reward.shards);
          next = { ...next, heroes: g.heroes, pendingShards: g.pendingShards };
        }
        flash(`Claimed: ${m.label}`);
        return next;
      });
    },
    [flash]
  );

  /** Spend shards to take a hero up one ascension step. */
  const ascendHero = useCallback(
    (id) => {
      setSave((s) => {
        const st = s.heroes?.[id];
        if (!st) return s;
        const cost = nextStepCost(st.steps || 0);
        if (cost == null) return s;
        if ((st.shards || 0) < cost) {
          flash(`Needs ${cost} shards.`);
          return s;
        }
        const steps = (st.steps || 0) + 1;
        const before = starsFor(st.steps || 0);
        const after = starsFor(steps);
        if (after > before) flash(`${HERO_BY_ID[id].name} is now ${after}★`);
        return {
          ...s,
          heroes: { ...s.heroes, [id]: { ...st, steps, shards: st.shards - cost } },
        };
      });
    },
    [flash]
  );

  /** Level a hero with Gold. */
  const levelHero = useCallback(
    (id) => {
      setSave((s) => {
        const st = s.heroes?.[id];
        if (!st) return s;
        const cap = levelCapFor(starsFor(st.steps || 0));
        if (st.level >= cap) {
          flash("Ascend to raise the level cap.");
          return s;
        }
        const cost = levelCost(st.level);
        if ((s.res.coin || 0) < cost) {
          flash(`Needs ${cost} Gold.`);
          return s;
        }
        return {
          ...s,
          res: { ...s.res, coin: s.res.coin - cost },
          heroes: { ...s.heroes, [id]: { ...st, level: st.level + 1 } },
        };
      });
    },
    [flash]
  );

  /** Send a hero on patrol, or stand them down. */
  const togglePatrol = useCallback(
    (id) => {
      setSave((s) => {
        if (!s.heroes?.[id]) return s;
        const patrol = [...(s.patrol || [])];
        const i = patrol.indexOf(id);
        if (i >= 0) {
          patrol.splice(i, 1);
          return { ...s, patrol };
        }
        if (patrol.length >= patrolSlots(levelOf(s, "warroom"))) {
          flash("The War Room cannot command any more.");
          return s;
        }
        patrol.push(id);
        return { ...s, patrol };
      });
    },
    [flash]
  );

  /** Fit or upgrade one piece of furniture inside a building.
   *
   *  This is the small, frequent decision the town was missing. It costs Gold —
   *  the currency the cottages mint and Palis drops — plus one material, takes
   *  seconds rather than hours, and pays a bonus you can point at. */
  const upgradeItem = useCallback(
    (buildingId, itemId) => {
      setSave((s) => {
        if (!s) return s;
        const bLevel = levelOf(s, buildingId);
        const it = unlockedItems(buildingId, bLevel).find((x) => x.id === itemId);
        if (!it) return s;
        const at = itemLevel(s, buildingId, itemId);
        const cap = itemCap(it, bLevel);
        if (at >= cap) {
          flash(
            at >= it.max
              ? `${it.name} is fully fitted.`
              : `Raise the building to fit a better ${it.name}.`
          );
          return s;
        }
        const cost = itemCost(it, at);
        if (!canAfford(cost, s.res)) {
          const short = Object.keys(shortfall(cost, s.res))
            .map((k) => RESOURCES[k].short)
            .join(", ");
          flash(`Short on ${short}.`);
          return s;
        }
        const res = { ...s.res };
        for (const [k, v] of Object.entries(cost)) res[k] -= v;
        const furniture = {
          ...s.furniture,
          [buildingId]: { ...(s.furniture?.[buildingId] || {}), [itemId]: at + 1 },
        };
        flash(`${it.name} → level ${at + 1}`);
        // Beds change the villager cap, so the crew has to be re-checked: the
        // cap can only go UP here, but clampCrew is cheap and being wrong about
        // this is how "5/2" happened last time.
        return clampCrew({ ...s, res, furniture });
      });
    },
    [flash]
  );

  /** Put a cat to work at a building. The player picks; nothing is automatic. */
  /** Put a cat to work. Every refusal SAYS why and names the fix — this button
   *  used to be disabled with the reason hidden in a `title`, which on touch is
   *  no reason at all, and the whole thing read as broken. */
  const assignCat = useCallback(
    (buildingId, catKey = null) => {
      setSave((s) => {
        if (!s) return s;
        const level = levelOf(s, buildingId);
        const here = Object.values(s.assign || {}).filter((b) => b === buildingId).length;
        if (here >= slotsAt(s, buildingId)) {
          const next = SEAT_LEVELS.find((l) => l > level);
          flash(
            next
              ? `Full. Another place opens at level ${next}.`
              : "Full — three is the most any building takes."
          );
          return s;
        }
        const cap = workersAllowed(levelOf(s, "hall"));
        if (assignedCount(s) >= cap) {
          flash(`The Cat Hall only allows ${cap} cats at work. Raise it for more.`);
          return s;
        }
        const key = catKey || idleCats(s)[0];
        if (!key) {
          // Not "no villagers left" — the cats exist, they are all working.
          flash("Every cat is already working. Raise a Cat Cottage for another.");
          return s;
        }
        return { ...s, assign: { ...s.assign, [key]: buildingId } };
      });
    },
    [flash]
  );

  const unassignCat = useCallback((catKey) => {
    setSave((s) => {
      if (!s) return s;
      const assign = { ...s.assign };
      delete assign[catKey];
      return { ...s, assign };
    });
  }, []);

  /** Buy a worker spot outright. The Nap House stays the main route; this is
   *  the impatient one, and it is priced accordingly. */
  const buyBuildingSlot = useCallback(
    (id) => {
      const bought = save?.buildingSlots?.[id] || 0;
      const usd = buildingSlotPriceUsd(bought);
      if (usd == null) {
        flash("This building is full.");
        return;
      }
      const b = BUILDINGS.find((x) => x.id === id);
      setBuying({
        kind: "buildingSlot",
        id,
        title: `Another place at the ${b?.name}`,
        blurb:
          "One more cat villager can work in this building, permanently. Places belong to the building that has them — every building is bought for separately.",
        usd,
      });
    },
    [save, flash]
  );

  /** Mocked: in the real build the grant happens only AFTER the payment is
   *  verified on-chain, never before. See docs/security.md §3. */
  const completePurchase = useCallback(() => {
    setSave((s) => {
      if (!s || !buying) return s;
      if (buying.kind === "builder") {
        flash("A new builder joined the town.");
        return { ...s, builders: Math.min(MAX_BUILDERS, s.builders + 1), buildersBought: true };
      }
      flash("A new place opened up.");
      return {
        ...s,
        buildingSlots: { ...s.buildingSlots, [buying.id]: (s.buildingSlots?.[buying.id] || 0) + 1 },
      };
    });
    setBuying(null);
  }, [buying, flash]);

  /** Catnip's own job: double a building's output for a while. Gives the
   *  rarest resource a purpose that is not "another upgrade line". */
  const boostBuilding = useCallback(
    (id) => {
      setSave((s) => {
        if (!s) return s;
        if ((s.boosts?.[id] || 0) > Date.now()) return s;
        const price = boostCost(levelOf(s, id));
        if ((s.res.catnip || 0) < price) {
          flash(`Needs ${price} Catnip.`);
          return s;
        }
        flash("Boosted for 15 minutes.");
        return {
          ...s,
          res: { ...s.res, catnip: s.res.catnip - price },
          boosts: { ...s.boosts, [id]: Date.now() + BOOST.seconds * 1000 },
        };
      });
    },
    [flash]
  );

  /** Put the strongest cats to work, best first, spreading them so no building
   *  is left empty. Saves the player a dozen taps and teaches the ordering:
   *  the cats it picks first are the ones worth pulling for. */
  const autoAssign = useCallback(() => {
    setSave((s) => {
      if (!s) return s;

      // ONLY BUILDINGS THAT EXIST. This used to round-robin across every entry
      // in PRODUCERS, built or not, and a cat sent to an empty plot produces
      // exactly nothing — the button said "5 cats put to work" and the rates
      // never moved. Seats are counted per building and a level-0 building has
      // none of them (see slotsIn).
      const open = Object.keys(PRODUCERS)
        .map((id) => ({ id, seats: slotsAt(s, id) }))
        .filter((b) => b.seats > 0);

      if (!open.length) {
        flash("Nothing is built yet for them to work in.");
        return s;
      }

      // Both caps bind: the cottages say how many cats there are, the Cat Hall
      // says how many of them may work, and the buildings say how many seats
      // there are to sit in. Kingshot has the same three.
      const seatTotal = open.reduce((a, b) => a + b.seats, 0);
      const slots = Math.min(
        seatTotal,
        totalSlots(s),
        workersAllowed(levelOf(s, "hall"))
      );

      const ranked = Object.entries(s.cats)
        .map(([key, c]) => ({ key, ...c, p: catPower(c.rarity, c.level) }))
        .sort((a, b) => b.p - a.p)
        .slice(0, slots);

      const assign = {};
      const per = {};
      // Round-robin so the buildings fill evenly and nothing is left empty —
      // an idle Kitchen starves the town however good the Lumber Yard is.
      ranked.forEach((c, i) => {
        for (let t = 0; t < open.length; t++) {
          const b = open[(i + t) % open.length];
          if ((per[b.id] || 0) < b.seats) {
            assign[c.key] = b.id;
            per[b.id] = (per[b.id] || 0) + 1;
            return;
          }
        }
      });

      const n = Object.keys(assign).length;
      // The leftovers are the interesting half of the message: a player with
      // twelve cats and four seats needs to know the seats are the wall.
      const idle = Object.keys(s.cats).length - n;
      flash(
        `${n} cat${n === 1 ? "" : "s"} put to work` +
          (idle > 0 ? ` · ${idle} still at home, no room` : ".")
      );
      return { ...s, assign };
    });
  }, [flash]);

  const moveBuilding = useCallback((id, x, y) => {
    setSave((s) => (s ? { ...s, positions: { ...s.positions, [id]: { x, y } } } : s));
    setMoving(null);
    flash("Moved.");
  }, [flash]);

  /** Take a quest reward. Claims are keyed by task id and never re-payable. */
  const claimReward = useCallback(
    (id, reward) => {
      setSave((s) => {
        if (!s || s.claimed?.[id]) return s;
        const { res } = addCapped(s.res, reward, levelOf(s, "storehouse"), levelOf(s, "hall"));
        // Golden Fish is never capped by the Storehouse
        if (reward.gold) res.gold = (s.res.gold || 0) + reward.gold;
        flash("Reward claimed.");
        return { ...s, res, claimed: { ...s.claimed, [id]: true } };
      });
    },
    [flash]
  );

  /** Buy another builder. The single highest-converting purchase in this
   *  genre — and the wall it opens (every builder busy) is one the player runs
   *  into constantly, which is exactly why it works. */
  const buyBuilder = useCallback(() => {
    if (save && save.builders >= MAX_BUILDERS) {
      flash("That is every builder there is.");
      return;
    }
    setBuying({
      kind: "builder",
      title: `Builder #${(save?.builders ?? 1) + 1}`,
      blurb:
        "Another pair of paws on the scaffolding — one more building under construction at all times, forever.",
      usd: builderPriceUsd(save?.builders ?? 1),
      rent: (save?.rentedUntil || 0) > Date.now() ? null : BUILDER_RENTAL,
      onRent: rentBuilder,
    });
  }, [save, flash]);

  /** Buy exactly what is missing for one upgrade. Sells at the moment of
   *  frustration, which is the only moment it is worth anything. */
  const buyMissing = useCallback(
    (id) => {
      setSave((s) => {
        if (!s) return s;
        const level = levelOf(s, id);
        const missing = shortfall(upgradeCostFor(id, level), s.res);
        if (!Object.keys(missing).length) return s;
        const price = topUpCost(missing);
        if ((s.res.gold || 0) < price) {
          flash(`Need ${price} Golden Fish.`);
          return s;
        }
        const res = { ...s.res, gold: s.res.gold - price };
        for (const [k, v] of Object.entries(missing)) res[k] = (res[k] || 0) + v;
        flash("Topped up.");
        return { ...s, res };
      });
    },
    [flash]
  );

  /** Buy this building's next four hours, now.
   *
   *  The paid door on the production wall. Tapping a full store used to be the
   *  thing being skipped; with production continuous, what the player is short
   *  of is TIME, so that is what is sold — four hours of one building, priced
   *  off what that building actually makes. Nothing here is unreachable by
   *  waiting four hours. */
  const rushProduction = useCallback(
    (id) => {
      setSave((s) => {
        if (!s || !PRODUCERS[id]) return s;
        const rate = rateAt(s, id);
        if (rate <= 0) {
          flash("Put a cat in it first.");
          return s;
        }
        const amount = producedOver(rate, RUSH_HOURS * 3600);
        const price = Math.max(1, Math.ceil(RUSH_HOURS * 3));
        if ((s.res.gold || 0) < price) {
          flash(`Need ${price} Golden Fish.`);
          return s;
        }
        const { res, wasted } = addCapped(
          { ...s.res, gold: s.res.gold - price },
          { [PRODUCERS[id].res]: amount },
          levelOf(s, "storehouse"),
          levelOf(s, "hall")
        );
        flash(
          wasted > 0
            ? `Storehouse is full — ${Math.floor(wasted)} lost.`
            : `+${Math.floor(amount)} ${RESOURCES[PRODUCERS[id].res].short}`
        );
        return { ...s, res };
      });
    },
    [flash]
  );

  /** Rent a second builder for two days with Golden Fish. Deliberately worse
   *  value than the permanent pack — it exists so everyone tastes two builders,
   *  because tasting is what makes the permanent one sell. */
  const rentBuilder = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      if ((s.rentedUntil || 0) > Date.now()) {
        flash("The rented builder is still with you.");
        return s;
      }
      if ((s.res.gold || 0) < BUILDER_RENTAL.gold) {
        flash(`Need ${BUILDER_RENTAL.gold} Golden Fish.`);
        return s;
      }
      flash(`A builder joins you for ${BUILDER_RENTAL.days} days.`);
      return {
        ...s,
        res: { ...s.res, gold: s.res.gold - BUILDER_RENTAL.gold },
        rentedUntil: Date.now() + BUILDER_RENTAL.days * 86400000,
      };
    });
  }, [flash]);

  const hardReset = useCallback(() => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    setSave(freshSave());
    setPullResult(null);
    flash("Save wiped.");
  }, [flash]);

  // ---- the neighbours -------------------------------------------------------
  // Prototype only: real clowder members replace this entirely (townAlliance.js).
  //
  // Placed here for two reasons that pull in opposite directions and leave
  // exactly one legal window: it must come AFTER `helpOnce`, because a
  // dependency array naming a `const` throws on the temporal dead zone, and
  // BEFORE the early return below, because a hook that only sometimes runs is
  // the crash this file has already had twice.
  useEffect(() => {
    const id = setInterval(() => {
      const s = saveRef.current;
      if (!s) return;
      const asked = Object.entries(s.jobs || {}).find(
        ([, j]) => j.asked && (j.helps || 0) < MAX_HELPS_PER_JOB && j.finishesAt > Date.now()
      );
      if (asked) {
        helpOnce(asked[0], randomNeighbour());
        return;
      }
      // Nothing building? Then a neighbour helps with the mess instead —
      // Hay Day's friend-taps-your-wilting-tree, which is what makes a problem
      // feel social rather than like a chore list.
      const mess = (s.problems || [])[0];
      if (mess) helpProblem(mess.id, randomNeighbour());
    }, NEIGHBOUR_EVERY_MS);
    return () => clearInterval(id);
  }, [helpOnce, helpProblem]);

  if (!save) {
    return (
      <main className="ttown">
        <div className="tt-boot">
          <span className="tt-boot-paw">
            <IconPaw size={40} />
          </span>
          Waking the cats…
        </div>
      </main>
    );
  }

  const canPull = T(save) >= game.pullCostTreats;

  /** The single most useful thing to do right now, and a way to do it.
   *
   *  This is the hook Century Games builds every one of their games around: a
   *  button that always knows what is next, so the player never opens the game
   *  and wonders what to touch. It removes all decision friction, which is
   *  exactly why it works. */
  function nextAction() {
    // With production continuous there is nothing to collect, so the button's
    // job changes: it now names the best DECISION available, which is a better
    // use of the middle of the screen than a chore was.
    if (save.overflow) {
      return {
        label: "Storehouse is overflowing — raise it",
        run: () => { setTab("town"); setPicked("storehouse"); },
      };
    }
    if (claims > 0) {
      return { label: `${claims} reward${claims === 1 ? "" : "s"} in the Town Book`, run: () => setBook(true) };
    }
    if (isStarving(save)) {
      return { label: "Out of Fish — grow the Kitchen", run: () => { setTab("town"); setPicked("kitchen"); } };
    }
    // Only offer this when there is somewhere to actually put them. Suggesting
    // "put 18 idle cats to work" when every seat is full and the Cat Hall is at
    // its cap is worse than saying nothing — the player taps it, nothing
    // happens, and the button stops meaning anything.
    const idle = idleCats(save).length;
    const room =
      Math.min(atWorkCap, totalSlots(save)) - assignedCount(save) > 0 &&
      BUILDINGS.some(
        (b) =>
          PRODUCERS[b.id] &&
          levelOf(save, b.id) >= 1 &&
          headsPerBuilding(save)[b.id] || 0 < slotsAt(save, b.id)
      );
    if (idle > 0 && room) {
      const n = Math.min(idle, Math.min(atWorkCap, totalSlots(save)) - assignedCount(save));
      return { label: `Put ${n} cat${n === 1 ? "" : "s"} to work`, run: autoAssign };
    }
    // Furniture before buildings: it is cheaper, it is faster, and it is what
    // the next building level is waiting on anyway.
    for (const b of BUILDINGS) {
      const lvl = levelOf(save, b.id);
      if (lvl < 1) continue;
      const g = furnitureGate(save, b.id, lvl);
      if (g.length && canAfford(itemCost(g[0].it, g[0].at), save.res)) {
        return {
          label: `Fit the ${g[0].it.name} in the ${b.name}`,
          run: () => { setTab("town"); setPicked(b.id); },
        };
      }
    }
    // An empty plot the player can afford beats any upgrade: a NEW building is
    // the most exciting thing this game can offer, and it is the payoff the
    // unlock ladder just promised them.
    const buildable = BUILDINGS.find(
      (b) => buildingStateTop[b.id]?.plot && buildingStateTop[b.id]?.canUpgrade
    );
    if (buildable) {
      return { label: `Build the ${buildable.name}`, run: () => { setTab("town"); setPicked(buildable.id); } };
    }
    const upgradable = BUILDINGS.find((b) => buildingStateTop[b.id]?.canUpgrade);
    if (upgradable) {
      return { label: `Upgrade the ${upgradable.name}`, run: () => { setTab("town"); setPicked(upgradable.id); } };
    }
    const running = Object.keys(save.jobs || {})[0];
    if (running) {
      const b = BUILDINGS.find((x) => x.id === running);
      return { label: `${b.name} is building…`, run: () => { setTab("town"); setPicked(running); } };
    }
    if (canPull) {
      return { label: "Adopt a new cat", run: () => setTab("litter") };
    }
    // Nothing useful to say, so say nothing and give the map its middle back.
    return null;
  }

  // Resources appear as their producer comes online — six counters on day one
  // is how you lose a player on day one.
  // How much is sitting in every producer right now — drives the collect badges
  // and the one-tap collect button.
  // Plain computation, not a hook: this sits after the early return above, and
  // a conditional hook is a crash. It is five buildings — cheap every render.
  const catsHere = catsPerBuilding(save);
  const starving = isStarving(save);
  const claims = claimableCount(save);
  const rented = (save.rentedUntil || 0) > Date.now() ? 1 : 0;
  const buildersTotal = save.builders + rented;
  const buildersFree = buildersTotal - Object.keys(save.jobs || {}).length;
  const villagerCount = Object.keys(save.cats || {}).length;
  const idleCount = idleCats(save).length;
  const homesFree = Math.max(0, totalSlots(save) - villagerCount);
  const levelsTop = levelsOf(save);
  const atWorkCap = workersAllowed(levelsTop.hall);
  const coming = nextUnlock(levelsTop.hall);

  // A resource appears when its building does, not before. Six counters on day
  // one is how you lose a player on day one, and a counter for a resource the
  // game has not introduced is worse than no counter at all.
  const RESOURCE_SOURCE = { fish: "kitchen", stone: "quarry", catnip: "garden", treats: "treats" };
  const unlockedResources = RESOURCE_ORDER.filter((r) => {
    if (r === "wood" || r === "coin") return true;
    if ((save.res[r] || 0) > 0) return true;
    const from = RESOURCE_SOURCE[r];
    return from ? isUnlocked(from, levelsTop.hall) : false;
  });

  const problemCount = (save.problems || []).length;
  // The cottage worth growing next: the cheapest route to one more villager is
  // always the lowest-level cottage that is actually unlocked.
  const growCottage =
    COTTAGE_IDS.filter((id) => isUnlocked(id, levelsTop.hall)).sort(
      (a, b) => (levelsTop[a] ?? 0) - (levelsTop[b] ?? 0)
    )[0] || "cottage1";
  const buildingStateTop = Object.fromEntries(
    BUILDINGS.map((b) => {
      const level = levelOf(save, b.id);
      return [
        b.id,
        {
          canUpgrade:
            !save.jobs?.[b.id] &&
            isUnlocked(b.id, levelsTop.hall) &&
            level < maxLevelFor(b.id, levelsTop.hall) &&
            unmetRequirements(b.id, level, levelsTop).length === 0 &&
            furnitureGate(save, b.id, level).length === 0 &&
            canAfford(upgradeCostFor(b.id, level), save.res),
          plot: level === 0,
        },
      ];
    })
  );
  const rates = townRates(save);
  const pityLeft = game.pity.hardAt - save.pity;

  return (
    <main className={"ttown" + (save.skin ? " tt-gold" : "")}>
      <div className="tt-sky" aria-hidden="true" />

      {/* ---------- header ---------- */}
      <header className="tt-bar">
        <a className="tt-back" href="/">
          <IconBack size={18} />
          <span>{config.token.ticker}</span>
        </a>
        <div className="tt-title">
          <span className="tt-title-main">Tubby Town</span>
          <span className="tt-proto">proto</span>
        </div>
        <div className="tt-tier" title="Your $TUBBY hold tier">
          <IconPaw size={16} />
          <span>{tier.name}</span>
          <b>×{tier.mult}</b>
        </div>
      </header>

      {/* ---------- resource bar ----------
          Always on screen, every resource with its cap. This is the single
          most-glanced-at element in a city builder. */}
      <ResourceBar
        res={save.res}
        rates={rates}
        storehouseLevel={levelOf(save, "storehouse")}
        hallLevel={levelsTop.hall}
        unlocked={unlockedResources}
        onBuy={() => setTab("shop")}
      />


      <div className="tt-stage">
        {/* The two capacity bottlenecks, kept ON THE MAP and LABELLED. A wall
            the player cannot see never converts — and an unlabelled "2/2" is
            worse than nothing, because it reads as whichever thing they were
            last thinking about. */}
        {tab === "town" && <div className="tt-caps">
          <div className={"tt-cap" + (buildersFree === 0 ? " busy" : "")}>
            <span className="tt-cap-i">
              <IconHammer size={18} />
            </span>
            <span className="tt-cap-n">
              <small>Builders</small>
              <b className="mono">
                {buildersFree} free <em>of {buildersTotal}</em>
              </b>
            </span>
            {save.builders < MAX_BUILDERS && (
              <button type="button" onClick={buyBuilder} title={`Hire builder #${save.builders + 1}`}>
                + ${builderPriceUsd(save.builders)?.toFixed(2)}
              </button>
            )}
          </div>

          <button
            className={"tt-cap" + (idleCount === 0 ? " busy" : "")}
            type="button"
            onClick={() => setPicked(growCottage)}
            title={
              idleCount > 0
                ? `${idleCount} at home earning Gold. Raise a building to open another work place.`
                : "Everyone is working. Raise a Cat Cottage for another villager."
            }
          >
            <span className="tt-cap-i">
              <IconPaw size={18} />
            </span>
            <span className="tt-cap-n">
              <small>Cat villagers</small>
              {/* "18 idle of 24" reads as a fault the player must fix, and it
                  is not one: seats inside buildings come from those buildings'
                  levels, so a healthy town always has more residents than jobs.
                  They are at home earning Gold. Say that instead. */}
              <b className="mono">
                {assignedCount(save)} of {atWorkCap} working <em>· {idleCount} at home</em>
              </b>
            </span>
          </button>

          {/* Palis. Not a button that starts a fight any more — a count of what
              he left behind, which is a thing the player wants gone rather than
              a thing they have to remember to press. */}
          {problemCount > 0 && (
            <div className="tt-cap mess">
              <span className="tt-cap-i">
                <IconPaw size={18} />
              </span>
              <span className="tt-cap-n">
                <small>Palis was here</small>
                <b className="mono">
                  {problemCount} to tidy <em>· pays Gold</em>
                </b>
              </span>
            </div>
          )}

          {/* The next thing the Cat Hall opens. Kingshot never lets a player
              wonder what the next level is FOR, and this one line is the whole
              reason they tap the town centre again. */}
          {coming && (
            <button className="tt-cap next" type="button" onClick={() => setPicked("hall")}>
              <span className="tt-cap-i">
                <IconBox size={18} />
              </span>
              <span className="tt-cap-n">
                <small>Next unlock</small>
                <b className="mono">
                  {coming.name} <em>at Hall {coming.unlockAt}</em>
                </b>
              </span>
            </button>
          )}
        </div>}

        <button
          className={"tt-book-btn" + (claims > 0 ? " ready" : "")}
          type="button"
          onClick={() => setBook(true)}
        >
          <IconBox size={19} />
          Town Book
          {claims > 0 && <span className="mono">{claims}</span>}
        </button>
        {tab === "town" && (
          <TownTab
            save={save}
            collection={collection}
            onLevel={levelUp}
            picked={picked}
            onPick={setPicked}
            onUpgrade={startUpgrade}
            onRush={rushUpgrade}

            onAssign={assignCat}
            onUnassign={unassignCat}
            onBuySlot={buyBuildingSlot}
            onBoost={boostBuilding}
            onAutoAssign={autoAssign}
            onBuyBuilder={buyBuilder}
            onBuyMissing={buyMissing}
            onRushProduction={rushProduction}
            onUpgradeItem={upgradeItem}
            onAskHelp={askForHelp}
            onFixProblem={fixProblem}
            onOpenStudy={() => setStudyOpen(true)}
            onOpenTraining={(id) => setTrainOpen(id)}
            moving={moving}
            onStartMove={(id) => {
              setMoving(id);
              setPicked(null);
            }}
            onMoved={moveBuilding}
            clock={clock}
          />
        )}
        {tab !== "town" && (
          <div className="tt-panel-over">
            {tab === "litter" && (
              <AdoptionTab
                save={save}
                canPull={canPull}
                pityLeft={pityLeft}
                onPull={doPull}
                onAssign={assignCat}
                onUnassign={unassignCat}
                onAutoAssign={autoAssign}
              />
            )}
            {tab === "album" && <AlbumTab save={save} />}
            {tab === "board" && (
              <BoardTab save={save} onHold={(h) => setSave((s) => ({ ...s, hold: h }))} />
            )}
            {tab === "heroes" && (
              <HeroesTab
                save={save}
                pool={catPool.cats}
                litterLive={eventLeft(save.litter?.startedAt) > 0}
                onAscend={ascendHero}
                onLevel={levelHero}
                onPatrol={togglePatrol}
                onOpenLitter={() => setLitterOpen(true)}
                onOpenAlley={() => {
                  collectAlley();
                  setAlleyOpen(true);
                }}
              />
            )}
            {tab === "shop" && <ShopTab onBuy={mockBuy} onReset={hardReset} />}
          </div>
        )}
      </div>

      {/* ---------- bottom nav, over the city ---------- */}
      {buying && (
        <BuyModal
          title={buying.title}
          blurb={buying.blurb}
          usd={buying.usd}
          onPay={completePurchase}
          onClose={() => setBuying(null)}
        />
      )}

      {book && (
        <QuestBook
          save={save}
          onClaimTask={claimReward}
          onClaimChapter={claimReward}
          onClose={() => setBook(false)}
        />
      )}

      {/* WHAT TO DO NEXT — a chip, not a banner.
          A gold bar across the middle of the town reads as an advert for the
          game's own UI, and when it has nothing useful to say it is just in the
          way. It only appears when there is a real next move. */}
      {(() => {
        const a = nextAction();
        if (!a) return null;
        return (
          <button className="tt-next" type="button" onClick={a.run}>
            {a.label}
          </button>
        );
      })()}

      <nav className="tt-tabs">
        {[
          ["town", "Town", <IconHouse key="i" size={19} />],
          ["litter", "Adoption", <IconBox key="i" size={19} />],
          ["heroes", "Heroes", <IconTrophy key="i" size={19} />],
          ["album", "Album", <IconPaw key="i" size={19} />],
          ["board", "Board", <IconTrophy key="i" size={19} />],
          ["shop", "Shop", <IconCart key="i" size={19} />],
        ].map(([id, label, icon]) => (
          <button
            key={id}
            className={"tt-tab" + (tab === id ? " on" : "")}
            onClick={() => setTab(id)}
            type="button"
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ---------- overlays ---------- */}
      {welcomeBack && (
        <Modal onClose={() => setWelcomeBack(null)} title="The town kept working">
          <div className="tt-wb">
            <IconTreat size={54} />
            <div className="tt-wb-n mono">{fmt(welcomeBack.gained)}</div>
            <p className="tt-p">
              already in your Storehouse after <b>{fmtDur(welcomeBack.away)}</b> away.
              Your buildings never stop.
            </p>
            {welcomeBack.overflow && (
              <p className="tt-p warn">
                The Storehouse filled up and the rest was lost. Raise it.
              </p>
            )}
            {welcomeBack.palis && (
              <div className="tt-palis-card">
                <b>{welcomeBack.palis}</b>
                {welcomeBack.stolen && (
                  <small>
                    He made off with {Math.floor(welcomeBack.stolen.amount)}{" "}
                    {RESOURCES[welcomeBack.stolen.res].short}.
                  </small>
                )}
                <small>
                  Nothing is broken and nothing is gone for good — tap the buildings
                  with a mark on them and you are paid for tidying up.
                </small>
              </div>
            )}
          </div>
          <button className="tt-btn" type="button" onClick={() => setWelcomeBack(null)}>
            Good
          </button>
        </Modal>
      )}

      {studyOpen && (
        <ResearchPanel
          save={save}
          studyLevel={levelOf(save, "study")}
          onStart={startResearch}
          onRush={rushResearch}
          onClose={() => setStudyOpen(false)}
        />
      )}

      {trainOpen && (
        <TrainingPanel
          buildingId={trainOpen}
          level={levelOf(save, trainOpen)}
          save={save}
          researchSpeed={researchBonuses(save).research}
          onTrain={(b, t, n) => startTraining(b, t, n, false)}
          onPromote={(b, t, n) => startTraining(b, t, n, true)}
          onClose={() => setTrainOpen(null)}
        />
      )}

      {alleyOpen && (
        <Conquest
          save={save}
          pool={catPool.cats}
          onFight={fightStage}
          onSetSlot={setLineupSlot}
          onClose={() => setAlleyOpen(false)}
        />
      )}

      {litterOpen && (
        <LuckyLitter
          litter={save.litter}
          keys={save.keys}
          goldFish={save.res.gold}
          freeSpins={freeSpinsReady(save.litter?.lastFreeAt, save.litter?.startedAt)}
          onSpin={doSpin}
          onClaim={claimMilestone}
          onClose={() => setLitterOpen(false)}
        />
      )}

      {spinResult && (
        <Modal onClose={() => setSpinResult(null)} title="Lucky Litter" wide>
          <SpinReel
            wheelId={spinResult.wheelId}
            result={spinResult}
            pool={catPool.cats}
            onDone={() => setSpinResult(null)}
          />
        </Modal>
      )}

      {pullResult && (
        <Modal onClose={() => setPullResult(null)} title={`${pullResult.length}× pull`} wide>
          <div className="tt-pulls">
            {pullResult.map((r, i) => (
              <figure
                key={i}
                className={"tt-pull r-" + r.rarity}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="tt-pull-rays" aria-hidden="true" />
                <span className="tt-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={villagerArt(r.id)} alt="" loading="eager" />
                </span>
                <figcaption>
                  <b>{r.name || villagerName(r.id)}</b>
                  {RARITIES[r.rarity].name}
                  {r.dupe && <span className="tt-dupe">+1 shard</span>}
                </figcaption>
              </figure>
            ))}
          </div>
          <button className="tt-btn" type="button" onClick={() => setPullResult(null)}>
            Nice
          </button>
        </Modal>
      )}

      {toast && <div className="tt-toast">{toast}</div>}
    </main>
  );
}

function Res({ icon, value, label, accent }) {
  return (
    <div className={"tt-res" + (accent ? " accent" : "")}>
      <span className="tt-res-i">{icon}</span>
      <span className="tt-res-t">
        <b className="mono">{value}</b>
        <small>{label}</small>
      </span>
    </div>
  );
}

// ---- town-wide production --------------------------------------------------
function townRate(s) {
  const mult = holdTier(s.hold).mult;
  let total = 0;
  // Reads the REAL crew. It used to sum `s.slotted`, an array left over from
  // before villagers were assigned per building — so this number stopped
  // moving the day assignment changed and nobody noticed.
  for (const k of Object.keys(s.assign || {})) {
    const c = s.cats[k];
    if (c) total += catRate(c.rarity, c.level);
  }
  return total * mult;
}

// ============================================================================
//  TABS
// ============================================================================

function TownTab({
  save,
  collection,
  onLevel,
  picked,
  onPick,
  onUpgrade,
  onRush,

  onAssign,
  onUnassign,
  onBuySlot,
  onBoost,
  onAutoAssign,
  onBuyBuilder,
  onBuyMissing,
  onRushProduction,
  onUpgradeItem,
  onAskHelp,
  onFixProblem,
  onOpenStudy,
  onOpenTraining,
  moving,
  onStartMove,
  onMoved,
  clock,
}) {
  // What the canvas paints on top of each building: its level, and the
  // progress of any build occupying a builder.
  const buildingState = useMemo(() => {
    const now = Date.now();
    const catsPer = catsPerBuilding(save);
    const heads = headsPerBuilding(save);
    const levels = levelsOf(save);
    const out = {};
    for (const b of BUILDINGS) {
      const job = save.jobs?.[b.id];
      const level = levelOf(save, b.id);
      const cats = catsPer[b.id] || 0;
      const rate = rateAt(save, b.id, now, catsPer);
      const gate = furnitureGate(save, b.id, level);
      const unlocked = isUnlocked(b.id, levels.hall);
      out[b.id] = {
        level,
        rate,
        gate,
        problem: (save.problems || []).find((p) => p.building === b.id) || null,
        cats: heads[b.id] || 0,
        power: cats,
        // The three states the scene paints differently: a locked silhouette,
        // an empty plot waiting for a builder, and a real building.
        locked: !unlocked,
        plot: unlocked && level === 0,
        needsHall: b.unlockAt,
        res: PRODUCERS[b.id]?.res || null,
        blocked: unmetRequirements(b.id, level, levels),
        canUpgrade:
          !job &&
          unlocked &&
          level < maxLevelFor(b.id, levels.hall) &&
          unmetRequirements(b.id, level, levels).length === 0 &&
          gate.length === 0 &&
          canAfford(upgradeCostFor(b.id, level), save.res),
        job: job
          ? {
              ...job,
              pct: Math.min(
                1,
                (now - job.startedAt) / Math.max(1, job.finishesAt - job.startedAt)
              ),
            }
          : null,
      };
    }
    return out;
  }, [save, clock]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rough head-count per building, so the panel can say who is there.
  const workingAt = useMemo(() => catsPerBuilding(save), [save]);

  // Derived here as well as in the parent: the sheet lives inside this
  // component, so it needs its own reference rather than one from an outer
  // scope it cannot see.
  const buildersFree = save.builders - Object.keys(save.jobs || {}).length;

  /** The villagers actually working at a building. */
  const crewAt = (id) =>
    Object.entries(save.assign || {})
      .filter(([, b]) => b === id)
      .map(([k]) => ({ key: k, ...save.cats[k] }))
      .filter((c) => c.rarity);

  const idleCount = idleCats(save).length;

  // WHO WALKS THE TOWN.
  //
  // Cats on shift walk to their building and work there — the scene shows the
  // player's own staffing decision back to them. But a town with three workers
  // and eleven beds used to sit almost completely still, which reads as broken
  // rather than as "you have not hired anyone yet".
  //
  // So the cats at home come out too. They have no building, they earn nothing,
  // and they stroll: the "N at home" number in the villager chip becomes a
  // thing you can actually see loafing around the plaza. It is the same trick
  // Hay Day plays with its idle animals — the population IS the ambience.
  //
  // Capped, because the sprite count is the frame rate. Ten loafers is plenty
  // to make a town look inhabited; the eleventh is only heat.
  const MAX_LOAFERS = 10;
  const townCats = useMemo(() => {
    const assign = save.assign || {};
    // The town draws villagers from their id (lib/villagerLook.js), so that is
    // all it needs. Older saves predate ids, hence the fallback — a villager
    // without one used to be dropped from the scene entirely.
    const at = (k, c, building) => ({
      key: k,
      id: c.id ?? villagerIdFromKey(k),
      rarity: c.rarity,
      building,
    });

    const working = Object.entries(assign)
      .map(([k, building]) => [k, save.cats[k], building])
      .filter(([, c]) => c)
      .map(([k, c, building]) => at(k, c, building));

    // Rarest first, so the ones worth looking at are the ones on screen.
    const order = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 };
    const home = Object.entries(save.cats || {})
      .filter(([k]) => !assign[k])
      .sort((a, b) => (order[a[1].rarity] ?? 9) - (order[b[1].rarity] ?? 9))
      .slice(0, MAX_LOAFERS)
      .map(([k, c]) => at(k, c, null));

    return [...working, ...home];
  }, [save.assign, save.cats]);

  return (
    <>
      <SectionHead
        title="Your town"
        hint="Cats on shift walk between the buildings and work. Only they earn — rarer cats earn far more."
      />

      {/* ---- the living town ----
          A real scene: buildings the cats walk between, each labelled with what
          it does. Rendered on canvas because DOM does not survive this many
          moving things. Tapping a building opens its panel — the buildings are
          static sprites and interactive at the same time, which is exactly how
          the genre works. */}
      <TownCanvas
        cats={townCats}
        buildingState={buildingState}
        selected={picked}
        napBeds={Math.min(4, 1 + bonusesAt(save, "cottage1", levelOf(save, "cottage1")).beds)}
        positions={save.positions}
        moving={moving}
        onSelect={onPick}
        onMoved={onMoved}
      />

      {picked && (
        <BuildingSheet
          id={picked}
          level={levelOf(save, picked)}
          job={buildingState[picked]?.job}
          rate={buildingState[picked]?.rate || 0}
          gate={buildingState[picked]?.gate || []}
          problem={buildingState[picked]?.problem || null}
          onFixProblem={() => onFixProblem(buildingState[picked].problem.id)}
          onOpenStudy={onOpenStudy}
          onOpenTraining={() => onOpenTraining(picked)}
          items={itemsFor(picked)}
          itemLevels={save.furniture?.[picked] || {}}
          bonuses={bonusesAt(save, picked, levelOf(save, picked))}
          onUpgradeItem={(itemId) => onUpgradeItem(picked, itemId)}
          onAskHelp={() => onAskHelp(picked)}
          res={save.res}
          hallLevel={levelOf(save, "hall")}
          storehouseLevel={levelOf(save, "storehouse")}
          blocked={buildingState[picked]?.blocked || []}
          locked={!!buildingState[picked]?.locked}
          plot={!!buildingState[picked]?.plot}
          starving={isStarving(save)}
          cats={buildingState[picked]?.cats || 0}
          power={buildingState[picked]?.power || 0}
          buildersFree={buildersFree}
          workingHere={workingAt[picked] || 0}
          crew={crewAt(picked)}
          idle={idleCats(save).map((k) => ({ key: k, ...save.cats[k] }))}
          slotsUsed={assignedCount(save)}
          slotsTotal={totalSlots(save)}
          villagersFree={idleCats(save).length}

          boostUntil={save.boosts?.[picked] || 0}
          onUpgrade={() => onUpgrade(picked)}
          onRush={() => onRush(picked)}
          onAssign={(k) => onAssign(picked, k)}
          onUnassign={onUnassign}
          onBuySlot={onBuySlot}
          onBoost={() => onBoost(picked)}
          onBuyBuilder={onBuyBuilder}
          onBuyMissing={() => onBuyMissing(picked)}
          onRushProduction={() => onRushProduction(picked)}
          rushHours={RUSH_HOURS}
          buildersTotal={save.builders}
          builderPrice={builderPriceUsd(save.builders)}
          slotPriceUsd={buildingSlotPriceUsd(save.buildingSlots?.[picked] || 0)}
          slotsHere={slotsAt(save, picked)}
          boughtHere={save.buildingSlots?.[picked] || 0}
          onMove={() => onStartMove(picked)}
          onGoTo={(bid) => onPick(bid)}
          onClose={() => onPick(null)}
        />
      )}

      {/* The roster used to be repeated here as a strip of cards. It could not
          stay: everything TownTab renders that is not the canvas floats OVER
          the map, so the strip sat on top of the town. The town already says
          who is working — the cats are standing in the buildings, and the chip
          counts them — and the Adoption Center owns the full roster now. */}

      {idleCount > 0 && (
        <button className="tt-auto" type="button" onClick={onAutoAssign}>
          <IconPaw size={17} />
          Auto-assign best cats
        </button>
      )}

    </>
  );
}

/** THE ADOPTION CENTER — your population, and where it comes from.
 *
 *  This screen used to be a bare gacha box with a drop table, and the villagers
 *  it produced lived on a different screen that could not assign them. So the
 *  player pulled cats and never saw what they were for.
 *
 *  Kingshot keeps the two halves together: you recruit survivors and you put
 *  them to work in the same breath, because "how many do I have" and "where are
 *  they" are one question. So the roster is here, under the box that fills it,
 *  and every card can be sent to a building without leaving the page.
 *
 *  A VILLAGER IS NOT A HERO, and this page says so in as many words. Same
 *  collection, two systems: a villager is a round chip with a job, a hero is a
 *  portrait card with stars and skills. */
function AdoptionTab({
  save,
  canPull,
  pityLeft,
  onPull,
  onAssign,
  onUnassign,
  onAutoAssign,
}) {
  const [filter, setFilter] = useState("all");
  const pityPct = Math.min(100, (save.pity / game.pity.hardAt) * 100);

  const levels = levelsOf(save);
  const atWorkCap = workersAllowed(levels.hall);

  // Buildings that exist and have room. A level-0 building has no seats at all
  // — see slotsIn — so an unbuilt plot never appears here.
  const openBuildings = Object.keys(PRODUCERS)
    .map((id) => {
      const seats = slotsAt(save, id);
      const taken = Object.values(save.assign || {}).filter((b) => b === id).length;
      return { id, name: BUILDING_BY_ID[id]?.name || id, seats, taken };
    })
    .filter((b) => b.seats > 0);

  const seatTotal = openBuildings.reduce((a, b) => a + b.seats, 0);
  const working = Object.keys(save.assign || {}).length;
  const roster = Object.entries(save.cats || {})
    .map(([key, c]) => ({ key, ...c, at: save.assign?.[key] || null }))
    .sort(
      (a, b) =>
        RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
        b.level - a.level ||
        (a.name || "").localeCompare(b.name || "")
    );
  const shown = roster.filter((c) =>
    filter === "all" ? true : filter === "working" ? c.at : !c.at
  );

  /** The first building with a free seat, so one tap works. The dropdown is
   *  for when the player cares which; the button is for when they do not. */
  const firstFree = openBuildings.find((b) => b.taken < b.seats);
  const roomLeft = Math.min(seatTotal, atWorkCap) - working;

  return (
    <>
      <SectionHead
        title="Adoption Center"
        hint="Villagers are your population: they live in the cottages and stand inside buildings doing the work. They are not heroes — heroes have stars and skills and never take a shift."
      />

      {/* WHERE THE POPULATION STANDS, in one line of real numbers. Every
          complaint about this system has been the counters disagreeing with
          each other, so they are all computed from the same three facts. */}
      <div className="tt-popbar">
        <span>
          <b>{roster.length}</b> villagers
        </span>
        <span>
          <b>
            {working} of {Math.min(seatTotal, atWorkCap)}
          </b>{" "}
          working
        </span>
        <span>
          <b>{roster.length - working}</b> at home
        </span>
        {roomLeft > 0 && firstFree ? (
          <button type="button" className="tt-mini" onClick={onAutoAssign}>
            Fill {roomLeft} {roomLeft === 1 ? "seat" : "seats"}
          </button>
        ) : (
          <em className="quiet">
            {seatTotal === 0
              ? "No building is finished yet"
              : working >= atWorkCap
                ? `Cat Hall ${levels.hall} allows ${atWorkCap} at work`
                : "Every seat is taken"}
          </em>
        )}
      </div>

      {/* ---- the box that makes villagers ---- */}
      <div className="tt-pullbox">
        <div className="tt-pullbox-art" aria-hidden="true">
          <span className="tt-pullglow" />
          <IconBox size={68} />
        </div>
        <div className="tt-pullbox-b">
          <div className="tt-pullrow">
            <button className="tt-btn" type="button" disabled={!canPull} onClick={() => onPull(1)}>
              Adopt ×1 · {fmt(game.pullCostTreats)}
            </button>
            <button
              className="tt-btn alt"
              type="button"
              disabled={T(save) < game.pullCostTreats * 10}
              onClick={() => onPull(10)}
            >
              Adopt ×10 · {fmt(game.pullCostTreats * 10)}
            </button>
          </div>
          <div className="tt-pitybar" title="Progress to the guaranteed Legendary+">
            <i style={{ width: `${pityPct}%` }} />
          </div>
          <div className="tt-pity mono">
            Guaranteed Legendary+ in {pityLeft} {pityLeft === 1 ? "adoption" : "adoptions"} ·{" "}
            {save.pulls} adopted all time
          </div>
        </div>
      </div>

      {/* ---- the roster ---- */}
      <h3 className="tt-h3">
        Your villagers
        <span className="tt-seg">
          {[
            ["all", `All ${roster.length}`],
            ["working", `Working ${working}`],
            ["home", `At home ${roster.length - working}`],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={filter === k ? "on" : ""}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </span>
      </h3>

      {shown.length === 0 ? (
        <p className="tt-empty">
          {filter === "working"
            ? "Nobody is on shift. Send someone to a building and it starts producing."
            : filter === "home"
              ? "Everybody is working. Build another Cat Cottage to house more."
              : "No villagers yet."}
        </p>
      ) : (
        <div className="tt-vgrid">
          {shown.map((c) => {
            const rate = catPower(c.rarity, c.level);
            return (
              <article key={c.key} className={"tt-vcard r-" + c.rarity + (c.at ? " on" : "")}>
                <VillagerFace id={c.id} rarity={c.rarity} size={54} name={c.name} />
                <div className="tt-vcard-b">
                  <b>{c.name || villagerName(c.id)}</b>
                  <small style={{ color: RARITIES[c.rarity].color }}>
                    {RARITIES[c.rarity].name}
                    {c.level > 1 && ` · lv ${c.level}`} · ×{rate.toFixed(1)}
                  </small>
                  {c.at ? (
                    <button
                      type="button"
                      className="tt-mini on"
                      onClick={() => onUnassign(c.key)}
                      title="Send this villager home"
                    >
                      {BUILDING_BY_ID[c.at]?.name || c.at}
                    </button>
                  ) : openBuildings.length ? (
                    <select
                      className="tt-vsel"
                      value=""
                      onChange={(e) => e.target.value && onAssign(e.target.value, c.key)}
                    >
                      <option value="">Send to work…</option>
                      {openBuildings.map((b) => (
                        <option key={b.id} value={b.id} disabled={b.taken >= b.seats}>
                          {b.name} {b.taken}/{b.seats}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <em className="quiet">Nowhere to work yet</em>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <h3 className="tt-h3">Adoption odds</h3>
      <div className="tt-odds">
        {[...RARITY_ORDER].reverse().map((k) => (
          <div key={k} className={"tt-odd r-" + k}>
            <span className="tt-odd-name">{RARITIES[k].name}</span>
            <span className="tt-odd-track">
              <i style={{ width: `${Math.max(2.5, RARITIES[k].odds)}%` }} />
            </span>
            <span className="tt-odd-pct mono">{RARITIES[k].odds.toFixed(2)}%</span>
            <span className="tt-odd-mult mono">×{RARITIES[k].mult}</span>
          </div>
        ))}
      </div>

      <ul className="tt-rules">
        <li>
          <b>Rarity is production</b> — a Legendary villager produces {RARITIES.legendary.mult}×
          what a Common does in the same seat. Where they work is your choice; how much they are
          worth is theirs.
        </li>
        <li>
          <b>Hard guarantee</b> — {game.pity.hardAt} adoptions without a Legendary or better and
          the next one is.
        </li>
        <li>
          <b>10× floor</b> — every ten-adopt contains at least one Epic or better.
        </li>
        <li>
          <b>Nothing is wasted</b> — a cat you already have comes back as a shard and levels the
          one at home.
        </li>
      </ul>
    </>
  );
}

/** THE ALBUM — the Tubby Cats collection itself.
 *
 *  It used to be a grid of twenty-five placeholder images with "send to work"
 *  buttons wired to an array nothing read any more: the wrong cats, the wrong
 *  buttons, and a screen that lied about what it did.
 *
 *  Now it is the one place the COLLECTION is the subject. Every cat you meet —
 *  adopted as a villager, recruited as a hero — turns its frame over and stays
 *  there. That is the long tail of twenty thousand CC0 cats given a purpose,
 *  and it is the only screen here with nothing to click, on purpose: a
 *  collection you can spend is not a collection. */
function AlbumTab({ save }) {
  const [filter, setFilter] = useState("all");

  // Every cat this player has ever met, and HOW they met it. The badge is what
  // stops the album re-creating the villager/hero confusion: the same artwork
  // can appear as both, and the frame says which one you are looking at.
  const met = new Map();
  for (const c of Object.values(save.cats || {})) {
    if (c.id == null) continue;
    met.set(c.id, { id: c.id, rarity: c.rarity, as: "villager", name: c.name || villagerName(c.id) });
  }
  for (const id of Object.keys(save.heroes || {})) {
    const h = HERO_BY_ID[id];
    if (!h) continue;
    const art = heroArt(h.id, catPool.cats);
    const tokenId = art ? Number(String(art).replace(/\D+/g, "")) : null;
    if (tokenId == null || Number.isNaN(tokenId)) continue;
    met.set(tokenId, { id: tokenId, rarity: h.rarity, as: "hero", name: h.name });
  }

  const all = [...met.values()].sort(
    (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.id - b.id
  );
  const shown = all.filter((c) => (filter === "all" ? true : c.as === filter));
  const heroes = all.filter((c) => c.as === "hero").length;

  // The collection is 20,000 cats. The honest denominator is the whole thing,
  // not the sample that happens to be downloaded — a progress bar measured
  // against a moving target is not a progress bar.
  const TOTAL = 20000;
  const pct = (all.length / TOTAL) * 100;

  return (
    <>
      <SectionHead
        title="Tubby Cats"
        hint="Every cat you meet keeps its frame here. Adopt one and it moves in as a villager; recruit one and it joins the roster as a hero. The collection is 20,000 cats and it is CC0 — these are really yours to look at."
      />

      <div className="tt-albumbar">
        <div className="tt-albumbar-t">
          <b>
            {all.length} of {TOTAL.toLocaleString("en-US")}
          </b>
          <span className="mono">{pct < 0.01 ? "<0.01" : pct.toFixed(2)}%</span>
        </div>
        <div className="tt-sheet-bar">
          <i style={{ width: `${Math.max(0.6, Math.min(100, pct))}%` }} />
        </div>
        <small className="quiet">
          {all.length - heroes} met as villagers · {heroes} as heroes
        </small>
      </div>

      <div className="tt-seg tt-seg-wide">
        {[
          ["all", `All ${all.length}`],
          ["villager", `Villagers ${all.length - heroes}`],
          ["hero", `Heroes ${heroes}`],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={filter === k ? "on" : ""}
            onClick={() => setFilter(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="tt-empty">
          Nothing here yet. Produce Treats, adopt a cat at the Adoption Center, and its frame turns
          over.
        </p>
      ) : (
        <div className="tt-album">
          {shown.map((c) => (
            <figure key={c.id} className={"tt-acard r-" + c.rarity + " as-" + c.as}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={villagerArt(c.id)} alt={c.name} loading="lazy" />
              <figcaption>
                <b>{c.name}</b>
                <small>
                  #{c.id} · {c.as}
                </small>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}

function BoardTab({ save, onHold }) {
  const [wallets, setWallets] = useState(1);
  const capital = 25_000; // USD of $TUBBY a farmer might hold
  const dailyPool = 12; // SOL, illustrative

  // Proportional payout: your share of the pool tracks your share of the
  // network's time-weighted hold. Splitting capital across wallets splits the
  // share too — the total is identical, minus N× the gas. This is the whole
  // anti-sybil design in one line of math.
  const networkHold = 2_000_000; // USD held across all eligible players
  const proportional = (capital / networkHold) * dailyPool;
  const flatBonus = wallets * 0.01; // what a naive "daily login reward" would pay

  const rows = [
    { name: "gigachad.sol", score: 184_200, hold: "$4,800" },
    { name: "meowmeow", score: 151_900, hold: "$3,120" },
    { name: "tubbymaxi", score: 133_400, hold: "$2,270" },
    {
      name: "you",
      score: Math.floor(T(save) / 10) + save.pulls * 25,
      hold: "$" + fmt(save.hold),
      me: true,
    },
    { name: "catlady99", score: 71_500, hold: "$610" },
  ].sort((a, b) => b.score - a.score);

  // 1st takes both plushies, 2nd the black, 3rd the pink.
  const PLUSHIE = ["pink + black", "black", "pink"];

  return (
    <>
      <SectionHead
        title="Season board"
        hint={`Rank is town depth × time-weighted hold × collection. Holding $${game.board.minHoldToRank} of $TUBBY makes you eligible — stated up front, never applied after you have earned. 1st takes the pool share and both plushies, 2nd the black, 3rd the pink.`}
      />

      <div className="tt-board">
        {rows.map((r, i) => (
          <div key={r.name} className={"tt-brow" + (r.me ? " me" : "") + (i < 3 ? " top" : "")}>
            <span className={"tt-rank rank-" + (i + 1)}>{i + 1}</span>
            <span className="tt-bname">{r.name}</span>
            {i < game.board.plushieTopN && <span className="tt-plush">{PLUSHIE[i]}</span>}
            <span className="tt-bscore mono">{fmt(r.score)}</span>
            <span className="tt-bhold mono">{r.hold}</span>
          </div>
        ))}
      </div>

      <h3 className="tt-h3">Why farming this is pointless</h3>
      <p className="tt-sub">
        Split {fmt(capital)} $TUBBY across as many wallets as you like — the payout does not move,
        because it is proportional to capital, not to how many addresses you own.
      </p>
      <div className="tt-sim">
        <label className="tt-simlabel">
          <span>
            Wallets a farmer splits into: <b className="mono">{wallets}</b>
          </span>
          <input
            type="range"
            min="1"
            max="500"
            value={wallets}
            onChange={(e) => setWallets(Number(e.target.value))}
          />
        </label>
        <div className="tt-simout">
          <div className="ok">
            <small>Our rule · proportional</small>
            <b className="mono">{proportional.toFixed(3)} SOL/day</b>
            <em>unchanged at any wallet count</em>
          </div>
          <div className="bad">
            <small>Flat per-wallet bonus</small>
            <b className="mono">{flatBonus.toFixed(2)} SOL/day</b>
            <em>scales with wallets — never ship this</em>
          </div>
        </div>
      </div>

      <h3 className="tt-h3">Simulate your hold</h3>
      <p className="tt-sub">
        Tiers are the <b>USD value</b> of $TUBBY held, not a token count — so the door stays
        open at any price. No demotion within a season. Dev control; later this reads the real
        balance over RPC and time-weights it.
      </p>
      <div className="tt-holds">
        {game.holdTiers.map((t) => (
          <button
            key={t.min}
            type="button"
            className={"tt-mini" + (holdTier(save.hold).min === t.min ? " on" : "")}
            onClick={() => onHold(t.min)}
          >
            {t.name} · ${t.min} · ×{t.mult}
          </button>
        ))}
      </div>
    </>
  );
}

function ShopTab({ onBuy, onReset }) {
  return (
    <>
      <SectionHead
        title="Shop"
        hint="Prototype: nothing is charged. Buttons grant the item so pricing can be play-tested."
      />
      <div className="tt-shop">
        {game.shop.map((item) => (
          <article key={item.id} className={"tt-item" + (item.best ? " best" : "")}>
            {item.best && <span className="tt-badge">Best value</span>}
            <h4>{item.name}</h4>
            <p>{item.desc}</p>
            <button className={"tt-btn" + (item.best ? "" : " alt")} type="button" onClick={() => onBuy(item)}>
              {item.sol} SOL
            </button>
          </article>
        ))}
      </div>
      <div className="tt-danger">
        <button className="tt-mini" type="button" onClick={onReset}>
          Wipe save
        </button>
      </div>
    </>
  );
}

function SectionHead({ title, hint }) {
  return (
    <div className="tt-shead">
      <h2>{title}</h2>
      {hint && <p>{hint}</p>}
    </div>
  );
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div className="tt-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={"tt-modal-in" + (wide ? " wide" : "")} onClick={(e) => e.stopPropagation()}>
        <button className="tt-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
