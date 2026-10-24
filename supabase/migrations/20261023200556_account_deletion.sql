-- M12 12c: a player deletes their own account (docs/milestones/M12-account.md, A4, A5, A7, A10; human, 2026-10-23).
-- Security changes (DECISIONS.md Log): plor_app may execute private.delete_account, which deletes the player's
-- auth.users row with its owner's rights; and plor_app's insert on private.profile narrows to (user_id, username).

-- Deleting a run cascades to its comments and reactions by the run's key, which neither table had an index on, so
-- every run deleted with an account scanned both (ROADMAP "Next revision", For M12).
create index comment_run on private.comment (user_id, game_id, puzzle_date);
create index reaction_run_owner on private.reaction (user_id, game_id, puzzle_date);

-- Deletes an account when given the player's own username, as typed on the account page (A4), and says whether it did.
-- The route passes only the verified player's ID, so plor_app can delete no one else (A7). Deleting the auth.users row
-- removes everything else of theirs through its cascades (A5; M00 data design §7), Auth's sessions included, which ends
-- their refresh tokens (SOURCES.md, Supabase user management, "Removing account access").
create function private.delete_account(p_user_id uuid, p_username text) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  g uuid;
begin
  if not exists (select from private.profile where user_id = p_user_id and username::text = p_username) then
    return false;
  end if;
  -- Leave each group first, the way leaveGroup does: the group's lock, then the membership (src/groups/groups.ts,
  -- LOCK_GROUP), so the handover and last-member rules run as for any leave (M10 G6). Left to the auth.users cascade,
  -- the memberships went the other way round and deadlocked with a creator leaving the same group (12c plan step 1).
  for g in select group_id from private.group_member where user_id = p_user_id order by group_id loop
    perform from private.player_group where id = g for update;
    delete from private.group_member where group_id = g and user_id = p_user_id;
  end loop;
  delete from auth.users where id = p_user_id;
  return true;
end;
$$;
revoke all on function private.delete_account(uuid, text) from public, anon, authenticated, service_role;
grant execute on function private.delete_account(uuid, text) to plor_app;

-- A10: a profile is created naming its user ID and username only; username_changed_at belongs to the trigger
-- (20261023083041_username_change.sql).
revoke insert on table private.profile from plor_app;
grant insert (user_id, username) on table private.profile to plor_app;
