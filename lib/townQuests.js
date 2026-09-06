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
// ============================================================================

const lvl = (s, id) => s.buildings?.[id] || 1;
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
    reward: { gold: 40 },
    tasks: [
      { id: "c1t1", text: "Put a cat to work", goal: 1, at: (s) => assigned(s) , reward: { treats: 200 } },
      { id: "c1t2", text: "Grow the Cat Hall to level 2", goal: 2, at: (s) => lvl(s, "hall"), reward: { wood: 300, fish: 300 } },
      { id: "c1t3", text: "Hold 1,000 Wood", goal: 1000, at: (s) => s.res?.wood || 0, reward: { gold: 10 } },
      { id: "c1t4", text: "Adopt 3 cats", goal: 3, at: (s) => owned(s), reward: { treats: 400 } },
    ],
  },
  {
    id: "ch2",
    name: "Feeding the Town",
    blurb: "Cats eat every hour. A town that runs out of Fish crawls.",
    reward: { gold: 60 },
    tasks: [
      { id: "c2t1", text: "Grow the Kitchen to level 3", goal: 3, at: (s) => lvl(s, "kitchen"), reward: { fish: 800 } },
      { id: "c2t2", text: "Have 3 cats working", goal: 3, at: (s) => assigned(s), reward: { treats: 500 } },
      { id: "c2t3", text: "Hold 2,000 Fish", goal: 2000, at: (s) => s.res?.fish || 0, reward: { gold: 15 } },
      { id: "c2t4", text: "Grow the Nap House to level 2", goal: 2, at: (s) => lvl(s, "nap"), reward: { wood: 600, stone: 120 } },
    ],
  },
  {
    id: "ch3",
    name: "Building Up",
    blurb: "Wood and Stone are the backbone. The Storehouse is what keeps them.",
    reward: { gold: 90 },
    tasks: [
      { id: "c3t1", text: "Grow the Lumber Yard to level 3", goal: 3, at: (s) => lvl(s, "lumber"), reward: { wood: 900 } },
      { id: "c3t2", text: "Grow the Storehouse to level 3", goal: 3, at: (s) => lvl(s, "storehouse"), reward: { stone: 300 } },
      { id: "c3t3", text: "Grow the Cat Hall to level 4", goal: 4, at: (s) => lvl(s, "hall"), reward: { gold: 25 } },
      { id: "c3t4", text: "Adopt a Rare cat or better", goal: 1, at: (s) => ownedOf(s, ["rare", "epic", "legendary", "mythic"]), reward: { treats: 900 } },
    ],
  },
  {
    id: "ch4",
    name: "A Proper Town",
    blurb: "Stone, Catnip, and enough beds to keep everyone on shift.",
    reward: { gold: 140 },
    tasks: [
      { id: "c4t1", text: "Grow the Stone Quarry to level 4", goal: 4, at: (s) => lvl(s, "quarry"), reward: { stone: 500 } },
      { id: "c4t2", text: "Grow the Catnip Garden to level 3", goal: 3, at: (s) => lvl(s, "garden"), reward: { catnip: 120 } },
      { id: "c4t3", text: "Have 6 cats working", goal: 6, at: (s) => assigned(s), reward: { gold: 30 } },
      { id: "c4t4", text: "Grow the Treat Factory to level 4", goal: 4, at: (s) => lvl(s, "treats"), reward: { treats: 2000 } },
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
