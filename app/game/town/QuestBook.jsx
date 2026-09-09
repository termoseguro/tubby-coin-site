"use client";

// THE TOWN BOOK — Kingshot's chapters, and it is actually a book now.
//
// It was an accordion: every chapter stacked in a list, all of them visible,
// all of them open-able. That is a spreadsheet with a story's name on it, and
// it threw away the one thing chapters are for — arriving ONE AT A TIME, so a
// new player opens the book and finds exactly today's job rather than forty
// tasks they cannot place themselves in.
//
// So: a bound book. It opens when you open it, it has a spine of chapters down
// the left and one chapter spread on the right, and turning to another chapter
// turns a page. Locked chapters are still on the spine — a book you cannot see
// the length of gives you nothing to look forward to — but they are shut, and
// they name the chapter that opens them.
//
// The tasks themselves never send the player somewhere else. They point at the
// upgrade they were going to do anyway and pay them for it, so every upgrade
// pays twice and nobody is ever lost.

import { useEffect, useRef, useState } from "react";
import { CHAPTERS, chapterState, currentChapter } from "../../../lib/townQuests";
import { RESOURCES } from "../../../lib/townEconomy";
import {
  IconBiscuit,
  IconCatnip,
  IconFish,
  IconGold,
  IconGoldFish,
  IconStone,
  IconTreat,
  IconWood,
} from "../icons";

const ICON = {
  fish: IconFish,
  wood: IconWood,
  stone: IconStone,
  catnip: IconCatnip,
  treats: IconBiscuit,
  coin: IconGold,
  gold: IconGoldFish,
};

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.floor(n)));

function Reward({ reward }) {
  return (
    <span className="tt-q-reward">
      {Object.entries(reward).map(([k, v]) => {
        const Icon = ICON[k];
        // A reward naming a resource with no icon used to take the whole book
        // down with "Element type is invalid". A missing icon is a cosmetic
        // gap; it should never be a crash.
        // COLOUR THE ICON, NOT THE NUMBER. The resource palette is pastel —
        // Fish is #5bb8e8, Wood is #c08b4f — which is right for a bar or a
        // swatch and unreadable as text on a cream page. The icon carries the
        // colour and the amount stays in ink, which is also better typography:
        // a row of numbers in five different colours is a row nobody scans.
        return (
          <span key={k}>
            {Icon ? (
              <i style={{ color: RESOURCES[k]?.color, display: "inline-flex" }}>
                <Icon size={15} />
              </i>
            ) : null}
            {fmt(v)}
          </span>
        );
      })}
    </span>
  );
}

