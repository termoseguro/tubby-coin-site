# Backend setup — Supabase, wallets, payments

Written for someone who has never configured Supabase. Follow it top to bottom.
Nothing here is optional, and the order matters.

Companion documents: [`security.md`](security.md) is the threat model and the
reasoning; this is the procedure. The database itself lives in
[`../supabase/migrations/`](../supabase/migrations/) as migrations you apply
with the CLI (§2b).

---

## The rule, before anything else

> **The client is a renderer. The server owns every number that matters.**

Everything below is machinery for that one sentence. When a future change makes
you wonder whether something belongs on the client, the answer is: if it decides
what a player gets, no.

Two consequences worth stating plainly, because they are the ones people talk
themselves out of:

- **The game currently keeps its save in `localStorage`.** That is fine for a
  prototype with nothing of value attached, and it is *indefensible* the moment
  real money is involved — the player can open devtools and set their Gold to a
  billion. The migration in §6 is not optional before launch.
- **The `anon` key is public.** It ships inside the JavaScript bundle every
  visitor downloads. Attackers do not need to use your website; they will hit
  the Supabase REST endpoint directly with `curl`. That is why every table has
  RLS on with no policies — deny by default, and the browser is never granted a
  write.

---

## 1. Create the project

1. Go to <https://supabase.com>, sign in, **New project**.
2. Name it `tubby-town`. Pick the region closest to most players.
3. Save the database password somewhere real (a password manager). You will not
   be shown it again.
4. Wait for provisioning to finish (~2 minutes).

## 2. Run the schema

Either use the CLI (see §2b — do this, it is better) or, once, by hand:

1. In the sidebar: **SQL Editor** → **New query**.
2. Paste the contents of `supabase/migrations/*_init.sql`.
3. **Run.** It is idempotent, so running it again later is safe.
4. Sidebar → **Table Editor**. You should see twelve tables, each showing
   *RLS enabled*. If any table says RLS is disabled, stop and fix it — one
   unprotected table is a public read/write API onto your game.

## 2b. The CLI, so you never paste SQL again

Pasting into the SQL editor works once. It does not give you a history, it does
not tell you what changed, and it cannot be reviewed. The CLI turns the schema
into **migrations** — ordinary files in git that get applied in order.

The schema now lives at `supabase/migrations/*_init.sql`. To change the
database, you add a new migration file; you never edit an applied one.

### One-time setup

1. Copy `.env.local.example` to `.env.local` and fill in four values:

   | Variable | Where to find it | Secret? |
   |---|---|---|
   | `SUPABASE_PROJECT_REF` | the subdomain of your project URL | no |
   | `SUPABASE_DB_PASSWORD` | the password you set when creating the project | **yes** |
   | `SUPABASE_ACCESS_TOKEN` | <https://supabase.com/dashboard/account/tokens> | **yes** |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API | **yes** |

   `.env.local` is gitignored. Nothing in it is ever committed, and the two
   secrets should not be pasted into a chat window either — put them straight
   into the file.

2. Link the folder to the project:

   ```bash
   npm run db:link
   ```

3. Apply everything:

   ```bash
   npm run db:push
   ```

### Day to day

| Command | What it does |
|---|---|
| `npm run db:push` | applies any migration not yet applied |
| `npm run db:diff -f <name>` | writes a new migration from changes made in the dashboard |
| `npm run db:pull` | pulls the remote schema down into a migration |
| `npm run db:status` | lists the projects your token can reach |

### The guard, and why it is there

**This machine has other Supabase projects on it, and they are not ours to
break.** The CLI stores its login token *globally*, so one token reaches every
project on the account, while the link — which project this folder talks to —
lives in a gitignored file that nothing reviews. That is exactly the combination
that lets a `db push` quietly land in the wrong database.

So the allowed project is **pinned in a committed file**,
[`supabase/ALLOWED_PROJECT_REF`](../supabase/ALLOWED_PROJECT_REF), and
`scripts/db.mjs` checks it before every command. Pinning it in git rather than
in `.env.local` is the whole point: a gitignored file can change without anyone
noticing, a committed one cannot. Even with a missing or wrong `.env.local`,
this repo cannot reach another project.

Three refusals, all verified:

```
✗ This folder is not linked yet. Run: npm run db:link

✗ LINKED TO THE WRONG PROJECT.
  supabase/.temp/project-ref says: termoseguro-project-ref
  this repo is pinned to:          rkxosjkictvjgudonohu

✗ .env.local DISAGREES WITH THE PINNED PROJECT.
  supabase/ALLOWED_PROJECT_REF: rkxosjkictvjgudonohu
  .env.local:                   some-other-project
```

`npm run db:link` passes the pinned ref itself, so even linking cannot point
somewhere else. `reset`, `remote-commit` and `branches` are blocked outright:
there is no version of "drop every table on the linked remote" that deserves a
convenience wrapper.

---

## 3. Wire the keys

Supabase → **Project Settings → API**. You need two values, and they are
treated completely differently:

| Value | Where it goes | Why |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | public, fine |
| `anon` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public, fine |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **server only** |

In Vercel: **Project → Settings → Environment Variables**. Add all three.

> **The `service_role` key bypasses RLS entirely.** It can read and write every
> row in every table. It must never appear in a client component, never be
> prefixed `NEXT_PUBLIC_`, and never be logged. If it leaks, rotate it
> immediately in Project Settings → API → *Reset service role key*.

A rule that catches this before it ships: **anything prefixed `NEXT_PUBLIC_` is
being handed to every visitor on the internet.** If you would not tweet it, it
does not get that prefix.

