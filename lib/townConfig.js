// ============================================================================
//  TUBBY TOWN — the town layout
//  Where each building sits, what it looks like, and where its cats stand.
//
//  The world is a fixed 1400×480 canvas scaled to fit its container — wide and
//  shallow, so the town reads as a street rather than a tall diorama, and so
//  it does not eat the whole screen on a laptop.
//
//  Two rows, two streets. The back row is drawn smaller so the town has depth;
//  cats walking the upper street pass *behind* the front row, which sells it.
//  Name plates sit above each roof so the ground stays clear for the cats.
//
//  Names must state the function — see docs/game-design.md §3.
// ============================================================================

export const WORLD = { w: 1600, h: 760 };

/** Ground starts here; everything above is sky. */
export const HORIZON = 250;

/** The two streets. Back-row cats work on the upper one, front row on the lower. */
export const LANES = { back: 522, front: 734 };

/** Kawaii palette per building. Same silhouette family, different colour and
 *  roof shape, so every building is identifiable at a glance. */
export const BUILDINGS = [
  // ---- back row (smaller, further away) ------------------------------------
  {
    id: "watchtower", name: "Watchtower", short: "Events",
    x: 250, y: 470, w: 88, h: 124, scale: 0.95, row: "back",
    body: 0xe6d4f5, roof: 0x9a6bc4, trim: 0xb98fe0, shape: "tower",
  },
  {
    id: "quarry", name: "Stone Quarry", short: "Pebbles",
    x: 570, y: 470, w: 116, h: 88, scale: 0.95, row: "back",
    body: 0xdde3ee, roof: 0x8a97ad, trim: 0xa9b4c7, shape: "pit",
  },
  {
    id: "lumber", name: "Lumber Yard", short: "Planks",
    x: 890, y: 470, w: 122, h: 92, scale: 0.95, row: "back",
    body: 0xf3e2ca, roof: 0xc08b4f, trim: 0xd7a76b, shape: "shed",
  },
  {
    id: "garden", name: "Catnip Garden", short: "Catnip",
    x: 1210, y: 470, w: 126, h: 78, scale: 0.95, row: "back",
    body: 0xd6f2b8, roof: 0x78be4f, trim: 0x9ad46f, shape: "garden",
  },
  {
    id: "storehouse", name: "Storehouse", short: "Storage",
    x: 1500, y: 470, w: 106, h: 100, scale: 0.95, row: "back",
    body: 0xcbe4f7, roof: 0x5b9bd1, trim: 0x8cc2e8, shape: "barn",
  },

  // ---- front row (larger, closest) -----------------------------------------
  {
    id: "nap", name: "Nap House", short: "Rest",
    x: 150, y: 628, w: 126, h: 100, scale: 1.15, row: "front",
    body: 0xe0d2ff, roof: 0x9b7fe0, trim: 0xbca8f0, shape: "house",
  },
  {
    id: "kitchen", name: "Kitchen", short: "Kibble",
    x: 470, y: 628, w: 132, h: 96, scale: 1.15, row: "front",
    body: 0xcdf2de, roof: 0x57c89a, trim: 0x8fe0bd, shape: "house",
  },
  {
    id: "hall", name: "Cat Hall", short: "Town centre",
    x: 790, y: 636, w: 168, h: 132, scale: 1.15, row: "front",
    body: 0xffc2e2, roof: 0xe8619f, trim: 0xff9ecb, shape: "hall",
  },
  {
    id: "treats", name: "Treat Factory", short: "Treats",
    x: 1110, y: 628, w: 142, h: 100, scale: 1.15, row: "front",
    body: 0xffdcc2, roof: 0xf08a54, trim: 0xffb387, shape: "factory",
  },
  {
    id: "adoption", name: "Adoption Center", short: "New cats",
    x: 1430, y: 628, w: 134, h: 106, scale: 1.15, row: "front",
    body: 0xfff2cc, roof: 0xf2b33d, trim: 0xffd977, shape: "gift",
  },
];

// ---------------------------------------------------------------------------
//  What each building DOES — the data the tap-panel reads.
//  Buildings are static sprites, exactly as in Clash of Clans / Hay Day / Cats
//  and Soup. Interactivity is not 3D; it is: a hit area, state overlays drawn
//  on top, and a panel that opens on tap. See docs/game-design.md §11.
// ---------------------------------------------------------------------------

/** Per-building behaviour. `produces` is the resource id, null for buildings
 *  that gate or store rather than produce. */
export const BUILDING_INFO = {
  hall: {
    produces: null,
    desc: "The town centre. Its level caps how many cats can work, how many buildings you may own, and how far each one can be upgraded.",
    unlocksAt: (lvl) => `Worker cap ${2 + lvl * 2} · building cap ${4 + lvl}`,
  },
  adoption: { produces: null, desc: "Where new cats come from. Pulls happen here, at the published odds." },
  nap: { produces: null, desc: "Every cat needs a bed. This building alone decides how many cats can be on shift at once.", unlocksAt: (lvl) => `${1 + lvl * 2} cats on shift` },
  kitchen: { produces: "fish", desc: "Cooks Fish. Every cat on shift eats Fish every hour — run out and the whole town drops to a quarter speed." },
  treats: { produces: "treats", desc: "Refines Fish and Catnip into Treats — the currency the Adoption Center runs on. No ingredients, no Treats." },
  lumber: { produces: "wood", desc: "Shreds scratching posts into Wood. Every construction in town wants it." },
  quarry: { produces: "stone", desc: "Cuts Stone. Scarce by design, and every upgrade past level 2 asks for it." },
  garden: { produces: "catnip", desc: "Grows Catnip — the rarest thing in town. The Treat Factory eats it, and so do upgrades past level 4." },
  storehouse: { produces: null, desc: "Raises the cap on every resource you can hold. Hit the cap and production is wasted.", unlocksAt: (lvl) => `Cap ${(2 + lvl) * 2500}` },
  watchtower: { produces: null, desc: "Watches the road. Spots Palis coming, and welcomes Icy." },
};

/** Upgrade cost in Treats. Exponential on purpose — the wall has to arrive
 *  somewhere, just not during the grace period (docs/game-design.md §11b). */
export const upgradeCost = (level) => Math.round(150 * Math.pow(level, 1.85));

/** Build time in seconds. SHORT here so the loop can be play-tested; real
 *  values are hours, and the server owns the clock (docs/security.md §4b). */
export const buildSeconds = (level) => Math.round(20 * Math.pow(level, 1.6));

export const MAX_LEVEL = 10;

/** Where a cat stands while working at a building: on the street in front of
 *  it, spread out so three cats at one building never stack. */
export function workSpot(b, slot = 0) {
  const n = slot % 3;
  return {
    x: b.x + (n - 1) * 36,
    y: LANES[b.row],
  };
}
