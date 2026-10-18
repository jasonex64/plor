-- The player's profile, created at first sign-in before the first run (docs/milestones/M00-data-design.md §3).
-- Every game object lives in `private`, which the Data API doesn't expose; route handlers reach it as
-- riff_app (M00 data design, "Principles used throughout").
create schema private;

-- citext keeps uniqueness case-insensitive in the database itself (M00 data design §3: `username citext unique`).
create extension if not exists citext with schema extensions;

create table private.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique,
  created_at timestamptz not null default now(),
  -- 3-20 characters of a-z, 0-9 and _ (human, 2026-10-18; docs/milestones/M02-sign-in-and-play.md, Numbers).
  -- Cast to text first: citext's own regex match ignores case, which would let upper-case letters through.
  constraint profile_username_format check (username::text ~ '^[a-z0-9_]{3,20}$')
);

-- Backstop if the schema were ever exposed: RLS on with no policies, and nothing granted to the Data API roles.
alter table private.profile enable row level security;
revoke all on schema private from public, anon, authenticated, service_role;
revoke all on table private.profile from public, anon, authenticated, service_role;

-- riff_app reads a profile and creates it once; usernames can't be changed or deleted in M02.
-- Account deletion (M07) removes it through the cascade from auth.users, which runs as the table owner.
grant usage on schema private to riff_app;
grant select, insert on table private.profile to riff_app;

-- riff_app is not the owner and has no BYPASSRLS, so with RLS on and no policy it sees no rows and can
-- insert none (observed locally 2026-10-18: "new row violates row-level security policy"). These policies
-- name riff_app only, matching its grants; the Data API roles still have none. Which user's row a request
-- touches is decided by the route handler from the verified session.
create policy profile_riff_app_select on private.profile for select to riff_app using (true);
create policy profile_riff_app_insert on private.profile for insert to riff_app with check (true);
