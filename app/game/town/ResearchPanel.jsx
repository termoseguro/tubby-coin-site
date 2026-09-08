"use client";

// THE STUDY — Kingshot's Academy.
//
// Three trees, one research slot. The single slot is the design: with one lane
// the question is never "what can I afford" but "what do I want first", and
// that is the only question a tech tree is actually interesting for.
//
// Sharper Minds researches faster research, which is the compounding trap at
// the middle of it and the reason every Kingshot guide says to take it first.
// The panel does not hide that — it is the first row of the first tree.
//
// Locked rows are SHOWN with what unlocks them rather than filtered out. A tree
// you cannot see the shape of is a tree you cannot plan against, and planning
// is the entire activity here.

import { useState } from "react";
import {
  MAX_TECH_LEVEL,
  ROMAN,
  TECH_BY_ID,
  TREES,
  effectiveSeconds,
  researchBonuses,
  techBlocked,
  techCost,
  techLevel,
  techsIn,
} from "../../../lib/research.js";
import { RESOURCES } from "../../../lib/townEconomy.js";
import { IconBiscuit, IconCatnip, IconFish, IconGold, IconStone, IconWood } from "../icons";

const ICON = {
  fish: IconFish, wood: IconWood, stone: IconStone,
  catnip: IconCatnip, treats: IconBiscuit, coin: IconGold,
};

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.round(n)));

function clock(s) {
  if (s <= 0) return "done";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${Math.floor(s % 60)}s`;
  return `${Math.floor(s)}s`;
}

/** What a technology says it does, in one line. */
function effectText(t, level) {
  const v = t.amount * Math.max(1, level);
  const per = {
    build: `−${v}% build time`,
    research: `−${v}% research time`,
    patrol: `+${v} on patrol`,
    store: `+${v}% Storehouse cap`,
    upkeep: `−${v}% Fish eaten`,
    gold: `+${v}% Gold`,
    allProduce: `+${v}% to all production`,
    army: `+${v}% troops may march`,
    produce: `+${v}% ${t.cls}`,
    atk: `+${v}% ${t.cls || "all"} attack`,
    def: `+${v}% ${t.cls || "all"} defence`,
    hp: `+${v}% ${t.cls || "all"} health`,
    leth: `+${v}% ${t.cls || "all"} lethality`,
  };
  return per[t.effect] || "";
}

export default function ResearchPanel({ save, studyLevel, onStart, onRush, onClose }) {
  const [tree, setTree] = useState("growth");
  const running = save.research || null;
  const bonuses = researchBonuses(save);

  const remaining = running ? Math.max(0, (running.finishesAt - Date.now()) / 1000) : 0;

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section
        className="tt-sheet tt-study"
        role="dialog"
        aria-label="The Study"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <header className="tt-sheet-head">
          <span className="tt-sheet-swatch" style={{ background: "#8a5a3c" }} />
          <div>
            <h3>The Study</h3>
            <p className="tt-sheet-lvl">Level {studyLevel} · one research at a time</p>
          </div>
        </header>

        {/* What the tree has bought so far, so the player can see the shape of
            their own account without doing arithmetic. */}
        <div className="tt-study-sum">
          {bonuses.research > 0 && <span>−{bonuses.research}% research</span>}
          {bonuses.build > 0 && <span>−{bonuses.build}% build</span>}
          {bonuses.allProduce > 0 && <span>+{bonuses.allProduce}% output</span>}
          {bonuses.atk.all > 0 && <span>+{bonuses.atk.all}% attack</span>}
          {!bonuses.research && !bonuses.build && !bonuses.allProduce && !bonuses.atk.all && (
            <span className="quiet">Nothing researched yet.</span>
          )}
        </div>

        {running && (
          <div className="tt-study-run">
            <div className="tt-study-run-top">
              <b>
                {TECH_BY_ID[running.tech].name} {ROMAN[running.level + 1]}
              </b>
              <span className="mono">{clock(remaining)}</span>
            </div>
            <div className="tt-sheet-bar">
              <i
                style={{
                  width: `${Math.min(100, ((Date.now() - running.startedAt) / Math.max(1, running.finishesAt - running.startedAt)) * 100)}%`,
                }}
              />
            </div>
            <button className="tt-mini gold tt-door" type="button" onClick={onRush}>
              Finish now · {Math.max(1, Math.ceil(remaining / 45))} Golden Fish
            </button>
          </div>
        )}

        <div className="tt-study-tabs">
          {Object.values(TREES).map((t) => (
            <button
              key={t.id}
              type="button"
              className={tree === t.id ? "on" : ""}
              onClick={() => setTree(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
        <p className="tt-sheet-note">{TREES[tree].blurb}</p>

        <ul className="tt-tech-list">
          {techsIn(tree).map((t) => {
            const lvl = techLevel(save, t.id);
            const blocked = techBlocked(save, t, studyLevel);
            const maxed = lvl >= MAX_TECH_LEVEL;
            const cost = techCost(t, lvl);
            const secs = effectiveSeconds(t, lvl, bonuses);
            const busy = !!running;

            return (
              <li key={t.id} className={"tt-tech" + (blocked ? " locked" : "") + (maxed ? " maxed" : "")}>
                <div className="tt-tech-name">
                  <b>
                    {t.name} {lvl > 0 && <em>{ROMAN[lvl]}</em>}
                  </b>
                  <small>{effectText(t, lvl + (maxed ? 0 : 1))}</small>
                </div>

                <div className="tt-tech-pips" aria-label={`${lvl} of ${MAX_TECH_LEVEL}`}>
                  {Array.from({ length: MAX_TECH_LEVEL }).map((_, i) => (
                    <i key={i} className={i < lvl ? "on" : ""} />
                  ))}
                </div>

                {maxed ? (
                  <span className="tt-tech-state">max</span>
                ) : blocked ? (
                  <span className="tt-tech-state locked">{blocked}</span>
                ) : (
                  <button
                    type="button"
                    className="tt-tech-btn"
                    disabled={busy}
                    onClick={() => onStart(t.id)}
                    title={busy ? "Something is already being researched" : ""}
                  >
                    <span className="tt-tech-cost">
                      {Object.entries(cost).map(([k, v]) => {
                        const I = ICON[k];
                        const short = (save.res?.[k] || 0) < v;
                        return (
                          <span key={k} className={short ? "short" : ""}>
                            {I ? <I size={12} /> : null}
                            {fmt(v)}
                          </span>
                        );
                      })}
                    </span>
                    <em className="mono">{clock(secs)}</em>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <p className="tt-sheet-note">
          One research runs at a time, which is what makes the order a decision.
          Sharper Minds makes every later one faster — including itself.
        </p>
      </section>
    </div>
  );
}
