# Launch readiness — every stitch, and whether it has a knot

> Measured on 2026-09-09, four to five days out. Governed by **the three rules**
> in `roadmap.md`: profit, nothing hackable, healthy ecosystem — in that order.

Nothing in this file is a feeling. Every "knotted" line is something a script
proves or a browser was made to show; every "loose" line names the exact file
or number that is missing. Run the checks yourself:

```bash
npm run check:all     # server-safe, deadlocks, the Alley curve, layout, RLS, build
npm run check:api     # 27 attacks against a running server (needs npm run dev)
npm run project       # the three wallets, thirty days, on the real economy
```

---

## The one thing that decides the launch shape

**The game is still a browser game.** There are **34** `setSave` call sites in
`app/game/page.jsx` — thirty-four rules the client enforces — and the server
knows **5** intents:

```
sync · start_upgrade · assign · unassign · collect_alley
```

Everything else — the gacha, the battle, research, training, quests, furniture,
the boosts — is computed and stored in `localStorage`.

That is **fine**, and it is only fine because of the second thing:

**No money exists anywhere in the product.** `mockBuy` grants items for free.
There is no destination wallet, no Solana Pay, no on-chain verification, no
season payout. Nothing charges and nothing pays.

> **So the safe launch is: ship the game, ship no money.** A player who edits
> their localStorage cheats themselves and nobody else. The moment a purchase
> or a $TUBBY payout is switched on, that stops being true — and switching
> either on before the remaining twenty-nine mutations are server-side is
> selling something the buyer can mint for free (`security.md` §0).

---

## Rule 1 — profit

| | State |
|---|---|
| A shop that charges | **Loose.** `mockBuy` is free. No payment path exists. |
| Fee wallets published | **Loose — and it is a launch blocker.** `lib/config.js` still holds `{{WALLET_CARE}}`, `{{WALLET_OPS}}`, `{{WALLET_TREATS}}`, `{{WALLET_BITE}}`, `{{WALLET_ART}}`. |
| The placeholders reaching the public page | **Knotted.** `/tokenomics` refuses to print a `{{...}}` value (commit `ac71f5d` — it was about to). |
| Live on-chain data | **Loose.** `liveData.rpcUrl` and `careWallet` are empty; the site runs in demo mode on `demoFundedSol`. |
| The commercial plan | **Knotted.** `token-economy.md` — the arithmetic, the hold engine, the re-priced ladder, the Dividend/Cup split. |

**What has to be true on launch day:** the five wallet addresses are real, the
RPC url is set, and `live` is flipped. Until then the receipts section is a
demo, and a receipts section that is a demo is the fastest way to lose the
trust the whole project runs on.

---

## Rule 2 — nothing hackable

| | State |
|---|---|
| RLS on every table | **Knotted.** `check:rls` attacks all 18 tables with the public key: reads nothing, writes nothing. |
| `service_role` server-only | **Knotted.** `lib/server/db.js` refuses to start if it finds the key in any `NEXT_PUBLIC_` variable. |
| Session security | **Knotted.** httpOnly + SameSite cookie, token stored hashed, revocable. Proved by `check:api`. |
| Wallet identity | **Knotted.** ed25519 over a domain-bound, single-use nonce. Replay, impostor and expiry all tested. |
| The server owns the clock | **Knotted for the 5 intents.** No endpoint takes an `elapsed`. |
| The server owns the rules | **Loose for 29 of 34.** See above. |
| The gacha | **Loose.** Rolled in the browser. `gacha_seeds`/`gacha_rolls` exist in the database and nothing writes to them. |
| Payments | **Not built.** Which is why nothing is at risk. |
| Rate limiting | **Knotted.** Per account, in the database, so it survives a cold start. |
| Idempotency | **Knotted.** Constraint, not an `if`. A retry replays; a key reused for another intent is a 409. |
| Headers | **Knotted.** CSP, HSTS, nosniff, frame-ancestors none, Referrer-Policy, Permissions-Policy. |

**The honest summary:** the *foundation* is sound and tested. The *game* is not
on it yet. Both statements are true at once and neither cancels the other.

---

## Rule 3 — a healthy ecosystem in a year

| | State |
|---|---|
| The ladder cannot deadlock | **Knotted.** `check:progress`. Four soft-locks were found this way and fixed — every one of them made the game literally unwinnable. |
| The Alley has a real curve | **Knotted.** `check:alley` fails if a day-one roster cannot clear 3 stages or a maxed one clears everything. Day one clears 8; a maxed roster stops at 354. |
| Three wallets diverge sensibly | **Knotted, and it says something uncomfortable.** `npm run project`: the $10 player finishes ahead of the $150 one, because the spender runs out of *materials*, not time. The resource top-up is not optional. |
| Pacing tuned against real players | **Deliberately loose.** `balance-notes.md` records what Rafa suspects and why it is not being acted on until testers have played. |

---

## Blockers, in order

Everything below has to be true before the domain is announced.

1. **Fill the five fee wallets** in `lib/config.js`. The receipts section is the
   trust artefact; publishing a demo one costs more than launching a day late.
2. **Set `liveData.rpcUrl` and `careWallet`**, flip `live`. Same reason.
3. **Decide the token contract address** and put it where the site reads it.
4. **Confirm the shop stays mocked.** If any product is switched on, stop and
   build the payment path first — `security.md` §3, and the ordering rule is
   not negotiable.
5. **Run `check:all` and `check:api` on the deployed build**, not on localhost.
   Two production incidents in one week (`8d70e3d`, `baff38e`) were both
   policies that read correctly in the header and were wrong in the browser.

## Not blockers — the week after

- Port the remaining 29 mutations to intents. Gacha first: it is the one people
  actually try to cheat, and it is the one with a database table already
  waiting for it.
- Hold tiers read on-chain. Step 1 of `token-economy.md`, and worth more than
  the whole shop.
- The Kingshot line-by-line audit Rafa asked for. Partly done and recorded in
  the commits; not yet written down as one document.

---

## What broke in production this week, and what it taught

Both were mine, both looked correct in every place except a browser.

| | |
|---|---|
| `8d70e3d` | A CSP nonce plus `strict-dynamic` blocked **every script** on the live site. The HTML still rendered and still returned 200, so nothing that checks for a 200 noticed. Next reads the nonce off the request's own CSP header, not the `x-nonce` I set, and `strict-dynamic` switches `'self'` off. |
| `baff38e` | PixiJS 8 compiles shaders with `new Function()`, which the production CSP refuses. The town rendered on every machine it was built on and none it was served to. Fixed with `pixi.js/unsafe-eval`, Pixi's own CSP-safe path — not by weakening the policy. |

**The rule that comes out of both:** a security header is not verified by
reading it. Build for production, serve it, and open it.
