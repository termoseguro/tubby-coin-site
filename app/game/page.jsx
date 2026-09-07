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
import { claimableCount } from "../../lib/townQuests";
import { BUILDINGS, BUILDING_INFO } from "../../lib/townConfig";
import ResourceBar from "./town/ResourceBar";
import {
  PRODUCERS,
  RESOURCE_ORDER,
  addCapped,
  buildSecondsFor,
  canAfford,
  holdCap,
  maxLevelFor,
  pending,
  ratePerHour,
  rushCost,
  shortfall,
  storeCap,
  upgradeCostFor,
  BOOST,
  MAX_BUILDERS,
  builderPriceUsd,
  workerSlotPriceUsd,
  catPower,
  earlyCollectCost,
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
  workerCap,
} from "../../lib/townEconomy";
import "./game.css";

const SAVE_KEY = "tubbytown.v1";
const TICK_MS = 250;

const catKey = (c) => `${c.rarity}|${c.art}`;

function freshSave() {
  const starter = { rarity: "common", art: rollCat("common").art, level: 1, shards: 0 };
  return {
    v: 2,
    // Kingshot-shaped economy: five gathered resources plus the premium one,
    // each produced by its own building and capped by the Storehouse.
    res: { fish: 400, wood: 400, stone: 60, catnip: 0, treats: 200, gold: 30 },
    // when each producer was last emptied
    collected: {},
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
    // Timers are wall-clock here; the SERVER owns finishesAt once this is real
    // (docs/security.md §4b — a timer the client can influence is free money).
    buildings: {},
    jobs: {},
    builders: 2,
    // which building each cat works at — the player's decision, not a rota
    assign: {},
    // worker spots bought with Golden Fish, on top of what the Nap House gives
    extraSlots: 0,
    // active building boosts: { [buildingId]: endsAt }
    boosts: {},
    // where the player has moved buildings to
    positions: {},
    // quest rewards already taken
    claimed: {},
  };
}

const levelOf = (s, id) => s.buildings?.[id] || 1;
const T = (s) => s?.res?.treats || 0;
const isStarving = (s) => (s?.res?.fish || 0) <= 0;

/** Levels of every building, for the requirement checks. */
const levelsOf = (s) => {
  const out = {};
  for (const b of BUILDINGS) out[b.id] = levelOf(s, b.id);
  return out;
};

/** Total worker spots: what the Nap House gives, plus any bought. */
const totalSlots = (s) => workerCap(levelOf(s, "nap")) + (s.extraSlots || 0);
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

/** Cats with no job yet — the pool the assign picker draws from. */
function idleCats(s) {
  return Object.keys(s.cats).filter((k) => !s.assign?.[k]);
}

