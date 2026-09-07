// ============================================================================
//  TUBBY TOWN — THE HERO CATS
//
//  ⚠ HEROES ARE NOT VILLAGERS. Two different systems, and keeping them apart is
//  the whole reason this file is separate from townEconomy.js:
//
//    CAT VILLAGERS  live in the cottages, are anonymous, and stand INSIDE a
//                   building doing its work. Population. townEconomy.js.
//    HERO CATS      are named, pulled from the gacha, have stars and skills,
//                   and are never assigned to a building. They lead the patrol
//                   against Palis and pay town-wide bonuses. This file.
//
//  That is exactly Kingshot's split — Residents are assigned as workers, hunters
//  and chefs; Heroes are a separate roster entirely — and blurring it is how a
//  game ends up with one confusing pool of cats doing everything badly.
//
//  ---------------------------------------------------------------------------
//  THE ROSTER IS KINGSHOT'S, RE-CAST
//
//  All 34 Kingshot heroes, keeping each one's rarity, class and job, with the
//  names and flavour re-themed. Kingshot's three classes map onto the three
//  buildings the town already has names for:
//
//      Infantry → GUARD    (Training Yard)
//      Archer   → SLINGER  (Slingshot Range)
//      Cavalry  → RUNNER   (Runner's Stable)
//
//  And the pattern in their rarities is worth stating, because it is the design:
//  Kingshot's RARE heroes are production boosts, its EPIC heroes are utility,
//  and its MYTHIC heroes are combat. So a new player's first heroes make their
//  town richer, and the exciting ones arrive later. Ours does the same.
//
//  Skills are one line of DATA each, not prose: a type and a magnitude that the
//  economy reads. A skill nobody can compute with is decoration.
//
//  Sources: kingshotoptimizer.com/heroes/browse (the full 34 with rarity, class,
//  generation and signature skill) and kingshotmastery.com/guides/hero-skills-and-builds
//  (the two separate skill trees). See docs/kingshot-teardown.md.
// ============================================================================

/** The three classes. Named for the buildings that train them. */
export const CLASSES = {
  guard: { id: "guard", name: "Guard", building: "training", blurb: "Sturdy. Stands in front." },
  slinger: { id: "slinger", name: "Slinger", building: "range", blurb: "Hits hard from the back." },
  runner: { id: "runner", name: "Runner", building: "stable", blurb: "Fast. Catches what gets through." },
};

/** What a skill can do. Kingshot splits skills into Expedition (marches and
 *  rallies) and Conquest (hero-versus-hero); ours splits the same way into
 *  PATROL — everything about Palis raids — and TOWN, the bonuses that apply
 *  while nothing is attacking. Both are useful the day a hero is pulled, which
 *  is what stops a hero feeling like a trophy you cannot spend. */
export const SKILL_KINDS = {
  // ---- town ----
  produce: { tree: "town", label: (s) => `+${s}% ${"{res}"} from every building` },
  allProduce: { tree: "town", label: (s) => `+${s}% to all production` },
  build: { tree: "town", label: (s) => `−${s}% build time` },
  gold: { tree: "town", label: (s) => `+${s}% Gold` },
  store: { tree: "town", label: (s) => `+${s}% Storehouse cap` },
  upkeep: { tree: "town", label: (s) => `−${s}% Fish eaten by villagers` },
  // ---- patrol ----
  power: { tree: "patrol", label: (s) => `+${s}% patrol power` },
  loot: { tree: "patrol", label: (s) => `+${s}% raid loot` },
  guardUp: { tree: "patrol", label: (s) => `+${s}% from the Gatehouse` },
  mend: { tree: "patrol", label: (s) => `−${s}% to patch hurt cats up` },
  shield: { tree: "patrol", label: (s) => `${s}% fewer cats come back hurt` },
};

/** One skill. `at` is the star rank that unlocks it — 0, 2, 4 — so ascending a
 *  hero is not only bigger numbers, it is a new line on their card. That is the
 *  hook Kingshot uses and it is why star ranks sell. */
const skill = (kind, base, at = 0, res = null) => ({ kind, base, at, res });

/** How much a skill is worth at a given skill level. Skills level with the
 *  hero's stars, so a 5★ hero's first skill is roughly triple a 0★ one's. */
export function skillValue(sk, stars = 0) {
  return Math.round(sk.base * (1 + 0.5 * Math.max(0, stars)) * 10) / 10;
}

const hero = (id, name, rarity, cls, gen, blurb, skills) => ({
  id, name, rarity, cls, gen, blurb, skills,
});

