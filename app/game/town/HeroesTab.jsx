"use client";

// THE HERO ROSTER — ascend, level, deploy.
//
// Kept firmly apart from the villagers, which is the distinction the whole
// design rests on: villagers live in cottages and stand inside buildings;
// heroes are named, have stars, and go on patrol. Nothing on this screen can be
// assigned to a Kitchen, and nothing on the Town screen has a star rating.
//
// Every card answers the two questions a gacha player actually has, in order:
// how far to the next star, and what does that star give me. The second one is
// why the skill list shows LOCKED skills with the star that unlocks them — an
// ascension the player cannot see the payoff of is an ascension they postpone.

import { HEROES, HERO_BY_ID, CLASSES, SKILL_KINDS, heroArt, skillValue } from "../../../lib/heroes.js";
import {
  MAX_STARS,
  RECRUIT_SHARDS,
  activeSkills,
  heroPower,
  levelCapFor,
  levelCost,
  nextStepCost,
  patrolSlots,
  starsFor,
} from "../../../lib/heroProgress.js";
import { HERO_BLURB, VILLAGER_BLURB } from "../../../lib/villagers.js";
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
  const owned = save.heroes || {};
  const pending = save.pendingShards || {};
  const patrol = save.patrol || [];
  const slots = patrolSlots(save.buildings?.warroom || 0);

  // Owned first, then the ones you have shards toward, then the rest — so the
  // screen opens on what the player has rather than on what they have not.
  const list = [...HEROES].sort((a, b) => {
    const oa = owned[a.id] ? 2 : pending[a.id] ? 1 : 0;
    const ob = owned[b.id] ? 2 : pending[b.id] ? 1 : 0;
    if (oa !== ob) return ob - oa;
    if (RARITY_RANK[a.rarity] !== RARITY_RANK[b.rarity]) {
      return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <div className="tt-heroes-head">
        <div>
          <h2>Hero cats</h2>
          <p className="tt-p">{HERO_BLURB}</p>
          <p className="tt-p tt-vs-villager">
            Not to be confused with your <b>villagers</b> — {VILLAGER_BLURB.toLowerCase()}
          </p>
        </div>
        <div className="tt-heroes-btns">
          <button className="tt-btn" type="button" onClick={onOpenAlley}>
            <IconPaw size={17} /> The Long Alley
          </button>
          <button
            className={"tt-btn" + (litterLive ? "" : " alt")}
            type="button"
            onClick={onOpenLitter}
          >
            {litterLive ? "Lucky Litter is live" : "Lucky Litter"}
          </button>
        </div>
      </div>

      <div className="tt-patrol">
        <small>
          On patrol · {patrol.length} of {slots}
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
          Only cats on patrol count. The bench does nothing — the War Room raises
          how many may stand at once.
        </p>
      </div>

      <div className="tt-hero-grid">
        {list.map((h) => {
          const st = owned[h.id];
          const stars = starsFor(st?.steps || 0);
          const cap = levelCapFor(stars);
          const step = nextStepCost(st?.steps || 0);
          const shards = st?.shards || 0;
          const onDuty = patrol.includes(h.id);
          const art = heroArt(h.id, pool);
          const pend = pending[h.id] || 0;

          return (
            <article key={h.id} className={"tt-hero r-" + h.rarity + (st ? "" : " locked")}>
              <div className="tt-hero-face">
                {art ? <img src={art} alt="" /> : <span className="tt-hero-none" />}
                <span className="tt-hero-cls">{CLASSES[h.cls].name}</span>
              </div>

              <div className="tt-hero-body">
                <div className="tt-hero-name">
                  <b>{h.name}</b>
                  <span className={"tt-hero-tier r-" + h.rarity}>{h.rarity}</span>
                </div>

                {st ? (
                  <div className="tt-stars" aria-label={`${stars} of ${MAX_STARS} stars`}>
                    {Array.from({ length: MAX_STARS }).map((_, i) => (
                      <i key={i} className={i < stars ? "on" : ""} />
                    ))}
                    <em className="mono">
                      Lv {st.level} / {cap}
                    </em>
                  </div>
                ) : (
                  <p className="tt-hero-blurb">{h.blurb}</p>
                )}

                {st && (
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
                )}

                {st ? (
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
                      {onDuty ? "On patrol" : "Send"}
                    </button>
                  </div>
                ) : (
                  <div className="tt-hero-recruit">
                    <div className="tt-shard-bar">
                      <i style={{ width: `${Math.min(100, (pend / RECRUIT_SHARDS) * 100)}%` }} />
                    </div>
                    <small>
                      {pend} of {RECRUIT_SHARDS} shards to recruit
                    </small>
                  </div>
                )}

                {st && <span className="tt-hero-power mono">{heroPower(h, st)} power</span>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
