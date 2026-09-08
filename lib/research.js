// ============================================================================
//  TUBBY TOWN — THE STUDY  (Kingshot's Academy)
//
//  The deepest sink in the game, and the one that never finishes. Kingshot's
//  Academy holds three trees — Growth (45 technologies), Economy (44) and
//  Battle (102) — and its own guides note that "maxing all research takes years
//  of real time". That is not a warning, it is the design: a system a player
//  can finish is a system that stops giving them a reason to log in.
//
//  Researched rather than invented. The Battle tree's technologies are
//  Kingshot's, name for name, re-themed:
//
//      Weapons Prep              → Claw Sharpening      all attack
//      Reprisal Tactics          → Guard Drills         guard attack
//      Precision Targeting       → Steady Aim           slinger attack
//      Cavalry Charge            → Full Sprint          runner attack
//      Special Defensive Training→ Thick Coats          all defence
//      Defensive Formations      → Shield Wall          guard defence
//      Picket Lines              → Cover Fire           slinger defence
//      Bulwark Formations        → Braced Stance        runner defence
//      Survival Techniques       → Nine Lives           all health
//      Shield Upgrade            → Padded Vests         guard health
//      Leathercraft              → Leather Bracers      slinger health
//      Fortified Mail            → Quilted Barding      runner health
//      Assault Techniques        → Killer Instinct      all lethality
//      Close Combat              → Close Paws           guard lethality
//      Targeted Sniping          → Dead Eye             slinger lethality
//      Lance Upgrade             → Pounce Training      runner lethality
//      Regimental Expansion      → Bigger Patrols       deployment capacity
//
//  And Growth's three named ones:
//      Tooling Up                → Better Tools         construction speed
//      Tool Enhancement          → Sharper Minds        research speed
//      Command Tactics           → Extra Orders         more on patrol
//
//  Every technology runs I to VI, which is Kingshot's own shape.
//
//  ---------------------------------------------------------------------------
//  ONE AT A TIME
//
//  Kingshot runs a single research slot, and that constraint is what makes the
//  tree a decision instead of a shopping list. With one slot the question is
//  never "what can I afford" but "what do I want first", and the recommended
//  order in every guide — Sharper Minds, then Better Tools, then Extra Orders —
//  exists precisely because you cannot have them all at once.
//
//  Sharper Minds researching FASTER RESEARCH is the compounding trap at the
//  heart of it, and it is why every guide says to take it first.
//
//  ⚠ Client-side, therefore advisory. Timers and grants move to the server —
//  docs/security.md §1.
// ============================================================================

/** The three trees, in the order the Study shows them. */
export const TREES = {
  growth: { id: "growth", name: "Growth", blurb: "Build faster, research faster, command more." },
  economy: { id: "economy", name: "Economy", blurb: "Everything the town produces and holds." },
  battle: { id: "battle", name: "Battle", blurb: "What your cats are worth in a fight." },
};

export const MAX_TECH_LEVEL = 6;
export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

/**
 * One technology.
 *
 * `at` is the Study level it unlocks at — the tree opens gradually rather than
 * all at once, so a new Study is a short readable list rather than a wall of
 * ninety greyed rows.
 *
 * `effect` and `amount` are read by the economy. A technology whose effect the
 * game cannot compute is a technology that does nothing.
 */
const tech = (id, name, tree, at, effect, amount, opts = {}) => ({
  id, name, tree, at, effect, amount,
  needs: opts.needs || null,
  mat: opts.mat || "wood",
  cls: opts.cls || null,
});

