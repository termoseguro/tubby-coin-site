// ============================================================================
//  TUBBY TOWN — the town layout
//  Where each building sits, what it looks like, when it unlocks.
//
//  THREE CONCENTRIC RINGS around the Cat Hall, which is the exact shape every
//  city builder in this lineage uses. It is not decoration: the ring is what
//  makes the town centre read as a centre, and it puts the buildings you tap
//  most often closest to the thing you look at first.
//
//      ring 1  (rx 430, ry 330)   the five producers + the Storehouse
//      ring 2  (rx 800, ry 430)   civic: adoption, clinic, study, walls, and the
//                                 FIRST cottage, so the first home you build is
//                                 right beside the hall
//      ring 3  (rx 1150, ry 560)  the rest of the Cat Cottages, spreading out
//      ring 4  (rx 1280, ry 540)  the military quarter along the back: training,
//                                 range, stable, war room, guild hall, forge
//
//  Every position below was derived from those ellipses and then CHECKED: no
//  two buildings sit within 210px horizontally and 200px vertically of each
//  other, which is what it takes for one to cover another's name plate. Nudge
//  one by hand and re-check that, or the town silently eats its own labels.
//
//  There is no Nap House. Kingshot has no such building: Houses hold the
//  residents, and residents rest where they live. A separate "where cats sleep"
//  building on top of "where cats live" was the same idea twice, and the two
//  names could not be told apart. Cats now sleep at their own cottage, and a
//  cat that is actually hurt goes to the Cat Clinic — which is Kingshot's
//  Infirmary, the building that really does exist for that.
//
//  The y radius is smaller than the x radius on purpose: the squash is what
//  reads as ground receding, and it keeps buildings on the same ring from
//  landing on each other's name plates. Positions were derived from those
//  ellipses and then written out literally, so any single building can be
//  nudged without recomputing the town.
//
//  Names must state the function — see docs/game-design.md §3.
// ============================================================================

export const WORLD = { w: 3000, h: 1760 };

/** Ground starts here; everything above is sky. */
export const HORIZON = 110;

/** The heart of the town. Every road runs out of here, and cats crossing the
 *  map pass through it — which is what makes it read as a centre rather than
 *  as the middle item in a row. */
export const PLAZA = { x: 1500, y: 900 };

/** What the camera frames when the town OPENS.
 *
 *  Not the whole world. The world is now large enough to hold every building
 *  the game will ever have, and fitting all of it on screen makes the town the
 *  player actually owns look like a postage stamp — the exact complaint that
 *  started this layout. So the opening shot is the two inner rings, which is
 *  everything that exists early, and the residential belt is something you
 *  find by dragging outward. */
export const FOCUS = { x: 1500, y: 1010, w: 2050, h: 1290 };

/** How many Cat Cottages the town can ever have. Kingshot caps Houses at 8 and
 *  residents at 32; ours matches, because that is the number the whole late
 *  game is balanced against. */
export const MAX_COTTAGES = 8;

export const COTTAGE_IDS = Array.from({ length: MAX_COTTAGES }, (_, i) => `cottage${i + 1}`);

/** Kawaii palette per building. Same silhouette family, different colour and
 *  roof shape, so every building is identifiable at a glance.
 *
 *  `unlockAt` is the CAT HALL LEVEL that reveals it. `built` marks the handful
 *  that exist on day one; everything else arrives as a plot you construct.
 *  This is the answer to "a new player logs in and has nothing to unlock":
 *  there is always a next building, and it is always behind the Cat Hall. */
