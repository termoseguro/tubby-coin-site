// ============================================================================
//  TUBBY TOWN — WHAT IS INSIDE A BUILDING
//
//  This is the mechanic the town was missing, and it is the one Kingshot runs
//  its whole mid game on. A building is not a single number that goes up. Open
//  a Kingshot Kitchen and you find Stove A, Stove B, Stove C, a Sideboard, two
//  Dining Tables, a Larder, a Heater, a Bin, a Water Bucket, a Washbasin and a
//  Cask — eleven things, each unlocking at its own building level, each upgraded
//  separately, each paying its own small bonus.
//
//  Three consequences, and all three are why it works:
//
//   1. THE BUILDING LEVEL IS A KEY, NOT A REWARD. Level 4 does not give you
//      much on its own; it unlocks the Heater and the second Dining Table, and
//      THOSE give you something. So every level has a named payoff you can
//      point at before you pay for it.
//
//   2. FURNITURE GATES THE BUILDING. Kingshot will not let you raise a building
//      until certain items inside it are maxed. That converts one big wait into
//      a dozen small decisions, which is the actual difference between a game
//      and a progress bar.
//
//   3. IT IS WHERE GOLD GOES. Gold is not a speed-up currency there — it comes
//      from Houses and from Rebel Invasion, and it is spent on furniture and on
//      research. That is a soft currency with a real economy behind it, and it
//      is completely separate from the premium one.
//
//  Ours is the same shape, in cat: beds and bowls and scratching posts.
//
//  Sources: https://www.kingshotguide.org/buildings/kitchen (the item list and
//  its unlock levels) and https://kingshotwiki.com/items/gold/ (gold's sources
//  and sinks). See docs/kingshot-teardown.md.
//
//  ⚠ Client-side, therefore advisory. The server owns these numbers before
//  anything of value is attached — docs/security.md §1.
// ============================================================================

import { BUILDING_BY_ID } from "./townConfig";

/** What an item can do. One item does exactly one of these, so the player can
 *  read a building's contents and know what upgrading each thing buys them.
 *
 *   produce  +% to this building's output, per item level
 *   seat     a villager place AT THIS BUILDING (see the note below)
 *   beds     a villager housed, for cottages
 *   coin     Gold per hour, for cottages
 *   comfort  +% to every cottage's Gold, town-wide
 *   speed    -% build time on this building's own upgrades
 *   store    +% to this building's hold before it stops
 */
export const EFFECTS = {
  produce: { label: "output", unit: "%", per: 4 },
  seat: { label: "villager place", unit: "", per: 1 },
  beds: { label: "villager housed", unit: "", per: 1 },
  coin: { label: "Gold/h", unit: "", per: 6 },
  comfort: { label: "town Gold", unit: "%", per: 2 },
  speed: { label: "build speed", unit: "%", per: 3 },
  store: { label: "hold", unit: "%", per: 5 },
};

/** Villager places come from the BUILDING, at levels 1 / 4 / 7 — Kingshot's
 *  Kitchen reads "+1 Working Survivor" at exactly those three levels and tops
 *  out at three. Places used to be a thing you bought here, which was the wrong
 *  shape: in Kingshot you EARN the place by levelling and PAY only to have it
 *  sooner. The paid door still exists (buildingSlotPriceUsd) — it just unlocks
 *  the next place early instead of being the only way to get one. */
export const SEAT_LEVELS = [1, 4, 7];

export const seatsFromLevel = (level) => SEAT_LEVELS.filter((l) => level >= l).length;

/** One item: `at` is the building level that unlocks it, `max` its own ceiling,
 *  `gate` marks the ones that must be maxed before the building may be raised. */
const item = (id, name, at, effect, amount, opts = {}) => ({
  id,
  name,
  at,
  max: opts.max ?? 10,
  gate: !!opts.gate,
  effect,
  amount,
  mat: opts.mat || "wood",
});

/** Every producer gets the same interior shape: the tool that does the work
 *  (three of them, unlocking at 1 / 4 / 7 like Kingshot's stoves), a place to
 *  put the output, and the comfort items that arrive later. Only the names
 *  change per building, because a Lumber Yard with a stove in it is nonsense. */
function producerKit(names) {
  return [
    item("toolA", names[0], 1, "produce", 4, { gate: true }),
    item("bench", names[1], 1, "seat", 1),
    item("toolB", names[2], 4, "produce", 4, { gate: true, mat: "stone" }),
    item("rack", names[3], 5, "store", 5, { mat: "stone" }),
    item("toolC", names[4], 7, "produce", 5, { gate: true, mat: "stone" }),
    item("lamp", names[5], 8, "speed", 3, { mat: "catnip" }),
  ];
}

