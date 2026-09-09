// ============================================================================
//  TUBBY TOWN — THE LONG ALLEY  (Kingshot's Conquest)
//
//  The game the heroes actually play. A staged, auto-battled march: you set a
//  line-up of five, press go, and watch it fight. Clear a stage and the next
//  one is harder. Every fifth stage is a chapter boss.
//
//  Researched first, and the research corrected the design. Kingshot's Conquest:
//
//   · A LINE-UP OF FIVE, in two ranks. "2 Tanks (Infantry) on the front line to
//     absorb damage, 3 DPS on the backline" and "always run a tank in Position
//     1 — your backline dies instantly without one."
//   · AUTO-BATTLE. You do not click during a fight. The decision is the team.
//   · HP AND ULTIMATE CARRY OVER between skirmishes inside a stage, which is
//     what makes a stage a run rather than five identical fights.
//   · BOSS DAMAGE PERSISTS across attempts — "the damage you inflicted on the
//     enemy's HP pool is permanent and carries over to your next attempt." So a
//     wall is never a hard stop; it is a wall you chip.
//   · THE STAGE YOU REACH RAISES YOUR IDLE INCOME, permanently. "Rewards scale
//     with the stage you have reached, and clearing stages raises your idle
//     resource generation, so the payout is continuous."
//
//  That last point is the one that matters most, and finding it corrected a
//  real mistake: the permanent-idle-income ladder had been bolted onto the
//  Palis raid, when in Kingshot it belongs to Conquest. Palis is free to become
//  what it should be — the thing that goes wrong while you are away.
//
//  ---------------------------------------------------------------------------
//  THE FIGHT IS SIMULATED, THEN REPLAYED
//
//  `simulate()` resolves the whole battle and returns a LOG. The UI animates
//  the log; it never decides anything. Same discipline as the gacha reel, and
//  for the same reason: this moves to the server unchanged, and a battle the
//  client resolves is a battle won with a debugger.
//
//  ⚠ Client-side, therefore advisory. docs/security.md §1.
// ============================================================================

import { CLASSES, HERO_BY_ID } from "./heroes.js";
import { heroPower, starsFor } from "./heroProgress.js";

/** Five slots. 1 and 2 are the front rank and take the hits; 3, 4 and 5 are
 *  behind them. Kingshot's own advice is two tanks in front and three damage
 *  dealers behind, and position 1 especially. */
export const LINEUP_SIZE = 5;
export const FRONT_SLOTS = 2;

/** A chapter is five stages, and the fifth is a boss. */
export const CHAPTER_LENGTH = 5;
export const isBoss = (stage) => stage % CHAPTER_LENGTH === 0;
export const chapterOf = (stage) => Math.ceil(stage / CHAPTER_LENGTH);

/** Normal stages are three skirmishes; a boss stage is one long fight. */
export const wavesIn = (stage) => (isBoss(stage) ? 1 : 3);

// ---------------------------------------------------------------------------
//  WHAT A HERO IS WORTH IN A FIGHT
//
//  One number (power) split three ways by class, so the classes play
//  differently rather than being a label. A Guard is a wall that barely
//  scratches; a Slinger folds if reached but hits everything at once.
// ---------------------------------------------------------------------------

const CLASS_STATS = {
  guard: { hp: 2.1, atk: 0.7, def: 1.6, aoe: false },
  slinger: { hp: 0.75, atk: 1.55, def: 0.65, aoe: true },
  runner: { hp: 1.15, atk: 1.25, def: 0.95, aoe: false },
};

export function fighterFrom(heroId, state, slot) {
  const hero = HERO_BY_ID[heroId];
  if (!hero) return null;
  const p = heroPower(hero, state);
  const c = CLASS_STATS[hero.cls];
  return {
    id: heroId,
    name: hero.name,
    cls: hero.cls,
    rarity: hero.rarity,
    slot,
    front: slot < FRONT_SLOTS,
    maxHp: Math.round(p * 9 * c.hp),
    hp: Math.round(p * 9 * c.hp),
    atk: Math.round(p * c.atk),
    def: Math.round(p * 0.35 * c.def),
    aoe: c.aoe,
    // The ultimate charges over rounds and fires on its own — Kingshot's own
    // "ultimate skill is king, max it before anything else".
    charge: 0,
    stars: starsFor(state?.steps || 0),
  };
}

