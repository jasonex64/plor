-- The live board's sends (docs/milestones/M07-friends-and-live-board.md, 7c): each run change reaches the player's
-- own board and their friends' boards, and nobody else's, with no spoiler in the payload. Since M12 12d
-- (docs/milestones/M12-12d-decided-fixes.md), a friend who hasn't finished that day gets only the start, as `started`;
-- a friend who has finished gets every change. Run with `npm run test:sql`.
-- Needs the Realtime service running, which creates realtime.messages' daily partitions.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Real puzzles and runs may exist for today; the transaction is rolled back, so clearing them changes nothing.
delete from private.run where game_id = 'offbeat' and puzzle_date = private.today();
delete from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today();
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', private.today(), jsonb_build_object('format', 1, 'game_id', 'offbeat', 'date', private.today()::text,
    'questions', '[{}, {}]'::jsonb));

-- Player p; friend f, who hasn't played; friend g, who has finished today; stranger s.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000007c1', 'p7c@example.test'),
  ('00000000-0000-0000-0000-0000000007c2', 'f7c@example.test'),
  ('00000000-0000-0000-0000-0000000007c3', 's7c@example.test'),
  ('00000000-0000-0000-0000-0000000007c4', 'g7c@example.test');
insert into private.profile (user_id, username) values
  ('00000000-0000-0000-0000-0000000007c1', 'p7c'),
  ('00000000-0000-0000-0000-0000000007c2', 'f7c'),
  ('00000000-0000-0000-0000-0000000007c3', 's7c'),
  ('00000000-0000-0000-0000-0000000007c4', 'g7c');
insert into private.friendship (user_a, user_b) values
  ('00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-0000000007c2'),
  ('00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-0000000007c4');
insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000007c4', 'offbeat', private.today());
insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
  values ('00000000-0000-0000-0000-0000000007c4', 'offbeat', private.today(), 0, 'tiger', true);

-- What reached a board about p's run.
create function pg_temp.sent(who text) returns jsonb[] language sql
  return (select coalesce(array_agg(payload - 'id' order by inserted_at, id), '{}') from realtime.messages
          where topic = 'board:' || who and event = 'friend_status' and payload ->> 'username' = 'p7c');

insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000007c1', 'offbeat', private.today());
select is(pg_temp.sent('00000000-0000-0000-0000-0000000007c2'),
  array[jsonb_build_object('v', 2, 'type', 'friend_status', 'username', 'p7c', 'gameId', 'offbeat', 'puzzleDate', private.today(),
    'state', 'started', 'question', null)],
  'starting a run sends a friend who hasn''t finished only who, which day, and started');
select is(pg_temp.sent('00000000-0000-0000-0000-0000000007c4'),
  array[jsonb_build_object('v', 2, 'type', 'friend_status', 'username', 'p7c', 'gameId', 'offbeat', 'puzzleDate', private.today(),
    'state', 'playing', 'question', 1)],
  'and a friend who has finished playing, and on which question');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000007c1'), 1), 1, 'and the player''s own board');
select is(pg_temp.sent('00000000-0000-0000-0000-0000000007c3'), '{}'::jsonb[], 'and not a stranger''s board');
select ok((select bool_and(private) from realtime.messages where topic like 'board:00000000-0000-0000-0000-0000000007c%'),
  'every board message is private');

insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
  values ('00000000-0000-0000-0000-0000000007c1', 'offbeat', private.today(), 0, 'lion', false);
insert into private.question_open (user_id, game_id, puzzle_date, question_idx)
  values ('00000000-0000-0000-0000-0000000007c1', 'offbeat', private.today(), 1);
select is((pg_temp.sent('00000000-0000-0000-0000-0000000007c4'))[3] ->> 'question', '2',
  'answering and opening the next question sends a finished friend each change, now on question 2');
select is((pg_temp.sent('00000000-0000-0000-0000-0000000007c1'))[3] ->> 'question', '2', 'and the player''s own board');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000007c2'), 1), 1,
  'but a friend who hasn''t finished gets nothing after the start');

insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
  values ('00000000-0000-0000-0000-0000000007c1', 'offbeat', private.today(), 1, 'tiger', true);
select is((pg_temp.sent('00000000-0000-0000-0000-0000000007c4'))[4],
  jsonb_build_object('v', 2, 'type', 'friend_status', 'username', 'p7c', 'gameId', 'offbeat', 'puzzleDate', private.today(),
    'state', 'finished', 'question', null),
  'a caught run is sent to a finished friend as finished, with nothing about how it ended');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000007c2'), 1), 1,
  'and not to a friend who hasn''t finished');
select ok(not exists (select from realtime.messages where topic like 'board:00000000-0000-0000-0000-0000000007c%'
  and (payload::text like '%tiger%' or payload::text like '%matched%' or payload::text like '%died%')),
  'no board message names the answer or the catch');

select policies_are('realtime', 'messages', array['board_own_topic_select'],
  'the only policy on realtime.messages is the own-board read policy');

-- What the policy lets a signed-in browser read, the way Realtime checks a join: as `authenticated`, with the
-- user's JWT claims and the topic being joined (Supabase Realtime /authorization; realtime.topic() reads the
-- realtime.topic setting). The friend f tries the player's board, then their own.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000007c2", "role": "authenticated"}';
set local realtime.topic to 'board:00000000-0000-0000-0000-0000000007c1';
select is((select count(*)::int from realtime.messages where topic = 'board:00000000-0000-0000-0000-0000000007c1'), 0,
  'a user cannot read another user''s board');
set local realtime.topic to 'board:00000000-0000-0000-0000-0000000007c2';
select is((select count(*)::int from realtime.messages where topic = 'board:00000000-0000-0000-0000-0000000007c2'), 1,
  'a user can read their own board');
-- Back to postgres, not `reset role`: a remote run's session role is cli_login_postgres, which can't see pgTAP.
set local role postgres;

select * from finish();
rollback;