## 4. Proving a wallet belongs to a player

**Typing an address proves nothing.** Anyone can type a whale's address and
claim their holding tier. Ownership is proved by signing.

The flow (Sign-In With Solana):

1. Client asks the server for a challenge: `POST /api/wallet/nonce` with the
   address it wants to prove.
2. Server writes a random single-use `nonce` into `wallet_nonces` and returns a
   message containing it, the domain, and a timestamp.
3. The user's wallet **signs that message**. No transaction, no fee.
4. Client sends the signature back: `POST /api/wallet/verify`.
5. Server verifies the signature against the address with `tweetnacl`, checks
   the nonce exists, is unused, and is under five minutes old, then marks it
   used and inserts into `wallets`.

Non-negotiable details:

- **The nonce is single-use and short-lived.** Otherwise a captured signature is
  a permanent key to that account.
- **The message must name your domain.** Otherwise a signature farmed by another
  site can be replayed here.
- **One wallet, one player, forever** (enforced by a unique index in the schema).
  Re-proving a wallet onto a second account is exactly how a sybil farm launders
  one whale's balance across many towns.

## 5. Payments

The full reasoning is in [`security.md` §3](security.md). The procedure:

1. **Client asks for an order**, sending only `item_id`. Never a price. A client
   that can name its own price will.
2. **Server creates the order**: looks the price up in `shop_items`, freezes it
   into `orders.amount_lamports`, generates a single-use `reference` keypair,
   sets `expires_at` about five minutes out, returns the order.
3. **Client builds the transfer** with the reference as a non-signer account
   (the Solana Pay pattern) and the wallet sends it.
4. **Server verifies on-chain, independently**: `getSignaturesForAddress(reference)`
   finds the transaction without trusting anything the client claims.
5. **Server grants**, by calling `fulfil_order()`.

Before granting, the server checks all of:

- the transaction is **finalized**, not merely "confirmed"
- destination is **our** wallet
- amount is **≥ the frozen quote**
- the reference matches **this** order and **this** player
- the signature has **never been used** — enforced by the `payments` primary
  key, not by an `if`. Two concurrent verify calls will both pass an `if`; only
  one can win a unique index.
- the order is still `pending` and not expired

`fulfil_order()` does the last two atomically and returns true exactly once.
**Check its return value.** If it is false, grant nothing.

### Telegram

Digital goods inside a Telegram Mini App must go through **Telegram Stars**, not
crypto — this is Telegram's rule, not ours. Same principle: grant on the
**webhook**, after verifying the webhook signature. Never on the client saying
"payment succeeded".

## 6. Moving the save to the server

The game's economy was written for this from the start: everything in
`lib/townEconomy.js`, `lib/townFurniture.js` and `lib/townRaids.js` is **pure**
— no React, no storage, no `Date.now()` baked into the maths. Those files run
unchanged on the server. That was the point.

The migration, in order:

1. **Move the save.** `towns.state` becomes the truth; `localStorage` becomes a
   cache for rendering, and is re-fetched on load rather than trusted.
2. **Every action becomes an intent.** `POST /api/town/act` with
   `{ intent: 'upgrade', building: 'kitchen', idempotencyKey }`. The server
   loads the state, applies production against **its own** `last_tick_at`,
   validates the intent with the same pure functions, writes the new state, and
   appends to `town_events`.
3. **The client stops computing anything that matters.** It may predict, for
   smoothness; it must re-sync from the server's answer.
4. **Idempotency keys everywhere.** A retried request must not double-apply.
   The unique index on `town_events` makes a replay a database error instead of
   a second payout.
5. **Optimistic concurrency.** Every write carries the `version` it read.
   `UPDATE ... WHERE version = $n`; zero rows affected means someone else moved
   first, so reload and retry rather than overwrite.

Until step 1 lands, **nothing of value may be attached to the game.** No real
rewards, no ranking that pays out, no tradeable items.

## 7. The ranking, and why it cannot be farmed

A ranking that pays real money is attacked by making a thousand accounts. The
defence is economic, not detective — do not try to spot bots, make bots
worthless:

- **No flat per-wallet reward.** Anything paid equally per account pays a farm
  a thousand times over.
- **Time-weighted holding, never a deadline balance.** `hold_snapshots` are
  taken at **random times** several times a day. The season score uses the
  average, so renting tokens for an hour buys almost nothing.
- **Score = town depth × capped hold multiplier × collection.** All three take
  weeks. A fresh account scores near zero no matter what it holds today, and the
  cap means a whale cannot simply buy first place either.
- **Nothing transferable.** No trading, no gifting, no market. A farm that
  cannot funnel its winnings into one account is just a lot of small accounts.
- **Physical prizes dedupe by shipping address** (hashed, in `prize_claims`).
  Sybil accounts are cheap; plushies are not.

The general principle, worth remembering when adding any reward:
**be generous with what cannot leave the account, ruthless with what can.**

## 8. Before launch

- [ ] Every table shows *RLS enabled* in the Table Editor
- [ ] No `NEXT_PUBLIC_` variable holds anything secret
- [ ] `service_role` appears in exactly one place: Vercel server env
- [ ] The save is server-owned; `localStorage` is a cache
- [ ] Every mutating endpoint takes an idempotency key
- [ ] `fulfil_order`'s return value is checked at every call site
- [ ] Payment verification requires **finalized**, not "confirmed"
- [ ] Currency is integers everywhere — lamports and base units, never floats
- [ ] A test order cannot be fulfilled twice (try it, with two parallel curls)
- [ ] A modified `localStorage` changes nothing the server reports
