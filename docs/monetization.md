# Tubby Town — monetisation & reward economy

> Governed by **the three rules** in `roadmap.md`: profit, nothing
> hackable, healthy ecosystem — in that order.

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

## 2.5 The in-game currency — $TUBBY or SOL?

**Decision: both rails, with $TUBBY discounted.**

The flywheel argument for $TUBBY is correct and it is the strongest strategic
idea in the project: if players must buy $TUBBY to spend it, **every purchase
is trading volume, volume is creator fees, and fees are the reward pool that
brings the next player in.** The player's spending funds the player's own
reward. There is no better marketing than that, and it is exactly what
CrimeOnChain is built on.

Three real problems stop it from being $TUBBY-only:

1. **Friction kills conversion.** A newcomer would need: fiat → SOL → swap to
   $TUBBY → approve → spend. Every step loses a large share of users, and the
   people we lose are precisely the non-crypto players we most want.
2. **Telegram forbids it.** Digital goods in a Mini App must go through
   Telegram Stars. A second rail is mandatory there regardless.
3. **Volatility.** A pull priced at a flat 1,000 $TUBBY costs 5× more in real
   money if the token 5×s, and becomes free if it dumps.

So:

- **Everything is priced in USD internally.** The $TUBBY amount is computed at
  order creation from a price read, and locked for ~5 minutes — the same
  mechanism the payment flow already uses (`security.md` §3).
- **Pay with SOL or Stars at full price.**
- **Pay with $TUBBY at a ~25% discount.**

The discount is the flywheel's engine. It costs a quarter of the margin on
token-paid sales and in exchange routes buying pressure through the token,
generates the fees that fund rewards, and gives holders a real reason to hold
beyond speculation. Most spenders will take a 25% discount; the ones who will
not were never going to touch a swap anyway.

### What happens to the $TUBBY we receive

This gets **published on the tokenomics page**, because transparency is what
makes people trust the payout — and trust is the actual product.

| Share | Where it goes | Why |
|---|---|---|
| **50%** | Operations (us) | The profit |
| **30%** | **Burned** | Permanent supply reduction, verifiable on-chain, feeds the existing "bite" narrative |
| **20%** | Season reward pool | Straight back to players |

Half the game's token revenue visibly returns to the token. That is a story
worth telling, and it is true.

**What we never do: quietly sell player-spent $TUBBY into the market.** People
watch that wallet. Visible dumping from the shop wallet is the single fastest
way to turn a working game into a rug accusation.

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
| Pawful | $0.99 | 120 | — |
| Pouch | $4.99 | 660 | +10% |
| **Basket** | **$9.99** | **1,440** | +20% |
| Crate | $19.99 | 3,000 | +25% |
| Wagon | $49.99 | 7,800 | +30% |
| Hoard | $99.99 | 16,800 | +40% |

Prices are quoted in USD, converted at order creation and locked ~5 minutes
(`security.md` §3). Telegram uses Stars. **$TUBBY payers get ~25% off.**

### Why this ladder, from the data

- The **top 5% of payers produce 48% of revenue** and the top 10% produce 64%.
  Without $49.99 and $99.99 tiers, roughly half the money has nowhere to go.
- **Mid-tier spenders are 30–40% of revenue** — the most under-served segment
  in most games. The $4.99–$19.99 band is not filler, it is a third of the take.
- **60–70% of players never spend.** The free game has to be genuinely good on
  its own, or there is no audience for the spenders to perform in front of.

### On "cheap for the US audience"

A $30 ten-pull is **not** cheap — that is roughly Genshin pricing, the premium
end of the market. Genshin can charge it because it has years of brand trust.
A new memecoin game has none, so we price under it:

**Target: a ten-pull costs one $9.99 Basket** (1,440 GF), or about **$7.50 paid
in $TUBBY.** That is half the premium-market rate — genuinely cheap — while the
upper packs still capture the whales who produce half the revenue.

### Costs in Golden Fish

| Item | GF | ≈ USD |
|---|---|---|
| Single pull | 160 | $1.10 |
| **Ten-pull** | **1,440** | **$9.99** |
| Guarantee bundle (30 pulls) | 4,000 | $27 |
| **Builder Cat 3** | **600** | **~$4** |
| Builder Cat 4 | 1,500 | ~$10 |
| Instant nap | 12 | ~$0.08 |
| Storehouse expansion | 250 | ~$1.70 |

Builder Cat 3 is deliberately cheap. It is not a revenue product, it is the
**door**: the industry's most common first purchase, and a first purchase
strongly predicts every purchase after it.

