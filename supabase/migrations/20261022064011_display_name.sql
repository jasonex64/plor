-- M07 7a: an optional display name, shown to other players instead of the username, changeable any time
-- (docs/milestones/M07-friends-and-live-board.md, D1). The username stays the unique handle.
alter table private.profile add column display_name text;

-- 1 to 24 characters: letters in any script (accents included), digits, spaces and ' . _ -; no leading, trailing
-- or double spaces; stored in NFC so one name has one spelling (human, 2026-10-21, M07 D1). [[:alpha:]] accepted
-- Zoë, Łukasz and 名前 and refused emoji under the local stack's ICU en_US.UTF-8 locale (observed 2026-10-21);
-- that the hosted database's locale behaves the same is unverified until the migrations are pushed (M15).
alter table private.profile add constraint profile_display_name_format check (
  display_name is null or (
    char_length(display_name) between 1 and 24
    and display_name ~ '^[[:alpha:][:digit:] ''._-]+$'
    and display_name !~ '(^ | $|  )'
    and display_name is nfc normalized
  )
);

-- plor_app may change this one column, and only through an UPDATE the route scopes to the signed-in player
-- (DECISIONS.md: Row-level security in `private`, one policy per granted command).
grant update (display_name) on table private.profile to plor_app;
create policy profile_plor_app_update on private.profile for update to plor_app using (true) with check (true);
