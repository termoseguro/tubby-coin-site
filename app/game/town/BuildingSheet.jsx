"use client";

// The panel that opens when a building is tapped.
//
// A bottom sheet, not a full-screen modal, on purpose: the player keeps seeing
// their town while they decide. That is what makes an upgrade feel like it is
// happening to a place rather than inside a menu.
//
// Structured the way Kingshot structures it: what it produces NOW, what it will
// produce at the next level, the full multi-resource cost with have/need on
// every line, the build time, and whether a builder is free.

import { BUILDINGS, BUILDING_INFO } from "../../../lib/townConfig";
import {
  PRODUCERS,
  REFINERS,
  RESOURCES,
  UNLOCKS,
  buildSecondsFor,
  holdCap,
  maxLevelFor,
  catPower,
  crewPower,
  effectiveRate,
  ratePerHour,
  rushCost,
  staffing,
  workerCap,
  BOOST,
  MAX_PER_BUILDING,
  shortfall,
  upgradeCostFor,
} from "../../../lib/townEconomy";
import {
  IconBiscuit,
  IconCatnip,
  IconGoldFish,
  IconHouse,
  IconPaw,
  IconStone,
  IconTreat,
  IconWood,
} from "../icons";

const ICON = {
  fish: IconTreat,
  wood: IconWood,
  stone: IconStone,
  catnip: IconCatnip,
  treats: IconBiscuit,
};

