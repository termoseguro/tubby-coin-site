-- The active seed's SECRET, and why it is a separate column.
--
-- Commit–reveal needs three things: a secret the server holds, a hash of it
-- published up front, and the secret released when the seed retires so anyone
-- can recompute every roll made under it.
--
-- `revealed_seed` is the third. It is NULL while the seed is active, and that
-- is the whole point — a value in it means "this is public now". Storing the
-- live secret there and relying on nobody selecting it would make the column
-- mean two opposite things depending on a flag, and one careless `select=*`
-- would publish a seed that is still in use, letting a player compute their
-- next roll before spending on it.
alter table gacha_seeds add column if not exists secret text;

-- Retiring a seed is: copy secret -> revealed_seed, clear secret, flip active.
-- Written as a function so the three steps cannot happen partially.
create or replace function retire_gacha_seed(seed uuid) returns void
language sql security definer set search_path = public as $$
  update gacha_seeds
     set revealed_seed = secret, secret = null, active = false, retired_at = now()
   where id = seed and active;
$$;
revoke all on function retire_gacha_seed(uuid) from public, anon, authenticated;
