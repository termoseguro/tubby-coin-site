# Kingshot teardown → Tubby Town

Everything found about Kingshot's structure, and what each piece becomes here.
Researched, not remembered — sources at the bottom. Where research could not
confirm something it is marked **UNCONFIRMED**, so nobody later mistakes a guess
for a copy.

Related: `game-design.md` (our design) · `monetization.md` (the money) ·
`roadmap.md` (the order) · `art-brief.md` (how art is produced)

---

## 1. The two things that gate everything

**Town Center level gates every unlock.** Buildings do not appear because the
player wandered into them; each one unlocks at a Town Center level (Embassy at
TC8, Storehouse at TC9, Governor Gear at TC22, Charms at TC25). This is the
answer to "a new player logs in and has nothing to unlock" — in Kingshot there
is *always* a next thing named, and it is always behind the same building.

**Population comes from Houses, not the Town Center.** Upgrading Houses and the
furniture inside them raises how many Residents can join, to a maximum of 32
across a maximum of 8 Houses. Residents are then assigned to roles — workers,
hunters, chefs — and have health and mood that degrade if overworked or
underfed.

So the population number really is a **mix**: Houses set how many residents
exist, the Town Center gates what you may build and how far. Both matter.

**For us:** Cat Hall level gates every unlock. **Cat Cottages** (new buildings,
several of them) set how many **cat villagers** exist. That replaces the
"Cat Hall + 1" placeholder we have now.

---

## 2. Every building

| Kingshot | Does | Tubby Town | Priority |
|---|---|---|---|
| **Town Center** | Gates every other building's level and every feature unlock | **Cat Hall** ✅ built | — |
| **Houses** ×8 | Population — up to 32 residents | **Cat Cottage** ×8 | **P1** |
| **Kitchen** | Cooks bread into meals; survivors eat | **Kitchen** ✅ built | — |
| **Mill** | Produces bread | folded into **Kitchen** ✅ | — |
| **Sawmill** | Produces wood | **Lumber Yard** ✅ built | — |
| **Quarry** | Produces stone | **Stone Quarry** ✅ built | — |
| **Iron Mine** | Produces iron | **Catnip Garden** ✅ built | — |
| **Storehouse** (TC9) | Caps and protects resources from raids | **Storehouse** ✅ built | — |
| **Infirmary** | Heals wounded troops after battle | **Cat Clinic** | **P1** |
| **Embassy** (TC8) | Alliance help, hosting reinforcements | **Guild Hall** | P2 |
| **Academy** | Research: production, build speed, combat | **Study** | **P1** |
| **War Academy** | Advanced/late research | **Old Study** | P3 |
| **Barracks** | Trains infantry | **Training Yard** | P2 |
| **Range** | Trains archers | **Slingshot Range** | P2 |
| **Stable** | Trains cavalry | **Runner's Stable** | P2 |
| **Guard Station** | Town defence durability | **Gatehouse** | **P1** |
| **Command Center** | Squad and rally capacity | **War Room** | P2 |
| **Truegold Crucible** | Refines endgame currency | **Golden Forge** | P3 |

P1 = needed for the loop we are building next. P2 = needed once raids and
alliances exist. P3 = endgame, much later.

---

## 3. Every system

### Heroes — **two** separate gacha systems

This is the "card game" — Kingshot runs two pulls, not one, and they use
different currencies so they can be sold separately.

| | Kingshot | Ours |
|---|---|---|
| Permanent pull | **Hero Hall** — Platinum and Gold keys | **Adoption Center** ✅ built |
| Event pull | **Hero Roulette** — a 3-day lucky wheel, Lucky Chips or gems, 1,500 gems a spin | **Lucky Litter** — new |

Hero Roulette details worth copying exactly:
- Runs for **three days**, starting on day two of a bigger event.
- **One free spin a day** — three free spins total. The free spin is what gets
  people to open it, and opening it is where the paid spins are sold.
- **Milestone rewards at 5 / 15 / 35 / 70 / 120 spins.** This is the real
  mechanic: the reward is not the spin, it is the next milestone.

