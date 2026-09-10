-- ---------------------------------------------------------------------------
--  RATE LIMITING THAT DOES NOT LOSE A RACE
--
--  The JavaScript version read the counter, added one, and wrote it back:
--
--      const row   = await db.one("rate_limits", …);
--      const count = (row?.count ?? 0) + 1;
--      if (count > max) throw 429;
--      await db.update("rate_limits", …, { count });
--
--  Two requests that read the same value write the same value. The counter
--  undercounts by exactly the concurrency, so the cap is bypassed by sending
--  requests in parallel — which is how an attacker sends them. Putting the
--  counter in the database fixed durability across cold starts and left
--  atomicity out.
--
--  `insert … on conflict do update … returning` is one statement. Postgres
--  takes a row lock on the conflict, so concurrent callers queue and each one
--  sees a distinct number. There is no window between the read and the write
--  because there is no read.
--
--  Returns the count AFTER this hit, so the caller compares against its own
--  ceiling — the limit stays in the application, where the numbers per bucket
--  live, and only the increment moves here.
-- ---------------------------------------------------------------------------

create or replace function bump_rate_limit(
  p_bucket text,
  p_player uuid,
  p_window timestamptz
)
returns integer
language plpgsql
-- security definer so the function runs as its owner. The service_role key is
-- the only thing that can call it anyway (see the revoke below), but a
-- function that would work for anon if someone ever granted it is a function
-- waiting to be granted.
security definer
set search_path = public
as $$
declare
  c integer;
begin
  insert into rate_limits (bucket, player_id, window_start, count)
  values (p_bucket, p_player, p_window, 1)
  on conflict (bucket, player_id, window_start)
    do update set count = rate_limits.count + 1
  returning count into c;
  return c;
end;
$$;

-- Same posture as fulfil_order, prune_expired and retire_gacha_seed: the
-- browser's key cannot reach it.
revoke all on function bump_rate_limit(text, uuid, timestamptz) from public, anon, authenticated;