export const BUILDINGS = [
  // ---- ring 1 · production, closest to the hall ----------------------------
  {
    id: "hall", name: "Cat Hall", short: "Town centre",
    x: 1500, y: 900, w: 168, h: 132, scale: 1.2, ring: 1,
    unlockAt: 1, built: true,
    body: 0xffc2e2, roof: 0xe8619f, trim: 0xff9ecb, shape: "hall",
  },
  {
    id: "kitchen", name: "Kitchen", short: "Kibble",
    x: 1500, y: 1230, w: 132, h: 96, scale: 1.12, ring: 1,
    unlockAt: 1, built: true,
    body: 0xcdf2de, roof: 0x57c89a, trim: 0x8fe0bd, shape: "house",
  },
  {
    id: "lumber", name: "Lumber Yard", short: "Planks",
    x: 1852, y: 711, w: 122, h: 92, scale: 0.98, ring: 1,
    unlockAt: 1, built: true,
    body: 0xf3e2ca, roof: 0xc08b4f, trim: 0xd7a76b, shape: "shed",
  },
  {
    id: "storehouse", name: "Storehouse", short: "Storage",
    x: 1500, y: 570, w: 106, h: 100, scale: 0.98, ring: 1,
    unlockAt: 2,
    body: 0xcbe4f7, roof: 0x5b9bd1, trim: 0x8cc2e8, shape: "barn",
  },
  {
    id: "quarry", name: "Stone Quarry", short: "Pebbles",
    x: 1148, y: 711, w: 116, h: 88, scale: 1.06, ring: 1,
    unlockAt: 2,
    body: 0xdde3ee, roof: 0x8a97ad, trim: 0xa9b4c7, shape: "pit",
  },
  {
    id: "treats", name: "Treat Factory", short: "Treats",
    x: 1852, y: 1089, w: 142, h: 100, scale: 1.1, ring: 1,
    unlockAt: 3,
    body: 0xffdcc2, roof: 0xf08a54, trim: 0xffb387, shape: "factory",
  },
  {
    id: "garden", name: "Catnip Garden", short: "Catnip",
    x: 1148, y: 1089, w: 126, h: 78, scale: 1.06, ring: 1,
    unlockAt: 4,
    body: 0xd6f2b8, roof: 0x78be4f, trim: 0x9ad46f, shape: "garden",
  },

  // ---- ring 2 · civic ------------------------------------------------------
  {
    id: "adoption", name: "Adoption Center", short: "New cats",
    x: 1774, y: 1314, w: 134, h: 106, scale: 1.18, ring: 2,
    unlockAt: 1, built: true,
    body: 0xfff2cc, roof: 0xf2b33d, trim: 0xffd977, shape: "gift",
  },
  {
    id: "clinic", name: "Cat Clinic", short: "Healing",
    x: 2252, y: 1057, w: 122, h: 94, scale: 1.0, ring: 2,
    unlockAt: 5,
    body: 0xf2fbf7, roof: 0x5ec9b0, trim: 0xa8e6d8, shape: "house",
  },
  {
    id: "watchtower", name: "Watchtower", short: "Events",
    x: 2252, y: 763, w: 88, h: 124, scale: 0.9, ring: 2,
    unlockAt: 6,
    body: 0xe6d4f5, roof: 0x9a6bc4, trim: 0xb98fe0, shape: "tower",
  },
  {
    id: "study", name: "The Study", short: "Research",
    x: 748, y: 1057, w: 98, h: 126, scale: 0.96, ring: 2,
    unlockAt: 7,
    body: 0xcfe9e8, roof: 0x8a5a3c, trim: 0xa8cfd0, shape: "tower",
  },
  {
    id: "gatehouse", name: "Gatehouse", short: "Defence",
    x: 748, y: 763, w: 118, h: 106, scale: 0.98, ring: 2,
    unlockAt: 9,
    body: 0xe9ded1, roof: 0xc25a4f, trim: 0xf3ebe0, shape: "tower",
  },

  // ---- ring 4 · the military quarter ---------------------------------------
  // Kingshot's Barracks / Range / Stable / Command Center / Embassy / Truegold
  // Crucible, along the back of the town where a real settlement would put the
  // noisy things. All six unlock late and none of them has its system built
  // yet — but they are ON THE MAP as locked ghosts on purpose: a player who can
  // see the whole town they are working towards has a reason to keep raising
  // the Cat Hall. See docs/kingshot-teardown.md §2.
  {
    id: "guildhall", name: "Guild Hall", short: "Alliance",
    x: 1853, y: 411, w: 140, h: 96, scale: 1.02, ring: 4,
    unlockAt: 8,
    body: 0xf7e4c3, roof: 0x7f95ad, trim: 0xffe9c9, shape: "barn",
  },
  {
    id: "training", name: "Training Yard", short: "Guards",
    x: 340, y: 702, w: 128, h: 86, scale: 1.0, ring: 4,
    unlockAt: 11,
    body: 0xe8dcc0, roof: 0x8a9a55, trim: 0xf2e9d2, shape: "shed",
  },
  {
    id: "range", name: "Slingshot Range", short: "Slingers",
    x: 712, y: 504, w: 132, h: 82, scale: 1.0, ring: 4,
    unlockAt: 13,
    body: 0xfaeec4, roof: 0xd8b552, trim: 0xfff6d9, shape: "shed",
  },
  {
    id: "stable", name: "Runner's Stable", short: "Runners",
    x: 2373, y: 535, w: 134, h: 90, scale: 1.0, ring: 4,
    unlockAt: 15,
    body: 0xe6d2b6, roof: 0x4f7a4a, trim: 0xf3e6d2, shape: "barn",
  },
  {
    id: "warroom", name: "War Room", short: "Command",
    x: 1256, y: 400, w: 112, h: 104, scale: 0.98, ring: 4,
    unlockAt: 17,
    body: 0xcdd9e8, roof: 0x3f5878, trim: 0xe3ecf7, shape: "tower",
  },
  {
    id: "forge", name: "Golden Forge", short: "Endgame",
    x: 2703, y: 745, w: 118, h: 98, scale: 0.98, ring: 4,
    unlockAt: 20,
    body: 0xe9dccb, roof: 0x8a6a3a, trim: 0xffd75e, shape: "factory",
  },

  // ---- ring 3 · the residential belt ---------------------------------------
  // Eight cottages, unlocking every couple of Cat Hall levels. Each one is a
  // small, cheap, obviously-good thing to build — which is exactly what a
  // player needs between the big upgrades.
  // Ordered INWARD-OUT on purpose. The two the town starts with sit closest to
  // the Cat Hall, inside the opening shot, and each new one lands a little
  // further out — so the town visibly spreads instead of appearing at the edge
  // of a map the player has not scrolled to yet.
  ...[
    { x: 1226, y: 1314, at: 1, built: true },
    { x: 1580, y: 1539, at: 1, built: true },
    { x: 2058, y: 1470, at: 2 },
    { x: 687, y: 1376, at: 3 },
    { x: 2430, y: 1309, at: 5 },
    { x: 419, y: 1172, at: 7 },
    { x: 2629, y: 1087, at: 9 },
    { x: 354, y: 931, at: 11 },
  ].map((p, i) => ({
    id: `cottage${i + 1}`,
    name: `Cat Cottage ${i + 1}`,
    short: "Homes",
    x: p.x, y: p.y, w: 112, h: 90, scale: 0.96, ring: i === 0 ? 2 : 3,
    unlockAt: p.at, built: !!p.built, cottage: true,
    // Every cottage shares one art file — they are the same building eight
    // times over, and eight identical PNGs would be eight things to keep in
    // sync. `art` overrides the id when the scene looks for a sprite.
    art: "cottage",
    body: 0xffe6d5, roof: 0xf07a6a, trim: 0xffb8a6, shape: "house",
  })),
];