export const TECHS = [
  // ---- GROWTH ------------------------------------------------------------
  // Kingshot's own recommended opener, and for a reason worth stating: it makes
  // every later research cheaper in the only currency research really costs,
  // which is time.
  tech("sharper", "Sharper Minds", "growth", 1, "research", 6),
  tech("tools", "Better Tools", "growth", 1, "build", 5),
  tech("orders", "Extra Orders", "growth", 3, "patrol", 0.5, { needs: "tools" }),
  tech("logistics", "Logistics", "growth", 4, "build", 5, { needs: "tools", mat: "stone" }),
  tech("bookkeeping", "Bookkeeping", "growth", 6, "research", 6, { needs: "sharper", mat: "stone" }),

  // ---- ECONOMY -----------------------------------------------------------
  tech("nets", "Better Nets", "economy", 1, "produce", 5, { cls: "fish" }),
  tech("saws", "Sharper Saws", "economy", 1, "produce", 5, { cls: "wood" }),
  tech("chisels", "Harder Chisels", "economy", 2, "produce", 5, { cls: "stone", mat: "stone" }),
  tech("greenhouse", "Glasshouses", "economy", 4, "produce", 5, { cls: "catnip", mat: "stone" }),
  tech("shelving", "Deep Shelving", "economy", 3, "store", 8, { mat: "stone" }),
  tech("rations", "Careful Rations", "economy", 5, "upkeep", 4, { needs: "nets" }),
  tech("ledgers", "Ledgers", "economy", 6, "gold", 6, { needs: "shelving", mat: "catnip" }),
  tech("yield", "Good Harvests", "economy", 8, "allProduce", 4, { needs: "saws", mat: "catnip" }),

  // ---- BATTLE ------------------------------------------------------------
  // Attack
  tech("claws", "Claw Sharpening", "battle", 2, "atk", 4),
  tech("drills", "Guard Drills", "battle", 3, "atk", 5, { cls: "guard", needs: "claws" }),
  tech("aim", "Steady Aim", "battle", 3, "atk", 5, { cls: "slinger", needs: "claws" }),
  tech("sprint", "Full Sprint", "battle", 3, "atk", 5, { cls: "runner", needs: "claws" }),
  // Defence
  tech("coats", "Thick Coats", "battle", 2, "def", 4),
  tech("wall", "Shield Wall", "battle", 4, "def", 5, { cls: "guard", needs: "coats", mat: "stone" }),
  tech("cover", "Cover Fire", "battle", 4, "def", 5, { cls: "slinger", needs: "coats", mat: "stone" }),
  tech("braced", "Braced Stance", "battle", 4, "def", 5, { cls: "runner", needs: "coats", mat: "stone" }),
  // Health
  tech("lives", "Nine Lives", "battle", 3, "hp", 4),
  tech("vests", "Padded Vests", "battle", 5, "hp", 5, { cls: "guard", needs: "lives", mat: "stone" }),
  tech("bracers", "Leather Bracers", "battle", 5, "hp", 5, { cls: "slinger", needs: "lives", mat: "stone" }),
  tech("barding", "Quilted Barding", "battle", 5, "hp", 5, { cls: "runner", needs: "lives", mat: "stone" }),
  // Lethality
  tech("instinct", "Killer Instinct", "battle", 6, "leth", 4, { mat: "catnip" }),
  tech("closepaws", "Close Paws", "battle", 7, "leth", 5, { cls: "guard", needs: "instinct", mat: "catnip" }),
  tech("deadeye", "Dead Eye", "battle", 7, "leth", 5, { cls: "slinger", needs: "instinct", mat: "catnip" }),
  tech("pounce", "Pounce Training", "battle", 7, "leth", 5, { cls: "runner", needs: "instinct", mat: "catnip" }),
  // Capacity
  tech("patrols", "Bigger Patrols", "battle", 6, "army", 8, { needs: "claws", mat: "stone" }),
];

export const TECH_BY_ID = Object.fromEntries(TECHS.map((t) => [t.id, t]));
export const techsIn = (tree) => TECHS.filter((t) => t.tree === tree);

/** A technology's current level. */
export const techLevel = (save, id) => save?.tech?.[id] || 0;

/** Cost of the next level. Steep, because research is the sink that is meant to
 *  absorb a mature town's entire output. */
export function techCost(t, level) {
  const L = level + 1;
  return {
    wood: Math.round(900 * Math.pow(L, 2.1)),
    coin: Math.round(600 * Math.pow(L, 1.9)),
    [t.mat]: Math.round((t.mat === "catnip" ? 90 : 500) * Math.pow(L, 2.0)),
  };
}

/** Seconds for the next level, before any research-speed bonus. SHORT here so
 *  the loop can be play-tested; the real curve is hours into days. */
export function techSeconds(t, level) {
  return Math.round(45 * Math.pow(level + 1, 1.9));
}

/** Is this technology available to start right now? Returns why not. */
export function techBlocked(save, t, studyLevel) {
  if (studyLevel < t.at) return `The Study must reach level ${t.at}`;
  if (t.needs && techLevel(save, t.needs) < 1) {
    return `Research ${TECH_BY_ID[t.needs].name} first`;
  }
  if (techLevel(save, t.id) >= MAX_TECH_LEVEL) return "Fully researched";
  return null;
}

// ---------------------------------------------------------------------------
//  WHAT THE TREE ADDS UP TO
//
//  One object, read by the town and by the fight, so a technology's stated
//  effect and the game's actual numbers can never disagree.
// ---------------------------------------------------------------------------

export function researchBonuses(save) {
  const out = {
    build: 0, research: 0, patrol: 0, store: 0, upkeep: 0, gold: 0, allProduce: 0, army: 0,
    produce: {},
    atk: { all: 0, guard: 0, slinger: 0, runner: 0 },
    def: { all: 0, guard: 0, slinger: 0, runner: 0 },
    hp: { all: 0, guard: 0, slinger: 0, runner: 0 },
    leth: { all: 0, guard: 0, slinger: 0, runner: 0 },
  };
  for (const t of TECHS) {
    const lvl = techLevel(save, t.id);
    if (lvl <= 0) continue;
    const v = t.amount * lvl;
    if (t.effect === "produce") out.produce[t.cls] = (out.produce[t.cls] || 0) + v;
    else if (["atk", "def", "hp", "leth"].includes(t.effect)) out[t.effect][t.cls || "all"] += v;
    else out[t.effect] += v;
  }
  return out;
}

/** The combat multiplier for one class, from the tree. */
export function combatBonus(bonuses, kind, cls) {
  const b = bonuses?.[kind];
  if (!b) return 1;
  return 1 + (b.all + (b[cls] || 0)) / 100;
}

/** Research runs faster as research speed goes up — the compounding trap, and
 *  the reason every guide says to take Sharper Minds first. */
export function effectiveSeconds(t, level, bonuses) {
  return Math.max(5, Math.round(techSeconds(t, level) / (1 + (bonuses?.research || 0) / 100)));
}
