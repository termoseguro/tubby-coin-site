// ============================================================================
//  TUBBY TOWN — CAT VILLAGERS
//
//  The OTHER kind of cat, and this file exists mostly to make the difference
//  impossible to miss:
//
//    A VILLAGER lives in a Cat Cottage and stands inside a building doing its
//      work. It has a name and a face and a level. It has no stars, no skills,
//      and it never goes on patrol. Villagers are your POPULATION.
//
//    A HERO (lib/heroes.js) is never assigned to a building. It has stars,
//      skills and a class, it leads the patrol, and its skills pay the whole
//      town at once. Heroes are your ROSTER.
//
//  Kingshot draws exactly this line — Residents are assigned as workers, hunters
//  and chefs; Heroes are a separate system entirely — and the reason to hold it
//  is that a player who cannot tell them apart cannot make a decision about
//  either.
//
//  ---------------------------------------------------------------------------
//  NOBODY IS CALLED "ORDINARY CAT"
//
//  The gacha's common slot used to hand back a thing labelled "an ordinary
//  cat", which is a terrible thing to receive from a wheel you paid to spin.
//  It is also wrong: what you got is a real cat with a real face joining your
//  town, and the fact that it works rather than fights does not make it
//  ordinary. So every villager gets a name here — stable, derived from the
//  cat's own token id, so the same cat is always called the same thing.
// ============================================================================

/** Names, deliberately homely. A villager is somebody's cat, not a champion,
 *  and the names should sound like it next to Amadeu and Miu & Mia. */
const FIRST = [
  "Mimi", "Bolinha", "Frajola", "Nina", "Tigrinho", "Amora", "Pipoca", "Chico",
  "Mel", "Zoe", "Salem", "Pandora", "Fumaça", "Biscoito", "Nuvem", "Pretinha",
  "Malu", "Tobias", "Lua", "Cacau", "Pingo", "Jujuba", "Bento", "Maré",
  "Farofa", "Neve", "Café", "Dengo", "Manteiga", "Pérola", "Rabisco", "Sol",
  "Tofu", "Vento", "Xodó", "Zíper", "Abacate", "Brigadeiro", "Canela", "Doce",
  "Espuma", "Feijão", "Gota", "Hortelã", "Íris", "Jabuti", "Ketchup", "Limão",
  "Musse", "Nhoque", "Oliva", "Pudim", "Quindim", "Risoto", "Suflê", "Trufa",
  "Uva", "Vinagre", "Waffle", "Xarope", "Iogurte", "Zimbro", "Amêndoa", "Broa",
];

/** A villager's name, from their token id. Stable forever: the same cat is
 *  always called the same thing, on every device, without storing it. */
export function villagerName(id) {
  return FIRST[Math.abs(Number(id) || 0) % FIRST.length];
}

/** Turn a pool entry into a villager ready to join the town. */
export function makeVillager(poolCat) {
  return {
    rarity: poolCat.rarity,
    art: poolCat.art,
    name: villagerName(poolCat.id),
    id: poolCat.id,
    level: 1,
    shards: 0,
  };
}

/** Pick a villager from the pool at a given rarity, falling back to any. */
export function pickVillager(pool, rarity = "common", rng = Math.random) {
  const of = pool.filter((c) => c.rarity === rarity);
  const list = of.length ? of : pool;
  if (!list.length) return null;
  return makeVillager(list[Math.floor(rng() * list.length)]);
}

/** The one-line explanation, kept here so every screen says the same thing.
 *  Two systems described in two different places drift, and the drift is
 *  exactly the confusion this file is trying to prevent. */
export const VILLAGER_BLURB =
  "Villagers live in your Cat Cottages and work inside buildings. They are your population — the more you house, the more buildings you can staff.";

export const HERO_BLURB =
  "Heroes never work inside a building. They have stars and skills, they lead the patrol against Palis, and their skills pay the whole town at once.";
