-- private.keep_reported_comment records which admin kept a reported comment; its reports stay, handled
-- (docs/milestones/M14-14b-2b-2-admin-build.md, 14b-2b-2b; human, 2026-10-26: "Still hidden (Recommended)"), and the
-- record goes with either account, as a deletion's does (M12 12d, D2 a). Run with `npm run test:sql`. The route, as
-- plor_app, is src/app/api/admin/reports/route.db.test.ts.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- 1 is an admin; 2 writes comments; 3 and 4 report them.
create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@keep.example.test' from generate_series(1, 4) as s(n);
insert into private.profile (user_id, username) select pg_temp.u(n), 'keep' || n from generate_series(1, 4) as s(n);
insert into private.admin (user_id) values (pg_temp.u(1));
insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-02', '{"format": 2, "game_id": "offbeat", "date": "2000-01-02", "questions": []}');
insert into private.run (user_id, game_id, puzzle_date) values (pg_temp.u(2), 'offbeat', '2000-01-02');
insert into private.comment (id, user_id, game_id, puzzle_date, body) overriding system value values
  (-21, pg_temp.u(2), 'offbeat', '2000-01-02', 'reported'),
  (-22, pg_temp.u(2), 'offbeat', '2000-01-02', 'not reported');
-- A report made before this transaction, so a keep (at now()) comes after it.
insert into private.comment_report (comment_id, reporter_id, created_at) values (-21, pg_temp.u(3), now() - interval '1 hour');

select is(private.keep_reported_comment(pg_temp.u(3), -21), false, 'a player who isn''t an admin keeps nothing');
select is(private.keep_reported_comment(pg_temp.u(1), -22), false, 'nor does an admin, for a comment with no report');
select is((select count(*)::int from private.comment_keep), 0, 'nothing is recorded');

select is(private.keep_reported_comment(pg_temp.u(1), -21), true, 'an admin keeps a reported comment');
select results_eq(
  $$select k.admin_id, k.comment_id, k.author_id, k.body, k.kept_at = now(), (select count(*)::int from private.comment_report where comment_id = -21)
    from private.comment_keep k$$,
  $$values (pg_temp.u(1), -21::bigint, pg_temp.u(2), 'reported', true, 1)$$,
  'one record: which admin, which comment, its author, its text, and when; the comment and its report stay');
select is(private.keep_reported_comment(pg_temp.u(1), -21), false, 'keeping it again records nothing: its report is handled');

-- Another player's report, made after the keep, is open: the comment can be kept again.
insert into private.comment_report (comment_id, reporter_id, created_at) values (-21, pg_temp.u(4), now() + interval '1 hour');
select is(private.keep_reported_comment(pg_temp.u(1), -21), true, 'a report made after the keep opens it again');

-- The record goes with the author's account, and with the admin's (D2 a).
delete from auth.users where id = pg_temp.u(2);
select is((select count(*)::int from private.comment_keep), 0, 'deleting the author''s account removes their comment''s records');
insert into auth.users (id, email) values (pg_temp.u(5), '5@keep.example.test');
insert into private.profile (user_id, username) values (pg_temp.u(5), 'keep5');
insert into private.comment_keep (admin_id, comment_id, author_id, body) values (pg_temp.u(1), -23, pg_temp.u(5), 'kept');
delete from auth.users where id = pg_temp.u(1);
select is((select count(*)::int from private.comment_keep), 0, 'deleting the admin''s account removes theirs');

select * from finish();
rollback;
