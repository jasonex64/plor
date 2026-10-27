-- private.delete_account deletes a player's account and everything tied to it (docs/milestones/M12-account.md, 12c:
-- A5, A7). Run with `npm run test:sql`. The same function as plor_app, which the route connects as, is in
-- src/lib/account.plor-app.db.test.ts: pgTAP can't switch to it.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Player 1 deletes their account; 2 to 4 stay.
create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@deletion.example.test' from generate_series(1, 4) as s(n);
insert into private.profile (user_id, username) select pg_temp.u(n), 'del' || n from generate_series(1, 4) as s(n);
insert into private.admin (user_id) values (pg_temp.u(1));

-- A day both 1 and 2 played, with comments, reactions and reports both ways.
insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-01', '{"format": 2, "game_id": "offbeat", "date": "2000-01-01", "questions": []}');
insert into private.run (user_id, game_id, puzzle_date) values (pg_temp.u(1), 'offbeat', '2000-01-01'), (pg_temp.u(2), 'offbeat', '2000-01-01');
insert into private.comment (id, user_id, game_id, puzzle_date, body) overriding system value values
  (-1, pg_temp.u(1), 'offbeat', '2000-01-01', 'mine'), (-2, pg_temp.u(2), 'offbeat', '2000-01-01', 'theirs');
insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji) values
  (pg_temp.u(2), 'offbeat', '2000-01-01', -1, '👍'), (pg_temp.u(1), 'offbeat', '2000-01-01', -2, '😂');
insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji) values
  (pg_temp.u(1), 'offbeat', '2000-01-01', pg_temp.u(2), '😮'), (pg_temp.u(2), 'offbeat', '2000-01-01', pg_temp.u(1), '😢');
insert into private.comment_report (comment_id, reporter_id) values (-1, pg_temp.u(2)), (-2, pg_temp.u(1));

-- Friends both ways (user_a < user_b), and invite codes.
insert into private.friendship (user_a, user_b) values (pg_temp.u(1), pg_temp.u(2)), (pg_temp.u(1), pg_temp.u(3)), (pg_temp.u(2), pg_temp.u(3));
insert into private.friend_invite (user_id, code) values (pg_temp.u(1), lpad('1', 10, 'f')), (pg_temp.u(2), lpad('2', 10, 'f'));

-- Groups (M10 G6): 'mine' was made by 1, with 3 joining before 2, so 3 is the longest-standing member after 1;
-- 'alone' has 1 only; 'theirs' was made by 2, with 1 a member.
create temp table g (name text primary key, id uuid);
create function pg_temp.make_group(name text, creator uuid, members uuid[], code text) returns uuid language plpgsql as $$
declare
  gid uuid;
begin
  insert into private.player_group (name, creator_id, invite_code) values (name, creator, code) returning id into gid;
  insert into private.group_member (group_id, user_id, joined_at) values (gid, creator, now() - interval '3 days');
  insert into private.group_member (group_id, user_id, joined_at)
    select gid, m, now() - interval '2 days' + make_interval(hours => i::int) from unnest(members) with ordinality as x(m, i);
  return gid;
end;
$$;
insert into g values
  ('mine', pg_temp.make_group('Mine', pg_temp.u(1), array[pg_temp.u(3), pg_temp.u(2)], lpad('1', 10, 'g'))),
  ('alone', pg_temp.make_group('Alone', pg_temp.u(1), array[]::uuid[], lpad('2', 10, 'g'))),
  ('theirs', pg_temp.make_group('Theirs', pg_temp.u(2), array[pg_temp.u(1)], lpad('3', 10, 'g')));
set constraints all immediate;
set constraints all deferred;

-- Rows tied to player 1, and to players 2 to 4, across every table A5 names.
create function pg_temp.rows_of(who uuid[]) returns int language sql return (
  (select count(*) from auth.users where id = any(who)) + (select count(*) from private.profile where user_id = any(who))
  + (select count(*) from private.admin where user_id = any(who)) + (select count(*) from private.run where user_id = any(who))
  + (select count(*) from private.comment where user_id = any(who)) + (select count(*) from private.reaction where user_id = any(who))
  + (select count(*) from private.comment_report where reporter_id = any(who))
  + (select count(*) from private.friendship where user_a = any(who) or user_b = any(who))
  + (select count(*) from private.friend_invite where user_id = any(who)) + (select count(*) from private.group_member where user_id = any(who)))::int;

