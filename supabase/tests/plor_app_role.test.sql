-- plor_app must be a plain login role with nothing beyond what a milestone explicitly grants
-- (DECISIONS.md: App database role). Run with `npm run test:sql`.
begin;
-- Remotely, `supabase test db --linked` logs in as cli_login_postgres, which has no USAGE on the
-- `extensions` schema where pgTAP lives and no `extensions` on its search_path. pgTAP's own functions
-- call each other unqualified, so both are needed; both are scoped to this transaction only.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_role('plor_app');
-- The rename left no login behind under the old name (migration 20261019070813).
select hasnt_role('riff_app');
select ok((select rolcanlogin from pg_roles where rolname = 'plor_app'), 'plor_app can log in');
select ok(
  not (select rolsuper or rolcreaterole or rolcreatedb or rolreplication or rolbypassrls or rolinherit
       from pg_roles where rolname = 'plor_app'),
  'plor_app has no admin attributes, no RLS bypass, and does not inherit');
select ok(has_database_privilege('plor_app', 'postgres', 'connect'), 'plor_app can connect');
select ok(not has_schema_privilege('plor_app', 'public', 'usage'), 'plor_app cannot use schema public');
select ok(not has_database_privilege('plor_app', 'postgres', 'temporary'), 'plor_app cannot create temp tables');

-- A function created by postgres after the migration must not be executable by plor_app by default.
create function public.tx_probe_fn() returns int language sql as 'select 1';
select ok(not has_function_privilege('plor_app', 'public.tx_probe_fn()', 'execute'),
  'new functions are not executable by plor_app by default');

-- Guard against breaking Supabase itself: the Data API roles keep their own grant on public.
select ok(has_schema_privilege('anon', 'public', 'usage'), 'anon still uses schema public');
select ok(has_schema_privilege('authenticated', 'public', 'usage'), 'authenticated still uses schema public');

-- M02: reading and creating a profile, and nothing else (docs/milestones/M02-sign-in-and-play.md).
select ok(has_schema_privilege('plor_app', 'private', 'usage'), 'plor_app can use schema private');
select ok(not has_schema_privilege('plor_app', 'private', 'create'), 'plor_app cannot create objects in private');
select ok(has_table_privilege('plor_app', 'private.profile', 'select'), 'plor_app can read profiles');
select ok(has_table_privilege('plor_app', 'private.profile', 'insert'), 'plor_app can create profiles');
-- A comma list is true when any one privilege is held, so this asserts none of them is.
select ok(not has_table_privilege('plor_app', 'private.profile', 'update, delete, truncate, references, trigger'),
  'plor_app cannot change, delete, truncate, reference or trigger on profiles');

-- M02 2b and M03: everything plor_app and plor_publisher may do in `private`, listed exactly (M02 ticket: "only the
-- grants these routes need"). A new grant has to be added here on purpose.
create function pg_temp.grants(who text) returns text[] language sql return (
  select array_agg(g order by g) from (
    select format('%s %s', c.oid::regclass, p.priv) as g
    from pg_class c
    cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate'), ('references'), ('trigger')) as p(priv)
    where c.relnamespace = 'private'::regnamespace and c.relkind in ('r', 'v', 'm', 'p', 'f')
      and has_table_privilege(who, c.oid, p.priv)
    union all
    select format('%s execute', f.oid::regprocedure)
    from pg_proc f
    where f.pronamespace = 'private'::regnamespace and has_function_privilege(who, f.oid, 'execute')
  ) as held);
select is(pg_temp.grants('plor_app'), array[
  'private.admin select',
  'private.day_of(timestamp with time zone) execute',
  'private.missed_answer insert', 'private.missed_answer select',
  'private.profile insert', 'private.profile select',
  'private.puzzle select',
  'private.run insert', 'private.run select',
  'private.run_event insert', 'private.run_event select',
  'private.run_status select',
  'private.today() execute'], 'plor_app holds exactly the grants the routes need');
select is(pg_temp.grants('plor_publisher'), array[
  'private.day_of(timestamp with time zone) execute',
  'private.puzzle insert', 'private.puzzle select', 'private.puzzle update',
  'private.today() execute'], 'plor_publisher holds exactly what content:publish needs');

select * from finish();
rollback;