// ---------------------------------------------------------------------------
//  RARE — the production four. Kingshot's Olive, Forrest, Edwin and Seth boost
//  bread, wood, stone and iron; ours boost Fish, Wood, Stone and Catnip. These
//  are a new player's first heroes and they make the town measurably richer,
//  which is the correct first impression for a gacha to give.
// ---------------------------------------------------------------------------
const RARES = [
  hero("biscuit", "Biscuit", "rare", "slinger", 1, "Runs the Kitchen like she owns it.", [
    skill("produce", 8, 0, "fish"), skill("upkeep", 4, 2), skill("power", 3, 4),
  ]),
  hero("timber", "Timber", "rare", "guard", 1, "Has never met a log he could not shift.", [
    skill("produce", 8, 0, "wood"), skill("build", 3, 2), skill("power", 3, 4),
  ]),
  hero("pebble", "Pebble", "rare", "runner", 1, "Small, extremely stubborn.", [
    skill("produce", 8, 0, "stone"), skill("store", 5, 2), skill("power", 3, 4),
  ]),
  hero("sprout", "Sprout", "rare", "guard", 1, "Sleeps in the Catnip Garden. On purpose.", [
    skill("produce", 8, 0, "catnip"), skill("gold", 4, 2), skill("power", 3, 4),
  ]),
];

// ---------------------------------------------------------------------------
//  EPIC — utility. Kingshot's Epics are march speed, healing, research and the
//  "joiner" bonuses that make a hero worth bringing even when they do not lead.
// ---------------------------------------------------------------------------
const EPICS = [
  hero("dash", "Dash", "epic", "slinger", 1, "Back before you noticed she left.", [
    skill("build", 5, 0), skill("power", 5, 2), skill("loot", 6, 4),
  ]),
  hero("pounce", "Pounce", "epic", "slinger", 1, "One target. One problem.", [
    skill("power", 7, 0), skill("loot", 5, 2), skill("shield", 4, 4),
  ]),
  hero("comet", "Comet", "epic", "runner", 1, "Turns up wherever the fighting is.", [
    skill("power", 6, 0), skill("loot", 7, 2), skill("mend", 6, 4),
  ]),
  hero("bramble", "Bramble", "epic", "guard", 1, "Thorny. Reliable. Not cuddly.", [
    skill("guardUp", 8, 0), skill("power", 5, 2), skill("shield", 5, 4),
  ]),
  hero("bruno", "Bruno", "epic", "runner", 1, "Enormous. Gentle. Immovable.", [
    skill("shield", 8, 0), skill("power", 4, 2), skill("guardUp", 6, 4),
  ]),
  hero("fig", "Fig", "epic", "runner", 1, "Sweet right up until she is not.", [
    skill("loot", 8, 0), skill("power", 4, 2), skill("gold", 5, 4),
  ]),
  hero("marmalade", "Marmalade", "epic", "slinger", 1, "Keeps the Clinic in order.", [
    skill("mend", 10, 0), skill("power", 5, 2), skill("shield", 5, 4),
  ]),
  hero("yuzu", "Yuzu", "epic", "slinger", 1, "Reads faster than anyone can shelve.", [
    skill("build", 7, 0), skill("allProduce", 3, 2), skill("gold", 6, 4),
  ]),
];

// ---------------------------------------------------------------------------
//  LEGENDARY — Kingshot's Gen 1–3 Mythics. The first heroes worth building a
//  whole town around.
// ---------------------------------------------------------------------------
const LEGENDARIES = [
  hero("jasper", "Jasper", "legendary", "runner", 1, "Holds the gate and enjoys it.", [
    skill("guardUp", 12, 0), skill("power", 8, 2), skill("shield", 7, 4),
  ]),
  hero("sable", "Sable", "legendary", "slinger", 1, "Every builder's favourite cat.", [
    skill("build", 12, 0), skill("allProduce", 5, 2), skill("store", 8, 4),
  ]),
  hero("hazel", "Hazel", "legendary", "guard", 1, "Makes everyone around her better.", [
    skill("power", 10, 0), skill("allProduce", 4, 2), skill("guardUp", 9, 4),
  ]),
  hero("amadeu", "Amadeu", "legendary", "guard", 1, "The one Palis actually worries about.", [
    skill("power", 12, 0), skill("loot", 9, 2), skill("shield", 8, 4),
  ]),
  hero("zaza", "Zaza", "legendary", "guard", 2, "Naps at her post. Wakes up swinging.", [
    skill("guardUp", 13, 0), skill("shield", 8, 2), skill("power", 8, 4),
  ]),
  hero("hilda", "Hilda", "legendary", "runner", 2, "Jasper, but she finishes the job.", [
    skill("guardUp", 14, 0), skill("power", 9, 2), skill("mend", 9, 4),
  ]),
  hero("merlin", "Merlin", "legendary", "slinger", 2, "Hits things from further than seems fair.", [
    skill("power", 14, 0), skill("loot", 10, 2), skill("shield", 6, 4),
  ]),
  hero("enzo", "Enzo", "legendary", "guard", 3, "Nothing gets past. Nothing.", [
    skill("guardUp", 15, 0), skill("shield", 10, 2), skill("power", 9, 4),
  ]),
  hero("jujuba", "Jujuba", "legendary", "slinger", 3, "Loud, accurate, deeply annoying.", [
    skill("power", 15, 0), skill("guardUp", 9, 2), skill("loot", 10, 4),
  ]),
  hero("petra", "Petra", "legendary", "runner", 3, "Charges first, thinks later, usually right.", [
    skill("power", 16, 0), skill("loot", 11, 2), skill("mend", 8, 4),
  ]),
];

