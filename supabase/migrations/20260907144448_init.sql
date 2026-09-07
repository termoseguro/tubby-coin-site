-- ============================================================================
--  TUBBY TOWN — the database
--
--  Runnable as-is: paste the whole file into the Supabase SQL editor. It is
--  idempotent, so running it twice is safe.
--
--  Read docs/backend-setup.md first. The short version of why this file looks
--  the way it does:
--
--  THE SUPABASE `anon` KEY SHIPS INSIDE THE BROWSER BUNDLE. It is public.
--  Assume an attacker has it and is talking to the REST endpoint with curl,
--  never touching the site. Therefore:
--
--    · Row Level Security is ON for every table, with NO policies by default.
--      RLS on with no policy means "deny everything", which is exactly right:
--      the browser gets nothing unless a policy deliberately grants it, and
--      almost nothing is deliberately granted.
--    · The browser NEVER writes to a game table. Not once. Every mutation goes
--      through a Next.js route handler holding the service_role key, or a
--      SECURITY DEFINER function that runs atomically.
--    · Money is integers. Lamports and token base units, never floats — float
--      arithmetic is a rounding-exploit surface, and 0.1 + 0.2 is not 0.3.
--
--  See docs/security.md §1 and §2.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
--  1. PLAYERS AND WALLETS
-- ============================================================================

create table if not exists players (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique,
  created_at    timestamptz not null default now(),
  -- Set by a human, never by code. A banned player keeps their row so the
  -- evidence survives; deleting cheaters destroys the audit trail.
  banned_at     timestamptz,
  ban_reason    text
);

-- A wallet address typed into a form proves NOTHING — anyone can type a whale's
-- address. Ownership is proved by SIGNING a nonce we issued (Sign-In With
-- Solana), and only then does the row appear here. See docs/backend-setup.md §4.
create table if not exists wallets (
  address       text primary key,                        -- base58 pubkey
  player_id     uuid not null references players(id) on delete cascade,
  proved_at     timestamptz not null default now(),
  -- One wallet, one player, forever. Re-proving to a different account is how
  -- a sybil farm would launder one whale's balance across many towns.
  unique (address)
);
create index if not exists wallets_player on wallets(player_id);
-- One player may hold several wallets, but the ranking counts only the first,
-- for the same reason. Enforced in code AND here.
create unique index if not exists wallets_one_per_player on wallets(player_id);

-- Single-use nonces for the signature challenge. Short-lived and deleted on use.
create table if not exists wallet_nonces (
  nonce         text primary key,
  player_id     uuid not null references players(id) on delete cascade,
  address       text not null,
  created_at    timestamptz not null default now(),
  used_at       timestamptz
);

-- ============================================================================
--  2. THE TOWN — server-owned state
--
--  The whole save lives here as one jsonb document, and the SERVER owns every
--  clock in it. The client may render this; it may never write it.
--
--  `last_tick_at` is the anchor for all idle production. The client is never
--  asked how much time has passed, because "elapsedSeconds: 999999" is the
--  first thing an attacker sends. The server reads its own column.
-- ============================================================================

