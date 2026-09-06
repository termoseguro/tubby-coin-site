# Tubby Town — art brief

What the town needs, and the exact prompts to produce it. Drop the finished
files into `public/town/` with the filenames below and the game picks them up
automatically — no code change needed.

---

## Why this file exists

Buildings drawn in code (rectangles, triangles, circles) look like programmer
art and always will. A cozy city builder lives or dies on illustrated sprites.
This brief exists so the art can be produced by anyone — an image generator,
an illustrator, or Palis — and dropped straight in.

---

## The spec

| | |
|---|---|
| **Format** | PNG with **transparent background** |
| **Size** | 1024×1024 (the game scales down; bigger is fine, smaller is not) |
| **Framing** | The whole building centred, with margin. Nothing cropped |
| **View** | Front-facing, very slight three-quarter. **Every building must use the same angle** or the town falls apart |
| **Contents** | The building only — no ground, no shadow, no characters, no text |
| **Where** | `public/town/<id>.png` |

If the generator cannot produce transparency, generate on a **flat pure white**
background and remove it afterwards — most background removers handle a clean
white cutout perfectly.

---

## The style line

Paste this at the end of **every** prompt, unchanged. Consistency across the
ten buildings matters far more than any single one being pretty:

> cute kawaii mobile game building asset, chunky rounded shapes, soft pastel
> palette, clean vector illustration with thick smooth outlines and soft cel
> shading, in the art style of the mobile games Cats and Soup and Hay Day,
> front-facing with a very slight three-quarter angle, centred with margin,
> whole building visible, isolated on a transparent background, no ground, no
> shadow, no characters, no text, no logo

---

## The ten buildings

### `hall.png` — Cat Hall
> A cheerful pink town hall for a village of cats. Two storeys, a wide arched
> wooden double door, two round windows, a small bell tower on the roof with a
> golden bell, a little flag on top. Bubblegum pink walls, deep magenta roof.

### `adoption.png` — Adoption Center
> A cosy shop shaped like a giant wrapped gift box with a big soft ribbon and
> bow on the roof, a round window shaped like a cat's head, warm inviting door.
> Cream and butter-yellow walls, golden-orange ribbon.

### `nap.png` — Nap House
> A small round cottage for sleeping cats. Soft domed roof, one big circular
> window with curtains, a tiny arched door, a crescent moon ornament above the
> door. Lavender walls, deep purple roof.

### `kitchen.png` — Kitchen
> A cosy village kitchen cottage with a stone chimney, a warm open serving
> window with a wooden counter, a striped awning, a big soup pot sign hanging
> outside. Mint-green walls, teal roof.

### `treats.png` — Treat Factory
> A small candy-coloured factory that makes cat treats. One tall rounded
> chimney puffing, a wide window showing shelves, a hanging sign shaped like a
> fish biscuit. Peach walls, warm orange roof.

### `lumber.png` — Lumber Yard
> An open wooden workshop shed with a slanted roof, stacks of round logs and
> tall carpet-wrapped scratching posts leaning against the side, a sawhorse.
> Warm tan wood, brown roof.

### `quarry.png` — Stone Quarry
> A small stone-cutting yard: a low rocky mound with smooth rounded grey
> boulders and neat stacks of cut pebbles, a wooden cart with a pickaxe leaning
> on it. Cool grey-blue stone, slate roof on a small shelter.

### `garden.png` — Catnip Garden
> A tidy raised garden plot with wooden edging, rows of leafy catnip plants
> with small purple flowers, a tiny wooden fence and a watering can. Fresh
> green leaves, warm wood edging.

### `storehouse.png` — Storehouse
> A round-roofed barn for storing supplies. Big double barn doors, a hay-loft
> window at the top, wooden crates and sacks stacked beside it. Sky-blue walls,
> deeper blue roof.

### `watchtower.png` — Watchtower
> A tall slender lookout tower with a pointed conical roof, a small balcony
> near the top with a railing, a lantern hanging from it, narrow windows.
> Pale lilac stone, deep purple roof.

---

## Also useful, lower priority

| File | What |
|---|---|
| `bg-sky.png` | A soft pastel sky, 2048×600, gentle blue-to-pink gradient with a few fluffy clouds |
| `bg-ground.png` | A seamless grassy ground strip, 2048×400, soft green with tiny flowers |
| `path.png` | A seamless dirt path tile, warm sand colour |

Without these the game draws its own sky and ground, which is fine — flat
gradients read acceptably. It is the **buildings** that need real art.

---

## How the game uses them

`app/game/town/scene.js` tries `/town/<id>.png` for every building first, and
only falls back to the drawn placeholder if the file is missing. So the town
upgrades one building at a time as files land — there is no all-or-nothing
moment, and a half-finished set still shows progress.
