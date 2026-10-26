-- M14 14b-1: the player's theme, saved on the account (docs/milestones/M14-14b-1-themes.md; L20: "On the account").
-- 'device' follows the device's light or dark (Paper or Night); the others are the presets of L21. Security change,
-- approved by the human (2026-10-24: "Approve it (Recommended)"; DECISIONS.md Log): plor_app may update this column,
-- and the route names only the signed-in player's row. The update policy on private.profile
-- (20261022064011_display_name.sql) already covers it.
alter table private.profile
  add column theme text not null default 'device'
  constraint profile_theme check (theme in ('device', 'paper', 'night', 'sky', 'moonlit', 'ink'));

grant update (theme) on table private.profile to plor_app;
