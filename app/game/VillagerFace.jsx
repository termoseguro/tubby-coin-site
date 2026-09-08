// A villager's face: the collection artwork in a round rarity ring.
//
// THIS WAS BRIEFLY A DRAWING. To stop villagers and heroes looking identical I
// generated little vector cats from the villager's id — and they were ugly and,
// worse, they had nothing to do with Tubby Cats. A game about a CC0 cat
// collection whose townsfolk are generic clip-art cats has thrown away the only
// art it has.
//
// So the artwork is back, and the villager/hero line is drawn where it actually
// belongs — in the SHAPE of the thing:
//
//   A VILLAGER is a round photo with a rarity ring and a job. It is one of
//     twenty thousand, it has a homely name, and it stands in a building.
//   A HERO is a portrait CARD with stars, a class and skills. There are 34,
//     they are named characters, and they never work a shift.
//
// Same collection, two silhouettes. A round chip is never mistaken for a hero
// card, which is the confusion that actually mattered.

import { villagerArt } from "../../lib/villagers.js";

export default function VillagerFace({
  id,
  rarity = "common",
  size = 56,
  name,
  className = "",
}) {
  return (
    <span
      className={"tt-vface r-" + rarity + " " + className}
      style={{ width: size, height: size }}
      title={name || undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={villagerArt(id)} alt={name ? `${name}` : ""} loading="lazy" draggable="false" />
    </span>
  );
}
