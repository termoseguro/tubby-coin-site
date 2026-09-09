// THE AUTHORITY.
//
// One principle, and everything here is a consequence of it:
//
//   > The client is a renderer, not a source of truth. The server never
//   > accepts a number from the client — only an intent.
//
// So this module takes an INTENT ("start building the Kitchen"), loads the
// town the server has on record, checks the whole precondition set itself,
// applies the change using the SAME pure rules the client renders with, and
// writes back with an optimistic-concurrency check.
//
// WHY IT REUSES lib/ RATHER THAN RE-IMPLEMENTING THE ECONOMY IN SQL. Two copies
// of the rules is two sets of rules, and they drift on the first change. The
// modules in lib/ are pure ES modules with no browser dependency — there is a
// check script, `npm run check:server`, whose entire job is to keep them that
// way — so the server can run the exact same `upgradeCostFor`, `storeCap` and
// `effectiveRate` the town screen uses. Postgres stores state and enforces
// uniqueness. It does not know what a Kitchen is.
//
// WHAT THE CLIENT MAY SEND: an intent name from a closed list, and a few
// bounded scalars. No amounts, no timestamps, no elapsed seconds. The endpoint
// for production takes no `elapsed` parameter at all, because there is no
// version of trusting one that is safe.

import "server-only";
import { db } from "./db.js";
import { int, oneOf, token, userError } from "./guard.js";
import { BUILDINGS, BUILDING_BY_ID } from "../townConfig.js";
import {
  PRODUCERS,
  addCapped,
  buildSecondsFor,
  canAfford,
  catPower,
  effectiveRate,
  goldPerHour,
  isUnlocked,
  maxLevelFor,
  slotsIn,
  unmetRequirements,
  upgradeCostFor,
  upkeepPerHour,
  villagerCap,
  workersAllowed,
} from "../townEconomy.js";
import { furnitureGate } from "../townFurniture.js";
import { ALLEY_IDLE_CAP_HOURS, alleyIdleRate } from "../conquest.js";
import { KEY_FAUCET, keysAccrued } from "../luckyLitter.js";
import { freshSave } from "../newTown.js";

const BUILDING_IDS = BUILDINGS.map((b) => b.id);

/** Every intent this game accepts. A closed list, checked before anything
 *  else happens — an endpoint that dispatches on a client string without one
 *  of these is an endpoint that will one day dispatch on `__proto__`. */
export const INTENTS = [
  "sync",
  "start_upgrade",
  "assign",
  "unassign",
  "collect_alley",
];

const lvl = (state, id) => state.buildings?.[id] ?? 0;
const nowMs = () => Date.now();

// ---------------------------------------------------------------------------
//  LOAD
// ---------------------------------------------------------------------------

/** The town row, creating it on first sight.
 *
 *  A NEW TOWN IS A REAL TOWN. This inserted `{}` at first, which gave a
 *  signed-in player an empty object: no starting resources, no Cat Hall, no
 *  villager, no starter heroes — a game that could not be played and could not
 *  be diagnosed either, because nothing errored. `freshSave()` is the same
 *  function the guest game uses (lib/newTown.js), so both sides start the same
 *  game. */
export async function loadTown(playerId) {
  const row = await db.one("towns", `player_id=eq.${playerId}&select=*`);
  if (row) return row;
  const [made] = await db.insert("towns", { player_id: playerId, state: freshSave() });
  return made;
}

// ---------------------------------------------------------------------------
//  THE SERVER CLOCK
//
//  Everything time-based is computed here from the server's own columns. The
//  client never says how long it has been. Three separate clocks, because they
//  cap differently and a single `last_seen` would let one refill another.
// ---------------------------------------------------------------------------

/** What the town produced, ate, and was given, between its stored clock and
 *  now. Mutates a COPY and returns it along with the new clock values. */
