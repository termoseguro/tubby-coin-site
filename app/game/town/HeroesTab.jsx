"use client";

// THE HERO SCREEN — shaped the way Kingshot shapes it.
//
// It used to be one flat list of all thirty-four heroes, every one of them
// locked on a new account, with the Conquest entry as a small button in the
// corner. That is backwards on both counts:
//
//   · CONQUEST IS THE GAME THE HEROES PLAY. In Kingshot it is the reason the
//     roster exists — a staged auto-battle you push a stage or two a day, and
//     the stage you reach permanently raises your idle income. It belongs at
//     the top of the screen, with the state of the run on it, not behind a
//     button that says nothing.
//   · THE ROSTER IS WHO YOU HAVE, not who exists. Kingshot opens on your own
//     heroes. The catalogue of everyone else is a reference you go looking for,
//     so it is below, filtered, and quiet.
//
// The line against villagers still holds and is still stated once: nothing on
// this screen can be put in a Kitchen, and nothing on the Town screen has a
// star rating.

import { useState } from "react";
import { HEROES, HERO_BY_ID, CLASSES, SKILL_KINDS, heroArt, skillValue } from "../../../lib/heroes.js";
import {
  MAX_STARS,
  RECRUIT_SHARDS,
  heroPower,
  levelCapFor,
  levelCost,
  nextStepCost,
  patrolSlots,
  ownedPower,
  starsFor,
} from "../../../lib/heroProgress.js";
import {
  CHAPTER_LENGTH,
  LINEUP_SIZE,
  chapterOf,
  bossName,
  idleGoldMultiplier,
  isBoss,
} from "../../../lib/conquest.js";
import { HERO_BLURB } from "../../../lib/villagers.js";
import { IconGold, IconPaw } from "../icons";

const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

function skillText(sk, stars) {
  const v = skillValue(sk, stars);
  const kind = SKILL_KINDS[sk.kind];
  if (!kind) return "";
  return kind.label(v).replace("{res}", sk.res || "");
}

