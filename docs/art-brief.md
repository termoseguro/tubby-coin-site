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

---

# ROUND 2 — the new buildings

Same spec, same style line, same conversation in ChatGPT so the style carries.
Save each as the filename shown, into Downloads, then `npm run art:import`.

Priorities come from `kingshot-teardown.md`: P1 is needed for the next build,
P2 once raids and alliances exist.

### `cottage.png` — Cat Cottage · **P1**
> A small cosy cat cottage where the town's cats live. Round windows with
> curtains, a chimney with a little smoke curl, a cat flap in the door, two
> tiny beds visible through a window, flower boxes. Warm cream walls, soft
> coral roof.

### `clinic.png` — Cat Clinic · **P1**
> A small friendly clinic for cats. White walls with a soft mint trim, a big
> red cross made of two cat-treat shapes above the door, a round window, a
> bench outside, a lantern. Clean, calm, reassuring.

### `study.png` — The Study · **P1**
> A cosy little library where cats do research. Tall narrow building, arched
> window with warm light inside, stacked books visible, a telescope poking out
> of the roof, ivy climbing one wall. Deep teal walls, warm brown roof.

### `gatehouse.png` — Gatehouse · **P1**
> A sturdy little guard post at the town gate. Stone base, wooden upper floor,
> a small bell, a shield with a paw print on it, a banner, a torch either side
> of the arch. Warm grey stone, deep red roof.

### `guildhall.png` — Guild Hall · P2
> A welcoming meeting hall for allied cats. Wide low building, double doors
> propped open, bunting strung across the front, a noticeboard with pinned
> papers, benches outside. Honey-coloured wood, blue-grey roof.

### `training.png` — Training Yard · P2
> An open training yard for cats. Wooden fence, straw dummies with paw marks,
> a rack of soft toy weapons, a small covered shelter at the back. Sandy
> ground, warm timber, olive-green roof.

### `range.png` — Slingshot Range · P2
> A long narrow shooting range for cats. Wooden shooting line under a canopy,
> round targets with a bullseye at the far end, a barrel of yarn balls.
> Butter-yellow canopy, warm wood.

### `stable.png` — Runner's Stable · P2
> A stable for fast cats. Open-fronted wooden stable with three stalls, hay
> bales, a water trough, a weather vane shaped like a running cat on the roof.
> Warm brown wood, forest-green roof.

### `warroom.png` — War Room · P2
> A small command post. Round tower with a wide flat top, a table with a map
> and little flags visible under an awning, a spyglass on a stand, banners.
> Slate blue walls, deep navy roof.

### `forge.png` — Golden Forge · P3
> A small golden forge. Stone furnace glowing warm orange inside, an anvil
> outside, tongs and hammers on a rack, gold ingots stacked beside it, sparks.
> Warm stone, gold trim, dark iron roof.

---

# ROUND 3 — characters and states

These are **not** buildings, so drop the "no characters" clause from the style
line for these three and keep everything else.

### `palis.png` — Palis, the antagonist
> A mischievous cat villain, standing, full body, arms crossed, smirking. A
> tiny dark cape and a crooked crown. Not scary — the kind of villain a child
> would find funny. Same cute pastel style as the town, thick clean outlines,
> on a plain flat white background.

### `icy.png` — Icy, the helper
> A kind cat helper, standing, full body, waving, warm friendly smile. A pale
> blue scarf and a small satchel. Same cute pastel style as the town, thick
> clean outlines, on a plain flat white background.

### `scaffold.png` — construction overlay
> Wooden scaffolding and planks forming an open frame, with a small ladder and
> a bucket hanging from a rope. Nothing inside the frame — it must sit OVER a
> building. Warm timber, on a plain flat white background.

---

# ROUND 4 — building level variants (later)

Each P1 building eventually wants **three looks**: level 1–4, 5–9, 10+. Reuse
the same prompt with one clause appended, so the building is recognisably the
same place that grew:

- level 5–9: *"…a larger, more established version of the same building: an
  extra storey, more decoration, a bigger sign."*
- level 10+: *"…the grandest version of the same building: taller, ornate trim,
  gold detailing, banners, a well-kept garden around it."*

Do not do this round until the P1 buildings are in and the loop is proven —
it triples the art count for a purely cosmetic gain.

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