// ---------------------------------------------------------------------------
//  MYTHIC — Kingshot's Gen 4–7. The 0.05% pulls, and the reason the pity
//  counter exists.
// ---------------------------------------------------------------------------
const MYTHICS = [
  hero("alcaparra", "Alcaparra", "mythic", "guard", 4, "Turns the front line into the problem.", [
    skill("power", 18, 0), skill("guardUp", 12, 2), skill("loot", 12, 4),
  ]),
  hero("rosa", "Rosa", "mythic", "slinger", 4, "Leads the patrol. Everyone follows.", [
    skill("power", 19, 0), skill("loot", 14, 2), skill("shield", 10, 4),
  ]),
  hero("margo", "Margô", "mythic", "runner", 4, "Damage happens to other cats.", [
    skill("shield", 18, 0), skill("guardUp", 13, 2), skill("power", 12, 4),
  ]),
  hero("longuinho", "Longuinho", "mythic", "guard", 5, "Heals by hitting. Nobody has explained it.", [
    skill("mend", 20, 0), skill("power", 14, 2), skill("shield", 12, 4),
  ]),
  hero("vivi", "Vivi", "mythic", "slinger", 5, "Always exactly where she is needed.", [
    skill("power", 20, 0), skill("allProduce", 8, 2), skill("loot", 13, 4),
  ]),
  hero("trufa", "Trufa", "mythic", "runner", 5, "Picks her target and it is always the worst one.", [
    skill("power", 21, 0), skill("loot", 14, 2), skill("guardUp", 12, 4),
  ]),
  hero("yang", "Yang", "mythic", "slinger", 6, "Clears a whole wave on her own.", [
    skill("power", 23, 0), skill("loot", 15, 2), skill("shield", 11, 4),
  ]),
  hero("tritao", "Tritão", "mythic", "guard", 6, "Enormous numbers, questionable technique.", [
    skill("power", 24, 0), skill("guardUp", 14, 2), skill("mend", 12, 4),
  ]),
  hero("sofia", "Sofia", "mythic", "runner", 6, "Holds the whole gate by herself.", [
    skill("guardUp", 22, 0), skill("shield", 15, 2), skill("power", 15, 4),
  ]),
  hero("ava", "Ava", "mythic", "runner", 7, "Built for one thing and perfect at it.", [
    skill("power", 27, 0), skill("loot", 18, 2), skill("guardUp", 13, 4),
  ]),
  hero("carlos", "Carlos", "mythic", "guard", 7, "The wall the wall leans on.", [
    skill("guardUp", 25, 0), skill("shield", 17, 2), skill("power", 16, 4),
  ]),
  hero("miumia", "Miu & Mia", "mythic", "slinger", 7, "Two cats, one slingshot, no survivors.", [
    skill("power", 28, 0), skill("loot", 19, 2), skill("allProduce", 9, 4),
  ]),
];

export const HEROES = [...RARES, ...EPICS, ...LEGENDARIES, ...MYTHICS];
export const HERO_BY_ID = Object.fromEntries(HEROES.map((h) => [h.id, h]));

export const heroesOf = (rarity) => HEROES.filter((h) => h.rarity === rarity);

/** Art comes from the pulled tubby cats pool. Assigned by rarity and index so
 *  the same hero always wears the same face, without hand-picking 34 files. */
export function heroArt(heroId, pool) {
  const h = HERO_BY_ID[heroId];
  if (!h || !pool?.length) return null;
  const sameTier = pool.filter((c) => c.rarity === h.rarity);
  const list = sameTier.length ? sameTier : pool;
  const i = heroesOf(h.rarity).findIndex((x) => x.id === heroId);
  return list[(i < 0 ? 0 : i) % list.length]?.art || null;
}
