-- M19 19d: a finished guest run is no longer ended by its first read; private.purge_guest_days clears it with the day's
-- other guest runs (docs/milestones/M19-pre-beta-fixes.md, answers 10, 16 and 17). Nothing calls end_guest_run any more.
-- Security change of the removing kind (DECISIONS.md, log, 2026-11-13): dropping the function drops plor_app's execute
-- grant on it; nothing is granted.
--
-- On a deployed site this goes to the database after the code that stops calling it, not before.
drop function private.end_guest_run(text, text);
