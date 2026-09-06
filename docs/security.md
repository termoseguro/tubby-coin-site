# Tubby Town — threat model & security rules

**Standing rule for this project:** every feature that touches state, currency
or rewards gets two passes before it ships.

1. **Attacker pass** — play a malicious player. Write down, concretely, how to
   break it: fake a reward, skip time, pay less, pay once and claim twice,
   claim someone else's item, replay a request.
2. **Defender pass** — close each one, and add a test that proves the attack
   now fails.

Every attack found goes in section 6 with its status. Nothing gets closed by
"we'll remember" — it gets closed by a constraint, a check, or a test.

---

## 0. Current state (be honest about it)

The prototype at `/game` is **fully cheatable by design**. All state lives in
`localStorage`; the browser computes production, rolls the gacha and holds the
balance. A player can set any value from DevTools in seconds.

That is fine while nothing is at stake, and unacceptable the moment it is.

> **Ordering rule:** the server-authoritative migration happens **before** any
> payment code. Taking money on top of a cheatable state machine means selling
> something the buyer can already mint for free.

---

## 1. The one principle everything derives from

> **The client is a renderer, not a source of truth. The server never accepts a
> number from the client — only an intent.**

| Wrong | Right |
|---|---|
| `POST /api/treats {amount: 50000}` | `POST /api/collect` — server computes it |
| `POST /api/pull {result: "mythic"}` | `POST /api/pull` — server rolls it |
| `POST /api/buy {paid: true}` | server verifies the transaction on-chain |
| client sends `elapsedSeconds` | server reads its own `last_collected_at` |

If an endpoint accepts a value that decides how much a player gets, it is
already broken.

---

## 2. Supabase — where projects actually die

The `anon` key ships **inside the browser bundle**. It is public. Assume the
attacker has it and is talking to your Supabase REST endpoint directly with
`curl`, never touching your site.

Non-negotiable:

- **RLS ON for every table.** No exceptions, default deny. A table without RLS
  is a public read/write API.
- **Zero client-side writes to game tables.** Ever. The browser gets `SELECT`
  on its own rows at most (`auth.uid() = user_id`), and usually not even that —
  read through the server too.
- **`service_role` key only on the server**, in Vercel env vars. It bypasses
  RLS entirely; if it leaks, everything is gone.
- **Nothing secret is ever prefixed `NEXT_PUBLIC_`.** That prefix means "ship
  this to every visitor".
- All mutations go through Next.js Route Handlers / Server Actions, or Postgres
  functions marked `SECURITY DEFINER` so they run atomically.
- Currency is **integers** (treats as `bigint`, SOL as **lamports**). Never
  floats — float arithmetic is a rounding-exploit surface.

---

## 3. Payments — how the shop actually works

### The flow

1. **Client asks the server to create an order.** Client sends only the item id
   — never the price.
2. **Server creates the order** and returns: order id, exact amount in
   lamports, destination wallet, a single-use **reference** public key, and a
   short expiry (SOL price moves — lock it for ~5 minutes).
3. **Client builds the transfer**, including the reference as a non-signer
   account (this is the Solana Pay pattern), and the wallet signs and sends it.
4. **Server verifies on-chain**, independently. It can find the transaction by
   `getSignaturesForAddress(reference)` — it does not need to trust anything
   the client says.
5. **Server grants the item** and marks the order fulfilled, in one atomic
   transaction.

### What the server must verify before granting anything

- the transaction exists and is **finalized** (not merely "confirmed")
- destination is **our** wallet
- amount is **≥ the exact quoted lamports**
- the **reference matches** the one generated for *this* order and *this* user
- the **signature has never been used** — enforced by a UNIQUE constraint on the
  transaction signature, not by an `if` statement
- the order is still `pending` and not expired

### Fulfilment must be atomic

```sql
UPDATE orders SET status = 'fulfilled', tx_sig = $1
WHERE id = $2 AND status = 'pending'
```

Then check rows-affected. If it is 0, someone already fulfilled it — grant
nothing. Two concurrent verify calls must never both succeed.

### Telegram

Digital goods inside a Mini App must go through **Telegram Stars**, not crypto.
Same rule applies: the grant happens on the **webhook**, after verifying the
webhook signature — never on the client saying "payment succeeded".

---

## 4. Attacks by category, and the defence

### "Acelerar tempo" — the idle exploit

| Attack | Defence |
|---|---|
| Change the device clock | Server uses **its own** clock. Client timestamps are never read. |
| Spam `/collect` | Grant = `server_rate × (now − last_collected_at)`, then set `last_collected_at = now`. Extra calls yield ~0. |
| Send a fake `elapsed` | The endpoint takes no elapsed parameter at all. |
| Replay a collect response | Grants are computed and written server-side; the response is a receipt, not an instruction. |
| Exceed the bowl | Cap is applied server-side from the server's record of the bowl size. |

### Gacha — "burlar recompensa"

- The roll happens **on the server**, with a CSPRNG. Publishing the odds is
  transparency; letting the client compute the result is suicide.
- The roll is written to the DB **in the same transaction that spends the
  currency**. Disconnecting after seeing a bad result must not undo it.
