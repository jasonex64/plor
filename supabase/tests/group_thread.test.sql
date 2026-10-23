-- Group threads in the database (docs/milestones/M10-groups.md, 10d: G4, G5, G6, G9): a group comment needs a member
-- for its author and goes with the membership, and its nudges reach the group's members, naming the group, and no one
-- else. Run with `npm run test:sql`. Needs the Realtime service running, which creates realtime.messages' daily
-- partitions.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-01', '{"format": 2, "game_id": "offbeat", "date": "2000-01-01", "questions": []}');

-- Creator c (…d01) and member m (…d02) are in group g; f (…d03) is c's friend but not a member; m and f aren't
-- friends. All three played.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000010d01', 'c10d@example.test'),
  ('00000000-0000-0000-0000-000000010d02', 'm10d@example.test'),
  ('00000000-0000-0000-0000-000000010d03', 'f10d@example.test');
insert into private.profile (user_id, username) values
  ('00000000-0000-0000-0000-000000010d01', 'c10d'),
  ('00000000-0000-0000-0000-000000010d02', 'm10d'),
  ('00000000-0000-0000-0000-000000010d03', 'f10d');
insert into private.friendship (user_a, user_b) values
  ('00000000-0000-0000-0000-000000010d01', '00000000-0000-0000-0000-000000010d03');
insert into private.run (user_id, game_id, puzzle_date)
  select id, 'offbeat', '2000-01-01' from auth.users where email like '%10d@example.test';
insert into private.player_group (id, name, creator_id, invite_code)
  values ('00000000-0000-0000-0000-0000000010d0', 'Club', '00000000-0000-0000-0000-000000010d01', 'abcdefghijklmnopqrst10');
insert into private.group_member (group_id, user_id) values
  ('00000000-0000-0000-0000-0000000010d0', '00000000-0000-0000-0000-000000010d01'),
  ('00000000-0000-0000-0000-0000000010d0', '00000000-0000-0000-0000-000000010d02');

-- The messages one player's board topic got, by the last digit of their ID. Starting the runs sent friend_status
-- messages; only the events asked for are looked at.
create function pg_temp.sent(who text, kind text) returns jsonb[] language sql
  return (select coalesce(array_agg(payload - 'id' order by inserted_at, id), '{}') from realtime.messages
          where topic = 'board:00000000-0000-0000-0000-000000010d0' || who and event = kind);

-- Only a member can write in the group's thread (G4).
select throws_ok($$insert into private.comment (user_id, game_id, puzzle_date, body, group_id)
  values ('00000000-0000-0000-0000-000000010d03', 'offbeat', '2000-01-01', 'hi', '00000000-0000-0000-0000-0000000010d0')$$,
  '23503', null, 'a player who isn''t a member can''t comment in the group''s thread');

insert into private.comment (id, user_id, game_id, puzzle_date, body, group_id) overriding system value
  values (-10, '00000000-0000-0000-0000-000000010d01', 'offbeat', '2000-01-01', 'group words', '00000000-0000-0000-0000-0000000010d0');
select is(pg_temp.sent('2', 'comments_changed'),
  array[jsonb_build_object('v', 1, 'type', 'comments_changed', 'gameId', 'offbeat', 'puzzleDate', '2000-01-01',
    'groupId', '00000000-0000-0000-0000-0000000010d0')],
  'a group comment nudges another member''s board, naming the group (G5)');
select is(array_length(pg_temp.sent('1', 'comments_changed'), 1), 1, 'and the author''s own board');
select is(pg_temp.sent('3', 'comments_changed'), '{}'::jsonb[], 'and not the author''s friend outside the group');

-- m reacts to c's group comment: the members are nudged, c's friend isn't.
insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
  values ('00000000-0000-0000-0000-000000010d02', 'offbeat', '2000-01-01', -10, '👍');
select is(array_length(pg_temp.sent('1', 'comments_changed'), 1), 2, 'a reaction on a group comment nudges the members');
select ok((pg_temp.sent('1', 'comments_changed'))[2] ? 'groupId', 'naming the group');
select is(pg_temp.sent('3', 'comments_changed'), '{}'::jsonb[], 'and still not the friend outside the group');

-- A friends-thread comment is unchanged: the author and their friends, with no group in the payload.
insert into private.comment (id, user_id, game_id, puzzle_date, body) overriding system value
  values (-11, '00000000-0000-0000-0000-000000010d01', 'offbeat', '2000-01-01', 'friends words');
select is(pg_temp.sent('3', 'comments_changed'),
  array[jsonb_build_object('v', 1, 'type', 'comments_changed', 'gameId', 'offbeat', 'puzzleDate', '2000-01-01')],
  'a friends-thread comment nudges the author''s friends with no group (G9)');
select is(array_length(pg_temp.sent('2', 'comments_changed'), 1), 2, 'and not a group member who isn''t a friend');

-- Deleting the group comment sends one nudge per member; the reaction that goes with it adds none.
delete from private.comment where id = -10;
select is(array_length(pg_temp.sent('2', 'comments_changed'), 1), 3,
  'deleting a group comment nudges each member once, its reactions adding nothing');

-- Leaving or being removed deletes the member's comments in the group, with what hangs off them (G6).
insert into private.comment (id, user_id, game_id, puzzle_date, body, group_id) overriding system value
  values (-12, '00000000-0000-0000-0000-000000010d02', 'offbeat', '2000-01-01', 'member words', '00000000-0000-0000-0000-0000000010d0');
insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
  values ('00000000-0000-0000-0000-000000010d01', 'offbeat', '2000-01-01', -12, '😂');
insert into private.comment_report (comment_id, reporter_id) values (-12, '00000000-0000-0000-0000-000000010d01');
delete from private.group_member where user_id = '00000000-0000-0000-0000-000000010d02';
select ok(not exists (select from private.comment where id = -12), 'a member who leaves loses their comments in the group');
select ok(not exists (select from private.reaction where comment_id = -12)
  and not exists (select from private.comment_report where comment_id = -12), 'with the reactions and reports on them');

-- Deleting the group deletes its thread; the friends thread stays.
insert into private.comment (id, user_id, game_id, puzzle_date, body, group_id) overriding system value
  values (-13, '00000000-0000-0000-0000-000000010d01', 'offbeat', '2000-01-01', 'last words', '00000000-0000-0000-0000-0000000010d0');
delete from private.player_group where id = '00000000-0000-0000-0000-0000000010d0';
select ok(not exists (select from private.comment where id = -13), 'deleting the group deletes its thread');
select ok(exists (select from private.comment where id = -11), 'and leaves the friends thread alone');

select * from finish();
rollback;
