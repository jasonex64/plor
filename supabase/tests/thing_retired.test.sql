-- Wikidata's own doubles (docs/milestones/M13-13e-5b-wikidata-doubles.md): a merge within one source, retired IDs that
-- keep pointing, and WordNet's word as a joined thing's name. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- tr-new is the current name, tr-old its old one; tr-pup sits under the old one. Each item carries the ID the load
-- would give it (src/content/thing-id.ts makes them; any fixed UUIDs do here).
select private.import_source('wikidata', 'thing-retired-test', '[
  {"id": "tr-root", "name": "tr root", "aliases": [{"alias": "tr root", "kind": "name"}], "thing_id": "00000000-0000-4000-8000-0000000000a0"},
  {"id": "tr-old", "name": "tr old", "aliases": [{"alias": "tr old name", "kind": "name"}], "merged_into": "wikidata:tr-new", "thing_id": "00000000-0000-4000-8000-0000000000a1"},
  {"id": "tr-new", "name": "tr new", "aliases": [{"alias": "tr new name", "kind": "name"}], "kind_of": ["tr-root"], "thing_id": "00000000-0000-4000-8000-0000000000a2"},
  {"id": "tr-pup", "name": "tr pup", "aliases": [{"alias": "tr pup", "kind": "name"}], "kind_of": ["tr-old"], "thing_id": "00000000-0000-4000-8000-0000000000a3"}
]'::jsonb);

select is(private.thing_by_ref('wikidata', 'tr-old'), '00000000-0000-4000-8000-0000000000a2'::uuid, 'a merged item names the kept item''s thing');
select is((select count(*)::int from private.thing where id = '00000000-0000-4000-8000-0000000000a1'), 0, 'a merged item makes no thing');
select is((select array_agg(alias order by alias) from private.thing_alias where thing_id = '00000000-0000-4000-8000-0000000000a2'),
  array['tr new name', 'tr old name'], 'the kept thing carries both items'' names');
select is((select value_thing from private.fact where thing_id = '00000000-0000-4000-8000-0000000000a3' and trait = 'kind_of'),
  '00000000-0000-4000-8000-0000000000a2'::uuid, 'a child of the merged item sits under the kept thing');
select is(private.thing_now('00000000-0000-4000-8000-0000000000a1'), '00000000-0000-4000-8000-0000000000a2'::uuid, 'a retired ID points at its thing');
select is(private.thing_now('00000000-0000-4000-8000-0000000000a3'), '00000000-0000-4000-8000-0000000000a3'::uuid, 'a live ID names itself');
select is((select name from private.thing_names(array['00000000-0000-4000-8000-0000000000a1'::uuid])), 'tr new', 'thing_names reads a retired ID');

-- WordNet joins the kept thing: the joining item's name becomes the thing's, and its own ID is retired too.
select private.import_source('oewn', 'thing-retired-test', '[
  {"id": "tr-syn", "name": "tr word", "aliases": [{"alias": "tr word", "kind": "name"}], "same_as": "wikidata:tr-new", "thing_id": "00000000-0000-4000-8000-0000000000a4"}
]'::jsonb);
select is((select name from private.thing where id = '00000000-0000-4000-8000-0000000000a2'), 'tr word', 'a thing WordNet joins shows the joining item''s name');
select is(private.thing_now('00000000-0000-4000-8000-0000000000a4'), '00000000-0000-4000-8000-0000000000a2'::uuid, 'a join retires the joining item''s ID');

select throws_like($$ select private.import_source('wikidata', 'thing-retired-bad', '[
  {"id": "tr-lost", "name": "tr lost", "aliases": [], "merged_into": "wikidata:tr-nowhere", "thing_id": "00000000-0000-4000-8000-0000000000a5"}
]'::jsonb) $$, '%merged_into must name a kept item%', 'a merge into an unknown item is refused');

-- An item already loaded as its own thing can't merge now: it would keep its thing silently.
select throws_like($$ select private.import_source('wikidata', 'thing-retired-late', '[
  {"id": "tr-pup", "name": "tr pup", "aliases": [], "merged_into": "wikidata:tr-new", "thing_id": "00000000-0000-4000-8000-0000000000a3"}
]'::jsonb) $$, '%already loaded as their own things%', 'a merge of an item already loaded is refused');

select * from finish();
rollback;