/** The ring roads the scene draws, outermost last. Kept here beside the
 *  positions they follow — a road tuned in the renderer drifts away from the
 *  layout the moment a building moves. */
export const RING_ROADS = [
  { rx: 800, ry: 430, dy: 10, w: 44 },
  { rx: 1150, ry: 560, dy: 80, w: 38 },
  { rx: 1280, ry: 540, dy: 30, w: 32 },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

/** Which buildings a given Cat Hall level has just made available. Drives the
 *  "next unlock" line, which is the single most effective retention text in
 *  the genre — the player always knows what the next level buys them. */
export function unlockedAt(hallLevel) {
  return BUILDINGS.filter((b) => b.unlockAt === hallLevel && !b.built);
}

/** The very next thing the Cat Hall will open, and at what level. */
export function nextUnlock(hallLevel) {
  const ahead = BUILDINGS.filter((b) => !b.built && b.unlockAt > hallLevel).sort(
    (a, b) => a.unlockAt - b.unlockAt
  );
  return ahead[0] || null;
}

// ---------------------------------------------------------------------------
//  What each building DOES — the data the tap-panel reads.
//  Buildings are static sprites, exactly as in Clash of Clans / Hay Day / Cats
//  and Soup. Interactivity is not 3D; it is: a hit area, state overlays drawn
//  on top, and a panel that opens on tap. See docs/game-design.md §11.
// ---------------------------------------------------------------------------

/** Per-building behaviour. `produces` is the resource id, null for buildings
 *  that gate, store, house or defend. */
export const BUILDING_INFO = {
  hall: {
    produces: null,
    desc: "The town centre. Its level caps how far every other building can be raised, and every new building in town unlocks at one of its levels.",
    unlocksAt: (lvl) => {
      const next = nextUnlock(lvl);
      return next ? `Next: ${next.name} at level ${next.unlockAt}` : "Everything unlocked";
    },
  },
  adoption: { produces: null, desc: "Where new cats come from. Pulls happen here, at the published odds." },
  kitchen: { produces: "fish", desc: "Cooks Fish. Every cat on shift eats Fish every hour — run out and the whole town drops to a quarter speed." },
  treats: { produces: "treats", desc: "Refines Fish and Catnip into Treats — the currency the Adoption Center runs on. No ingredients, no Treats." },
  lumber: { produces: "wood", desc: "Shreds scratching posts into Wood. Every construction in town wants it." },
  quarry: { produces: "stone", desc: "Cuts Stone. Scarce by design, and every upgrade past level 2 asks for it." },
  garden: { produces: "catnip", desc: "Grows Catnip — the rarest thing in town. The Treat Factory eats it, and so do upgrades past level 4." },
  storehouse: { produces: null, desc: "Raises the cap on every resource you can hold. Hit the cap and production is wasted.", unlocksAt: (lvl) => `Cap ${(2 + lvl) * 2500}` },
  watchtower: { produces: null, desc: "Watches the road. Spots Palis coming, and welcomes Icy." },
  clinic: { produces: null, desc: "Patches cats up after Palis comes calling. A hurt cat works at half speed until it has been seen here." },
  study: { produces: null, desc: "Where cats read. Research here raises production, build speed and defence permanently — the deepest sink in the town." },
  gatehouse: { produces: null, desc: "The town's wall and gate. Its level is how much damage a raid has to chew through before it reaches your stores." },
  guildhall: { produces: null, desc: "Where allied towns meet. Alliance help on your build timers comes from here — and so do reinforcements when Palis brings friends." },
  training: { produces: null, desc: "Where guard cats are drilled. Sturdy, slow, and the first line against a raid." },
  range: { produces: null, desc: "Slinger cats train here. They hit hard from the back and fold if anything reaches them." },
  stable: { produces: null, desc: "Runner cats. Fast enough to catch what the guards let through." },
  warroom: { produces: null, desc: "The map table. Decides how many cats you may send at Palis at once, and how many an ally may add." },
  forge: { produces: null, desc: "Melts Gold into something better. The last building in the town, and the one you will still be raising in a year." },
};

/** Every Cat Cottage shares one description — they are the same building eight
 *  times, and that is the point: a small, always-affordable next step. */
for (const id of COTTAGE_IDS) {
  BUILDING_INFO[id] = {
    produces: null,
    cottage: true,
    desc: "Homes for cat villagers. Every cottage level is another cat living in town — and villagers are who you put inside the working buildings. Cats sleep here between shifts.",
    // The cottage shell houses one; every bed inside it houses another. The
    // real number lives in villagerCap, which reads the furniture — this line
    // only describes the shell, so it stays honest about where the rest is.
    unlocksAt: () => "1 villager, plus one per bed fitted",
  };
}

/** Upgrade cost in Treats. Exponential on purpose — the wall has to arrive
 *  somewhere, just not during the grace period (docs/game-design.md §11b). */
export const upgradeCost = (level) => Math.round(150 * Math.pow(level, 1.85));

/** Build time in seconds. SHORT here so the loop can be play-tested; real
 *  values are hours, and the server owns the clock (docs/security.md §4b). */
export const buildSeconds = (level) => Math.round(20 * Math.pow(level, 1.6));

export const MAX_LEVEL = 30;

/** Where a cat stands while working.
 *
 *  The name plate sits directly under the building, centred, so the first two
 *  cats stand to either SIDE of it and the third stands below it. Standing them
 *  in a row under the building put them straight on top of the label. */
const SEATS = [
  { dx: -96, dy: 14 },
  { dx: 96, dy: 14 },
  { dx: 0, dy: 86 },
];

export function workSpot(b, slot = 0) {
  const seat = SEATS[slot % SEATS.length];
  return { x: b.x + seat.dx, y: b.y + seat.dy };
}
