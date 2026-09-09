// What a brand-new town is.
//
// EXTRACTED SO THE SERVER CAN USE IT. A signed-in player's town is created by
// the route handler, and while this lived in page.jsx the server had no way to
// call it — a new account got `{}` and a completely empty town: no starting
// resources, no Cat Hall, no starter hero. Two definitions of "a new game" is
// two games, so there is one, here, and both sides import it.
//
// Pure: no browser, no React. `npm run check:server` proves it stays that way.

import { game } from "./gameConfig.js";
import { BUILDINGS } from "./townConfig.js";
import { startLevel } from "./townEconomy.js";
import { starterHeroes } from "./heroProgress.js";
import { makeVillager, pickVillager, villagerIdFromKey, villagerName } from "./villagers.js";
import catPool from "./catPool.json" with { type: "json" };

/** A villager is identified by its rarity and its id, NOT by a picture: the
 *  picture is derived from the id, and keying on an image path is what let a
 *  villager and a hero share an identity. */
export const catKey = (c) => `${c.rarity}|${c.id ?? villagerIdFromKey(c.art || "")}`;

export function freshSave() {
  // The first villager. A real cat with a real name from the first minute —
  // the town is never staffed by an anonymous placeholder.
  const starter = pickVillager(catPool.cats, "common") || {
    rarity: "common",
    id: 0,
    name: villagerName(0),
    level: 1,
    shards: 0,
  };
  return {
    v: 6,
    // Kingshot-shaped economy: five gathered resources plus the premium one,
    // each produced by its own building and capped by the Storehouse.
    // Kingshot opens you with almost nothing and the Sawmill. Ours matches:
    // enough Wood to make the first move, enough Fish that the one cat does not
    // starve before the Kitchen exists at Cat Hall 2, and no Stone, Catnip or
    // Treats at all — those resources have not been introduced yet, and a
    // counter for a thing the player has never seen is noise.
    res: { fish: 250, wood: 350, stone: 0, catnip: 0, treats: 0, coin: 120, gold: 20 },
    // when production was last paid out into the stockpile
    lastProd: Date.now(),
    // furniture levels: { kitchen: { stove: 3, ... } }
    furniture: {},
    // ---- HERO CATS ----
    // Deliberately separate from `cats`, which is the villager pool. Heroes are
    // named, have stars and skills, and never work inside a building.
    // { biscuit: { steps, level, shards } }
    heroes: starterHeroes(),
    // shards banked toward a hero not yet recruited
    pendingShards: {},
    // hero ids currently on patrol — only these count for anything
    patrol: [],
    // ---- THE LONG ALLEY (Kingshot's Conquest) ----
    // The stage ladder the heroes climb. `cleared` is the deepest stage beaten
    // and it permanently multiplies the town's idle Gold — which is where that
    // mechanic belongs, and why it is no longer bolted onto the Palis raid.
    // `bossHp` remembers a wounded boss between attempts.
    conquest: { stage: 1, cleared: 0, bossHp: null, lineup: [], collectedAt: Date.now() },
    // Enough to feel the wheel on day one, and the faucet keeps it coming.
    keys: { silver: 8, gold: 2, silverAt: Date.now(), goldAt: Date.now() },
    litter: { startedAt: Date.now(), spins: 0, pity: { silver: 0, gold: 0 }, claimed: {}, lastFreeAt: 0 },

    // ---- THE STUDY ----
    // One research at a time, which is what makes the order a decision.
    tech: {},
    research: null,

    // ---- TROOPS ----
    // { guard: { 1: 40 }, slinger: {}, runner: {} } and one job per building.
    army: { guard: {}, slinger: {}, runner: {} },
    training: {},

    // ---- PALIS ----
    // Not a boss you attack: what goes wrong while you are away. `problems` is
    // the mess waiting to be sorted; `lastVisitAt` is when he was last through.
    problems: [],
    lastVisitAt: Date.now(),

    cats: { [catKey(starter)]: starter },
    slots: game.startSlots,
    bowlHours: game.startBowlHours,
    lastSeen: Date.now(),
    pulls: 0,
    pity: 0,
    hold: 0, // simulated $TUBBY balance — replaced by a real RPC read later
    skin: false,
    // ---- city builder ----
    // Levels per building, and the jobs currently occupying a builder.
    // Empty on purpose: a building with no entry here sits at its start level,
    // which is 1 for the six the town opens with and 0 (an empty plot) for
    // everything else. Nothing is written until the player builds it.
    // Timers are wall-clock here; the SERVER owns finishesAt once this is real
    // (docs/security.md §4b — a timer the client can influence is free money).
    buildings: {},
    jobs: {},
    // One builder to start. The second is the gateway purchase.
    builders: 1,
    // which building each cat works at — the player's decision, not a rota
    assign: {},
    // villager places bought for a SPECIFIC building: { kitchen: 1, ... }
    buildingSlots: {},
    // active building boosts: { [buildingId]: endsAt }
    boosts: {},
    // where the player has moved buildings to
    positions: {},
    // quest rewards already taken
    claimed: {},
    // Clowder tokens, earned by helping. Spent in the Guild Hall once it does
    // something (lib/townAlliance.js).
    tokens: 0,
  };
}