create table if not exists towns (
  player_id     uuid primary key references players(id) on delete cascade,
  -- The save document. Shape is lib/townEconomy.js's world: res, buildings,
  -- furniture, cats, assign, jobs, raidStage...
  state         jsonb not null default '{}'::jsonb,
  -- Server clocks. Never accepted from the client.
  last_tick_at  timestamptz not null default now(),
  last_raid_at  timestamptz not null default now(),
  -- Monotonic. Every applied intent bumps it; a stale version loses.
  version       bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Append-only. Every intent the server accepted, with what it cost and what it
-- granted. This is the only thing that makes cheating detectable after the
-- fact — a balance is a number, a ledger is evidence.
create table if not exists town_events (
  id            bigserial primary key,
  player_id     uuid not null references players(id) on delete cascade,
  at            timestamptz not null default now(),
  intent        text not null,                 -- 'upgrade', 'pull', 'raid'...
  payload       jsonb not null default '{}'::jsonb,
  -- What the SERVER decided, not what the client asked for.
  result        jsonb not null default '{}'::jsonb,
  -- Client-supplied key, so a retried request cannot double-apply. See §5.
  idempotency_key text
);
create index if not exists town_events_player_at on town_events(player_id, at desc);
-- A replayed request is the cheapest attack there is: send the same "collect"
-- twenty times from twenty tabs. The unique index makes the second one a
-- database error rather than a second payout.
create unique index if not exists town_events_idem
  on town_events(player_id, idempotency_key)
  where idempotency_key is not null;

-- ============================================================================
--  3. THE SHOP
--
--  Prices live HERE, never in the request. A client that can name its own price
--  will. See docs/security.md §3.
-- ============================================================================

create table if not exists shop_items (
  id            text primary key,              -- 'builder_2', 'slot_kitchen_1'
  name          text not null,
  usd_cents     integer not null check (usd_cents > 0),
  -- $TUBBY buyers pay less; the discount is what routes volume through the
  -- token. Stored, not computed client-side.
  tubby_discount_bp integer not null default 2500 check (tubby_discount_bp between 0 and 9000),
  active        boolean not null default true
);

create type order_status as enum ('pending', 'paid', 'fulfilled', 'expired', 'failed');

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references players(id) on delete cascade,
  item_id       text not null references shop_items(id),
  -- Quoted at creation and FROZEN. SOL moves; the player pays what they were
  -- shown, and the server compares against this, never against a live price.
  amount_lamports bigint check (amount_lamports > 0),
  amount_tubby  bigint check (amount_tubby > 0),
  currency      text not null check (currency in ('SOL', 'TUBBY')),
  destination   text not null,                 -- our receiving wallet
  -- Solana Pay: a single-use pubkey included as a non-signer account, which
  -- lets the server FIND the transaction on-chain without trusting the client
  -- to tell it the signature.
  reference     text not null unique,
  status        order_status not null default 'pending',
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  fulfilled_at  timestamptz
);
create index if not exists orders_player on orders(player_id, created_at desc);
create index if not exists orders_pending on orders(status) where status = 'pending';

-- The row that makes double-spend impossible. Not an `if` statement in code —
-- a UNIQUE constraint, because two concurrent verify calls will both pass an
-- `if` and only one can win a unique index.
create table if not exists payments (
  tx_signature  text primary key,
  order_id      uuid not null references orders(id),
  player_id     uuid not null references players(id),
  amount_lamports bigint,
  amount_tubby  bigint,
  slot          bigint not null,
  verified_at   timestamptz not null default now()
);

-- ============================================================================
--  4. HOLDING, AND THE RANKING THAT CANNOT BE FARMED
--
--  The rule: reward TIME-WEIGHTED holding, never a balance at a deadline.
--
--  A snapshot taken at a published time is a snapshot people borrow for. So
--  snapshots are taken at RANDOM times the player cannot predict, several per
--  day, and the season score uses the AVERAGE — which means renting tokens for
--  an hour buys almost nothing, and a fresh wallet scores near zero no matter
--  how much it is holding today.
-- ============================================================================

create table if not exists hold_snapshots (
  id            bigserial primary key,
  player_id     uuid not null references players(id) on delete cascade,
  address       text not null,
  taken_at      timestamptz not null default now(),
  -- Base units, not a display number. Integers only.
  raw_amount    numeric(40, 0) not null default 0,
  -- USD at the moment of the snapshot, in cents. Tiers are USD-denominated so
  -- they mean the same thing at any token price.
  usd_cents     bigint not null default 0
);
create index if not exists hold_player_time on hold_snapshots(player_id, taken_at desc);

create table if not exists seasons (
  id            text primary key,              -- 's1'
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  -- Rewards are a share of creator fees, paid in $TUBBY the treasury BUYS on
  -- the open market. Recorded here so the payout is auditable.
  reward_pool_lamports bigint not null default 0
);

