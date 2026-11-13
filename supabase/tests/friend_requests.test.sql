-- private.friend_request and private.block keep their rules in the database
-- (docs/milestones/M17-profiles-and-friend-requests.md, "17a design"). Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(43);

create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@requests.example.test' from generate_series(1, 5) as s(n);

-- Grants (Security change 1, D4): requests are read, added and deleted; blocks are read and added, never deleted
-- by a grant. A comma list is true when any one privilege is held, so each `not` asserts none of them is.
select ok(has_table_privilege('plor_app', 'private.friend_request', 'select')
  and has_table_privilege('plor_app', 'private.friend_request', 'insert')
  and has_table_privilege('plor_app', 'private.friend_request', 'delete'), 'plor_app reads, adds and deletes requests');
select ok(not has_table_privilege('plor_app', 'private.friend_request', 'update, truncate, references, trigger'),
  'plor_app cannot update, truncate, reference or trigger on requests');
select ok(has_table_privilege('plor_app', 'private.block', 'select') and has_table_privilege('plor_app', 'private.block', 'insert'),
  'plor_app reads and adds blocks');
select ok(not has_table_privilege('plor_app', 'private.block', 'delete, update, truncate, references, trigger'),
  'plor_app cannot delete, update, truncate, reference or trigger on blocks');

-- One policy per granted command, for plor_app only (DECISIONS.md, Row-level security in `private`).
select is((select relrowsecurity from pg_class where oid = 'private.friend_request'::regclass), true, 'requests have RLS on');
select is((select relrowsecurity from pg_class where oid = 'private.block'::regclass), true, 'blocks have RLS on');
select is(
  (select array_agg(format('%s %s %s', policyname, cmd, array_to_string(roles, ',')) order by policyname)
   from pg_policies where schemaname = 'private' and tablename in ('friend_request', 'block')),
  array['block_plor_app_insert INSERT plor_app', 'block_plor_app_select SELECT plor_app',
    'friend_request_plor_app_delete DELETE plor_app', 'friend_request_plor_app_insert INSERT plor_app',
    'friend_request_plor_app_select SELECT plor_app'],
  'each table has one plor_app policy per granted command and no other');

-- private.unblock (D4): its owner's rights, a fixed search_path, and plor_app's execute alone.
select is((select prosecdef from pg_proc where oid = 'private.unblock(uuid,uuid)'::regprocedure), true,
  'unblock runs with its owner''s rights');
select is((select proconfig from pg_proc where oid = 'private.unblock(uuid,uuid)'::regprocedure), array['search_path=""'],
  'unblock has an empty search_path');
select ok(has_function_privilege('plor_app', 'private.unblock(uuid,uuid)', 'execute'), 'plor_app may unblock');
select ok(not has_function_privilege('anon', 'private.unblock(uuid,uuid)', 'execute')
  and not has_function_privilege('authenticated', 'private.unblock(uuid,uuid)', 'execute')
  and not has_function_privilege('service_role', 'private.unblock(uuid,uuid)', 'execute'), 'the Data API roles may not');

-- The two trigger functions run with the caller's rights, as profile_username_change does, so they need no grant.
select is(
  (select array_agg(format('%s %s %s', proname, prosecdef, proconfig) order by proname) from pg_proc
   where oid in ('private.block_ends_friendship()'::regprocedure, 'private.friendship_unblocked()'::regprocedure)),
  array['block_ends_friendship f {"search_path=\"\""}', 'friendship_unblocked f {"search_path=\"\""}'],
  'the two trigger functions are security invoker with an empty search_path');
select ok(not has_function_privilege('plor_app', 'private.block_ends_friendship()', 'execute')
  and not has_function_privilege('plor_app', 'private.friendship_unblocked()', 'execute'),
  'plor_app holds no execute on them');
select is(
  (select array_agg(format('%s on %s', tgname, tgrelid::regclass) order by tgname) from pg_trigger
   where not tgisinternal and tgrelid in ('private.friend_request'::regclass, 'private.block'::regclass, 'private.friendship'::regclass)),
  array['block_ends_friendship on private.block', 'friendship_unblocked on private.friendship'],
  'a block and a friendship each have one trigger, and a request has none, so nothing is sent when one arrives (answer 14)');

select has_index('private', 'friend_request', 'friend_request_receiver', array['receiver'], 'requests are indexed by receiver');
select has_index('private', 'block', 'block_blocked', array['blocked'], 'blocks are indexed by the blocked player');

-- Requests: one per pair, either way, and none to oneself.
select lives_ok($$insert into private.friend_request (sender, receiver) values (pg_temp.u(1), pg_temp.u(2))$$, 'a request is stored');
select throws_ok($$insert into private.friend_request (sender, receiver) values (pg_temp.u(1), pg_temp.u(2))$$,
  '23505', null, 'the same request twice is rejected');
select throws_ok($$insert into private.friend_request (sender, receiver) values (pg_temp.u(2), pg_temp.u(1))$$,
  '23505', null, 'a request the other way round is rejected while one is pending');
select throws_ok($$insert into private.friend_request (sender, receiver) values (pg_temp.u(1), pg_temp.u(1))$$,
  '23514', null, 'a request to oneself is rejected');
