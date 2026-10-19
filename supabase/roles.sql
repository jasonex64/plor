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
-- plor_publisher: the only role `npm run content:publish` connects as (DECISIONS.md: Content publishing role).
-- Same rules: no password here, the human sets it with psql `\password plor_publisher`.
do $$
begin
  if not exists (select from pg_roles where rolname in ('riff_app', 'plor_app')) then
    create role riff_app login noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'plor_publisher') then
    create role plor_publisher login noinherit;
  end if;
end
$$;
