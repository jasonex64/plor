-- private.comment_report keeps its rules in the database (docs/milestones/M08-comments-and-reactions.md, 8c). Run with
-- `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- e2 commented on 2000-01-01; e1 and e3 report it.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@example.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@example.test'),
  ('00000000-0000-0000-0000-0000000000e3', 'e3@example.test');
insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-01', '{"format": 2, "game_id": "offbeat", "date": "2000-01-01", "questions": []}');
insert into private.run (user_id, game_id, puzzle_date) values ('00000000-0000-0000-0000-0000000000e2', 'offbeat', '2000-01-01');
insert into private.comment (id, user_id, game_id, puzzle_date, body) overriding system value values
  (-1, '00000000-0000-0000-0000-0000000000e2', 'offbeat', '2000-01-01', 'one'),
  (-2, '00000000-0000-0000-0000-0000000000e2', 'offbeat', '2000-01-01', 'two');

select lives_ok($$insert into private.comment_report (comment_id, reporter_id) values (-1, '00000000-0000-0000-0000-0000000000e1')$$,
  'a report');
select throws_ok($$insert into private.comment_report (comment_id, reporter_id) values (-1, '00000000-0000-0000-0000-0000000000e1')$$,
  '23505', null, 'one report per player per comment');
select throws_ok($$insert into private.comment_report (comment_id, reporter_id) values (-3, '00000000-0000-0000-0000-0000000000e1')$$,
  '23503', null, 'a report needs its comment');

-- Deleting a comment takes its reports with it (D4), and deleting the reporter's account takes theirs (M12).
insert into private.comment_report (comment_id, reporter_id) values
  (-1, '00000000-0000-0000-0000-0000000000e3'),
  (-2, '00000000-0000-0000-0000-0000000000e1');
delete from private.comment where id = -1;
select is((select count(*)::int from private.comment_report where comment_id = -1), 0, 'deleting a comment deletes its reports');
select is((select count(*)::int from private.comment_report where comment_id = -2), 1, 'other comments keep theirs');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000e1';
select is((select count(*)::int from private.comment_report where reporter_id = '00000000-0000-0000-0000-0000000000e1'), 0,
  'deleting a user deletes their reports');

select * from finish();
rollback;
