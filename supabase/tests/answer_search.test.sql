-- Searching a played question's answers (docs/milestones/M14-14b-12-answer-lists.md; migration
-- 20261030080933_answer_search.sql): who may, the limit, the tiers, the counts under the minimum, an alias finding its
-- thing, and only what the day accepted. Called as the test's own role, as puzzle_entry.test.sql explains; that plor_app
-- may only execute it is checked by plor_app_role.test.sql.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- A small category: as pet > as dog (also "as hound"), as cat, as cow, as emu; as late joins after the days' answers.
select private.import_source('wikidata', 'as-test', '[
  {"id": "as-pet", "name": "as pet", "aliases": [], "thing_id": "00000000-0000-5000-8000-0000000e9100"},
  {"id": "as-dog", "name": "as dog", "aliases": [{"alias": "as dog", "kind": "name"}, {"alias": "as hound", "kind": "synonym"}], "kind_of": ["as-pet"], "thing_id": "00000000-0000-5000-8000-0000000e9101"},
  {"id": "as-cat", "name": "as cat", "aliases": [{"alias": "as cat", "kind": "name"}], "kind_of": ["as-pet"], "thing_id": "00000000-0000-5000-8000-0000000e9102"},
  {"id": "as-cow", "name": "as cow", "aliases": [{"alias": "as cow", "kind": "name"}], "kind_of": ["as-pet"], "thing_id": "00000000-0000-5000-8000-0000000e9103"},
  {"id": "as-emu", "name": "as emu", "aliases": [{"alias": "as emu", "kind": "name"}], "kind_of": ["as-pet"], "thing_id": "00000000-0000-5000-8000-0000000e9104"}
]'::jsonb);
select private.define_category('as_pet', 'as pet', 'wikidata', 'as-pet', null);
-- Two one-question days, approved as this transaction began, with the base above: one not over (far ahead), one over
-- (long past), whose answers are fixed as of that approval. Cat is common.
create temp table d as select private.today() + 430 as ahead, date '2000-03-01' as past;
create function pg_temp.day(p_date date) returns jsonb language sql return jsonb_build_object(
  'format', 3, 'game_id', 'offbeat', 'date', p_date, 'approved_at', now(), 'questions', jsonb_build_array(jsonb_build_object(
    'prompt', 'Name a pet', 'category', 'as_pet', 'host_bank', '[]'::jsonb, 'host_answers', jsonb_build_array('00000000-0000-5000-8000-0000000e9101'),
    'levels', jsonb_build_object('00000000-0000-5000-8000-0000000e9102', 'common'),
    'root', '00000000-0000-5000-8000-0000000e9100', 'member_of', null, 'members', 4)));
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', (select ahead from d), pg_temp.day((select ahead from d))), ('offbeat', (select past from d), pg_temp.day((select past from d)));
-- Players: 1 finished the day ahead (caught at question 1 by cat), 2 is mid-run on it, 3 never played; 4 is mid-run on the past day.
create function pg_temp.u(n int) returns uuid language sql immutable return ('00000000-0000-0000-0000-0000000e99' || lpad(n::text, 2, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@as.example.test' from generate_series(1, 4) as s(n);
insert into private.run (user_id, game_id, puzzle_date) values
  (pg_temp.u(1), 'offbeat', (select ahead from d)), (pg_temp.u(2), 'offbeat', (select ahead from d)), (pg_temp.u(4), 'offbeat', (select past from d));
insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
  values (pg_temp.u(1), 'offbeat', (select ahead from d), 0, '00000000-0000-5000-8000-0000000e9102', true);
-- Given on its own day, as the counts take only answers before the day's midnight (src/game/ledger.ts, dayCounts).
update private.run_event set created_at = (select ahead from d)::timestamp at time zone 'America/Los_Angeles' + interval '1 hour'
where user_id = pg_temp.u(1);
-- A member that joined a day after the past day's answers were fixed: that day never accepted it.
select private.import_source('wikidata', 'as-test-late', '[
  {"id": "as-late", "name": "as late", "aliases": [{"alias": "as late", "kind": "name"}], "kind_of": ["as-pet"], "thing_id": "00000000-0000-5000-8000-0000000e9105"}
]'::jsonb);
update private.thing_alias set added_at = now() + interval '1 day' where thing_id = '00000000-0000-5000-8000-0000000e9105';
update private.fact set added_at = now() + interval '1 day' where thing_id = '00000000-0000-5000-8000-0000000e9105';
create function pg_temp.search(n int, day date, text text, lim int = 10, min int = 5) returns text[] language sql
  return (select array_agg(format('%s|%s|%s|%s', s.name, s.matched, s.tier, coalesce(s.players::text, '-')) order by ord)
    from private.search_answers(pg_temp.u(n), 'offbeat', day, 0, text, lim, min) with ordinality as s(name, matched, tier, players, ord));

select throws_ok($$select private.search_answers(pg_temp.u(2), 'offbeat', (select ahead from d), 0, '', 10, 5)$$, 'OB013', null,
  'a player whose run is still going can''t search');
select throws_ok($$select private.search_answers(pg_temp.u(3), 'offbeat', (select ahead from d), 0, '', 10, 5)$$, 'OB013', null,
  'nor one who hasn''t played a day that isn''t over');
select throws_ok($$select private.search_answers(pg_temp.u(1), 'offbeat', (select ahead from d), 1, '', 10, 5)$$, 'OB013', null,
  'nor a question that isn''t on a finished player''s result card');
select is(pg_temp.search(1, (select ahead from d), 'as c')::text[],
  array['as cat|as cat|common|-', 'as cow|as cow|rare|-'], 'a finished player finds the answers starting with the text, the most given first, counts hidden under 5 players');
select is(pg_temp.search(1, (select ahead from d), 'as c', 10, 1)::text[],
  array['as cat|as cat|common|1', 'as cow|as cow|rare|0'], 'with the question past the minimum, each answer shows how many gave it');
select is(pg_temp.search(1, (select ahead from d), 'hound')::text[], array['as dog|as hound|rare|-'],
  'another name finds its thing, by its main name and the name that matched');
select is(pg_temp.search(1, (select ahead from d), 'ow')::text[], array['as cow|as cow|rare|-'], 'a name containing the text is found too');
select is(cardinality(pg_temp.search(1, (select ahead from d), 'as ', 2)), 2, 'no more than the limit');
select is(pg_temp.search(1, (select ahead from d), '')::text[], array['as cat|as cat|common|-'], 'an empty box lists only the answers given, the most given first');
select is(pg_temp.search(3, (select past from d), 'late'), null, 'a member that joined after the day''s answers were fixed isn''t listed');
select is(cardinality(pg_temp.search(3, (select past from d), 'as ')), 4, 'once the day is over, a player who never played it searches every question');
select throws_ok($$select private.search_answers(pg_temp.u(4), 'offbeat', (select past from d), 0, '', 10, 5)$$, 'OB013', null,
  'but not one whose run of it is still going');
select throws_ok($$select private.search_answers(pg_temp.u(1), 'offbeat', (select ahead from d) + 1, 0, '', 10, 5)$$, 'OB013', null,
  'a day with no puzzle has nothing to search');
select is(pg_temp.search(1, (select ahead from d), 'zebra'), null, 'a text nothing bears finds nothing');

-- An answer the past day accepted stays listed after its link to the category ends (a reload, an undo): the day keeps
-- what it accepted (14b-12 review).
update private.fact set removed_at = now() + interval '2 days' where thing_id = '00000000-0000-5000-8000-0000000e9104' and trait = 'kind_of';
select is(pg_temp.search(3, (select past from d), 'emu')::text[], array['as emu|as emu|rare|-'],
  'an answer whose link ended after the day was fixed is still listed for that day');

select * from finish();
rollback;
