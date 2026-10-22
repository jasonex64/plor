-- private.points_ledger keeps its rules in the database (docs/milestones/M09-points-and-leaderboard.md, 9a;
-- M00-data-design.md §6 and §7). Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000009a1', 'l1@example.test'),
  ('00000000-0000-0000-0000-0000000009a2', 'l2@example.test');
insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-01', '{"format": 2, "game_id": "offbeat", "date": "2000-01-01", "questions": []}');
insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000009a1', 'offbeat', '2000-01-01');

select lives_ok($$insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
  values ('00000000-0000-0000-0000-0000000009a1', 'offbeat', '2000-01-01', 185, 35)$$, 'a run''s row: its total and its bonus part');
select throws_ok($$insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
  values ('00000000-0000-0000-0000-0000000009a1', 'offbeat', '2000-01-01', 185, 35)$$,
  '23505', null, 'one row per run: points can never be awarded twice');
select throws_ok($$insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
  values ('00000000-0000-0000-0000-0000000009a2', 'offbeat', '2000-01-01', 0, 0)$$,
  '23503', null, 'a row needs the player''s run that day');

-- The checks, on a run that has no row yet.
insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000009a2', 'offbeat', '2000-01-01');
select throws_ok($$insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
  values ('00000000-0000-0000-0000-0000000009a2', 'offbeat', '2000-01-01', -1, 0)$$, '23514', null, 'points are never negative');
select throws_ok($$insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
  values ('00000000-0000-0000-0000-0000000009a2', 'offbeat', '2000-01-01', 10, -1)$$, '23514', null, 'the bonus is never negative');
select throws_ok($$insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
  values ('00000000-0000-0000-0000-0000000009a2', 'offbeat', '2000-01-01', 10, 11)$$, '23514', null, 'the bonus is part of the total');

-- §7: append-only for plor_app.
select ok(not has_table_privilege('plor_app', 'private.points_ledger', 'update, delete, truncate'),
  'plor_app cannot update, delete or truncate the ledger');
select ok(has_table_privilege('plor_app', 'private.points_ledger', 'select, insert'), 'plor_app can read and add rows');

-- Account deletion (M12) relies on the cascade, through the run.
delete from auth.users where id = '00000000-0000-0000-0000-0000000009a1';
select is((select count(*)::int from private.points_ledger where user_id = '00000000-0000-0000-0000-0000000009a1'), 0,
  'deleting a user deletes their ledger rows');
select is((select count(*)::int from private.run where user_id = '00000000-0000-0000-0000-0000000009a2'), 1,
  'and nobody else''s');

select * from finish();
rollback;
