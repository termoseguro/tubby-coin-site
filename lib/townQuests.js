// ============================================================================
//  TUBBY TOWN — THE TOWN BOOK
//
//  Kingshot's chapter missions, which its own guides call the spine of the early
//  game: "Complete chapter missions as soon as possible, as they unleash
//  buildings, overflow you with resources, and prompt advancement."
//
//  The trick is that the tasks ARE the town's own next moves. The book never
//  sends you somewhere else; it points at the thing you were about to do and
//  pays you for it. Two effects, both large:
//
//   · a new player is never lost, because the book is a ranked to-do list
//   · every upgrade pays twice, so upgrading feels better than it costs
//
//  ---------------------------------------------------------------------------
//  CHAPTER 0 IS THE TUTORIAL
//
//  Not a scripted overlay with a finger pointing at buttons — four tasks that
//  cannot be done wrong, in the order the systems actually arrive. By the end
//  the player has fitted furniture, put a villager to work, raised a building,
//  and watched the Cat Hall unlock the Kitchen. That is the whole game in
//  miniature, learned once with training wheels on.
//
//  Each task carries a `hint` explaining WHY, because a tutorial that says what
//  to tap teaches nothing.
//
//  ---------------------------------------------------------------------------
//  THE BOOK **IS** THE STATE OF GRACE
//
//  While the book is paying, the player is in abundance and can barely fail.
//  When it stops, the grace is over and normal pacing begins. So the payout
//  curve is not decoration — it IS the grace period, made measurable, and it
//  decays on purpose:
//
//      Ch0  First Steps       you cannot get stuck
//      Ch1  Feeding           still carried
//      Ch2  Cutting Stone     comfortable, first real waits
//      Ch3  New Cats          the book is help, not income
//      Ch4  Catnip            mostly on your own
//      Ch5  Standing Alone    the handoff, then the book is done
//
//  AND EVERY CHAPTER PAYS GOLD, which it did not. That was a real hole: Gold is
//  what furniture and hero levels cost — the two systems the tutorial exists to
//  teach — so a grace period that handed out none of it taught the player about
//  a shop they could not afford to enter.
//
//  Golden Fish stays deliberately small throughout: it teaches what the premium
//  currency is without ever becoming an income.
// ============================================================================

import { startLevel } from "./townEconomy.js";

/** A building's level, reading the same defaults the town does — 1 for the
 *  three buildings the town opens with, 0 for every plot. */
const lvl = (s, id) => s.buildings?.[id] ?? startLevel(id);

const assigned = (s) => Object.keys(s.assign || {}).length;
const heroes = (s) => Object.keys(s.heroes || {}).length;
const built = (s, ids) => ids.filter((id) => lvl(s, id) >= 1).length;

/** Cottages standing. Cottage 1 exists from the start whether or not the save
 *  has an entry for it, so it is counted explicitly. */
const cottages = (s) =>
  1 +
  Object.keys(s.buildings || {}).filter(
    (k) => k.startsWith("cottage") && k !== "cottage1" && s.buildings[k] > 0
  ).length;

/** Total furniture levels fitted anywhere in town. */
const furnitureFitted = (s) =>
  Object.values(s.furniture || {}).reduce(
    (a, items) => a + Object.values(items || {}).reduce((b, n) => b + n, 0),
    0
  );

/** Best star rank across the roster. */
const bestStars = (s) =>
  Math.max(0, ...Object.values(s.heroes || {}).map((h) => Math.floor((h.steps || 0) / 6)));

