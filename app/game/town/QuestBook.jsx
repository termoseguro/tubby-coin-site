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
  const [open, setOpen] = useState(currentChapter(save).id);

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

        <div className="tt-chapters">
          {CHAPTERS.map((ch) => {
            const st = chapterState(ch, save);
            const isOpen = open === ch.id;
            return (
              <div key={ch.id} className={"tt-chapter" + (st.rewardClaimed ? " done" : "")}>
                <button
                  className="tt-chapter-head"
                  type="button"
                  onClick={() => setOpen(isOpen ? null : ch.id)}
                >
                  <span className="tt-chapter-n">{ch.name}</span>
                  <span className="tt-chapter-p mono">
                    {st.done}/{st.total}
                  </span>
                  <span className="tt-chapter-caret">{isOpen ? "▾" : "▸"}</span>
                </button>

                {isOpen && (
                  <div className="tt-chapter-body">
                    <p className="tt-chapter-blurb">{ch.blurb}</p>

                    {st.tasks.map((t) => (
                      <div key={t.id} className={"tt-task" + (t.claimed ? " claimed" : "")}>
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
