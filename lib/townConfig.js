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

export const WORLD = { w: 1400, h: 480 };

/** Ground starts here; everything above is sky. */
export const HORIZON = 150;

/** The two streets. Back-row cats work on the upper one, front row on the lower. */
export const LANES = { back: 338, front: 462 };

/** Kawaii palette per building. Same silhouette family, different colour and
 *  roof shape, so every building is identifiable at a glance. */
export const BUILDINGS = [
  // ---- back row (smaller, further away) ------------------------------------
  {
    id: "watchtower", name: "Watchtower", short: "Events",
    x: 196, y: 300, w: 88, h: 124, scale: 0.85, row: "back",
    body: 0xe6d4f5, roof: 0x9a6bc4, trim: 0xb98fe0, shape: "tower",
  },
  {
    id: "quarry", name: "Stone Quarry", short: "Pebbles",
    x: 486, y: 300, w: 116, h: 88, scale: 0.85, row: "back",
    body: 0xdde3ee, roof: 0x8a97ad, trim: 0xa9b4c7, shape: "pit",
  },
  {
    id: "lumber", name: "Lumber Yard", short: "Planks",
    x: 738, y: 300, w: 122, h: 92, scale: 0.85, row: "back",
    body: 0xf3e2ca, roof: 0xc08b4f, trim: 0xd7a76b, shape: "shed",
  },
  {
    id: "garden", name: "Catnip Garden", short: "Catnip",
    x: 992, y: 300, w: 126, h: 78, scale: 0.85, row: "back",
    body: 0xd6f2b8, roof: 0x78be4f, trim: 0x9ad46f, shape: "garden",
  },
  {
    id: "storehouse", name: "Storehouse", short: "Storage",
    x: 1246, y: 300, w: 106, h: 100, scale: 0.85, row: "back",
    body: 0xcbe4f7, roof: 0x5b9bd1, trim: 0x8cc2e8, shape: "barn",
  },

  // ---- front row (larger, closest) -----------------------------------------
  {
    id: "nap", name: "Nap House", short: "Rest",
    x: 138, y: 430, w: 126, h: 100, scale: 1, row: "front",
    body: 0xe0d2ff, roof: 0x9b7fe0, trim: 0xbca8f0, shape: "house",
  },
  {
    id: "kitchen", name: "Kitchen", short: "Kibble",
    x: 420, y: 430, w: 132, h: 96, scale: 1, row: "front",
    body: 0xcdf2de, roof: 0x57c89a, trim: 0x8fe0bd, shape: "house",
  },
  {
    id: "hall", name: "Cat Hall", short: "Town centre",
    x: 706, y: 430, w: 168, h: 132, scale: 1, row: "front",
    body: 0xffc2e2, roof: 0xe8619f, trim: 0xff9ecb, shape: "hall",
  },
  {
    id: "treats", name: "Treat Factory", short: "Treats",
    x: 1000, y: 430, w: 142, h: 100, scale: 1, row: "front",
    body: 0xffdcc2, roof: 0xf08a54, trim: 0xffb387, shape: "factory",
  },
  {
    id: "adoption", name: "Adoption Center", short: "New cats",
    x: 1272, y: 430, w: 134, h: 106, scale: 1, row: "front",
    body: 0xfff2cc, roof: 0xf2b33d, trim: 0xffd977, shape: "gift",
  },
];

/** Where a cat stands while working at a building: on the street in front of
 *  it, spread out so three cats at one building never stack. */
export function workSpot(b, slot = 0) {
  const n = slot % 3;
  return {
    x: b.x + (n - 1) * 36,
    y: LANES[b.row],
  };
}