**Shards:** a hero needs **1,065 shards** to reach 5 stars. Duplicates and
event rewards feed the same pool — which is exactly our fusion/shard design,
already built.

### Gear — the power multipliers

| Kingshot | Unlocks | Ours |
|---|---|---|
| **Hero Gear** (Forgehammers) | Boosts only when leading a rally | **Collars** — boosts a cat leading a raid defence |
| **Governor Gear** | TC22, 6 pieces, set bonuses at 3 and 6 of a level | **Town Charms** — later |
| **Governor Charms** | TC25, 18 charms, 3 per gear piece | later |

The two-layer structure matters: Gear pushes Attack/Defence, Charms push
Health/Lethality. Two ladders that never finish, each with its own material.

### Events

| Kingshot | What happens | Ours |
|---|---|---|
| **Viking Vengeance** — twice weekly, 40 min, **20 waves of raiders** hitting online members and the HQ | Defend the town | **PALIS RAIDS** — this is the event you wanted, and Kingshot's shape fits it exactly |
| **Bear Trap / Bear Hunt** — 30 min every 2 days, alliance rally on a passive boss, damage-based rewards | Co-op damage race | **The Big Nap** — a giant sleepy cat boss |
| **Eternity's Reach** — solo 30-minute mining race, no real losses | Aggressive solo farm | **Catnip Rush** |
| **Mystic Trial** — weekly PvE rotation testing six account systems | Diagnoses weak builds | **Icy's Test** — Icy grades your town |
| **Alliance Championship** — weekly, 6 alliances, three lanes | Team ladder | **Clowder Cup** — later |
| **Kingdom of Power (KvK)** — monthly kingdom vs kingdom | Server war | later |
| **Swordland Showdown** — bi-weekly 30v30, capture buildings, loot caravans | Big PvP | later |
| **Daily loop** — gift codes, alliance help, daily chests | The habit | **P1** |

### Roles, health and mood

Residents are assigned as **workers, hunters or chefs**, and the guides warn to
spread shifts and keep enough chefs or survivors get ill and morale drops.

**For us:** cat villagers already have staffing power. Roles and mood are a
natural extension and map onto the Happiness meter already designed.

---

## 4. What this changes in our design, right now

1. **Unlock every building behind a Cat Hall level.** Nothing should be
   visible-and-usable from minute one. A new player must always have a named
   next unlock. *(This is the "nothing to unlock" problem.)*
2. **Population moves to Cat Cottages.** Cat Hall gates; Cottages supply.
3. **Add the Cat Clinic, the Study and the Gatehouse** — P1, because raids
   need something to damage and heal, and research is the deepest sink there is.
4. **Add the Lucky Litter** as a second, event-only pull with free daily spins
   and milestone rewards at 5/15/35/70/120.
5. **Palis raids take Viking Vengeance's shape**: a fixed schedule, waves, and
   the town itself as the target.

---

## 5. Sources

- [Kingshot buildings & requirements](https://www.kingshotguide.org/buildings)
- [Buildings database](https://kingshot.net/database/buildings)
- [Houses, residents and roles](https://grokipedia.com/page/Kingshot_video_game)
- [Resource ratios and the Storehouse](https://kingshotmastery.com/guides/resource-protection-guide)
- [Hero summoning and Hero Roulette](https://kingshotmastery.com/guides/hero-summoning-events)
- [Hero Roulette detail](https://kingshotdata.com/events/hero-roulette/)
- [Governor gear and charms](https://kingshotmastery.com/guides/kingshot-governor-gear-guide)
- [Every event explained](https://kingshotpro.com/events-guide.html)
- [Bear Hunt](https://kingshotmastery.com/guides/bear-hunt)
- [Gem spending and the builder pack](https://kingshotmastery.com/guides/kingshot-gem-spending-guide)
- [First seven days](https://kingshotmastery.com/guides/kingshot-beginners-first-week-guide)
- [Revenue and design analysis](https://www.blog.udonis.co/mobile-marketing/mobile-games/kingshot)
