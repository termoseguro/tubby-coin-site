"use client";

// TRAINING — Kingshot's Barracks, Range and Stable.
//
// One panel for all three, because they are the same building three times over:
// Kingshot's own rule is that "all troop types at the same tier have identical
// training times, power and event points". The classes differ in what they DO
// in a fight, never in what they cost, so a panel per class would be three
// copies of one screen.
//
// The interesting decision is TRAIN versus PROMOTE, and it is shown as numbers
// rather than hidden behind two buttons: promoting is faster and worth less per
// second, which is a real trade only if the player can see both halves of it.

import { useState } from "react";
import {
  MAX_TIER,
  TIER_AT,
  TRAINERS,
  capacity,
  efficiency,
  promoteCost,
  promoteSeconds,
  speedBonus,
  topTier,
  trainSeconds,
  troopCost,
  troopPower,
} from "../../../lib/troops.js";
import { RESOURCES } from "../../../lib/townEconomy.js";
import { IconCatnip, IconFish, IconStone, IconWood } from "../icons";

const ICON = { fish: IconFish, wood: IconWood, stone: IconStone, catnip: IconCatnip };
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.round(n)));

function clock(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${Math.floor(s % 60)}s`;
  return `${Math.floor(s)}s`;
}

export default function TrainingPanel({
  buildingId,
  level,
  save,
  researchSpeed = 0,
  onTrain,
  onPromote,
  onClose,
}) {
  const trainer = TRAINERS[buildingId];
  const cls = trainer.cls;
  const best = topTier(level);
  const cap = capacity(level);

  const [tier, setTier] = useState(Math.max(1, best));
  const [count, setCount] = useState(Math.min(10, cap));

  const have = save.army?.[cls] || {};
  const job = save.training?.[buildingId] || null;
  const remaining = job ? Math.max(0, (job.finishesAt - Date.now()) / 1000) : 0;

  const cost = troopCost(tier, count);
  const secs = trainSeconds(tier, count, level, researchSpeed);
  const eff = efficiency(tier, level, researchSpeed);

  // Promotion draws from the tier below, so it is only offered when there is
  // something down there to promote.
  const below = have[tier - 1] || 0;
  const promotable = Math.min(below, cap);
  const pCost = promoteCost(tier, Math.min(count, promotable));
  const pSecs = promoteSeconds(tier, Math.min(count, promotable), level, researchSpeed);

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section
        className="tt-sheet tt-train"
        role="dialog"
        aria-label={trainer.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <header className="tt-sheet-head">
          <span className="tt-sheet-swatch" style={{ background: "#8a9a55" }} />
          <div>
            <h3>{trainer.name}</h3>
            <p className="tt-sheet-lvl">
              Level {level} · up to {cap} at once · +{speedBonus(level).toFixed(1)}% speed
            </p>
          </div>
        </header>

        {job && (
          <div className="tt-study-run">
            <div className="tt-study-run-top">
              <b>
                {job.count} × T{job.tier} {trainer.unit}
                {job.promote ? " (promoting)" : ""}
              </b>
              <span className="mono">{clock(remaining)}</span>
            </div>
            <div className="tt-sheet-bar">
              <i
                style={{
                  width: `${Math.min(100, ((Date.now() - job.startedAt) / Math.max(1, job.finishesAt - job.startedAt)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* WHAT YOU HAVE. A barracks that does not show your army is a shop. */}
        <div className="tt-army">
          <small>Your {trainer.unit.toLowerCase()}s</small>
          <div className="tt-army-row">
            {Array.from({ length: MAX_TIER }, (_, i) => i + 1)
              .filter((t) => (have[t] || 0) > 0 || t <= best)
              .map((t) => (
                <span key={t} className={"tt-army-tier" + (t > best ? " locked" : "")}>
                  <b>T{t}</b>
                  <em className="mono">{have[t] || 0}</em>
                </span>
              ))}
          </div>
        </div>

        {/* TIER */}
        <div className="tt-tier-pick">
          <small>Tier</small>
          <div>
            {Array.from({ length: MAX_TIER }, (_, i) => i + 1).map((t) => {
              const locked = t > best;
              return (
                <button
                  key={t}
                  type="button"
                  className={(tier === t ? "on " : "") + (locked ? "locked" : "")}
                  disabled={locked}
                  onClick={() => setTier(t)}
                  title={locked ? `${trainer.name} level ${TIER_AT[t - 1]}` : `${troopPower(t)} power each`}
                >
                  T{t}
                </button>
              );
            })}
          </div>
          {best < MAX_TIER && (
            <p className="tt-sheet-note">
              T{best + 1} needs {trainer.name} level {TIER_AT[best]}.
            </p>
          )}
        </div>

        {/* HOW MANY */}
        <div className="tt-count">
          <small>
            How many · {count} of {cap}
          </small>
          <input
            type="range"
            min="1"
            max={Math.max(1, cap)}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>

        {/* THE TWO ROUTES, side by side with their numbers. */}
        <div className="tt-routes">
          <div className="tt-route">
            <b>Train</b>
            <span className="tt-route-cost">
              {Object.entries(cost).map(([k, v]) => {
                const I = ICON[k];
                const short = (save.res?.[k] || 0) < v;
                return (
                  <span key={k} className={short ? "short" : ""}>
                    {I ? <I size={13} /> : null}
                    {fmt(v)}
                  </span>
                );
              })}
            </span>
            <small className="mono">
              {clock(secs)} · +{fmt(troopPower(tier) * count)} power
            </small>
            <button className="tt-btn" type="button" disabled={!!job} onClick={() => onTrain(buildingId, tier, count)}>
              {job ? "Busy" : `Train ${count}`}
            </button>
          </div>

          <div className={"tt-route" + (promotable < 1 ? " off" : "")}>
            <b>Promote</b>
            {promotable < 1 ? (
              <small className="quiet">
                Nothing at T{tier - 1} to promote{tier === 1 ? " — T1 must be trained" : ""}.
              </small>
            ) : (
              <>
                <span className="tt-route-cost">
                  {Object.entries(pCost).map(([k, v]) => {
                    const I = ICON[k];
                    const short = (save.res?.[k] || 0) < v;
                    return (
                      <span key={k} className={short ? "short" : ""}>
                        {I ? <I size={13} /> : null}
                        {fmt(v)}
                      </span>
                    );
                  })}
                </span>
                <small className="mono">
                  {clock(pSecs)} · +{fmt(eff.gained * Math.min(count, promotable))} power
                </small>
                <button
                  className="tt-btn alt"
                  type="button"
                  disabled={!!job}
                  onClick={() => onPromote(buildingId, tier, Math.min(count, promotable))}
                >
                  {job ? "Busy" : `Promote ${Math.min(count, promotable)}`}
                </button>
              </>
            )}
          </div>
        </div>

        <p className="tt-sheet-note">
          {eff.promoteWorse
            ? "Promoting is faster and worth less per second than training fresh — it buys time, not efficiency."
            : "At this tier promoting is the better deal. It stops being so as the tiers climb."}
        </p>
      </section>
    </div>
  );
}
