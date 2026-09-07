"use client";

// THE LONG ALLEY — Kingshot's Conquest, played out.
//
// Two rows facing each other, five of yours against whatever the stage sends.
// You do not act during a fight: the decision is the team and the order you put
// them in. That is Kingshot's design and it is the right one for a game that is
// mostly a town — a battle that needs your hands is a battle you stop opening.
//
// The fight is SIMULATED FIRST and this screen replays the log. Nothing here
// decides anything, which is why it will survive the move to the server
// untouched. It also means the replay can be skipped without changing the
// result, and a player who skips is not cheating themselves.
//
// The one number that carries the whole mode is at the top: what clearing this
// stage does to your idle Gold, permanently. Rewards you can see coming are the
// reason to push a stage you might lose.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHAPTER_LENGTH,
  FRONT_SLOTS,
  LINEUP_SIZE,
  bossName,
  chapterOf,
  enemiesFor,
  idleGoldMultiplier,
  isBoss,
  lineupAdvice,
  stageReward,
  wavesIn,
} from "../../../lib/conquest.js";
import { CLASSES, HERO_BY_ID, heroArt } from "../../../lib/heroes.js";
import { IconGold, IconPaw } from "../icons";

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.round(n)));

/** One combatant, on either side. */
function Unit({ u, art, hp, max, hurt, down, boss }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className={"tt-cq-unit" + (down ? " down" : "") + (hurt ? " hurt" : "") + (boss ? " boss" : "")}>
      <div className={"tt-cq-face r-" + (u.rarity || "common")}>
        {art ? <img src={art} alt="" /> : <span className="tt-cq-mob" aria-hidden="true" />}
        {hurt != null && hurt > 0 && <span className="tt-cq-dmg">−{fmt(hurt)}</span>}
      </div>
      <span className="tt-cq-name">{u.name}</span>
      <span className="tt-cq-bar">
        <i style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

export default function Conquest({
  save,
  pool = [],
  onFight,
  onSetSlot,
  onClose,
}) {
  const cq = save.conquest || { stage: 1, cleared: 0, lineup: [] };
  const stage = cq.stage || 1;
  const lineup = useMemo(
    () => Array.from({ length: LINEUP_SIZE }, (_, i) => cq.lineup?.[i] || null),
    [cq.lineup]
  );

  const [battle, setBattle] = useState(null); // the simulated result being replayed
  const [step, setStep] = useState(0);
  const [picking, setPicking] = useState(null); // slot index being filled
  const timer = useRef(null);

  const owned = Object.keys(save.heroes || {});
  const boss = isBoss(stage);
  const reward = stageReward(stage);

  // Live HP as the log replays. Rebuilt from scratch each step so scrubbing
  // and skipping cannot desync it from the log.
  const frame = useMemo(() => {
    if (!battle) return null;
    const mine = {};
    const theirs = {};
    for (const t of battle.team) mine[t.name] = { hp: t.maxHp, max: t.maxHp, ...t };
    const foes = battle.waves[0]?.enemies || [];
    for (const f of foes) theirs[f.name] = { hp: f.maxHp, max: f.maxHp, ...f };
    const flash = {};
    for (let i = 0; i < step && i < battle.log.length; i++) {
      const e = battle.log[i];
      if (e.down) continue;
      const side = e.mine ? theirs : mine;
      if (side[e.target]) side[e.target].hp = Math.max(0, side[e.target].hp - e.dmg);
      if (i === step - 1) flash[e.target] = e.dmg;
    }
    return { mine, theirs, flash, entry: battle.log[step - 1] };
  }, [battle, step]);

  useEffect(() => {
    if (!battle || step >= battle.log.length) return;
    timer.current = setTimeout(() => setStep((s) => s + 1), 420);
    return () => clearTimeout(timer.current);
  }, [battle, step]);

  const done = battle && step >= battle.log.length;

  function fight() {
    const result = onFight(lineup);
    if (!result) return;
    setBattle(result);
    setStep(0);
  }

  const preview = useMemo(() => enemiesFor(stage, 0), [stage]);

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section
        className="tt-sheet tt-cq"
        role="dialog"
        aria-label="The Long Alley"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <header className="tt-sheet-head">
          <span className="tt-sheet-swatch" style={{ background: boss ? "#c2506c" : "#8a5cc4" }} />
          <div>
            <h3>The Long Alley</h3>
            <p className="tt-sheet-lvl">
              Chapter {chapterOf(stage)} · Stage {stage}
              {boss ? ` · ${bossName(stage)}` : ` · ${wavesIn(stage)} skirmishes`}
            </p>
          </div>
        </header>

        {/* THE REASON TO PUSH, before the fight. */}
        <div className="tt-cq-why">
          <IconGold size={22} />
          <div>
            <b>Clearing this raises your Gold forever</b>
            <small>
              now ×{idleGoldMultiplier(cq.cleared || 0).toFixed(2)} → ×
              {idleGoldMultiplier(stage).toFixed(2)} · plus {fmt(reward.coin)} Gold
              {reward.shards ? ` and ${reward.shards} shards` : ""}
            </small>
          </div>
        </div>

        {/* ---- the board ---- */}
        <div className="tt-cq-board">
          <div className="tt-cq-side foes">
            {(battle ? battle.waves[0].enemies : preview).map((f, i) => {
              const live = frame?.theirs?.[f.name];
              return (
                <Unit
                  key={i}
                  u={f}
                  art={null}
                  hp={live ? live.hp : f.hp}
                  max={f.maxHp}
                  hurt={frame?.flash?.[f.name]}
                  down={live ? live.hp <= 0 : false}
                  boss={f.boss}
                />
              );
            })}
          </div>

          <div className="tt-cq-vs">
            {battle ? (
              <span className="mono">{frame?.entry ? `round ${frame.entry.r}` : "ready"}</span>
            ) : (
              <span>vs</span>
            )}
          </div>

          <div className="tt-cq-side mine">
            {lineup.map((id, i) => {
              const h = id ? HERO_BY_ID[id] : null;
              const live = h && frame?.mine?.[h.name];
              if (!h) {
                return (
                  <button
                    key={i}
                    type="button"
                    className={"tt-cq-empty" + (i < FRONT_SLOTS ? " front" : "")}
                    onClick={() => setPicking(i)}
                  >
                    <IconPaw size={18} />
                    <em>{i < FRONT_SLOTS ? "front" : "back"}</em>
                  </button>
                );
              }
              return (
                <button key={i} type="button" className="tt-cq-slot" onClick={() => setPicking(i)}>
                  <Unit
                    u={h}
                    art={heroArt(h.id, pool)}
                    hp={live ? live.hp : 1}
                    max={live ? live.max : 1}
                    hurt={frame?.flash?.[h.name]}
                    down={live ? live.hp <= 0 : false}
                  />
                  <em className="tt-cq-pos">{i < FRONT_SLOTS ? "front" : "back"}</em>
                </button>
              );
            })}
          </div>
        </div>

        {!battle && <p className="tt-cq-advice">{lineupAdvice(lineup, save)}</p>}

        {/* ---- controls ---- */}
        {!battle ? (
          <button
            className="tt-btn"
            type="button"
            disabled={!lineup.some(Boolean)}
            onClick={fight}
          >
            <IconPaw size={17} />
            {boss ? `Take on ${bossName(stage)}` : "Send them in"}
          </button>
        ) : !done ? (
          <button
            className="tt-mini"
            type="button"
            onClick={() => setStep(battle.log.length)}
          >
            Skip to the end
          </button>
        ) : (
          <div className={"tt-cq-out " + (battle.won ? "win" : "loss")}>
            <b>{battle.won ? "Stage cleared" : "Driven back"}</b>
            {battle.won ? (
              <p>
                Gold is now ×{idleGoldMultiplier(stage).toFixed(2)} — and it stays that way.
              </p>
            ) : boss && battle.bossHp != null ? (
              <p>
                {bossName(stage)} is down to <b>{fmt(battle.bossHp)}</b> HP, and it stays
                there. Come back and finish the job.
              </p>
            ) : (
              <p>Not this time. Ascend someone and try again.</p>
            )}
            <button className="tt-btn" type="button" onClick={() => { setBattle(null); setStep(0); }}>
              Good
            </button>
          </div>
        )}

        {/* ---- picking a hero for a slot ---- */}
        {picking != null && (
          <div className="tt-cq-pick" onClick={() => setPicking(null)}>
            <div className="tt-cq-pick-in" onClick={(e) => e.stopPropagation()}>
              <h4>
                {picking < FRONT_SLOTS ? "Front rank" : "Back rank"} · position {picking + 1}
              </h4>
              <p className="tt-sheet-note">
                {picking < FRONT_SLOTS
                  ? "Takes the hits. Guards belong here."
                  : "Protected while the front rank stands."}
              </p>
              <div className="tt-cq-pick-grid">
                <button type="button" className="tt-cq-pick-none" onClick={() => { onSetSlot(picking, null); setPicking(null); }}>
                  Empty
                </button>
                {owned.map((id) => {
                  const h = HERO_BY_ID[id];
                  if (!h) return null;
                  const used = lineup.indexOf(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={"tt-cq-pick-cat r-" + h.rarity + (used >= 0 ? " used" : "")}
                      onClick={() => { onSetSlot(picking, id); setPicking(null); }}
                    >
                      <img src={heroArt(id, pool) || ""} alt="" />
                      <b>{h.name}</b>
                      <small>{CLASSES[h.cls].name}</small>
                    </button>
                  );
                })}
              </div>
              {!owned.length && (
                <p className="tt-sheet-note locked">
                  No heroes yet. Spin the Lucky Litter first.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
