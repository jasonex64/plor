-- Fragments' live board sends (docs/milestones/M16-16f-the-shared-pieces.md, 16f-6; docs/DECISIONS.md, Log 2026-11-14,
-- "Fragments' live board: what is broadcast"): a Fragments run and each word given reach the player's own board and their
-- friends' boards, and nobody else's, with the same payload and the same gate as Offbeat's (live_board.test.sql): a friend
-- who hasn't finished Fragments gets only the start. Nothing of a word or a score is in a payload. Run with
-- `npm run test:sql`. Needs the Realtime service running, which creates realtime.messages' daily partitions.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(14);

create temp table d as select private.today() + 441 as day;
insert into private.puzzle (game_id, puzzle_date, content)
select 'substrings', day, jsonb_build_object('format', 1, 'game_id', 'substrings', 'date', day,
  'rounds', '["ck", "ro", "af"]'::jsonb, 'bonus_letter', 'f')
from d;

-- Player p; friend f, who hasn't finished Fragments; friend g, who has; stranger s.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000016d1', 'p16d@example.test'),
  ('00000000-0000-0000-0000-0000000016d2', 'f16d@example.test'),
  ('00000000-0000-0000-0000-0000000016d3', 's16d@example.test'),
  ('00000000-0000-0000-0000-0000000016d4', 'g16d@example.test');
insert into private.profile (user_id, username) values
  ('00000000-0000-0000-0000-0000000016d1', 'p16d'),
  ('00000000-0000-0000-0000-0000000016d2', 'f16d'),
  ('00000000-0000-0000-0000-0000000016d3', 's16d'),
  ('00000000-0000-0000-0000-0000000016d4', 'g16d');
insert into private.friendship (user_a, user_b) values
  ('00000000-0000-0000-0000-0000000016d1', '00000000-0000-0000-0000-0000000016d2'),
  ('00000000-0000-0000-0000-0000000016d1', '00000000-0000-0000-0000-0000000016d4');

-- g finishes Fragments: a word in each of the three rounds.
insert into private.run (user_id, game_id, puzzle_date) select '00000000-0000-0000-0000-0000000016d4', 'substrings', day from d;
insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word)
  select '00000000-0000-0000-0000-0000000016d4', 'substrings', day, 0, 'rocks', 'rocks' from d;
insert into private.question_open (user_id, game_id, puzzle_date, question_idx)
  select '00000000-0000-0000-0000-0000000016d4', 'substrings', day, 1 from d;
insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word)
  select '00000000-0000-0000-0000-0000000016d4', 'substrings', day, 1, 'brown', 'brown' from d;
insert into private.question_open (user_id, game_id, puzzle_date, question_idx)
  select '00000000-0000-0000-0000-0000000016d4', 'substrings', day, 2 from d;
insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word)
  select '00000000-0000-0000-0000-0000000016d4', 'substrings', day, 2, 'safari', 'safari' from d;

-- What reached a board about p's Fragments run.
create function pg_temp.sent(who text) returns jsonb[] language sql
  return (select coalesce(array_agg(payload - 'id' order by inserted_at, id), '{}') from realtime.messages
          where topic = 'board:' || who and event = 'friend_status' and payload ->> 'username' = 'p16d');
create function pg_temp.msg(state text, q int) returns jsonb language sql
  return (select jsonb_build_object('v', 2, 'type', 'friend_status', 'username', 'p16d', 'gameId', 'substrings', 'puzzleDate', day,
                                    'state', state, 'question', q) from d);

insert into private.run (user_id, game_id, puzzle_date) select '00000000-0000-0000-0000-0000000016d1', 'substrings', day from d;
select is(pg_temp.sent('00000000-0000-0000-0000-0000000016d2'), array[pg_temp.msg('started', null)],
  'starting a Fragments run sends a friend who hasn''t finished Fragments only who, which game, which day, and started');
select is(pg_temp.sent('00000000-0000-0000-0000-0000000016d4'), array[pg_temp.msg('playing', 1)],
  'and a friend who has finished Fragments, on which round');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000016d1'), 1), 1, 'and the player''s own board');
select is(pg_temp.sent('00000000-0000-0000-0000-0000000016d3'), '{}'::jsonb[], 'and not a stranger''s board');

insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word)
  select '00000000-0000-0000-0000-0000000016d1', 'substrings', day, 0, 'stack', 'stack' from d;
select is(pg_temp.sent('00000000-0000-0000-0000-0000000016d4'), array[pg_temp.msg('playing', 1), pg_temp.msg('playing', 2)],
  'a word given sends a finished friend the next round');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000016d2'), 1), 1,
  'but a friend who hasn''t finished gets nothing from a word');

insert into private.question_open (user_id, game_id, puzzle_date, question_idx)
  select '00000000-0000-0000-0000-0000000016d1', 'substrings', day, 1 from d;
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000016d4'), 1), 3, 'opening the next round sends a finished friend that too');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000016d2'), 1), 1, 'and still not a friend who hasn''t finished');

insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word)
  select '00000000-0000-0000-0000-0000000016d1', 'substrings', day, 1, 'brown', 'brown' from d;
insert into private.question_open (user_id, game_id, puzzle_date, question_idx)
  select '00000000-0000-0000-0000-0000000016d1', 'substrings', day, 2 from d;
insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word)
  select '00000000-0000-0000-0000-0000000016d1', 'substrings', day, 2, 'cafe', 'cafe' from d;
select is((pg_temp.sent('00000000-0000-0000-0000-0000000016d4'))[array_length(pg_temp.sent('00000000-0000-0000-0000-0000000016d4'), 1)],
  pg_temp.msg('finished', null), 'the last word is sent to a finished friend as finished');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000016d2'), 1), 1, 'and not to a friend who hasn''t finished');
select ok(not exists (select from realtime.messages where topic like 'board:00000000-0000-0000-0000-0000000016d%'
  and event = 'friend_status' and (payload::text ~* '(rocks|brown|safari|stack|cafe|word|score|points)')),
  'no board message names a word or a score');
select ok((select bool_and(private) from realtime.messages where topic like 'board:00000000-0000-0000-0000-0000000016d%'),
  'every board message is private');

-- tgtype 5: a row trigger (1), after (no 2), on insert (4).
select is((select tgtype::int from pg_trigger where tgrelid = 'private.round_word'::regclass and tgname = 'round_word_broadcast_board'), 5,
  'a word given has an after-insert row trigger');
select ok((select p.proname = 'broadcast_board' and p.prosecdef and p.proconfig = array['search_path=""'] from pg_trigger t
           join pg_proc p on p.oid = t.tgfoid where t.tgname = 'round_word_broadcast_board'),
  'running the one board function, with its owner''s rights and an empty search_path');

select * from finish();
rollback;
