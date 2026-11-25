-- The run on a clock (docs/milestones/M23-23c-the-run-on-a-clock.md): the numbers, and an answer's, Next's and
-- Finish's rules on a format 4 day, run on a player's tables and a guest's with the same cases. Two tabs at once and
-- the app role are in src/game/clock-runs.plor-app.db.test.ts. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(88);

-- Real puzzles and runs may exist for the days used here. The whole file runs in one transaction that is rolled back.
delete from private.guest_run where puzzle_date between private.today() - 1 and private.today();
delete from private.run where puzzle_date between private.today() - 1 and private.today();
delete from private.puzzle where puzzle_date between private.today() - 1 and private.today();

-- Today is a clock day of three questions; yesterday is a day of another format.
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', private.today(), jsonb_build_object('format', 4, 'game_id', 'offbeat', 'date', private.today()::text,
    'questions', jsonb_build_array(
      '{"prompt": "one", "levels": {"c1": "common", "c2": "common", "u1": "uncommon"}}'::jsonb,
      '{"prompt": "two", "levels": {"c1": "common"}}'::jsonb,
      '{"prompt": "three", "levels": {}}'::jsonb))),
  ('offbeat', private.today() - 1, jsonb_build_object('format', 1, 'game_id', 'offbeat', 'date', (private.today() - 1)::text,
    'questions', '[{}, {}]'::jsonb));

-- The two table sets, so one case runs on both (as guest_play.test.sql).
create temp table sides (side text primary key);
insert into sides values ('guest'), ('player');
create function pg_temp.pre(side text) returns text language sql as $$ select case side when 'player' then '' else 'guest_' end $$;
create function pg_temp.kc(side text) returns text language sql as $$ select case side when 'player' then 'user_id' else 'token_hash' end $$;
create function pg_temp.key(side text, n int) returns text language sql as $$
  select case side when 'player' then '00000000-0000-0000-0000-0000000023' || lpad(n::text, 2, '0')
                   else encode(sha256(('clock-' || n)::bytea), 'hex') end $$;
insert into auth.users (id, email)
select pg_temp.key('player', n)::uuid, 'c23-' || n || '@example.test' from generate_series(1, 9) n;

create function pg_temp.run(side text, n int, day date, ago interval default '0') returns void language plpgsql as $$
begin
  execute format('insert into private.%I (%I, game_id, puzzle_date, started_at) values (%L, ''offbeat'', %L, clock_timestamp() - %L::interval)',
    pg_temp.pre(side) || 'run', pg_temp.kc(side), pg_temp.key(side, n), day, ago);
end $$;
-- Moves a run's start back, as time passing would.
create function pg_temp.pass(side text, n int, gone interval) returns void language plpgsql as $$
begin
  execute format('update private.%I set started_at = started_at - %L::interval where %I = %L',
    pg_temp.pre(side) || 'run', gone, pg_temp.kc(side), pg_temp.key(side, n));
end $$;
create function pg_temp.ans(side text, n int, day date, idx int, entry text) returns void language plpgsql as $$
begin
  execute format('insert into private.%I (%I, game_id, puzzle_date, question_idx, entry_id) values (%L, ''offbeat'', %L, %s, %L)',
    pg_temp.pre(side) || 'clock_answer', pg_temp.kc(side), pg_temp.key(side, n), day, idx, entry);
end $$;
-- An insert that names its own tier, time, points and moment: the trigger's are stored.
create function pg_temp.forged(side text, n int, idx int, entry text) returns void language plpgsql as $$
begin
  execute format('insert into private.%I (%I, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at)
                  values (%L, ''offbeat'', private.today(), %s, %L, ''rare'', 999999, 999, ''2000-01-01'')',
    pg_temp.pre(side) || 'clock_answer', pg_temp.kc(side), pg_temp.key(side, n), idx, entry);
end $$;
create function pg_temp.got(side text, n int, idx int, entry text) returns text language plpgsql as $$
declare s text;
begin
  execute format('select tier || '' '' || added_ms || '' '' || points from private.%I where %I = %L and question_idx = %s and entry_id = %L',
    pg_temp.pre(side) || 'clock_answer', pg_temp.kc(side), pg_temp.key(side, n), idx, entry) into s;
  return s;
end $$;
create function pg_temp.open(side text, n int, day date, idx int) returns void language plpgsql as $$
begin
  execute format('insert into private.%I (%I, game_id, puzzle_date, question_idx) values (%L, ''offbeat'', %L, %s) on conflict do nothing',
    pg_temp.pre(side) || 'question_open', pg_temp.kc(side), pg_temp.key(side, n), day, idx);
