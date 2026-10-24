-- private.delete_reported_comment deletes a reported comment and records which admin did (docs/milestones/
-- M12-12d-decided-fixes.md, D1 a), and the record goes with either account (D2 a). Run with `npm run test:sql`. The
-- route, as plor_app, is src/app/api/admin/reports/route.db.test.ts.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- 1 and 2 are admins; 3 and 4 write comments; 4 also reports them.
create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@record.example.test' from generate_series(1, 4) as s(n);
insert into private.profile (user_id, username) select pg_temp.u(n), 'rec' || n from generate_series(1, 4) as s(n);
insert into private.admin (user_id) values (pg_temp.u(1)), (pg_temp.u(2));
insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-02', '{"format": 2, "game_id": "offbeat", "date": "2000-01-02", "questions": []}');
insert into private.run (user_id, game_id, puzzle_date) values (pg_temp.u(3), 'offbeat', '2000-01-02'), (pg_temp.u(4), 'offbeat', '2000-01-02');
insert into private.comment (id, user_id, game_id, puzzle_date, body) overriding system value values
  (-11, pg_temp.u(3), 'offbeat', '2000-01-02', 'reported'),
  (-12, pg_temp.u(3), 'offbeat', '2000-01-02', 'not reported'),
  (-13, pg_temp.u(4), 'offbeat', '2000-01-02', 'reported too');
insert into private.comment_report (comment_id, reporter_id) values (-11, pg_temp.u(4)), (-13, pg_temp.u(3));

select is(private.delete_reported_comment(pg_temp.u(3), -11), false, 'a player who isn''t an admin deletes nothing');
select is(private.delete_reported_comment(pg_temp.u(1), -12), false, 'nor does an admin, for a comment with no report');
select is((select count(*)::int from private.comment where id in (-11, -12)) + (select count(*)::int from private.comment_deletion), 2,
  'both comments are still there, and nothing is recorded');

select is(private.delete_reported_comment(pg_temp.u(1), -11), true, 'an admin deletes a reported comment');
select is((select count(*)::int from private.comment where id = -11), 0, 'it is gone');
select results_eq(
  $$select admin_id, comment_id, author_id, body, deleted_at = now() from private.comment_deletion$$,
  $$values (pg_temp.u(1), -11::bigint, pg_temp.u(3), 'reported', true)$$,
  'one record: which admin, which comment, its author, its text, and when');
select is(private.delete_reported_comment(pg_temp.u(2), -11), false, 'deleting it again deletes and records nothing');

-- The record goes with the author's account, and with the admin's (D2 a).
select private.delete_reported_comment(pg_temp.u(2), -13);
delete from auth.users where id = pg_temp.u(3);
select is((select array_agg(comment_id) from private.comment_deletion), array[-13::bigint],
  'deleting the author''s account removes their comment''s record, and no other');
delete from auth.users where id = pg_temp.u(2);
select is((select count(*)::int from private.comment_deletion), 0, 'deleting the admin''s account removes theirs');

select * from finish();
rollback;
