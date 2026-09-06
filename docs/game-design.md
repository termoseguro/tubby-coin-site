# Tubby Town — game design

The full design. `tubby-town.md` is the overview, `roadmap.md` is the plan,
`security.md` is the threat model. This file is the *what and why*.

Status: **design**. The playable prototype at `/game` is the previous, simpler
idle/gacha loop and does not implement this yet.

---

## 1. What it is

A cozy **cat-city builder** with a gacha collection layer, attached to $TUBBY.
Cats are the workers. The player runs a town, assigns cats to buildings,
manages resources and rest, and collects the tubby cats art.

Kawaii first, always. Soft pastels, round shapes, visible cute movement. The
art direction is not decoration — for a memecoin audience it *is* the product.

### References and what each one contributes

| Game | What we take |
|---|---|
| **Clash of Clans** | Builder scarcity as the conversion moment; timers; escalating costs |
| **Hay Day** | Storage caps that force upgrades; the "you're one resource short" sell |
| **Frozen City** | Idle city-builder pacing — and its warning (see §12) |
| **Cats & Soup** | The cozy aesthetic and the visible little cats doing tasks |
| **Township / SimCity BuildIt** | Timed events with exclusive rewards |
| **Genshin-style gacha** | Published odds, pity, rotating banners |

### The three research findings that shaped this design

1. **The third builder is the gateway purchase.** In Clash of Clans, extra
   builders are the first purchase for nearly every spender, and that first
   purchase strongly predicts more. Builder scarcity is the single most
   valuable mechanic in the genre.
2. **The "state of grace".** Good builders deliberately give the player *more
   resources than they can use* for the first days. The bottleneck only closes
   after attachment. Squeezing early kills retention before it can convert.
3. **Do not gate the city behind gacha luck.** Frozen City's progression
   "grinds to a halt" when the player has not drawn the heroes their buildings
   need. A player who cannot progress without a lucky pull churns. Our rule:
   **the city always progresses on effort alone; the gacha only accelerates.**

---

## 2. Currencies

Introduced in stages, not all at once — six currencies on day one is
overwhelming. The Cat Hall level gates what exists.

| Currency | Role | Unlocked |
|---|---|---|
| **Treats** | Primary soft currency, from the Treat Factory | Start |
| **Kibble** | Food. Working cats consume it | Start |
| **Planks** | Construction, from the Scratch Mill | Cat Hall 2 |
| **Pebbles** | Construction, from the Pebble Pit | Cat Hall 3 |
| **Catnip** | Restores Happiness | Cat Hall 4 |
| **Golden Fish** | **Premium.** Bought with SOL / Telegram Stars | Start |

