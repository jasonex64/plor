-- Nothing in `private` is reachable by the Data API roles, now or for any object added later
-- (M00 data design, "Principles used throughout"; ROADMAP: verify `private` isn't exposed). Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon cannot use schema private');
select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated cannot use schema private');

-- Every table, view and sequence in `private`, checked for every table privilege, so a new object
-- that forgets its revoke fails here without this file changing.
select is(
  (select array_agg(format('%s %s %s', r.role, p.priv, c.oid::regclass) order by 1)
   from pg_class c
   cross join (values ('anon'), ('authenticated')) as r(role)
   cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate'), ('references'), ('trigger')) as p(priv)
   where c.relnamespace = 'private'::regnamespace and c.relkind in ('r', 'v', 'm', 'p', 'f')
     and has_table_privilege(r.role, c.oid, p.priv)),
  null, 'anon and authenticated hold no privilege on any private table or view');

select is(
  (select array_agg(format('%s %s', r.role, p.oid::regprocedure) order by 1)
   from pg_proc p
   cross join (values ('anon'), ('authenticated')) as r(role)
   where p.pronamespace = 'private'::regnamespace and has_function_privilege(r.role, p.oid, 'execute')),
  null, 'anon and authenticated cannot execute any private function');

-- RLS is the backstop behind the grants: on for every table, with policies only for plor_app.
select is(
  (select array_agg(c.oid::regclass::text order by 1) from pg_class c
   where c.relnamespace = 'private'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null, 'every private table has RLS enabled');
select is(
  (select array_agg(format('%s on %s.%s for %s', policyname, schemaname, tablename, array_to_string(roles, ',')) order by 1)
   from pg_policies where schemaname = 'private' and roles <> '{plor_app}'),
  null, 'every private policy applies to plor_app only');

select * from finish();
rollback;