export const FURNITURE = {
  // ---- the homes: this is where Gold comes from ----------------------------
  // Kingshot's Houses are the second-biggest source of idle Gold in the game
  // and the only building whose furniture raises the population, so ours does
  // both too.
  cottage: [
    item("bed", "Cat Bed", 1, "beds", 1, { gate: true, max: 4 }),
    item("bowl", "Food Bowl", 1, "coin", 6, { gate: true }),
    item("post", "Scratching Post", 2, "comfort", 2, { mat: "stone" }),
    item("window", "Sunny Window", 4, "coin", 6, { gate: true, mat: "stone" }),
    item("basket", "Wicker Basket", 5, "beds", 1, { max: 4, mat: "stone" }),
    item("blanket", "Knitted Blanket", 6, "comfort", 2, { mat: "catnip" }),
    item("shelf", "Climbing Shelf", 7, "beds", 1, { max: 4, mat: "stone" }),
    item("fire", "Little Fireplace", 9, "coin", 8, { mat: "catnip" }),
  ],

  kitchen: producerKit([
    "Stove", "Feeding Table", "Second Stove", "Larder", "Big Stove", "Warm Lamp",
  ]),
  lumber: producerKit([
    "Saw Bench", "Work Stool", "Second Saw", "Log Rack", "Big Saw", "Work Lamp",
  ]),
  quarry: producerKit([
    "Chisel Set", "Sitting Rock", "Stone Cutter", "Pebble Bins", "Big Cutter", "Pit Lantern",
  ]),
  garden: producerKit([
    "Seed Trays", "Garden Stool", "Watering System", "Drying Racks", "Glasshouse", "Grow Lamp",
  ]),
  treats: producerKit([
    "Mixing Bowl", "Baker's Stool", "Second Oven", "Cooling Racks", "Big Oven", "Kitchen Lamp",
  ]),

  // ---- the buildings that hold or gate rather than produce ------------------
  storehouse: [
    item("shelves", "Tall Shelves", 1, "store", 6, { gate: true }),
    item("crates", "Stacking Crates", 3, "store", 6, { gate: true, mat: "stone" }),
    item("ledger", "Store Ledger", 5, "comfort", 2, { mat: "stone" }),
    item("cellar", "Cool Cellar", 7, "store", 8, { gate: true, mat: "stone" }),
  ],
  hall: [
    item("desk", "Mayor's Desk", 1, "speed", 3, { gate: true }),
    item("board", "Notice Board", 2, "comfort", 2),
    item("banner", "Town Banner", 4, "comfort", 3, { mat: "stone" }),
    item("bell", "Great Bell", 6, "speed", 4, { gate: true, mat: "stone" }),
    item("archive", "Town Archive", 8, "speed", 4, { mat: "catnip" }),
  ],
  adoption: [
    item("counter", "Welcome Counter", 1, "comfort", 2, { gate: true }),
    item("cushions", "Soft Cushions", 3, "comfort", 3, { mat: "stone" }),
    item("toys", "Toy Chest", 5, "comfort", 3, { mat: "stone" }),
  ],
  clinic: [
    item("cot", "Examination Cot", 1, "comfort", 2, { gate: true }),
    item("cabinet", "Medicine Cabinet", 3, "comfort", 3, { mat: "stone" }),
    item("bath", "Warm Bath", 6, "comfort", 4, { mat: "catnip" }),
  ],
  study: [
    item("deskS", "Reading Desk", 1, "speed", 3, { gate: true }),
    item("shelvesS", "Book Shelves", 3, "speed", 4, { mat: "stone" }),
    item("scope", "Star Scope", 6, "comfort", 4, { mat: "catnip" }),
  ],
  gatehouse: [
    item("gate", "Iron Gate", 1, "comfort", 2, { gate: true }),
    item("brazier", "Watch Brazier", 3, "comfort", 3, { mat: "stone" }),
    item("armoury", "Little Armoury", 6, "comfort", 4, { mat: "stone" }),
  ],
  watchtower: [
    item("glass", "Spy Glass", 1, "comfort", 2, { gate: true }),
    item("lantern", "Signal Lantern", 3, "comfort", 3, { mat: "stone" }),
  ],

  // The military quarter. Their own systems do not exist yet, so for now their
  // furniture pays comfort and speed like any other building — nothing here is
  // a placeholder the player can see, and when troops arrive these lists grow
  // rather than change.
  guildhall: [
    item("table", "Long Table", 1, "speed", 4, { gate: true }),
    item("boardG", "Alliance Board", 3, "comfort", 3, { mat: "stone" }),
    item("hearth", "Great Hearth", 6, "speed", 5, { mat: "catnip" }),
  ],
  training: [
    item("dummy", "Straw Dummy", 1, "comfort", 2, { gate: true }),
    item("ropes", "Climbing Ropes", 3, "comfort", 3, { mat: "stone" }),
    item("ring", "Sparring Ring", 6, "comfort", 4, { mat: "stone" }),
  ],
  range: [
    item("targets", "Round Targets", 1, "comfort", 2, { gate: true }),
    item("barrel", "Yarn Barrel", 3, "comfort", 3, { mat: "stone" }),
  ],
  stable: [
    item("trough", "Water Trough", 1, "comfort", 2, { gate: true }),
    item("hay", "Hay Bales", 3, "comfort", 3, { mat: "stone" }),
  ],
  warroom: [
    item("mapT", "Map Table", 1, "comfort", 3, { gate: true }),
    item("scopeW", "Brass Spyglass", 4, "comfort", 4, { mat: "stone" }),
  ],
  forge: [
    item("anvil", "Golden Anvil", 1, "comfort", 4, { gate: true, mat: "stone" }),
    item("bellows", "Great Bellows", 4, "speed", 5, { mat: "stone" }),
    item("crucible", "Crucible", 7, "comfort", 6, { mat: "catnip" }),
  ],
};

