-- private.comment keeps its rules in the database (docs/milestones/M08-comments-and-reactions.md, 8a). Run with
-- `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@example.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@example.test');
insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-01', '{"format": 2, "game_id": "offbeat", "date": "2000-01-01", "questions": []}');
insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000000c1', 'offbeat', '2000-01-01');

-- 280 characters (human, 2026-10-22, D1), counted as characters, not bytes or UTF-16 units: 280 emoji fit.
select lives_ok($$insert into private.comment (user_id, game_id, puzzle_date, body)
  values ('00000000-0000-0000-0000-0000000000c1', 'offbeat', '2000-01-01', repeat('a', 280))$$, 'a 280-character comment is accepted');
select lives_ok($$insert into private.comment (user_id, game_id, puzzle_date, body)
  values ('00000000-0000-0000-0000-0000000000c1', 'offbeat', '2000-01-01', repeat('😀', 280))$$, '280 emoji are 280 characters');
select throws_ok($$insert into private.comment (user_id, game_id, puzzle_date, body)
  values ('00000000-0000-0000-0000-0000000000c1', 'offbeat', '2000-01-01', repeat('a', 281))$$,
  '23514', null, 'a 281-character comment is rejected');
select throws_ok($$insert into private.comment (user_id, game_id, puzzle_date, body)
  values ('00000000-0000-0000-0000-0000000000c1', 'offbeat', '2000-01-01', '')$$, '23514', null, 'an empty comment is rejected');
select throws_ok($$insert into private.comment (user_id, game_id, puzzle_date, body)
  values ('00000000-0000-0000-0000-0000000000c1', 'offbeat', '2000-01-01', ' hi')$$,
  '23514', null, 'a comment with leading space is rejected (the route trims it)');
-- A comment belongs to a run: only a player who played that day can have one.
select throws_ok($$insert into private.comment (user_id, game_id, puzzle_date, body)
  values ('00000000-0000-0000-0000-0000000000c2', 'offbeat', '2000-01-01', 'hi')$$,
  '23503', null, 'a comment needs the player''s run that day');

-- Account deletion (M12) relies on the cascade.
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c1';
select is((select count(*)::int from private.comment where user_id = '00000000-0000-0000-0000-0000000000c1'), 0,
  'deleting a user deletes their comments');

select * from finish();
rollback;
