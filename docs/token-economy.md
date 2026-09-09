# Tubby Town — the commercial plan

> Governed by **the three rules** in `roadmap.md`: profit, nothing hackable,
> healthy ecosystem — in that order.
>
> This document sits **above** `monetization.md`. That one describes a mobile
> gacha shop; this one decides how hard to lean on it and why. Where they
> disagree, this one wins.

Related: `monetization.md` (the shop catalogue) · `game-design.md` (the game) ·
`tubby-cares.md` (the donation engine) · `security.md` (how each product gets
attacked)

---

## 1. The uncomfortable arithmetic

`monetization.md` was written as a faithful port of the reference games. It is
a good document and it is optimising the wrong term. Here is why, with numbers.

Three things can make money. They are not the same size.

### Term 1 — in-app purchases

The genre's own conversion data, applied honestly to our scale:

| Scenario | Players touching the game | Conversion | ARPPU / season | **IAP revenue** |
|---|---|---|---|---|
| Quiet | 500 | 3% | $20 | **$300** |
| Working | 3,000 | 3% | $20 | **$1,800** |
| Hit | 20,000 | 3% | $20 | **$12,000** |

Three per cent is already generous for this audience. A crypto-native player
arrives expecting to *earn*, not to spend; every measured crypto game converts
to IAP worse than an equivalent mobile game, not better.

### Term 2 — fees on trading volume

| Scenario | Avg daily volume | 30 days | Effective fee | **Fee revenue / month** |
|---|---|---|---|---|
| Quiet | $10k | $300k | 0.5% | **$1,500** |
| Working | $100k | $3M | 0.5% | **$15,000** |
| Hit | $600k | $18M | 0.5% | **$90,000** |

> ⚠ **Verify the 0.5% before publishing anything.** The effective rate depends
> entirely on the launchpad's current creator-revenue terms and on whether we
> hold an LP position. Treat it as a placeholder until it is read off the
> actual contract.

### Term 3 — the bag

| | Market cap | Rafa's 5% |
|---|---|---|
| Launch | $150k | $7,500 |
| Working | $1.5M | **$75,000** |
| Hit | $10M | **$500,000** |

### What this means

**IAP is roughly a tenth of the fee income and a hundredth of the bag.**

In the Working scenario the entire shop earns $1,800 while the token position
moves by $67,500. Optimising the shop harder cannot change the outcome; a
mechanic that adds 20% to the market cap changes it more than tripling the
shop's conversion rate.

So the plan inverts:

> **The game's commercial job is to create demand for $TUBBY and volume in
> $TUBBY. The shop exists to pay the hosting bill, to prove the project is a
> business rather than a pump, and to be there when the Hit scenario arrives.**

Everything below follows from that sentence.

---

## 2. The engine: holding, not spending

A token that is **spent** is sold — by us, eventually, because a treasury full
of an illiquid token is not revenue. A token that is **held** is supply off the
market for as long as the player wants to keep playing.

They are opposite forces and we should not pretend otherwise.

| | Spending $TUBBY | Holding $TUBBY |
|---|---|---|
| Buy pressure | Once, at the moment of purchase | Once, and then it stays off the market |
| Sell pressure | Ours, whenever we realise the revenue | None while they play |
| Player's feeling | "I paid" | "I own" — the money is still theirs |
| Aggregate size | Bounded by willingness to spend (small) | Bounded by willingness to *allocate* (large) |
| Regulatory shape | Commerce | Ordinary token ownership; no promise attached |

The last two rows are the whole argument. A player who will not spend $25 on a
game will quite happily *hold* $25 of a coin they think is going up, because
they have not lost anything. That asymmetry is enormous, and it is the single
biggest lever the project has.

### The numbers on the lever

Hold thresholds are USD-denominated (already in `gameConfig.holdTiers`), so
they stay reachable as the price moves. In the Working scenario, 3,000 players:

| Tier | Hold | Share who reach it | Wallets | **$TUBBY held off market** |
|---|---|---|---|---|
| Housecat | $25 | 40% | 1,200 | **$30,000** |
| Fat Cat | $100 | 15% | 450 | **$45,000** |
| Tubby | $500 | 3% | 90 | **$45,000** |
| Absolute Unit | $2,500 | 0.3% | 9 | **$22,500** |
| | | | | **≈ $142,500** |