/** The items a building has, cottages sharing one list because they are one
 *  building eight times over. */
export function itemsFor(buildingId) {
  if (BUILDING_BY_ID[buildingId]?.cottage) return FURNITURE.cottage;
  return FURNITURE[buildingId] || [];
}

/** The items that are actually visible at this building level. An item the
 *  player cannot see yet is not a locked row to scroll past — it is the reason
 *  the next building level is worth paying for, so it IS shown, greyed. */
export function unlockedItems(buildingId, buildingLevel) {
  return itemsFor(buildingId).filter((it) => buildingLevel >= it.at);
}

/** An item's own level, 0 until it is first bought. */
export const itemLevel = (save, buildingId, itemId) =>
  save?.furniture?.[buildingId]?.[itemId] || 0;

/** What one item costs to take from `level` to `level + 1`.
 *
 *  Gold is the constant, and that is the point: Gold's only real sinks in
 *  Kingshot are furniture and research, so furniture has to be big enough to
 *  absorb everything Houses and raids pay out. The material alongside it is
 *  what ties furniture back to the production economy. */
export function itemCost(it, level) {
  const L = Math.max(1, level + 1);
  return {
    coin: Math.round(45 * Math.pow(L, 1.7)),
    [it.mat]: Math.round((it.mat === "catnip" ? 12 : 90) * Math.pow(L, 1.55)),
  };
}

/** Seconds to fit an item. Short, because furniture is the SMALL decision that
 *  fills the gaps between the big building timers — a furniture upgrade that
 *  takes hours defeats the purpose of having furniture. */
export function itemSeconds(it, level) {
  return Math.round(8 * Math.pow(Math.max(1, level + 1), 1.35));
}

/** An item's own ceiling: its `max`, and never above the building's level.
 *  A level 3 building cannot hold a level 9 stove — that ceiling is what makes
 *  the building level worth buying. */
export function itemCap(it, buildingLevel) {
  return Math.min(it.max, Math.max(1, buildingLevel));
}

// ---------------------------------------------------------------------------
//  THE GATE
//
//  Kingshot: "you will need to max out the upgrades of certain furniture inside
//  the building before being able to upgrade the building to the next level."
//
//  Ours: every item marked `gate` must be at the building's current level (or
//  its own max, whichever comes first) before the building may be raised. So
//  the loop is always: raise the building → new items appear → fill them → the
//  building unlocks again. Never one long wait.
// ---------------------------------------------------------------------------

/** Which gating items are still short, and by how much. Empty means the
 *  building is free to be raised. */
export function furnitureGate(save, buildingId, buildingLevel) {
  if (buildingLevel < 1) return []; // an empty plot has no interior yet
  return unlockedItems(buildingId, buildingLevel)
    .filter((it) => it.gate)
    .map((it) => ({ it, at: itemLevel(save, buildingId, it.id), need: itemCap(it, buildingLevel) }))
    .filter((r) => r.at < r.need);
}

// ---------------------------------------------------------------------------
//  WHAT THE FURNITURE ADDS UP TO
// ---------------------------------------------------------------------------

/** Every effect a building's own furniture is currently paying, summed. */
export function bonusesAt(save, buildingId, buildingLevel) {
  const out = { produce: 0, seat: 0, beds: 0, coin: 0, comfort: 0, speed: 0, store: 0 };
  for (const it of unlockedItems(buildingId, buildingLevel)) {
    const lvl = Math.min(itemLevel(save, buildingId, it.id), itemCap(it, buildingLevel));
    if (lvl > 0) out[it.effect] += it.amount * lvl;
  }
  return out;
}

/** Comfort is town-wide: every building's comfort items raise the Gold that
 *  every cottage pays. That is what stops the non-producing buildings from
 *  being dead weight — a Clinic with nice furniture makes the whole town richer. */
export function townComfort(save, levels = {}) {
  let total = 0;
  for (const id of Object.keys(FURNITURE)) {
    if (id === "cottage") continue;
    total += bonusesAt(save, id, levels[id] || 0).comfort;
  }
  for (const id of Object.keys(levels)) {
    if (BUILDING_BY_ID[id]?.cottage) total += bonusesAt(save, id, levels[id] || 0).comfort;
  }
  return total;
}
