-- M07 7b: invite links and friends (docs/milestones/M07-friends-and-live-board.md). Security change: these tables
-- and plor_app's grants on them were approved by the human on 2026-10-22 (DECISIONS.md Log).

-- One personal invite code per player, usable any number of times; resetting replaces it, so the old link stops
-- working. 16 random bytes written as 22 base64url characters (human, 2026-10-21, M07 D3). Random, not the
-- username, so a rename never breaks a link.
create table private.friend_invite (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  constraint friend_invite_code_format check (code ~ '^[A-Za-z0-9_-]{22}$')
);

-- Friends are mutual: one row per pair, the smaller user ID first, so a pair can't be stored twice or with itself.
create table private.friendship (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint friendship_ordered check (user_a < user_b)
);
-- The primary key serves lookups by user_a; this serves them by user_b.
create index friendship_user_b on private.friendship (user_b);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which player's rows a request touches is decided by the route from the verified session.
alter table private.friend_invite enable row level security;
alter table private.friendship enable row level security;
revoke all on table private.friend_invite, private.friendship from public, anon, authenticated, service_role;

-- Reading and creating a code, and replacing it on reset (the only column that changes).
grant select, insert on table private.friend_invite to plor_app;
grant update (code) on table private.friend_invite to plor_app;
create policy friend_invite_plor_app_select on private.friend_invite for select to plor_app using (true);
create policy friend_invite_plor_app_insert on private.friend_invite for insert to plor_app with check (true);
create policy friend_invite_plor_app_update on private.friend_invite for update to plor_app using (true) with check (true);

-- Listing, adding and removing friends (D4).
grant select, insert, delete on table private.friendship to plor_app;
create policy friendship_plor_app_select on private.friendship for select to plor_app using (true);
create policy friendship_plor_app_insert on private.friendship for insert to plor_app with check (true);
create policy friendship_plor_app_delete on private.friendship for delete to plor_app using (true);
