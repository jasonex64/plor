-- Cluster-level roles. Applied by `supabase start` and `supabase db push --include-roles`
-- (supabase.com/docs/reference/cli/supabase-db-push). Roles are not dumped or reset with the schema.
--
-- plor_app: the only role app code connects as (DECISIONS.md: App database role).
-- No password here: a human sets it with psql `\password plor_app`, which never sends cleartext
-- (postgresql.org/docs/17/sql-alterrole.html). Grants are added per milestone, in migrations.
--
-- It is created under its first name, riff_app, because the applied migrations up to
-- 20261018105903_create_profile.sql grant to that name and can't be edited; migration
-- 20261019070813_rename_riff_app_to_plor_app.sql then renames it. A database that already has
-- either name is left alone, so this never creates a second login next to plor_app.
--
-- plor_publisher: created only because the applied migration 20261019074108_create_game_tables.sql grants to it and
-- can't be edited. Migration 20261021232903_puzzle_entry.sql drops it again: puzzles now get in through the admin
-- page alone (docs/milestones/M06-puzzle-entry.md).
do $$
declare
  dropped boolean := false;
begin
  if not exists (select from pg_roles where rolname in ('riff_app', 'plor_app')) then
    create role riff_app login noinherit;
  end if;
  -- Only while 20261021232903 hasn't run: afterwards a push with --include-roles would bring the dropped role back.
  -- The migrations table may not exist yet on a fresh database, so it's read through dynamic SQL.
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    execute $q$select exists (select from supabase_migrations.schema_migrations where version = '20261021232903')$q$ into dropped;
  end if;
  if not dropped and not exists (select from pg_roles where rolname = 'plor_publisher') then
    create role plor_publisher login noinherit;
  end if;
end
$$;
