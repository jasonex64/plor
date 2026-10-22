-- M09 9a: the points ledger (docs/milestones/M09-points-and-leaderboard.md; M00-data-design.md §6 and §7). Security
-- change: this table and plor_app's grants on it were approved by the human on 2026-10-22 (D7; DECISIONS.md Log).

-- One row per run, written once the run is finished and its day is closed (D9, D10), so the final rarity bonus is
-- known: points is the run's total (the question ladder plus the bonus) and bonus the bonus part. The leaderboard is
-- the sum of points. Append-only (§7): plor_app may only read and insert, and settling inserts with ON CONFLICT DO
-- NOTHING, so points are never awarded twice. A row belongs to its run (a stricter key than §6's auth.users one, with
-- the same account cascade through it).
create table private.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  points integer not null check (points >= 0),
  bonus integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, game_id, puzzle_date),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  constraint points_ledger_bonus check (bonus between 0 and points)
);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which rows a request reads is decided by the route: the viewer's and their friends'.
alter table private.points_ledger enable row level security;
revoke all on table private.points_ledger from public, anon, authenticated, service_role;

grant select, insert on table private.points_ledger to plor_app;
create policy points_ledger_plor_app_select on private.points_ledger for select to plor_app using (true);
create policy points_ledger_plor_app_insert on private.points_ledger for insert to plor_app with check (true);