// ---------------------------------------------------------------------------
//  WHO YOU FIGHT
//
//  Not Palis. Palis is the trouble at home now; out here it is everything a
//  town cat would actually be scared of.
// ---------------------------------------------------------------------------

const MOBS = [
  { name: "Alley Rat", cls: "runner" },
  { name: "Bin Raccoon", cls: "guard" },
  { name: "Rooftop Crow", cls: "slinger" },
  { name: "Stray Dog", cls: "guard" },
  { name: "Gutter Rat", cls: "runner" },
  { name: "Magpie", cls: "slinger" },
];

export const CHAPTER_BOSSES = [
  "Big Ron, the Bin Cat",
  "The Doberman",
  "Old Crow",
  "The Rat King",
  "Scrapper",
  "The Fox",
  "Iron Whiskers",
  "The Alley Queen",
];

export const bossName = (stage) =>
  CHAPTER_BOSSES[(chapterOf(stage) - 1) % CHAPTER_BOSSES.length];

/** Enemy strength at a stage.
 *
 *  THE OPENING IS SUPPOSED TO BE FREE. Kingshot's Conquest starts with a run of
 *  stages you clear in one sitting, and that grace period is the design: it
 *  teaches the formation, it hands over the first steps of permanent idle
 *  income, and it gives a brand-new roster somewhere to be useful on day one.
 *
 *  Ours killed a single fresh hero on STAGE 1, and a fully-built five-Epic
 *  three-star team stopped at stage 7. That taught nothing except to close the
 *  screen. Measured against real rosters (scripts/.sweep.mjs), the curve now
 *  reads:
 *
 *      1 fresh Rare ..............  stage 4  (the chapter-1 boss is the wall)
 *      4 fresh Rare ..............  stage 7
 *      4 Rare 1* L10 .............  stage 9
 *      5 Rare 2* L20 ............. stage 17
 *      5 Epic 2* L20 ............. stage 29
 *      5 Epic 3* L40 ............. stage 49
 *
 *  Steeper than a town grows, so the ladder still stops you somewhere and
 *  sends you back to ascend a hero — but it stops you at a wall you can see
 *  coming rather than at the first step. */
function mobPower(stage) {
  const base = 1.6 * Math.pow(stage, 1.26) + stage * 0.8;
  // The first two chapters are the tutorial, and are deliberately soft. The
  // easing reaches 1 exactly at stage 10 so there is no cliff at the join.
  const ease = stage <= 10 ? 0.4 + 0.06 * stage : 1;
  return base * ease;
}

export function enemiesFor(stage, wave = 0) {
  const p = mobPower(stage);
  if (isBoss(stage)) {
    const c = CLASS_STATS.guard;
    return [
      {
        name: bossName(stage),
        cls: "guard",
        boss: true,
        maxHp: Math.round(p * 26),
        hp: Math.round(p * 26),
        atk: Math.round(p * 1.15),
        def: Math.round(p * 0.4),
        aoe: true,
        front: true,
        charge: 0,
      },
    ];
  }
  // Three or four of them, drawn deterministically from the stage so the same
  // stage always looks the same — a fight that reshuffles between attempts is
  // a fight you cannot plan against.
  const n = 3 + ((stage + wave) % 2);
  return Array.from({ length: n }, (_, i) => {
    const m = MOBS[(stage * 3 + wave * 2 + i) % MOBS.length];
    const c = CLASS_STATS[m.cls];
    return {
      name: m.name,
      cls: m.cls,
      boss: false,
      maxHp: Math.round((p * 7 * c.hp) / n * 1.6),
      hp: Math.round((p * 7 * c.hp) / n * 1.6),
      atk: Math.round((p * c.atk) / n * 1.5),
      def: Math.round(p * 0.3 * c.def),
      aoe: c.aoe,
      front: i < 2,
      charge: 0,
    };
  });
}

// ---------------------------------------------------------------------------
//  THE FIGHT
// ---------------------------------------------------------------------------

const alive = (u) => u.hp > 0;

/** Damage, with defence as a soft reduction rather than a subtraction, so a
 *  high-defence wall is never immune and a weak attacker is never useless. */
