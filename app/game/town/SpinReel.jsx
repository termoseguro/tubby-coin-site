"use client";

// THE REEL — a case-opening animation.
//
// A gacha that resolves instantly gives the player a fact. The same result,
// arriving at the end of a strip that slows down as it passes the marker, gives
// them four seconds of not-knowing-yet, and that gap is the entire feeling.
// Clicking a button and reading a word does not do it.
//
// Two things make it work, and both are easy to get wrong:
//
//  1. THE RESULT IS DECIDED FIRST. The reel does not choose anything — it is
//     handed a winner and animates to it. That is not a shortcut, it is the
//     only honest way to build it: when this moves to the server the roll
//     happens there and this component is unchanged. An animation that decides
//     the outcome is an animation a player can win with a debugger.
//
//  2. THE DECELERATION IS THE DRAMA. A linear stop feels mechanical. The easing
//     here spends most of its time in the last fifth of the distance, so the
//     strip crawls past two or three cards at the end and you can see what it
//     might land on before it does. Near-misses are supposed to be visible.
//
// The strip is filled with real cards from the pool, weighted the way the wheel
// is, so what flies past is what could genuinely have come up.

import { useEffect, useMemo, useRef, useState } from "react";
import { HEROES, heroArt } from "../../../lib/heroes.js";
import { WHEELS } from "../../../lib/luckyLitter.js";

const CARD = 108; // px, including the gap — must match the CSS
const GAP = 10;
const STRIDE = CARD + GAP;

/** Where the winner sits in the strip. Far enough that the reel is at speed for
 *  a while, close enough to the end that a few cards are visible past it. */
const WINNER_AT = 46;
const STRIP = 54;

const RARITY_LABEL = {
  common: "Ordinary",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

/** Build the strip: filler drawn from what this wheel can actually produce,
 *  with the real winner dropped in at a fixed index.
 *
 *  Every card carries its own art rather than looking it up, because the
 *  ordinary-cat fillers are not heroes and have no hero art — they are just
 *  cats out of the pool, which is exactly what they represent. A strip of
 *  empty coloured rectangles is not a reel, it is a loading state. */
function buildStrip(wheelId, winner, pool, seed) {
  const odds = WHEELS[wheelId].odds;
  const commons = pool.filter((c) => c.rarity === "common" || c.rarity === "rare");
  const strays = commons.length ? commons : pool;

  const bag = [];
  for (const [rarity, pct] of Object.entries(odds)) {
    if (pct <= 0) continue;
    // Weighted by the printed odds but flattened: a strip of nothing but
    // commons is dull to watch, and seeing the rare cards go past IS the reel.
    const n = Math.max(2, Math.round(Math.sqrt(pct) * 3));
    const of = rarity === "common" ? [] : HEROES.filter((h) => h.rarity === rarity);
    for (let i = 0; i < n; i++) {
      if (of.length) {
        const h = of[(seed + i * 7) % of.length];
        bag.push({ name: h.name, rarity: h.rarity, art: heroArt(h.id, pool) });
      } else {
        const c = strays[(seed + i * 11) % (strays.length || 1)];
        bag.push({ name: "Stray", rarity: "common", art: c?.art || null });
      }
    }
  }

  const win = {
    name: winner.name,
    rarity: winner.rarity,
    art: winner.id === "stray" ? strays[seed % (strays.length || 1)]?.art : heroArt(winner.id, pool),
  };

  const strip = [];
  for (let i = 0; i < STRIP; i++) {
    strip.push(i === WINNER_AT ? win : bag[(seed + i * 13) % bag.length]);
  }
  return strip;
}

export default function SpinReel({ wheelId, result, pool = [], onDone }) {
  const [rolling, setRolling] = useState(true);
  const trackRef = useRef(null);

  // The card the reel is animating toward. `result.hero` is null for an
  // ordinary cat, so give that a card of its own rather than a hole.
  const winner = useMemo(
    () => result.hero || { id: "stray", name: "Ordinary cat", rarity: "common" },
    [result]
  );

  const seed = useMemo(() => Math.floor(Math.random() * 997), []);
  const strip = useMemo(
    () => buildStrip(wheelId, winner, pool, seed),
    [wheelId, winner, pool, seed]
  );

  // A little jitter so the marker does not land dead-centre every time. Landing
  // slightly off-centre reads as physical; landing perfectly reads as scripted.
  const jitter = useMemo(() => (seed % 40) - 20, [seed]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const width = el.parentElement.clientWidth;
    const target = -(WINNER_AT * STRIDE) + width / 2 - CARD / 2 + jitter;

    // Start a few cards back so there is somewhere to travel from.
    el.style.transition = "none";
    el.style.transform = "translate3d(0,0,0)";
    // Force a reflow, or the browser collapses both writes into one and nothing
    // animates at all.
    void el.offsetHeight;
    el.style.transition = "transform 4.4s cubic-bezier(0.12, 0.72, 0.06, 1)";
    el.style.transform = `translate3d(${target}px,0,0)`;

    const t = setTimeout(() => setRolling(false), 4500);
    return () => clearTimeout(t);
  }, [jitter]);

  return (
    <div className="tt-reel-wrap">
      <div className={"tt-reel" + (rolling ? " rolling" : " landed")}>
        <span className="tt-reel-mark" aria-hidden="true" />
        <div className="tt-reel-track" ref={trackRef}>
          {strip.map((c, i) => (
            <figure key={i} className={"tt-reel-card r-" + c.rarity}>
              {c.art ? (
                <img src={c.art} alt="" draggable="false" />
              ) : (
                <span className="tt-reel-blank" />
              )}
              <figcaption>{c.name}</figcaption>
            </figure>
          ))}
        </div>
        <span className="tt-reel-fade left" aria-hidden="true" />
        <span className="tt-reel-fade right" aria-hidden="true" />
      </div>

      {!rolling && (
        <div className={"tt-reel-out r-" + result.rarity}>
          <b>{RARITY_LABEL[result.rarity]}</b>
          <h4>{result.hero ? result.hero.name : "An ordinary cat"}</h4>
          {result.hero ? (
            <p>
              {result.hero.blurb}
              <br />
              <b>+{result.shards}</b> shards
              {result.recruited && " — enough to recruit them."}
            </p>
          ) : (
            <p>
              Not a hero, but not nothing: <b>+{result.shards * 25} Gold</b>.
            </p>
          )}
          {result.pity && <p className="tt-reel-pity">The counter came through.</p>}
          <button className="tt-btn" type="button" onClick={onDone}>
            Good
          </button>
        </div>
      )}

      {rolling && (
        <button className="tt-mini tt-reel-skip" type="button" onClick={() => setRolling(false)}>
          Skip
        </button>
      )}
    </div>
  );
}