Against a $150k launch market cap that is not a nudge, it is the whole float.
And it compounds: the price rising is itself the reason the next player holds.

Compare with the same 3,000 players producing **$1,800** through the shop.

**This is the product.** Everything else is support.

### What holding is allowed to buy

The hold tier must buy **pace and access, never position**.

| ✅ Allowed | ❌ Never |
|---|---|
| Production multiplier (capped at 2.25×, sub-linear — already built) | Anything that decides a skill leaderboard outright |
| Offline accrual cap | Combat power in a mode that is ranked |
| Season **eligibility** | A gate discovered *after* a reward is earned |
| Extra daily free pulls | Exclusive heroes that are strictly stronger |
| Cosmetics, name colour, town theme | Anything that shortens another player's fun |

The reason is commercial, not moral. A board a whale can simply buy empties of
the free players the whale is paying to be seen by, and then the whale leaves
too. The free population **is** the product the spender is buying status in
front of.

---

## 3. Fixing the season pool: dividend and prize are different things

The current design pays the season pool on `timeWeightedHold × playScore`,
linear in hold. That means a $2,500 holder collects **100×** what a $25 holder
does at identical play.

That is perfectly fair as a **fee dividend** — you get back in proportion to
what you put in — and completely indefensible as a **prize**. Right now it is
labelled as a prize, which is the version that generates the accusation.

**Split the pool in two and name each half.**

| | Share | Weight | What it is |
|---|---|---|---|
| **The Dividend** | 60% | `timeWeightedHold` only | A fee share to holders. Says nothing about skill. |
| **The Cup** | 40% | `playScore` only, hold ≥ $25 to enter | An actual competition. A free-tier player can win it. |

This costs nothing, and it buys three things: the whale keeps a reason to hold
big, the good free player keeps a reason to play hard, and neither half can be
described as the other. The plushies and the physical prizes hang off **the
Cup**, because a trophy for holding the most is not a trophy.

### Funding stays as it is, because it is right

The `treats` bucket (25% of creator fees) accumulates in SOL. We **buy $TUBBY
on the open market with it, then distribute that $TUBBY.** Real buy pressure,
every transaction public, and the winner is paid in the thing they must hold to
qualify next season. Do not weaken this.

**The hard constraint stays: rewards out ≤ fees in.** Never from shop revenue,
never from the treasury. That is the line that killed every play-to-earn game
that crossed it.

---

## 4. What we do with token we receive

Sharpening the existing split, because one line of it is a mistake.

Money arrives on two rails and they must be treated differently:

| Rail | Split |
|---|---|
| **SOL / Telegram Stars** | 100% operations. Nothing to burn, nothing to dump — it was never $TUBBY. |
| **$TUBBY** | **40% burned · 40% season pool · 20% operations, held not sold** |

The current doc sends 50% of token revenue to operations. In practice that
means **selling player-paid $TUBBY**, which is sell pressure we are generating
against our own bag, on a wallet everybody watches. It is the fastest available
route to a rug accusation and it earns less than the token appreciation it
costs.

So: take the cash margin on the cash rail, and let the token rail be almost
entirely non-sell. Publish both splits on the tokenomics page.

---

## 5. Re-pricing the shop

He asked for it plainly: nothing too expensive, nothing at pocket-change
prices. The ladder below removes the whale tiers.

**Why remove them.** At 3,000 players there are no whales — the $99 tier would
be bought by perhaps one person, for $99, and its presence tells the other
2,999 that this is a game about extracting money. That reputational cost is
paid in market cap, which is Term 3, which is the term that matters. The
forgone revenue is a rounding error against it.

| Product | Was | **Now** | Why |
|---|---|---|---|
| Starter pack | $2.99 | **$2.99** | Untouched. Its only job is the first purchase. |
| Golden Fish — small | $0.99 | **$1.99** | $0.99 is pocket change and cheapens the currency. |
| Golden Fish — mid | $4.99 | **$4.99** | The band that carries a third of the take. |
| Golden Fish — large | $9.99 | **$9.99** | The ten-pull anchor. |
| Golden Fish — top | $19.99 | **$24.99** | The ceiling. Enough headroom for the rare big spender. |
| ~~$49.99 / $99.99~~ | | **removed** | See above. |
| Monthly pass | $9.99 | **$6.99** | Highest-LTV product in the genre; price it to be an easy yes. |
| Season pass | $9.99 | **$7.99** | Sits under the monthly so both can be bought. |
| Builder 3 / 4 / 5 | $4.99 / $14.99 / $29.99 | **$4.99 / $9.99 / $19.99** | The permanent ladder should not out-price the ceiling. |

