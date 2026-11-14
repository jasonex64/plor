-- M16 16f-1: the "Numbers on the calendar" setting is removed (human, 2026-11-13: "Remove the setting"). Dropping the
-- column drops its column grant to plor_app; plor_app keeps update (skip_game_screen) and update (theme), and nothing wider.
alter table private.profile drop column calendar_numbers;
