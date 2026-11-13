-- private.held_username keeps a renamed player's old username from everyone for 30 days
-- (docs/milestones/M17-profiles-and-friend-requests.md, "17b design", E5; answers 10, 22 and 27). Run with
-- `npm run test:sql`. The same trigger as plor_app, racing a sign-up, is in src/lib/profile.plor-app.db.test.ts.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(21);

create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@held.example.test' from generate_series(1, 5) as s(n);
insert into private.profile (user_id, username) select pg_temp.u(n), 'hold' || n from generate_series(1, 4) as s(n);
create function pg_temp.held() returns text[] language sql
  return (select coalesce(array_agg(username::text order by username::text), '{}') from private.held_username);

-- Grants (Security change 4, E5): plor_app reads held names and nothing else. A comma list is true when any one
-- privilege is held, so the `not` asserts none of them is.
select ok(has_table_privilege('plor_app', 'private.held_username', 'select'), 'plor_app reads held names');
select ok(not has_table_privilege('plor_app', 'private.held_username', 'insert, update, delete, truncate, references, trigger'),
  'plor_app cannot add, change, delete, truncate, reference or trigger on held names');
select is((select relrowsecurity from pg_class where oid = 'private.held_username'::regclass), true, 'held names have RLS on');
select is(
  (select array_agg(format('%s %s %s', policyname, cmd, array_to_string(roles, ',')) order by policyname)
   from pg_policies where schemaname = 'private' and tablename = 'held_username'),
  array['held_username_plor_app_select SELECT plor_app'], 'one plor_app policy, for select, and no other');

-- The trigger function: its owner's rights, a fixed search_path, and no role's execute.
select is((select prosecdef from pg_proc where oid = 'private.hold_username()'::regprocedure), true,
  'hold_username runs with its owner''s rights');
select is((select proconfig from pg_proc where oid = 'private.hold_username()'::regprocedure), array['search_path=""'],
  'hold_username has an empty search_path');
select ok(not has_function_privilege('plor_app', 'private.hold_username()', 'execute')
  and not has_function_privilege('anon', 'private.hold_username()', 'execute')
  and not has_function_privilege('authenticated', 'private.hold_username()', 'execute')
  and not has_function_privilege('service_role', 'private.hold_username()', 'execute'), 'no role may call it');
-- tgtype 23: a row trigger (1), before (2), on insert (4) and update (16).
select is((select tgtype::int from pg_trigger where tgrelid = 'private.profile'::regclass and tgname = 'profile_username_hold'), 23,
  'it fires before each insert and update of a profile');
select ok('profile_username_change' < 'profile_username_hold', 'after the 30-day rule, as triggers fire in name order');

-- A rename holds the old name for 30 days (answer 10).
update private.profile set username = 'holdb' where user_id = pg_temp.u(1);
select is((select array_agg(row(username::text, user_id)::text) from private.held_username), array[row('hold1', pg_temp.u(1))::text],
  'a rename holds the old name for the player who had it');
select ok((select held_until between now() + interval '30 days' and clock_timestamp() + interval '30 days' from private.held_username),
  'until 30 days from the change');

-- Held from everyone (22): another player, a new one, in any case, and the player who gave it up.
select throws_ok($$update private.profile set username = 'hold1' where user_id = pg_temp.u(2)$$, 'OB017', null,
  'another player can''t rename to a held name');
select throws_ok($$insert into private.profile (user_id, username) values (pg_temp.u(5), 'hold1')$$, 'OB017', null,
  'nor can a new player sign up with it');
select throws_ok($$insert into private.profile (user_id, username) values (pg_temp.u(5), 'HOLD1')$$, 'OB017', null,
  'whatever its case');
-- The 30-day rule would stop this first (OB011); with that out of the way, the hold alone refuses it.
update private.profile set username_changed_at = username_changed_at - interval '31 days' where user_id = pg_temp.u(1);
select throws_ok($$update private.profile set username = 'hold1' where user_id = pg_temp.u(1)$$, 'OB017', null,
  'the player who gave it up can''t take it back inside the hold');

-- Day 29 and day 30, by moving the hold's end (the test's clock).
update private.held_username set held_until = statement_timestamp() + interval '1 day';
select throws_ok($$update private.profile set username = 'hold1' where user_id = pg_temp.u(2)$$, 'OB017', null,
  'with a day of the hold left the name is still refused');
update private.held_username set held_until = statement_timestamp();
select lives_ok($$update private.profile set username = 'hold1' where user_id = pg_temp.u(2)$$,
  'once the hold has ended another player takes the name');
select is(pg_temp.held(), array['hold2'], 'the ended hold is gone, and the taker''s own old name is now held');
select throws_ok($$update private.profile set username = 'holdc' where user_id = pg_temp.u(2)$$, 'OB011', null,
  'a second change inside 30 days is still the 30-day rule''s refusal');

-- Deleting the account frees the held name at once (27).
delete from auth.users where id = pg_temp.u(2);
select is(pg_temp.held(), array[]::text[], 'a deleted player''s held name goes with them');
select lives_ok($$update private.profile set username = 'hold2' where user_id = pg_temp.u(3)$$,
  'and another player takes it right away');

select * from finish();
rollback;
