-- Guest play's data (docs/milestones/M18-guest-play.md, 18b; DECISIONS.md, Current, "Guest play"): the tables, what
-- plor_app may touch, the tally, the two delete functions, and the same order, clock and round rules as a signed-in
-- run's, run on both table sets with the same cases. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(122);

-- Real puzzles and runs may exist for the days used here. The whole file runs in one transaction that is rolled back.
delete from private.guest_run where puzzle_date between private.today() - 1 and private.today() + 445;
delete from private.run where puzzle_date between private.today() - 1 and private.today() + 445;
delete from private.puzzle where puzzle_date between private.today() - 1 and private.today() + 445;
delete from private.guest_tally where puzzle_date between private.today() - 1 and private.today() + 445;

create function pg_temp.puzzle(day date) returns jsonb language sql
  return jsonb_build_object('format', 1, 'game_id', 'offbeat', 'date', day::text, 'questions', '[{}, {}]'::jsonb);
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', private.today() - 1, pg_temp.puzzle(private.today() - 1)),
  ('offbeat', private.today(), pg_temp.puzzle(private.today()));
create temp table d as select private.today() + 440 as day;
insert into private.puzzle (game_id, puzzle_date, content)
select 'substrings', day, jsonb_build_object('format', 1, 'game_id', 'substrings', 'date', day,
  'rounds', '["ck", "ro", "qxz"]'::jsonb, 'bonus_letter', 'f')
from d;
insert into private.dictionary_word (word_key, spelling, plain, everyday) values
  ('rocks', 'rocks', 'rocks', true), ('backs', 'backs', 'backs', true), ('note', 'note', 'note', true),
  -- A made-up round, so a loaded real list can't change its examples: the first three stand, and two more words don't.
  ('qxzab', 'qxzab', 'qxzab', true), ('aqxzb', 'aqxzb', 'aqxzb', true), ('qxzcd', 'qxzcd', 'qxzcd', true),
  ('qxzefgh', 'qxzefgh', 'qxzefgh', true), ('qxzaa', 'qxzaa', 'qxzaa', false)
on conflict do nothing;

-- The two table sets, so one case runs on both: a player's rows are keyed by user_id, a guest's by the token's hash.
create temp table sides (side text primary key);
insert into sides values ('guest'), ('player');
create function pg_temp.pre(side text) returns text language sql as $$ select case side when 'player' then '' else 'guest_' end $$;
create function pg_temp.kc(side text) returns text language sql as $$ select case side when 'player' then 'user_id' else 'token_hash' end $$;
create function pg_temp.key(side text, n int) returns text language sql as $$
  select case side when 'player' then '00000000-0000-0000-0000-0000000018' || lpad(n::text, 2, '0')
                   else encode(sha256(('guest-' || n)::bytea), 'hex') end $$;
insert into auth.users (id, email)
select pg_temp.key('player', n)::uuid, 'g18-' || n || '@example.test' from generate_series(1, 9) n;

create function pg_temp.run(side text, n int, day date, game text default 'offbeat', ago interval default '0') returns void language plpgsql as $$
begin
  execute format('insert into private.%I (%I, game_id, puzzle_date, started_at) values (%L, %L, %L, statement_timestamp() - %L::interval)',
    pg_temp.pre(side) || 'run', pg_temp.kc(side), pg_temp.key(side, n), game, day, ago);
end $$;
create function pg_temp.ev(side text, n int, day date, idx int, entry text, matched boolean) returns void language plpgsql as $$
begin
  execute format('insert into private.%I (%I, game_id, puzzle_date, question_idx, entry_id, matched) values (%L, ''offbeat'', %L, %s, %L, %L)',
    pg_temp.pre(side) || 'run_event', pg_temp.kc(side), pg_temp.key(side, n), day, idx, entry, matched);
end $$;
create function pg_temp.open(side text, n int, day date, idx int, game text default 'offbeat') returns void language plpgsql as $$
begin
  execute format('insert into private.%I (%I, game_id, puzzle_date, question_idx) values (%L, %L, %L, %s)',
    pg_temp.pre(side) || 'question_open', pg_temp.kc(side), pg_temp.key(side, n), game, day, idx);
