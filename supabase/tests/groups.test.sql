-- private.player_group and private.group_member keep the group rules in the database (docs/milestones/M10-groups.md,
-- 10b: G1, G6, G8, G11). Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Players 1 to 4 by name, and 101 to 160 to fill a group.
create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@groups.example.test'
  from (select generate_series(1, 4) union all select generate_series(101, 160)) as s(n);

-- A group with its creator as the first member, in one statement, the way the create route makes it.
create function pg_temp.make_group(creator uuid, name text, code text) returns uuid language sql as $$
  with g as (insert into private.player_group (name, creator_id, invite_code) values (name, creator, code) returning id),
       m as (insert into private.group_member (group_id, user_id) select id, creator from g)
  select id from g
$$;
-- 22 base64url characters, unique per n.
create function pg_temp.code(n int) returns text language sql immutable return lpad(n::text, 22, 'c');
-- Runs the creator-is-a-member check now, as a commit would, then defers it again.
create function pg_temp.check_creators() returns void language plpgsql as $$
begin
  set constraints private.player_group_creator_is_member immediate;
  set constraints private.player_group_creator_is_member deferred;
end;
$$;
create function pg_temp.creator(g uuid) returns uuid language sql return (select creator_id from private.player_group where id = g);
create temp table ids (name text primary key, id uuid);

-- Names: the display name rule (G11).
select lives_ok($$insert into ids select 'club', pg_temp.make_group(pg_temp.u(1), 'Book Club', pg_temp.code(1))$$,
  'a group is created with its creator as a member');
select lives_ok($$select pg_temp.make_group(pg_temp.u(2), 'abcdefghijklmnopqrstuvwx', pg_temp.code(2))$$, 'a 24-character name is accepted');
select throws_ok($$select pg_temp.make_group(pg_temp.u(2), 'abcdefghijklmnopqrstuvwxy', pg_temp.code(3))$$,
  '23514', null, 'a 25-character name is rejected');
select throws_ok($$select pg_temp.make_group(pg_temp.u(2), '', pg_temp.code(3))$$, '23514', null, 'an empty name is rejected');
select throws_ok($$select pg_temp.make_group(pg_temp.u(2), ' Club', pg_temp.code(3))$$, '23514', null, 'a leading space is rejected');
select throws_ok($$select pg_temp.make_group(pg_temp.u(2), 'Dice 🎲', pg_temp.code(3))$$, '23514', null, 'an emoji is rejected');

-- Invite codes (G8).
select throws_ok($$select pg_temp.make_group(pg_temp.u(2), 'Short', 'abcdefghijklmnopqrstu')$$, '23514', null, 'a 21-character code is rejected');
select throws_ok($$select pg_temp.make_group(pg_temp.u(2), 'Plus', 'abcdefghijklmnopqrst+/')$$, '23514', null,
  'a code with characters outside base64url is rejected');
select throws_ok($$select pg_temp.make_group(pg_temp.u(2), 'Twin', pg_temp.code(1))$$, '23505', null, 'two groups cannot share a code');

-- The creator is a member (G1, G6).
insert into private.player_group (name, creator_id, invite_code) values ('Orphan', pg_temp.u(3), pg_temp.code(4));
select throws_ok($$select pg_temp.check_creators()$$, '23503', null, 'a group whose creator is not a member cannot commit');
delete from private.player_group where name = 'Orphan';
select lives_ok($$select pg_temp.check_creators()$$, 'every group so far has its creator as a member');

-- 50 members per group (G11): the creator and 49 more fit, the 51st doesn't.
insert into ids select 'big', pg_temp.make_group(pg_temp.u(101), 'Big', pg_temp.code(5));
select lives_ok($$insert into private.group_member (group_id, user_id) select (select id from ids where name = 'big'), pg_temp.u(n)
  from generate_series(102, 150) as n$$, 'a group takes members up to 50');
select throws_ok($$insert into private.group_member (group_id, user_id) values ((select id from ids where name = 'big'), pg_temp.u(151))$$,
  'OB009', null, 'the 51st member is refused');

-- 10 groups per player (G11), whether creating or joining.
select lives_ok($$select pg_temp.make_group(pg_temp.u(152), 'Many ' || n, pg_temp.code(100 + n)) from generate_series(1, 10) as n$$,
  'a player can be in 10 groups');
select throws_ok($$select pg_temp.make_group(pg_temp.u(152), 'Many 11', pg_temp.code(111))$$, 'OB010', null, 'creating an 11th group is refused');
select throws_ok($$insert into private.group_member (group_id, user_id) values ((select id from ids where name = 'club'), pg_temp.u(152))$$,
  'OB010', null, 'joining an 11th group is refused');

-- Handover (G6). Player 3 joined before player 2, though player 2's ID sorts first, so player 3 is next in line.
insert into private.group_member (group_id, user_id, joined_at) values
  ((select id from ids where name = 'club'), pg_temp.u(2), now() + interval '2 minutes'),
  ((select id from ids where name = 'club'), pg_temp.u(3), now() + interval '1 minute');
delete from private.group_member where group_id = (select id from ids where name = 'club') and user_id = pg_temp.u(2);
select is(pg_temp.creator((select id from ids where name = 'club')), pg_temp.u(1), 'a member who isn''t the creator leaving changes nothing');
insert into private.group_member (group_id, user_id, joined_at) values ((select id from ids where name = 'club'), pg_temp.u(2), now() + interval '2 minutes');
delete from private.group_member where group_id = (select id from ids where name = 'club') and user_id = pg_temp.u(1);
select is(pg_temp.creator((select id from ids where name = 'club')), pg_temp.u(3), 'when the creator leaves, the longest-standing member is creator');
select lives_ok($$select pg_temp.check_creators()$$, 'the new creator is a member');

-- Deleting the creator's account hands the group over too (Auth deletes the user; the membership cascades).
delete from auth.users where id = pg_temp.u(3);
select is(pg_temp.creator((select id from ids where name = 'club')), pg_temp.u(2), 'when the creator''s account is deleted, the next member is creator');
select lives_ok($$select pg_temp.check_creators()$$, 'and is a member');

-- The last member leaving deletes the group, by leaving or by deleting their account.
delete from private.group_member where group_id = (select id from ids where name = 'club') and user_id = pg_temp.u(2);
select is((select count(*)::int from private.player_group where id = (select id from ids where name = 'club')), 0,
  'when the last member leaves, the group is deleted');
insert into ids select 'solo', pg_temp.make_group(pg_temp.u(4), 'Solo', pg_temp.code(6));
delete from auth.users where id = pg_temp.u(4);
select is((select count(*)::int from private.player_group where id = (select id from ids where name = 'solo')), 0,
  'when the last member deletes their account, the group is deleted');

-- Deleting a group deletes its memberships.
delete from private.player_group where id = (select id from ids where name = 'big');
select is((select count(*)::int from private.group_member where group_id = (select id from ids where name = 'big')), 0,
  'deleting a group deletes its memberships');
select lives_ok($$select pg_temp.check_creators()$$, 'every remaining group has its creator as a member');

-- The same paths as plor_app, which the routes connect as, are in src/groups/groups.plor-app.db.test.ts: pgTAP can't
-- switch to it.

select * from finish();
rollback;
