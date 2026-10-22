-- M08 8a: comments on the day's game (docs/milestones/M08-comments-and-reactions.md). Security change: this table and
-- plor_app's grants on it were approved by the human on 2026-10-22 (D8; DECISIONS.md Log).

-- One level, no replies. A comment belongs to its author's run that day, so only a player who played the day can
-- have one; the route also requires the run to be over and the day to be today (D6: past days are read-only).
-- Deleting removes the row for good (D4); deleting the run or the account cascades.
create table private.comment (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  -- 1 to 280 characters (human, 2026-10-22, D1), already trimmed by the route; char_length counts characters, so an
  -- emoji is one.
  constraint comment_body_format check (char_length(body) between 1 and 280 and body = btrim(body))
);
-- A day's thread is read oldest first.
create index comment_day on private.comment (game_id, puzzle_date, created_at);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which rows a request reads or deletes is decided by the route from the verified session.
alter table private.comment enable row level security;
revoke all on table private.comment from public, anon, authenticated, service_role;

grant select, insert, delete on table private.comment to plor_app;
create policy comment_plor_app_select on private.comment for select to plor_app using (true);
create policy comment_plor_app_insert on private.comment for insert to plor_app with check (true);
create policy comment_plor_app_delete on private.comment for delete to plor_app using (true);
