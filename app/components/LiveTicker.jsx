"use client";

import { useEffect, useState } from "react";
import { config } from "../../lib/config";
import { CATS, pick } from "../../lib/siteArt";

/**
 * The little cards that rise in the corner.
 *
 * WHAT THIS DELIBERATELY IS NOT: the "🔥 Lucas from Recife just bought!"
 * pattern from course-selling landing pages. Those are fabricated events —
 * invented people doing things that never happened — and on this project they
 * would be self-defeating in a way they are not on a course page:
 *
 *   - The entire pitch is "on-chain, not on-trust". Every number on this site
 *     is checkable against Solana. A rising feed of unverifiable purchases in
 *     the corner is the one element on the page that contradicts the thesis,
 *     and it is the first thing a hostile thread would screenshot.
 *   - The coin is not launched. There are no buyers yet. A feed of them is not
 *     "social proof", it is a false claim about a thing that has not happened.
 *   - It sits inches away from a charity claim. Anyone who catches the buyer
 *     feed being fake now has a reason to assume the donations are too, and
 *     that is the accusation the whole design exists to make impossible.
 *
 * So it keeps the exact visual behaviour — cards rising, cat portraits, motion
 * in the corner — and feeds it things that are TRUE: what the fee split does,
 * what the first delivery buys, what the collection is. Facts about the
 * project, presented as facts about the project.
 *
 * AFTER LAUNCH this becomes genuinely live: `buildLiveEvents()` is where real
 * swaps read from DexScreener/RPC get formatted into the same cards, and then
 * the feed is real social proof rather than a claim about one.
 */

const FACTS = [
  {
    icon: "🧡",
    title: `${config.feeSplit.care}% of every creator fee`,
    sub: "becomes diapers, formula, medicine and food",
  },
  {
    icon: "🍼",
    title: "The first run",
    sub: config.milestones[0].items,
  },
  {
    icon: "📦",
    title: "Goods, never cash",
    sub: "bought, delivered in person, signed for",
  },
  {
    icon: "🐱",
    title: "20,000 hand-drawn cats",
    sub: "public domain since 2022 — remix them all",
  },
  {
    icon: "🚫",
    title: "0% presale · 0% team",
    sub: "100% of the supply went out on the curve",
  },
  {
    icon: "🧾",
    title: "Five public wallets",
    sub: "the split is a protocol setting, not a promise",
  },
  {
    icon: "🔥",
    title: "Supply only goes down",
    sub: "every burn published with its transaction",
  },
  {
    icon: "📍",
    title: "Rio de Janeiro",
    sub: "where every delivery is handed over in person",
  },
];

/**
 * Placeholder for the post-launch feed. Returns [] until there is a contract to
 * read, which is why the component falls back to FACTS. Wire it to real swaps
 * (DexScreener /latest/dex/tokens/<CA>) — never to invented ones.
 */
function buildLiveEvents() {
  return [];
}

export default function LiveTicker() {
  const [shown, setShown] = useState([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const live = buildLiveEvents();
    const feed = live.length ? live : FACTS;
    const avatars = pick(CATS, feed.length, 11);

    let i = 0;
    let timer;

    const push = () => {
      const item = feed[i % feed.length];
      const id = Date.now() + i;
      const avatar = avatars[i % avatars.length];
      i++;

      setShown((s) => [...s, { ...item, id, avatar }].slice(-3));

      // mark it leaving, then drop it — two steps so the exit animation runs
      setTimeout(() => {
        setShown((s) => s.map((t) => (t.id === id ? { ...t, out: true } : t)));
        setTimeout(() => setShown((s) => s.filter((t) => t.id !== id)), 450);
      }, 5200);

      timer = setTimeout(push, 4200 + Math.random() * 2600);
    };

    // let the hero land before anything starts moving in the corner
    timer = setTimeout(push, 3200);
    return () => clearTimeout(timer);
  }, []);

  if (!shown.length) return null;

  return (
    <div className="ticker" aria-live="polite" aria-label="Project facts">
      {shown.map((t) => (
        <div className={`toast${t.out ? " out" : ""}`} key={t.id}>
          {t.avatar ? (
            <span className="av">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.avatar} alt="" width={40} height={40} loading="lazy" />
            </span>
          ) : (
            <span className="av emoji">{t.icon}</span>
          )}
          <span className="tx">
            <b>
              {t.icon} {t.title}
            </b>
            <span>{t.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
