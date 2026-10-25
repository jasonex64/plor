-- Links (docs/milestones/M13-13e-2-links-and-the-first-batch.md): reviewed kind_of facts that fill a source's gaps.
-- Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- A tree in a test source's IDs, as WordNet has it: flower > rose; plant > bulbous plant > tulip, with its kind
-- parrot tulip. Aliases start with "lk" so real loaded data can sit beside it.
select private.import_source('oewn', 'links-test', '[
  {"id": "lk-flower", "name": "lk flower", "aliases": [{"alias": "lk flower", "kind": "name"}]},
  {"id": "lk-rose", "name": "lk rose", "aliases": [{"alias": "lk rose", "kind": "name"}], "kind_of": ["lk-flower"]},
  {"id": "lk-plant", "name": "lk plant", "aliases": [{"alias": "lk plant", "kind": "name"}]},
  {"id": "lk-bulb", "name": "lk bulbous plant", "aliases": [{"alias": "lk bulbous plant", "kind": "name"}], "kind_of": ["lk-plant"]},
  {"id": "lk-tulip", "name": "lk tulip", "aliases": [{"alias": "lk tulip", "kind": "name"}], "kind_of": ["lk-bulb"]},
  {"id": "lk-parrot", "name": "lk parrot tulip", "aliases": [{"alias": "lk parrot tulip", "kind": "name"}], "kind_of": ["lk-tulip"]}
]'::jsonb);
select private.define_category('lk_flower', 'flower', 'oewn', 'lk-flower', null);
create function pg_temp.members() returns text[] language sql
  return (select array_agg(t.name order by t.name) from private.category_members('lk_flower') m join private.thing t on t.id = m);
select is(pg_temp.members(), array['lk rose'], 'before the link, tulip is not a flower');

select is(private.load_links('[{"thing": "oewn:lk-tulip", "name": "lk tulip", "kind_of": "oewn:lk-flower", "kind_of_name": "lk flower"}]'),
  '{"links": 1, "added": 1}'::jsonb, 'a link adds one kind_of fact');
select is(pg_temp.members(), array['lk parrot tulip', 'lk rose', 'lk tulip'], 'the linked thing joins the category with everything under it');
select is((select origin || ' ' || source_ref from private.fact where source_ref = 'links' and thing_id = private.thing_by_ref('oewn', 'lk-tulip')),
  'ai links', 'a link is marked as written by Claude, from the links file');
select is(private.load_links('[{"thing": "oewn:lk-tulip", "name": "lk tulip", "kind_of": "oewn:lk-flower", "kind_of_name": "lk flower"}]'),
  '{"links": 1, "added": 0}'::jsonb, 'loading the same link again adds nothing');

select throws_ok($$ select private.load_links('[{"thing": "oewn:lk-rose", "name": "lk tulip", "kind_of": "oewn:lk-flower", "kind_of_name": "lk flower"}]') $$,
  'P0001', null, 'a link whose name is not the thing''s name is refused');
select throws_ok($$ select private.load_links('[{"thing": "oewn:lk-plant", "name": "lk plant", "kind_of": "oewn:lk-parrot", "kind_of_name": "lk parrot tulip"}]') $$,
  'P0001', null, 'a link that would make a cycle is refused');
select is((select count(*)::int from private.base_log where action = 'link' and at = now()), 2, 'each load that ran is logged');

select * from finish();
rollback;
