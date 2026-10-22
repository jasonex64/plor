-- Live comments and reactions (docs/milestones/M08-comments-and-reactions.md, 8d): each change to a comment or a
-- reaction nudges the board topic of the player who made it and of their friends, and nobody else's, with no comment
-- text in the payload. Run with `npm run test:sql`. Needs the Realtime service running, which creates
-- realtime.messages' daily partitions.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-01', '{"format": 2, "game_id": "offbeat", "date": "2000-01-01", "questions": []}');

-- Player p, friend f, stranger s; p and f played 2000-01-01.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000008d1', 'p8d@example.test'),
  ('00000000-0000-0000-0000-0000000008d2', 'f8d@example.test'),
  ('00000000-0000-0000-0000-0000000008d3', 's8d@example.test');
insert into private.profile (user_id, username) values
  ('00000000-0000-0000-0000-0000000008d1', 'p8d'),
  ('00000000-0000-0000-0000-0000000008d2', 'f8d'),
  ('00000000-0000-0000-0000-0000000008d3', 's8d');
insert into private.friendship (user_a, user_b) values
  ('00000000-0000-0000-0000-0000000008d1', '00000000-0000-0000-0000-0000000008d2');
insert into private.run (user_id, game_id, puzzle_date) values
  ('00000000-0000-0000-0000-0000000008d1', 'offbeat', '2000-01-01'),
  ('00000000-0000-0000-0000-0000000008d2', 'offbeat', '2000-01-01');

-- Starting the runs sent friend_status messages; only the new events are looked at.
create function pg_temp.sent(who text, kind text) returns jsonb[] language sql
  return (select coalesce(array_agg(payload - 'id' order by inserted_at, id), '{}') from realtime.messages
          where topic = 'board:' || who and event = kind);

insert into private.comment (id, user_id, game_id, puzzle_date, body) overriding system value
  values (-1, '00000000-0000-0000-0000-0000000008d1', 'offbeat', '2000-01-01', 'secret words');
select is(pg_temp.sent('00000000-0000-0000-0000-0000000008d2', 'comments_changed'),
  array[jsonb_build_object('v', 1, 'type', 'comments_changed', 'gameId', 'offbeat', 'puzzleDate', '2000-01-01')],
  'a new comment nudges the friend''s board: which day''s thread changed, and nothing else');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000008d1', 'comments_changed'), 1), 1,
  'and the author''s own board, for their other tabs');
select is(pg_temp.sent('00000000-0000-0000-0000-0000000008d3', 'comments_changed'), '{}'::jsonb[], 'and not a stranger''s');

insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
  values ('00000000-0000-0000-0000-0000000008d2', 'offbeat', '2000-01-01', -1, '👍');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000008d1', 'comments_changed'), 1), 2,
  'a reaction on a comment nudges the thread too');

insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji)
  values ('00000000-0000-0000-0000-0000000008d2', 'offbeat', '2000-01-01', '00000000-0000-0000-0000-0000000008d1', '❤️');
select is(pg_temp.sent('00000000-0000-0000-0000-0000000008d1', 'run_reactions_changed'),
  array[jsonb_build_object('v', 1, 'type', 'run_reactions_changed', 'gameId', 'offbeat', 'puzzleDate', '2000-01-01')],
  'a reaction on a run nudges the boards instead');
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000008d1', 'comments_changed'), 1), 2,
  'and not the thread');

delete from private.reaction where run_user_id = '00000000-0000-0000-0000-0000000008d1';
select is(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000008d2', 'run_reactions_changed'), 1), 2,
  'removing a reaction nudges as well');

-- Deleting the comment (by its author or an admin) nudges the author's and friends' boards, and its reactions go
-- with it in the same statement.
delete from private.comment where id = -1;
select ok(array_length(pg_temp.sent('00000000-0000-0000-0000-0000000008d2', 'comments_changed'), 1) >= 3,
  'deleting a comment nudges the thread');

select ok(not exists (select from realtime.messages where topic like 'board:00000000-0000-0000-0000-0000000008d%'
  and payload::text like '%secret%'), 'no message carries the comment''s text');
select ok((select bool_and(private) from realtime.messages where topic like 'board:00000000-0000-0000-0000-0000000008d%'),
  'every message is private');

select * from finish();
rollback;