/** What one building has waiting, taking staffing and hunger into account. */
function pendingAt(s, id, now = Date.now(), cats = null) {
  if (!PRODUCERS[id]) return 0;
  const level = levelOf(s, id);
  const since = s.collected?.[id] ?? s.lastSeen ?? now;
  const hours = Math.max(0, (now - since) / 3_600_000);
  const here = (cats || catsPerBuilding(s))[id] || 0;
  const boosted = (s.boosts?.[id] || 0) > now ? BOOST.multiplier : 1;
  const rate = effectiveRate(id, level, { power: here, starving: isStarving(s) }) * boosted;
  return Math.min(holdCap(id, level) * boosted, Math.floor(rate * hours));
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
 *  bag so nobody loses a balance to a schema change. */
function migrate(s) {
  if (!s.res) {
    s.res = { fish: 400, wood: 400, stone: 60, catnip: 0, treats: Math.floor(s.treats || 0), gold: 30 };
  } else if (s.treats != null) {
    s.res = { ...s.res, treats: Math.max(s.res.treats || 0, Math.floor(s.treats)) };
  }
  if (!s.collected) s.collected = {};
  if (!s.assign) s.assign = {};
  if (s.extraSlots == null) s.extraSlots = 0;
  if (!s.boosts) s.boosts = {};
  if (!s.positions) s.positions = {};
  if (!s.claimed) s.claimed = {};
  delete s.treats;
  return s;
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

    // No global "bowl" any more: each producer accumulates on its own and stops
    // when its store is full, so a returning player finds bubbles waiting over
    // the buildings. That is the Kingshot shape, and it is a better hook — the
    // reward is attached to a place you tap, not to a modal you dismiss.
    const away = Math.max(0, (Date.now() - (s.lastSeen || Date.now())) / 1000);
    if (away > 120) {
      const waiting = Object.keys(PRODUCERS).reduce((a, id) => a + pendingAt(s, id), 0);
      if (waiting > 0) setWelcomeBack({ gained: waiting, away });
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
        let next = s; // production now accrues per building, collected by tapping
        // complete any build whose time is up
        const now = Date.now();
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
      setSave((s) => (s ? applyUpkeep(s) : s));
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
        if (level >= maxLevelFor(id, levelOf(s, "hall"))) {
          flash("The Cat Hall has to grow first.");
          return s;
        }
        const unmet = unmetRequirements(id, level, levelsOf(s));
        if (unmet.length) {
          const names = unmet.map((r) => `${BUILDINGS.find((b) => b.id === r.id).name} ${r.level}`);
          flash(`Needs ${names.join(" and ")} first.`);
          return s;
        }
        const busy = Object.keys(s.jobs || {}).length;
        if (busy >= s.builders) {
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

  /** Empty one building's little store into the Storehouse. This tap is the
   *  retention loop — it is why the player opens the game. */
  const collect = useCallback(
    (id) => {
      setSave((s) => {
        if (!s || !PRODUCERS[id]) return s;
        let amount = pendingAt(s, id);
        if (amount <= 0) return s;
        const resId = PRODUCERS[id].res;

        // A refiner spends what it needs; if the inputs are not there it simply
        // makes less, which is how the Kitchen and the Garden end up mattering
        // to the currency the gacha runs on.
        let spend = {};
        if (REFINERS[id]) {
          const r = refine(id, amount, s.res);
          if (r.amount <= 0) {
            flash("The Treat Factory has nothing to work with.");
            return s;
          }
          if (r.short) flash("Short on ingredients — made what it could.");
          amount = r.amount;
          spend = r.inputs;
        }

        const spent = { ...s.res };
        for (const [k, v] of Object.entries(spend)) spent[k] = Math.max(0, (spent[k] || 0) - v);
        const { res, wasted } = addCapped(spent, { [resId]: amount }, levelOf(s, "storehouse"));
        if (wasted > 0) flash(`Storehouse is full — ${Math.floor(wasted)} lost.`);
        return { ...s, res, collected: { ...s.collected, [id]: Date.now() } };
      });
    },
    [flash]
  );

  /** Collect everything that has something waiting, in one tap. */
  const collectAll = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      const gains = {};
      const collected = { ...s.collected };
      let any = false;
      for (const id of Object.keys(PRODUCERS)) {
        const amount = pendingAt(s, id);
        if (amount > 0) {
          const r = PRODUCERS[id].res;
          gains[r] = (gains[r] || 0) + amount;
          collected[id] = Date.now();
          any = true;
        }
      }
      if (!any) {
        flash("Nothing ready yet.");
        return s;
      }
      const { res, wasted } = addCapped(s.res, gains, levelOf(s, "storehouse"));
      if (wasted > 0) flash(`Storehouse is full — ${Math.floor(wasted)} lost.`);
      return { ...s, res, collected };
    });
  }, [flash]);

  /** Put a cat to work at a building. The player picks; nothing is automatic. */
  const assignCat = useCallback(
    (buildingId, catKey = null) => {
      setSave((s) => {
        if (!s) return s;
        const here = Object.values(s.assign || {}).filter((b) => b === buildingId).length;
        if (here >= MAX_PER_BUILDING) {
          flash(`${MAX_PER_BUILDING} cats is the most one building can hold.`);
          return s;
        }
        if (assignedCount(s) >= totalSlots(s)) {
          flash("No worker spots left — grow the Nap House or buy one.");
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
  const buyWorkerSlot = useCallback(() => {
    setBuying({
      kind: "workerSlot",
      title: "One more worker spot",
      blurb:
        "One more cat can be on shift across the whole town, permanently. The Nap House earns these too — two per level.",
      usd: workerSlotPriceUsd(save?.extraSlots || 0),
    });
  }, [save]);

  /** Mocked: in the real build the grant happens only AFTER the payment is
   *  verified on-chain, never before. See docs/security.md §3. */
  const completePurchase = useCallback(() => {
    setSave((s) => {
      if (!s || !buying) return s;
      if (buying.kind === "builder") {
        flash("A new builder joined the town.");
        return { ...s, builders: Math.min(MAX_BUILDERS, s.builders + 1) };
      }
      flash("Worker spot added.");
      return { ...s, extraSlots: (s.extraSlots || 0) + 1 };
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
        if ((s.res.catnip || 0) < BOOST.catnip) {
          flash(`Needs ${BOOST.catnip} Catnip.`);
          return s;
        }
        flash("Boosted for 15 minutes.");
        return {
          ...s,
          res: { ...s.res, catnip: s.res.catnip - BOOST.catnip },
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
          if ((per[id] || 0) < MAX_PER_BUILDING) {
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
      title: `Builder #${(save?.builders ?? 2) + 1}`,
      blurb:
        "Another pair of paws on the scaffolding — one more building can be under construction at all times, forever.",
      usd: builderPriceUsd(save?.builders ?? 2),
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

  /** Collect a producer's store early, before it has filled. */
  const collectEarly = useCallback(
    (id) => {
      setSave((s) => {
        if (!s || !PRODUCERS[id]) return s;
        const level = levelOf(s, id);
        const cap = holdCap(id, level);
        const now = pendingAt(s, id);
        const price = earlyCollectCost(now, cap);
        if ((s.res.gold || 0) < price) {
          flash(`Need ${price} Golden Fish.`);
          return s;
        }
        const resId = PRODUCERS[id].res;
        const { res } = addCapped(
          { ...s.res, gold: s.res.gold - price },
          { [resId]: cap },
          levelOf(s, "storehouse")
        );
        flash("Store emptied.");
        return { ...s, res, collected: { ...s.collected, [id]: Date.now() } };
      });
    },
    [flash]
  );

  const hardReset = useCallback(() => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    setSave(freshSave());
    setPullResult(null);
    flash("Save wiped.");
  }, [flash]);

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
    // Collecting comes first: it is what the player is here to do, it is the
    // common case, and the big gold button in the middle is where they look.
    if (readyTotal > 0) {
      return {
        label: `Collect everything · ${Math.floor(readyTotal)}`,
        run: () => {
          setTab("town");
          collectAll();
        },
      };
    }
    // Only when there is nothing to collect does the button offer the next
    // best thing — an empty centre of the screen is wasted.
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
    (r) => r === "fish" || r === "wood" || r === "treats" || (save.res[r] || 0) > 0 || levelOf(save, "hall") >= 2
  );

  // How much is sitting in every producer right now — drives the collect badges
  // and the one-tap collect button.
  // Plain computation, not a hook: this sits after the early return above, and
  // a conditional hook is a crash. It is five buildings — cheap every render.
  const catsHere = catsPerBuilding(save);
  const starving = isStarving(save);
  const claims = claimableCount(save);
  const buildersFree = save.builders - Object.keys(save.jobs || {}).length;
  const levelsTop = levelsOf(save);
  const buildingStateTop = Object.fromEntries(
    BUILDINGS.map((b) => {
      const level = levelOf(save, b.id);
      return [
        b.id,
        {
          canUpgrade:
            !save.jobs?.[b.id] &&
            level < maxLevelFor(b.id, levelsTop.hall) &&
            unmetRequirements(b.id, level, levelsTop).length === 0 &&
            canAfford(upgradeCostFor(b.id, level), save.res),
        },
      ];
    })
  );
  const readyTotal = Object.keys(PRODUCERS).reduce(
    (a, id) => a + pendingAt(save, id, Date.now(), catsHere),
    0
  );
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
        storehouseLevel={levelOf(save, "storehouse")}
        unlocked={unlockedResources}
        onBuy={() => setTab("shop")}
      />


      <div className="tt-stage">
        {/* The builder bottleneck, kept ON THE MAP. A wall the player cannot
            see is a wall that never converts — and this is the one they hit
            most, so it is the one that has to be visible. */}
        <div className={"tt-builders" + (buildersFree === 0 ? " busy" : "")}>
          <span className="tt-builders-i">
            <IconHammer size={20} />
          </span>
          <span className="tt-builders-n">
            <b className="mono">
              {buildersFree}/{save.builders}
            </b>
            <small>{buildersFree === 0 ? "all busy" : "free"}</small>
          </span>
          {save.builders < MAX_BUILDERS && (
            <button type="button" onClick={buyBuilder} title={`Hire builder #${save.builders + 1}`}>
              + ${builderPriceUsd(save.builders)?.toFixed(2)}
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
            onCollect={collect}
            onCollectAll={collectAll}
            onAssign={assignCat}
            onUnassign={unassignCat}
            onBuySlot={buyWorkerSlot}
            onBoost={boostBuilding}
            onAutoAssign={autoAssign}
            onBuyBuilder={buyBuilder}
            onBuyMissing={buyMissing}
            onCollectEarly={collectEarly}
            moving={moving}
            onStartMove={(id) => {
              setMoving(id);
              setPicked(null);
            }}
            onMoved={moveBuilding}
            readyTotal={readyTotal}
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
              waiting across your buildings after <b>{fmtDur(welcomeBack.away)}</b> away.
            </p>
          </div>
          <button
            className="tt-btn"
            type="button"
            onClick={() => {
              collectAll();
              setWelcomeBack(null);
            }}
          >
            Collect everything
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
  onCollect,
  onCollectAll,
  onAssign,
  onUnassign,
  onBuySlot,
  onBoost,
  onAutoAssign,
  onBuyBuilder,
  onBuyMissing,
  onCollectEarly,
  moving,
  onStartMove,
  onMoved,
  readyTotal,
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
      const ready = pendingAt(save, b.id, now, catsPer);
      out[b.id] = {
        level,
        ready,
        cats: heads[b.id] || 0,
        power: cats,
        readyFull: PRODUCERS[b.id] ? ready >= holdCap(b.id, level) : false,
        res: PRODUCERS[b.id]?.res || null,
        blocked: unmetRequirements(b.id, level, levels),
        canUpgrade:
          !job &&
          level < maxLevelFor(b.id, levelOf(save, "hall")) &&
          unmetRequirements(b.id, level, levels).length === 0 &&
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
        napBeds={levelOf(save, "nap")}
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
          ready={buildingState[picked]?.ready || 0}
          res={save.res}
          hallLevel={levelOf(save, "hall")}
          storehouseLevel={levelOf(save, "storehouse")}
          blocked={buildingState[picked]?.blocked || []}
          starving={isStarving(save)}
          cats={buildingState[picked]?.cats || 0}
          power={buildingState[picked]?.power || 0}
          buildersFree={buildersFree}
          workingHere={workingAt[picked] || 0}
          crew={crewAt(picked)}
          idle={idleCats(save).map((k) => ({ key: k, ...save.cats[k] }))}
          slotsUsed={assignedCount(save)}
          slotsTotal={totalSlots(save)}

          boostUntil={save.boosts?.[picked] || 0}
          onUpgrade={() => onUpgrade(picked)}
          onRush={() => onRush(picked)}
          onCollect={() => onCollect(picked)}
          onAssign={(k) => onAssign(picked, k)}
          onUnassign={onUnassign}
          onBuySlot={onBuySlot}
          onBoost={() => onBoost(picked)}
          onBuyBuilder={onBuyBuilder}
          onBuyMissing={() => onBuyMissing(picked)}
          onCollectEarly={() => onCollectEarly(picked)}
          buildersTotal={save.builders}
          builderPrice={builderPriceUsd(save.builders)}
          slotPriceUsd={workerSlotPriceUsd(save.extraSlots || 0)}
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
