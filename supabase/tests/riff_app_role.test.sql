-- riff_app must be a plain login role with nothing beyond what a milestone explicitly grants
-- (DECISIONS.md: App database role). Run with `npm run test:sql`.
begin;
-- Remotely, `supabase test db --linked` logs in as cli_login_postgres, which has no USAGE on the
-- `extensions` schema where pgTAP lives and no `extensions` on its search_path. pgTAP's own functions
-- call each other unqualified, so both are needed; both are scoped to this transaction only.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_role('riff_app');
select ok((select rolcanlogin from pg_roles where rolname = 'riff_app'), 'riff_app can log in');
select ok(
  not (select rolsuper or rolcreaterole or rolcreatedb or rolreplication or rolbypassrls or rolinherit
       from pg_roles where rolname = 'riff_app'),
  'riff_app has no admin attributes, no RLS bypass, and does not inherit');
select ok(has_database_privilege('riff_app', 'postgres', 'connect'), 'riff_app can connect');
select ok(not has_schema_privilege('riff_app', 'public', 'usage'), 'riff_app cannot use schema public');
select ok(not has_database_privilege('riff_app', 'postgres', 'temporary'), 'riff_app cannot create temp tables');

-- A function created by postgres after the migration must not be executable by riff_app by default.
create function public.tx_probe_fn() returns int language sql as 'select 1';
select ok(not has_function_privilege('riff_app', 'public.tx_probe_fn()', 'execute'),
  'new functions are not executable by riff_app by default');

-- Guard against breaking Supabase itself: the Data API roles keep their own grant on public.
select ok(has_schema_privilege('anon', 'public', 'usage'), 'anon still uses schema public');
select ok(has_schema_privilege('authenticated', 'public', 'usage'), 'authenticated still uses schema public');

select * from finish();
rollback;
