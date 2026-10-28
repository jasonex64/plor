-- Failures that were silent, now loud (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3b-2): a same_as that
-- disagrees with the thing its item is loaded as, the circle a refusal names, a subset's filter left on a key that
-- became a base, approval's problems split on "; ", and define_subset's refusal naming only the unknown values.
-- Run with `npm run test:sql`; its own "tf" things, rolled back.
begin;
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(9);

select private.import_source('wikidata', 'tf-test', '[
  {"id": "tf-w1", "name": "tf one", "aliases": [{"alias": "tf one", "kind": "name"}]},
  {"id": "tf-w2", "name": "tf two", "aliases": [{"alias": "tf two", "kind": "name"}]}]');
select private.import_source('oewn', 'tf-test', '[{"id": "tf-x", "name": "tf one", "aliases": [], "same_as": "wikidata:tf-w1"}]');

-- 1. same_as on an item already loaded.
select lives_ok($$ select private.import_source('oewn', 'tf-test', '[{"id": "tf-x", "name": "tf one", "aliases": [], "same_as": "wikidata:tf-w1"}]') $$,
  'an item loaded again with the same same_as loads');
select throws_like($$ select private.import_source('oewn', 'tf-test', '[{"id": "tf-x", "name": "tf one", "aliases": [], "same_as": "wikidata:tf-w2"}]') $$,
  'import_source: same_as names another thing than the one the item is loaded as%tf-x%',
  'one whose same_as now names another thing is refused, not kept apart without a word');

-- 2. One import closing two circles names the same one each time: the first by name (tf a kind_of tf c), though tf z's
-- ID sorts before tf c's and the item lists tf z first.
select private.import_source('wikidata', 'tf-test', '[
  {"id": "tf-a", "name": "tf a", "aliases": []},
  {"id": "tf-b", "name": "tf z", "aliases": [], "kind_of": ["tf-a"], "thing_id": "00000000-0000-5000-8000-0000000000fb"},
  {"id": "tf-c", "name": "tf c", "aliases": [], "kind_of": ["tf-a"], "thing_id": "ffffffff-0000-5000-8000-0000000000fc"}]');
select throws_like($$ select private.import_source('wikidata', 'tf-test', '[{"id": "tf-a", "name": "tf a", "aliases": [], "kind_of": ["tf-b", "tf-c"]}]') $$,
  'import_source: a kind_of circle: tf a (%) kind_of tf c (%), and tf c is already under tf a', 'of two circles, the refusal names the first by name');

-- 3. A key defined as a subset, then as a base, drops the subset's filter.
select private.define_category('tf_base', 'tf base', 'wikidata', 'tf-a', null);
select private.define_subset('tf_sub', 'tf base starting with B', 'tf_base', 'wikidata', '{"starts_with": "b"}');
select is((select starts_with from private.category where key = 'tf_sub'), 'b', 'the subset filters');
select private.define_category('tf_sub', 'tf base again', 'wikidata', 'tf-a', null);
select is((select num_nonnulls(fact_trait, fact_values, fact_via, number_trait, at_least, starts_with) from private.category where key = 'tf_sub'), 0,
  'once a base, it has no filter');

-- 4. define_subset names only the values the base lacks.
select throws_ok($$ select private.define_subset('tf_vals', 'tf members', 'tf_base', 'wikidata', '{"trait": "member_of", "values": ["tf-b", "tf-zz"]}') $$,
  'P0001', 'define_subset tf_vals: tf-zz not wikidata things', 'a subset with some values unknown names those');

-- 5. approve_puzzle's problems as a list: one whose category holds "; " stays one.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'tf@tool-failures.example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-0000000000f1');
create function pg_temp.problems(content jsonb) returns jsonb language plpgsql as $$
declare
  detail text;
begin
  perform private.approve_puzzle('00000000-0000-0000-0000-0000000000f1', content);
  return null;
exception when sqlstate 'OB009' then
  get stacked diagnostics detail = pg_exception_detail;
  return detail::jsonb;
end
$$;
select ok(pg_temp.problems(jsonb_build_object('format', 3, 'game_id', 'offbeat', 'date', '2999-01-02', 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'Name a tf', 'category', 'tf; two', 'host_bank', '[]'::jsonb, 'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb))))
  ? 'question 1: no category tf; two', 'a problem holding "; " is one item of the list');
select is(pg_temp.problems(jsonb_build_object('format', 2, 'game_id', 'offbeat', 'date', '2999-01-02', 'questions', '[]'::jsonb)),
  '["format 3 expected"]'::jsonb, 'the format refusal is a list too');
select is(jsonb_typeof(pg_temp.problems(jsonb_build_object('format', 3, 'game_id', 'offbeat', 'date', '2999-01-02', 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'Name a tf', 'category', 'tf_none', 'host_bank', '[]'::jsonb, 'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb))))),
  'array', 'every refusal''s detail is a JSON list');

select * from finish();
rollback;
