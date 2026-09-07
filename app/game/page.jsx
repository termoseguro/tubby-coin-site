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
  POOLS,
  RARITIES,
  RARITY_ORDER,
  catRate,
  game,
  holdTier,
  rollCat,
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
import RaidPanel from "./town/RaidPanel";
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
  HURT_MULTIPLIER,
  healCost,
  healSeconds,
  nextRaidIn,
  oddsLabel,
  RAID_EVERY_HOURS,
  palisPower,
  raidGoldMultiplier,
  raidsReady,
  resolveRaid,
  townPower,
  winChance,
} from "../../lib/townRaids";
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
} from "../../lib/townFurniture";
import { BUILDINGS, BUILDING_INFO, COTTAGE_IDS, nextUnlock, unlockedAt } from "../../lib/townConfig";
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

const SAVE_KEY = "tubbytown.v1";
/** How many hours of one building's output a Golden Fish purchase buys. */
const RUSH_HOURS = 4;
const TICK_MS = 250;

const catKey = (c) => `${c.rarity}|${c.art}`;

function freshSave() {
  const starter = { rarity: "common", art: rollCat("common").art, level: 1, shards: 0 };
  return {
    v: 3,
    // Kingshot-shaped economy: five gathered resources plus the premium one,
    // each produced by its own building and capped by the Storehouse.
    res: { fish: 400, wood: 400, stone: 60, catnip: 0, treats: 200, coin: 250, gold: 30 },
    // when production was last paid out into the stockpile
    lastProd: Date.now(),
    // furniture levels: { kitchen: { stove: 3, ... } }
    furniture: {},
    // ---- Palis raids ----
    // The deepest stage cleared. Never goes down, and it permanently raises the
    // town's idle Gold — that is what makes the ladder an economic decision
    // rather than a combat one (lib/townRaids.js).
    raidStage: 0,
    lastRaidAt: Date.now(),
    // cats that came back hurt: they work at half speed until the Clinic sees
    // them. This is the only thing a lost raid costs, and it costs TIME.
    hurt: {},
    cats: { [catKey(starter)]: starter },
    slotted: [catKey(starter)],
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
    // A cat that came back from Palis hurt pulls half its weight until the
    // Cat Clinic sees it. That is the whole cost of losing a raid, and it is
    // the whole reason the Clinic exists.
    const hurt = s.hurt?.[key] ? HURT_MULTIPLIER : 1;
    out[id] = (out[id] || 0) + catPower(cat.rarity, cat.level) * hurt;
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
  return (
    effectiveRate(id, level, {
      power: here,
      starving: isStarving(s),
      furniture: bonusesAt(s, id, level).produce,
    }) * boosted
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
  const gold = goldPerHour(s, levels);
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
  const gold = producedOver(goldPerHour(s, levels), secs);
  if (gold > 0) gains.coin = (gains.coin || 0) + gold;

  let res = { ...s.res };
  for (const [k, v] of Object.entries(spend)) res[k] = Math.max(0, (res[k] || 0) - v);
  const capped = addCapped(res, gains, levelOf(s, "storehouse"));
  return { ...s, res: capped.res, lastProd: now, overflow: capped.wasted > 0 };
}

/** Cats eat. This is why Fish is not just another number, and why the Kitchen
 *  is not optional — run out and the whole town drops to a quarter speed. */
function applyUpkeep(s, now = Date.now()) {
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

function migrate(s) {
  if (!s.res) {
    s.res = { fish: 400, wood: 400, stone: 60, catnip: 0, treats: Math.floor(s.treats || 0), gold: 30 };
  } else if (s.treats != null) {
    s.res = { ...s.res, treats: Math.max(s.res.treats || 0, Math.floor(s.treats)) };
  }
  if (!s.furniture) s.furniture = {};
  if (s.raidStage == null) s.raidStage = 0;
  if (!s.lastRaidAt) s.lastRaidAt = Date.now();
  if (!s.hurt) s.hurt = {};
  if (s.tokens == null) s.tokens = 0;
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
  const [raidResult, setRaidResult] = useState(null);
  const [raidOpen, setRaidOpen] = useState(false);
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
    s = applyUpkeep(s);
    s = applyProduction(s);
    if (away > 120) {
      const gained = Object.entries(s.res).reduce(
        (a, [k, v]) => a + Math.max(0, v - (before[k] || 0)),
        0
      );
      if (gained > 0) setWelcomeBack({ gained, away, overflow: s.overflow });
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
        let next = applyProduction(s, now);
        // complete any build whose time is up
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
      setSave((s) => (s ? clampCrew(applyUpkeep(s)) : s));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

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
  const addCats = useCallback((s, rolls) => {
    const cats = { ...s.cats };
    const results = [];
    for (const roll of rolls) {
      const k = catKey(roll);
      if (cats[k]) {
        cats[k] = { ...cats[k], shards: cats[k].shards + 1 };
        results.push({ ...roll, dupe: true });
      } else {
        cats[k] = { rarity: roll.rarity, art: roll.art, level: 1, shards: 0 };
        results.push({ ...roll, dupe: false });
      }
    }
    // auto-slot anything new while there is room
    const slotted = [...s.slotted];
    for (const r of results) {
      const k = catKey(r);
      if (!r.dupe && slotted.length < s.slots && !slotted.includes(k)) slotted.push(k);
    }
    return { next: { ...s, cats, slotted }, results };
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
          const roll = rollCat(forceMin);
          if (RARITY_ORDER.indexOf(roll.rarity) >= RARITY_ORDER.indexOf("legendary")) pity = 0;
          rolls.push(roll);
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

  const toggleSlot = useCallback(
    (key) => {
      setSave((s) => {
        if (!s) return s;
        if (s.slotted.includes(key)) {
          return { ...s, slotted: s.slotted.filter((k) => k !== key) };
        }
        if (s.slotted.length >= s.slots) {
          flash("Town is full — free a slot or buy another.");
          return s;
        }
        return { ...s, slotted: [...s.slotted, key] };
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
        const secs = buildSecondsFor(id, level);
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

  /** Send the town against Palis.
   *
   *  Everything about this is deliberately reversible except the ladder. A win
   *  banks the stage forever and raises idle Gold forever; a loss costs some
   *  cats a shift at half speed and still pays a small purse, because a run
   *  that pays nothing is a run the player resents. Nothing is ever destroyed
   *  and the stage never falls — a raid that can undo a week of building is a
   *  raid people quit over. */
  const doRaid = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      const levels = levelsOf(s);
      if (raidsReady(s.lastRaidAt) < 1) {
        flash("Palis is not back yet.");
        return s;
      }
      if (assignedCount(s) < 1) {
        flash("Put a cat on shift first — nobody is defending.");
        return s;
      }
      const stage = (s.raidStage || 0) + 1;
      const out = resolveRaid(s, levels, stage);
      const { res } = addCapped(s.res, out.loot, levelOf(s, "storehouse"));
      const hurt = { ...s.hurt };
      for (const k of out.hurt) hurt[k] = Date.now();
      setRaidResult({ ...out, stage });
      return {
        ...s,
        res,
        hurt,
        raidStage: out.won ? stage : s.raidStage || 0,
        // The bank is consumed one run at a time: push the clock forward by a
        // single cooldown rather than resetting it, or banking three runs would
        // be worth exactly one.
        lastRaidAt: Math.min(Date.now(), (s.lastRaidAt || Date.now()) + RAID_EVERY_HOURS * 3_600_000),
      };
    });
  }, [flash]);

  /** Patch the hurt cats up at the Cat Clinic. Costs Gold, which is what Gold
   *  is for — and what the raid just paid you in. */
  const healCats = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      const hurtKeys = Object.keys(s.hurt || {});
      if (!hurtKeys.length) return s;
      if (levelOf(s, "clinic") < 1) {
        flash("Build the Cat Clinic first.");
        return s;
      }
      const cost = healCost(levelOf(s, "clinic"), hurtKeys.length);
      if (!canAfford(cost, s.res)) {
        flash(`Needs ${cost.coin} Gold.`);
        return s;
      }
      flash(`${hurtKeys.length} cat${hurtKeys.length === 1 ? "" : "s"} patched up.`);
      return { ...s, res: { ...s.res, coin: s.res.coin - cost.coin }, hurt: {} };
    });
  }, [flash]);

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
  const assignCat = useCallback(
    (buildingId, catKey = null) => {
      setSave((s) => {
        if (!s) return s;
        const here = Object.values(s.assign || {}).filter((b) => b === buildingId).length;
        if (here >= slotsAt(s, buildingId)) {
          flash("This building has no free place — buy one for it.");
          return s;
        }
        if (assignedCount(s) >= totalSlots(s)) {
          flash("No villagers left — grow the Cat Hall.");
          return s;
        }
        const key = catKey || idleCats(s)[0];
        if (!key) {
          flash("Every cat already has a job.");
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
      const slots = totalSlots(s);
      const ranked = Object.entries(s.cats)
        .map(([key, c]) => ({ key, ...c, p: catPower(c.rarity, c.level) }))
        .sort((a, b) => b.p - a.p)
        .slice(0, slots);
      const producers = Object.keys(PRODUCERS);
      const assign = {};
      const per = {};
      // round-robin the best cats across the buildings, so the strongest cat
      // lands somewhere different each pass rather than stacking in one shed
      ranked.forEach((c, i) => {
        for (let t = 0; t < producers.length; t++) {
          const id = producers[(i + t) % producers.length];
          if ((per[id] || 0) < slotsAt(s, id)) {
            assign[c.key] = id;
            per[id] = (per[id] || 0) + 1;
            return;
          }
        }
      });
      const n = Object.keys(assign).length;
      flash(`${n} cat${n === 1 ? "" : "s"} put to work.`);
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
        const { res } = addCapped(s.res, reward, levelOf(s, "storehouse"));
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
          levelOf(s, "storehouse")
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
      if (asked) helpOnce(asked[0], randomNeighbour());
    }, NEIGHBOUR_EVERY_MS);
    return () => clearInterval(id);
  }, [helpOnce]);

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
    const idle = idleCats(save).length;
    if (idle > 0 && assignedCount(save) < totalSlots(save)) {
      return { label: `Put ${idle} idle cat${idle === 1 ? "" : "s"} to work`, run: autoAssign };
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
    return { label: "Nothing waiting — the town is working", run: () => setTab("town") };
  }

  // Resources appear as their producer comes online — six counters on day one
  // is how you lose a player on day one.
  const unlockedResources = RESOURCE_ORDER.filter(
    (r) =>
      r === "fish" || r === "wood" || r === "treats" || r === "coin" ||
      (save.res[r] || 0) > 0 || levelOf(save, "hall") >= 2
  );

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
  const workersFree = totalSlots(save) - assignedCount(save);
  const levelsTop = levelsOf(save);
  const coming = nextUnlock(levelsTop.hall);
  const raidsWaiting = levelsTop.watchtower >= 1 ? raidsReady(save.lastRaidAt) : 0;
  const hurtCount = Object.keys(save.hurt || {}).length;
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
        unlocked={unlockedResources}
        onBuy={() => setTab("shop")}
      />


      <div className="tt-stage">
        {/* The two capacity bottlenecks, kept ON THE MAP and LABELLED. A wall
            the player cannot see never converts — and an unlabelled "2/2" is
            worse than nothing, because it reads as whichever thing they were
            last thinking about. */}
        <div className="tt-caps">
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
            className={"tt-cap" + (workersFree === 0 ? " busy" : "")}
            type="button"
            onClick={() => setPicked(growCottage)}
            title="Cat Cottages are where villagers live — raise one for another cat"
          >
            <span className="tt-cap-i">
              <IconPaw size={18} />
            </span>
            <span className="tt-cap-n">
              <small>Cat villagers</small>
              <b className="mono">
                {workersFree} free <em>of {totalSlots(save)}</em>
              </b>
            </span>
          </button>

          {/* Palis. Kept on the map beside the other two caps because a raid
              the player has to go looking for is a raid they never run — and
              the raid ladder is what raises the town's Gold forever. */}
          {levelsTop.watchtower >= 1 && (
            <button
              className={"tt-cap" + (raidsWaiting > 0 ? " ready" : "")}
              type="button"
              onClick={() => setRaidOpen(true)}
            >
              <span className="tt-cap-i">
                <IconPaw size={18} />
              </span>
              <span className="tt-cap-n">
                <small>Palis</small>
                <b className="mono">
                  {raidsWaiting > 0 ? `${raidsWaiting} raid${raidsWaiting === 1 ? "" : "s"} ready` : "quiet"}
                  <em> stage {(save.raidStage || 0) + 1}</em>
                </b>
              </span>
            </button>
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
        </div>

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
            onToggle={toggleSlot}
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
              <LitterTab save={save} canPull={canPull} pityLeft={pityLeft} onPull={doPull} />
            )}
            {tab === "album" && (
              <AlbumTab collection={collection} save={save} onToggle={toggleSlot} onLevel={levelUp} />
            )}
            {tab === "board" && (
              <BoardTab save={save} onHold={(h) => setSave((s) => ({ ...s, hold: h }))} />
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

      {(() => {
        const a = nextAction();
        return (
          <button className="tt-next" type="button" onClick={a.run}>
            <IconTreat size={18} />
            {a.label}
          </button>
        );
      })()}

      <nav className="tt-tabs">
        {[
          ["town", "Town", <IconHouse key="i" size={19} />],
          ["litter", "Adoption", <IconBox key="i" size={19} />],
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
          </div>
          <button className="tt-btn" type="button" onClick={() => setWelcomeBack(null)}>
            Good
          </button>
        </Modal>
      )}

      {raidOpen && (
        <RaidPanel
          save={save}
          levels={levelsTop}
          hurtCount={hurtCount}
          clinicLevel={levelsTop.clinic || 0}
          healPrice={healCost(levelsTop.clinic || 0, hurtCount).coin}
          onRaid={doRaid}
          onHeal={healCats}
          onClose={() => setRaidOpen(false)}
        />
      )}

      {raidResult && (
        <Modal
          onClose={() => setRaidResult(null)}
          title={raidResult.won ? `Stage ${raidResult.stage} cleared` : "Palis got through"}
        >
          <div className="tt-wb">
            <div className={"tt-raid-verdict" + (raidResult.won ? " win" : " loss")}>
              {raidResult.won ? "The town held" : "Driven back"}
            </div>
            <p className="tt-p">
              {raidResult.won ? (
                <>
                  Your Gold is now <b>×{raidGoldMultiplier(raidResult.stage).toFixed(2)}</b> — and
                  it stays that way.
                </>
              ) : (
                <>
                  Stage {raidResult.stage} needs <b>{Math.round(raidResult.palis)}</b> power and the
                  town brought <b>{Math.round(raidResult.town)}</b>. Nothing was lost but time.
                </>
              )}
            </p>
            <ul className="tt-raid-gains">
              {Object.entries(raidResult.loot).map(([k, v]) => (
                <li key={k}>
                  <b className="mono">+{Math.floor(v)}</b> {RESOURCES[k]?.name || k}
                </li>
              ))}
            </ul>
            {raidResult.hurt.length > 0 && (
              <p className="tt-p warn">
                {raidResult.hurt.length} cat{raidResult.hurt.length === 1 ? " came" : "s came"} back
                hurt — half speed until the Clinic sees them.
              </p>
            )}
          </div>
          <button className="tt-btn" type="button" onClick={() => setRaidResult(null)}>
            Good
          </button>
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
                  <img src={r.art} alt="" loading="eager" />
                </span>
                <figcaption>
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
  for (const k of s.slotted) {
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
  onToggle,
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

  /** The cats actually working at a building, with their art. */
  const crewAt = (id) =>
    Object.entries(save.assign || {})
      .filter(([, b]) => b === id)
      .map(([k]) => ({ key: k, ...save.cats[k] }))
      .filter((c) => c.art);

  // Only cats on shift walk the town — the scene shows who is actually working.
  const townCats = useMemo(
    () =>
      Object.entries(save.assign || {})
        .map(([k, building]) => [save.cats[k], building])
        .filter(([c]) => c)
        .map(([c, building]) => ({
          key: `${c.rarity}|${c.art}`,
          art: c.art,
          rarity: c.rarity,
          building,
        })),
    [save.assign, save.cats]
  );

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
          villagersFree={totalSlots(save) - assignedCount(save)}

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

      {/* ---- the slot strip ----
          Who is on shift, and the empty plots waiting to be filled. */}
      <div className="tt-scene compact">
        <div className="tt-slots">
          {Array.from({ length: save.slots }).map((_, i) => {
            const key = save.slotted[i];
            const cat = key ? save.cats[key] : null;
            if (!cat) {
              return (
                <div key={i} className="tt-slot empty" style={{ "--i": i }}>
                  <span className="tt-plot">
                    <IconPlus size={24} />
                  </span>
                  <span className="tt-shadow" aria-hidden="true" />
                </div>
              );
            }
            const r = catRate(cat.rarity, cat.level);
            const cycle = cycleFor(r);
            return (
              <button
                key={i}
                type="button"
                className={"tt-slot r-" + cat.rarity}
                onClick={() => onToggle(key)}
                title="Click to take out of town"
                style={{ "--cycle": `${cycle}s`, "--i": i }}
              >
                <span className="tt-coin c1" aria-hidden="true">
                  <IconCoin size={16} />
                </span>
                <span className="tt-coin c2" aria-hidden="true">
                  <IconCoin size={12} />
                </span>
                <span className="tt-char">
                  <span className="tt-slot-art">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.art} alt="" loading="lazy" />
                  </span>
                  <span className="tt-lvl">{cat.level}</span>
                  <span className="tt-sparkle s1" aria-hidden="true" />
                  <span className="tt-sparkle s2" aria-hidden="true" />
                </span>
                <span className="tt-shadow" aria-hidden="true" />
                <span className="tt-work" aria-hidden="true">
                  <i />
                </span>
                <span className="tt-slot-rate mono">{fmtRate(r)}/s</span>
              </button>
            );
          })}
        </div>
      </div>

      <button className="tt-auto" type="button" onClick={onAutoAssign}>
        <IconPaw size={17} />
        Auto-assign best cats
      </button>



    </>
  );
}

/** The Album — every cat in the game, the ones you have and the ones you do
 *  not. The gap is the product: a player who can see exactly which three Epics
 *  are missing has a reason to pull that no stat boost provides. Pairs with the
 *  Adoption Center — you adopt a cat, it joins the family album. */
function AlbumTab({ collection, save, onToggle, onLevel }) {
  const owned = new Set(collection.map((c) => `${c.rarity}|${c.art}`));
  const total = RARITY_ORDER.reduce((a, r) => a + POOLS[r].length, 0);
  const pct = Math.round((owned.size / total) * 100);

  return (
    <>
      <SectionHead
        title={`Family Album · ${owned.size}/${total}`}
        hint={`${pct}% of the tubby cats have moved in. Empty frames are the ones still waiting at the Adoption Center.`}
      />

      {[...RARITY_ORDER].reverse().map((rarity) => {
        const pool = POOLS[rarity];
        const have = pool.filter((art) => owned.has(`${rarity}|${art}`)).length;
        return (
          <section key={rarity} className="tt-album-sec">
            <h3 className="tt-album-h" style={{ color: RARITIES[rarity].color }}>
              {RARITIES[rarity].name}
              <span>
                {have}/{pool.length}
              </span>
            </h3>
            <div className="tt-album">
              {pool.map((art) => {
                const key = `${rarity}|${art}`;
                const cat = save.cats[key];
                if (!cat) {
                  return (
                    <div key={art} className={"tt-frame-empty r-" + rarity} title="Not adopted yet">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={art} alt="" loading="lazy" />
                      <span>?</span>
                    </div>
                  );
                }
                const inTown = save.slotted.includes(key);
                const needShards = shardsToLevel(cat.rarity, cat.level);
                const needTreats = game.levelUpTreats(cat.level, RARITIES[cat.rarity].mult);
                const ready = cat.shards >= needShards && T(save) >= needTreats;
                return (
                  <article key={art} className={"tt-card r-" + rarity + (inTown ? " in" : "")}>
                    <span className="tt-frame">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={art} alt="" loading="lazy" />
                      <span className="tt-lvl">{cat.level}</span>
                    </span>
                    <div className="tt-card-b">
                      <div className="tt-shardbar" title={`${cat.shards} / ${needShards} shards`}>
                        <i style={{ width: `${Math.min(100, (cat.shards / needShards) * 100)}%` }} />
                        <span className="mono">
                          {cat.shards}/{needShards}
                        </span>
                      </div>
                      <div className="tt-card-actions">
                        <button
                          type="button"
                          className={"tt-mini" + (inTown ? " on" : "")}
                          onClick={() => onToggle(key)}
                        >
                          {inTown ? "Working" : "Send to work"}
                        </button>
                        <button
                          type="button"
                          className="tt-mini gold"
                          onClick={() => onLevel(key)}
                          disabled={!ready}
                        >
                          Level
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

function LitterTab({ save, canPull, pityLeft, onPull }) {
  const pityPct = Math.min(100, (save.pity / game.pity.hardAt) * 100);
  return (
    <>
      <SectionHead
        title="Litter Box"
        hint="Every drop rate is published below and never changes silently."
      />

      <div className="tt-pullbox">
        <div className="tt-pullbox-art" aria-hidden="true">
          <span className="tt-pullglow" />
          <IconBox size={68} />
        </div>
        <div className="tt-pullbox-b">
          <div className="tt-pullrow">
            <button className="tt-btn" type="button" disabled={!canPull} onClick={() => onPull(1)}>
              Pull ×1 · {fmt(game.pullCostTreats)}
            </button>
            <button
              className="tt-btn alt"
              type="button"
              disabled={T(save) < game.pullCostTreats * 10}
              onClick={() => onPull(10)}
            >
              Pull ×10 · {fmt(game.pullCostTreats * 10)}
            </button>
          </div>
          <div className="tt-pitybar" title="Progress to the guaranteed Legendary+">
            <i style={{ width: `${pityPct}%` }} />
          </div>
          <div className="tt-pity mono">
            Guaranteed Legendary+ in {pityLeft} {pityLeft === 1 ? "pull" : "pulls"} · {save.pulls}{" "}
            pulled all time
          </div>
        </div>
      </div>

      <h3 className="tt-h3">Drop rates</h3>
      <div className="tt-odds">
        {[...RARITY_ORDER].reverse().map((k) => (
          <div key={k} className={"tt-odd r-" + k}>
            <span className="tt-odd-name">{RARITIES[k].name}</span>
            <span className="tt-odd-track">
              <i style={{ width: `${Math.max(2.5, RARITIES[k].odds)}%` }} />
            </span>
            <span className="tt-odd-pct mono">{RARITIES[k].odds.toFixed(2)}%</span>
            <span className="tt-odd-mult mono">×{RARITIES[k].mult}</span>
            <span className="tt-odd-pool mono">{POOL_SIZES[k]} art</span>
          </div>
        ))}
      </div>

      <ul className="tt-rules">
        <li>
          <b>Hard guarantee</b> — {game.pity.hardAt} pulls without a Legendary or better and the
          next pull is one.
        </li>
        <li>
          <b>10× floor</b> — every ten-pull contains at least one Epic or better.
        </li>
        <li>
          <b>No wasted pulls</b> — duplicates become shards that level the cat you already own.
        </li>
      </ul>
    </>
  );
}

const POOL_SIZES = Object.fromEntries(RARITY_ORDER.map((k) => [k, POOLS[k].length]));

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
