-- M08 8c: reports on comments (docs/milestones/M08-comments-and-reactions.md, D5). Security change: this table and
-- plor_app's grants on it were approved by the human on 2026-10-22 (D8; DECISIONS.md Log).

-- Who reported which comment, and when; one per player per comment. A report hides the comment for its reporter, and
-- admins see every comment with a report until one of them deletes it (D5: nothing is hidden automatically). The
-- route allows reporting only a comment the reporter can see and didn't write. Deleting the comment (by its author
-- or an admin) removes its reports (D4), and deleting the reporter's account removes theirs.
create table private.comment_report (
  comment_id bigint not null references private.comment (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, reporter_id)
);
-- The account cascade looks reports up by reporter.
create index comment_report_reporter on private.comment_report (reporter_id);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which rows a request reads is decided by the route: a player's own reports, or every report
-- for an admin.
alter table private.comment_report enable row level security;
revoke all on table private.comment_report from public, anon, authenticated, service_role;

grant select, insert on table private.comment_report to plor_app;
create policy comment_report_plor_app_select on private.comment_report for select to plor_app using (true);
create policy comment_report_plor_app_insert on private.comment_report for insert to plor_app with check (true);
