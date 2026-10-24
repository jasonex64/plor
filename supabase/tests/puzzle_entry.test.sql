-- Puzzle entry's guarded functions (docs/milestones/M06-puzzle-entry.md; migration 20261021232903_puzzle_entry.sql),
-- whoever calls them: only an admin may save questions or approve a day, a past day is refused, and a day that has
-- started can't change. They're called as the test's own role, which can't SET ROLE plor_app locally; that plor_app
-- may only execute them, never write the tables, is checked by plor_app_role.test.sql and game.test.sql.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e601', 'm06-admin@example.test'),
  ('00000000-0000-0000-0000-00000000e602', 'm06-player@example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-00000000e601');
-- A fixed day far ahead, so local runs and other tests never collide with it.
create temp table d as select private.today() + 400 as ahead, private.today() - 1 as past;

select throws_ok($$select private.save_questions('00000000-0000-0000-0000-00000000e602', 'offbeat', (select ahead from d), array['a','b','c','d','e','f','g'])$$,
  'OB007', null, 'a player who is not an admin cannot save questions');
select lives_ok($$select private.save_questions('00000000-0000-0000-0000-00000000e601', 'offbeat', (select ahead from d), array['a','b','c','d','e','f','g'])$$,
  'an admin saves a future day''s questions');
select is((select prompts[7] from private.puzzle_questions where game_id = 'offbeat' and puzzle_date = (select ahead from d)), 'g',
  'the questions are stored');
select throws_ok($$select private.save_questions('00000000-0000-0000-0000-00000000e601', 'offbeat', (select past from d), array['a','b','c','d','e','f','g'])$$,
  'OB008', null, 'questions for a day that is over are refused');

select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e602', jsonb_build_object('game_id', 'offbeat', 'date', (select ahead from d)::text))$$,
  'OB007', null, 'a player who is not an admin cannot approve a day');
select lives_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', jsonb_build_object('game_id', 'offbeat', 'date', (select ahead from d)::text))$$,
  'an admin approves a future day');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', jsonb_build_object('game_id', 'offbeat', 'date', (select past from d)::text))$$,
  'OB008', null, 'a day that is over cannot be approved');

-- A day that has started can't change. Today gets a puzzle here if it has none (rolled back at the end).
insert into private.puzzle (game_id, puzzle_date, content)
  select 'offbeat', private.today(), jsonb_build_object('game_id', 'offbeat', 'date', private.today()::text)
  where not exists (select from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today());
select throws_ok($$select private.save_questions('00000000-0000-0000-0000-00000000e601', 'offbeat', private.today(), array['a','b','c','d','e','f','g'])$$,
  'OB004', null, 'questions for a day that has started are refused');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', jsonb_build_object('game_id', 'offbeat', 'date', private.today()::text))$$,
  'OB004', null, 'a day that has started cannot be approved again');

select * from finish();
rollback;
