-- M10 10b: groups and their members (docs/milestones/M10-groups.md, G1, G6, G8–G11). Security change: these tables
-- and plor_app's grants on them were approved by the human on 2026-10-22 (G10; DECISIONS.md Log).
-- Expected failures: OB009 group_full, OB010 too_many_groups.

-- A named group with one invite link that every member can share; only the creator renames it, resets the link,
-- removes members or deletes it (G1). Named player_group because "group" is an SQL keyword.
create table private.player_group (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  creator_id uuid not null,
  -- 16 random bytes written as 22 base64url characters, as friend invites (G8; M07 D3).
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  -- The display name rule (G11; M07 D1, profile_display_name_format in 20261022064011_display_name.sql).
  constraint player_group_name_format check (
    char_length(name) between 1 and 24
    and name ~ '^[[:alpha:][:digit:] ''._-]+$'
    and name !~ '(^ | $|  )'
    and name is nfc normalized
  ),
  constraint player_group_invite_code_format check (invite_code ~ '^[A-Za-z0-9_-]{22}$')
);

create table private.group_member (
  group_id uuid not null references private.player_group (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
-- The primary key serves lookups by group; this serves "my groups".
create index group_member_user_id on private.group_member (user_id);

-- The creator is always a member. Checked at commit, because a group and its first member are inserted together, and
-- a creator who leaves is replaced by the trigger below before the transaction ends (G6).
alter table private.player_group add constraint player_group_creator_is_member
  foreign key (id, creator_id) references private.group_member (group_id, user_id) deferrable initially deferred;

-- Before a membership is added or removed, the group's row is locked, so changes to one group's members run one at a
-- time: the member count can't pass the cap, and two members leaving at once can't both hand the group to each
-- other. A join also locks the joining player's profile, so their group count can't pass the cap either. A delete has
-- already locked its membership row by the time this runs, so the app's leave and remove statements lock the group
-- first (src/groups/groups.ts, LOCK_GROUP); otherwise a creator's handover can deadlock with the member it hands the
-- group to leaving at the same moment. Deleting an account (Auth's cascade) still takes them the other way round, so
-- it can deadlock with a leave in the same group, which aborts one of them (40P01): ROADMAP, Next revision, For M12.
create function private.group_member_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform from private.player_group where id = case when tg_op = 'INSERT' then new.group_id else old.group_id end for update;
  if tg_op = 'INSERT' then
    perform from private.profile where user_id = new.user_id for no key update;
    -- 50 members per group (G11, human, 2026-10-22); GROUP_MAX_MEMBERS in src/config/tunables.ts, which the groups
    -- route test checks against this.
    if (select count(*) from private.group_member where group_id = new.group_id) >= 50 then
      raise exception 'group_full: group % has 50 members', new.group_id using errcode = 'OB009';
    end if;
    -- 10 groups per player (G11, human, 2026-10-22); GROUPS_PER_PLAYER in src/config/tunables.ts, likewise.
    if (select count(*) from private.group_member where user_id = new.user_id) >= 10 then
      raise exception 'too_many_groups: % is in 10 groups', new.user_id using errcode = 'OB010';
    end if;
    return new;
  end if;
  return old;
end;
$$;
create trigger group_member_guard before insert or delete on private.group_member
  for each row execute function private.group_member_guard();

-- After a member leaves, is removed or deletes their account: the last member's group is deleted, and a creator's
-- group passes to the longest-standing member (G6). When the group itself was deleted, both find nothing to do. Runs
-- with its owner's rights because it sets creator_id, which plor_app may not (G10, Source diff); the guard above runs
-- the same way so both act alike whoever deletes the membership.
create function private.group_member_left() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select from private.group_member where group_id = old.group_id) then
    delete from private.player_group where id = old.group_id;
  else
    update private.player_group set creator_id = (
      select user_id from private.group_member where group_id = old.group_id order by joined_at, user_id limit 1
    ) where id = old.group_id and creator_id = old.user_id;
  end if;
  return null;
end;
$$;
create trigger group_member_left after delete on private.group_member
  for each row execute function private.group_member_left();

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which group and player a request touches is decided by the route from the verified session.
alter table private.player_group enable row level security;
alter table private.group_member enable row level security;
revoke all on table private.player_group, private.group_member from public, anon, authenticated, service_role;

-- Creating, reading and deleting a group; the creator renames it and resets its link. creator_id is set by the
-- handover trigger, which runs as its owner, so plor_app doesn't need it (G10 allowed it; Source diff).
grant select, insert, delete on table private.player_group to plor_app;
grant update (name, invite_code) on table private.player_group to plor_app;
create policy player_group_plor_app_select on private.player_group for select to plor_app using (true);
create policy player_group_plor_app_insert on private.player_group for insert to plor_app with check (true);
create policy player_group_plor_app_update on private.player_group for update to plor_app using (true) with check (true);
create policy player_group_plor_app_delete on private.player_group for delete to plor_app using (true);

-- Joining, listing members, leaving and removing (G6).
grant select, insert, delete on table private.group_member to plor_app;
create policy group_member_plor_app_select on private.group_member for select to plor_app using (true);
create policy group_member_plor_app_insert on private.group_member for insert to plor_app with check (true);
create policy group_member_plor_app_delete on private.group_member for delete to plor_app using (true);
