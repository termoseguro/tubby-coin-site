-- Players are identified by a WALLET, not by Supabase Auth.
--
-- players.id was `uuid primary key references auth.users(id)`, which assumes
-- every player first exists as a Supabase Auth user. We do not use Supabase
-- Auth: the identity proof is an ed25519 signature over a domain-bound,
-- single-use nonce (docs/security.md §4), verified by our own route. So the
-- reference described a dependency that does not exist, and the column had no
-- default — every sign-in died on "null value in column id".
--
-- Dropping the FK does not weaken anything. The security boundary was never
-- auth.users; it is RLS default-deny plus the fact that only the server, with
-- service_role, can write this table at all.
alter table players drop constraint if exists players_id_fkey;
alter table players alter column id set default gen_random_uuid();

-- One wallet, one player. Enforced by the database rather than by a check in
-- the route, so two concurrent first-time sign-ins from the same wallet cannot
-- both create an account.
create unique index if not exists wallets_address_key on wallets (address);
