-- The answer database's base (docs/milestones/M13-13a-the-base.md): imports, category recipes over the kind_of tree,
-- and the admin lookup. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Its aliases start with "fx" where a lookup uses them, so real loaded data can sit beside it. A small tree in a test source's IDs: animal > bear > polar bear, panda; animal > fish; food > fruit and vegetable,
-- with tomato under both (human, 2026-10-24: "Accept in both"); a cycle a <-> b, as a messy source might have.
select is(private.import_source('wikidata', 'test-1', '[
  {"id": "tA", "name": "animal", "aliases": [{"alias": "animal", "kind": "name"}]},
  {"id": "tB", "name": "bear", "aliases": [{"alias": "bear", "kind": "name"}, {"alias": "bears", "kind": "plural"}], "kind_of": ["tA"]},
  {"id": "tP", "name": "polar bear", "aliases": [{"alias": "polar bear", "kind": "name"}, {"alias": "fx ursus maritimus", "kind": "scientific"}], "kind_of": ["tB"]},
  {"id": "tG", "name": "Ailuropoda melanoleuca", "aliases": [{"alias": "fx ailuropoda melanoleuca", "kind": "scientific"}], "kind_of": ["tB"]},
  {"id": "tF", "name": "fish", "aliases": [{"alias": "fish", "kind": "name"}], "kind_of": ["tA"]},
  {"id": "tX", "name": "food", "aliases": [{"alias": "food", "kind": "name"}]},
  {"id": "tR", "name": "fruit", "aliases": [{"alias": "fruit", "kind": "name"}], "kind_of": ["tX"]},
  {"id": "tV", "name": "vegetable", "aliases": [{"alias": "vegetable", "kind": "name"}], "kind_of": ["tX"]},
  {"id": "tT", "name": "tomato", "aliases": [{"alias": "fx tomato", "kind": "name"}], "kind_of": ["tR", "tV"]},
  {"id": "tC1", "name": "loop one", "aliases": [{"alias": "loop one", "kind": "name"}], "kind_of": ["tC2", "tF"]},
  {"id": "tC2", "name": "loop two", "aliases": [{"alias": "loop two", "kind": "name"}], "kind_of": ["tC1"]}
]'::jsonb), '{"things": 11, "aliases": 13, "facts": 11}'::jsonb, 'an import adds its things, aliases and facts');

select is(private.import_source('wikidata', 'test-2', '[
  {"id": "tB", "name": "renamed", "aliases": [{"alias": "bear", "kind": "name"}, {"alias": "bruin", "kind": "synonym"}], "kind_of": ["tA"]}
]'::jsonb), '{"things": 0, "aliases": 1, "facts": 0}'::jsonb, 'a later snapshot adds only what is new');
select is((select t.name from private.thing t join private.thing_source s on s.thing_id = t.id where s.source_id = 'tB'),
  'bear', 'and keeps an existing thing''s name');
select throws_ok($$ select private.import_source('wikidata', 'test-3', '[{"id": "tZ", "name": "z", "aliases": [], "kind_of": ["nope"]}]') $$,
  'P0001', null, 'a fact naming an unknown ID loads nothing');
select is((select count(*)::int from private.thing_source where source_id = 'tZ'), 0, 'not even the thing itself');
select is((select count(*)::int from private.base_log where action = 'import' and detail->>'snapshot' like 'test-%'), 2,
  'each import that loaded is logged');

select private.define_category('animal', 'animal', 'wikidata', 'tA', null);
select private.define_category('fruit', 'fruit', 'wikidata', 'tR', null);
select private.define_category('vegetable', 'vegetable', 'wikidata', 'tV', null);
create function pg_temp.members(k text) returns text[] language sql
  return (select array_agg(t.name order by t.name) from private.category_members(k) m join private.thing t on t.id = m);
select is(pg_temp.members('animal'), array['bear', 'fish', 'loop one', 'loop two', 'polar bear'],
  'a category holds everything under its root that has a typeable name, through a cycle, but not the root');
select is(pg_temp.members('fruit'), array['tomato'], 'tomato is a fruit');
select is(pg_temp.members('vegetable'), array['tomato'], 'and a vegetable');
select throws_ok($$ select private.define_category('x', 'x', 'wikidata', 'missing', null) $$, 'P0001', null,
  'a category must name a known root');

-- member_of narrows a category: only the things under its root that are members of the given thing.
select private.import_source('wikidata', 'test-4', '[
  {"id": "cC", "name": "country", "aliases": [{"alias": "country", "kind": "name"}]},
  {"id": "cU", "name": "United Nations", "aliases": [{"alias": "united nations", "kind": "name"}]},
  {"id": "cF", "name": "France", "aliases": [{"alias": "france", "kind": "name"}], "kind_of": ["cC"], "member_of": ["cU"]},
  {"id": "cT", "name": "Taiwan", "aliases": [{"alias": "taiwan", "kind": "name"}], "kind_of": ["cC"]}
]'::jsonb);
select private.define_category('un_country', 'country', 'wikidata', 'cC', 'cU');
select is(pg_temp.members('un_country'), array['France'], 'member_of keeps only members');

-- Another source: same_as links an entry to an existing thing; a "source:id" ref names another source's thing.
select is(private.import_source('usda', 'test-5', '[
  {"id": "u1", "name": "tomatoes, raw", "aliases": [{"alias": "tomatoes", "kind": "plural"}], "same_as": "wikidata:tT"},
  {"id": "u2", "name": "plantain", "aliases": [{"alias": "plantain", "kind": "name"}], "kind_of": ["wikidata:tR"]}
]'::jsonb), '{"things": 1, "aliases": 2, "facts": 1}'::jsonb, 'same_as adds no thing; a cross-source ref is a fact');
select is(pg_temp.members('fruit'), array['plantain', 'tomato'], 'the other source''s fruit joins the category');
select throws_ok($$ select private.import_source('usda', 'test-6', '[{"id": "u3", "name": "x", "aliases": [], "same_as": "wikidata:none"}]') $$,
  'P0001', null, 'same_as must name a known thing');

-- The admin lookup: admins only, by exact alias, with the categories a thing falls in.
create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@base.example.test' from generate_series(1, 2) as s(n);
insert into private.admin (user_id) values (pg_temp.u(1));
select throws_ok(format('select private.base_lookup(%L, %L)', pg_temp.u(2), 'fx tomato'), 'OB007', null,
  'a player who isn''t an admin can''t look anything up');
select is(private.base_lookup(pg_temp.u(1), 'fx tomato')->0->'categories', '["fruit", "vegetable"]'::jsonb,
  'an admin sees tomato in both categories');
select is(private.base_lookup(pg_temp.u(1), 'fx ursus maritimus')->0->>'name', 'polar bear', 'any alias finds a thing');
select is(private.base_lookup(pg_temp.u(1), 'fx ailuropoda melanoleuca')->0->'categories', '[]'::jsonb,
  'a thing with no typeable name is in no category');
select is(private.base_lookup(pg_temp.u(1), 'nothing by this name'), '[]'::jsonb, 'an unknown alias finds nothing');

select * from finish();
rollback;
