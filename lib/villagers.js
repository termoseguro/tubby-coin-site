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

/** THE GAME IS IN ENGLISH.
 *
 *  These were Portuguese — Frajola, Feijão, Brigadeiro — which is charming and
 *  wrong: the audience is English-speaking and a player who cannot pronounce
 *  their own cat does not get attached to it.
 *
 *  And there were sixty-four of them, picked with `id % 64`. With 950 cats in
 *  the pool and twenty thousand in the collection, that is not "some
 *  duplicates", it is fifteen Frajolas in the Adoption Center at once. A name
 *  every fifteenth cat shares is not a name.
 *
 *  So a villager gets a FIRST NAME and a SURNAME, drawn from two different
 *  hashes of the token id: 120 x 80 = 9,600 combinations, still completely
 *  deterministic, still stored nowhere. Two cats can share a first name — real
 *  towns do — but the pair is what identifies them.
 */
const FIRST = [
  "Milo", "Biscuit", "Poppy", "Otis", "Willow", "Bean", "Pepper", "Nutmeg",
  "Clover", "Mochi", "Sable", "Juniper", "Waffle", "Pickle", "Marlow", "Tilly",
  "Rusty", "Olive", "Bramble", "Noodle", "Hazel", "Barnaby", "Suki", "Pumpkin",
  "Wren", "Toast", "Maple", "Gizmo", "Peanut", "Winnie", "Rufus", "Cricket",
  "Dumpling", "Bertie", "Saffron", "Pipkin", "Moss", "Marmalade", "Fern", "Cobweb",
  "Nimbus", "Truffle", "Basil", "Pearl", "Sprocket", "Dandelion", "Gus", "Bobbin",
  "Cinder", "Plum", "Teasel", "Mortimer", "Bluebell", "Scone", "Gravy", "Perch",
  "Thimble", "Whisker", "Dozy", "Cornelius", "Bumble", "Fig", "Nettle", "Rook",
  "Custard", "Pebble", "Tansy", "Winston", "Sorrel", "Crumpet", "Bodkin", "Vesper",
  "Sixpence", "Radish", "Halibut", "Nutkin", "Beetle", "Parsnip", "Tabitha", "Grover",
  "Quill", "Mabel", "Chutney", "Hopscotch", "Filbert", "Drizzle", "Sockets", "Wilbur",
  "Nougat", "Puddle", "Tarragon", "Bristle", "Cobbler", "Marzipan", "Flint", "Doughnut",
  "Sprig", "Havoc", "Lintel", "Pomelo", "Thackeray", "Wobble", "Kipper", "Bunty",
  "Snapdragon", "Turnip", "Meringue", "Cutlet", "Jigsaw", "Poppet", "Hobnob", "Skittle",
  "Bramwell", "Fennel", "Gadget", "Rumple", "Cinnamon", "Trundle", "Wisp", "Yarrow",
];

/** Surnames a cat could plausibly have earned. Half of them are places a cat
 *  sits and half are things a cat has done. */
const LAST = [
  "Whiskerton", "Pawson", "Mittens", "Tumbleweed", "Ashcroft", "Barnwell", "Cobblestone",
  "Dimplewood", "Everdew", "Fernbank", "Grimsby", "Hollowell", "Inkwell", "Jamboree",
  "Kettleby", "Longtail", "Mossgate", "Nettlefold", "Oakhurst", "Pemberly",
  "Quickstep", "Ravenswood", "Sootfoot", "Thistledown", "Underbough", "Velvetpaw",
  "Windrush", "Yarnley", "Amberley", "Brindlecombe", "Chimneypot", "Dovecote",
  "Elmshade", "Fiddlewick", "Gorsehill", "Hearthstone", "Ivyclaw", "Jugglewood",
  "Kindlewick", "Larkspur", "Marchbanks", "Nutthatch", "Ollerton", "Puddleby",
  "Quilterton", "Rushmoor", "Saltmarsh", "Tallowick", "Umberdown", "Vinegary",
  "Woolsey", "Yewbank", "Applewhite", "Bristlecone", "Coppersmith", "Dunmarrow",
  "Eaveswick", "Frostbank", "Glimmerbrook", "Hawthorne", "Icecap", "Jessamy",
  "Kilnwood", "Lambwick", "Mulberry", "Nightingale", "Orchardly", "Pennyroyal",
  "Quarrenden", "Rooftree", "Sparrowgrass", "Tanglefoot", "Upperby", "Vexington",
  "Weatherby", "Yellowgate", "Ambleside", "Bellhanger", "Crumbworth", "Draycott",
];

/** Two different hashes, so the first name and the surname move independently.
 *  A single hash would pair them forever and the space would collapse back to
 *  the size of the shorter list.
 *
 *  USE Math.imul, NOT `*`. The first version of this multiplied with plain `*`,
 *  which in JavaScript is a 64-bit float: (id+1) * 2654435761 loses its low
 *  bits long before the `>>>` coerces it back to int32, so nearby ids hashed to
 *  the same bucket. It turned 9,600 possible names into 91 actual ones across
 *  the first 950 cats — worse than the sixty-four Portuguese ones it replaced.
 *  Math.imul is the 32-bit multiply this needs. */
function pick(list, id, salt) {
  let h = Math.imul(Math.abs(Number(id) || 0) + 1, 2654435761) ^ Math.imul(salt + 1, 40503);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return list[(h >>> 0) % list.length];
}

/** A villager's full name, from their token id. Stable forever: the same cat
 *  is always called the same thing, on every device, without storing it. */
export function villagerName(id) {
  return pick(FIRST, id, 1) + " " + pick(LAST, id, 2);
}

/** Just the first name, for the places a full name will not fit — a chip on a
 *  building, a cat standing in the town. */
export function villagerShortName(id) {
  return pick(FIRST, id, 1);
}

/** An id for a villager saved before ids existed. Villagers are keyed by
 *  `rarity|art` in old saves, and both the name and the drawn face come from
 *  the id — so without this, every legacy villager would be the same cat with
 *  the same name. Any stable hash of the key will do; this one is small. */
export function villagerIdFromKey(key = "") {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 20000;
}

/** Where a villager's picture lives. DERIVED, never stored: a villager is its
 *  token id, and the id is enough to find everything else about it. Saving the
 *  path is what let two cats with the same picture become the same cat, and it
 *  is dead weight in every save file. */
export function villagerArt(id) {
  return `/cats/${Math.abs(Number(id) || 0)}.webp`;
}

/** Turn a pool entry into a villager ready to join the town. It keeps the id
 *  and the rarity; the picture and the name both come back out of the id. */
export function makeVillager(poolCat) {
  return {
    rarity: poolCat.rarity,
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
