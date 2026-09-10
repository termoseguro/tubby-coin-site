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
import { catKey, freshSave } from "../newTown.js";
import { WHEELS, spin as spinWheel } from "../luckyLitter.js";
import { grantShards } from "../heroProgress.js";
import { pickVillager } from "../villagers.js";
import { rollRarity, RARITY_ORDER, game } from "../gameConfig.js";
import catPool from "../catPool.json" with { type: "json" };
import { activeSeed, makeRng, nextNonce, recordRoll } from "./gacha.js";

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
  // The two wheels. Both roll on the server with a seeded CSPRNG and both
  // record what came out — see lib/server/gacha.js.
  "spin",
  "adopt",
];

/** Intents that need the gacha machinery: a nonce, a seed, and a recorded
 *  roll. Kept as a set rather than checked inline, because "did I remember to
 *  record this one" is exactly the question an audit should not have to ask. */
const ROLLING = new Set(["spin", "adopt"]);

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

  /**
   * THE LUCKY LITTER — the key wheel.
   *
   * The client says WHICH wheel and HOW it is paying. It does not say what it
   * won, what it costs, or where the pity counter is. All three live here.
   *
   * `rng` is a seeded stream (lib/server/gacha.js), so the result is
   * reproducible from a seed the player will be shown once it retires. That is
   * the difference between publishing odds and proving them.
   */
  spin(state, args, row, ctx) {
    const wheelId = oneOf(args.wheel, Object.keys(WHEELS), "wheel");
    const how = oneOf(args.how, ["key", "gold"], "how");
    const w = WHEELS[wheelId];

    const keys = { ...(state.keys || {}) };
    const res = { ...state.res };
    const cost = {};

    if (how === "key") {
      if ((keys[wheelId] || 0) < 1) throw bad(`You have no ${w.key}s.`);
      keys[wheelId] -= 1;
      cost.key = wheelId;
    } else {
      if ((res.gold || 0) < w.goldFish) throw bad(`That costs ${w.goldFish} Golden Fish.`);
      res.gold -= w.goldFish;
      cost.gold = w.goldFish;
    }

    // THE PITY COUNTER LIVES HERE. A client-side pity counter is free
    // Legendaries — set it to 79 in devtools and the next spin is guaranteed.
    const litter = { ...(state.litter || {}) };
    const pity = { ...(litter.pity || {}) };
    const before = pity[wheelId] || 0;

    const out = spinWheel(wheelId, before, ctx.rng);
    const hit = out.pity || RARITY_ORDER.indexOf(out.rarity) >= RARITY_ORDER.indexOf(w.pityFloor);
    pity[wheelId] = hit ? 0 : before + 1;
    litter.pity = pity;
    litter.spins = (litter.spins || 0) + 1;

    let next = { ...state, res, keys, litter };
    let recruited = false;
    let villager = null;

    if (out.hero) {
      const g = grantShards(next, out.hero.id, out.shards);
      recruited = g.recruited;
      next = { ...next, heroes: g.heroes, pendingShards: g.pendingShards };
    } else {
      // The common slot is a real cat who moves in, not a consolation.
      villager = pickVillager(catPool.cats, "common", ctx.rng);
      if (villager) {
        const key = catKey(villager);
        const had = next.cats?.[key];
        next = {
          ...next,
          cats: { ...(next.cats || {}), [key]: had ? { ...had, level: had.level + 1 } : villager },
        };
      }
      next = { ...next, res: { ...next.res, coin: (next.res.coin || 0) + out.shards * 25 } };
    }

    return {
      state: next,
      result: {
        wheel: wheelId,
        rarity: out.rarity,
        hero: out.hero ? { id: out.hero.id, name: out.hero.name } : null,
        villager: villager ? { id: villager.id, name: villager.name } : null,
        shards: out.shards,
        recruited,
        pity: out.pity,
      },
      cost,
    };
  },

  /** THE ADOPTION CENTER — the Treats wheel, which pays in villagers. */
  adopt(state, args, row, ctx) {
    const count = int(args.count ?? 1, { min: 1, max: 10, name: "count" });
    const price = game.pullCostTreats * count;
    if ((state.res?.treats || 0) < price) throw bad(`That costs ${price} Treats.`);

    const res = { ...state.res, treats: state.res.treats - price };
    let pityCount = state.pity || 0;
    const cats = { ...(state.cats || {}) };
    const got = [];

    for (let i = 0; i < count; i++) {
      pityCount += 1;
      let forceMin = pityCount >= game.pity.hardAt ? "legendary" : null;
      // The ten-pull floor, applied on the LAST roll if nothing hit it.
      if (!forceMin && count >= 10 && i === count - 1) {
        const best = got.reduce((m, r) => Math.max(m, RARITY_ORDER.indexOf(r.rarity)), -1);
        if (best < RARITY_ORDER.indexOf(game.pity.tenPullFloor)) forceMin = game.pity.tenPullFloor;
      }
      const rarity = rollRarity(forceMin, ctx.rng);
      if (RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf("legendary")) pityCount = 0;

      const v = pickVillager(catPool.cats, rarity, ctx.rng);
      if (!v) continue;
      const key = catKey(v);
      const had = cats[key];
      cats[key] = had ? { ...had, shards: (had.shards || 0) + 1 } : v;
      got.push({ rarity, id: v.id, name: v.name, dupe: !!had });
    }

    return {
      state: { ...state, res, cats, pity: pityCount, pulls: (state.pulls || 0) + count },
      result: { got },
      cost: { treats: price },
    };
  },

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
  let ctx = {};
  let roll = null;

  // A ROLLING INTENT GETS ITS RANDOMNESS BEFORE IT RUNS, and the nonce is
  // claimed first. Claiming it up front is deliberate: a player who spins,
  // sees the result and kills the connection has already burned the nonce, so
  // the same seed cannot be re-rolled for a better outcome. The cost of that
  // is a gap in the nonce sequence when a spin legitimately fails, and a gap
  // is cheap — it is visible in the audit and it robs nobody.
  if (ROLLING.has(intent)) {
    const seed = await activeSeed();
    // The client may contribute entropy, and it changes nothing about the
    // outcome's fairness — it is there so the player can prove they picked
    // their half before the server picked its half.
    const clientSeed = token(args.clientSeed, { name: "clientSeed", max: 64, optional: true }) || "-";
    const nonce = await nextNonce(playerId);
    ctx = { rng: makeRng(seed.secret, clientSeed, nonce) };
    roll = { seedId: seed.id, nonce, clientSeed };
  }

  try {
    const out = HANDLERS[intent](state, args, row, ctx) || {};
    if (out.state) state = out.state;
    if (out.clocks) clocks = { ...clocks, ...out.clocks };
    if (out.result) result = out.result;
    if (roll) roll.cost = out.cost || {};
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

  // THE ROLL IS RECORDED AFTER THE STATE IS COMMITTED, not before. If the
  // version guard loses, the spin did not happen and must not appear in the
  // history — a receipt for a roll that was rolled back is worse than no
  // receipt. The nonce it consumed stays consumed, which is the trade.
  if (roll && result) {
    await recordRoll({
      playerId,
      seedId: roll.seedId,
      nonce: roll.nonce,
      clientSeed: roll.clientSeed,
      wheel: intent === "spin" ? result.wheel : "adoption",
      result,
      cost: roll.cost,
    }).catch(() => {});
  }

  await log(playerId, intent, args, row.version, next, true, null);
  return { state, version: next, result, roll: roll ? { nonce: roll.nonce, seedId: roll.seedId } : null };
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
