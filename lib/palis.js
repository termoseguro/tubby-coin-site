// ============================================================================
//  TUBBY TOWN — PALIS
//
//  Palis is not a boss you attack. He is what goes wrong while you are not
//  looking: he turns up overnight, knocks things off shelves, spooks the cats,
//  and leaves a mess for you to find. You come back, you sort it out, and the
//  town is better for it.
//
//  ---------------------------------------------------------------------------
//  WHY IT IS SHAPED LIKE THIS
//
//  Two mechanics from Hay Day, which is the reference here rather than Kingshot:
//
//   1. A PROBLEM IS AN OPPORTUNITY. Hay Day's obstacles — weeds, bushes, the
//      stumps in the way — pay you for clearing them. They are not damage; they
//      are chores with a reward attached. That single choice is the difference
//      between "I have to go fix my farm" and "I want to go fix my farm".
//
//   2. NEIGHBOURS CAN HELP. A wilting Hay Day tree is revived by a FRIEND
//      tapping it, and the friend gets something for it. Ours does the same
//      through the clowder, which finally gives the Guild Hall a job.
//
//  And one rule that is ours, because it is the line this design must not
//  cross:
//
//      PALIS NEVER TAKES PROGRESS. He takes TIME and a slice of the flow.
//      Nothing is destroyed, no building loses a level, no cat is lost, and no
//      stage un-clears. Coming back to a wrecked town is how a game loses the
//      player who was away for a week — which is the exact player this system
//      exists to bring back.
//
//  Everything he does is therefore a PAUSE with a reward for ending it. The
//  worst case for a player who ignores him completely is a slower town, never a
//  smaller one.
//
//  ⚠ Client-side, therefore advisory. Problem generation and rewards move to
//  the server before anything of value is attached — docs/security.md §1. In
//  particular the roll must not be re-rollable by reloading, which is exactly
//  what a client-side version allows.
// ============================================================================

import { BUILDING_BY_ID } from "./townConfig.js";

/** How often he turns up, and the most mess that can ever be waiting.
 *
 *  The cap is the important number. A player gone a fortnight must come back to
 *  a morning's work, not a punishment — so absence stops accumulating after
 *  MAX_PROBLEMS and everything past that simply never happened. */
export const VISIT_EVERY_HOURS = 6;
export const MAX_PROBLEMS = 5;

/** He does not show up at all until the town is worth bothering. Nobody should
 *  meet the antagonist during the tutorial. */
export const FIRST_VISIT_AT_HALL = 4;

// ---------------------------------------------------------------------------
//  WHAT HE DOES
//
//  Each kind names a building, states what it costs the player WHILE it stands,
//  and pays for being cleared. `weight` is how often it comes up.
// ---------------------------------------------------------------------------

export const PROBLEMS = {
  ransacked: {
    id: "ransacked",
    weight: 30,
    name: "Ransacked",
    what: "Palis got in and turned the place over.",
    effect: "This building produces nothing until it is tidied.",
    // A flat stop, but only on ONE building — the town keeps running.
    stops: true,
    fixSeconds: 90,
    fixCost: (lvl) => ({ wood: 60 + lvl * 40 }),
    reward: (lvl) => ({ coin: 120 + lvl * 60 }),
  },
  spooked: {
    id: "spooked",
    weight: 26,
    name: "Spooked",
    what: "He got in through the window and the cats have not settled.",
    effect: "The cats here work at half speed.",
    slows: 0.5,
    fixSeconds: 60,
    fixCost: (lvl) => ({ fish: 80 + lvl * 50 }),
    reward: (lvl) => ({ coin: 90 + lvl * 45 }),
  },
  blocked: {
    id: "blocked",
    weight: 20,
    name: "Door blocked",
    what: "He has dragged half the yard against the door.",
    effect: "Nobody can get in. No production, and the crew is stuck outside.",
    stops: true,
    fixSeconds: 120,
    fixCost: () => ({}),
    reward: (lvl) => ({ coin: 100 + lvl * 50 }),
  },
  pilfered: {
    id: "pilfered",
    weight: 16,
    name: "Pilfered",
    what: "He has been at the stores.",
    effect: "Some of what was here has already gone.",
    // The ONLY one that costs resources, and it is capped hard below.
    steals: true,
    fixSeconds: 45,
    fixCost: () => ({}),
    reward: (lvl) => ({ coin: 140 + lvl * 70 }),
  },
  tangled: {
    id: "tangled",
    weight: 8,
    name: "Tangled",
    what: "Everything is wound in string. Everything.",
    effect: "Builders work slower until it is unpicked.",
    slowsBuild: 0.35,
    fixSeconds: 100,
    fixCost: (lvl) => ({ wood: 40 + lvl * 30 }),
    reward: (lvl) => ({ coin: 110 + lvl * 55 }),
  },
};

/** How much a "pilfered" visit can take: a slice of ONE resource, hard-capped.
 *  Losing a percentage of a stockpile is how an idle game turns a holiday into
 *  a betrayal, so this is capped in absolute terms as well. */
