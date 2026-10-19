-- The game tables enforce their own rules (docs/milestones/M00-data-design.md §4, §5, §7, §8; M02 ticket).
-- DST instants are tested in src/game/day.db.test.ts, where the dates come from the IANA tz data, not by hand.
-- Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- Real puzzles and runs may exist for the days used here (staging during the playtest). The whole file runs in
-- one transaction that is rolled back, so clearing them changes nothing outside the test (2b review).
delete from private.run where game_id = 'offbeat' and puzzle_date between private.today() - 1 and private.today() + 5;
delete from private.puzzle where game_id = 'offbeat' and puzzle_date between private.today() - 1 and private.today() + 5;

-- Fixtures: two-question puzzles for yesterday, today and tomorrow, and three players.
create function pg_temp.puzzle(day date) returns jsonb language sql
  return jsonb_build_object('format', 1, 'game_id', 'offbeat', 'date', day::text, 'questions', '[{}, {}]'::jsonb);
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', private.today() - 1, pg_temp.puzzle(private.today() - 1)),
  ('offbeat', private.today(), pg_temp.puzzle(private.today())),
  ('offbeat', private.today() + 1, pg_temp.puzzle(private.today() + 1));
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'g1@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'g2@example.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'g3@example.test');

-- §8
select is(private.today(), private.day_of(now()), 'today() is day_of(now())');
-- The two ends of the 25-hour day when DST ends, as src/game/day.db.test.ts derives them from Node's ICU tz data
-- (that test also asserts these exact instants). Here they check this database's own tz data, including on
-- staging via `supabase test db --linked` (ROADMAP: verify Supabase has current tzdata).
select is(private.day_of('2026-11-01T06:59:59.999Z'), date '2026-10-31', 'just before midnight 2026-11-01 Pacific');
select is(private.day_of('2026-11-01T07:00:00.000Z'), date '2026-11-01', 'midnight 2026-11-01 Pacific (still PDT)');
select is(private.day_of('2026-11-02T07:59:59.999Z'), date '2026-11-01', 'just before midnight 2026-11-02 Pacific');
select is(private.day_of('2026-11-02T08:00:00.000Z'), date '2026-11-02', 'midnight 2026-11-02 Pacific (now PST)');

-- §4: the key and the content agree, and a started day can't change.
select throws_ok($$insert into private.puzzle values ('offbeat', private.today() + 2, pg_temp.puzzle(private.today() + 3))$$,
  '23514', null, 'a puzzle whose content names another date is rejected');
select throws_ok($$update private.puzzle set content = content || '{"x": 1}' where puzzle_date = private.today()$$,
  'OB004', null, 'today''s puzzle cannot change');
select throws_ok($$update private.puzzle set content = content || '{"x": 1}' where puzzle_date = private.today() - 1$$,
  'OB004', null, 'a past puzzle cannot change');
select lives_ok($$update private.puzzle set content = content || '{"x": 1}' where puzzle_date = private.today() + 1$$,
  'tomorrow''s puzzle can still change');

-- §5: one run per player per day, only for a published day.
select lives_ok($$insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today())$$,
  'a player starts today''s run');
select throws_ok($$insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today())$$,
  '23505', null, 'a second run for the same day is rejected');
select throws_ok($$insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today() + 5)$$,
  '23503', null, 'a run needs a published puzzle');

-- §5: answers in order, nothing after a match, nothing after the day.
select throws_ok($$insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
                   values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today(), 1, 'x', false)$$,
  'OB002', null, 'question 2 cannot be answered before question 1');
select lives_ok($$insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
                  values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today(), 0, 'x', false)$$,
  'question 1 is answered');
select is((select status from private.run_status where user_id = '00000000-0000-0000-0000-0000000000a1'), 'in_progress',
  'a run with questions left and no match is in_progress');
select throws_ok($$insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
                   values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today(), 0, 'y', false)$$,
  'OB002', null, 'an answered question cannot be answered again');
select lives_ok($$insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
                  values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today(), 1, 'host', true)$$,
  'question 2 is answered with a match');
select is((select status from private.run_status where user_id = '00000000-0000-0000-0000-0000000000a1'), 'died',
  'a run with a match died');

insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000000a2', 'offbeat', private.today());
insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values
  ('00000000-0000-0000-0000-0000000000a2', 'offbeat', private.today(), 0, 'x', true);
select throws_ok($$insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
                   values ('00000000-0000-0000-0000-0000000000a2', 'offbeat', private.today(), 1, 'y', false)$$,
  'OB003', null, 'nothing can be answered after a match');

insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000000a3', 'offbeat', private.today());
insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values
  ('00000000-0000-0000-0000-0000000000a3', 'offbeat', private.today(), 0, 'x', false),
  ('00000000-0000-0000-0000-0000000000a3', 'offbeat', private.today(), 1, 'y', false);
select is((select status from private.run_status where user_id = '00000000-0000-0000-0000-0000000000a3' and puzzle_date = private.today()),
  'survived', 'a run that answered every question without a match survived');
select throws_ok($$insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
                   values ('00000000-0000-0000-0000-0000000000a3', 'offbeat', private.today(), 2, 'z', false)$$,
  'OB003', null, 'nothing can be answered after the last question');

-- Yesterday's run: the day is over.
insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000000a3', 'offbeat', private.today() - 1);
select throws_ok($$insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
                   values ('00000000-0000-0000-0000-0000000000a3', 'offbeat', private.today() - 1, 0, 'x', false)$$,
  'OB001', null, 'an answer after the reset is day_over, raised by the trigger');
select is((select status from private.run_status where user_id = '00000000-0000-0000-0000-0000000000a3' and puzzle_date = private.today() - 1),
  'abandoned', 'an unfinished run from an earlier day is abandoned');

-- Logged misses: 1 to 40 characters, already trimmed.
select lives_ok($$insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed)
                  values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today(), 0, repeat('a', 40))$$,
  'a 40-character miss is logged');
select throws_ok($$insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed)
                   values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today(), 0, repeat('a', 41))$$,
  '23514', null, 'a 41-character miss is rejected');
select throws_ok($$insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed)
                   values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today(), 0, '')$$,
  '23514', null, 'an empty miss is rejected');
select throws_ok($$insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed)
                   values ('00000000-0000-0000-0000-0000000000a1', 'offbeat', private.today(), 0, ' lion')$$,
  '23514', null, 'an untrimmed miss is rejected');

-- §7: append-only for plor_app; service_role gets nothing.
select ok(not has_table_privilege('plor_app', t, 'update, delete, truncate'), t || ': plor_app cannot update, delete or truncate')
  from unnest(array['private.run', 'private.run_event', 'private.missed_answer', 'private.puzzle']) as t;
select ok(not has_table_privilege('plor_app', 'private.puzzle', 'insert'), 'plor_app cannot publish puzzles');
select ok(not has_table_privilege('plor_publisher', t, 'select, insert, update, delete, truncate'), t || ': plor_publisher has no access')
  from unnest(array['private.run', 'private.run_event', 'private.missed_answer']) as t;

-- §7: account deletion (M07) cascades through runs, answers and misses even though nobody holds DELETE.
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select is((select count(*)::int from private.run where user_id = '00000000-0000-0000-0000-0000000000a1')
        + (select count(*)::int from private.run_event where user_id = '00000000-0000-0000-0000-0000000000a1')
        + (select count(*)::int from private.missed_answer where user_id = '00000000-0000-0000-0000-0000000000a1'),
  0, 'deleting the auth user deletes their runs, answers and misses');

select * from finish();
rollback;
