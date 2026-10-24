-- The answer database behind a format-3 day (docs/milestones/M13-13a-the-base.md, "13a-2 and 13a-3"; migration
-- 20261024213853_answer_engine.sql): the IDs an import gives, the display name a merge keeps, and resolving answers as
-- the base stood when the day was approved. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- An import may give each new thing its ID (computed from the source entry by scripts/base.ts).
select private.import_source('wikidata', 'ae-test', '[
  {"id": "ae-animal", "name": "animal", "aliases": [{"alias": "ae animal", "kind": "name"}], "thing_id": "00000000-0000-5000-8000-00000000ae00"},
  {"id": "ae-pack", "name": "pack", "aliases": [], "thing_id": "00000000-0000-5000-8000-00000000ae05"},
  {"id": "ae-bear", "name": "bear", "aliases": [{"alias": "ae bear", "kind": "name"}], "kind_of": ["ae-animal"], "thing_id": "00000000-0000-5000-8000-00000000ae01"},
  {"id": "ae-polar", "name": "Ursus maritimus", "aliases": [{"alias": "ae ursus maritimus", "kind": "scientific"}], "kind_of": ["ae-bear"], "thing_id": "00000000-0000-5000-8000-00000000ae02"},
  {"id": "ae-dog", "name": "dog", "aliases": [{"alias": "ae dog", "kind": "name"}], "kind_of": ["ae-animal"], "member_of": ["ae-pack"], "thing_id": "00000000-0000-5000-8000-00000000ae03"},
  {"id": "ae-rock", "name": "rock", "aliases": [{"alias": "ae rock", "kind": "name"}], "thing_id": "00000000-0000-5000-8000-00000000ae04"}
]'::jsonb);
select is((select thing_id::text from private.thing_source where source_id = 'ae-bear'), '00000000-0000-5000-8000-00000000ae01',
  'a new thing takes the ID the import gives');

-- A thing named by its scientific name takes the name of what merges into it; one with a typeable name keeps it.
select private.import_source('oewn', 'ae-test', '[
  {"id": "ae-w-polar", "name": "polar bear", "aliases": [{"alias": "ae polar bear", "kind": "name"}], "same_as": "wikidata:ae-polar"},
  {"id": "ae-w-dog", "name": "domestic dog", "aliases": [{"alias": "ae domestic dog", "kind": "name"}], "same_as": "wikidata:ae-dog"}
]'::jsonb);
select is((select name from private.thing where id = '00000000-0000-5000-8000-00000000ae02'), 'polar bear', 'a scientific name gives way to a merged common one');
select is((select name from private.thing where id = '00000000-0000-5000-8000-00000000ae03'), 'dog', 'a typeable name stays');

select private.define_category('ae_animal', 'animal', 'wikidata', 'ae-animal', null);
-- A day approved now: question 1 is "Name an animal" with bear as the host answer; question 2 the animals that are
-- member_of the pack (only dog).
insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', '2099-01-01', jsonb_build_object(
  'format', 3, 'game_id', 'offbeat', 'date', '2099-01-01', 'approved_at', now(), 'questions', jsonb_build_array(jsonb_build_object(
    'prompt', 'Name an animal', 'category', 'ae_animal', 'host_bank', jsonb_build_array('00000000-0000-5000-8000-00000000ae01'),
    'host_answers', jsonb_build_array('00000000-0000-5000-8000-00000000ae01'), 'levels', '{}'::jsonb,
    'root', '00000000-0000-5000-8000-00000000ae00', 'member_of', null, 'members', 3),
  jsonb_build_object(
    'prompt', 'Name a pack animal', 'category', 'ae_pack', 'host_bank', '[]'::jsonb, 'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb,
    'root', '00000000-0000-5000-8000-00000000ae00', 'member_of', '00000000-0000-5000-8000-00000000ae05', 'members', 1))));
create function pg_temp.resolve(p_texts text[]) returns table (alias text, thing_id uuid, caught boolean)
  language sql as 'select r.alias, r.thing_id, r.caught from private.resolve_answer(''offbeat'', ''2099-01-01'', 0, p_texts) r order by r.alias';

select results_eq($$select * from pg_temp.resolve(array['ae dog'])$$, $$values ('ae dog'::text, '00000000-0000-5000-8000-00000000ae03'::uuid, false)$$,
  'a member resolves, not caught');
select results_eq($$select * from pg_temp.resolve(array['ae polar bear', 'ae ursus maritimus'])$$,
  $$values ('ae polar bear'::text, '00000000-0000-5000-8000-00000000ae02'::uuid, true), ('ae ursus maritimus', '00000000-0000-5000-8000-00000000ae02'::uuid, true)$$,
  'what sits under the host answer is caught, by any name');
select is_empty($$select * from pg_temp.resolve(array['ae rock'])$$, 'a thing outside the category resolves to nothing');
select is_empty($$select * from pg_temp.resolve(array['ae animal'])$$, 'nor does the category''s root, by its own name');
select ok(array['00000000-0000-5000-8000-00000000ae01'::uuid, '00000000-0000-5000-8000-00000000ae00'::uuid]
  <@ (select ancestors from private.resolve_answer('offbeat', '2099-01-01', 0, array['ae polar bear'])),
  'a candidate comes with its ancestors');

-- member_of keeps only the members of its thing, as approved.
select results_eq($$select r.thing_id from private.resolve_answer('offbeat', '2099-01-01', 1, array['ae dog', 'ae bear']) r$$,
  $$values ('00000000-0000-5000-8000-00000000ae03'::uuid)$$, 'a member_of question accepts only the members of its thing');
select private.import_source('wikidata', 'ae-late', '[{"id": "ae-bear", "name": "bear", "aliases": [], "member_of": ["ae-pack"]}]'::jsonb);
update private.fact set added_at = now() + interval '1 minute'
  where thing_id = '00000000-0000-5000-8000-00000000ae01' and trait = 'member_of';
select is_empty($$select * from private.resolve_answer('offbeat', '2099-01-01', 1, array['ae bear'])$$,
  'a membership added after the day was approved doesn''t count');
select is((select count(*)::int from private.fact where thing_id = '00000000-0000-5000-8000-00000000ae01' and trait = 'member_of'), 1,
  'though the base holds it');

-- What the base gains after the approval doesn't count for the day.
update private.puzzle set content = jsonb_set(content, '{approved_at}', to_jsonb(now() - interval '1 hour'))
  where game_id = 'offbeat' and puzzle_date = '2099-01-01';
select is_empty($$select * from pg_temp.resolve(array['ae dog'])$$, 'an alias added after the day was approved doesn''t resolve');
select throws_ok($$select * from private.resolve_answer('offbeat', '2099-01-02', 0, array['ae dog'])$$, 'P0001', null,
  'a day that isn''t an approved format-3 day can''t be resolved');

select is((select name from private.thing_names(array['00000000-0000-5000-8000-00000000ae02'::uuid])), 'polar bear', 'thing_names gives main names');

select * from finish();
rollback;
