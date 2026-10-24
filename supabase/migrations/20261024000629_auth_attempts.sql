-- M12 12e: sign-in code limits per player IP and per email address (docs/milestones/M12-12e-sign-in-limits.md, L1 (a);
-- human, 2026-10-23). Our routes call Supabase Auth from the server, so Auth's per-IP limits count Vercel's address and
-- are shared by every player; these count each player before Auth is called. Security change (DECISIONS.md Log):
-- plor_app may execute the two functions below, and holds nothing on the table itself.

-- One row per attempt, kept only as long as its limit's window. Keys are SHA-256 hashes of an IP or an email address,
-- never the address itself (src/lib/auth-limits.ts; the privacy page says so).
create table private.auth_attempt (
  kind text not null,
  key text not null,
  at timestamptz not null default statement_timestamp(),
  constraint auth_attempt_kind check (kind in ('send_ip', 'send_email', 'check_ip', 'check_email')),
  constraint auth_attempt_key_hashed check (key ~ '^[0-9a-f]{64}$')
);
-- Counting a key's attempts, and clearing a kind's expired ones.
create index auth_attempt_key on private.auth_attempt (kind, key, at);
create index auth_attempt_at on private.auth_attempt (kind, at);

-- Backstop if the schema were ever exposed: RLS on, and no policy, since only the functions below touch the table
-- (DECISIONS.md, Row-level security in `private`).
alter table private.auth_attempt enable row level security;
revoke all on table private.auth_attempt from public, anon, authenticated, service_role;

-- Records one attempt and returns true, or returns false without recording it when the key already has p_limit
-- attempts within p_window. A lock per key makes two requests at once count as two. The kind's expired rows are deleted
-- on the way, so the table holds at most a window of attempts. The limits themselves are src/config/tunables.ts's
-- AUTH_LIMITS (the human's numbers, N1–N4), passed in by the routes.
create function private.take_auth_attempt(p_kind text, p_key text, p_limit int, p_window interval) returns boolean
  language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_kind || ':' || p_key, 0));
  delete from private.auth_attempt where kind = p_kind and at <= statement_timestamp() - p_window;
  if (select count(*) from private.auth_attempt where kind = p_kind and key = p_key) >= p_limit then
    return false;
  end if;
  insert into private.auth_attempt (kind, key) values (p_kind, p_key);
  return true;
end;
$$;

-- Forgets one key's attempts: a new code gets a fresh set of checks (N4).
create function private.clear_auth_attempts(p_kind text, p_key text) returns void
  language sql security definer set search_path = ''
as $$
  delete from private.auth_attempt where kind = p_kind and key = p_key;
$$;

revoke all on function private.take_auth_attempt(text, text, int, interval) from public, anon, authenticated, service_role;
revoke all on function private.clear_auth_attempts(text, text) from public, anon, authenticated, service_role;
grant execute on function private.take_auth_attempt(text, text, int, interval) to plor_app;
grant execute on function private.clear_auth_attempts(text, text) to plor_app;
