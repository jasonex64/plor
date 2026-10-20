-- M03 Puzzle insights: who may see the report, and what plor_app may read to build it
-- (docs/milestones/M03-puzzle-insights.md, D1 and D4; human, 2026-10-19). Security change, approved in principle by
-- the human; these exact grants are shown in the M03 PR.

-- Admins are a list of user IDs. The human adds a row once in Supabase's SQL editor (as postgres); no route
-- writes it, so plor_app may only read it.
create table private.admin (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table private.admin enable row level security;
revoke all on table private.admin from public, anon, authenticated, service_role;
grant select on table private.admin to plor_app;
create policy admin_plor_app_select on private.admin for select to plor_app using (true);

-- The report lists the day's misses (without who typed them, D4), so plor_app may now read them too. Only the
-- admin-only route reads this table.
grant select on table private.missed_answer to plor_app;
create policy missed_answer_plor_app_select on private.missed_answer for select to plor_app using (true);
