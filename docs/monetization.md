# Tubby Town — monetisation & reward economy

**The rule above every rule: profit.** Everything here is built to serve that.
Which is exactly why some of it says "do not do X" — the failure modes below
are the ones that destroy the revenue, not the ones that offend anyone.

Related: `game-design.md` (the game) · `roadmap.md` (when) ·
`security.md` (how each product gets attacked)

---

## 1. Two engines. Never confuse them.

| | **Revenue** | **Rewards** |
|---|---|---|
| Money flows | **In** — players buy Golden Fish | **Out** — payouts to players |
| Funded by | Real purchases (SOL / Telegram Stars) | The `treats` bucket = 25% of creator fees |
| Purpose | This is the profit | Acquisition — it brings crypto players in |
| Goes to | The shop wallet → us | The season board + plushies |

**The single hard constraint: rewards out ≤ fees in. Never dip into shop
revenue or treasury to pay rewards.** The moment reward spending outruns fee
income, we are paying people to play with our own money, and every player who
shows up makes that worse. That is the mechanism that killed play-to-earn.

The reference games make their billions with **zero** money rewards. Rewards
here exist to open the door to a crypto audience — not because a game needs
them to be played.

---

## 2. What actually converts

Ranked by how much they matter, from the genre's own data:

1. **The first purchase.** Converting a non-payer into a payer is worth more
   than any single sale, because paying once massively raises the odds of
   paying again. The starter pack exists for this and nothing else.
2. **The bottleneck purchase.** Builder Cat 3 (see `game-design.md` §5). In
   this genre it is the most common first purchase there is.
3. **The subscription.** Highest lifetime value product in mobile. Recurring,
   and it manufactures a daily login habit.
4. **Guaranteed-outcome gacha.** Selling *certainty* converts far better than
   selling chance — the pity itself becomes the product.
5. **VIP.** Makes every other purchase count twice.
6. **The "one resource short" top-up.** Sells at the precise moment of
   frustration.

---

## 3. Products

### 3.1 Starter pack — the conversion tool

- **$2.99, once per account, permanently marked as used.**
- Contents: **500 Golden Fish + 1 guaranteed Epic cat + Builder Cat 2 unlocked
  instantly**.
- Value shown against normal rates: roughly **5× a standard purchase.**

The margin does not matter. This product exists to move someone across the
line from non-payer to payer. Price it so the answer is obviously yes.

### 3.2 Golden Fish packs

Escalating bonus, the standard ladder — it makes the big pack feel like the
smart choice, which is the whole point.

| Pack | Price | Golden Fish | Bonus |
|---|---|---|---|
| Pawful | $0.99 | 100 | — |
| Pouch | $4.99 | 550 | +10% |
| Basket | $9.99 | 1,200 | +20% |
| Crate | $19.99 | 2,500 | +25% |
| Wagon | $49.99 | 6,500 | +30% |
| Hoard | $99.99 | 14,000 | +40% |

Prices are quoted in USD and converted to lamports **at order creation**, then
locked for ~5 minutes (see `security.md` §3). Telegram sales use Stars.

### 3.3 VIP — cumulative, permanent, never resets

**1 Golden Fish purchased = 1 VIP EXP.** VIP never decays and never resets.
This is what makes every purchase count twice: the player gets the thing *and*
progress toward permanent perks.

| VIP | Cumulative EXP | Perks (cumulative) |
|---|---|---|
| **1** | 500 | +1 free daily pull · +10% offline cap |
| **2** | 2,000 | Bigger Pantry cap · −10% construction time |
| **3** | 6,000 | Auto-collect resources · Happiness decays 20% slower |
| **4** | 15,000 | 2nd free daily pull · 1 free instant-nap per day |
| **5** | 40,000 | Exclusive skin · name colour · profile aura |

> **VIP perks must never multiply leaderboard score.** They are convenience,
> soft economy and cosmetics only.
>
> This is not a fairness concern, it is a revenue concern. If VIP buys board
> position, the board becomes a whale-only club, free players leave, and the
> whale loses the audience he was paying to beat. Every gacha that lasts
> protects its free population deliberately — the F2P crowd *is* the product
> the spender is buying status in front of.

### 3.4 Golden Litter Box + tickets — selling certainty

A premium banner, separate from the free box, with its **own pity counter**.

