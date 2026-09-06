# Tubby Town & $TUBBY — roadmap

Past, present and future in one place. **Keep this file current** — when a
phase moves, update it in the same commit as the work. It is the file a new
session (or a new machine) reads first.

Last updated: 2026-09-06

Related: `tubby-town.md` (overview) · `game-design.md` (the design) ·
`monetization.md` (revenue, VIP, rewards, ranking) · `security.md` (threat model)

---

## Where things stand

| | |
|---|---|
| **Coin** | Not launched. `live: false`, CA is `TBA` in `lib/config.js` |
| **Site** | Live at tubbycatscoin.com (Vercel, deploys from `main`) |
| **Game** | Prototype at `/game`, browser-only, on branch `feat/tubby-town-prototype` |
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
- [ ] Decide season length and plushie count per season
- [ ] Calibrate the grace period against the ranking formula
      (`monetization.md` §4) — how much abundance, over how many days
- [ ] Name the buildings for real (working names in `game-design.md` §3)

---

## FUTURE — planned, in order

Each phase is gated by the one before it. The ordering is not negotiable:
phase 3 exists because everything after it is worthless without it.

### Phase 3 · Server-authoritative core 🔒 **the gate**
Nothing of value can be attached before this lands.

- Supabase Postgres, **RLS default-deny on every table**, zero client writes
- All state server-side: balances, production, timers, rolls
- `/collect` computes from the server's own clock and `last_collected_at`
- Gacha rolls server-side with a CSPRNG; pity counters server-side
- Wallet sign-in: single-use nonce, domain-bound signature, httpOnly cookie
- Schema validation, rate limits, idempotency keys on every mutating endpoint
- **Deliverable:** the current prototype's loop, uncheatable

### Phase 4 · City builder v1
- Buildings, construction and upgrade timers, Builder Cats
- Currencies (staged by Cat Hall level), Pantry caps
- Cat assignment, Stamina, Nap House beds, Happiness
- Catdex with sets and completion bonuses
- Fusion and the burn
- **Deliverable:** a real management game, still free, still no payments

### Phase 5 · The living town
- PixiJS canvas layer under the React UI
- Cats walking between buildings, per-state animation, resources flying to HUD
- Build sites, scaffolding, completion effects, ambient life
- Interim: portrait + squash-bob + shadow. Later: real sprite sheets (Palis)
- **Deliverable:** the thing people screenshot

### Phase 5.5 · Storefront
- Starter pack, Golden Fish packs, VIP ladder, Golden Litter Box + tickets,
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
- Top 10 → the ultra-rare collectible plushie, deduped by shipping address
- **Deliverable:** the loop that feeds volume back to the coin

### Phase 8 · Telegram Mini App
- Same build in a webview; second auth provider linked to one account
- Telegram Stars as the second payment rail
- **Deliverable:** distribution

### Phase 9 · Events and characters
- Bell Tower, **Palis raids** on a schedule, **Icy** rescues
- Rotating gacha banners
- **Deliverable:** the reason to come back at a specific hour

---

## Decisions already locked

Do not relitigate these without a reason:

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
- Ship at `tubbycatscoin.com/tubbytown`; register a Tubby Town domain
  defensively and redirect for now.