**All of it −25% paid in $TUBBY.** That discount is not a promotion, it is the
toll booth: it routes purchase demand through the token.

**Ceiling: no single product above $24.99, ever.** If someone wants to spend
more than that, the thing we want them buying is the token.

---

## 6. Events, as a volume engine

Events are not a retention feature here. They are scheduled, predictable
reasons for the market to move, and each one produces a public buy transaction
anybody can verify.

| Cadence | Event | What it does commercially |
|---|---|---|
| **Weekly** | **Alley Rush** — a Conquest push with a leaderboard. Pool = 25% of that week's fee bucket, bought on market, paid in $TUBBY. Entry: hold ≥ $25 time-weighted. | A weekly buy, a weekly reason to top up to the threshold, a weekly volume spike. |
| **Monthly** | **Season** — the Dividend and the Cup settle. Plushies to the Cup's top 3. | The big one. Qualification pressure builds all month. |
| **Quarterly** | **The Litter** — a new hero generation enters the Lucky Litter. | The genre's oldest demand spike, and it sells the shop's mid tier. |
| **Ad hoc** | **Burn day** — the accumulated burn share is executed in one public transaction. | A supply event people can watch, screenshot and post. |

The mechanic to be careful with is the threshold top-up. A player who is at $22
and needs $25 will buy $3 of token — that is exactly the demand we want, and it
is also exactly the shape that looks manipulative if the threshold moves. So:
**thresholds are published, and never changed mid-season.**

---

## 7. Sinks — what actually leaves circulation

Holding is the engine; sinks are what stop the float growing back. They must be
things a player buys **out of vanity or impatience**, never out of necessity,
or they compete with the hold.

| Sink | Cost | Burned |
|---|---|---|
| Name a cat, permanently, on-chain | small, flat | 100% |
| Town theme / skin | mid | 100% |
| Engrave a collection cat as "yours" in the Album | mid | 100% |
| Shop purchases paid in $TUBBY | varies | 40% (§4) |
| Season entry above the free tier | small | 100% |

Two pockets, and the player should be able to feel the difference: **you hold
to qualify, you spend to show off.** Nothing necessary is ever in the second
pocket.

---

## 8. What breaks the plan

Written down so it is checked rather than remembered.

1. **Selling player-paid $TUBBY from a public wallet.** Kills trust, which
   kills the market cap, which is the only term that matters. §4 exists to
   prevent it.
2. **Rewards exceeding fees.** The moment we subsidise the pool, every new
   player makes the hole deeper. This has killed every game that tried it.
3. **A snapshot instead of a time-weighted average.** A single snapshot is
   borrowed against for an hour and gamed for free. Sample the balance at
   **random times across the whole season** and use the average. This is
   already the note in `gameConfig.js`; it is load-bearing.
4. **Hold buying the Cup.** §3 splits the pool specifically so this cannot
   happen. If it ever merges back, the free population leaves.
5. **A yield promise.** We never say, imply or design anything that reads as
   "hold and earn a return". A fee share for playing is commerce; a promised
   return on a held asset is a different thing entirely and invites a different
   set of authorities. Every public sentence about the Dividend says *share of
   fees generated*, never *yield*, *APY*, *staking* or *returns*.
6. **The game not being good.** 60–70% of players will never spend a cent and
   never hold a token. They are the audience the spenders and holders are
   performing for. If the free game is not worth playing, there is nothing to
   monetise and nothing to hold for.

---

## 9. The order to build it in

1. **Hold tiers, read on-chain, time-weighted.** The engine. Nothing else
   matters until a wallet balance changes what happens in the game.
2. **The Cup and the Dividend, with the split published.** Turns holding into
   a recurring event instead of a one-off.
3. **Weekly Alley Rush.** Makes the buy pressure rhythmic rather than a single
   launch spike.
4. **The re-priced shop, both rails.** Pays the bills, proves it is a business.
5. **Sinks.** Only once there is a float worth reducing.

Step 1 is worth more than steps 4 and 5 combined, and it is the one currently
mocked out in the prototype.
