"use client";

// The panel that opens when a building is tapped.
//
// A bottom sheet, not a full-screen modal, on purpose: the player keeps seeing
// their town while they decide. That is what makes an upgrade feel like it is
// happening to a place rather than inside a menu.

import { BUILDINGS, BUILDING_INFO, MAX_LEVEL, buildSeconds, upgradeCost } from "../../../lib/townConfig";
import { IconCoin, IconHouse, IconPaw } from "../icons";

const RESOURCE_LABEL = {
  treats: "Treats",
  kibble: "Kibble",
  planks: "Planks",
  pebbles: "Pebbles",
  catnip: "Catnip",
};

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.floor(n));
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
  treats,
  buildersFree,
  workingHere,
  onUpgrade,
  onRush,
  onClose,
}) {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) return null;
  const info = BUILDING_INFO[id] || {};

  const maxed = level >= MAX_LEVEL;
  const cost = upgradeCost(level);
  const secs = buildSeconds(level);
  const canAfford = treats >= cost;
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

        <header className="tt-sheet-head">
          <span className="tt-sheet-swatch" style={{ background: `#${b.roof.toString(16).padStart(6, "0")}` }} />
          <div>
            <h3>{b.name}</h3>
            <p className="tt-sheet-lvl">
              Level {level}
              {maxed && " · max"}
            </p>
          </div>
        </header>

        <p className="tt-sheet-desc">{info.desc}</p>

        <div className="tt-sheet-stats">
          {info.produces && (
            <div>
              <small>Produces</small>
              <b>{RESOURCE_LABEL[info.produces] || info.produces}</b>
            </div>
          )}
          {info.unlocksAt && (
            <div>
              <small>At this level</small>
              <b>{info.unlocksAt(level)}</b>
            </div>
          )}
          <div>
            <small>Cats here</small>
            <b>
              <IconPaw size={14} /> {workingHere}
            </b>
          </div>
        </div>

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
              Finish now · 12 <IconCoin size={15} />
            </button>
            <p className="tt-sheet-note">
              A builder is busy until this finishes. More builders means more at once.
            </p>
          </div>
        ) : maxed ? (
          <p className="tt-sheet-note">This building is at its maximum level.</p>
        ) : (
          <div className="tt-sheet-job">
            <div className="tt-sheet-jobrow">
              <span>Upgrade to level {level + 1}</span>
              <b className="mono">{clock(secs)}</b>
            </div>
            <div className={"tt-sheet-cost" + (canAfford ? "" : " short")}>
              <span>Treats</span>
              <b className="mono">
                {fmt(treats)} / {fmt(cost)}
              </b>
            </div>
            <button
              className="tt-btn"
              type="button"
              disabled={!canAfford || buildersFree <= 0}
              onClick={onUpgrade}
            >
              <IconHouse size={17} />
              {!canAfford
                ? `Need ${fmt(cost - treats)} more Treats`
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
