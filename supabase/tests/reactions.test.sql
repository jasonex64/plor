-- private.reaction keeps its rules in the database (docs/milestones/M08-comments-and-reactions.md, 8b). Run with
-- `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- r1, r2 and r4 played 2000-01-01; r3 didn't. r4 also played 2000-01-02. r2 commented on 2000-01-01.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'd1@example.test'),
  ('00000000-0000-0000-0000-0000000000d2', 'd2@example.test'),
  ('00000000-0000-0000-0000-0000000000d3', 'd3@example.test'),
  ('00000000-0000-0000-0000-0000000000d4', 'd4@example.test');
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', '2000-01-01', '{"format": 2, "game_id": "offbeat", "date": "2000-01-01", "questions": []}'),
  ('offbeat', '2000-01-02', '{"format": 2, "game_id": "offbeat", "date": "2000-01-02", "questions": []}');
insert into private.run (user_id, game_id, puzzle_date) values
  ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01'),
  ('00000000-0000-0000-0000-0000000000d2', 'offbeat', '2000-01-01'),
  ('00000000-0000-0000-0000-0000000000d4', 'offbeat', '2000-01-01'),
  ('00000000-0000-0000-0000-0000000000d4', 'offbeat', '2000-01-02');
insert into private.comment (id, user_id, game_id, puzzle_date, body)
  overriding system value values (-1, '00000000-0000-0000-0000-0000000000d2', 'offbeat', '2000-01-01', 'hi');

select lives_ok($$insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', -1, '👍')$$, 'a reaction on a comment');
-- ❤️ is two code points (U+2764 U+FE0F); the set is the human's (D3).
select lives_ok($$insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', '00000000-0000-0000-0000-0000000000d2', '❤️')$$,
  'a reaction on a friend''s run');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', -1, '😂')$$,
  '23505', null, 'one reaction per player per comment');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', '00000000-0000-0000-0000-0000000000d2', '😂')$$,
  '23505', null, 'one reaction per player per run');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', '00000000-0000-0000-0000-0000000000d4', '👎')$$,
  '23514', null, 'an emoji outside the set is rejected');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', '00000000-0000-0000-0000-0000000000d4', '❤')$$,
  '23514', null, 'a heart without its variation selector is not the set''s ❤️');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, comment_id, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d4', 'offbeat', '2000-01-01', -1, '00000000-0000-0000-0000-0000000000d2', '👍')$$,
  '23514', null, 'a reaction has one target, not two');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, emoji)
  values ('00000000-0000-0000-0000-0000000000d4', 'offbeat', '2000-01-01', '👍')$$, '23514', null, 'a reaction needs a target');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', '00000000-0000-0000-0000-0000000000d1', '👍')$$,
  '23514', null, 'no reaction on your own run');
-- A reaction belongs to the reactor's run that day, and its target to the same day.
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d3', 'offbeat', '2000-01-01', -1, '👍')$$,
  '23503', null, 'a reaction needs the player''s run that day');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', '00000000-0000-0000-0000-0000000000d3', '👍')$$,
  '23503', null, 'a reaction on a run needs that run');
select throws_ok($$insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d4', 'offbeat', '2000-01-02', -1, '👍')$$,
  '23503', null, 'a reaction on a comment is on the comment''s day');

-- Deleting a comment takes its reactions with it (D4); deleting a run or an account takes reactions on it and by it.
insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000000d1', 'offbeat', '2000-01-01', '00000000-0000-0000-0000-0000000000d4', '😮');
delete from private.comment where id = -1;
select is((select count(*)::int from private.reaction where comment_id = -1), 0, 'deleting a comment deletes its reactions');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d2';
select is((select count(*)::int from private.reaction where run_user_id = '00000000-0000-0000-0000-0000000000d2'), 0,
  'deleting a user deletes the reactions on their runs');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d1';
select is((select count(*)::int from private.reaction where user_id = '00000000-0000-0000-0000-0000000000d1'), 0,
  'deleting a user deletes their reactions');

select * from finish();
rollback;
