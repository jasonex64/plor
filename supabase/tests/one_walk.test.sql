-- The base's shape (docs/milestones/M13-13e-5-the-base-shape.md): one downward walk, and imports refuse kind_of circles.
-- Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- animal > mammal > dog > puppy, in a test source's IDs. Aliases start with "ow" so real loaded data can sit beside it.
select private.import_source('oewn', 'one-walk-test', '[
  {"id": "ow-animal", "name": "ow animal", "aliases": [{"alias": "ow animal", "kind": "name"}]},
  {"id": "ow-mammal", "name": "ow mammal", "aliases": [{"alias": "ow mammal", "kind": "name"}], "kind_of": ["ow-animal"]},
  {"id": "ow-dog", "name": "ow dog", "aliases": [{"alias": "ow dog", "kind": "name"}], "kind_of": ["ow-mammal"]},
  {"id": "ow-puppy", "name": "ow puppy", "aliases": [{"alias": "ow puppy", "kind": "name"}], "kind_of": ["ow-dog"]}
]'::jsonb);
create function pg_temp.under(p_ref text) returns text[] language sql
  return (select array_agg(t.name order by t.name) from private.descendants_now(array[private.thing_by_ref('oewn', p_ref)]) d join private.thing t on t.id = d);

select is(pg_temp.under('ow-mammal'), array['ow dog', 'ow mammal', 'ow puppy'], 'a walk down holds the thing and everything under it');

update private.fact set removed_at = now()
where thing_id = private.thing_by_ref('oewn', 'ow-puppy') and value_thing = private.thing_by_ref('oewn', 'ow-dog');
select is(pg_temp.under('ow-mammal'), array['ow dog', 'ow mammal'], 'a removed kind_of fact is not walked');
update private.fact set removed_at = null
where thing_id = private.thing_by_ref('oewn', 'ow-puppy') and value_thing = private.thing_by_ref('oewn', 'ow-dog');

-- A base loaded before 13e-5 may already hold a circle (imports didn't refuse them), so the walk must still stop.
insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
values (private.thing_by_ref('oewn', 'ow-animal'), 'kind_of', private.thing_by_ref('oewn', 'ow-puppy'), 'source', 'one-walk-old-circle');
select is(pg_temp.under('ow-mammal'), array['ow animal', 'ow dog', 'ow mammal', 'ow puppy'], 'a walk down stops on a circle loaded before 13e-5');
delete from private.fact where source_ref = 'one-walk-old-circle';

create function pg_temp.base_size() returns int language sql
  return (select count(*)::int from private.fact) + (select count(*)::int from private.thing) + (select count(*)::int from private.base_log)
    + (select count(*)::int from private.thing_source) + (select count(*)::int from private.thing_alias);
create temp table before as select pg_temp.base_size() as n;

-- A later import that puts animal under puppy closes animal > mammal > dog > puppy > animal.
select throws_like($$ select private.import_source('oewn', 'one-walk-circle', '[
  {"id": "ow-animal", "name": "ow animal", "aliases": [], "kind_of": ["ow-puppy"]}
]'::jsonb) $$, 'import_source: a kind_of circle: ow animal (%) kind_of ow puppy (%), and ow puppy is already under ow animal',
  'an import closing a circle with facts already loaded is refused, naming the fact that closes it');
select is(pg_temp.base_size(), (select n from before), 'a refused import leaves the base unchanged');

-- A circle made entirely inside one import.
select throws_ok($$ select private.import_source('oewn', 'one-walk-own-circle', '[
  {"id": "ow-a", "name": "ow a", "aliases": [], "kind_of": ["ow-b"]},
  {"id": "ow-b", "name": "ow b", "aliases": [], "kind_of": ["ow-a"]}
]'::jsonb) $$, 'P0001', null, 'an import whose own facts make a circle is refused');
select is(pg_temp.base_size(), (select n from before), 'and leaves the base unchanged');

select lives_ok($$ select private.import_source('oewn', 'one-walk-second-parent', '[
  {"id": "ow-puppy", "name": "ow puppy", "aliases": [], "kind_of": ["ow-mammal"]}
]'::jsonb) $$, 'a second parent higher in the same branch is no circle');

select * from finish();
rollback;
