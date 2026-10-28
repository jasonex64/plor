-- Cluster-level roles. Applied by `supabase start` and `supabase db push --include-roles`
-- (supabase.com/docs/reference/cli/supabase-db-push). Roles are not dumped or reset with the schema, and a remote
-- reset keeps them (supabase.com/docs/reference/cli/supabase-db-reset).
--
-- plor_app: the only role app code connects as (DECISIONS.md: App database role).
-- No password here: a human sets it with psql `\password plor_app`, which never sends cleartext
-- (postgresql.org/docs/17/sql-alterrole.html). Grants are in the migrations.
--
-- A database that already has it is left alone, so this never creates a second login. Its first name, riff_app, and
-- the publisher role created only for the first migrations went with the migration squash
-- (docs/milestones/M13-13g-migration-squash.md; the human, 2026-10-28: "Drop them (Recommended)").
do $$
begin
  if not exists (select from pg_roles where rolname = 'plor_app') then
    create role plor_app login noinherit;
  end if;
end
$$;
