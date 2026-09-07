// ============================================================================
//  TUBBY TOWN — the town layout
//  Where each building sits, what it looks like, when it unlocks.
//
//  THREE CONCENTRIC RINGS around the Cat Hall, which is the exact shape every
//  city builder in this lineage uses. It is not decoration: the ring is what
//  makes the town centre read as a centre, and it puts the buildings you tap
//  most often closest to the thing you look at first.
//
//      ring 1  (rx 430, ry 320)   the five producers + the Storehouse
//      ring 2  (rx 760, ry 400)   civic: adoption, beds, clinic, study, walls
//      ring 3  (rx 1080, ry 520)  the Cat Cottages — the residential belt
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
//  Two slots on ring 2 are deliberately EMPTY (1040,434) and (1560,434) —
//  that is where the Guild Hall and the Training Yard go (docs/kingshot-teardown.md).
//
//  Names must state the function — see docs/game-design.md §3.
// ============================================================================

export const WORLD = { w: 2600, h: 1560 };

/** Ground starts here; everything above is sky. */
export const HORIZON = 110;

/** The heart of the town. Every road runs out of here, and cats crossing the
 *  map pass through it — which is what makes it read as a centre rather than
 *  as the middle item in a row. */
export const PLAZA = { x: 1300, y: 800 };

/** What the camera frames when the town OPENS.
 *
 *  Not the whole world. The world is now large enough to hold every building
 *  the game will ever have, and fitting all of it on screen makes the town the
 *  player actually owns look like a postage stamp — the exact complaint that
 *  started this layout. So the opening shot is the two inner rings, which is
 *  everything that exists early, and the residential belt is something you
 *  find by dragging outward. */
export const FOCUS = { x: 1300, y: 850, w: 1900, h: 1180 };

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
    x: 1300, y: 800, w: 168, h: 132, scale: 1.2, row: "ring",
    unlockAt: 1, built: true,
    body: 0xffc2e2, roof: 0xe8619f, trim: 0xff9ecb, shape: "hall",
  },
  {
    id: "kitchen", name: "Kitchen", short: "Kibble",
    x: 1300, y: 1120, w: 132, h: 96, scale: 1.12, row: "ring",
    unlockAt: 1, built: true,
    body: 0xcdf2de, roof: 0x57c89a, trim: 0x8fe0bd, shape: "house",
  },
  {
    id: "lumber", name: "Lumber Yard", short: "Planks",
    x: 1652, y: 616, w: 122, h: 92, scale: 0.98, row: "ring",
    unlockAt: 1, built: true,
    body: 0xf3e2ca, roof: 0xc08b4f, trim: 0xd7a76b, shape: "shed",
  },
  {
    id: "storehouse", name: "Storehouse", short: "Storage",
    x: 1300, y: 480, w: 106, h: 100, scale: 0.98, row: "ring",
    unlockAt: 2,
    body: 0xcbe4f7, roof: 0x5b9bd1, trim: 0x8cc2e8, shape: "barn",
  },
  {
    id: "quarry", name: "Stone Quarry", short: "Pebbles",
    x: 948, y: 616, w: 116, h: 88, scale: 1.06, row: "ring",
    unlockAt: 2,
    body: 0xdde3ee, roof: 0x8a97ad, trim: 0xa9b4c7, shape: "pit",
  },
  {
    id: "treats", name: "Treat Factory", short: "Treats",
    x: 1652, y: 984, w: 142, h: 100, scale: 1.1, row: "ring",
    unlockAt: 3,
    body: 0xffdcc2, roof: 0xf08a54, trim: 0xffb387, shape: "factory",
  },
  {
    id: "garden", name: "Catnip Garden", short: "Catnip",
    x: 948, y: 984, w: 126, h: 78, scale: 1.06, row: "ring",
    unlockAt: 4,
    body: 0xd6f2b8, roof: 0x78be4f, trim: 0x9ad46f, shape: "garden",
  },

  // ---- ring 2 · civic ------------------------------------------------------
  {
    id: "adoption", name: "Adoption Center", short: "New cats",
    x: 1560, y: 1186, w: 134, h: 106, scale: 1.18, row: "ring",
    unlockAt: 1, built: true,
    body: 0xfff2cc, roof: 0xf2b33d, trim: 0xffd977, shape: "gift",
  },
  {
    id: "clinic", name: "Cat Clinic", short: "Healing",
    x: 2014, y: 947, w: 122, h: 94, scale: 1.0, row: "ring",
    unlockAt: 5,
    body: 0xf2fbf7, roof: 0x5ec9b0, trim: 0xa8e6d8, shape: "house",
  },
  {
    id: "watchtower", name: "Watchtower", short: "Events",
    x: 2014, y: 673, w: 88, h: 124, scale: 0.9, row: "ring",
    unlockAt: 6,
    body: 0xe6d4f5, roof: 0x9a6bc4, trim: 0xb98fe0, shape: "tower",
  },
  {
    id: "study", name: "The Study", short: "Research",
    x: 586, y: 947, w: 98, h: 126, scale: 0.96, row: "ring",
    unlockAt: 7,
    body: 0xcfe9e8, roof: 0x8a5a3c, trim: 0xa8cfd0, shape: "tower",
  },
  {
    id: "gatehouse", name: "Gatehouse", short: "Defence",
    x: 586, y: 673, w: 118, h: 106, scale: 0.98, row: "ring",
    unlockAt: 9,
    body: 0xe9ded1, roof: 0xc25a4f, trim: 0xf3ebe0, shape: "tower",
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
    { x: 1040, y: 1186, at: 1, built: true },
    { x: 1816, y: 1327, at: 1, built: true },
    { x: 1300, y: 1390, at: 2 },
    { x: 783, y: 1327, at: 3 },
    { x: 2207, y: 1152, at: 5 },
    { x: 393, y: 1152, at: 7 },
    { x: 2377, y: 909, at: 9 },
    { x: 223, y: 909, at: 11 },
  ].map((p, i) => ({
    id: `cottage${i + 1}`,
    name: `Cat Cottage ${i + 1}`,
    short: "Homes",
    x: p.x, y: p.y, w: 112, h: 90, scale: 0.96, row: "ring",
    unlockAt: p.at, built: !!p.built, cottage: true,
    // Every cottage shares one art file — they are the same building eight
    // times over, and eight identical PNGs would be eight things to keep in
    // sync. `art` overrides the id when the scene looks for a sprite.
    art: "cottage",
    body: 0xffe6d5, roof: 0xf07a6a, trim: 0xffb8a6, shape: "house",
  })),
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
};

/** Every Cat Cottage shares one description — they are the same building eight
 *  times, and that is the point: a small, always-affordable next step. */
for (const id of COTTAGE_IDS) {
  BUILDING_INFO[id] = {
    produces: null,
    cottage: true,
    desc: "Homes for cat villagers. Every cottage level is another cat living in town — and villagers are who you put inside the working buildings. Cats sleep here between shifts.",
    unlocksAt: (lvl) => `${Math.min(4, lvl)} villager${Math.min(4, lvl) === 1 ? "" : "s"} housed`,
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
