-- A category's answer pool for the admin pages (docs/milestones/M15-15g-the-answer-pool.md): only an admin may read it,
-- it counts the category's members, finds them by a substring of any live alias, and gives them a page at a time.
-- Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- Four answers under a root of their own, so real loaded data can sit beside them. "zq" is in no other alias here:
-- one name holds it, one synonym holds it, and one alias that held it is removed.
select private.import_source('wikidata', 'pool-test-1', '[
  {"id": "pR", "name": "pool fixture root", "aliases": [{"alias": "pool fixture root", "kind": "name"}]},
  {"id": "pA", "name": "Azqa Tart", "aliases": [{"alias": "azqa tart", "kind": "name"}, {"alias": "zqt", "kind": "synonym"}], "kind_of": ["pR"]},
  {"id": "pB", "name": "Brie", "aliases": [{"alias": "brie", "kind": "name"}], "kind_of": ["pR"]},
  {"id": "pC", "name": "camembert", "aliases": [{"alias": "camembert", "kind": "name"}, {"alias": "the zq cheese", "kind": "synonym"}], "kind_of": ["pR"]},
  {"id": "pD", "name": "Dill", "aliases": [{"alias": "dill", "kind": "name"}, {"alias": "zq frond", "kind": "synonym"}], "kind_of": ["pR"]}
]'::jsonb);
update private.thing_alias set removed_at = now() where alias = 'zq frond';
select private.define_category('pool_fixture', 'pool fixture', 'wikidata', 'pR', null);

create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@pool.example.test' from generate_series(1, 2) as s(n);
insert into private.admin (user_id) values (pg_temp.u(1));
-- The names on a page, in the order given.
create function pg_temp.names(pool jsonb) returns text[] language sql
  return (select coalesce(array_agg(r.value ->> 'name' order by r.n), '{}') from jsonb_array_elements(pool -> 'rows') with ordinality as r(value, n));

select throws_ok(format('select private.category_pool(%L, %L, %L, 0, 20)', pg_temp.u(2), 'pool_fixture', ''), 'OB007', null,
  'a player who isn''t an admin can''t read a pool');
select is(private.category_pool(pg_temp.u(1), 'no_such_category', '', 0, 20), null, 'an unknown category has no pool');

-- The whole pool: the count category_members gives, every member, by name whatever its case.
select is((private.category_pool(pg_temp.u(1), 'pool_fixture', '', 0, 20) ->> 'members')::int,
  (select count(*)::int from private.category_members('pool_fixture')), 'the member count is category_members''');
select is((private.category_pool(pg_temp.u(1), 'pool_fixture', '', 0, 20) ->> 'matching')::int, 4, 'with nothing typed every member matches');
select is(pg_temp.names(private.category_pool(pg_temp.u(1), 'pool_fixture', '', 0, 20)), array['Azqa Tart', 'Brie', 'camembert', 'Dill'],
  'the members come by name, capitals and small letters together');

-- A search: a substring of any live alias.
select is(pg_temp.names(private.category_pool(pg_temp.u(1), 'pool_fixture', 'zq', 0, 20)), array['Azqa Tart', 'camembert'],
  'a search finds every member with a live alias holding the text, and no member whose only such alias was removed');
select is((private.category_pool(pg_temp.u(1), 'pool_fixture', 'zq', 0, 20) ->> 'matching')::int, 2, 'and counts them');
select is((private.category_pool(pg_temp.u(1), 'pool_fixture', 'zq', 0, 20) ->> 'members')::int, 4, 'the member count stays the whole pool''s');
select is(private.category_pool(pg_temp.u(1), 'pool_fixture', 'zq', 0, 20) -> 'rows' -> 0 ->> 'alias', 'azqa tart',
  'a member found by its name gives the name''s alias, not another that also matches');
select is(private.category_pool(pg_temp.u(1), 'pool_fixture', 'zq', 0, 20) -> 'rows' -> 1 ->> 'alias', 'the zq cheese',
  'a member found only by another alias gives that alias');
select is(private.category_pool(pg_temp.u(1), 'pool_fixture', 'no member holds this', 0, 20),
  '{"members": 4, "matching": 0, "rows": []}'::jsonb, 'a search nothing holds gives no rows and still the member count');

-- Pages: the next starts where the last ended; no limit gives them all.
select is(pg_temp.names(private.category_pool(pg_temp.u(1), 'pool_fixture', '', 0, 3)) || pg_temp.names(private.category_pool(pg_temp.u(1), 'pool_fixture', '', 3, 3)),
  array['Azqa Tart', 'Brie', 'camembert', 'Dill'], 'two pages hold every member once, in order');
select is((private.category_pool(pg_temp.u(1), 'pool_fixture', '', 3, 3) ->> 'matching')::int, 4, 'a later page still counts every match');
select is(jsonb_array_length(private.category_pool(pg_temp.u(1), 'pool_fixture', '', 0, null) -> 'rows'), 4, 'no limit gives every member');

select ok(has_function_privilege('plor_app', 'private.category_pool(uuid,text,text,integer,integer)', 'execute')
  and not has_function_privilege('authenticated', 'private.category_pool(uuid,text,text,integer,integer)', 'execute')
  and not has_function_privilege('anon', 'private.category_pool(uuid,text,text,integer,integer)', 'execute'),
  'plor_app may execute it, and the website''s other roles may not');

select * from finish();
rollback;