end $$;
create function pg_temp.status(side text, n int, day date, game text default 'offbeat') returns text language plpgsql as $$
declare s text;
begin
  execute format('select status from private.%I where %I = %L and game_id = %L and puzzle_date = %L',
    pg_temp.pre(side) || 'run_status', pg_temp.kc(side), pg_temp.key(side, n), game, day) into s;
  return s;
end $$;
create function pg_temp.deadline_null(side text, n int, day date) returns boolean language plpgsql as $$
declare b boolean;
begin
  execute format('select deadline is null from private.%I where %I = %L and game_id = ''offbeat'' and puzzle_date = %L',
    pg_temp.pre(side) || 'run_status', pg_temp.kc(side), pg_temp.key(side, n), day) into b;
  return b;
end $$;
-- A table's row count for one key, whatever the side (the tables of a game 2 run).
create function pg_temp.rows_of(side text, n int, tbl text) returns int language plpgsql as $$
declare c int;
begin
  execute format('select count(*)::int from private.%I where %I = %L', pg_temp.pre(side) || tbl, pg_temp.kc(side), pg_temp.key(side, n)) into c;
  return c;
end $$;
create function pg_temp.judge(side text, n int, p_key text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  if side = 'player' then
    select private.judge_word(pg_temp.key(side, n)::uuid, (select day from d), p_key, p_key, p_key) into r;
  else
    select private.guest_judge_word(pg_temp.key(side, n), (select day from d), p_key, p_key, p_key) into r;
  end if;
  return r;
end $$;
create function pg_temp.unlock() returns void language plpgsql as $$
begin
  update private.round_reject set rejected_at = rejected_at - interval '1 second';
  update private.guest_round_reject set rejected_at = rejected_at - interval '1 second';
end $$;
-- A round's clock run out, as a test can't wait 20 seconds.
create function pg_temp.time_out(side text, n int, round int) returns void language plpgsql as $$
begin
  if round = 0 then
    execute format('update private.%I set started_at = started_at - interval ''21 seconds'' where %I = %L and game_id = ''substrings''',
      pg_temp.pre(side) || 'run', pg_temp.kc(side), pg_temp.key(side, n));
  else
    execute format('update private.%I set opened_at = opened_at - interval ''21 seconds'' where %I = %L and game_id = ''substrings'' and question_idx = %s',
      pg_temp.pre(side) || 'question_open', pg_temp.kc(side), pg_temp.key(side, n), round);
  end if;
end $$;

-- ====================================================================================================================
-- What the tables are
-- ====================================================================================================================
select is((select count(*)::int from pg_constraint c
           where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and c.conrelid::regclass::text like 'private.guest\_%'), 0,
  'no guest table references auth.users');
select is((select count(*)::int from pg_trigger t
           where t.tgrelid::regclass::text like 'private.guest\_%' and t.tgfoid = 'private.broadcast_board()'::regprocedure), 0,
  'no guest table has a board broadcast trigger');
select is((select array_agg(column_name::text order by ordinal_position) from information_schema.columns
           where table_schema = 'private' and table_name = 'guest_tally'),
  array['game_id', 'puzzle_date', 'question_idx', 'entry_id', 'matched', 'n'],
  'guest_tally holds the day, the question, the answer, whether it caught, and a count');
select is((select count(*)::int from information_schema.columns
           where table_schema = 'private' and table_name = 'guest_tally' and column_name ~* '(token|hash|run|time|_at$|created|order|seq|id$)' and column_name <> 'game_id' and column_name <> 'entry_id'), 0,
  'and no column that names a run, a token, a time or an order');
select ok((select bool_and(c.relrowsecurity) from pg_class c where c.relnamespace = 'private'::regnamespace and c.relname like 'guest\_%' and c.relkind = 'r'),
  'every guest table has row-level security on');
select is((select count(*)::int from pg_policies where schemaname = 'private' and tablename like 'guest\_%' and roles <> '{plor_app}'), 0,
  'and its policies are for plor_app alone');

-- What plor_app may touch: no wider than the player tables' (select and insert on the three run tables, select on the
-- status view), the tally and round words read only, nothing on round_reject, no delete anywhere.
select ok(has_table_privilege('plor_app', 'private.guest_run', 'select, insert') and has_table_privilege('plor_app', 'private.guest_run_event', 'select, insert')
  and has_table_privilege('plor_app', 'private.guest_question_open', 'select, insert'), 'plor_app reads and inserts guest runs, answers and opens');