select throws_ok($$insert into private.friend_request (sender, receiver) values (pg_temp.u(1), pg_temp.u(255))$$,
  '23503', null, 'a receiver must be an existing auth user');
select throws_ok($$insert into private.block (blocker, blocked) values (pg_temp.u(1), pg_temp.u(1))$$,
  '23514', null, 'a block of oneself is rejected');

-- A block ends the friendship (answer 20) and deletes the blocker's own request (D3); the blocked player's request
-- to the blocker stays (answer 28). 1's request to 2 is pending (above), 3 has a request to 1, and 4 is a friend of
-- both 1 and 2. 1 blocks 2 and 3; 4 blocks 1.
insert into private.friend_request (sender, receiver) values (pg_temp.u(3), pg_temp.u(1));
insert into private.friendship (user_a, user_b) values (pg_temp.u(1), pg_temp.u(4)), (pg_temp.u(2), pg_temp.u(4));
insert into private.block (blocker, blocked) values (pg_temp.u(1), pg_temp.u(2)), (pg_temp.u(1), pg_temp.u(3)), (pg_temp.u(4), pg_temp.u(1));
select is((select count(*)::int from private.friend_request where sender = pg_temp.u(1) and receiver = pg_temp.u(2)), 0,
  'a block deletes the blocker''s own request to the blocked player');
select is((select count(*)::int from private.friend_request where sender = pg_temp.u(3) and receiver = pg_temp.u(1)), 1,
  'and keeps the blocked player''s request to the blocker');
select is((select count(*)::int from private.friendship where user_a = pg_temp.u(1) and user_b = pg_temp.u(4)), 0,
  'a block deletes the pair''s friendship, whichever of the two blocks');
select is((select count(*)::int from private.friendship where user_a = pg_temp.u(2) and user_b = pg_temp.u(4)), 1,
  'and no other friendship');

-- No friendship while a block is on, either way (answer 29): OB016.
select throws_ok($$insert into private.friendship (user_a, user_b) values (pg_temp.u(1), pg_temp.u(2))$$,
  'OB016', null, 'a friendship is refused when the smaller ID blocked the larger');
select throws_ok($$insert into private.friendship (user_a, user_b) values (pg_temp.u(1), pg_temp.u(4))$$,
  'OB016', null, 'and when the larger ID blocked the smaller');
select lives_ok($$insert into private.friendship (user_a, user_b) values (pg_temp.u(2), pg_temp.u(3))$$,
  'a pair with no block between them still become friends');

-- A blocked player can still store a request to the blocker (answer 13: it looks unanswered).
select lives_ok($$insert into private.friend_request (sender, receiver) values (pg_temp.u(2), pg_temp.u(1))$$,
  'a blocked player''s request to the blocker is stored');

-- private.unblock (answer 21, D2): one named pair, with the blocked player's hidden request; nothing else.
select is(private.unblock(pg_temp.u(2), pg_temp.u(1)), false, 'unblocking the wrong way round finds no block');
select is((select count(*)::int from private.block), 3, 'and deletes none');
select is((select count(*)::int from private.friend_request where sender = pg_temp.u(2) and receiver = pg_temp.u(1)), 1,
  'nor any request');
select is(private.unblock(pg_temp.u(1), pg_temp.u(2)), true, 'unblocking a blocked player says a block was there');
select is((select array_agg(format('%s %s', blocker, blocked) order by blocker) from private.block),
  array[format('%s %s', pg_temp.u(1), pg_temp.u(3)), format('%s %s', pg_temp.u(4), pg_temp.u(1))], 'it deletes that one block');
select is((select count(*)::int from private.friend_request where sender = pg_temp.u(2) and receiver = pg_temp.u(1)), 0,
  'and the blocked player''s hidden request to the blocker');
select is((select count(*)::int from private.friend_request where sender = pg_temp.u(3) and receiver = pg_temp.u(1)), 1,
  'another blocked player''s request stays');
select is((select count(*)::int from private.friendship where user_a = pg_temp.u(1) and user_b = pg_temp.u(2)), 0,
  'unblocking restores no friendship');
select lives_ok($$insert into private.friendship (user_a, user_b) values (pg_temp.u(1), pg_temp.u(2))$$,
  'after the unblock the pair can become friends again');
select is(private.unblock(pg_temp.u(1), pg_temp.u(2)), false, 'unblocking twice finds no block the second time');

-- Account deletion (M12 12c) relies on these cascades: 1 has a block each way and a request to them; 5 has none.
insert into private.friend_request (sender, receiver) values (pg_temp.u(1), pg_temp.u(5));
delete from auth.users where id = pg_temp.u(1);
select is((select count(*)::int from private.friend_request where pg_temp.u(1) in (sender, receiver)), 0,
  'deleting a user deletes the requests they sent and received');
select is((select count(*)::int from private.block where pg_temp.u(1) in (blocker, blocked)), 0,
  'and the blocks they made and the blocks of them');
select is((select count(*)::int from private.friendship where user_a = pg_temp.u(2) and user_b = pg_temp.u(3)), 1,
  'other players'' rows stay');

select * from finish();
rollback;
