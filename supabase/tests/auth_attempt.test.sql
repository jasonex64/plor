-- private.auth_attempt and its two functions count sign-in attempts per hashed key (docs/milestones/
-- M12-12e-sign-in-limits.md, L1 (a)). Run with `npm run test:sql`. The routes' use of them, with the human's numbers, is
-- in src/app/api/auth/email/route.db.test.ts and verify/route.db.test.ts.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(15);

create function pg_temp.k(n int) returns text language sql immutable return lpad(to_hex(n), 64, '0');
create function pg_temp.take(n int) returns boolean language sql
  return private.take_auth_attempt('send_ip', pg_temp.k(n), 3, interval '1 hour');
create function pg_temp.held(n int) returns int language sql
  return (select count(*)::int from private.auth_attempt where kind = 'send_ip' and key = pg_temp.k(n));

-- The functions (L1 a): their owner's rights, a fixed search_path, and plor_app's execute only.
select is((select bool_and(prosecdef) from pg_proc where oid in
  ('private.take_auth_attempt(text,text,integer,interval)'::regprocedure, 'private.clear_auth_attempts(text,text)'::regprocedure)),
  true, 'both functions run with their owner''s rights');
select is((select array_agg(distinct array_to_string(proconfig, ',')) from pg_proc where oid in
  ('private.take_auth_attempt(text,text,integer,interval)'::regprocedure, 'private.clear_auth_attempts(text,text)'::regprocedure)),
  array['search_path=""'], 'both have an empty search_path');
select ok(has_function_privilege('plor_app', 'private.take_auth_attempt(text,text,integer,interval)', 'execute')
  and has_function_privilege('plor_app', 'private.clear_auth_attempts(text,text)', 'execute'), 'plor_app may execute both');
select ok(not has_table_privilege('plor_app', 'private.auth_attempt', 'select, insert, update, delete'),
  'plor_app can''t touch the table itself');

-- Only hashed keys, and only the four kinds the routes use.
select throws_ok($$insert into private.auth_attempt (kind, key) values ('send_ip', '203.0.113.7')$$, '23514', null,
  'a raw IP address is refused as a key');
select throws_ok($$insert into private.auth_attempt (kind, key) values ('other', $$ || quote_literal(pg_temp.k(1)) || $$)$$,
  '23514', null, 'an unknown kind is refused');

-- Exactly the limit, then a refusal that isn't recorded.
select is(array[pg_temp.take(1), pg_temp.take(1), pg_temp.take(1)], array[true, true, true], 'the first 3 of a limit of 3 are allowed');
select is(pg_temp.take(1), false, 'the 4th is refused');
select is(pg_temp.held(1), 3, 'a refusal isn''t recorded');
select is(pg_temp.take(2), true, 'another key has its own count');

-- The window: once the oldest attempt is a window old, one more is allowed, and expired rows of the kind go.
-- The three were taken in one statement, so they share a time; one row is aged by its position instead.
update private.auth_attempt set at = statement_timestamp() - interval '1 hour'
  where ctid = (select min(ctid) from private.auth_attempt where kind = 'send_ip' and key = pg_temp.k(1));
select is(pg_temp.take(1), true, 'an attempt a window old no longer counts');
select is(pg_temp.held(1), 3, 'and it was cleared as the new one was recorded');
update private.auth_attempt set at = statement_timestamp() - interval '2 hours' where key = pg_temp.k(2);
do $$ begin perform pg_temp.take(3); end $$;
select is(pg_temp.held(2), 0, 'taking one key clears expired rows of other keys of the same kind');

-- Clearing one key leaves the rest.
select lives_ok($$select private.clear_auth_attempts('send_ip', $$ || quote_literal(pg_temp.k(1)) || $$)$$, 'a key can be cleared');
select is(array[pg_temp.held(1), pg_temp.held(3)], array[0, 1], 'only that key''s attempts are gone');

select * from finish();
rollback;
