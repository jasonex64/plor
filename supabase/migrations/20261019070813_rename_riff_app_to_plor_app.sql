-- The platform is named Plor, so the app's login becomes plor_app (human, 2026-10-19; DECISIONS.md Log).
-- Grants and policies belong to the role itself, not its name, so they carry over. A SCRAM password survives a
-- rename; only an MD5 one is cleared (postgresql.org/docs/17/sql-alterrole.html), and then the human sets it
-- again with psql `\password plor_app`. The two earlier migrations name riff_app and can't be edited, so
-- supabase/roles.sql still creates riff_app on a fresh database and this migration renames it.
alter role riff_app rename to plor_app;

alter policy profile_riff_app_select on private.profile rename to profile_plor_app_select;
alter policy profile_riff_app_insert on private.profile rename to profile_plor_app_insert;