-- The function itself (A7): its owner's rights, a fixed search_path, and plor_app's execute.
select is((select prosecdef from pg_proc where oid = 'private.delete_account(uuid,text)'::regprocedure), true,
  'delete_account runs with its owner''s rights');
select is((select proconfig from pg_proc where oid = 'private.delete_account(uuid,text)'::regprocedure), array['search_path=""'],
  'delete_account has an empty search_path');
select ok(has_function_privilege('plor_app', 'private.delete_account(uuid,text)', 'execute'), 'plor_app may delete an account');
select ok(not has_function_privilege('anon', 'private.delete_account(uuid,text)', 'execute')
  and not has_function_privilege('authenticated', 'private.delete_account(uuid,text)', 'execute')
  and not has_function_privilege('service_role', 'private.delete_account(uuid,text)', 'execute'),
  'the Data API roles may not');

-- A wrong username deletes nothing.
-- 1 user, profile, admin row, run and comment; 2 reactions and 1 report by them; 2 friendships, 1 invite, 3 memberships.
select is(pg_temp.rows_of(array[pg_temp.u(1)]), 14, 'player 1 has rows in every table before');
select is(private.delete_account(pg_temp.u(1), 'del2'), false, 'another player''s username is refused');
select is(private.delete_account(pg_temp.u(1), 'DEL1'), false, 'the username must match exactly');
select is(pg_temp.rows_of(array[pg_temp.u(1)]), 14, 'and nothing is deleted');

-- The right username deletes everything (A5).
select is(private.delete_account(pg_temp.u(1), 'del1'), true, 'the player''s own username deletes the account');
select is(pg_temp.rows_of(array[pg_temp.u(1)]), 0, 'no row tied to player 1 is left');
select is((select count(*)::int from private.comment where id = -1), 0, 'their comment is gone');
select is((select count(*)::int from private.reaction where comment_id = -1 or run_user_id = pg_temp.u(1)), 0,
  'with the reactions to their comment and their run');
select is((select count(*)::int from private.comment_report where comment_id = -1), 0, 'and the report on their comment');

-- Their groups (M10 G6).
select is((select creator_id from private.player_group where id = (select id from g where name = 'mine')), pg_temp.u(3),
  'a group they made passes to its longest-standing member');
select is((select array_agg(user_id order by user_id) from private.group_member where group_id = (select id from g where name = 'mine')),
  array[pg_temp.u(2), pg_temp.u(3)], 'whose other members stay');
select is((select count(*)::int from private.player_group where id = (select id from g where name = 'alone')), 0,
  'a group they were the last member of is deleted');
select is((select creator_id from private.player_group where id = (select id from g where name = 'theirs')), pg_temp.u(2),
  'a group someone else made keeps its creator');
select lives_ok('set constraints all immediate', 'every group''s creator is still a member');

-- Everyone else keeps their rows: 3 users and profiles, 2's run, comment and invite, the 2-3 friendship and 3
-- memberships. 2's reaction and report on 1's comment and run went with them.
select is(pg_temp.rows_of(array[pg_temp.u(2), pg_temp.u(3), pg_temp.u(4)]), 13, 'other players keep their own rows');
select is((select count(*)::int from private.comment where id = -2), 1, 'another player''s comment stays');

-- The cascade's lookups by run key (ROADMAP "Next revision", For M12).
select has_index('private', 'comment', 'comment_run', array['user_id', 'game_id', 'puzzle_date'], 'comments are indexed by run');
select has_index('private', 'reaction', 'reaction_run_owner', array['user_id', 'game_id', 'puzzle_date'],
  'reactions are indexed by the reacting player''s run');

select * from finish();
rollback;
