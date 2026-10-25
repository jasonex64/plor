-- M14 14a-3b: the player's two settings, saved on the account (docs/milestones/M14-14a-3b-settings.md): Skip the game
-- screen (L39: Play goes straight to question 1) and Numbers on the calendar (L46). Both off until the player turns
-- them on (L39's default; L46's "if u want"). Security change, approved by the human (2026-10-25: "Approve it
-- (Recommended)"; DECISIONS.md Log): plor_app may update these two columns, and the route names only the signed-in
-- player's row. The update policy on private.profile (20261022064011_display_name.sql) already covers it.
alter table private.profile
  add column skip_game_screen boolean not null default false,
  add column calendar_numbers boolean not null default false;

grant update (skip_game_screen, calendar_numbers) on table private.profile to plor_app;
