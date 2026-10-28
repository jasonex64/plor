-- The database's gaps (docs/milestones/M13-13f-4-scale-and-leftovers.md, 13f-4b): a miss judged by the day's frozen
-- question, not the category as it is now; a retired ID given for another thing refused. Run with `npm run test:sql`;
-- its own "dg" things, rolled back.
begin;
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(11);

select private.import_source('wikidata', 'dg-test', '[
  {"id": "dg-root", "name": "dg root", "aliases": [], "thing_id": "00000000-0000-5000-8000-00000000d900"},
  {"id": "dg-a", "name": "dg a", "aliases": [{"alias": "dg a", "kind": "name"}], "kind_of": ["dg-root"], "thing_id": "00000000-0000-5000-8000-00000000d901"},
  {"id": "dg-b", "name": "dg b", "aliases": [{"alias": "dg b", "kind": "name"}], "kind_of": ["dg-root"], "thing_id": "00000000-0000-5000-8000-00000000d902"},
  {"id": "dg-c", "name": "dg c", "aliases": [{"alias": "dg c", "kind": "name"}], "thing_id": "00000000-0000-5000-8000-00000000d903"}]');
-- The category is a base now; the days were approved while it was a subset, and froze its filter.
select private.define_category('dg_cat', 'dg thing', 'wikidata', 'dg-root', null);
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'dg@database-gaps.example.test');
create function pg_temp.day(d date, filter jsonb) returns jsonb language sql return jsonb_build_object('format', 3, 'game_id', 'offbeat',
  'date', d::text, 'approved_at', now() - interval '2 days', 'questions', jsonb_build_array(jsonb_build_object(
    'prompt', 'Name a dg', 'category', 'dg_cat', 'host_bank', '[]'::jsonb, 'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb,
    'root', '00000000-0000-5000-8000-00000000d900', 'member_of', null, 'members', 2, 'where', filter)
    -- As approve_puzzle stores a question with no filter: no "where" at all.
    - case when filter is null then 'where' else '' end));
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', '2000-02-01', pg_temp.day('2000-02-01', '{"starts_with": "b"}')),
  ('offbeat', '2000-02-02', pg_temp.day('2000-02-02', '{"trait": "member_of", "values": ["00000000-0000-5000-8000-00000000d901", "00000000-0000-5000-8000-00000000d902"]}')),
  ('offbeat', '2000-02-03', pg_temp.day('2000-02-03', null)),
  ('offbeat', '2000-02-04', pg_temp.day('2000-02-04', '{"trait": "member_of", "values": ["00000000-0000-5000-8000-00000000d902"]}')),
  ('offbeat', '2000-02-05', pg_temp.day('2000-02-05', '{"starts_with": "d"}'));
insert into private.run (user_id, game_id, puzzle_date)
  select '00000000-0000-0000-0000-0000000000d1', 'offbeat', d from unnest(array['2000-02-01', '2000-02-02', '2000-02-03', '2000-02-04', '2000-02-05']::date[]) as d;
-- dg c is outside the root, but the admin added it to the category.
insert into private.category_extra (category, thing_id, added_by) values ('dg_cat', '00000000-0000-5000-8000-00000000d903', '00000000-0000-0000-0000-0000000000d1');
-- One player is enough here (the threshold arguments), so each miss is judged at once.
create function pg_temp.miss(d date, text text) returns boolean language sql
  return private.record_miss('00000000-0000-0000-0000-0000000000d1', 'offbeat', d, 0, text, text, false, false, 1, 0);

-- 1. The day asked for a name starting with B: a miss starting with D isn't learned, though the category takes it now.
select ok(pg_temp.miss('2000-02-01', 'dg new'), 'the miss is logged');
select is((select count(*)::int from private.miss_review where category = 'dg_cat' and text = 'dg new'), 0,
  'a miss off the day''s letter isn''t learned, whatever the category is now');
-- 2. The day's filter named two values: a new text is held for the admin, not added, though the category has no filter now.
select pg_temp.miss('2000-02-02', 'dg newer');
select is((select outcome from private.miss_review where category = 'dg_cat' and text = 'dg newer'), 'held_subset',
  'a miss on a day whose frozen filter names two values is held, as the day was approved');

-- 3. A member of the day's question is nothing to learn, by its tree or as an admin's addition; a member of the category
-- now that the day's filter leaves out isn't one for the day.
select pg_temp.miss('2000-02-03', 'dg a');
select pg_temp.miss('2000-02-03', 'dg c');
select is((select count(*)::int from private.miss_review where category = 'dg_cat' and text in ('dg a', 'dg c')), 0,
  'a member typed, by the tree or an admin''s addition, is nothing to learn');
select pg_temp.miss('2000-02-04', 'dg a');
select is((select outcome from private.miss_review where category = 'dg_cat' and text = 'dg a'), 'rejected',
  'a thing the category takes now but the day''s filter left out is judged as the day was approved');
-- 4. A new text on a day approved before its category changed (a D subset then, a base now) is held for the human: the
-- thing would be built from the category as it is now, in neither.
select pg_temp.miss('2000-02-05', 'dg brand new');
select is((select outcome from private.miss_review where category = 'dg_cat' and text = 'dg brand new'), 'held_subset',
  'a new text on a day whose question no longer matches its category is held');
select is((select count(*)::int from private.thing where name = 'dg brand new'), 0, 'and no thing is made for it');

-- 5. A retired ID keeps pointing at its thing: given again for another thing, the import is refused.
select private.import_source('oewn', 'dg-test', '[{"id": "dg-o1", "name": "dg a", "aliases": [], "same_as": "wikidata:dg-a", "thing_id": "00000000-0000-5000-8000-00000000d9f0"}]');
select is((select thing_id from private.thing_retired where id = '00000000-0000-5000-8000-00000000d9f0'), '00000000-0000-5000-8000-00000000d901'::uuid,
  'a join retires the ID it would have had, pointing at its thing');
select throws_like($$ select private.import_source('oewn', 'dg-test', '[{"id": "dg-o2", "name": "dg b", "aliases": [], "same_as": "wikidata:dg-b", "thing_id": "00000000-0000-5000-8000-00000000d9f0"}]') $$,
  'import_source: retired IDs given for another thing: 00000000-0000-5000-8000-00000000d9f0 (retired for 00000000-0000-5000-8000-00000000d901, now given for 00000000-0000-5000-8000-00000000d902)',
  'the same ID given for another thing is refused, not left pointing at the old one');

-- 6. A links batch with one link the base doesn't hold loads none of them (13e-2's batch; 13f-4c): the good link
-- before it isn't left behind.
select throws_like($$ select private.load_links('[{"thing": "wikidata:dg-c", "name": "dg c", "kind_of": "wikidata:dg-root", "kind_of_name": "dg root"},
  {"thing": "wikidata:dg-nope", "name": "dg nope", "kind_of": "wikidata:dg-root", "kind_of_name": "dg root"}]') $$,
  '%is not in the base', 'a links batch with an unknown thing is refused');
select is((select count(*)::int from private.fact where thing_id = '00000000-0000-5000-8000-00000000d903' and trait = 'kind_of'), 0,
  'and the good link before it isn''t loaded');

select * from finish();
rollback;
