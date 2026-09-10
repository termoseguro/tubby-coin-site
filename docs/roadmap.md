# Tubby Town & $TUBBY — roadmap

Past, present and future in one place. **Keep this file current** — when a
phase moves, update it in the same commit as the work. It is the file a new
session (or a new machine) reads first.

Last updated: 2026-09-07

Related: `tubby-town.md` (overview) · `game-design.md` (the design) ·
`monetization.md` (revenue, VIP, rewards, ranking) · `tubby-cares.md` (the
donation engine) · `security.md` (threat model)


## The three rules

Stated by the project owner, in priority order. Every decision in every
document here answers to these, in this order.

1. **Profit.** Money in the owner's pocket. This is the point of the project.
2. **Nothing hackable.** Not the site, not the chain integration, not the game
   state, not the payments. No exceptions, no "good enough for now" on anything
   that touches value.
3. **A healthy ecosystem.** The game and the token have to still be alive in a
   year for rule 1 to keep paying.

They do not conflict as often as they look like they might. Where a document
here says "do not do X" despite X looking profitable, it is because X breaks
rule 2 or rule 3 and therefore stops paying under rule 1. The reasoning is
always written down next to it — argue with the reasoning, not the rule.

**Tubby Cares does not sit outside these rules, it sits inside rule 3.** 20% of
creator fees buys supplies for children's shelters in Rio (`tubby-cares.md`),
and it was cut out of the art fund's own slice — ops, treats and bite were not
touched. A memecoin that visibly does something real is a memecoin people stay
attached to, which is what keeps rule 1 paying. The moment it stops being real
it becomes the project's biggest liability, which is why that document is
mostly rules about proof.

---

## Where things stand

| | |
|---|---|
| **Coin** | Not launched. `live: false`, CA is `TBA` in `lib/config.js` |
| **Fee split** | care 20 / ops 30 / treats 25 / bite 15 / art 10 — five wallets |
| **Site** | Live at tubbycatscoin.com (Vercel, deploys from `main`) |
| **Game** | Live at `/game`. Server-authoritative core built (see phase 3); guest mode still browser-only by design |
| **Delivery log** | `/cares` — published, empty until the first run |
| **Repo** | github.com/termoseguro/tubby-coin-site |

---

## PAST — done

### Phase 0 · The promo site
- Static `index.html` migrated to **Next.js 14 App Router**
- Everything configurable centralised in `lib/config.js` (single source of truth)
- Full visual system: pink `#fe80c0` / gold, Inter Tight, pill buttons
- Sections: hero, Find $TUBBY, project fund, NFTs, merch, art wall, receipts,
  how to buy, FAQ
- Heavy media optimised — page weight 34.6MB → ~1.4MB
- Mobile nav, OG image, metadata

### Phase 0.5 · Tokenomics
- `/tokenomics` route with live market board (DexScreener), supply donut and
  burn counter (RPC), live wallet balances, the "9 Lives" quest
- Economy set to a **4-way creator-fee split**: art 30 / ops 30 / treats 25 /
  bite 15. The `treats` bucket is the game's reward budget.

### Phase 0.6 · Tubby Cares ✅ *(the split became 5-way)*
- **20% of creator fees** now buys supplies — diapers, formula, medicine, food —
  for children's shelters in Rio de Janeiro. **Goods, never cash.**
- Funded by cutting the art fund from **30% to 10%**. No other bucket moved,
  which is the whole reason the split survives a hostile thread.
- Full design, rules and threat model in `tubby-cares.md`. The load-bearing one:
  **the donation amount never depends on how much anyone plays or spends** — the
  game decides where a run goes and whose name is on it, never how much.
- Site rebuilt around it: the home page's live counter is now the Cares basket,
  milestones are named deliveries written in items rather than SOL, the receipts
  section carries the delivery log, and `/tokenomics` shows five slices.
- Still to do before launch: real quotes behind every `milestones[].items`
  string, the shelter partnerships, and the `/cares` delivery-log page.

### Phase 1 · Game prototype ✅
- Idle production, gacha, collection, $TUBBY hold multiplier, season board
- All tuning centralised in `lib/gameConfig.js`
- Anti-sybil designed as **economics, not detection** (`tubby-town.md` §3),
  with a live simulator in the Board tab proving splitting capital gains nothing
- Drop rates set to 63.95 / 30 / 5 / 1 / 0.05, published in-game, total exactly 100

### Phase 1.5 · Art direction ✅
- First pass rejected for looking machine-made (emoji icons, flat cards, an
  HTML table for drop rates, no depth, no motion)
- Rebuilt: hand-rolled SVG icon set, chunky casual-game chrome, then repainted
  **kawaii** — cream panels, candy pastels, pink-tinted shadows
- The town became a *place*: sky, drifting clouds, candy skyline, ground, cats
  standing with shadows and staggered idle breathing, per-cat work bars whose
  speed derives from real production rate

### Phase 1.7 · The living town ✅ (art pending)
- **PixiJS canvas** under the React UI (`app/game/town/`), dynamically imported
  so it never touches SSR and stays out of the main bundle
- Pastel sky with drifting clouds, grass, two streets, ten labelled buildings
- The real cat portraits walk between buildings on a **WALK → WORK → NAP**
  state machine, with coins popping off whoever is working
- Buildings load from `/town/<id>.png` when present and fall back to a drawn
  placeholder, so the town upgrades **one building at a time** as art lands
- ⚠ **Blocked on art.** Buildings drawn from primitives read as programmer art
  and always will. `docs/art-brief.md` has the spec and the ten prompts;
  `npm run art` generates them all once an OpenAI **API** key is in `.env.local`
  (a ChatGPT Plus subscription is a different product and does not work)

