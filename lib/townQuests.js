// ============================================================================
//  TUBBY TOWN — the quest book
//
//  Copied from Kingshot's structure: a book split into chapters, where the
//  tasks ARE the town's own upgrades. That is the trick — the quest list does
//  not send you somewhere else, it points at the thing you were going to do
//  anyway and pays you for it. Two effects, both large:
//
//   · a new player is never lost, because the book is a ranked to-do list
//   · every upgrade pays twice, so upgrading feels better than it costs
//
//  Each task reads the save and reports progress. Nothing is stored except
//  which task rewards have been claimed, so a task can never desync from the
//  state it describes.
//
//  ---------------------------------------------------------------------------
//  THE BOOK **IS** THE STATE OF GRACE
//
//  While the book is paying, the player is in abundance and can barely fail.
//  When it stops paying, the grace is over and normal pacing begins. So the
//  book's payout curve is not decoration — it IS the grace period, made
//  explicit and measurable.
//
//  Every chapter's rewards are set as a fraction of that chapter's own upgrade
//  costs — its "coverage" — and that fraction decays on purpose:
//
//      Ch1  Settling In      ~90%   you essentially cannot get stuck
//      Ch2  Feeding          ~65%   still comfortable, first real waits
//      Ch3  Building Up      ~42%   the book is now help, not income
//      Ch4  A Proper Town    ~25%   mostly on your own
//      Ch5  Standing Alone   ~12%   the handoff, then the book is done
//
//  The first draft went 76% / 76% / 9% / 6% — a cliff, not a taper. A player
//  who is carried for two chapters and then dropped does not feel challenged,
//  they feel cheated, and they leave. These numbers are computed from the real
//  cost functions in townEconomy.js; if those change, recompute these.
//
//  Golden Fish is deliberately small throughout: it teaches what the currency
//  is without ever being an income.
//
//  ---------------------------------------------------------------------------
//  THE BOOK ALSO TEACHES THE LADDER
//
//  Every building now unlocks at a Cat Hall level and every Cat Cottage houses
//  the villagers (see townConfig.js). Three tasks exist purely to walk a new
//  player through that: raise a cottage (ch1), build a THIRD cottage (ch3),
//  open the Cat Clinic (ch5). Each is the first time the player meets one of
//  the three ideas — homes, new plots, and buildings that arrive later.
// ============================================================================

// 0 means "not built yet" — the same reading the town itself uses, so a task
// can never claim credit for a building that does not exist.
const lvl = (s, id) => s.buildings?.[id] ?? 0;
const cottages = (s) =>
  Object.keys(s.buildings || {}).filter((k) => k.startsWith("cottage") && s.buildings[k] > 0).length;
const assigned = (s) => Object.keys(s.assign || {}).length;
const owned = (s) => Object.keys(s.cats || {}).length;
const ownedOf = (s, rarities) =>
  Object.values(s.cats || {}).filter((c) => rarities.includes(c.rarity)).length;