/** id must be stable forever — it is the claim key. */
export const CHAPTERS = [
  {
    id: "ch0",
    name: "First Steps",
    blurb: "A hall, a lumber yard, one cottage and one cat. Everything else is up to you.",
    reward: { coin: 300, gold: 10 },
    tasks: [
      {
        id: "c0t1",
        text: "Fit the Saw Bench in the Lumber Yard",
        hint: "Tap the Lumber Yard, then tap the price under Saw Bench. Furniture is what makes a building better — and some pieces must be fitted before the building itself can be raised.",
        goal: 1,
        at: (s) => s.furniture?.lumber?.toolA || 0,
        reward: { wood: 200, coin: 120 },
      },
      {
        id: "c0t2",
        text: "Put your cat to work in the Lumber Yard",
        hint: "Villagers live in cottages and stand inside buildings. A building with nobody in it barely produces.",
        goal: 1,
        at: (s) => assigned(s),
        reward: { wood: 250, fish: 150, coin: 120 },
      },
      {
        id: "c0t3",
        text: "Raise the Lumber Yard to level 2",
        hint: "Wood is the only thing your town makes right now, and everything is built out of it.",
        goal: 2,
        at: (s) => lvl(s, "lumber"),
        reward: { wood: 300, coin: 150 },
      },
      {
        id: "c0t4",
        text: "Raise the Cat Hall to level 2",
        hint: "The Cat Hall is what unlocks new buildings. Level 2 opens the Kitchen.",
        goal: 2,
        at: (s) => lvl(s, "hall"),
        reward: { wood: 400, fish: 300, coin: 250, gold: 5 },
      },
    ],
  },

  {
    id: "ch1",
    name: "Feeding the Town",
    blurb: "Cats eat every hour. A town that runs out of Fish crawls.",
    reward: { coin: 500, gold: 15 },
    tasks: [
      { id: "c1t1", text: "Build the Kitchen", hint: "It arrived with Cat Hall 2.", goal: 1, at: (s) => lvl(s, "kitchen"), reward: { wood: 300, fish: 200, coin: 200 } },
      { id: "c1t2", text: "Build a second Cat Cottage", hint: "Cottages are your population. More homes, more villagers, more buildings you can staff.", goal: 2, at: (s) => cottages(s), reward: { wood: 350, coin: 250 } },
      { id: "c1t3", text: "Fit a Food Bowl in a cottage", hint: "Bowls pay Gold every hour, and Gold is what furniture and hero levels cost.", goal: 1, at: (s) => Math.max(0, ...[1, 2, 3].map((i) => s.furniture?.[`cottage${i}`]?.bowl || 0)), reward: { coin: 400 } },
      { id: "c1t4", text: "Have 2 cats working", goal: 2, at: (s) => assigned(s), reward: { fish: 400, wood: 300, coin: 300 } },
      { id: "c1t5", text: "Raise the Cat Hall to level 3", hint: "Level 3 opens the Stone Quarry.", goal: 3, at: (s) => lvl(s, "hall"), reward: { wood: 500, fish: 400, coin: 400, gold: 5 } },
    ],
  },

  {
    id: "ch2",
    name: "Cutting Stone",
    blurb: "Wood builds. Stone is what everything past level 2 is made of.",
    reward: { coin: 900, gold: 20 },
    tasks: [
      { id: "c2t1", text: "Build the Stone Quarry", goal: 1, at: (s) => lvl(s, "quarry"), reward: { wood: 500, stone: 150, coin: 300 } },
      { id: "c2t2", text: "Raise the Kitchen to level 3", goal: 3, at: (s) => lvl(s, "kitchen"), reward: { fish: 600, wood: 400, coin: 350 } },
      { id: "c2t3", text: "Fit 8 pieces of furniture anywhere in town", hint: "Every building has things inside it, and each one is a small upgrade you can afford right now.", goal: 8, at: (s) => furnitureFitted(s), reward: { coin: 700 } },
      { id: "c2t4", text: "Raise the Cat Hall to level 4", hint: "Level 4 opens the Adoption Center — where cats come from.", goal: 4, at: (s) => lvl(s, "hall"), reward: { wood: 700, stone: 250, coin: 500, gold: 5 } },
    ],
  },

  {
    id: "ch3",
    name: "New Cats",
    blurb: "The Adoption Center is open. So is the Lucky Litter.",
    reward: { coin: 1600, gold: 25 },
    tasks: [
      { id: "c3t1", text: "Build the Adoption Center", goal: 1, at: (s) => lvl(s, "adoption"), reward: { treats: 400, coin: 400 } },
      { id: "c3t2", text: "Build the Treat Factory", hint: "Treats are what the Adoption Center runs on. It refines them out of Fish.", goal: 1, at: (s) => lvl(s, "treats"), reward: { fish: 700, coin: 400 } },
      { id: "c3t3", text: "Recruit your first hero cat", hint: "Heroes are not villagers — they never work inside a building. They lead the patrol and their skills pay the whole town at once.", goal: 1, at: (s) => heroes(s), reward: { coin: 900, gold: 10 } },
      { id: "c3t4", text: "Have 4 cats working", goal: 4, at: (s) => assigned(s), reward: { fish: 700, wood: 700, coin: 600 } },
      { id: "c3t5", text: "Raise the Cat Hall to level 5", hint: "Level 5 opens the Catnip Garden.", goal: 5, at: (s) => lvl(s, "hall"), reward: { wood: 900, stone: 400, coin: 800 } },
    ],
  },

  {
    id: "ch4",
    name: "Catnip and Company",
    blurb: "The rarest thing in town, and the buildings that keep it safe.",
    reward: { coin: 2600, gold: 30 },
    tasks: [
      { id: "c4t1", text: "Build the Catnip Garden", goal: 1, at: (s) => lvl(s, "garden"), reward: { catnip: 120, coin: 600 } },
      { id: "c4t2", text: "Take a hero to 1★", hint: "Duplicate pulls become shards, and shards are what ascension costs.", goal: 1, at: (s) => bestStars(s), reward: { coin: 1200 } },
      { id: "c4t3", text: "Clear stage 3 of the Long Alley", hint: "Every stage you clear raises your Gold, permanently.", goal: 3, at: (s) => s.conquest?.cleared || 0, reward: { coin: 1400, gold: 10 } },
      { id: "c4t4", text: "Build the Cat Clinic and the Watchtower", goal: 2, at: (s) => built(s, ["clinic", "watchtower"]), reward: { stone: 500, wood: 900, coin: 900 } },
      { id: "c4t5", text: "Raise the Cat Hall to level 7", goal: 7, at: (s) => lvl(s, "hall"), reward: { wood: 1400, stone: 600, catnip: 100, coin: 1200 } },
    ],
  },

  {
    id: "ch5",
    name: "Standing Alone",
    blurb: "The last chapter. After this the town pays its own way — and the book stops.",
    reward: { coin: 5000, gold: 50 },
    tasks: [
      { id: "c5t1", text: "Raise the Cat Hall to level 9", goal: 9, at: (s) => lvl(s, "hall"), reward: { wood: 1800, fish: 1500, coin: 1500 } },
      { id: "c5t2", text: "Build the Storehouse and the Study", goal: 2, at: (s) => built(s, ["storehouse", "study"]), reward: { stone: 900, coin: 1800 } },
      { id: "c5t3", text: "Have 8 cats working", goal: 8, at: (s) => assigned(s), reward: { fish: 1800, coin: 1500 } },
      { id: "c5t4", text: "Take a hero to 3★", goal: 3, at: (s) => bestStars(s), reward: { coin: 3000, gold: 15 } },
      { id: "c5t5", text: "Clear stage 10 of the Long Alley", hint: "Stage 10 is a chapter boss. Damage you deal to a boss is permanent, so a wall is something you chip at rather than bounce off.", goal: 10, at: (s) => s.conquest?.cleared || 0, reward: { coin: 4000, gold: 20 } },
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