### Phase 1.6 · Security posture ✅
- `security.md` written: threat model, standing two-pass rule (attacker pass,
  then defender pass), attack log
- Established the ordering rule: **server migration before payments**

---

## PRESENT — in progress

### Phase 2 · City-builder design
- `game-design.md` written: currencies, buildings, cats as workers with
  Stamina and Happiness, Cat Hall gating, Builder Cats, Catdex, fusion
- Research grounded in Clash of Clans (builder bottleneck), Frozen City
  (idle city-builder pacing and its failure mode), Hay Day (storage caps)

**Open items blocking the build:**
- [ ] Curate **60–150 cats** for the Catdex (25 today) — needs art sourcing
- [ ] Snapshot NFT rarity → in-game tier mapping, then **freeze it**
- [ ] Decide season length (plushie tiers are settled: top 3, two colours)
- [ ] Calibrate the grace period against the ranking formula
      (`monetization.md` §4) — how much abundance, over how many days

---

## FUTURE — planned, in order

Each phase is gated by the one before it. The ordering is not negotiable:
phase 3 exists because everything after it is worthless without it.

### Phase 3 · Server-authoritative core 🔒 **the gate** — *substantially built*
Nothing of value can be attached before this lands. Most of it now has:
wallet sign-in with a pinned domain, httpOnly hashed sessions, server-owned
town state behind an intent API, an optimistic version guard, server-side gacha
with commit-reveal, RLS forced and the anon key revoked on every table, and
rate limiting that increments in one statement. What is NOT done: the full
intent surface (five intents are server-side, the rest still run in the
browser), and payments have not started.

- Supabase Postgres, **RLS default-deny on every table**, zero client writes
- All state server-side: balances, production, timers, rolls
- `/collect` computes from the server's own clock and `last_collected_at`
- Gacha rolls server-side with a CSPRNG; pity counters server-side
- Wallet sign-in: single-use nonce, domain-bound signature, httpOnly cookie
- Schema validation, rate limits, idempotency keys on every mutating endpoint
- **Deliverable:** the current prototype's loop, uncheatable

### Phase 4 · City builder v1
- Buildings, construction and upgrade timers, Builder Cats
- Currencies (staged by Cat Hall level), Storehouse caps
- Cat assignment, Stamina, Nap House beds, Happiness
- Catdex with sets and completion bonuses
- Fusion and the burn
- **Deliverable:** a real management game, still free, still no payments

### Phase 5 · The living town — *mostly done, see PAST*
Remaining: build sites and scaffolding, resources flying to the HUD counters,
and the real building art (see the blocker below).

### Phase 5.5 · Storefront
- Starter pack, Golden Fish packs, VIP ladder, Golden Adoption Center + tickets,
  monthly pass, season pass, resource top-up, cosmetics
- Full product spec in `monetization.md`
- **Deliverable:** the things people actually buy

### Phase 6 · Payments
- Server-created orders, Solana Pay single-use references
- On-chain verification: finalized, correct destination, amount, reference,
  UNIQUE on tx signature for replay protection
- **Dedicated shop wallet**, public key only on the server, never mixed with
  the token's fee wallets
- Golden Fish, timer skips, Builder Cat 3+, cosmetics
- **Deliverable:** revenue

### Phase 7 · Season, board and rewards
- Time-weighted hold snapshots at random times
- Proportional payouts from the `treats` fee bucket
- Funding-graph clustering (Helius) for sybil clusters
- Top 3 → plushies: 1st takes the pool share **and both** (pink + black),
  2nd the black, 3rd the pink. Deduped by shipping address
- **Deliverable:** the loop that feeds volume back to the coin

### Phase 8 · Telegram Mini App
- Same build in a webview; second auth provider linked to one account
- Telegram Stars as the second payment rail
- **Deliverable:** distribution

### Phase 9 · Events and characters
- Bell Tower, **Palis raids** on a schedule, **Icy** rescues
- Rotating gacha banners
- **Deliverable:** the reason to come back at a specific hour

### Phase 10 · The Care House and mutirões
Gated on phase 3 like everything else — a building whose level is authoritative
about a real-world fact cannot live in client state.

- **Care House**: in every town, un-buyable and un-rushable, levels up only when
  a real delivery goes out
- **Mutirões**: seasonal community goals written in items, with a participation
  badge that is never sold
- Delivery card carrying the season's player names into the real photos
- **Deliverable:** the donation stops being a banner and becomes part of the town

---

## Decisions already locked

Do not relitigate these without a reason:

- Tubby Cares is 20% of creator fees, taken out of the art fund's old 30.
  Fees only, never a token allocation. Goods only, never cash.
- Nothing anyone plays or buys ever changes the donation amount.
- No PvP with wagering. Not building it.
- Gacha is pay-to-win with **fully published odds**. Never changed silently.
- Never any investment language. Cosmetics stay cosmetic.
- No permadeath for cats.
- Rarity mapping is frozen once set; never re-ranked.
- The city always progresses on effort; the gacha only accelerates.
- Server migration before payment code.
- Game lives in the same repo and the same Vercel deploy as the site.
- Rewards out never exceed fees in. Shop revenue is profit, never a reward pool.
- No fixed payout promises; launch rewards are scarcity, not cash.
- VIP and cosmetics never buy leaderboard position.
- Nothing is transferable between accounts. No trading, no gifting.
- ~~Ship at `tubbycatscoin.com/tubbytown`~~ — it shipped at `/game`, which is
  where every link on the site and in the nav now points. Changing it would
  break those for a cosmetic gain; `/tubbytown` can redirect to `/game` if the
  name is still wanted. Register a Tubby Town domain defensively regardless.