Rules:
- Every soft currency is capped by the **Pantry** level. Hitting the cap is a
  designed pressure point (Hay Day's oldest trick).
- Golden Fish is never earned in meaningful quantities from play. Small
  amounts from milestones only — enough to teach what it does.
- All balances are integers, server-side. See `security.md`.

---

## 3. Buildings

| Building | Does | Notes |
|---|---|---|
| **Cat Hall** | Gates everything: worker cap, building cap, max levels | The spine |
| **Nap House** | Beds where tired cats restore Stamina | Limited beds = the pressure |
| **Kitchen** | Produces Kibble | |
| **Treat Factory** | Produces Treats | |
| **Scratch Mill** | Produces Planks | Cats sharpening claws on posts |
| **Pebble Pit** | Produces Pebbles | |
| **Catnip Patch** | Produces Catnip | |
| **Pantry** | Raises storage caps | Forced upgrade, by design |
| **Litter Box** | The gacha | |
| **Bell Tower** | Event building — Palis raids, Icy visits | Later phase |

Every construction and upgrade takes **real time** and occupies a Builder Cat.

---

## 4. Cats as workers

Each cat has: **rarity**, **level**, **Stamina**, **Happiness**, and an
assignment (a building, the Nap House, or idle).

### Stamina — the hard gate

- 0–100. Drains while working, at a rate set by the building.
- At 0 the cat **stops producing** and must rest.
- Restored by napping in the **Nap House**, over real time.
- **Beds are limited** by Nap House level. When every bed is full, tired cats
  sit idle and the town's output visibly drops.

That last line is the whole monetisation of this system. The player either
upgrades the Nap House (resources + builder + time) or spends Golden Fish to
instantly refresh a cat.

> **Design call — cats do not die.** The brief said "vida útil". Permanent loss
> of a cat someone paid to pull reads as theft and generates refund rage; it is
> one of the fastest ways to poison a gacha community. Stamina and rest give
> the same pressure and the same purchase moment, without ever taking away
> something the player owns. **Do not implement permadeath.**

### Happiness — the soft multiplier

- 0–100, decays slowly with real time.
- Multiplies the cat's output between **0.5× and 1.5×**.
- Restored with **Catnip**, and raised passively by decorations.

Two decaying meters risk feeling like chores. So they are deliberately
asymmetric: Stamina *stops* work (hard, immediate, fixable), Happiness only
*scales* it (soft, forgiving). A player returning after a week finds a slow
town, never a broken one.

### Worker cap

The number of cats that can be assigned at once is set by the **Cat Hall**
level. Extra cats sit in the collection. This keeps the town readable on screen
and makes each Cat Hall upgrade feel enormous.

---

## 5. Builder Cats — the money mechanic

Construction requires a free **Builder Cat**. One build at a time, per builder.

- **Builder 1** — free, from the start.
- **Builder 2** — free, awarded during the tutorial quests.
- **Builder 3+** — **Golden Fish only.**

This is copied deliberately and without apology: it is the highest-converting
mechanic in the genre, it is not pay-to-win (it buys *pace*, not power), and it
is the purchase that opens the door to every later one.

Pair it with the state of grace: for the first days, resources arrive faster
than one builder can spend them, so the player *feels* the missing builder as
their own bottleneck rather than as a wall the designer built.

---

## 6. Gacha

Odds live in `lib/gameConfig.js` and are published verbatim in-game.

| Rarity | Chance | Output multiplier |
|---|---|---|
| Common | 63.95% | ×1 |
| Rare | 30% | ×3 |
| Epic | 5% | ×9 |
| Legendary | 1% | ×30 |
| Mythic | 0.05% | ×100 |

Guarantees: Legendary+ within 50 pulls (hard pity); every 10× contains an
Epic+. The published total must always be exactly 100.00% — a table that does
not close reads as rigged, and the community *will* add it up.

**Banners:** rotating featured cats, later phase. This is the standard way to
re-sell the same content, and it works because the collection is the point.

---

## 7. The Catdex

A collection screen in the spirit of a Pokédex: every cat in the game, owned
ones shown in full, missing ones as silhouettes with their rarity visible.

Why it matters more than it looks: **the gap is the product.** A player who can
see exactly which three Epics they are missing has a reason to pull that no
amount of stat-boosting provides. Completion percentage per rarity, per set.

Sets: group cats into small themed sets (5–8 each). Completing a set grants a
permanent town-wide bonus. This turns "I want that one cat" into "I need two
more from this set", which is a much stronger pull.

### Art and rarity mapping

All cat art is the real **tubby cats** CC0 collection —
`opensea.io/collection/tubby-cats` — identical to the NFTs, never redrawn.

Rarity follows the NFT's real-world value: the more expensive the piece, the
rarer it is in game.

> **Design warning — freeze the mapping.** NFT prices move. If rarity tracks
> live price, a player's Mythic silently becomes a Rare next month, and that is
> a betrayal they will never forgive. **Take one snapshot** of trait rarity /
> floor-relative price, assign the tiers once, publish the mapping, and never
> re-rank retroactively. New cats can be added; existing ones never move.

**Open item:** the prototype ships 25 art files. A Catdex worth collecting
needs roughly **60–150** curated cats. Sourcing that from the collection is a
task, and the project has a real artist in Palis.

---

## 8. Fusion — the burn

Duplicates have two competing uses. Forcing a choice between them is what makes
both interesting.

A duplicate pull yields a **spare** of that cat. Spares can be spent on:

**A. Shards → level up that specific cat.** Vertical. Makes a cat you already
love stronger.

**B. Fusion → ascend to a higher rarity.** Horizontal. Consumes the cats.

### Fusion rules

- **5 cats of the same rarity → 1 random cat of the next rarity up.**
- **5% chance to skip two tiers** (5 Commons can produce an Epic).
- Costs Treats on top, scaling with the tier.
- The consumed cats are **destroyed**. This is the point.

Deliberately, fusion is *slightly worse* than pulling directly on expected
value. It is not meant to be the optimal path — it is a **pity valve** for bad
luck and, more importantly, a **sink**. Without a burn, every account trends
toward owning everything and rarity stops meaning anything within a season.

The two-tier jump exists purely for the highlight-reel moment. People post
those. A 5% jackpot inside a sink is free marketing.

---

## 9. Monetisation map

What each reference game's most profitable mechanic becomes here:

| Mechanic | Our version | Why it earns |
|---|---|---|
| Builder scarcity | Builder Cat 3+ | The first purchase; opens the wallet |
| Timer skip | Skip construction / nap | Impulse, repeatable, always available |
| Storage cap | Pantry | Converts success into a purchase |
| "One resource short" | Missing-resource top-up | Sells at the exact moment of frustration |
| Gacha | Golden Fish pulls | Highest ARPU mechanic in mobile |
| Cosmetics | Skins, decorations | Pure margin, zero balance impact, walking ads |
| Events | Seasons, Palis raids | Urgency with a deadline |

Sold but never sold as power: **cosmetics are cosmetic**, stated plainly.

---

## 10. Characters

- **Palis — the antagonist.** Raids the town on a schedule: steals from
  storage, drops Happiness, or occupies a building until pushed out. The value
  is not the villainy, it is the *appointment*: a boss that arrives at a known
  time is the strongest retention hook an idle game has.
- **Icy — the helper.** Buffs, rescues, a free boost when things go badly, and
  the tutorial voice.

Both are the real creators of the tubby cats project, which makes the lore
true rather than invented.

---

## 11. The living town

The requirement is explicit: **the player must see it happening.** Cats
walking, working, carrying things, napping. Not a spreadsheet with portraits.

### What moves

- Cats **walk** between the Nap House and their workplace along paths.
- Per-cat states: walking, working, tired (slow, droopy), napping (Zzz).
- Resources **pop off buildings and fly to the HUD counters**.
- Ambient life: drifting clouds, butterflies, swaying grass, day/night tint.
- Build sites show scaffolding and a progress bar; completion pops confetti.

### Technical direction

React stays for all UI and menus. The town itself becomes a **canvas layer**
underneath — this is the standard architecture for this kind of game, and DOM
elements do not survive dozens of moving sprites.

Recommendation: **PixiJS** for the town view. Mature, small, WebGL-batched,
handles hundreds of sprites without effort. Canvas 2D by hand is viable but we
would end up rewriting a third of Pixi.

### The art problem, honestly

The 25 files we have are **portraits, not walk cycles**. Real walking animation
needs real sprite sheets, and that is an art commission, not a code task.

Interim solution that looks genuinely good: slide the portrait along a path
with a **squash-and-stretch bob and a moving shadow**. Cozy games do exactly
this with limited art and it reads as charming rather than cheap. Upgrade to
true sprite sheets when the art exists — Palis is the obvious source.

---

## 12. Design risks to hold the line on

1. **Never gate city progress behind gacha luck.** Frozen City's documented
   failure mode. Buildings must always be upgradeable with effort alone; cats
   accelerate, never unlock.
2. **Do not squeeze early.** Protect the state of grace. The first days must
   feel abundant.
3. **Two decaying meters is the maximum.** Stamina and Happiness. Adding a
   third turns the game into a chore list.
4. **No permadeath.** See §4.
5. **Never re-rank rarity.** See §7.
6. **Cosmetics stay cosmetic.** The moment a skin gives +5% output, every
   cosmetic purchase becomes a balance argument.
7. **Complexity is drip-fed.** Currencies and buildings unlock by Cat Hall
   level. Everything visible on day one is everything lost on day one.