select ok(not has_table_privilege('plor_app', 'private.guest_run', 'update, delete, truncate, references, trigger')
  and not has_table_privilege('plor_app', 'private.guest_run_event', 'update, delete, truncate, references, trigger')
  and not has_table_privilege('plor_app', 'private.guest_question_open', 'update, delete, truncate, references, trigger'), 'and changes none of them');
select ok(not (select bool_or(has_table_privilege('plor_app', c.oid, 'delete')) from pg_class c
               where c.relnamespace = 'private'::regnamespace and c.relname like 'guest\_%' and c.relkind = 'r'), 'plor_app cannot delete from any guest table');
select ok(has_table_privilege('plor_app', 'private.guest_tally', 'select')
  and not has_table_privilege('plor_app', 'private.guest_tally', 'insert, update, delete, truncate, references, trigger'), 'plor_app reads guest_tally and writes none of it');
select ok(has_table_privilege('plor_app', 'private.guest_round_word', 'select')
  and not has_table_privilege('plor_app', 'private.guest_round_word', 'insert, update, delete, truncate, references, trigger'), 'plor_app reads guest_round_word and cannot insert');
select ok(not has_table_privilege('plor_app', 'private.guest_round_reject', 'select, insert, update, delete, truncate, references, trigger'), 'plor_app has nothing on guest_round_reject');
select ok(has_table_privilege('plor_app', 'private.guest_run_status', 'select'), 'plor_app reads the guest status view');
select ok(has_function_privilege('plor_app', 'private.guest_judge_word(text,date,text,text,text)', 'execute')
  and has_function_privilege('plor_app', 'private.guest_round_examples(text,date)', 'execute')
  and has_function_privilege('plor_app', 'private.end_guest_run(text,text)', 'execute')
  and has_function_privilege('plor_app', 'private.purge_guest_days()', 'execute'), 'plor_app runs the guest judge, the examples and the two delete functions');
select ok(not has_function_privilege('plor_app', 'private.count_guest_answer()', 'execute')
  and not has_function_privilege('plor_app', 'private.judge_core(text,text,text,text,text,text,timestamptz,timestamptz,boolean)', 'execute')
  and not has_function_privilege('plor_app', 'private.round_examples_core(date,int[])', 'execute'), 'but not the tally trigger or the judge''s and examples'' cores');
select throws_ok($$insert into private.guest_run (token_hash, game_id, puzzle_date) values ('not a hash', 'offbeat', private.today())$$,
  '23514', null, 'a guest run needs a hashed token');

