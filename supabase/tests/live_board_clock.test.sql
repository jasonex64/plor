-- The live board on a day on a clock (docs/milestones/M23-23d-the-screens.md, "The live board"; the human, 2026-11-25, answer
-- 47): a run's start, each accepted answer, each Next and its Finish reach the player's own board and every friend's, a friend
-- who has not played included, as friend_status version 3 with the run's points. A stranger hears nothing, and no message holds an
-- answer. A format 3 day's messages are live_board.test.sql's. Run with `npm run test:sql`. Needs the Realtime service running.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Real puzzles and runs may exist for today. The whole file runs in one transaction that is rolled back.
delete from private.run where puzzle_date = private.today();
delete from private.puzzle where puzzle_date = private.today();
insert into private.puzzle (game_id, puzzle_date, content)
values ('offbeat', private.today(), jsonb_build_object('format', 4, 'game_id', 'offbeat', 'date', private.today()::text,
  'questions', jsonb_build_array(
    '{"prompt": "one", "levels": {"secretanswer": "uncommon", "hiddenword": "common"}}'::jsonb,
    '{"prompt": "two", "levels": {}}'::jsonb,
    '{"prompt": "three", "levels": {}}'::jsonb)));

-- Player p; friend f, who plays nothing; stranger s.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c0d1', 'p23@example.test'),
  ('00000000-0000-0000-0000-00000000c0d2', 'f23@example.test'),
  ('00000000-0000-0000-0000-00000000c0d3', 's23@example.test');
insert into private.profile (user_id, username) values
  ('00000000-0000-0000-0000-00000000c0d1', 'p23c'),
  ('00000000-0000-0000-0000-00000000c0d2', 'f23c'),
  ('00000000-0000-0000-0000-00000000c0d3', 's23c');
insert into private.friendship (user_a, user_b) values ('00000000-0000-0000-0000-00000000c0d1', '00000000-0000-0000-0000-00000000c0d2');

-- What reached a board about p's run, without realtime.send's own `id`, a random uuid.
create function pg_temp.sent(who text) returns jsonb[] language sql
  return (select coalesce(array_agg(payload - 'id' order by inserted_at, id), '{}') from realtime.messages
          where topic = 'board:' || who and event = 'friend_status' and payload ->> 'username' = 'p23c');
create function pg_temp.msg(state text, q int, points int) returns jsonb language sql
  return jsonb_build_object('v', 3, 'type', 'friend_status', 'username', 'p23c', 'gameId', 'offbeat', 'puzzleDate', private.today(),
                            'state', state, 'question', q, 'points', points);

insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-00000000c0d1', 'offbeat', private.today());
select is(pg_temp.sent('00000000-0000-0000-0000-00000000c0d2'), array[pg_temp.msg('playing', 1, 0)],
  'starting a clock run sends a friend who has not played the question and the points, not only "started"');
select is(pg_temp.sent('00000000-0000-0000-0000-00000000c0d1'), array[pg_temp.msg('playing', 1, 0)], 'and the player''s own board');
select is(pg_temp.sent('00000000-0000-0000-0000-00000000c0d3'), '{}'::jsonb[], 'and not a stranger''s board');

insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id)
values ('00000000-0000-0000-0000-00000000c0d1', 'offbeat', private.today(), 0, 'secretanswer');
select is((pg_temp.sent('00000000-0000-0000-0000-00000000c0d2'))[2], pg_temp.msg('playing', 1, 25),
  'an accepted uncommon answer sends the points it earned');
insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id)
values ('00000000-0000-0000-0000-00000000c0d1', 'offbeat', private.today(), 0, 'hiddenword');
select is((pg_temp.sent('00000000-0000-0000-0000-00000000c0d2'))[3], pg_temp.msg('playing', 1, 35), 'and the next answer the points so far');

insert into private.question_open (user_id, game_id, puzzle_date, question_idx)
values ('00000000-0000-0000-0000-00000000c0d1', 'offbeat', private.today(), 1);
select is((pg_temp.sent('00000000-0000-0000-0000-00000000c0d2'))[4], pg_temp.msg('playing', 2, 35), 'Next sends the next question with the points');

insert into private.question_open (user_id, game_id, puzzle_date, question_idx)
values ('00000000-0000-0000-0000-00000000c0d1', 'offbeat', private.today(), 2);
insert into private.clock_finish (user_id, game_id, puzzle_date)
values ('00000000-0000-0000-0000-00000000c0d1', 'offbeat', private.today());
select is((pg_temp.sent('00000000-0000-0000-0000-00000000c0d2'))[array_length(pg_temp.sent('00000000-0000-0000-0000-00000000c0d2'), 1)],
  pg_temp.msg('finished', null, 35), 'Finish sends finished with the points');

select ok(not exists (select from realtime.messages where topic like 'board:00000000-0000-0000-0000-00000000c0d%'
  and event = 'friend_status' and ((payload - 'id')::text ~* '(secret|hidden|answer|entry|word)')),
  'no board message names an answer');
select ok((select bool_and(private) from realtime.messages where topic like 'board:00000000-0000-0000-0000-00000000c0d%'),
  'every board message is private');

select * from finish();
rollback;