export const STEAL_SHARE = 0.06;
export const STEAL_CAP_HOURS = 2;

// ---------------------------------------------------------------------------
//  HOW MUCH HE GETS AWAY WITH
//
//  Defences do not stop him turning up — a town where nothing ever happens is a
//  town nobody opens. They reduce how MANY problems he leaves, which is the
//  thing a player actually feels.
// ---------------------------------------------------------------------------

/** 0 to 1. Every point of it removes problems before they are created. */
export function defence(levels = {}, heroBonuses = {}) {
  const gate = (levels.gatehouse || 0) * 4;
  const tower = (levels.watchtower || 0) * 2.5;
  const guard = heroBonuses.guardUp || 0;
  return Math.min(0.75, (gate + tower + guard) / 100);
}

/** Visits owed since the last time we looked, capped. */
export function visitsDue(lastVisitAt, now = Date.now()) {
  if (!lastVisitAt) return 0;
  const hours = (now - lastVisitAt) / 3_600_000;
  return Math.max(0, Math.min(MAX_PROBLEMS, Math.floor(hours / VISIT_EVERY_HOURS)));
}

/** Buildings he could plausibly bother: ones that exist and do something. */
function targets(levels = {}) {
  return Object.keys(levels).filter(
    (id) => (levels[id] || 0) >= 1 && id !== "hall" && !BUILDING_BY_ID[id]?.cottage
  );
}

const pickWeighted = (rng) => {
  const all = Object.values(PROBLEMS);
  const total = all.reduce((a, p) => a + p.weight, 0);
  let r = rng() * total;
  for (const p of all) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return all[0];
};

/**
 * Work out what Palis did while the player was away.
 *
 * Pure and deterministic given an rng, so the server can run exactly this and
 * the client can render exactly that.
 */
export function generateVisits({ levels, existing = [], lastVisitAt, defenceLevel = 0 }, now = Date.now(), rng = Math.random) {
  if ((levels.hall || 0) < FIRST_VISIT_AT_HALL) return [];
  const due = visitsDue(lastVisitAt, now);
  if (due <= 0) return [];

  const room = MAX_PROBLEMS - existing.length;
  if (room <= 0) return [];

  const busy = new Set(existing.map((p) => p.building));
  const free = targets(levels).filter((id) => !busy.has(id));
  const out = [];

  for (let i = 0; i < Math.min(due, room, free.length); i++) {
    // Defence removes problems before they exist rather than making them
    // weaker: half a problem is not a thing a player can perceive.
    if (rng() < defenceLevel) continue;
    const building = free.splice(Math.floor(rng() * free.length), 1)[0];
    const kind = pickWeighted(rng);
    out.push({
      id: `${building}-${now}-${i}`,
      kind: kind.id,
      building,
      at: now - (due - i) * VISIT_EVERY_HOURS * 3_600_000,
      helps: 0,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
//  WHAT A STANDING PROBLEM DOES
// ---------------------------------------------------------------------------

/** The multiplier on one building's output, given the problems on it. */
export function outputMultiplier(problems = [], buildingId) {
  let m = 1;
  for (const p of problems) {
    if (p.building !== buildingId) continue;
    const k = PROBLEMS[p.kind];
    if (!k) continue;
    if (k.stops) return 0;
    if (k.slows) m *= k.slows;
  }
  return m;
}

/** The multiplier on build speed, town-wide. */
export function buildMultiplier(problems = []) {
  let m = 1;
  for (const p of problems) {
    const k = PROBLEMS[p.kind];
    if (k?.slowsBuild) m *= 1 - k.slowsBuild;
  }
  return m;
}

/** What it costs to sort one out, and what it pays. */
export function fixCost(problem, level = 1) {
  return PROBLEMS[problem.kind]?.fixCost(level) || {};
}
export function fixReward(problem, level = 1) {
  return PROBLEMS[problem.kind]?.reward(level) || {};
}
export function fixSeconds(problem) {
  return PROBLEMS[problem.kind]?.fixSeconds || 60;
}

// ---------------------------------------------------------------------------
//  NEIGHBOURS
//
//  Hay Day's friend-taps-your-wilting-tree, and the reason the Guild Hall
//  exists. Enough taps and the problem clears itself for free — which turns a
//  chore into a reason to be in a clowder.
// ---------------------------------------------------------------------------

export const HELPS_TO_CLEAR = 3;
export const helpsLeft = (p) => Math.max(0, HELPS_TO_CLEAR - (p.helps || 0));

/** A short line for the "Palis was here" card. Written as one sentence per
 *  problem because a list of five identical rows is not a story. */
export function summarise(problems = []) {
  if (!problems.length) return "Quiet night. Nothing out of place.";
  const byKind = {};
  for (const p of problems) byKind[p.kind] = (byKind[p.kind] || 0) + 1;
  const bits = Object.entries(byKind).map(([k, n]) =>
    n === 1 ? PROBLEMS[k].name.toLowerCase() : `${n} ${PROBLEMS[k].name.toLowerCase()}`
  );
  return `Palis has been in: ${bits.join(", ")}.`;
}