end $$;
create function pg_temp.fin(side text, n int, day date) returns void language plpgsql as $$
begin
  execute format('insert into private.%I (%I, game_id, puzzle_date) values (%L, ''offbeat'', %L)',
    pg_temp.pre(side) || 'clock_finish', pg_temp.kc(side), pg_temp.key(side, n), day);
end $$;
create function pg_temp.rows_of(side text, n int, tbl text) returns int language plpgsql as $$
declare c int;
begin
  execute format('select count(*)::int from private.%I where %I = %L', pg_temp.pre(side) || tbl, pg_temp.kc(side), pg_temp.key(side, n)) into c;
  return c;
end $$;
-- One column of the run's status row, as text.
create function pg_temp.status(side text, n int, col text) returns text language plpgsql as $$
declare s text;
begin
  execute format('select %I::text from private.%I where %I = %L and game_id = ''offbeat''',
    col, pg_temp.pre(side) || 'run_status', pg_temp.kc(side), pg_temp.key(side, n)) into s;
  return s;
end $$;
-- How long after its start the run ends.
create function pg_temp.lasts(side text, n int) returns interval language plpgsql as $$
declare i interval;
begin
  execute format('select s.deadline - r.started_at from private.%I s join private.%I r using (%I, game_id, puzzle_date) where %I = %L',
    pg_temp.pre(side) || 'run_status', pg_temp.pre(side) || 'run', pg_temp.kc(side), pg_temp.kc(side), pg_temp.key(side, n)) into i;
  return i;
end $$;

-- ---- The numbers (the ticket's Numbers) ----
select is(private.clock_start_ms(), 20000, 'the clock starts at 20 seconds');
select is(private.clock_added_ms('common', 0), 3000, 'a first common answer adds 3 seconds');
select is(private.clock_added_ms('uncommon', 0), 5000, 'a first uncommon answer adds 5 seconds');
select is(private.clock_added_ms('rare', 0), 8000, 'a first rare answer adds 8 seconds');
select is(private.clock_added_ms('common', 19), 1132, 'the twentieth answer, a common one, adds 3 seconds x 0.95^19');
select is(private.clock_added_ms('common', 21), 1022, 'a common answer still shrinks at the twenty-second');
select is(private.clock_added_ms('common', 22), 1000, 'no answer adds under a second');
select is(private.clock_added_ms('rare', 60), 1000, 'nor a rare one, however late');
select is(array[private.clock_points('common'), private.clock_points('uncommon'), private.clock_points('rare')], array[10, 25, 50],
  'points are 10, 25 and 50 by tier');
select is(private.clock_added_ms('rare', 19), 3019, 'the twentieth answer, a rare one, adds 8 seconds x 0.95^19');

-- ---- A run ----
select pg_temp.run(side, 1, private.today()) from sides;
select is(pg_temp.status(side, 1, 'status'), 'in_progress', side || ': a started run is in progress') from sides order by side;
select is(pg_temp.lasts(side, 1), interval '20 seconds', side || ': it ends 20 seconds after its start') from sides order by side;

select pg_temp.ans(side, 1, private.today(), 0, 'c1') from sides;
select is(pg_temp.got(side, 1, 0, 'c1'), 'common 3000 10', side || ': a first common answer') from sides order by side;
select pg_temp.ans(side, 1, private.today(), 0, 'u1') from sides;
select is(pg_temp.got(side, 1, 0, 'u1'), 'uncommon 4750 25', side || ': then an uncommon one, 5% less time') from sides order by side;
select pg_temp.ans(side, 1, private.today(), 0, 'zz') from sides;
select is(pg_temp.got(side, 1, 0, 'zz'), 'rare 7220 50', side || ': then one the levels do not name, rare, 5% less again') from sides order by side;
select is(pg_temp.lasts(side, 1), interval '34.97 seconds', side || ': the end moved by what the answers added') from sides order by side;

select pg_temp.forged(side, 1, 0, 'c2') from sides;
select is(pg_temp.got(side, 1, 0, 'c2'), 'common 2572 10', side || ': an insert that names its own tier, time and points gets the trigger''s') from sides order by side;
select ok((select pg_temp.rows_of(side, 1, 'clock_answer') = 4), side || ': four answers so far') from sides order by side;

select lives_ok(format('select pg_temp.ans(%L, 1, private.today(), 0, ''c1'')', side), side || ': a repeated answer raises nothing') from sides order by side;
select is(pg_temp.rows_of(side, 1, 'clock_answer'), 4, side || ': and stores nothing') from sides order by side;
select is(pg_temp.lasts(side, 1), interval '37.542 seconds', side || ': and moves no clock') from sides order by side;

select throws_ok(format('select pg_temp.ans(%L, 1, private.today(), 1, ''c1'')', side), 'OB006', null, side || ': no answer to a question that is not open') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 1, private.today(), 2)', side), 'OB002', null, side || ': Next cannot skip a question') from sides order by side;
select lives_ok(format('select pg_temp.open(%L, 1, private.today(), 1)', side), side || ': Next opens question 2 with no wait') from sides order by side;
select lives_ok(format('select pg_temp.open(%L, 1, private.today(), 1)', side), side || ': a second tap on Next raises nothing') from sides order by side;
select is(pg_temp.status(side, 1, 'answered'), '1', side || ': the status names the open question') from sides order by side;
select throws_ok(format('select pg_temp.ans(%L, 1, private.today(), 0, ''new'')', side), 'OB006', null, side || ': no going back to question 1') from sides order by side;
select pg_temp.ans(side, 1, private.today(), 1, 'c1') from sides;
select is(pg_temp.got(side, 1, 1, 'c1'), 'common 2444 10', side || ': the shrink counts the whole run''s answers, not the question''s') from sides order by side;

