-- ===========================================================================
--  SERVER AUTHORITY
--
--  The prototype computes everything in the browser. That is fine while nothing
--  is at stake and unacceptable the moment it is — see docs/security.md §0.
--  This migration adds the tables the authoritative layer needs.
--
--  THE ARCHITECTURE, stated once so nobody re-litigates it in a route handler:
--
--    The Next.js route handler is the authority. It runs the SAME pure modules
--    in lib/ that the client renders with (check:server proves they run with no
--    browser present), reads the clock from the SERVER, and writes back with an
--    optimistic-concurrency check. Postgres stores state and enforces
--    uniqueness; it does not re-implement the economy. Two copies of the rules
--    is two sets of rules that drift.
--
--  Every table here is RLS default-deny like the rest — the block at the bottom
--  of the init migration turns RLS on for everything, and there are still no
--  policies anywhere. The browser cannot touch any of it. Only the route
--  handler, holding service_role, can.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  SESSIONS — an httpOnly cookie, and a row we can revoke
--
--  The threat model is explicit: the session token never goes in localStorage,
--  because XSS reads localStorage. It goes in an httpOnly + Secure + SameSite
--  cookie, which script cannot read.
--
--  The token is stored HASHED. A stolen database dump must not be a stack of
--  working sessions — the same reason passwords are hashed, for the same
--  reason. The server hashes the cookie value on every request and looks up
--  the hash.
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  token_hash    text primary key,
  player_id     uuid not null references players(id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  -- Kept for abuse investigation, not for identification.
  user_agent    text,
  revoked_at    timestamptz
);
create index if not exists sessions_player_idx on sessions (player_id);
create index if not exists sessions_expiry_idx on sessions (expires_at);

-- ---------------------------------------------------------------------------
--  IDEMPOTENCY — the same request twice must not pay twice
--
--  Every mutating call carries a key. The first one to insert wins; a retry
--  finds the stored response and replays it instead of re-running the intent.
--  This is what makes "the network dropped, tap it again" safe, and it is the
--  same mechanism that stops a deliberate double-submit.
--
--  The uniqueness is a CONSTRAINT, not an `if`. Two concurrent requests race to
--  insert and exactly one succeeds — an `if (alreadyDone)` check loses that
--  race every time under load.
-- ---------------------------------------------------------------------------
create table if not exists idempotency_keys (
  key           text not null,
  player_id     uuid not null references players(id) on delete cascade,
  -- What was asked for, so a key reused for a DIFFERENT intent is a conflict
  -- rather than a silent replay of the wrong thing.
  intent        text not null,
  response      jsonb,
  created_at    timestamptz not null default now(),
  primary key (player_id, key)
);
create index if not exists idem_created_idx on idempotency_keys (created_at);

-- ---------------------------------------------------------------------------
--  GACHA ROLLS — provable fairness, and an audit trail
--
--  The roll happens on the server with a CSPRNG. Publishing the odds is
--  transparency; letting the client compute the result is suicide.
--
--  Commit–reveal: the server holds a secret seed and publishes its hash up
--  front. A roll is HMAC(server_seed, client_seed:nonce). When the seed
--  rotates, the seed itself is revealed, and anyone can recompute every roll
--  that was made under it. That protects US as much as the player: it is the
--  only way to answer an angry whale who says the box was rigged.
-- ---------------------------------------------------------------------------
create table if not exists gacha_seeds (
  id            uuid primary key default gen_random_uuid(),
  -- Public from the moment the seed starts being used.
  seed_hash     text not null,
  -- NULL until the seed is retired. Never served while active.
  revealed_seed text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  retired_at    timestamptz
);
create unique index if not exists gacha_one_active on gacha_seeds (active) where active;

create table if not exists gacha_rolls (
  id            bigserial primary key,
  player_id     uuid not null references players(id) on delete cascade,
  seed_id       uuid not null references gacha_seeds(id),
  -- Monotonic per player. Part of the HMAC message, so the same client seed
  -- cannot be replayed for the same result.
  nonce         bigint not null,
  client_seed   text not null,
  wheel         text not null,
  -- What came out, and what it cost. Written in the SAME transaction that
  -- spends the currency: disconnecting after a bad result must not undo it.
  result        jsonb not null,
  cost          jsonb not null,
  created_at    timestamptz not null default now(),
  unique (player_id, nonce)
);
create index if not exists gacha_rolls_player_idx on gacha_rolls (player_id, created_at desc);