-- ====================================================================================================================
-- The same order, clock and "over" rules on both table sets (game.test.sql's cases: OB002, OB003, OB005, OB006)
-- ====================================================================================================================
select pg_temp.run(side, 1, private.today()) from sides;
select throws_ok(format('select pg_temp.ev(%L, 1, private.today(), 1, ''x'', false)', side), 'OB002', null, side || ': question 2 cannot be answered before question 1') from sides order by side;
select lives_ok(format('select pg_temp.ev(%L, 1, private.today(), 0, ''x'', false)', side), side || ': question 1 is answered') from sides order by side;
select is(pg_temp.status(side, 1, private.today()), 'in_progress', side || ': a run with questions left and no match is in progress') from sides order by side;
select throws_ok(format('select pg_temp.ev(%L, 1, private.today(), 0, ''y'', false)', side), 'OB002', null, side || ': an answered question cannot be answered again') from sides order by side;
select ok(pg_temp.deadline_null(side, 1, private.today()), side || ': a run at the reveal has no deadline') from sides order by side;
select throws_ok(format('select pg_temp.ev(%L, 1, private.today(), 1, ''host'', true)', side), 'OB006', null, side || ': question 2 cannot be answered before Next opens it') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 1, private.today(), 0)', side), 'OB002', null, side || ': Next cannot open question 1 again') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 1, private.today(), 2)', side), 'OB002', null, side || ': Next opens only the question after the last answer') from sides order by side;
select lives_ok(format('select pg_temp.open(%L, 1, private.today(), 1)', side), side || ': Next opens question 2') from sides order by side;
select lives_ok(format('select pg_temp.ev(%L, 1, private.today(), 1, ''y'', false)', side), side || ': question 2 is answered') from sides order by side;
select is(pg_temp.status(side, 1, private.today()), 'survived', side || ': a run that answered every question without a match survived') from sides order by side;
select throws_ok(format('select pg_temp.ev(%L, 1, private.today(), 2, ''z'', false)', side), 'OB003', null, side || ': nothing can be answered after the last question') from sides order by side;

select pg_temp.run(side, 2, private.today()) from sides;
select pg_temp.ev(side, 2, private.today(), 0, 'x', true) from sides;
select is(pg_temp.status(side, 2, private.today()), 'died', side || ': a run with a match died') from sides order by side;
select throws_ok(format('select pg_temp.ev(%L, 2, private.today(), 1, ''y'', false)', side), 'OB003', null, side || ': nothing can be answered after a match') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 2, private.today(), 1)', side), 'OB003', null, side || ': Next opens nothing after a match') from sides order by side;

-- 20 seconds a question: the timer, not midnight, ends an unfinished run.
select pg_temp.run(side, 3, private.today() - 1) from sides;
select lives_ok(format('select pg_temp.ev(%L, 3, private.today() - 1, 0, ''x'', false)', side), side || ': a run started before the reset can be answered after it') from sides order by side;
select pg_temp.run(side, 4, private.today(), 'offbeat', interval '21 seconds') from sides;
select throws_ok(format('select pg_temp.ev(%L, 4, private.today(), 0, ''x'', false)', side), 'OB005', null, side || ': an answer after the question''s 20 seconds is time_up') from sides order by side;
select is(pg_temp.status(side, 4, private.today()), 'timed_out', side || ': a run whose question ran out of time is timed out') from sides order by side;