function advanceClock(row) {
  const state = structuredClone(row.state || {});
  const now = nowMs();
  const tickAt = new Date(row.last_tick_at).getTime();
  const seconds = Math.max(0, (now - tickAt) / 1000);

  state.res = state.res || {};
  state.buildings = state.buildings || {};
  state.assign = state.assign || {};
  state.cats = state.cats || {};

  // ---- production, from the server's own elapsed time ----------------------
  if (seconds > 0) {
    const hours = seconds / 3600;
    const gains = {};
    const crewPowerAt = (id) =>
      Object.entries(state.assign)
        .filter(([, b]) => b === id)
        .reduce((a, [k]) => {
          const c = state.cats[k];
          return a + (c ? catPower(c.rarity, c.level || 1) : 0);
        }, 0);

    const kitchen = lvl(state, "kitchen");
    const eaten = kitchen < 1 ? 0 : upkeepPerHour(Object.keys(state.assign).length) * hours;
    const starving = (state.res.fish || 0) <= 0;

    for (const id of Object.keys(PRODUCERS)) {
      if (lvl(state, id) < 1) continue;
      const perHour = effectiveRate(id, lvl(state, id), {
        power: crewPowerAt(id),
        starving,
        furniture: 0,
      });
      gains[PRODUCERS[id].res] = (gains[PRODUCERS[id].res] || 0) + perHour * hours;
    }
    gains.coin = (gains.coin || 0) + goldPerHour(state, state.buildings) * hours;

    const { res } = addCapped(state.res, gains, lvl(state, "storehouse"), lvl(state, "hall"));
    state.res = res;
    if (eaten > 0) state.res.fish = Math.max(0, (state.res.fish || 0) - eaten);
  }

  // ---- builds that finished while away -------------------------------------
  // `finishes_at` is a SERVER timestamp written when the build started. The
  // client never tells us a build is done; it asks, and this answers.
  const jobs = { ...(state.jobs || {}) };
  for (const [id, job] of Object.entries(jobs)) {
    if (job?.finishesAt && job.finishesAt <= now) {
      state.buildings[id] = job.toLevel;
      delete jobs[id];
    }
  }
  state.jobs = jobs;

  // ---- the key faucet ------------------------------------------------------
  const keys = { ...(state.keys || {}) };
  const clocks = {
    silver: new Date(row.silver_key_at).getTime(),
    gold: new Date(row.gold_key_at).getTime(),
  };
  for (const kind of ["silver", "gold"]) {
    const { got, at } = keysAccrued(kind, clocks[kind], now, keys[kind] || 0);
    if (got > 0) keys[kind] = (keys[kind] || 0) + got;
    clocks[kind] = at;
  }
  state.keys = keys;

  return {
    state,
    clocks: {
      last_tick_at: new Date(now).toISOString(),
      silver_key_at: new Date(clocks.silver).toISOString(),
      gold_key_at: new Date(clocks.gold).toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
//  THE INTENTS
//
//  Each one validates its own preconditions against the SERVER's state. Not
//  one of them trusts a cost, a level, a timer or an amount from the request.
// ---------------------------------------------------------------------------

const HANDLERS = {
  /** Nothing but the clock. This is what the client polls. */
  sync: () => ({}),

  /** Build or upgrade. The client names the building; the server decides
   *  whether that is legal, what it costs and how long it takes. */
  start_upgrade(state, args, row) {
    const id = oneOf(args.building, BUILDING_IDS, "building");
    const level = lvl(state, id);
    const hall = lvl(state, "hall");

    if (!isUnlocked(id, hall)) throw bad(`The ${BUILDING_BY_ID[id].name} is not unlocked yet.`);
    if (level >= maxLevelFor(id, hall)) throw bad("The Cat Hall has to come first.");
    if (state.jobs?.[id]) throw bad("That building is already under way.");
    if (unmetRequirements(id, level, state.buildings).length) throw bad("Something else has to be raised first.");
    if (level >= 1 && furnitureGate(state, id, level).length) throw bad("Fit its furniture first.");

    // Builder availability, checked HERE and in the same read that spends —
    // otherwise two concurrent requests each see one free builder.
    const busy = Object.keys(state.jobs || {}).length;
    const builders = int(state.builders ?? 1, { min: 1, max: 5, name: "builders" });
    if (busy >= builders) throw bad("Every builder is busy.");

    const cost = upgradeCostFor(id, level);
    if (!canAfford(cost, state.res)) throw bad("Not enough resources.");

    const res = { ...state.res };
    for (const [k, v] of Object.entries(cost)) res[k] = (res[k] || 0) - v;

    const seconds = buildSecondsFor(id, level);
    return {
      state: {
        ...state,
        res,
        jobs: {
          ...(state.jobs || {}),
          // A SERVER timestamp. This is the whole defence against "client
          // claims a build finished".
          [id]: { toLevel: level + 1, startedAt: nowMs(), finishesAt: nowMs() + seconds * 1000 },
        },
      },
      result: { building: id, finishesAt: nowMs() + seconds * 1000 },
    };
  },

  /** Put a villager to work. Both ids are checked against what the SERVER says
   *  this player owns — a cat id from the body is never trusted. */
  assign(state, args) {
    const catKey = token(args.cat, { name: "cat", max: 120 });
    const id = oneOf(args.building, BUILDING_IDS, "building");
    if (!state.cats?.[catKey]) throw bad("That is not one of your cats.");
    if (!PRODUCERS[id]) throw bad("Nobody works there.");
    if (lvl(state, id) < 1) throw bad("That building does not exist yet.");

    const seats = slotsIn(state.buildingSlots?.[id] || 0, lvl(state, id));
    const here = Object.values(state.assign || {}).filter((b) => b === id).length;
    if (here >= seats) throw bad("That building is full.");

    const cap = Math.min(workersAllowed(lvl(state, "hall")), villagerCap(state.buildings, state));
    const working = Object.keys(state.assign || {}).length;
    if (!state.assign?.[catKey] && working >= cap) throw bad("The Cat Hall will not allow more at work.");

    return { state: { ...state, assign: { ...(state.assign || {}), [catKey]: id } } };
  },

  unassign(state, args) {
    const catKey = token(args.cat, { name: "cat", max: 120 });
    if (!state.assign?.[catKey]) return {};
    const assign = { ...state.assign };
    delete assign[catKey];
    return { state: { ...state, assign } };
  },

  /** Empty the Alley's purse. The amount is computed from the server's own
   *  `alley_collected_at`, capped at twelve hours, and the clock is reset in
   *  the same write. Spamming this yields nothing after the first call. */
  collect_alley(state, args, row) {
    const cleared = state.conquest?.cleared || 0;
    const rate = alleyIdleRate(cleared);
    const since = new Date(row.alley_collected_at).getTime();
    const hours = Math.min(ALLEY_IDLE_CAP_HOURS, Math.max(0, (nowMs() - since) / 3_600_000));
    const coin = Math.floor(rate * hours);

    const { res } = addCapped(
      state.res,
      { coin },
      lvl(state, "storehouse"),
      lvl(state, "hall")
    );
    return {
      state: { ...state, res },
      clocks: { alley_collected_at: new Date(nowMs()).toISOString() },
      result: { coin },
    };
  },
};

/** Every message here is written FOR a player, so it is marked safe to show.
 *  Anything not marked is masked by errorBody — see lib/server/guard.js. */
const bad = (message) => userError(message);

// ---------------------------------------------------------------------------
//  APPLY
// ---------------------------------------------------------------------------

/**
 * Run one intent against the server's town.
 *
 * The write is conditional on the version we read. If another request changed
 * the town in between, zero rows come back and this throws — the caller
 * retries. That is what stops two concurrent requests both spending the same
 * Gold, and it is a database constraint rather than an `if`.
 */
export async function applyIntent(playerId, intentName, args = {}) {
  const intent = oneOf(intentName, INTENTS, "intent");
  const row = await loadTown(playerId);

  // Time passes before the intent, always. A build that finished while the
  // player was away has to be standing before they can upgrade it again.
  const advanced = advanceClock(row);
  let state = advanced.state;
  let clocks = advanced.clocks;
  let result = null;

  try {
    const out = HANDLERS[intent](state, args, row) || {};
    if (out.state) state = out.state;
    if (out.clocks) clocks = { ...clocks, ...out.clocks };
    if (out.result) result = out.result;
  } catch (e) {
    await log(playerId, intent, args, row.version, null, false, e.message);
    throw e;
  }

  const next = row.version + 1;
  const written = await db.update(
    "towns",
    // The version guard. `eq.${row.version}` is the whole of optimistic
    // concurrency: a stale writer matches no rows and loses.
    `player_id=eq.${playerId}&version=eq.${row.version}`,
    { state, version: next, updated_at: new Date().toISOString(), ...clocks }
  );

  if (!written || written.length !== 1) {
    const e = userError("The town changed while that was in flight. Try again.", 409);
    await log(playerId, intent, args, row.version, null, false, "version conflict");
    throw e;
  }

  await log(playerId, intent, args, row.version, next, true, null);
  return { state, version: next, result };
}

/** Read-only: advance the clock and return what the town looks like now,
 *  without writing. Used by GET, which must never mutate. */
export async function readTown(playerId) {
  const row = await loadTown(playerId);
  const { state } = advanceClock(row);
  return { state, version: row.version };
}

async function log(playerId, intent, args, from, to, ok, error) {
  await db
    .insert("town_actions", {
      player_id: playerId,
      intent,
      // The payload AS VALIDATED. Logging the raw body would put unvalidated
      // client strings in the evidence table.
      args: safeArgs(args),
      from_version: from,
      to_version: to,
      ok,
      error: error ? String(error).slice(0, 300) : null,
    })
    .catch(() => {});
}

/** Only scalars, only short ones, only known keys. */
function safeArgs(args) {
  const out = {};
  for (const k of ["building", "cat", "wheel", "count"]) {
    if (args?.[k] == null) continue;
    const v = args[k];
    out[k] = typeof v === "number" ? v : String(v).slice(0, 120);
  }
  return out;
}
