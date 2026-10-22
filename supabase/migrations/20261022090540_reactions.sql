-- M08 8b: reactions on comments and on friends' runs (docs/milestones/M08-comments-and-reactions.md, D2 and D3).
-- Security change: this table and plor_app's grants on it were approved by the human on 2026-10-22 (D8; DECISIONS.md
-- Log).

-- A reaction on a comment names the comment's day too (the foreign key below), so it can only be on that day.
alter table private.comment add constraint comment_id_day unique (id, game_id, puzzle_date);

-- One reaction per player per target: a comment, or a friend's run that day (D2). A reaction belongs to the reactor's
-- run that day, so only a player who played the day can react; the route also requires that run to be over, the day
-- to be today (D6: past days are read-only) and the target to be one the reactor can see. Changing a reaction deletes
-- the old one and inserts the new one in one transaction, since plor_app has no update. Deleting the comment, either
-- run or either account cascades (D4: a deleted comment's reactions go with it).
create table private.reaction (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  comment_id bigint,
  run_user_id uuid,
  emoji text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  foreign key (comment_id, game_id, puzzle_date) references private.comment (id, game_id, puzzle_date) on delete cascade,
  foreign key (run_user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  constraint reaction_one_target check (num_nonnulls(comment_id, run_user_id) = 1),
  -- Reactions go on friends' runs (D2), and no one is their own friend.
  constraint reaction_not_own_run check (run_user_id <> user_id),
  -- The set (human, 2026-10-22, D3). src/config/tunables.ts REACTIONS holds the same five, and the reactions route
  -- test sends each one through. ❤️ is U+2764 U+FE0F.
  constraint reaction_emoji check (emoji in ('👍', '😂', '😮', '😢', '❤️'))
);
create unique index reaction_one_per_comment on private.reaction (user_id, comment_id) where comment_id is not null;
create unique index reaction_one_per_run on private.reaction (user_id, game_id, puzzle_date, run_user_id) where run_user_id is not null;
-- Reactions are read per comment (a day's thread) and per run (the board), and cascade from both.
create index reaction_comment on private.reaction (comment_id) where comment_id is not null;
create index reaction_run on private.reaction (run_user_id, game_id, puzzle_date) where run_user_id is not null;

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which rows a request reads or deletes is decided by the route from the verified session.
alter table private.reaction enable row level security;
revoke all on table private.reaction from public, anon, authenticated, service_role;

grant select, insert, delete on table private.reaction to plor_app;
create policy reaction_plor_app_select on private.reaction for select to plor_app using (true);
create policy reaction_plor_app_insert on private.reaction for insert to plor_app with check (true);
create policy reaction_plor_app_delete on private.reaction for delete to plor_app using (true);
