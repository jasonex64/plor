-- M17 17b: a renamed player's old username is held for 30 days, and a player's lookups of other players are counted
-- (docs/milestones/M17-profiles-and-friend-requests.md, "17b design").
-- Security change: the table, plor_app's one grant on it, the definer trigger and the limiter's new kind were approved
-- by the human on 2026-11-12 ("Yes, build as proposed"; the ticket's answer 31; DECISIONS.md Log).
-- Expected failure: OB017 held (a username someone gave up less than 30 days ago).

-- The lookup limit (answer 15; E2): the sign-in limiter counts one more kind, keyed by the hash of the player's user
-- ID. No new table, function or grant: plor_app already executes private.take_auth_attempt and holds nothing on the
-- table. The number is src/config/tunables.ts's AUTH_LIMITS.lookup.
alter table private.auth_attempt drop constraint auth_attempt_kind;
alter table private.auth_attempt add constraint auth_attempt_kind
  check (kind in ('send_ip', 'send_email', 'check_ip', 'check_email', 'lookup'));

-- One row per held name: who gave it up, and when it is free again. A row whose time has passed is deleted by the next
-- username change or sign-up. Deleting the account deletes the row, so the name is free at once (answer 27).
create table private.held_username (
  username extensions.citext primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  held_until timestamptz not null
);

-- The cascade's lookup by player.
create index held_username_user on private.held_username (user_id);

alter table private.held_username enable row level security;

revoke all on table private.held_username from public, anon, authenticated, service_role;

-- Read only (E5): the profile route follows an old name to its player. With insert or delete, one statement run as
-- plor_app could hold any name against everyone or free every held one; the trigger below is the only writer.
grant select on table private.held_username to plor_app;

create policy held_username_plor_app_select on private.held_username for select to plor_app using (true);

-- Refuses a username that is held (OB017), by anyone, the player who gave it up included (answer 22), and holds the
-- old name when a username changes (answer 10: 30 days, the same 30 as profile_username_change's wait). It runs with
-- its owner's rights because plor_app can't write the table. Each name is locked first, in name order, as
-- take_auth_attempt locks a key: a sign-up for a name being given up waits for the rename and then sees its hold, a
-- volatile function reading a new snapshot per statement (PostgreSQL 17, 36.7 Function Volatility Categories).
-- Usernames are lower-case by profile_username_format, but that check runs after this trigger, so names are compared
-- as citext, by the operator's full name since the search_path is empty.
create function private.hold_username() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  n text;
begin
  if tg_op = 'UPDATE' and new.username::text is not distinct from old.username::text then
    return new;
  end if;
  for n in
    select lower(x) from unnest(array[new.username::text, case when tg_op = 'UPDATE' then old.username::text end]) as t(x)
    where x is not null order by 1
  loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('username:' || n, 0));
  end loop;
  delete from private.held_username where held_until <= statement_timestamp();
  if exists (select from private.held_username h where h.username operator(extensions.=) new.username) then
    raise exception 'username is held' using errcode = 'OB017';
  end if;
  if tg_op = 'UPDATE' then
    insert into private.held_username (username, user_id, held_until)
      values (old.username, old.user_id, statement_timestamp() + interval '30 days');
  end if;
  return new;
end;
$$;

revoke all on function private.hold_username() from public, anon, authenticated, service_role;

-- Named to fire after profile_username_change (triggers on one event fire in name order: PostgreSQL 17, 37.1 Overview
-- of Trigger Behavior), so a change inside 30 days is still that rule's refusal (OB011) and holds nothing.
create trigger profile_username_hold before insert or update of username on private.profile
  for each row execute function private.hold_username();