- **Provable fairness** (recommended): commit–reveal. Server publishes
  `hash(serverSeed)` up front; result = `HMAC(serverSeed, clientSeed:nonce)`;
  serverSeed is revealed when the seed rotates so anyone can verify every past
  roll. This protects *us* too — it is the only way to prove to an angry whale
  that the box was not rigged.
- Pity counters live server-side. A client-side pity counter is free Legendaries.

### Ownership and identity

| Attack | Defence |
|---|---|
| **IDOR** — level up a cat belonging to another player | Every query scoped by the session's user id. Never trust an id from the body alone. |
| Forge a session | httpOnly + Secure + SameSite cookie. **Never** the session token in `localStorage` — XSS reads it. |
| Replay a login signature | Nonce is single-use, short-TTL, bound to the wallet, burned on use. |
| Phish a signature from another site | Signed message includes the **domain** and is checked server-side (SIWS pattern). |

### Input handling

- Validate every payload with a schema (zod). Integers only, explicit bounds.
- `{qty: -10}` must be rejected, not multiplied.
- Never spread client JSON into a DB update (mass assignment).
- **Idempotency key** on every mutating request.
- Rate limit per account *and* per IP on every mutating endpoint.

---

## 4b. City-builder attack surface

The city builder (`game-design.md`) turns **timers into the product**. Every
timer is something we sell a skip for, which makes every timer an attack
target. New surface, and the defence for each:

| Attack | Defence |
|---|---|
| Client claims a build finished | `finishes_at` is a **server** timestamp. Completion is server-computed; the client only asks "is it done?" |
| Instant-finish without paying | Skip is a purchase like any other — verified on-chain / via Stars webhook **before** the state changes |
| **Start → cancel → refund loop** to farm resources | Cancel refunds **at most** what was actually spent, is idempotent, and is recorded. Never refund more than the ledger says was deducted |
| Start more builds than you have builders | Builder availability checked server-side inside the same transaction that starts the build |
| Upgrade past what the Cat Hall allows | Every upgrade validates the full precondition set server-side: ownership, Cat Hall level, resources, free builder, not already upgrading |
| Collect more than the Pantry cap | Cap applied server-side at collection time, from the server's record of Pantry level |
| Double-collect via concurrent requests | Conditional `UPDATE … WHERE last_collected_at = $expected`; check rows-affected |
| Assign a cat you do not own (IDOR) | Every cat/building id scoped to the session user |
| Fuse cats you do not own, or fuse the same cat twice | Consume-and-create in **one transaction**; the fusion result is rolled server-side |
| Stamina never drains / infinite work | Stamina is derived server-side from worked time, never sent by the client |
| Replay a "nap finished" call | Nap completion derived from server timestamps, not client events |

**The general rule for this whole phase:** a timer the client can influence is
a timer we are giving away for free. The client may *display* a countdown; it
may never *decide* one.

## 5. Anti-sybil

Covered in `tubby-town.md` section 3 — it is an **economic** design, not a
detection problem, and it is deliberately not restated here so the two do not
drift apart. Summary: no flat per-wallet rewards, payouts proportional to
time-weighted hold, random-time snapshots, physical prizes deduped by shipping
address.

---

## 6. Attack log

Status of every attack considered. `open` items block the related feature.

| # | Attack | Status | Note |
|---|---|---|---|
| 1 | Edit balance in localStorage | **open** | Prototype only; closed by the server migration |
| 2 | Client rolls its own gacha | **open** | Same |
| 3 | Device clock manipulation | planned | Server clock only |
| 4 | Replay a payment signature | planned | UNIQUE on tx signature |
| 5 | Double-fulfil an order | planned | Conditional UPDATE + rows-affected |
| 6 | Pay less than quoted | planned | Verify lamports ≥ quote |
| 7 | Claim another player's payment | planned | Single-use reference bound to order + user |
| 8 | Supabase anon-key direct writes | planned | RLS default-deny, no client writes |
| 9 | IDOR on cat/slot ids | planned | Scope every query by session user |
| 10 | Login signature replay | planned | Single-use nonce + domain binding |
| 11 | Negative quantities | planned | Schema validation, unsigned ints |
| 12 | Session theft via XSS | planned | httpOnly cookie, never localStorage |
| 13 | Client declares a build finished | planned | Server-owned `finishes_at` |
| 14 | Build start→cancel refund farm | planned | Refund ≤ ledger, idempotent |
| 15 | More builds than builders | planned | Checked in the same transaction |
| 16 | Collect past the Pantry cap | planned | Cap applied server-side |
| 17 | Double-collect race | planned | Conditional UPDATE + rows-affected |
| 18 | Fuse cats not owned / double-fuse | planned | Consume+create in one transaction |
| 19 | Stamina never drains | planned | Derived server-side from worked time |

---

## 7. Pre-launch checklist

- [ ] No `NEXT_PUBLIC_` variable holds anything secret
- [ ] RLS enabled and default-deny on every table
- [ ] No client-side write path to any game table
- [ ] Every mutating endpoint: authenticated, schema-validated, rate-limited,
      idempotent
- [ ] Currency stored as integers everywhere
- [ ] Payment verification reads the chain, never the client
- [ ] UNIQUE constraint on payment transaction signatures
- [ ] Session cookies httpOnly + Secure + SameSite
- [ ] A test exists for every attack marked closed in section 6