function fmt(n) {
  n = Math.floor(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(0) + "K";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function clock(sec) {
  if (sec <= 0) return "done";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function BuildingSheet({
  id,
  level,
  job,
  ready,
  res,
  hallLevel,
  storehouseLevel,
  cats = 0,
  power = 0,
  blocked = [],
  starving = false,
  buildersFree,
  workingHere,
  crew = [],
  idle = [],
  slotsUsed = 0,
  slotsTotal = 0,
  slotPrice = 0,
  boostUntil = 0,
  onUpgrade,
  onRush,
  onCollect,
  onAssign,
  onUnassign,
  onBuySlot,
  onBoost,
  onMove,
  onClose,
}) {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) return null;
  const info = BUILDING_INFO[id] || {};
  const prod = PRODUCERS[id];

  const capLevel = maxLevelFor(id, hallLevel);
  const hallCapped = level >= capLevel && id !== "hall";
  const cost = upgradeCostFor(id, level);
  const missing = shortfall(cost, res);
  const canAfford = Object.keys(missing).length === 0;
  const secs = buildSecondsFor(id, level);
  const remaining = job ? Math.max(0, (job.finishesAt - Date.now()) / 1000) : 0;

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section
        className="tt-sheet"
        role="dialog"
        aria-label={b.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <button className="tt-sheet-move" type="button" onClick={onMove}>
          Move
        </button>

        <header className="tt-sheet-head">
          <span
            className="tt-sheet-swatch"
            style={{ background: `#${b.roof.toString(16).padStart(6, "0")}` }}
          />
          <div>
            <h3>{b.name}</h3>
            <p className="tt-sheet-lvl">Level {level}</p>
          </div>
        </header>

        <p className="tt-sheet-desc">{info.desc}</p>

        {/* THE CHAIN — what goes in, what comes out, what it unblocks.
            Without this the player is looking at five unrelated timers. */}
        {(prod || UNLOCKS[id]) && (
          <div className="tt-chain">
            {REFINERS[id] && (
              <div className="tt-chain-step">
                <small>Uses</small>
                <div className="tt-chain-res">
                  {Object.entries(REFINERS[id]).map(([k, per]) => {
                    const Icon = ICON[k];
                    return (
                      <span key={k} style={{ color: RESOURCES[k].color }}>
                        <Icon size={16} /> {per} per
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {prod && (
              <div className="tt-chain-step out">
                <small>Makes</small>
                <div className="tt-chain-res">
                  <span style={{ color: RESOURCES[prod.res].color }}>
                    {(() => {
                      const Icon = ICON[prod.res];
                      return <Icon size={16} />;
                    })()}{" "}
                    {fmt(effectiveRate(id, level, { power, starving }))}/h
                  </span>
                </div>
              </div>
            )}
            {UNLOCKS[id] && (
              <div className="tt-chain-step">
                <small>Holds back</small>
                <div className="tt-chain-res">
                  <span className="tt-chain-name">
                    {UNLOCKS[id]
                      .map((u) => BUILDINGS.find((x) => x.id === u)?.name || u)
                      .join(", ")}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* THE CREW — cats are moved by the player, one tap each. Without this
            the resources have no lever attached to them at all. */}
        {prod && (
          <div className="tt-crew">
            <div className="tt-crew-head">
              <small>Crew · ×{staffing(power).toFixed(2)} output</small>
              <b className="mono">
                {slotsUsed}/{slotsTotal} spots used
              </b>
            </div>
            <div className="tt-crew-row">
              {Array.from({ length: MAX_PER_BUILDING }).map((_, i) => {
                const c = crew[i];
                if (c) {
                  return (
                    <button
                      key={c.key}
                      type="button"
                      className={"tt-crew-cat r-" + c.rarity}
                      onClick={() => onUnassign(c.key)}
                      title="Take this cat off the job"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.art} alt="" />
                      <span>×</span>
                      <em>{catPower(c.rarity, c.level).toFixed(1)}</em>
                    </button>
                  );
                }
                const canAdd = idle.length > 0 && slotsUsed < slotsTotal;
                return (
                  <button
                    key={i}
                    type="button"
                    className="tt-crew-empty"
                    onClick={() => canAdd && onAssign(idle[0]?.key)}
                    disabled={!canAdd}
                    title={
                      idle.length === 0
                        ? "Every cat already has a job"
                        : slotsUsed >= slotsTotal
                          ? "No worker spots left"
                          : "Put a cat to work here"
                    }
                  >
                    +
                  </button>
                );
              })}
            </div>
            {slotsUsed >= slotsTotal && (
              <button className="tt-mini gold tt-crew-buy" type="button" onClick={onBuySlot}>
                Buy a worker spot · {slotPrice} <IconGoldFish size={14} />
              </button>
            )}
          </div>
        )}

        <div className="tt-sheet-stats">
          {prod && (
            <div>
              <small>Next level makes</small>
              <b className="up">
                {fmt(effectiveRate(id, level + 1, { power, starving }))}/h
              </b>
            </div>
          )}
          {id === "nap" && (
            <div>
              <small>Cats it can hold</small>
              <b>{workerCap(level)} on shift</b>
            </div>
          )}
          {info.unlocksAt && (
            <div>
              <small>At this level</small>
              <b>{info.unlocksAt(level)}</b>
            </div>
          )}
        </div>

        {starving && prod && id !== "kitchen" && (
          <p className="tt-sheet-note warn">
            The town is out of Fish — everything runs at a quarter speed until the Kitchen
            catches up.
          </p>
        )}

        {prod && (
          boostUntil > Date.now() ? (
            <p className="tt-sheet-note boosted">
              Boosted — double output for {clock((boostUntil - Date.now()) / 1000)} more.
            </p>
          ) : (
            <button className="tt-mini boost" type="button" onClick={onBoost}>
              Boost with {BOOST.catnip} Catnip · double output for 15m
            </button>
          )
        )}

        {/* ready to collect */}
        {prod && ready > 0 && (
          <button className="tt-btn collect" type="button" onClick={onCollect}>
            Collect {fmt(ready)} {RESOURCES[prod.res].short}
            {ready >= holdCap(id, level) && <em>· store full</em>}
          </button>
        )}

        {job ? (
          <div className="tt-sheet-job">
            <div className="tt-sheet-jobrow">
              <span>Upgrading to level {level + 1}</span>
              <b className="mono">{clock(remaining)}</b>
            </div>
            <div className="tt-sheet-bar">
              <i style={{ width: `${Math.min(100, job.pct * 100)}%` }} />
            </div>
            <button className="tt-btn alt" type="button" onClick={onRush}>
              Finish now · {rushCost(remaining)} <IconGoldFish size={16} />
            </button>
            <p className="tt-sheet-note">A builder is busy until this finishes.</p>
          </div>
        ) : blocked.length ? (
          <div className="tt-sheet-job">
            <div className="tt-sheet-jobrow">
              <span>Upgrade to level {level + 1}</span>
              <b className="mono">{clock(secs)}</b>
            </div>
            <div className="tt-blocked">
              <small>Needs first</small>
              {blocked.map((r) => (
                <span key={r.id}>
                  {BUILDINGS.find((b) => b.id === r.id)?.name} level {r.level}
                </span>
              ))}
            </div>
            <p className="tt-sheet-note locked">
              Build those up and this unlocks. Nothing in the town moves alone.
            </p>
          </div>
        ) : hallCapped ? (
          <p className="tt-sheet-note locked">
            Level {level} is the most the Cat Hall allows. Upgrade the Cat Hall to go further.
          </p>
        ) : (
          <div className="tt-sheet-job">
            <div className="tt-sheet-jobrow">
              <span>Upgrade to level {level + 1}</span>
              <b className="mono">{clock(secs)}</b>
            </div>

            <div className="tt-costs">
              {Object.entries(cost).map(([k, v]) => {
                const Icon = ICON[k];
                const have = res[k] || 0;
                const short = have < v;
                return (
                  <div key={k} className={"tt-cost" + (short ? " short" : "")}>
                    <span style={{ color: RESOURCES[k].color }}>
                      <Icon size={17} />
                      {RESOURCES[k].name}
                    </span>
                    <b className="mono">{fmt(v)}</b>
                    <small className="mono">
                      {short ? `${fmt(v - have)} short` : `have ${fmt(have)}`}
                    </small>
                  </div>
                );
              })}
            </div>

            <button
              className="tt-btn"
              type="button"
              disabled={!canAfford || buildersFree <= 0}
              onClick={onUpgrade}
            >
              <IconHouse size={17} />
              {!canAfford
                ? `Short on ${Object.keys(missing).map((k) => RESOURCES[k].short).join(", ")}`
                : buildersFree <= 0
                  ? "All builders are busy"
                  : "Start upgrade"}
            </button>
            <p className="tt-sheet-note">
              {buildersFree > 0
                ? `${buildersFree} builder${buildersFree === 1 ? "" : "s"} free.`
                : "Every builder is on another job. Wait, or add one."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
