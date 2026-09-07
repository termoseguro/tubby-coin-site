// ============================================================================
//  TUBBY TOWN — PALIS RAIDS
//
//  Kingshot's Rebel Suppression, in cat. Researched before it was built, and
//  the research changed the design in one important way.
//
//  The obvious version of a raid is a side mode: a fight you win, some loot,
//  back to the town. Kingshot does not do that. Rebel Suppression is
//  "a repeatable idle system that scales with your suppression level" — the
//  STAGE YOU HAVE REACHED permanently raises the Gold your town earns while you
//  are not playing. Runs appear every few hours; you send troops, you clear the
//  next stage, and the whole economy moves up a step.
//
//  That is what makes the fight matter to a player who does not like fighting,
//  and it is why the raid belongs in the economy file's orbit rather than off
//  in a minigame. Two sources of Gold, and both of them are the town:
//
//      Cat Cottages   the fixed baseline — every hour, forever
//      Palis raids    the multiplier on that baseline, plus the purse per win
//
//  Sources: https://kingshotguides.com/guide/simple-ways-to-get-more-gold-in-kingshot-without-spending/
//  and comiccone's beginner gold guide, both of which describe suppression as
//  a repeatable idle ladder rather than an event. See docs/kingshot-teardown.md.
//
//  ⚠ Client-side, therefore advisory. Combat resolution and rewards move to the
//  server before anything of value is attached — docs/security.md §1. A raid
//  that pays out on the client's word is a raid a player wins with a debugger.
// ============================================================================

import { catPower } from "./townEconomy.js";

/** Palis turns up this often, and the town banks up to three visits. Banking
 *  them is Kingshot's own shape — "run suppression batches on cooldowns" — and
 *  it is what makes the game survive a player having a life. */
export const RAID_EVERY_HOURS = 4;
export const RAID_BANK = 3;

/** How many stages deep Palis goes. Long enough that nobody finishes it in the
 *  first season. */
export const MAX_STAGE = 60;

/** Palis' strength at a stage. Rises faster than a town can, on purpose: the
 *  ladder is meant to stop you somewhere and make you go and get stronger. */
export function palisPower(stage) {
  return Math.round(3 * Math.pow(stage, 1.55) + stage * 2);
}

/** What the town brings to the fight.
 *
 *  Every cat on shift defends — there is no separate army to build, because a
 *  second progression system this early would compete with the town for the
 *  player's attention and lose. The Gatehouse is the wall and the Watchtower is
 *  the warning, so both count, which is what stops them being ornaments. */
export function townPower(save, levels = {}, extra = {}) {
  let power = extra.heroPower || 0;
  for (const [key, buildingId] of Object.entries(save?.assign || {})) {
    const cat = save.cats?.[key];
    if (!cat) continue;
    power += catPower(cat.rarity, cat.level) * 6;
  }
  power += (levels.gatehouse || 0) * 9;
  power += (levels.watchtower || 0) * 4;
  power += (levels.hall || 0) * 2;
  // Gatehouse skills multiply the wall rather than adding to it, so a defensive
  // hero is worth more in a town that actually built one.
  const g = extra.bonuses?.guardUp || 0;
  if (g) power += (levels.gatehouse || 0) * 9 * (g / 100);
  return Math.round(power);
}

/** The odds, and they are never zero or one.
 *
 *  A raid you cannot lose is a button, and a raid you cannot win is a wall. So
 *  the curve is steep around parity and flat at the ends: at equal power it is
 *  a coin flip, at double it is nearly certain, and there is always a 5% tail
 *  in both directions so the fight keeps its teeth. */
export function winChance(town, palis) {
  if (palis <= 0) return 1;
  const ratio = town / palis;
  const raw = 1 / (1 + Math.pow(2.4, -3.4 * (ratio - 1)));
  return Math.min(0.95, Math.max(0.05, raw));
}

/** Gold for clearing a stage. This is the purse; the bigger prize is that the
 *  stage itself raises the town's idle Gold forever. */
export function raidPurse(stage) {
  return Math.round(120 * Math.pow(stage, 1.25));
}

/** Materials Palis drops, so a raid feeds the town and not only the wallet. */
export function raidLoot(stage) {
  return {
    coin: raidPurse(stage),
    wood: Math.round(180 * Math.pow(stage, 1.1)),
    fish: Math.round(150 * Math.pow(stage, 1.1)),
    stone: Math.round(40 * Math.pow(stage, 1.15)),
  };
}

