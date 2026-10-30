-- Test runs' guarded functions (docs/milestones/M14-14b-11-test-runs.md; migration 20261030054018_test_runs.sql): only
-- an admin may build a draft or resolve its answers; a draft is built and refused exactly as approval builds and
-- refuses it; its answers resolve as play's do; and nothing is written. Called as the test's own role, as
-- puzzle_entry.test.sql explains; that plor_app may only execute them is checked by plor_app_role.test.sql.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e701', 'tr-admin@example.test'),
  ('00000000-0000-0000-0000-00000000e702', 'tr-player@example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-00000000e701');
-- Far ahead and far back, so local runs and other tests never collide with them.
create temp table d as select private.today() + 410 as ahead, private.today() - 410 as past;

-- A tiny category: tr pet > dog, cat, hamster, mouse, horse; rock is outside it.
select private.import_source('wikidata', 'tr-test', '[
  {"id": "tr-pet", "name": "tr pet", "aliases": [], "thing_id": "00000000-0000-5000-8000-0000000e7100"},
  {"id": "tr-dog", "name": "tr dog", "aliases": [{"alias": "tr dog", "kind": "name"}], "kind_of": ["tr-pet"], "thing_id": "00000000-0000-5000-8000-0000000e7101"},
  {"id": "tr-cat", "name": "tr cat", "aliases": [{"alias": "tr cat", "kind": "name"}], "kind_of": ["tr-pet"], "thing_id": "00000000-0000-5000-8000-0000000e7102"},
  {"id": "tr-hamster", "name": "tr hamster", "aliases": [{"alias": "tr hamster", "kind": "name"}], "kind_of": ["tr-pet"], "thing_id": "00000000-0000-5000-8000-0000000e7103"},
  {"id": "tr-mouse", "name": "tr mouse", "aliases": [{"alias": "tr mouse", "kind": "name"}], "kind_of": ["tr-pet"], "thing_id": "00000000-0000-5000-8000-0000000e7104"},
  {"id": "tr-horse", "name": "tr horse", "aliases": [{"alias": "tr horse", "kind": "name"}], "kind_of": ["tr-pet"], "thing_id": "00000000-0000-5000-8000-0000000e7105"},
  {"id": "tr-rock", "name": "tr rock", "aliases": [{"alias": "tr rock", "kind": "name"}], "thing_id": "00000000-0000-5000-8000-0000000e7106"}
]'::jsonb);
select private.define_category('tr_pet', 'tr pet', 'wikidata', 'tr-pet', null);
-- A one-question day for a date with its host bank and host answers; cat, hamster, mouse and horse are familiar.
create function pg_temp.day(p_date date, p_bank text[], p_hosts text[]) returns jsonb
  language sql
  return jsonb_build_object('format', 3, 'game_id', 'offbeat', 'date', p_date::text, 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'Name a pet', 'category', 'tr_pet', 'host_bank', to_jsonb(p_bank), 'host_answers', to_jsonb(p_hosts),
      'levels', '{"00000000-0000-5000-8000-0000000e7102": "uncommon", "00000000-0000-5000-8000-0000000e7103": "uncommon",
        "00000000-0000-5000-8000-0000000e7104": "uncommon", "00000000-0000-5000-8000-0000000e7105": "uncommon"}'::jsonb)));
create temp table draft as select pg_temp.day((select ahead from d),
  array['00000000-0000-5000-8000-0000000e7101', '00000000-0000-5000-8000-0000000e7102'], array['00000000-0000-5000-8000-0000000e7101']) as content;

-- What a test run must leave as it was (14b-11, answer 2): the counts before.
create function pg_temp.counts() returns bigint[] language sql return array[
  (select count(*) from private.puzzle), (select count(*) from private.run), (select count(*) from private.run_event),
  (select count(*) from private.question_open), (select count(*) from private.missed_answer), (select count(*) from private.miss_review),
  (select count(*) from private.points_ledger), (select count(*) from private.thing_alias), (select count(*) from private.category_extra)];
create temp table before as select pg_temp.counts() as counts;

select throws_ok($$select private.build_puzzle('00000000-0000-0000-0000-00000000e702', (select content from draft))$$,
  'OB007', null, 'a player who is not an admin cannot build a draft');
select throws_ok($$select * from private.resolve_draft_answer('00000000-0000-0000-0000-00000000e702',
    private.build_puzzle('00000000-0000-0000-0000-00000000e701', (select content from draft)) -> 'questions' -> 0, array['tr cat'])$$,
  'OB007', null, 'nor resolve a draft''s answers');

create temp table built as select private.build_puzzle('00000000-0000-0000-0000-00000000e701', (select content from draft)) as content;
select is((select content -> 'questions' -> 0 ->> 'root' from built), '00000000-0000-5000-8000-0000000e7100', 'a built draft has its category''s root');
select is((select (content -> 'questions' -> 0 ->> 'members')::int from built), 5, 'and its member count, as approval stores them');
select ok(not (select content ? 'approved_at' from built), 'but no approval time: it is not approved');
select lives_ok($$select private.build_puzzle('00000000-0000-0000-0000-00000000e701', pg_temp.day((select past from d),
    array['00000000-0000-5000-8000-0000000e7101'], array['00000000-0000-5000-8000-0000000e7101']))$$,
  'a past day can be built for a test run, where approval refuses it');
-- A draft approval refuses is refused with approval's own problems (answer 11).
select throws_ok($$select private.build_puzzle('00000000-0000-0000-0000-00000000e701', pg_temp.day((select ahead from d),
    array['00000000-0000-5000-8000-0000000e7106'], array['00000000-0000-5000-8000-0000000e7101']))$$,
  'OB009', 'puzzle_invalid: question 1: host bank entry 00000000-0000-5000-8000-0000000e7106 is not a tr_pet; question 1: host answer 00000000-0000-5000-8000-0000000e7101 is not in the host bank',
  'a draft approval would refuse is refused with the same problems');

-- Resolved as play resolves: a member the host doesn't catch, the host's answer, and a thing outside the category.
select results_eq($$select r.alias, r.caught from private.resolve_draft_answer('00000000-0000-0000-0000-00000000e701',
    (select content -> 'questions' -> 0 from built), array['tr cat', 'tr dog', 'tr rock']) r order by r.alias$$,
  $$values ('tr cat', false), ('tr dog', true)$$, 'a draft''s answers resolve against its category, the host catching its own');
select is(pg_temp.counts(), (select counts from before), 'building and resolving a draft writes nothing');

-- The same day approved for an upcoming date resolves the same through play's function, whose time is still ahead.
select private.approve_puzzle('00000000-0000-0000-0000-00000000e701', (select content from draft));
select results_eq($$select r.alias, r.caught from private.resolve_answer('offbeat', (select ahead from d), 0, array['tr cat', 'tr dog', 'tr rock']) r order by r.alias$$,
  $$values ('tr cat', false), ('tr dog', true)$$, 'an upcoming approved day resolves as its draft did');
select is((select count(*) from private.puzzle), (select counts[1] from before) + 1, 'approval, now built by build_puzzle, still stores the day');
select ok((select content ? 'approved_at' and content -> 'questions' -> 0 ? 'root' from private.puzzle
  where game_id = 'offbeat' and puzzle_date = (select ahead from d)), 'with its approval time and its built questions');

select * from finish();
rollback;
