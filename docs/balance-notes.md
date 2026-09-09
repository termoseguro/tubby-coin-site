# Balance — what is tuned, and what is waiting on real testers

Everything here is measured, not felt. Two scripts produce the numbers:

```bash
npm run check:progress   # can the ladder ever DEADLOCK
npm run project          # how long is the wait, for three wallets
```

`check:progress` grants unlimited resources and proves there is always a legal
move. `project` runs the real economy on an hourly tick with a policy that
behaves like a person, and reports the gap between good things.

---

## 1. Four deadlocks the simulation found

All four were invisible to a rules-only check, and all four made the game
unwinnable rather than merely slow. They are in the code with comments.

| # | What happened | Fix |
|---|---|---|
| 1 | Cat Hall 1 → 2 cost **360 Fish**. The Kitchen — the only Fish source — unlocks **at** Cat Hall 2. A new town started with 250 Fish. **Every new player was stuck on the first move, forever.** | `upgradeCostFor` never charges for a resource the ladder has not unlocked |
| 2 | The **Kitchen's own construction cost Fish**, and the Kitchen is where Fish comes from. A town that spent its opening Fish could never build one. | a producer never costs the thing it is the only source of |
| 3 | Cats ate Fish before any Kitchen existed, draining the opening stock in ~2 hours. | upkeep starts with the Kitchen |
| 4 | The stockpile cap was a flat **4,000** until a Storehouse existed — and the Storehouse unlocks at Cat Hall 9. Cat Hall 4 → 5 costs **5,614 Wood**. **Nobody could ever pass Cat Hall 4.** | the cap scales with the Cat Hall; the Storehouse multiplies it |

The rule that prevents the whole family: **never charge for a resource the town
cannot yet produce, and never cap below the price of the next step.**

---

## 2. The Long Alley was unbeatable

Measured against real rosters, the old curve read:

```
1 fresh Rare ......... dies on stage 1
5 Epic 3* L40 ........ dies on stage 7
```

A fully-built five-Epic three-star team could not clear the eighth stage. There
was no grace period at all — the hero game had nowhere for a new roster to be
useful, which is exactly the opposite of Kingshot, where you clear a run of
stages in your first sitting.

Now:

```
1 fresh Rare .........  stage 4   (the chapter-1 boss is the wall)
4 fresh Rare .........  stage 7
4 Rare 1* L10 ........  stage 9
5 Rare 2* L20 ........ stage 17
5 Epic 2* L20 ........ stage 29
5 Epic 3* L40 ........ stage 49
```

The first two chapters are eased on purpose and the easing reaches 1 exactly at
stage 10, so there is no cliff at the join.

### The idle reward was the wrong shape

`idleGoldMultiplier` multiplied the **town's** Gold production by the deepest
stage cleared. Kingshot does not do that. Its Conquest accrues **its own**
reward pool at a rate set by your deepest stage, **caps at twelve hours**, and
you go and collect it — every guide says "collect twice daily, do not let it cap
out".

That cap is the retention mechanism, and a silent multiplier on another screen
has none of it. It also meant a player who ignored the hero screen slowly
discovered their buildings had been throttled by something they never saw.

Replaced with `alleyPending()`: a purse you can watch filling, in the place you
earned it. Opening the Alley collects it.

---

## 3. The three wallets, at 30 days

Real economy, hourly tick, 16 waking hours a day.

| | Spend | Cat Hall | Built | Villagers | Alley | Worst wait |
|---|---|---|---|---|---|---|
| Free to play | $0 | **15** | 24/26 | 26 | stage 9 | 12h |
| The $10 player | $10 | **19** | 25/26 | 30 | stage 17 | 12h |
| The spender | $150 | **17** | 25/26 | 32 | stage 29 | 12h |

Cat Hall by day:

| | d1 | d2 | d3 | d5 | d7 | d14 | d21 | d30 |
|---|---|---|---|---|---|---|---|---|
| Free to play | 3 | 4 | 5 | 6 | 6 | 8 | 11 | 15 |
| The $10 player | 3 | 4 | 5 | 7 | 8 | 10 | 13 | 19 |
| The spender | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 17 |

### What the table says

**The $10 player is the healthiest account in the game**, and that is the right
answer. Ten dollars buys two extra builders, which is the difference between
one thing happening at a time and three — and for the first three weeks
builders are the binding constraint.

**The spender is deeper in the Alley and behind on the town**, which looks
wrong and is real: they rush every timer, so they run out of *materials* rather
than time. At day 30 they are short 20,596 Stone. The wall at the top of the
game is not the clock, it is the quarry.

> **This is a monetisation finding, not a bug.** The resource top-up
> (`monetization.md` §3.7) is not a nice-to-have — it is the only product that
> addresses the spender's actual wall. Without it, $150 buys less than $10.

**Everybody's first week is the same**, day 1 to day 5, and that is deliberate:
the grace period has to be the same shape for everyone or the free player never
sees why the game is worth paying for.

---

## 4. Waiting on real testers — do not tune these yet

Rafa's read after playing, 2026-09-09: *"tirando [o Gold], achei tudo fácil
demais, talvez a gente tenha que diminuir esse estado de graça pros iniciantes,
porém, deixa isso daí anotado, pra gente dar um tune down depois que algumas
pessoas testarem."*

So these are **noted and deliberately not acted on**. Tuning difficulty against
one person's first impression is how a game gets balanced for one person.

| Suspected | Evidence so far | What to watch |
|---|---|---|
| The grace period is too generous | Cat Hall 5 by day 3 for everyone | Where testers stop opening the game. If day-7 retention is fine, leave it. |
| Progress is too fast overall | F2P reaches Cat Hall 15 in a month | Whether anyone runs out of ladder. 26 buildings and Cat Hall 30 is a lot of ladder. |
| Gold is too scarce | Gold gates furniture, furniture gates every building | Now that the Alley is beatable and pays a purse, re-measure before touching the faucet. |

The Alley fix alone changes the Gold picture materially — the free player went
from Cat Hall 12 to Cat Hall 15 on that change and nothing else. **Re-run
`npm run project` before adjusting any Gold number.**

### The known lever, if a tune-down is wanted

In order of how bluntly they work:

1. `buildSecondsFor` — the clock. Currently `60 · k · L^2.2`. Raising the
   exponent slows everything and makes builders worth more.
2. `mobPower`'s `ease` term in `conquest.js` — shortens the grace period
   without touching the late game.
3. `upgradeCostFor`'s `1.85` exponent — steepens the material curve, which
   bites the spender hardest and the free player least.

Never all three at once, and never without re-running the projection.
