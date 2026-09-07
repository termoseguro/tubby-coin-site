"use client";

// The quest book, in Kingshot's shape: chapters, and the tasks inside them are
// the town's own upgrades. It never sends the player somewhere else — it points
// at what they were going to do anyway and pays them for it, so every upgrade
// pays twice and a new player is never lost.

import { useState } from "react";
import { CHAPTERS, chapterState, currentChapter } from "../../../lib/townQuests";
import { RESOURCES } from "../../../lib/townEconomy";
import {
  IconBiscuit,
  IconCatnip,
  IconFish,
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
  gold: IconGoldFish,
};

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.floor(n)));

function Reward({ reward }) {
  return (
    <span className="tt-q-reward">
      {Object.entries(reward).map(([k, v]) => {
        const Icon = ICON[k];
        return (
          <span key={k} style={{ color: RESOURCES[k]?.color }}>
            <Icon size={15} /> {fmt(v)}
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

  // Open on the first chapter that has something to take, not merely the first
  // unfinished one — the reason anyone opens this book is to collect.
  const firstReady = states.find(([, st]) => readyCount(st) > 0);
  const [open, setOpen] = useState((firstReady?.[0] ?? currentChapter(save)).id);

  const allReady = states.flatMap(([ch, st]) => [
    ...st.tasks.filter((t) => t.done && !t.claimed).map((t) => ({ id: t.id, reward: t.reward })),
    ...(st.canClaimChapter ? [{ id: ch.id, reward: ch.reward }] : []),
  ]);

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section className="tt-sheet tt-book" role="dialog" aria-label="Quests" onClick={(e) => e.stopPropagation()}>
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <header className="tt-sheet-head">
          <span className="tt-sheet-swatch" style={{ background: "#f2b33d" }} />
          <div>
            <h3>Town Book</h3>
            <p className="tt-sheet-lvl">Grow the town, get paid for it twice</p>
          </div>
        </header>

        {allReady.length > 0 && (
          <button
            className="tt-btn tt-claimall"
            type="button"
            onClick={() => allReady.forEach((r) => onClaimTask(r.id, r.reward))}
          >
            Claim all {allReady.length} ready
          </button>
        )}

        <div className="tt-chapters">
          {states.map(([ch, st]) => {
            const isOpen = open === ch.id;
            const ready = readyCount(st);
            return (
              <div
                key={ch.id}
                className={
                  "tt-chapter" + (st.rewardClaimed ? " done" : "") + (ready ? " ready" : "")
                }
              >
                <button
                  className="tt-chapter-head"
                  type="button"
                  onClick={() => setOpen(isOpen ? null : ch.id)}
                >
                  <span className="tt-chapter-n">{ch.name}</span>
                  {ready > 0 && <span className="tt-chapter-badge">{ready} ready</span>}
                  <span className="tt-chapter-p mono">
                    {st.done}/{st.total}
                  </span>
                  <span className="tt-chapter-caret">{isOpen ? "▾" : "▸"}</span>
                </button>

                {isOpen && (
                  <div className="tt-chapter-body">
                    <p className="tt-chapter-blurb">{ch.blurb}</p>

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

                    <div className={"tt-chapter-prize" + (st.canClaimChapter ? " ready" : "")}>
                      <span>Chapter reward</span>
                      <Reward reward={ch.reward} />
                      {st.rewardClaimed ? (
                        <span className="tt-task-done">Claimed</span>
                      ) : (
                        <button
                          className="tt-mini gold"
                          type="button"
                          disabled={!st.canClaimChapter}
                          onClick={() => onClaimChapter(ch.id, ch.reward)}
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
