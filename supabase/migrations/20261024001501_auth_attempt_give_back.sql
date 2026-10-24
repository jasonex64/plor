-- M12 12e review: a code request counts against its address only when Auth actually sends the code (N2: "code emails
-- per email address"), and against its IP only when it reached Auth (docs/milestones/M12-12e-sign-in-limits.md, Source
-- diff). The send route takes the count first, so two requests at once can't both slip under the limit, and gives it
-- back when the request goes no further. 20261024000629_auth_attempts.sql is applied, so this is its own migration.

-- Removes the newest attempt of one key, the one the caller just took. Same rights and grants as the other two.
create function private.give_back_auth_attempt(p_kind text, p_key text) returns void
  language sql security definer set search_path = ''
as $$
  delete from private.auth_attempt
  where ctid = (select ctid from private.auth_attempt where kind = p_kind and key = p_key order by at desc limit 1);
$$;

revoke all on function private.give_back_auth_attempt(text, text) from public, anon, authenticated, service_role;
grant execute on function private.give_back_auth_attempt(text, text) to plor_app;