/** id must be stable forever — it is the claim key. */
export const CHAPTERS = [
  {
    id: "ch1",
    name: "Settling In",
    blurb: "Get the first cats working and the first walls up.",
    reward: { gold: 25 },
    tasks: [
      { id: "c1t1", text: "Put a cat to work", goal: 1, at: (s) => assigned(s), reward: { wood: 150, fish: 100 } },
      { id: "c1t2", text: "Grow the Cat Hall to level 2", goal: 2, at: (s) => lvl(s, "hall"), reward: { wood: 150, fish: 100 } },
      { id: "c1t3", text: "Hold 800 Wood", goal: 800, at: (s) => s.res?.wood || 0, reward: { fish: 100, treats: 250 } },
      { id: "c1t4", text: "Adopt 3 cats", goal: 3, at: (s) => owned(s), reward: { wood: 100, treats: 350, gold: 10 } },
      { id: "c1t5", text: "Raise a Cat Cottage to level 2", goal: 2, at: (s) => Math.max(lvl(s, "cottage1"), lvl(s, "cottage2")), reward: { wood: 200, fish: 150 } },
    ],
  },
  {
    id: "ch2",
    name: "Feeding the Town",
    blurb: "Cats eat every hour. A town that runs out of Fish crawls.",
    reward: { gold: 30 },
    tasks: [
      { id: "c2t1", text: "Grow the Kitchen to level 3", goal: 3, at: (s) => lvl(s, "kitchen"), reward: { wood: 250, fish: 200 } },
      { id: "c2t2", text: "Have 2 cats working", goal: 2, at: (s) => assigned(s), reward: { fish: 200, treats: 400 } },
      { id: "c2t3", text: "Hold 1,500 Fish", goal: 1500, at: (s) => s.res?.fish || 0, reward: { wood: 200, stone: 50 } },
      { id: "c2t4", text: "Build a third Cat Cottage", goal: 3, at: (s) => cottages(s), reward: { wood: 200, fish: 150, stone: 50, gold: 10 } },

    ],
  },
  {
    id: "ch3",
    name: "Building Up",
    blurb: "Wood and Stone are the backbone. The Storehouse is what keeps them.",
    reward: { gold: 40 },
    tasks: [
      { id: "c3t1", text: "Grow the Lumber Yard to level 3", goal: 3, at: (s) => lvl(s, "lumber"), reward: { wood: 900, fish: 700 } },
      { id: "c3t2", text: "Grow the Storehouse to level 3", goal: 3, at: (s) => lvl(s, "storehouse"), reward: { wood: 900, fish: 700, stone: 200 } },
      { id: "c3t3", text: "Grow the Cat Hall to level 4", goal: 4, at: (s) => lvl(s, "hall"), reward: { wood: 900, fish: 900, stone: 400 } },
      { id: "c3t4", text: "Adopt a Rare cat or better", goal: 1, at: (s) => ownedOf(s, ["rare", "epic", "legendary", "mythic"]), reward: { treats: 900, gold: 15 } },
      { id: "c3t5", text: "Build a fourth Cat Cottage", goal: 4, at: (s) => cottages(s), reward: { wood: 700, fish: 500, stone: 150 } },
    ],
  },
  {
    id: "ch4",
    name: "A Proper Town",
    blurb: "Stone, Catnip, and enough beds to keep everyone on shift.",
    reward: { gold: 50 },
    tasks: [
      { id: "c4t1", text: "Grow the Stone Quarry to level 4", goal: 4, at: (s) => lvl(s, "quarry"), reward: { wood: 450, stone: 150 } },
      { id: "c4t2", text: "Grow the Catnip Garden to level 3", goal: 3, at: (s) => lvl(s, "garden"), reward: { fish: 400, catnip: 60 } },
      { id: "c4t3", text: "Have 4 cats working", goal: 4, at: (s) => assigned(s), reward: { fish: 400, treats: 1200 } },
      { id: "c4t4", text: "Grow the Treat Factory to level 4", goal: 4, at: (s) => lvl(s, "treats"), reward: { wood: 850, fish: 300, stone: 100, gold: 15 } },

    ],
  },
  {
    id: "ch5",
    name: "Standing Alone",
    blurb: "The last chapter. After this the town pays its own way — and the book stops.",
    reward: { gold: 80 },
    tasks: [
      { id: "c5t1", text: "Grow the Cat Hall to level 6", goal: 6, at: (s) => lvl(s, "hall"), reward: { wood: 900, fish: 800 } },
      { id: "c5t2", text: "Grow the Storehouse to level 5", goal: 5, at: (s) => lvl(s, "storehouse"), reward: { wood: 800, fish: 600, stone: 300 } },
      { id: "c5t3", text: "Have 6 cats working", goal: 6, at: (s) => assigned(s), reward: { fish: 600, stone: 250, catnip: 100 } },
      { id: "c5t4", text: "Adopt an Epic cat or better", goal: 1, at: (s) => ownedOf(s, ["epic", "legendary", "mythic"]), reward: { wood: 700, treats: 2500, gold: 20 } },
      { id: "c5t5", text: "Open the Cat Clinic", goal: 1, at: (s) => lvl(s, "clinic"), reward: { wood: 900, fish: 700, stone: 350, gold: 25 } },
    ],
  },
];

/** Progress on one task, clamped. */
export function taskProgress(task, save) {
  const at = Math.max(0, task.at(save));
  return { at, goal: task.goal, done: at >= task.goal, pct: Math.min(1, at / task.goal) };
}

/** A chapter is claimable when every task in it has been claimed. */
export function chapterState(chapter, save) {
  const claimed = save.claimed || {};
  const tasks = chapter.tasks.map((t) => ({
    ...t,
    ...taskProgress(t, save),
    claimed: !!claimed[t.id],
  }));
  const allClaimed = tasks.every((t) => t.claimed);
  return {
    tasks,
    done: tasks.filter((t) => t.claimed).length,
    total: tasks.length,
    complete: allClaimed,
    rewardClaimed: !!claimed[chapter.id],
    canClaimChapter: allClaimed && !claimed[chapter.id],
  };
}

/** The chapter the player is actually on — the first unfinished one. */
export function currentChapter(save) {
  return CHAPTERS.find((c) => !chapterState(c, save).rewardClaimed) || CHAPTERS[CHAPTERS.length - 1];
}

/** How many rewards are sitting unclaimed right now. Drives the badge on the
 *  book, which is the whole reason anyone opens it. */
export function claimableCount(save) {
  let n = 0;
  for (const c of CHAPTERS) {
    const st = chapterState(c, save);
    n += st.tasks.filter((t) => t.done && !t.claimed).length;
    if (st.canClaimChapter) n += 1;
  }
  return n;
}