select throws_ok(format('select pg_temp.fin(%L, 1, private.today())', side), 'OB019', null, side || ': no Finish before the last question') from sides order by side;
select lives_ok(format('select pg_temp.open(%L, 1, private.today(), 2)', side), side || ': Next opens question 3') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 1, private.today(), 3)', side), 'OB003', null, side || ': Next cannot go past question 3') from sides order by side;
select lives_ok(format('select pg_temp.fin(%L, 1, private.today())', side), side || ': Finish on question 3') from sides order by side;
select is(pg_temp.status(side, 1, 'status'), 'survived', side || ': a finished run is over') from sides order by side;
select is(pg_temp.status(side, 1, 'answered'), '3', side || ': with every question counted') from sides order by side;
select is(pg_temp.status(side, 1, 'deadline'), null, side || ': and no clock') from sides order by side;
select lives_ok(format('select pg_temp.fin(%L, 1, private.today())', side), side || ': a second Finish raises nothing') from sides order by side;
select is(pg_temp.rows_of(side, 1, 'clock_finish'), 1, side || ': and stores nothing') from sides order by side;
select throws_ok(format('select pg_temp.ans(%L, 1, private.today(), 2, ''late'')', side), 'OB003', null, side || ': no answer after Finish') from sides order by side;

-- ---- The clock ----
select pg_temp.run(side, 2, private.today(), '21 seconds') from sides;
select is(pg_temp.status(side, 2, 'status'), 'survived', side || ': a run whose 20 seconds have passed is over') from sides order by side;
select throws_ok(format('select pg_temp.ans(%L, 2, private.today(), 0, ''c1'')', side), 'OB003', null, side || ': no answer after the clock has passed zero') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 2, private.today(), 1)', side), 'OB003', null, side || ': no Next either') from sides order by side;
select throws_ok(format('select pg_temp.fin(%L, 2, private.today())', side), 'OB003', null, side || ': nor a Finish') from sides order by side;

select pg_temp.run(side, 3, private.today(), '19 seconds') from sides;
select lives_ok(format('select pg_temp.ans(%L, 3, private.today(), 0, ''c1'')', side), side || ': an answer in the last second') from sides order by side;
select pg_temp.pass(side, 3, '3 seconds') from sides;
select is(pg_temp.status(side, 3, 'status'), 'in_progress', side || ': 22 seconds in, the run lives on the answer''s 3 seconds') from sides order by side;
select pg_temp.pass(side, 3, '2 seconds') from sides;
select is(pg_temp.status(side, 3, 'status'), 'survived', side || ': and is over once those have passed') from sides order by side;

-- ---- A day of another format keeps its own rules ----
select pg_temp.run(side, 4, private.today() - 1) from sides;
select throws_ok(format('select pg_temp.ans(%L, 4, private.today() - 1, 0, ''c1'')', side), 'OB018', null, side || ': no clock answer on a day of another format') from sides order by side;
select throws_ok(format('select pg_temp.fin(%L, 4, private.today() - 1)', side), 'OB018', null, side || ': no Finish there') from sides order by side;
select throws_ok(format('select pg_temp.open(%L, 4, private.today() - 1, 1)', side), 'OB002', null, side || ': and its Next still waits for an answer') from sides order by side;

select throws_ok(format('select pg_temp.ans(%L, 9, private.today(), 0, ''c1'')', side), '23503', null, side || ': no answer without a run') from sides order by side;

select * from finish();
rollback;