- **Golden Fish only.** 50 GF per pull, 450 GF for ten.
- Better odds: **Legendary 3%** (vs 1% in the free box).
- **Hard guarantee: a Legendary within 30 pulls.** Published.
- The only source of **banner-exclusive** cats, rotating.

**Tickets** are the product that actually sells:

| Ticket | Price | What it is |
|---|---|---|
| Single | 50 GF | One premium pull |
| Ten-pack | 450 GF | Ten pulls, Epic+ floor |
| **Guarantee bundle** | **1,300 GF** | **30 pulls — the full guarantee, in one purchase** |

The guarantee bundle is the headline product. It converts the pity mechanic
from a consolation into a thing people buy on purpose, and it removes the
"what if I get nothing" hesitation that stops mid-spenders.

Separate pity counter and separate currency, so the premium box never
cannibalises or devalues the free one.

### 3.5 Monthly pass — the highest-LTV product

**$9.99 / 30 days.**

- **300 Golden Fish immediately**
- **+100 Golden Fish every day you log in**, for 30 days
- Auto-collect resources, +1 build queue slot

Total value ~3,300 GF for the price of a 1,200 GF pack. It looks almost too
generous, and that is the design: the value is not the fish, it is the **daily
login obligation** and the recurring charge. This is consistently the strongest
revenue product in the genre.

### 3.6 Season pass

Two tracks over ~8 weeks: a free track and a **$9.99 premium track**, both
advancing on play. Premium track carries cosmetics, Golden Fish, and one
guaranteed Legendary near the end.

Season passes work because progress already earned is visible and unclaimed —
the purchase retroactively unlocks what the player *already did*.

### 3.7 Resource top-up

When a build is short, offer exactly the missing amount for Golden Fish, priced
by the gap. Hay Day's oldest and best trick: it sells at the exact moment of
frustration, and it is the most repeatable purchase in the game.

### 3.8 Cosmetics

Skins, town themes, decorations, name colours, profile auras.

**Cosmetics stay cosmetic — always.** Pure margin, no balance argument ever,
and a paying player becomes a walking advertisement inside the game.

---

## 4. The reward economy

### Sources

1. **The `treats` bucket — 25% of creator fees.** Already reserved in
   `lib/config.js`. This is the season pool.
2. **Plushies.** Physical, ultra-rare, top 10 per season, one per shipping
   address.
3. **Scarcity rewards.** Founder cats, exclusive Catdex entries, badges.
   These cost nothing and carry enormous perceived value.

Shop revenue is **not** a reward source. It is the profit.

### The rules that keep it from collapsing

1. **Never promise a fixed amount.** Always "a share of the pool, whatever the
   pool is." A fixed number is a debt the moment volume drops, and volume
   always drops sometime.
2. **Payouts are proportional to time-weighted hold × play score** — the
   anti-sybil design in `tubby-town.md` §3. Splitting capital across wallets
   gains nothing.
3. **Communicated as discretionary marketing.** Never as return, yield or
   income. No investment language, anywhere, ever.
4. **The pool can be zero.** If fees are zero that week, the payout is zero and
   the game still works, because the game is the retention and the payout was
   only the acquisition.

### The grace period vs. sybil — and how the ranking resolves it

The **state of grace** (`game-design.md` §1) hands a brand-new account
abundance on purpose. That is, on its face, an invitation to farm accounts.
It is the sharpest tension in the whole design, and it is resolved by one
principle:

> **Be generous with what cannot leave the account. Be ruthless with what can.**

A farmer wants something *extractable*. A new player wants to feel unblocked.
Those are different things, so we can give one without giving the other.

**The rules that make grace safe:**

1. **Nothing is transferable between accounts. No trading, no gifting, ever.**
   This single rule kills "farm a thousand accounts and funnel it to the main"
   outright. Everything granted during grace — Treats, Planks, Pebbles, Kibble
   — is bound to the account and worthless outside it.
2. **Grace gives soft resources, never Golden Fish and never reward
   eligibility.** A token amount of Golden Fish to teach what it does, and
   nothing more.
3. **Grace unlocks over real days, not over actions.** Spread across the first
   ~7 days, a farmer must *wait* per account, and still ends with nothing
   extractable.