create table if not exists season_scores (
  season_id     text not null references seasons(id),
  player_id     uuid not null references players(id) on delete cascade,
  -- The three factors, stored separately so a suspicious score can be taken
  -- apart rather than argued about.
  town_depth    integer not null default 0,    -- sum of building levels
  hold_mult_bp  integer not null default 10000,-- capped, from the snapshot average
  collection    integer not null default 0,    -- distinct cats owned
  score         bigint not null default 0,
  computed_at   timestamptz not null default now(),
  primary key (season_id, player_id)
);
create index if not exists season_scores_rank on season_scores(season_id, score desc);

-- Physical prizes dedupe on the shipping address, because a sybil farm is
-- cheap and a plushie is not.
create table if not exists prize_claims (
  id            uuid primary key default gen_random_uuid(),
  season_id     text not null references seasons(id),
  player_id     uuid not null references players(id),
  place         integer not null,
  -- Hashed, not stored in the clear: we need to compare addresses, not read
  -- them. The plaintext lives with the fulfilment partner, not in this table.
  address_hash  text not null,
  claimed_at    timestamptz not null default now(),
  unique (season_id, address_hash)
);

-- ============================================================================
--  5. LOCK IT ALL DOWN
--
--  RLS on, zero policies. "RLS enabled with no policy" is a complete denial for
--  anon and authenticated roles, which is the correct default for every table
--  here. service_role bypasses RLS, and only the server holds that key.
--
--  If you ever add a policy, it should be a SELECT on the player's OWN row and
--  nothing else — and even that is better served by reading through the server.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'players','wallets','wallet_nonces','towns','town_events',
    'shop_items','orders','payments','hold_snapshots',
    'seasons','season_scores','prize_claims'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- ============================================================================
--  6. THE ONE THING THAT MUST BE ATOMIC
--
--  Fulfilment. Two verify calls racing must not both grant the item. This is a
--  conditional UPDATE whose WHERE clause carries the guard, so the database
--  decides the winner — not the order two requests happened to arrive in.
--
--  Call it with the service_role key. It returns true exactly once per order.
-- ============================================================================

create or replace function fulfil_order(
  p_order_id uuid,
  p_tx_signature text,
  p_slot bigint,
  p_lamports bigint
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player uuid;
  v_ok boolean := false;
begin
  -- The payment row goes in FIRST. Its primary key is the transaction
  -- signature, so a replayed signature raises here and never reaches the grant.
  select player_id into v_player from orders where id = p_order_id;
  if v_player is null then
    return false;
  end if;

  insert into payments (tx_signature, order_id, player_id, amount_lamports, slot)
  values (p_tx_signature, p_order_id, v_player, p_lamports, p_slot);

  update orders
     set status = 'fulfilled', fulfilled_at = now()
   where id = p_order_id
     and status = 'pending'
     and expires_at > now();

  get diagnostics v_ok = row_count;
  return v_ok;
exception
  when unique_violation then
    -- Signature already used. Not an error worth surfacing; just do not grant.
    return false;
end $$;

revoke all on function fulfil_order(uuid, text, bigint, bigint) from public, anon, authenticated;

-- ============================================================================
--  7. SEED — the shop's price list
--
--  Matches REAL_PRICES in lib/townEconomy.js. When those change, change these:
--  the client's copy is a display hint, and THIS is the price.
-- ============================================================================

insert into shop_items (id, name, usd_cents) values
  ('builder_2',  'Second builder',        299),
  ('builder_3',  'Third builder',        1499),
  ('builder_4',  'Fourth builder',       2999),
  ('builder_5',  'Fifth builder',        4999),
  ('slot_first', 'Villager place',        499),
  ('slot_second','Second villager place', 999)
on conflict (id) do update
  set name = excluded.name, usd_cents = excluded.usd_cents;
