// ============================================================================
//  CONQUEST SKILLS — what each cat actually DOES in a fight
//
//  The skills in heroes.js are TOWN skills: they raise production, cut build
//  times, pay Gold. Kingshot splits its hero skills exactly this way —
//  Expedition skills for marches, Conquest skills for hero-versus-hero — and
//  until now we had only the first half. Every cat fought identically: the same
//  generic "big hit" at full charge, whether it was a Rare kitchen cat or a
//  seventh-generation Mythic. Thirty-four heroes, one moveset.
//
//  So every hero gets an ULTIMATE and a PASSIVE.
//
//  THE ULTIMATE fires on its own when the charge bar fills. Kingshot's own
//  advice is that "ultimate skill is king — max it before any other Conquest
//  skill on every hero", so this is the part that scales hardest with stars.
//
//  THE PASSIVE is always on and unlocks at a star. It is what makes ASCENDING a
//  hero feel different from levelling one — levels raise the numbers, stars
//  turn something on.
//
//  Both fit the class rather than being sprinkled at random: Guards protect and
//  endure, Slingers hit the whole rank, Runners find the weak one.
// ============================================================================

/** What an ultimate can do. */
export const ULTS = {
  strike: { name: "Heavy Strike", text: (v) => `hits one enemy for ${v}×` },
  volley: { name: "Volley", text: (v) => `hits the whole enemy rank for ${v}×`, aoe: true },
  execute: { name: "Finisher", text: (v) => `hits the weakest enemy for ${v}×`, weakest: true },
  siphon: { name: "Siphon", text: (v) => `hits for ${v}× and heals half of it back`, heal: 0.5 },
  rally: { name: "Rally", text: (v) => `heals every cat for ${v}% of their health`, pct: true },
  bulwark: { name: "Bulwark", text: (v) => `shields the front rank for ${v}% of its health`, pct: true },
  warcry: { name: "War Cry", text: (v) => `raises the team's attack by ${v}% for the rest of the fight`, pct: true },
  snare: { name: "Snare", text: (v) => `hits for ${v}× and empties the target's charge`, drain: true },
};

/** Always-on effects, unlocked at a star. */
export const PASSIVES = {
  atk: { name: "Sharp", text: (v) => `+${v}% attack` },
  def: { name: "Braced", text: (v) => `+${v}% defence` },
  hp: { name: "Hardy", text: (v) => `+${v}% health` },
  charge: { name: "Quick", text: (v) => `charges ${v}% faster` },
  leech: { name: "Hungry", text: (v) => `heals ${v}% of the damage it deals` },
  thorns: { name: "Bristled", text: (v) => `returns ${v}% of the damage it takes` },
  guardian: { name: "Guardian", text: (v) => `the whole front rank takes ${v}% less` },
};

const c = (ult, ultBase, passive, passBase, at) => ({ ult, ultBase, passive, passBase, at });

/** Every hero's fighting kit, at zero stars. Ultimate multipliers are on top of
 *  a normal hit; percentages are percentages. */
export const COMBAT = {
  // ---- Rare: the production four, and the first team anybody fields. Simple
  // kits on purpose — nothing here should need explaining twice.
  biscuit: c("volley", 1.6, "atk", 6, 1),
  timber: c("bulwark", 18, "def", 8, 1),
  pebble: c("strike", 2.0, "hp", 8, 1),
  sprout: c("rally", 12, "def", 6, 1),

  // ---- Epic
  dash: c("volley", 1.8, "charge", 8, 1),
  pounce: c("execute", 2.4, "atk", 8, 2),
  comet: c("strike", 2.3, "charge", 10, 2),
  bramble: c("bulwark", 22, "thorns", 10, 2),
  bruno: c("siphon", 1.9, "leech", 8, 2),
  fig: c("execute", 2.2, "atk", 7, 1),
  marmalade: c("volley", 1.7, "atk", 9, 2),
  yuzu: c("snare", 1.8, "charge", 9, 2),

  // ---- Legendary
  jasper: c("execute", 2.8, "atk", 11, 2),
  sable: c("volley", 2.1, "atk", 12, 2),
  // Hazel and Carlos are pure protectors: their kit IS the passive, so their
  // ultimate heals rather than being a second copy of it.
  hazel: c("rally", 16, "guardian", 12, 1),
  amadeu: c("bulwark", 28, "guardian", 10, 1),
  zaza: c("warcry", 16, "def", 11, 2),
  hilda: c("siphon", 2.4, "leech", 11, 2),
  merlin: c("volley", 2.2, "charge", 12, 2),
  enzo: c("bulwark", 30, "hp", 13, 2),
  jujuba: c("volley", 2.3, "atk", 13, 3),
  petra: c("snare", 2.3, "charge", 12, 2),

  // ---- Mythic: the kits get an identity, not just bigger numbers
  alcaparra: c("bulwark", 34, "guardian", 15, 2),
  rosa: c("volley", 2.6, "atk", 15, 2),
  margo: c("execute", 3.2, "leech", 13, 2),
  longuinho: c("siphon", 2.5, "leech", 14, 2),
  vivi: c("volley", 2.5, "charge", 15, 2),
  trufa: c("snare", 2.7, "atk", 14, 3),
  yang: c("warcry", 22, "atk", 16, 3),
  tritao: c("bulwark", 38, "thorns", 16, 3),
  sofia: c("execute", 3.4, "charge", 15, 3),
  ava: c("strike", 3.6, "atk", 17, 3),
  carlos: c("rally", 20, "guardian", 18, 2),
  miumia: c("volley", 2.8, "charge", 17, 3),
};

/** A hero's fighting kit at a given star level.
 *
 *  Growth is 35% of the base per star, so a 5★ ultimate is not quite triple a
 *  0★ one. Steeper than that and stars stop being a choice — everyone would
 *  simply run whoever they had ascended, regardless of what the kit does. */
export function combatKit(heroId, stars = 0) {
  const k = COMBAT[heroId];
  if (!k) return null;
  const grow = (base) => Math.round(base * (1 + 0.35 * Math.max(0, stars)) * 100) / 100;
  const ult = ULTS[k.ult];
  const passive = PASSIVES[k.passive];
  const ultValue = grow(k.ultBase);
  const passiveValue = grow(k.passBase);
  return {
    ult: k.ult,
    ultName: ult.name,
    ultValue,
    ultText: ult.text(ultValue),
    aoe: !!ult.aoe,
    passive: k.passive,
    passiveName: passive.name,
    passiveAt: k.at,
    passiveLive: stars >= k.at,
    passiveValue,
    passiveText: passive.text(passiveValue),
  };
}