-- ====================================================================================================================
-- Game 2's lockout and round rules on both table sets (game_2_rounds.test.sql's cases)
-- ====================================================================================================================
select is(pg_temp.judge(side, 5, 'rocks') ->> 'outcome', 'no_run', side || ': no run, no judging') from sides order by side;
select pg_temp.run(side, 5, (select day from d), 'substrings') from sides;
select is(pg_temp.status(side, 5, (select day from d), 'substrings'), 'in_progress', side || ': a new game 2 run is in progress') from sides order by side;
select is(pg_temp.judge(side, 5, '') ->> 'outcome', 'empty', side || ': an empty try is not judged') from sides order by side;
select is(pg_temp.judge(side, 5, 'zzzzz') ->> 'outcome', 'not_a_word', side || ': a word outside the dictionary is refused') from sides order by side;
select is(pg_temp.rows_of(side, 5, 'round_reject'), 1, side || ': and locks') from sides order by side;
select is(pg_temp.judge(side, 5, 'rocks') ->> 'outcome', 'locked', side || ': the next try within 0.5 s is refused unjudged') from sides order by side;
select is(pg_temp.rows_of(side, 5, 'round_reject'), 1, side || ': and adds no second lock') from sides order by side;
select pg_temp.unlock();
select is(pg_temp.judge(side, 5, 'note') ->> 'outcome', 'needs_letters', side || ': a word without the round''s letters is refused') from sides order by side;
select pg_temp.unlock();
select throws_ok(format('select pg_temp.open(%L, 5, (select day from d), 1, ''substrings'')', side), 'OB014', null, side || ': Next is refused while the round runs') from sides order by side;
select is(pg_temp.judge(side, 5, 'rocks'), jsonb_build_object('outcome', 'accepted', 'word', 'rocks'), side || ': a word with the letters is accepted, shown as stored') from sides order by side;
select is(pg_temp.rows_of(side, 5, 'round_word'), 1, side || ': and stored') from sides order by side;
select is(pg_temp.judge(side, 5, 'rocks') ->> 'outcome', 'accepted', side || ': a retry of the stored word returns it') from sides order by side;
select is(pg_temp.judge(side, 5, 'backs') ->> 'outcome', 'already_answered', side || ': another word for a filled round is refused') from sides order by side;
select pg_temp.time_out(side, 5, 0) from sides;
select is(pg_temp.judge(side, 5, 'rocks') ->> 'word', 'rocks', side || ': a retry of the stored word returns it past the clock too') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 5, (select day from d), 2, ''substrings'')', side), 'OB002', null, side || ': a round can''t be skipped') from sides order by side;
select pg_temp.open(side, 5, (select day from d), 1, 'substrings') from sides;
select lives_ok(format($q$insert into private.%I (%I, game_id, puzzle_date, question_idx) values (%L, 'substrings', (select day from d), 1) on conflict do nothing$q$,
  pg_temp.pre(side) || 'question_open', pg_temp.kc(side), pg_temp.key(side, 5)), side || ': a second tap on Next is harmless') from sides order by side;
select is(pg_temp.judge(side, 5, 'rocks') ->> 'outcome', 'already_used', side || ': no word twice in a run') from sides order by side;
select pg_temp.unlock();
select pg_temp.time_out(side, 5, 1) from sides;
select is(pg_temp.judge(side, 5, 'rocks') ->> 'outcome', 'time_up', side || ': no try past the 20 seconds') from sides order by side;
select pg_temp.open(side, 5, (select day from d), 2, 'substrings') from sides;
select is(pg_temp.status(side, 5, (select day from d), 'substrings'), 'in_progress', side || ': round 3 is playing') from sides order by side;
select pg_temp.time_out(side, 5, 2) from sides;
select is(pg_temp.status(side, 5, (select day from d), 'substrings'), 'survived', side || ': a run ends after the last round''s timeout') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 5, (select day from d), 3, ''substrings'')', side), 'OB003', null, side || ': never past the last round') from sides order by side;
select is(
  case side when 'player' then (select words from private.round_examples(pg_temp.key(side, 5)::uuid, (select day from d)) where round_idx = 2)
            else (select words from private.guest_round_examples(pg_temp.key(side, 5), (select day from d)) where round_idx = 2) end,
  array['aqxzb', 'qxzab', 'qxzcd'], side || ': a missed round gets three everyday words, shortest first') from sides order by side;
select is(
  case side when 'player' then (select count(*)::int from private.round_examples(pg_temp.key(side, 5)::uuid, (select day from d)) where round_idx = 0)
            else (select count(*)::int from private.guest_round_examples(pg_temp.key(side, 5), (select day from d)) where round_idx = 0) end,
  0, side || ': a round with a word gets none') from sides order by side;

-- ====================================================================================================================
-- The tally: counts answers with no one attached, only while the answer's day is open, once per answer
-- ====================================================================================================================
create function pg_temp.tally(day date) returns int language sql as $$
  select coalesce(sum(n), 0)::int from private.guest_tally where game_id = 'offbeat' and puzzle_date = day and question_idx = 0 and entry_id = 'shared' $$;
