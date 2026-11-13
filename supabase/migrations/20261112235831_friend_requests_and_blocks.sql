-- M17 17a: friend requests and blocks (docs/milestones/M17-profiles-and-friend-requests.md, "17a design").
-- Security change: these tables, plor_app's grants on them, the two triggers and private.unblock were approved by the
-- human on 2026-11-12 ("Yes, build as proposed"; the ticket's answer 30; DECISIONS.md Log).
-- Expected failure: OB016 blocked (a friendship while either player has blocked the other).

-- A row is a pending request: accepting, declining or cancelling deletes it, so there is no status column and a
-- declined request is shown nowhere (answer 23).
create table private.friend_request (
  sender uuid not null references auth.users (id) on delete cascade,
  receiver uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sender, receiver),
  constraint friend_request_not_self check (sender <> receiver)
);

-- One request per pair, whichever of the two sent it: two crossing requests can never both sit pending.
create unique index friend_request_pair on private.friend_request (least(sender, receiver), greatest(sender, receiver));

-- The primary key serves "requests I sent"; this serves "requests to me".
create index friend_request_receiver on private.friend_request (receiver);

alter table private.friend_request enable row level security;

create table private.block (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  constraint block_not_self check (blocker <> blocked)
);

-- A block is looked up both ways (src/friends/circle.ts, blockedSql); the primary key serves the blocker's side.
create index block_blocked on private.block (blocked);

alter table private.block enable row level security;

-- A block ends the pair's friendship (answer 20) and deletes the blocker's own pending request to the blocked player
-- (D3: left in place, the blocked player could accept it and learn of the block from the refusal below). The blocked
-- player's request to the blocker stays, hidden from the blocker by the routes (answer 28). It runs with the caller's
-- rights, as profile_username_change does: plor_app holds the delete on both tables.
create function private.block_ends_friendship() returns trigger
  language plpgsql security invoker set search_path = ''
as $$
begin
  delete from private.friendship f
    where f.user_a = least(new.blocker, new.blocked) and f.user_b = greatest(new.blocker, new.blocked);
  delete from private.friend_request r where r.sender = new.blocker and r.receiver = new.blocked;
  return null;
end;
$$;

-- No friendship while either player has blocked the other (answer 29), whatever route writes it.
create function private.friendship_unblocked() returns trigger
  language plpgsql security invoker set search_path = ''
as $$
begin
  if exists (select from private.block k
             where k.blocker = new.user_a and k.blocked = new.user_b or k.blocker = new.user_b and k.blocked = new.user_a) then
    raise exception 'blocked: no friendship while either player has blocked the other' using errcode = 'OB016';
  end if;
  return new;
end;
$$;

create trigger block_ends_friendship after insert on private.block
  for each row execute function private.block_ends_friendship();

create trigger friendship_unblocked before insert on private.friendship
  for each row execute function private.friendship_unblocked();

-- Lifts one block, the named pair's, and says whether there was one (answer 21). With it goes the blocked player's
-- hidden request to the blocker, so a request the blocker never saw doesn't appear on the unblock (D2). plor_app holds
-- no delete on private.block: a table grant would let one statement lift every block at once (D4). It is not a wall:
-- plor_app can read every block, so it could name any pair, as with private.end_guest_run.
create function private.unblock(p_blocker uuid, p_blocked uuid) returns boolean
  language plpgsql security definer set search_path = ''
as $$
begin
  delete from private.block k where k.blocker = p_blocker and k.blocked = p_blocked;
  if not found then
    return false;
  end if;
  delete from private.friend_request r where r.sender = p_blocked and r.receiver = p_blocker;
  return true;
end;
$$;

-- Privileges. Policies: one per granted command, for plor_app only (DECISIONS.md, Row-level security in `private`).
revoke all on table private.friend_request, private.block from public, anon, authenticated, service_role;

-- Sending, listing, and deleting on an accept, a decline or a cancel. No update: a request never changes.
grant select, insert, delete on table private.friend_request to plor_app;

-- Blocking and reading blocks. No delete: private.unblock.
grant select, insert on table private.block to plor_app;

create policy friend_request_plor_app_select on private.friend_request for select to plor_app using (true);
create policy friend_request_plor_app_insert on private.friend_request for insert to plor_app with check (true);
create policy friend_request_plor_app_delete on private.friend_request for delete to plor_app using (true);
create policy block_plor_app_select on private.block for select to plor_app using (true);
create policy block_plor_app_insert on private.block for insert to plor_app with check (true);

revoke all on function private.block_ends_friendship(), private.friendship_unblocked(), private.unblock(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.unblock(uuid, uuid) to plor_app;