// ---------------------------------------------------------------------------
//  THE PART THAT MAKES RAIDING WORTH IT
//
//  Kingshot: "higher levels in Rebel Suppression provide higher idle income".
//  So the stage you have CLEARED is a permanent multiplier on the Gold the
//  cottages pay every hour, whether or not you ever raid again. A player who
//  hates fighting still wants to push the ladder, because the ladder is the
//  economy.
// ---------------------------------------------------------------------------

/** Multiplier applied to the town's baseline Gold, from the deepest stage
 *  cleared. Stage 0 is ×1; it roughly triples by stage 30. */
export function raidGoldMultiplier(stageCleared = 0) {
  return 1 + 0.07 * Math.max(0, stageCleared);
}

/** How many raids are waiting right now, given when the last one was used. */
export function raidsReady(lastRaidAt, now = Date.now()) {
  if (!lastRaidAt) return RAID_BANK;
  const hours = (now - lastRaidAt) / 3_600_000;
  return Math.min(RAID_BANK, Math.floor(hours / RAID_EVERY_HOURS));
}

/** Milliseconds until the next raid arrives. */
export function nextRaidIn(lastRaidAt, now = Date.now()) {
  if (!lastRaidAt) return 0;
  const per = RAID_EVERY_HOURS * 3_600_000;
  const since = now - lastRaidAt;
  const waiting = Math.floor(since / per);
  if (waiting >= RAID_BANK) return 0;
  return per - (since % per);
}

/** Fight it.
 *
 *  Losing costs something real or winning means nothing — but what it costs is
 *  TIME, never progress: cats come back hurt and work at half speed until the
 *  Cat Clinic sees them. Nothing is destroyed, nothing is taken off the player
 *  permanently, and the stage ladder never goes backwards. That is the line
 *  this game does not cross, because a raid that can undo a week of building is
 *  a raid players quit over. */
export function resolveRaid(save, levels, stage, extra = {}) {
  const town = townPower(save, levels, extra);
  const palis = palisPower(stage);
  const chance = winChance(town, palis);
  const won = Math.random() < chance;

  const lootMult = 1 + (extra.bonuses?.loot || 0) / 100;
  const shieldCut = Math.min(0.9, (extra.bonuses?.shield || 0) / 100);

  if (won) {
    const loot = raidLoot(stage);
    for (const k of Object.keys(loot)) loot[k] = Math.round(loot[k] * lootMult);
    return { won, town, palis, chance, loot, hurt: hurtList(save, 0.25 * (1 - shieldCut)) };
  }
  // A loss still pays a consolation purse — a wasted run is a run the player
  // resents, and resentment is what stops them opening the game tomorrow.
  return {
    won,
    town,
    palis,
    chance,
    loot: { coin: Math.round(raidPurse(stage) * 0.3 * lootMult) },
    hurt: hurtList(save, 0.6 * (1 - shieldCut)),
  };
}

/** Which cats come back hurt. Weighted to the strongest, because the strong
 *  ones are the ones actually in the fight. */
function hurtList(save, share) {
  const on = Object.keys(save?.assign || {});
  const n = Math.round(on.length * share);
  return on
    .map((k) => ({ k, p: catPower(save.cats[k]?.rarity, save.cats[k]?.level || 1) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, n)
    .map((x) => x.k);
}

/** A hurt cat works at half speed. The Cat Clinic is what fixes that, which is
 *  the entire reason the Clinic exists — Kingshot's Infirmary, doing Kingshot's
 *  Infirmary's job. */
export const HURT_MULTIPLIER = 0.5;

/** Gold to patch one cat up, and the time it takes. The Clinic's level cuts
 *  both, so a town that raids often has a reason to raise it. */
export function healCost(clinicLevel, cats = 1) {
  const per = Math.max(20, Math.round(90 / (1 + 0.25 * Math.max(0, clinicLevel - 1))));
  return { coin: per * cats };
}

export function healSeconds(clinicLevel, cats = 1) {
  return Math.round((40 * cats) / (1 + 0.3 * Math.max(0, clinicLevel - 1)));
}

/** A short, readable read on whether to press the button. Players do not do
 *  arithmetic; they read a word and decide. */
export function oddsLabel(chance) {
  if (chance >= 0.9) return "Easy";
  if (chance >= 0.7) return "Favoured";
  if (chance >= 0.45) return "Even";
  if (chance >= 0.25) return "Risky";
  return "Hopeless";
}