select is(pg_temp.tally(private.today()), 0, 'before the answers, the tally holds none for the entry');
select pg_temp.run('guest', 10 + n, private.today()) from generate_series(1, 5) n;
select pg_temp.ev('guest', 10 + n, private.today(), 0, 'shared', n = 1) from generate_series(1, 5) n;
select is(pg_temp.tally(private.today()), 5, 'five guest answers to one entry add exactly five');
select is((select n from private.guest_tally where puzzle_date = private.today() and question_idx = 0 and entry_id = 'shared' and matched), 1, 'the catch is counted apart: one caught');
select is((select n from private.guest_tally where puzzle_date = private.today() and question_idx = 0 and entry_id = 'shared' and not matched), 4, 'and four that were not');
select throws_ok($$insert into private.guest_run_event (token_hash, game_id, puzzle_date, question_idx, entry_id, matched)
  values (pg_temp.key('guest', 12), 'offbeat', private.today(), 0, 'shared', false)$$, 'OB002', null, 'a retried answer is refused by the order rule before any count (the before-insert trigger runs ahead of on conflict)');
select is(pg_temp.tally(private.today()), 5, 'and the tally has not moved');
select pg_temp.run('player', 9, private.today());
select pg_temp.ev('player', 9, private.today(), 0, 'player-only', false);
select is((select count(*)::int from private.guest_tally where entry_id = 'player-only'), 0, 'a player''s answer never reaches the tally');
-- The day closed: a run on yesterday, answered now, is an answer after that day's midnight.
select pg_temp.run('guest', 20, private.today() - 1);
select pg_temp.ev('guest', 20, private.today() - 1, 0, 'shared', false);
select is(pg_temp.tally(private.today() - 1), 0, 'an answer after the day''s midnight leaves the tally unchanged');
select is(pg_temp.rows_of('guest', 20, 'run_event'), 1, 'though its answer row is written and the run goes on');

-- ====================================================================================================================
-- Ending a run, and a closed day's purge: no row carries the token's hash, the tally stays
-- ====================================================================================================================
select throws_ok($$select private.end_guest_run(pg_temp.key('guest', 13), 'offbeat')$$, 'OB015', null, 'a run still going cannot be ended');
select is(pg_temp.rows_of('guest', 13, 'run'), 1, 'and keeps its rows');
select lives_ok($$select private.end_guest_run(pg_temp.key('guest', 11), 'offbeat')$$, 'a run that died is ended');
select is(pg_temp.rows_of('guest', 11, 'run') + pg_temp.rows_of('guest', 11, 'run_event') + pg_temp.rows_of('guest', 11, 'question_open')
  + pg_temp.rows_of('guest', 11, 'round_word') + pg_temp.rows_of('guest', 11, 'round_reject'), 0, 'no guest row carries its hash');
select lives_ok($$select private.end_guest_run(pg_temp.key('guest', 99), 'offbeat')$$, 'a run that is not there is already ended');
select is(pg_temp.tally(private.today()), 5, 'the tally keeps every answer after the runs end');
-- Game 2's end takes the round words and rejections with it, and only that game's run: the token also has a game 1 run.
select pg_temp.run('guest', 5, private.today());
select lives_ok($$select private.end_guest_run(pg_temp.key('guest', 5), 'substrings')$$, 'a finished game 2 run is ended');
select is(pg_temp.rows_of('guest', 5, 'question_open') + pg_temp.rows_of('guest', 5, 'round_word') + pg_temp.rows_of('guest', 5, 'round_reject'), 0, 'with its words, rejections and opens');
select is(pg_temp.rows_of('guest', 5, 'run'), 1, 'while the same token''s game 1 run stays');
-- A closed day's runs go at the next purge, and only they.
select lives_ok($$select private.purge_guest_days()$$, 'a purge runs');
select is((select count(*)::int from private.guest_run where puzzle_date < private.today()), 0, 'no guest run of a closed day is left');
select is((select count(*)::int from private.guest_run_event where puzzle_date < private.today()), 0, 'nor its answers');
select is(pg_temp.rows_of('guest', 20, 'run') + pg_temp.rows_of('guest', 20, 'run_event'), 0, 'no row carries its hash');
select ok((select count(*)::int from private.guest_run where puzzle_date = private.today()) > 0, 'today''s runs stay');
select is((select count(*)::int from private.guest_run), 8, 'and exactly today''s eight');

select * from finish();
rollback;