### 3.3 VIP — cumulative, permanent, never resets

**1 Golden Fish purchased = 1 VIP EXP.** VIP never decays and never resets.
This is what makes every purchase count twice: the player gets the thing *and*
progress toward permanent perks.

| VIP | Cumulative EXP | Perks (cumulative) |
|---|---|---|
| **1** | 500 | +1 free daily pull · +10% offline cap |
| **2** | 2,000 | Bigger Storehouse cap · −10% construction time |
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

### 3.4 Golden Adoption + tickets — selling certainty

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

**Season 1 pays a share of creator fees, from day one, delivered in $TUBBY.**

Paying in the token rather than SOL is deliberate and it compounds: the winner
receives $TUBBY, operates with it, trades it — and that trading generates more
creator fees, which fund the next payout. The reward keeps working for the
project after it is paid.

### How the payout is actually funded — buy, then distribute

The `treats` bucket (25% of creator fees) accumulates in **SOL**. The payout is
in **$TUBBY**. The bridge between them matters enormously:

> **Use the fee SOL to buy $TUBBY on the open market, then distribute that
> $TUBBY to winners.**

Not from a treasury allocation. The difference is everything:

| | Buy-then-distribute | Distribute from treasury |
|---|---|---|
| Effect on price | **Real buy pressure** | Pure sell pressure when winners sell |
| Verifiable | Every buy is an on-chain transaction anyone can check | "Trust us" |
| Second-order | Winners who sell create volume → more fees | Same, but the supply came from nowhere |

It is a buyback that happens to be paid out instead of burned, and it pairs
with the existing "bite" bucket. It is also the single most convincing
transparency artefact we can produce: a public buy transaction followed by
public distributions.

### Not 100% goes out

The reward pool is a **share** of the fee bucket, not all of it. The remainder
is operations. The exact split gets published on the tokenomics page and is
never changed quietly.

The hard constraint stays: **rewards out ≤ fees in.** Never funded from shop
revenue, never from treasury. If the pool is small this season, the payout is
small — and the game still works, because the game is the retention and the
payout is the acquisition.

### Plushies — top 3, two colours

Physical, ultra-rare, and the most cost-efficient reward we have: the cost is
**fixed and known**, not proportional to how many people play. A cash pool gets
more expensive as the game succeeds. A plushie does not. It also dedupes sybils
by itself, through the shipping address.

| Rank | Reward |
|---|---|
| **1st** | The fee share **+ both plushies (pink and black)** |
| **2nd** | The **black** plushie |
| **3rd** | The **pink** plushie |

Only first place taking both is the right call: it makes rank 1 a genuinely
different prize rather than a slightly larger one, which is what makes the top
of the board worth fighting over.

One per shipping address, verified before dispatch.

### Founder packs — paid, limited, and the pre-launch war chest

Founder cats are **not** given away for pre-registering. They are bought, in a
limited and expensive pack. Pre-registration gets a wallet on the list and
early access; the founder cat is a purchase.

| Tier | Price | Limit | Contains |
|---|---|---|---|
| **Founder** | $49 | 2,000 | Founder badge · 1 exclusive Founder cat · VIP 2 · 3,000 GF |
| **Gold Founder** | $199 | 300 | Gold badge · 2 exclusive Founder cats · VIP 4 · 15,000 GF · credited by name |

Both cats are **exclusive in appearance, never in power** — Legendary-tier
stats, permanently unobtainable afterwards, and listed forever in the Catdex as
a Founder set. Scarcity of identity, not of strength, so the leaderboard stays
clean (§3.3).

Sold out means sold out. Re-issuing a "limited" item later is the one thing
collectors never forgive.

> **Sell these only once there is a playable demo.** Selling a founder pack
> before the game exists is selling a promise; if the build slips, that promise
> becomes the story. With a demo live it is a pre-order, which is normal — and
> it front-loads the cash that funds the rest of development.

### Transparency is the product

All of it — the fee split, the reward share, the buy transactions, the
distribution list, the plushie winners — gets a permanent, plainly written
section on the **tokenomics page**. Not a promise page: a **receipts** page.

This is not decoration. For a crypto audience, verifiable transparency is the
single strongest retention and acquisition asset there is, and it is the thing
that separates a game with a token from a rug. Show the maths, show the
transactions, and let anyone check them.

Language stays clean throughout: rewards, prizes, pool share. Never return,
yield, income or investment.

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
