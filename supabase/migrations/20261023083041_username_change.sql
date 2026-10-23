-- M12 12b: a player can change their username once every 30 days (docs/milestones/M12-account.md, A2; human,
-- 2026-10-23). Security change: plor_app may now update the username column, which it couldn't since M02 (DECISIONS.md
-- Log). The update policy on private.profile (20261022064011_display_name.sql) already covers it.

-- When the username last changed; null until the first change, so a wrong pick at sign-up can be fixed at once (A2).
alter table private.profile add column username_changed_at timestamptz;

-- The rule lives in the database, as the username's format and uniqueness do: a trigger stamps each change, and
-- refuses one within 30 days of the last (OB011). It runs with the caller's rights: column privileges are checked
-- against the columns an UPDATE names, not those a BEFORE trigger writes into NEW, so plor_app's grant on the username
-- alone is enough for the stamp (M12 12b review: least privilege).
create function private.profile_username_change() returns trigger
  language plpgsql security invoker set search_path = ''
as $$
begin
  if new.username::text is distinct from old.username::text then
    if old.username_changed_at is not null and statement_timestamp() < old.username_changed_at + interval '30 days' then
      raise exception 'username changed less than 30 days ago' using errcode = 'OB011';
    end if;
    new.username_changed_at := statement_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function private.profile_username_change() from public, anon, authenticated, service_role;

create trigger profile_username_change before update of username on private.profile
  for each row execute function private.profile_username_change();

grant update (username) on table private.profile to plor_app;