4. **Reward eligibility has a floor a fresh account cannot meet:** a minimum
   time-weighted $TUBBY hold, sampled at random times. The cost of an eligible
   account is the cost of that hold — so a thousand accounts cost a thousand
   holds, for the same total payout. No gain, a thousand times the gas.

### The ranking formula

The brief: the board must be **fiercely contested** and **very hard to climb**.
Those two requirements plus anti-sybil point at the same answer — score must
come from **depth that takes real time**, not from volume that can be spun up.

```
score  =  town depth  ×  hold multiplier  ×  collection factor
```

- **Town depth** — Cat Hall level, total building levels, total cat levels.
  Every one of these is gated by construction timers and Builder Cats, so depth
  cannot be conjured; it costs weeks, or money to compress weeks.
- **Hold multiplier** — the existing capped tiers, **1.0× to 2.25×**. Money
  helps and is visible, but it **caps**. Nobody buys rank #1 outright.
- **Collection factor** — Catdex completion, which needs many pulls across
  time.

Why this satisfies all three goals at once:

| Goal | How the formula delivers it |
|---|---|
| Hard to climb | Depth is timer-gated. There is no shortcut, only acceleration. |
| Fiercely contested | The hold multiplier caps, so whales and veterans actually fight instead of one wallet ending the contest. |
| Sybil-proof | A fresh account has near-zero depth and near-zero collection. Score ≈ 0, no matter how many you make. |

**Rank decay.** A score that only ever rises turns the top into a museum. Score
decays with inactivity, so holding a position costs continuous play. This is
what keeps the board contested *after* launch, which is when it matters.

**Launch founder rewards are the exception to watch.** Founder cats and badges
are genuinely valuable and go to new accounts — exactly what a farmer targets.
Gate them: pre-registration snapshot, minimum hold, one per wallet, and require
prior on-chain history (wallet age, real transactions). Freshly created empty
wallets get nothing.

### Why the plushie is the best reward we have

It is scarce, physical, and emotionally enormous — but its cost is **fixed and
known**, not proportional to how many people play. A cash pool gets more
expensive as the game succeeds. A plushie does not. It also dedupes sybils by
itself through the shipping address.

Lean on plushies and scarcity harder than on cash. They buy more loyalty per
dollar than SOL does.

### Launch sequencing — important

At launch there are **no creator fees yet**: no coin, no volume, no pool.
Promising SOL payouts on day one creates an obligation with no income behind
it.

So launch rewards are **scarcity, not cash**:

- Pre-registration → **founder cats**, permanent Catdex entries, a founder badge
- Early season top ranks → **plushies**
- Fee-share switches on **only once fees actually exist**, announced then

This costs nothing, generates real urgency, and creates no debt.

---

## 5. Security notes per product

Every product here is a new attack target. Full detail in `security.md`;
the product-specific ones:

| Product | Attack | Defence |
|---|---|---|
| Starter pack | Buy it repeatedly | Server-side one-per-account flag, enforced by a UNIQUE constraint |
| VIP | Claim a level you did not buy | VIP EXP derived **only** from on-chain-verified purchases, recomputed server-side, never sent by the client |
| Tickets | Spend the same ticket twice | Ticket balance server-side; consume and roll in one transaction |
| Guarantee bundle | Manipulate the pity counter | Pity counters live server-side, per banner |
| Monthly pass | Claim the daily drip more than once | Claim keyed on server date + account, UNIQUE |
| Season pass | Unlock the premium track without paying | Ownership flag set only by verified payment |
| Top-up | Alter the quoted gap | Server computes the shortfall and the price; the client sends only "yes" |
| Rewards | Farm the payout | Proportional payouts + random-time hold snapshots + funding-graph clustering |

---

## 6. What we do not do

Not ethics — these are the things that kill the revenue:

- **No fixed payout promises.** Becomes a debt, then a scandal.
- **No pay-to-win on the leaderboard.** Kills the free population, and the free
  population is what whales are paying to be seen by.
- **No investment language.** Ever.
- **No silent odds changes.** The published table is the contract; changing it
  quietly is the one thing a gacha community never forgives.
- **No permadeath, no retroactive rarity re-ranking.** Both read as taking
  something the player owns. See `game-design.md` §4 and §7.
- **No rewards funded from shop revenue.** That is the profit. If rewards need
  it, the reward design is wrong.