-- ---------------------------------------------------------------------------
--  THE ACTION LOG — what the server actually did
--
--  Not analytics. This is the evidence: when a player says their Legendary
--  vanished, or a leaderboard result is disputed, this is what answers it.
--  Append-only by convention and by the fact that nothing is granted UPDATE.
-- ---------------------------------------------------------------------------
create table if not exists town_actions (
  id            bigserial primary key,
  player_id     uuid not null references players(id) on delete cascade,
  intent        text not null,
  -- The payload AS VALIDATED, not as received.
  args          jsonb not null default '{}'::jsonb,
  -- The town version before and after, so a gap is visible.
  from_version  bigint,
  to_version    bigint,
  ok            boolean not null,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists town_actions_player_idx on town_actions (player_id, created_at desc);

-- ---------------------------------------------------------------------------
--  RATE LIMITING — per account, in the database
--
--  In-memory counters do not survive a serverless cold start and do not add up
--  across regions, which makes them a rate limit that is not one. A row with a
--  window and a count is boring, correct, and shared by every instance.
-- ---------------------------------------------------------------------------
create table if not exists rate_limits (
  bucket        text not null,
  player_id     uuid not null references players(id) on delete cascade,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (bucket, player_id, window_start)
);
create index if not exists rate_limits_window_idx on rate_limits (window_start);

-- ---------------------------------------------------------------------------
--  TOWNS — the fields the server clock needs
--
--  Added rather than replaced: the init migration's `towns` already has
--  `state`, `last_tick_at` and `version`. These are the clocks the rest of the
--  game reads, and every one of them exists so the CLIENT never supplies a
--  timestamp. docs/security.md §4: "the endpoint takes no elapsed parameter".
-- ---------------------------------------------------------------------------
alter table towns add column if not exists last_upkeep_at timestamptz not null default now();
alter table towns add column if not exists alley_collected_at timestamptz not null default now();
alter table towns add column if not exists silver_key_at timestamptz not null default now();
alter table towns add column if not exists gold_key_at timestamptz not null default now();
-- Monotonic per-player gacha nonce, so a roll can never be replayed.
alter table towns add column if not exists gacha_nonce bigint not null default 0;

-- ---------------------------------------------------------------------------
--  RLS: on, and still no policies anywhere.
--
--  Repeated here rather than assumed. The init migration turned RLS on for the
--  tables that existed THEN; these are new, and a new table without this line
--  is a public read/write API. scripts/check-rls.mjs attacks the live database
--  with the public key and fails the build if any of them answers.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'sessions', 'idempotency_keys', 'gacha_seeds', 'gacha_rolls',
    'town_actions', 'rate_limits'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    -- Belt and braces: RLS does not apply to the table OWNER, and PostgREST
    -- reaches tables through the anon/authenticated roles. Revoking outright
    -- means a future accidental policy still grants nothing to the browser.
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;

-- The same revoke for the tables the first migration created, because "RLS on,
-- no policy" and "no grant at all" fail differently and we want both.
do $$
declare t text;
begin
  foreach t in array array[
    'players', 'wallets', 'wallet_nonces', 'towns', 'town_events',
    'shop_items', 'orders', 'payments', 'hold_snapshots', 'seasons',
    'season_scores', 'prize_claims'
  ]
  loop
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
--  Housekeeping. Rows that have done their job are evidence for a while and
--  then they are just surface area.
-- ---------------------------------------------------------------------------
create or replace function prune_expired() returns void
language sql security definer set search_path = public as $$
  delete from sessions where expires_at < now() - interval '7 days';
  delete from wallet_nonces where created_at < now() - interval '1 day';
  delete from idempotency_keys where created_at < now() - interval '2 days';
  delete from rate_limits where window_start < now() - interval '1 day';
$$;
revoke all on function prune_expired() from public, anon, authenticated;