export default function QuestBook({ save, onClaimTask, onClaimChapter, onClose }) {
  const states = CHAPTERS.map((ch) => [ch, chapterState(ch, save)]);
  const readyCount = (st) =>
    st.tasks.filter((t) => t.done && !t.claimed).length + (st.canClaimChapter ? 1 : 0);

  // Open on the first chapter that has something to TAKE, not merely the first
  // unfinished one — the reason anyone opens this book is to collect.
  const firstReady = states.find(([, st]) => readyCount(st) > 0 && !st.locked);
  const [open, setOpen] = useState((firstReady?.[0] ?? currentChapter(save)).id);

  // The cover opens once, on mount. `opening` drives it; a rAF flip rather than
  // a timeout so the browser has actually painted the closed state first —
  // without that the transition has nothing to animate from.
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpened(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Which way the page turns. Going forward in the book and going back should
  // not look the same, or the animation stops meaning anything.
  const [turn, setTurn] = useState(null);
  const prevIndex = useRef(CHAPTERS.findIndex((c) => c.id === open));
  const goTo = (id) => {
    const next = CHAPTERS.findIndex((c) => c.id === id);
    if (next === prevIndex.current) return;
    setTurn(next > prevIndex.current ? "fwd" : "back");
    prevIndex.current = next;
    setOpen(id);
  };
  useEffect(() => {
    if (!turn) return;
    const t = setTimeout(() => setTurn(null), 420);
    return () => clearTimeout(t);
  }, [turn, open]);

  const allReady = states.flatMap(([ch, st]) =>
    st.locked
      ? []
      : [
          ...st.tasks.filter((t) => t.done && !t.claimed).map((t) => ({ id: t.id, reward: t.reward })),
          ...(st.canClaimChapter ? [{ id: ch.id, reward: ch.reward, chapter: true }] : []),
        ]
  );

  const active = states.find(([ch]) => ch.id === open) || states[0];
  const [chapter, st] = active;

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section
        className={"tt-book2" + (opened ? " open" : "")}
        role="dialog"
        aria-label="Town Book"
        onClick={(e) => e.stopPropagation()}
      >
        {/* The cover, which swings away on open and is inert afterwards. */}
        <span className="tt-book2-cover" aria-hidden="true">
          <span className="tt-book2-crest">
            <IconGold size={30} />
          </span>
          <b>Town Book</b>
        </span>

        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="tt-book2-inner">
          {/* ---- left page: the spine of chapters ---- */}
          <nav className="tt-book2-spine" aria-label="Chapters">
            <h3>Town Book</h3>
            <p>Grow the town, get paid for it twice.</p>

            {allReady.length > 0 && (
              <button
                className="tt-btn tt-claimall"
                type="button"
                onClick={() =>
                  allReady.forEach((r) =>
                    r.chapter ? onClaimChapter(r.id, r.reward) : onClaimTask(r.id, r.reward)
                  )
                }
              >
                Claim all {allReady.length}
              </button>
            )}

            <ol className="tt-book2-list">
              {states.map(([ch, s2], i) => {
                const ready = readyCount(s2);
                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      className={
                        "tt-book2-tab" +
                        (ch.id === open ? " on" : "") +
                        (s2.locked ? " locked" : "") +
                        (s2.rewardClaimed ? " done" : "") +
                        (ready && !s2.locked ? " ready" : "")
                      }
                      onClick={() => !s2.locked && goTo(ch.id)}
                      disabled={s2.locked}
                      title={s2.locked ? `Finish ${s2.unlockedBy} first` : ch.name}
                    >
                      <em>{i}</em>
                      <span>{ch.name}</span>
                      {s2.locked ? (
                        <i className="tt-book2-lock" aria-label="Locked">
                          🔒
                        </i>
                      ) : ready > 0 ? (
                        <i className="tt-book2-dot">{ready}</i>
                      ) : (
                        <i className="mono tt-book2-frac">
                          {s2.done}/{s2.total}
                        </i>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* ---- right page: the chapter itself ---- */}
          <div className={"tt-book2-page" + (turn ? " turn-" + turn : "")} key={chapter.id}>
            <header className="tt-book2-head">
              <small>Chapter {CHAPTERS.indexOf(chapter)}</small>
              <h4>{chapter.name}</h4>
              <p>{chapter.blurb}</p>
            </header>

            <div className="tt-book2-tasks">
              {[...st.tasks]
                .sort(
                  (a, b) =>
                    Number(b.done && !b.claimed) - Number(a.done && !a.claimed) ||
                    Number(a.claimed) - Number(b.claimed)
                )
                .map((t) => (
                  <div
                    key={t.id}
                    className={
                      "tt-task" +
                      (t.claimed ? " claimed" : "") +
                      (t.done && !t.claimed ? " ready" : "")
                    }
                  >
                    <div className="tt-task-main">
                      <span className="tt-task-text">{t.text}</span>
                      {/* The WHY, not just the what. A tutorial that only says
                          which button to press teaches nothing, and the player
                          is left doing the right thing for no reason they
                          could repeat. */}
                      {t.hint && !t.claimed && <span className="tt-task-hint">{t.hint}</span>}
                      <div className="tt-task-bar">
                        <i style={{ width: `${t.pct * 100}%` }} />
                        <span className="mono">
                          {fmt(Math.min(t.at, t.goal))}/{fmt(t.goal)}
                        </span>
                      </div>
                    </div>
                    <div className="tt-task-side">
                      <Reward reward={t.reward} />
                      {t.claimed ? (
                        <span className="tt-task-done">Claimed</span>
                      ) : (
                        <button
                          className="tt-mini gold"
                          type="button"
                          disabled={!t.done}
                          onClick={() => onClaimTask(t.id, t.reward)}
                        >
                          {t.done ? "Claim" : "Locked"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div className={"tt-chapter-prize" + (st.canClaimChapter ? " ready" : "")}>
              <span>Chapter reward</span>
              <Reward reward={chapter.reward} />
              {st.rewardClaimed ? (
                <span className="tt-task-done">Claimed</span>
              ) : (
                <button
                  className="tt-mini gold"
                  type="button"
                  disabled={!st.canClaimChapter}
                  onClick={() => onClaimChapter(chapter.id, chapter.reward)}
                >
                  Claim
                </button>
              )}
            </div>

            {/* What the next chapter is. A book that does not say what comes
                next has no reason to be turned. */}
            {CHAPTERS[CHAPTERS.indexOf(chapter) + 1] && (
              <p className="tt-book2-next">
                {st.rewardClaimed ? "Next: " : "Finish this chapter to open "}
                <b>{CHAPTERS[CHAPTERS.indexOf(chapter) + 1].name}</b>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
