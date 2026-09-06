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
  IconHouse,
  IconLock,
  IconPaw,
  IconPlus,
  IconTreat,
  IconTrophy,
} from "./icons";
import TownCanvas from "./town/TownCanvas";
import BuildingSheet from "./town/BuildingSheet";
import { BUILDINGS, buildSeconds, upgradeCost } from "../../lib/townConfig";
import "./game.css";

const SAVE_KEY = "tubbytown.v1";
const TICK_MS = 250;

const catKey = (c) => `${c.rarity}|${c.art}`;

function freshSave() {
  const starter = { rarity: "common", art: rollCat("common").art, level: 1, shards: 0 };
  return {
    v: 1,
    treats: 0,
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
  };
}

const levelOf = (s, id) => s.buildings?.[id] || 1;

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
  const [welcomeBack, setWelcomeBack] = useState(null);
  const [toast, setToast] = useState(null);
  const saveRef = useRef(null);
  saveRef.current = save;

  // ---- load + offline earnings --------------------------------------------
  useEffect(() => {
    let s;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      s = raw ? { ...freshSave(), ...JSON.parse(raw) } : freshSave();
    } catch {
      s = freshSave();
    }

    // The bowl: production keeps running while away, but only until it is full.
    const away = Math.max(0, (Date.now() - (s.lastSeen || Date.now())) / 1000);
    const capped = Math.min(away, s.bowlHours * 3600);
    const rate = townRate(s);
    const gained = rate * capped;
    if (gained > 1) {
      s.treats += gained;
      setWelcomeBack({ gained, away, capped, full: away >= s.bowlHours * 3600 });
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
        let next = { ...s, treats: s.treats + townRate(s) * (TICK_MS / 1000) };
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
        if (s.treats < cost) {
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
        const { next, results } = addCats({ ...s, treats: s.treats - cost, pity }, rolls);
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
        if (s.treats < needTreats) {
          flash("Not enough treats.");
          return s;
        }
        return {
          ...s,
          treats: s.treats - needTreats,
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
      if (s.treats < cost) {
        flash("Not enough treats.");
        return s;
      }
      return { ...s, treats: s.treats - cost, slots: s.slots + 1 };
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
      if (s.treats < cost) {
        flash("Not enough treats.");
        return s;
      }
      return { ...s, treats: s.treats - cost, bowlHours: s.bowlHours + game.bowlStep };
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
          return { ...s, treats: s.treats + townRate(s) * s.bowlHours * 3600 };
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
        const cost = upgradeCost(level);
        const busy = Object.keys(s.jobs || {}).length;
        if (busy >= s.builders) {
          flash("Every builder is busy.");
          return s;
        }
        if (s.treats < cost) {
          flash("Not enough treats.");
          return s;
        }
        const secs = buildSeconds(level);
        return {
          ...s,
          treats: s.treats - cost,
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
        const jobs = { ...s.jobs };
        jobs[id] = { ...jobs[id], finishesAt: Date.now() };
        flash("Finished instantly.");
        return { ...s, jobs };
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

  const canPull = save.treats >= game.pullCostTreats;
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

      {/* ---------- resource HUD ---------- */}
      <section className="tt-hud">
        <Res icon={<IconTreat />} value={fmt(save.treats)} label="treats" accent />
        <Res icon={<IconPaw />} value={`${fmtRate(rate)}/s`} label="production" />
        <Res icon={<IconHouse />} value={`${save.slotted.length}/${save.slots}`} label="slots" />
        <Res icon={<IconBowl />} value={`${save.bowlHours}h`} label="bowl" />
      </section>

      {/* ---------- tabs ---------- */}
      <nav className="tt-tabs">
        {[
          ["town", "Town", <IconHouse key="i" size={19} />],
          ["litter", "Litter Box", <IconBox key="i" size={19} />],
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

      <div className="tt-body">
        {tab === "town" && (
          <TownTab
            save={save}
            collection={collection}
            onToggle={toggleSlot}
            onLevel={levelUp}
            onBuySlot={buySlot}
            onBuyBowl={buyBowl}
            picked={picked}
            onPick={setPicked}
            onUpgrade={startUpgrade}
            onRush={rushUpgrade}
          />
        )}
        {tab === "litter" && (
          <LitterTab save={save} canPull={canPull} pityLeft={pityLeft} onPull={doPull} />
        )}
        {tab === "board" && (
          <BoardTab save={save} onHold={(h) => setSave((s) => ({ ...s, hold: h }))} />
        )}
        {tab === "shop" && <ShopTab onBuy={mockBuy} onReset={hardReset} />}
      </div>

      {/* ---------- overlays ---------- */}
      {welcomeBack && (
        <Modal onClose={() => setWelcomeBack(null)} title="The bowl was waiting">
          <div className="tt-wb">
            <IconBowl size={54} />
            <div className="tt-wb-n mono">+{fmt(welcomeBack.gained)}</div>
            <p className="tt-p">
              You were away <b>{fmtDur(welcomeBack.away)}</b>.
            </p>
          </div>
          {welcomeBack.full && (
            <p className="tt-warn">
              Your bowl filled up after {save.bowlHours}h and production stopped. A bigger bowl
              catches everything.
            </p>
          )}
          <button className="tt-btn" type="button" onClick={() => setWelcomeBack(null)}>
            Collect
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
  onBuySlot,
  onBuyBowl,
  picked,
  onPick,
  onUpgrade,
  onRush,
}) {
  const slotCost = game.slotCost(save.slots);
  const bowlCost = game.bowlCost(save.bowlHours);
  const slotsMaxed = save.slots >= game.freeSlotLimit;
  const bowlMaxed = save.bowlHours >= game.maxBowlHours;

  // What the canvas paints on top of each building: its level, and the
  // progress of any build occupying a builder.
  const buildingState = useMemo(() => {
    const now = Date.now();
    const out = {};
    for (const b of BUILDINGS) {
      const job = save.jobs?.[b.id];
      out[b.id] = {
        level: levelOf(save, b.id),
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
  }, [save]);

  // Rough head-count per building, so the panel can say who is there.
  const workingAt = useMemo(() => {
    const out = {};
    const workable = BUILDINGS.filter(
      (b) => !["hall", "storehouse", "watchtower", "nap", "adoption"].includes(b.id)
    );
    save.slotted.forEach((k, i) => {
      const b = workable[i % workable.length];
      if (b) out[b.id] = (out[b.id] || 0) + 1;
    });
    return out;
  }, [save.slotted]);

  // Only cats on shift walk the town — the scene shows who is actually working.
  const townCats = useMemo(
    () =>
      save.slotted
        .map((k) => save.cats[k])
        .filter(Boolean)
        .map((c) => ({ key: `${c.rarity}|${c.art}`, art: c.art, rarity: c.rarity })),
    [save.slotted, save.cats]
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
        napBeds={1 + levelOf(save, "nap") * 2}
        onSelect={onPick}
      />

      {picked && (
        <BuildingSheet
          id={picked}
          level={levelOf(save, picked)}
          job={buildingState[picked]?.job}
          treats={save.treats}
          buildersFree={save.builders - Object.keys(save.jobs || {}).length}
          workingHere={workingAt[picked] || 0}
          onUpgrade={() => onUpgrade(picked)}
          onRush={() => onRush(picked)}
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

      <div className="tt-upgrades">
        <button className="tt-btn wide" type="button" onClick={onBuySlot} disabled={slotsMaxed}>
          <IconHouse size={18} />
          {slotsMaxed ? "Slots 9–12 in the shop" : `+1 slot · ${fmt(slotCost)}`}
        </button>
        <button className="tt-btn wide alt" type="button" onClick={onBuyBowl} disabled={bowlMaxed}>
          <IconBowl size={18} />
          {bowlMaxed ? `Bowl maxed · ${game.maxBowlHours}h` : `Bowl ${save.bowlHours + game.bowlStep}h · ${fmt(bowlCost)}`}
        </button>
      </div>

      <SectionHead
        title={`Collection · ${collection.length}`}
        hint="Duplicates become shards. Shards raise a cat's level, and a level beats a new Common."
      />
      <div className="tt-grid">
        {collection.map((cat) => {
          const key = `${cat.rarity}|${cat.art}`;
          const inTown = save.slotted.includes(key);
          const needShards = shardsToLevel(cat.rarity, cat.level);
          const needTreats = game.levelUpTreats(cat.level, RARITIES[cat.rarity].mult);
          const ready = cat.shards >= needShards && save.treats >= needTreats;
          const pct = Math.min(100, (cat.shards / needShards) * 100);
          return (
            <article key={key} className={"tt-card r-" + cat.rarity + (inTown ? " in" : "")}>
              <span className="tt-ribbon">{RARITIES[cat.rarity].name}</span>
              <span className="tt-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cat.art} alt="" loading="lazy" />
                <span className="tt-lvl">{cat.level}</span>
              </span>
              <div className="tt-card-b">
                <div className="tt-card-l mono">{fmtRate(catRate(cat.rarity, cat.level))}/s</div>
                <div className="tt-shardbar" title={`${cat.shards} / ${needShards} shards`}>
                  <i style={{ width: `${pct}%` }} />
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
                    {inTown ? "In town" : "Slot"}
                  </button>
                  <button
                    type="button"
                    className="tt-mini gold"
                    onClick={() => onLevel(key)}
                    disabled={!ready}
                    title={`${needShards} shards + ${fmt(needTreats)} treats`}
                  >
                    Level
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
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
              disabled={save.treats < game.pullCostTreats * 10}
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
      score: Math.floor(save.treats / 10) + save.pulls * 25,
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
