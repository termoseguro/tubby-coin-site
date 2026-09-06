# Tubby Town — design & decisions

Living record of what was decided and why. Update it when a decision changes;
a future session (or a new machine) should be able to read only this file and
continue without losing context.

Status: **playable prototype** at `/game`. Nothing charges money, nothing is
secure, no real rewards are attached yet.

---

## 1. What this is

A browser idle/collection game attached to the $TUBBY coin site, in the spirit
of what CrimeOnChain is to CrimeCoin.

The important lesson from that reference: **the game is not the product.** The
product is the pump.fun creator-fee engine. The game exists to give people a
reason to come back daily and to justify who receives what. The loop is:

> play → rank on the leaderboard → receive from the fee pool → tell people →
> more volume → more fees

Our fee split already reserves the budget for this: `treats: 25` in
`lib/config.js` is the community-rewards bucket.

**Advantage we have that CrimeOnChain did not:** the coin is not launched yet.
The game (or at least wallet pre-registration) can be part of the launch
narrative rather than bolted on afterwards.

---

## 2. Decisions taken

| Decision | Call |
|---|---|
| Core genre | Idle / tycoon — cats produce treats over real time |
| Second layer | Gacha collection using the CC0 tubby art |
| Third layer | $TUBBY hold acts as a production multiplier |
| Clicker | Later, as viral top-of-funnel only — never the core |
| PvP with wagering | **Rejected.** Not building it |
| Gacha model | Pay-to-win, with every drop rate published openly |
| Also sold | Skins, time-skips, extra slots |
| Language | Never "investment", "yield", "returns" |
| Top-rank prize | The ultra-rare collectible plushie, physically shipped |
| Platform | Site first, Telegram Mini App wrapping the same build |
| Domain | Ship at `tubbycatscoin.com/tubbytown`; register a Tubby Town domain defensively and redirect it for now |
| Repo | Single project, single Vercel deploy — the game lives inside the site |

### Why site-first with Telegram as a wrapper

A Telegram Mini App is a webview of the same site, so it is one build. Two real
constraints shaped the architecture:

1. **Identity differs.** Site = Solana wallet. Telegram = telegram user id. The
   account model must be born with two linkable auth providers on one account.
   Cheap if planned, painful if retrofitted.
2. **Telegram requires Stars** for digital-goods sales inside a Mini App, so the
   shop needs two payment rails.

---

## 3. Anti-sybil design (non-negotiable)

Bot detection is a losing game. The defense is **economic**, not technical.

1. **No flat per-wallet reward. Ever.** No daily-login SOL, no free pull for
   signing up, no per-address airdrop. Flat rewards are exactly what farms
   attack. Anything free is soft currency (treats) that cannot cash out.
2. **Everything that pays out is proportional** to time-weighted hold × play
   score. Splitting capital across N wallets splits the payout N ways — the
   farmer earns the same and pays N× the gas. Sybil becomes pointless rather
   than merely difficult. (The Board tab has a live simulator demonstrating
   this against a naive flat-bonus rule.)
3. **Eligibility = minimum hold, sampled at random times**, never at payout
   time. Kills buying 5 minutes before the snapshot.
4. **Idle is inherently bot-resistant** — a bot cannot compress wall-clock
   time. This is a core reason the genre is idle and not clicker.
5. **Physical prizes dedupe themselves.** One plushie per shipping address.
6. **Funding-graph clustering** (via Helius) catches the wallets that were all
   funded from one source — this is how sybil is actually caught in practice.
7. **Server-authoritative state.** The client never computes anything worth
   money.

**The strategic point:** profit comes from selling gacha pulls, not from the
payout pool. Sybil attacks the *outflow*. Keeping cash outflow small and prizes
physical/scarce means a farmer would have to *spend* to farm — which is fine.

---

## 4. Current implementation

```
lib/gameConfig.js   all tuning: rates, odds, prices, curves, hold tiers
app/game/page.jsx   the whole prototype (client component)
app/game/game.css   styling, reuses site brand tokens
app/game/layout.jsx metadata + noindex while it is a test page
```

Economy as tuned today:

- Level-1 Common produces 0.5 treats/sec; each rarity multiplies (1 / 3 / 9 /
  30 / 100), each level adds +30%.
- Drop rates: Common 60%, Rare 25%, Epic 10%, Legendary 4%, Mythic 1%.
- Pity: hard guarantee of Legendary+ every 50 pulls; every 10× contains an
  Epic+ floor. Duplicates convert to shards that level an owned cat.
- The bowl caps offline earnings (starts 2h, up to 24h). This is the main
  return-to-app hook and the main thing players pay to skip.
- Hold tiers multiply production 1.0× → 2.25×, deliberately sub-linear and
  capped so free players still populate the board.

### Gotchas

- **The root CSS class is `ttown`, not `tt`.** `globals.css` already defines
  `.tt` for the scrolling hero ticker (`inline-block` + `uppercase`). Using
  `tt` collapses the game layout to half width and uppercases everything.
- The 25 CC0 art files in `public/art` are partitioned into rarity pools
  deterministically, so a given picture is always the same rarity.

---

## 5. Before any real value is attached

The prototype runs entirely in the browser on `localStorage`. That is fine for
tuning numbers and wrong the moment money is involved. Required before then:

- [ ] Move production, gacha rolls and balances server-side (authoritative)
- [ ] Real Solana wallet sign-in (sign a message; wallet = account id)
- [ ] Persist accounts in a real database
- [ ] Read the true $TUBBY balance over RPC instead of the simulated tier
- [ ] Implement the random-time hold snapshots
- [ ] Wire real payments (SOL on web, Stars on Telegram)
- [ ] Funding-graph clustering + per-account rate limits
- [ ] Remove `noindex` from `app/game/layout.jsx` when it goes public

---

## 6. Open questions

- Which Tubby Town domain to register (`.xyz`, `playtubbytown.com`, `.fun` —
  the plain `.com` is likely taken).
- Season length for the leaderboard, and how many plushies per season
  (currently modelled as top 10).
- Whether the game launches with the coin or after it.
