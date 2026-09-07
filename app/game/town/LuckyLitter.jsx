"use client";

// THE LUCKY LITTER — the event wheel.
//
// Laid out in the order that makes the mechanic legible rather than the order
// that extracts most, which turn out to be nearly the same order anyway:
//
//   1. how long is left            (the reason to act today)
//   2. the next milestone          (the reason to spin at all)
//   3. the two wheels              (the choice, with prices)
//   4. the published odds          (the honesty, not hidden behind a tap)
//   5. the pity counter            (progress that never resets)
//
// The milestone sits above the wheels on purpose. A player deciding whether to
// spin is not asking "what might I get"; they are asking "how far to the next
// box". Answer that first and the wheels become the means rather than the pitch.

import {
  MILESTONES,
  WHEELS,
  eventLeft,
  milestonesReached,
  nextMilestone,
  oddsTable,
} from "../../../lib/luckyLitter.js";
import { IconGold, IconGoldFish, IconPaw } from "../icons";

const RARITY_LABEL = {
  common: "Ordinary cat",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.floor(n)));

export default function LuckyLitter({
  litter,
  keys = { silver: 0, gold: 0 },
  goldFish = 0,
  freeSpins = 0,
  onSpin,
  onClaim,
  onClose,
}) {
  const spins = litter?.spins || 0;
  const next = nextMilestone(spins);
  const left = eventLeft(litter?.startedAt);
  const claimed = litter?.claimed || {};

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section
        className="tt-sheet tt-litter"
        role="dialog"
        aria-label="Lucky Litter"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <header className="tt-sheet-head">
          <span className="tt-sheet-swatch" style={{ background: "#ffd23f" }} />
          <div>
            <h3>Lucky Litter</h3>
            <p className="tt-sheet-lvl">
              {left > 0 ? `${clock(left)} left · ${spins} spins` : "Over for now"}
            </p>
          </div>
        </header>

        {/* THE REASON TO SPIN, above everything else. */}
        {next ? (
          <div className="tt-mile-next">
            <div className="tt-mile-head">
              <small>Next reward</small>
              <b>
                {next.away} spin{next.away === 1 ? "" : "s"} away
              </b>
            </div>
            <p>{next.label}</p>
            <div className="tt-mile-bar">
              <i
                style={{
                  width: `${Math.min(100, ((spins - (MILESTONES[MILESTONES.indexOf(next) - 1]?.at || 0)) /
                    (next.at - (MILESTONES[MILESTONES.indexOf(next) - 1]?.at || 0))) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="tt-sheet-note">Every milestone claimed. Nothing left to chase this time.</p>
        )}

        {/* Milestone rail — all five, so the shape of the run is visible from
            the first spin rather than discovered one box at a time. */}
        <ol className="tt-mile-rail">
          {MILESTONES.map((m) => {
            const done = spins >= m.at;
            const ready = done && !claimed[m.at];
            return (
              <li key={m.at} className={(done ? "done " : "") + (ready ? "ready" : "")}>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => ready && onClaim(m.at)}
                  title={m.label}
                >
                  <b className="mono">{m.at}</b>
                  <small>{ready ? "claim" : done ? "taken" : "spins"}</small>
                </button>
              </li>
            );
          })}
        </ol>

        {/* THE TWO WHEELS */}
        <div className="tt-wheels">
          {Object.values(WHEELS).map((w) => {
            const have = keys[w.id] || 0;
            const canFree = w.id === "silver" && freeSpins > 0;
            const canKey = have > 0;
            const canFish = goldFish >= w.goldFish;
            const pity = litter?.pity?.[w.id] || 0;
            return (
              <div key={w.id} className={"tt-wheel w-" + w.id}>
                <div className="tt-wheel-top">
                  <span className="tt-wheel-dot" style={{ background: w.color }} />
                  <b>{w.name}</b>
                  <span className="tt-wheel-keys mono">
                    {have} {w.key}
                    {have === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="tt-wheel-blurb">{w.blurb}</p>

                <table className="tt-odds">
                  <tbody>
                    {oddsTable(w.id).map((row) => (
                      <tr key={row.rarity} className={"r-" + row.rarity}>
                        <td>{RARITY_LABEL[row.rarity]}</td>
                        <td className="mono">{row.pct}%</td>
                        <td className="mono tt-odds-shards">{row.shards} shards</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="tt-pity">
                  <small>
                    {pity} of {w.pity} to a guaranteed {RARITY_LABEL[w.pityFloor]}
                  </small>
                  <div className="tt-pity-bar">
                    <i style={{ width: `${Math.min(100, (pity / w.pity) * 100)}%` }} />
                  </div>
                </div>

                <div className="tt-wheel-btns">
                  {canFree && (
                    <button className="tt-btn" type="button" onClick={() => onSpin(w.id, "free")}>
                      <IconPaw size={16} /> Free spin today
                    </button>
                  )}
                  <button
                    className={"tt-btn" + (canFree ? " alt" : "")}
                    type="button"
                    disabled={!canKey}
                    onClick={() => onSpin(w.id, "key")}
                  >
                    {canKey ? `Spin · 1 ${w.key}` : `No ${w.key}s`}
                  </button>
                  <button
                    className="tt-mini gold tt-door"
                    type="button"
                    disabled={!canFish}
                    onClick={() => onSpin(w.id, "fish")}
                  >
                    Spin · {w.goldFish} <IconGoldFish size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="tt-sheet-note">
          These are the real odds and the counter never resets — not between spins,
          not between events. Pity can only push a result up, never down.
        </p>
      </section>
    </div>
  );
}
