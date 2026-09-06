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
  };
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

export default function TubbyTown() {
  const [save, setSave] = useState(null);
  const [tab, setTab] = useState("town");
  const [pullResult, setPullResult] = useState(null);
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
      setSave((s) => (s ? { ...s, treats: s.treats + townRate(s) * (TICK_MS / 1000) } : s));
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
        RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
        b.level - a.level
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
            const best = rolls.reduce(
              (m, r) => Math.max(m, RARITY_ORDER.indexOf(r.rarity)),
              -1
            );
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
        <div className="tt-boot">Waking the cats…</div>
      </main>
    );
  }

  const canPull = save.treats >= game.pullCostTreats;
  const pityLeft = game.pity.hardAt - save.pity;

  return (
    <main className={"ttown" + (save.skin ? " tt-gold" : "")}>
      {/* ---------- header ---------- */}
      <header className="tt-bar">
        <a className="tt-back" href="/">
          ← {config.token.ticker}
        </a>
        <div className="tt-title">
          TUBBY TOWN <span className="tt-proto">prototype</span>
        </div>
        <div className="tt-wallet">
          <span className="tt-tier" title="Your $TUBBY hold tier">
            {tier.name} ×{tier.mult}
          </span>
        </div>
      </header>

      {/* ---------- resource strip ---------- */}
      <section className="tt-strip">
        <div className="tt-res">
          <span className="tt-res-n mono">{fmt(save.treats)}</span>
          <span className="tt-res-l">treats</span>
        </div>
        <div className="tt-res">
          <span className="tt-res-n mono">{fmtRate(rate)}/s</span>
          <span className="tt-res-l">production</span>
        </div>
        <div className="tt-res">
          <span className="tt-res-n mono">
            {save.slotted.length}/{save.slots}
          </span>
          <span className="tt-res-l">town slots</span>
        </div>
        <div className="tt-res">
          <span className="tt-res-n mono">{save.bowlHours}h</span>
          <span className="tt-res-l">bowl size</span>
        </div>
      </section>

      {/* ---------- tabs ---------- */}
      <nav className="tt-tabs">
        {[
          ["town", "🏠 Town"],
          ["litter", "🎁 Litter Box"],
          ["board", "🏆 Board"],
          ["shop", "🛒 Shop"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={"tt-tab" + (tab === id ? " on" : "")}
            onClick={() => setTab(id)}
            type="button"
          >
            {label}
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
          />
        )}
        {tab === "litter" && (
          <LitterTab save={save} canPull={canPull} pityLeft={pityLeft} onPull={doPull} />
        )}
        {tab === "board" && <BoardTab save={save} onHold={(h) => setSave((s) => ({ ...s, hold: h }))} />}
        {tab === "shop" && <ShopTab onBuy={mockBuy} onReset={hardReset} />}
      </div>

      {/* ---------- overlays ---------- */}
      {welcomeBack && (
        <Modal onClose={() => setWelcomeBack(null)} title="The bowl was waiting">
          <p className="tt-p">
            You were away <b>{fmtDur(welcomeBack.away)}</b>. The bowl collected{" "}
            <b className="mono">{fmt(welcomeBack.gained)}</b> treats.
          </p>
          {welcomeBack.full && (
            <p className="tt-warn">
              Your bowl filled up after {save.bowlHours}h and production stopped. A bigger bowl
              catches everything.
            </p>
          )}
          <button className="btn" type="button" onClick={() => setWelcomeBack(null)}>
            Collect
          </button>
        </Modal>
      )}

      {pullResult && (
        <Modal onClose={() => setPullResult(null)} title={`${pullResult.length}× pull`}>
          <div className="tt-pulls">
            {pullResult.map((r, i) => (
              <figure key={i} className={"tt-pull r-" + r.rarity}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.art} alt="" loading="lazy" />
                <figcaption>
                  {RARITIES[r.rarity].name}
                  {r.dupe && <span className="tt-dupe">+1 shard</span>}
                </figcaption>
              </figure>
            ))}
          </div>
          <button className="btn" type="button" onClick={() => setPullResult(null)}>
            Nice
          </button>
        </Modal>
      )}

      {toast && <div className="tt-toast">{toast}</div>}
    </main>
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

function TownTab({ save, collection, onToggle, onLevel, onBuySlot, onBuyBowl }) {
  const slotCost = game.slotCost(save.slots);
  const bowlCost = game.bowlCost(save.bowlHours);
  const slotsMaxed = save.slots >= game.freeSlotLimit;
  const bowlMaxed = save.bowlHours >= game.maxBowlHours;

  return (
    <>
      <h2 className="tt-h">Your town</h2>
      <p className="tt-sub">
        Slotted cats earn treats every second, online or off. Rarer cats earn dramatically more.
      </p>

      <div className="tt-slots">
        {Array.from({ length: save.slots }).map((_, i) => {
          const key = save.slotted[i];
          const cat = key ? save.cats[key] : null;
          if (!cat) {
            return (
              <div key={i} className="tt-slot empty">
                <span>empty</span>
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              className={"tt-slot r-" + cat.rarity}
              onClick={() => onToggle(key)}
              title="Click to remove from town"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cat.art} alt="" loading="lazy" />
              <span className="tt-lvl">Lv{cat.level}</span>
              <span className="tt-slot-rate mono">
                {fmtRate(catRate(cat.rarity, cat.level))}/s
              </span>
            </button>
          );
        })}
      </div>

      <div className="tt-upgrades">
        <button className="btn ghost" type="button" onClick={onBuySlot} disabled={slotsMaxed}>
          {slotsMaxed ? "Slots 9–12 are in the shop" : `+1 slot — ${fmt(slotCost)} treats`}
        </button>
        <button className="btn ghost" type="button" onClick={onBuyBowl} disabled={bowlMaxed}>
          {bowlMaxed
            ? `Bowl maxed (${game.maxBowlHours}h)`
            : `Bowl → ${save.bowlHours + game.bowlStep}h — ${fmt(bowlCost)} treats`}
        </button>
      </div>

      <h2 className="tt-h">Collection ({collection.length})</h2>
      <p className="tt-sub">
        Duplicates become shards. Shards level a cat up, and a level is worth more than a new
        Common.
      </p>
      <div className="tt-grid">
        {collection.map((cat) => {
          const key = `${cat.rarity}|${cat.art}`;
          const inTown = save.slotted.includes(key);
          const needShards = shardsToLevel(cat.rarity, cat.level);
          const needTreats = game.levelUpTreats(cat.level, RARITIES[cat.rarity].mult);
          const ready = cat.shards >= needShards && save.treats >= needTreats;
          return (
            <article key={key} className={"tt-card r-" + cat.rarity}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cat.art} alt="" loading="lazy" />
              <div className="tt-card-b">
                <div className="tt-card-r" style={{ color: RARITIES[cat.rarity].color }}>
                  {RARITIES[cat.rarity].name}
                </div>
                <div className="tt-card-l mono">
                  Lv{cat.level} · {fmtRate(catRate(cat.rarity, cat.level))}/s
                </div>
                <div className="tt-shards mono">
                  shards {cat.shards}/{needShards}
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
                    className="tt-mini"
                    onClick={() => onLevel(key)}
                    disabled={!ready}
                    title={`${needShards} shards + ${fmt(needTreats)} treats`}
                  >
                    Level up
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
  const total = RARITY_ORDER.reduce((a, k) => a + RARITIES[k].odds, 0);
  return (
    <>
      <h2 className="tt-h">Litter Box</h2>
      <p className="tt-sub">
        Every drop rate is published below and never changes silently. What you see is what rolls.
      </p>

      <div className="tt-pullbox">
        <button
          className="btn"
          type="button"
          disabled={!canPull}
          onClick={() => onPull(1)}
        >
          Pull ×1 — {fmt(game.pullCostTreats)} treats
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={save.treats < game.pullCostTreats * 10}
          onClick={() => onPull(10)}
        >
          Pull ×10 — {fmt(game.pullCostTreats * 10)} treats
        </button>
        <div className="tt-pity mono">
          Guaranteed Legendary+ in {pityLeft} {pityLeft === 1 ? "pull" : "pulls"} · {save.pulls}{" "}
          pulled all time
        </div>
      </div>

      <h3 className="tt-h3">Drop rates</h3>
      <table className="tt-odds">
        <thead>
          <tr>
            <th>Rarity</th>
            <th>Chance</th>
            <th>Earns</th>
            <th>Pieces in pool</th>
          </tr>
        </thead>
        <tbody>
          {[...RARITY_ORDER].reverse().map((k) => (
            <tr key={k}>
              <td style={{ color: RARITIES[k].color, fontWeight: 800 }}>{RARITIES[k].name}</td>
              <td className="mono">{RARITIES[k].odds.toFixed(2)}%</td>
              <td className="mono">×{RARITIES[k].mult}</td>
              <td className="mono">{POOL_SIZES[k]}</td>
            </tr>
          ))}
          <tr className="tt-odds-total">
            <td>Total</td>
            <td className="mono">{total.toFixed(2)}%</td>
            <td />
            <td />
          </tr>
        </tbody>
      </table>
      <ul className="tt-rules">
        <li>
          <b>Hard guarantee:</b> {game.pity.hardAt} pulls without a Legendary or better and the
          next pull is one.
        </li>
        <li>
          <b>10× floor:</b> every ten-pull contains at least one Epic or better.
        </li>
        <li>
          <b>Duplicates are never wasted</b> — they become shards that level the cat you already
          own.
        </li>
      </ul>
    </>
  );
}

const POOL_SIZES = Object.fromEntries(RARITY_ORDER.map((k) => [k, POOLS[k].length]));

function BoardTab({ save, onHold }) {
  const [wallets, setWallets] = useState(1);
  const capital = 10_000_000;
  const dailyPool = 12; // SOL, illustrative

  // Proportional payout: your share of the pool tracks your share of the
  // network's time-weighted hold. Splitting capital across wallets splits the
  // share too — the total is identical, minus N× the gas. This is the whole
  // anti-sybil design in one line of math.
  const networkHold = 800_000_000;
  const proportional = (capital / networkHold) * dailyPool;
  const flatBonus = wallets * 0.01; // what a naive "daily login reward" would pay

  const rows = [
    { name: "gigachad.sol", score: 184_200, hold: "48.0M" },
    { name: "meowmeow", score: 151_900, hold: "31.2M" },
    { name: "tubbymaxi", score: 133_400, hold: "22.7M" },
    { name: "you", score: Math.floor(save.treats / 10) + save.pulls * 25, hold: fmt(save.hold), me: true },
    { name: "catlady99", score: 71_500, hold: "6.1M" },
  ].sort((a, b) => b.score - a.score);

  return (
    <>
      <h2 className="tt-h">Season board</h2>
      <p className="tt-sub">
        Rank is time-weighted hold × play score. Top {game.board.plushieTopN} each season receive
        the ultra-rare collectible plushie — shipped, one per address.
      </p>

      <table className="tt-board">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Score</th>
            <th>Hold</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className={r.me ? "me" : undefined}>
              <td className="mono">{i + 1}</td>
              <td>
                {r.name} {i < 3 && "🧸"}
              </td>
              <td className="mono">{fmt(r.score)}</td>
              <td className="mono">{r.hold}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="tt-h3">Why farming this is pointless</h3>
      <p className="tt-sub">
        Split {fmt(capital)} $TUBBY across as many wallets as you like — the payout does not move,
        because it is proportional to capital, not to how many addresses you own.
      </p>
      <div className="tt-sim">
        <label className="tt-simlabel">
          Wallets a farmer splits into: <b className="mono">{wallets}</b>
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
            <span className="tt-res-l">Our rule (proportional)</span>
            <span className="tt-res-n mono">{proportional.toFixed(3)} SOL/day</span>
            <small>unchanged at any wallet count</small>
          </div>
          <div className="bad">
            <span className="tt-res-l">Flat per-wallet bonus</span>
            <span className="tt-res-n mono">{flatBonus.toFixed(2)} SOL/day</span>
            <small>scales with wallets — never ship this</small>
          </div>
        </div>
      </div>

      <h3 className="tt-h3">Simulate your hold</h3>
      <p className="tt-sub">
        Dev control. Later this reads the real balance from the connected wallet over RPC.
      </p>
      <div className="tt-holds">
        {game.holdTiers.map((t) => (
          <button
            key={t.min}
            type="button"
            className={"tt-mini" + (holdTier(save.hold).min === t.min ? " on" : "")}
            onClick={() => onHold(t.min)}
          >
            {t.name} — {fmt(t.min)} (×{t.mult})
          </button>
        ))}
      </div>
    </>
  );
}

function ShopTab({ onBuy, onReset }) {
  return (
    <>
      <h2 className="tt-h">Shop</h2>
      <p className="tt-sub tt-warn">
        Prototype: nothing is charged. Buttons grant the item so the pricing can be play-tested.
      </p>
      <div className="tt-shop">
        {game.shop.map((item) => (
          <article key={item.id} className={"tt-item" + (item.best ? " best" : "")}>
            {item.best && <span className="tt-badge">Best value</span>}
            <h4>{item.name}</h4>
            <p>{item.desc}</p>
            <button className="btn" type="button" onClick={() => onBuy(item)}>
              {item.sol} SOL
            </button>
          </article>
        ))}
      </div>
      <div className="tt-danger">
        <button className="btn ghost" type="button" onClick={onReset}>
          Wipe save (start over)
        </button>
      </div>
    </>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="tt-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="tt-modal-in" onClick={(e) => e.stopPropagation()}>
        <button className="tt-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