export default function HeroesTab({
  save,
  pool = [],
  onAscend,
  onLevel,
  onPatrol,
  onOpenLitter,
  onOpenAlley,
  litterLive,
}) {
  const [cls, setCls] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const owned = save.heroes || {};
  const pending = save.pendingShards || {};
  const patrol = save.patrol || [];
  const slots = patrolSlots(save.buildings?.warroom || 0);

  const conquest = save.conquest || { stage: 1, cleared: 0, lineup: [] };
  const stage = conquest.stage || 1;
  const cleared = conquest.cleared || 0;
  const idleBonus = Math.round((idleGoldMultiplier(cleared) - 1) * 100);
  const toBoss = isBoss(stage) ? 0 : CHAPTER_LENGTH - (stage % CHAPTER_LENGTH);

  const mine = HEROES.filter((h) => owned[h.id]).sort(
    (a, b) => heroPower(b, owned[b.id]) - heroPower(a, owned[a.id])
  );
  const rest = HEROES.filter((h) => !owned[h.id]).sort((a, b) => {
    const pa = pending[a.id] || 0;
    const pb = pending[b.id] || 0;
    if (pa !== pb) return pb - pa;
    if (RARITY_RANK[a.rarity] !== RARITY_RANK[b.rarity]) {
      return RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
    }
    return a.name.localeCompare(b.name);
  });

  const byClass = (list) => (cls === "all" ? list : list.filter((h) => h.cls === cls));
  const shownMine = byClass(mine);
  const shownRest = byClass(rest);
  const restVisible = showAll ? shownRest : shownRest.slice(0, 6);

  return (
    <>
      {/* ---- CONQUEST, at the top, because it is the point ---------------- */}
      <button className="tt-alley" type="button" onClick={onOpenAlley}>
        <span className="tt-alley-l">
          <small>The Long Alley</small>
          <b>
            Stage {stage}
            {isBoss(stage) && <em> · {bossName(stage)}</em>}
          </b>
          <span className="tt-alley-sub">
            Chapter {chapterOf(stage)} ·{" "}
            {toBoss === 0 ? "boss fight" : `${toBoss} to the chapter boss`}
          </span>
        </span>
        <span className="tt-alley-r">
          <span className="tt-alley-idle">
            <i>+{idleBonus}%</i>
            <small>idle Gold</small>
          </span>
          <span className="tt-alley-go">March</span>
        </span>
      </button>

      {/* ---- your roster -------------------------------------------------- */}
      <div className="tt-roster-head">
        <div>
          <h2>Your heroes</h2>
          <p className="tt-p">
            {mine.length} of {HEROES.length} recruited · {ownedPower(save).toLocaleString("en-US")}{" "}
            power · a line-up is {LINEUP_SIZE}
          </p>
        </div>
        <button
          className={"tt-btn" + (litterLive ? "" : " alt")}
          type="button"
          onClick={onOpenLitter}
        >
          {litterLive ? "Lucky Litter is live" : "Recruit"}
        </button>
      </div>

      <div className="tt-seg tt-seg-wide">
        {[["all", "All"], ...Object.values(CLASSES).map((c) => [c.id, c.name])].map(([k, label]) => (
          <button key={k} type="button" className={cls === k ? "on" : ""} onClick={() => setCls(k)}>
            {label}
          </button>
        ))}
      </div>

      {shownMine.length === 0 ? (
        <p className="tt-empty">
          {mine.length === 0
            ? "No heroes yet. Heroes come from the Lucky Litter — ten shards of the same cat recruits it."
            : "No hero of that class yet."}
        </p>
      ) : (
        <div className="tt-hero-grid">
          {shownMine.map((h) => (
            <HeroCard
              key={h.id}
              h={h}
              st={owned[h.id]}
              art={heroArt(h.id, pool)}
              onDuty={patrol.includes(h.id)}
              onAscend={onAscend}
              onLevel={onLevel}
              onPatrol={onPatrol}
            />
          ))}
        </div>
      )}

      {/* ---- the patrol, which is the Palis job and not the main event ---- */}
      <div className="tt-patrol">
        <small>
          Night patrol · {patrol.length} of {slots}
        </small>
        <div className="tt-patrol-row">
          {Array.from({ length: slots }).map((_, i) => {
            const id = patrol[i];
            const h = id ? HERO_BY_ID[id] : null;
            if (!h) {
              return (
                <span key={i} className="tt-patrol-slot empty">
                  <IconPaw size={18} />
                </span>
              );
            }
            return (
              <button
                key={id}
                type="button"
                className={"tt-patrol-slot r-" + h.rarity}
                onClick={() => onPatrol(id)}
                title={`Stand ${h.name} down`}
              >
                <img src={heroArt(h.id, pool) || ""} alt="" />
              </button>
            );
          })}
        </div>
        <p className="tt-sheet-note">
          Heroes on patrol are the ones who stop Palis making a mess while you are away. Only cats on
          patrol count; the War Room raises how many may stand at once.
        </p>
      </div>

      {/* ---- the catalogue, quiet and last ------------------------------- */}
      <div className="tt-roster-head">
        <div>
          <h2>Not recruited</h2>
          <p className="tt-p">
            {HERO_BLURB} Shards come from the Lucky Litter; {RECRUIT_SHARDS} of the same cat recruits
            it.
          </p>
        </div>
      </div>

      <div className="tt-lockgrid">
        {restVisible.map((h) => {
          const pend = pending[h.id] || 0;
          const art = heroArt(h.id, pool);
          return (
            <article key={h.id} className={"tt-lock r-" + h.rarity}>
              <span className="tt-lock-face">
                {art ? <img src={art} alt="" loading="lazy" /> : <span className="tt-hero-none" />}
              </span>
              <div className="tt-lock-b">
                <b>{h.name}</b>
                <small className={"tt-hero-tier r-" + h.rarity}>
                  {h.rarity} · {CLASSES[h.cls].name}
                </small>
                <div className="tt-shard-bar">
                  <i style={{ width: `${Math.min(100, (pend / RECRUIT_SHARDS) * 100)}%` }} />
                </div>
                <small className="mono">
                  {pend}/{RECRUIT_SHARDS} shards
                </small>
              </div>
            </article>
          );
        })}
      </div>

      {shownRest.length > 6 && (
        <button className="tt-btn alt tt-wide" type="button" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${shownRest.length}`}
        </button>
      )}
    </>
  );
}

/** One hero you own. Everything a gacha player asks, in order: what is it, how
 *  far to the next star, and what does that star give me — which is why locked
 *  skills are shown with the star that unlocks them rather than hidden. */
function HeroCard({ h, st, art, onDuty, onAscend, onLevel, onPatrol }) {
  const stars = starsFor(st?.steps || 0);
  const cap = levelCapFor(stars);
  const step = nextStepCost(st?.steps || 0);
  const shards = st?.shards || 0;

  return (
    <article className={"tt-hero r-" + h.rarity}>
      <div className="tt-hero-face">
        {art ? <img src={art} alt="" /> : <span className="tt-hero-none" />}
        <span className="tt-hero-cls">{CLASSES[h.cls].name}</span>
      </div>

      <div className="tt-hero-body">
        <div className="tt-hero-name">
          <b>{h.name}</b>
          <span className={"tt-hero-tier r-" + h.rarity}>{h.rarity}</span>
        </div>

        <div className="tt-stars" aria-label={`${stars} of ${MAX_STARS} stars`}>
          {Array.from({ length: MAX_STARS }).map((_, i) => (
            <i key={i} className={i < stars ? "on" : ""} />
          ))}
          <em className="mono">
            Lv {st.level} / {cap}
          </em>
        </div>

        <ul className="tt-hero-skills">
          {h.skills.map((sk, i) => {
            const live = stars >= sk.at;
            return (
              <li key={i} className={live ? "" : "locked"}>
                <span>{skillText(sk, stars)}</span>
                {!live && <em>{sk.at}★</em>}
              </li>
            );
          })}
        </ul>

        <div className="tt-hero-actions">
          <div className="tt-hero-shards">
            <b className="mono">{shards}</b>
            <small>{step == null ? "maxed" : `of ${step} shards`}</small>
            <div className="tt-shard-bar">
              <i style={{ width: step ? `${Math.min(100, (shards / step) * 100)}%` : "100%" }} />
            </div>
          </div>
          <button
            type="button"
            className="tt-mini"
            disabled={step == null || shards < step}
            onClick={() => onAscend(h.id)}
          >
            {step == null ? "5★" : "Ascend"}
          </button>
          <button
            type="button"
            className="tt-mini"
            disabled={st.level >= cap}
            onClick={() => onLevel(h.id)}
            title={st.level >= cap ? "Ascend to raise the cap" : ""}
          >
            {st.level >= cap ? "Cap" : (
              <>
                Lv up · {levelCost(st.level)} <IconGold size={12} />
              </>
            )}
          </button>
          <button
            type="button"
            className={"tt-mini" + (onDuty ? " on" : "")}
            onClick={() => onPatrol(h.id)}
          >
            {onDuty ? "On patrol" : "Patrol"}
          </button>
        </div>

        <span className="tt-hero-power mono">{heroPower(h, st)} power</span>
      </div>
    </article>
  );
}