function hit(attacker, target, mult = 1) {
  const raw = attacker.atk * mult;
  const dmg = Math.max(1, Math.round((raw * raw) / (raw + target.def)));
  return dmg;
}

/** Who gets hit: the front rank while any of it stands, because that is the
 *  entire reason to put a tank in position 1. */
function pickTarget(side, rng) {
  const front = side.filter((u) => alive(u) && u.front);
  const pool = front.length ? front : side.filter(alive);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

const CHARGE_PER_ROUND = 34;
const ULT_AT = 100;

/**
 * Fight one wave. Mutates `team` HP and charge so they carry into the next
 * wave — which is Kingshot's rule and the reason a stage is a run.
 *
 * Returns a log the UI replays.
 */
function fightWave(team, foes, rng, log, roundOffset = 0) {
  let round = 0;
  while (round < 40 && team.some(alive) && foes.some(alive)) {
    round++;
    // Speed is not modelled; both sides act each round, ours first. Adding an
    // initiative roll made outcomes swingy without making decisions richer.
    for (const side of [
      { units: team, enemy: foes, mine: true },
      { units: foes, enemy: team, mine: false },
    ]) {
      for (const u of side.units) {
        if (!alive(u) || !side.enemy.some(alive)) continue;
        u.charge += CHARGE_PER_ROUND;

        if (u.charge >= ULT_AT) {
          u.charge = 0;
          // The ultimate: a big hit, and AoE classes catch the whole rank.
          const targets = u.aoe ? side.enemy.filter(alive) : [pickTarget(side.enemy, rng)];
          for (const t of targets) {
            if (!t) continue;
            const d = hit(u, t, 2.2);
            t.hp = Math.max(0, t.hp - d);
            log.push({ r: roundOffset + round, mine: side.mine, actor: u.name, target: t.name, dmg: d, ult: true });
            if (!alive(t)) log.push({ r: roundOffset + round, mine: !side.mine, down: t.name });
          }
          continue;
        }

        const t = pickTarget(side.enemy, rng);
        if (!t) continue;
        const d = hit(u, t);
        t.hp = Math.max(0, t.hp - d);
        log.push({ r: roundOffset + round, mine: side.mine, actor: u.name, target: t.name, dmg: d });
        if (!alive(t)) log.push({ r: roundOffset + round, mine: !side.mine, down: t.name });
      }
    }
  }
  return round;
}

/**
 * Run a whole stage.
 *
 * `carry` is what survived a previous attempt at a BOSS stage: Kingshot makes
 * boss damage permanent between attempts, so a boss you cannot beat is a boss
 * you chip at over several tries. That single rule is what stops the ladder
 * from being a brick wall, and it is why losing is worth doing.
 */
export function simulate(lineup, save, stage, carry = {}, rng = Math.random) {
  const team = lineup
    .map((id, i) => (id ? fighterFrom(id, save.heroes?.[id], i) : null))
    .filter(Boolean);

  if (!team.length) return { won: false, empty: true, log: [], waves: [] };

  // The army does not appear on the board — five heroes is already a lot to
  // read — but it fights. Its power is spread across the line-up, which is why
  // a trained army makes a weak hero survivable rather than replacing them.
  if (carry.troops > 0) {
    const per = carry.troops / team.length;
    for (const u of team) {
      u.maxHp += Math.round(per * 4);
      u.hp = u.maxHp;
      u.atk += Math.round(per * 0.35);
    }
  }

  const log = [];
  const waves = [];
  let round = 0;
  let won = true;

  for (let w = 0; w < wavesIn(stage); w++) {
    const foes = enemiesFor(stage, w);
    // Boss damage carried from an earlier attempt.
    if (isBoss(stage) && carry.bossHp != null && w === 0) {
      foes[0].hp = Math.max(1, Math.min(foes[0].maxHp, carry.bossHp));
    }
    const before = foes.reduce((a, f) => a + f.hp, 0);
    round += fightWave(team, foes, rng, log, round);
    const after = foes.reduce((a, f) => a + f.hp, 0);
    waves.push({
      wave: w,
      cleared: !foes.some(alive),
      dealt: before - after,
      bossHp: isBoss(stage) ? foes[0].hp : null,
      enemies: foes.map((f) => ({ name: f.name, maxHp: f.maxHp, hp: f.hp, boss: !!f.boss })),
    });
    if (foes.some(alive)) {
      won = false;
      break;
    }
  }

  return {
    won,
    stage,
    log,
    waves,
    rounds: round,
    team: team.map((u) => ({
      id: u.id, name: u.name, cls: u.cls, rarity: u.rarity,
      slot: u.slot, hp: u.hp, maxHp: u.maxHp,
    })),
    // Kept so a failed boss attempt leaves a mark.
    bossHp: isBoss(stage) ? waves[waves.length - 1]?.bossHp ?? null : null,
  };
}

// ---------------------------------------------------------------------------
//  WHAT CLEARING A STAGE IS WORTH
//
//  A one-off purse, and — the part that matters — a permanent raise on the
//  town's idle Gold. In Kingshot the stage you reached today keeps paying while
//  you are doing something else entirely.
// ---------------------------------------------------------------------------

export function stageReward(stage) {
  return {
    coin: Math.round(140 * Math.pow(stage, 1.22)) * (isBoss(stage) ? 3 : 1),
    shards: isBoss(stage) ? 10 + chapterOf(stage) * 2 : 0,
    keys: isBoss(stage) && chapterOf(stage) % 2 === 0 ? { silver: 1 } : null,
  };
}

// ---------------------------------------------------------------------------
//  THE ALLEY PAYS WHILE YOU ARE AWAY — its own purse, not a town bonus
//
//  This used to be `idleGoldMultiplier`, a permanent multiplier bolted onto the
//  town's Gold production. That is NOT what Kingshot does, and the difference
//  matters more than it looks.
//
//  Kingshot's Conquest accrues its OWN reward pool at a rate set by the deepest
//  stage you have cleared, it CAPS AT TWELVE HOURS, and you go and collect it.
//  The guides all say the same thing: "collect AFK rewards twice daily, do not
//  let the timer cap out". That cap is the entire retention mechanism — it is
//  what makes a player open the game in the morning and again at night — and a
//  silent multiplier on another screen's number has none of it.
//
//  It also keeps the two loops honest. A multiplier made the town's Gold a
//  function of the hero roster, so a player who ignored the Alley slowly
//  discovered their buildings had been throttled by a screen they never
//  visited. A purse is a thing you can see filling, in the place you earned it.
// ---------------------------------------------------------------------------

/** Never accrue more than this. Come back twice a day or lose the difference. */
export const ALLEY_IDLE_CAP_HOURS = 12;

/** Gold per hour, from the deepest stage cleared. Sub-linear on purpose: the
 *  hundredth stage should be worth pushing for and not worth a hundred times
 *  the first. */
export const alleyIdleRate = (cleared = 0) =>
  Math.round(26 * Math.pow(Math.max(0, cleared), 1.12));

/** What is sitting in the purse right now, and how full it is. */
export function alleyPending(save, now = Date.now()) {
  const cleared = save?.conquest?.cleared || 0;
  const rate = alleyIdleRate(cleared);
  const since = save?.conquest?.collectedAt || save?.lastSeen || now;
  const hours = Math.min(ALLEY_IDLE_CAP_HOURS, Math.max(0, (now - since) / 3_600_000));
  return {
    rate,
    hours,
    coin: Math.floor(rate * hours),
    full: hours >= ALLEY_IDLE_CAP_HOURS - 0.01,
    capCoin: Math.floor(rate * ALLEY_IDLE_CAP_HOURS),
  };
}

/** A readable line about the line-up, shown before the player presses go.
 *  Kingshot's advice, enforced as a warning rather than a rule: you may field
 *  whatever you like and find out. */
export function lineupAdvice(lineup, save) {
  const team = lineup.map((id) => (id ? HERO_BY_ID[id] : null));
  const front = team.slice(0, FRONT_SLOTS).filter(Boolean);
  if (!team.filter(Boolean).length) return "Put someone in the line-up first.";
  if (!team[0]) return "Position 1 is empty. Whoever stands there takes the hits.";
  if (team[0].cls !== "guard") {
    return `${team[0].name} is a ${CLASSES[team[0].cls].name} in position 1 — the back rank dies fast without a Guard in front.`;
  }
  if (front.filter((h) => h.cls === "guard").length < 2) {
    return "Two Guards in front is the usual shape. One works, but it is thin.";
  }
  return "A good shape: Guards in front, damage behind.";
}
