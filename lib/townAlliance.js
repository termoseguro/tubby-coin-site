// ============================================================================
//  TUBBY TOWN — THE CLOWDER (alliance help)
//
//  Kingshot's single most-used social mechanic, and the reason its players open
//  the game five times a day. Researched before building:
//
//    "Every time you start a construction or research, you can request Alliance
//     Help, and every alliance member who taps Help reduces your timer — each
//     tap shaves roughly 1% off the remaining timer, minimum one minute. In an
//     active 50-member alliance, a single Help request can cut 8–12 hours off a
//     two-day research."
//
//    "Always send the help request the moment you start any timed task, and tap
//     help for others in return, since it earns you Alliance Tokens."
//
//  Two details carry the whole design and both are easy to get wrong:
//
//   1. THE FLOOR IS WHAT MAKES IT WORK. 1% of the remaining time sounds small,
//      but the one-minute minimum means fifty taps on a ten-minute job finish it
//      outright. Early timers evaporate; two-day research merely bends. So the
//      mechanic is generous exactly when a new player needs it and never
//      trivialises the late game.
//
//   2. HELPING PAYS THE HELPER. Tokens for tapping is why anyone taps. Without
//      that, help requests sit unanswered and the feature is decoration.
//
//  ---------------------------------------------------------------------------
//  ⚠ THE PROTOTYPE HAS NO OTHER PLAYERS
//
//  There is no server and no clowder yet, so nobody can actually tap. Rather
//  than fake a social feature — a screen full of invented cats "helping" is a
//  lie the player finds out about — the prototype gives the town a small set of
//  NEIGHBOURS who wander by and help on their own, and says so in the UI.
//
//  The maths below is the real thing and does not change when the server lands:
//  `helpReduction` and `applyHelp` are pure and will run server-side unchanged.
//  Only `neighbourTick` goes away, and it is the only thing in this file that
//  invents anything.
// ============================================================================

/** Fraction of the REMAINING time one tap removes, and the floor under it.
 *  The floor is the mechanic; the percentage is the balance. */
export const HELP_PERCENT = 0.01;
export const HELP_FLOOR_SECONDS = 60;

/** How many taps one job can take. Kingshot caps this at the alliance size;
 *  ours caps it so a single job cannot be erased by a busy day. */
export const MAX_HELPS_PER_JOB = 20;

/** Tokens the helper earns per tap. Spent in the Guild Hall once that exists. */
export const TOKENS_PER_HELP = 2;

/** Seconds one tap takes off a job with `secondsLeft` to run.
 *
 *  Note the max, not min: the floor RAISES small reductions rather than capping
 *  them. A ten-minute job loses a whole minute a tap; a two-day job loses about
 *  twenty-nine. That asymmetry is the entire reason the mechanic feels generous
 *  early and stays fair late. */
export function helpReduction(secondsLeft) {
  return Math.max(HELP_FLOOR_SECONDS, secondsLeft * HELP_PERCENT);
}

/** Apply one tap to a job, returning the new finishesAt and whether it landed.
 *  Refuses past the cap and refuses a job that is already done, so a burst of
 *  taps arriving at once cannot drive a timer negative. */
export function applyHelp(job, now = Date.now()) {
  if (!job) return { job, helped: false };
  const used = job.helps || 0;
  if (used >= MAX_HELPS_PER_JOB) return { job, helped: false };
  const left = (job.finishesAt - now) / 1000;
  if (left <= 0) return { job, helped: false };
  const cut = Math.min(left, helpReduction(left));
  return {
    job: { ...job, finishesAt: job.finishesAt - cut * 1000, helps: used + 1 },
    helped: true,
    cut,
  };
}

/** How much help a job has left to receive. */
export const helpsLeft = (job) => Math.max(0, MAX_HELPS_PER_JOB - (job?.helps || 0));

// ---------------------------------------------------------------------------
//  THE NEIGHBOURS — prototype only
//
//  Named, so the help feels like it came from someone. Deleted the day real
//  clowders exist; nothing else in this file depends on them.
// ---------------------------------------------------------------------------

export const NEIGHBOURS = [
  "Mimi", "Bolinha", "Frajola", "Nina", "Tigrinho", "Amora",
  "Pipoca", "Chico", "Mel", "Zoe", "Bartolomeu", "Salem",
];

/** A neighbour turns up about this often while a job is running. Slow enough
 *  that help is noticed rather than assumed. */
export const NEIGHBOUR_EVERY_MS = 22_000;

export function randomNeighbour() {
  return NEIGHBOURS[Math.floor(Math.random() * NEIGHBOURS.length)];
}
