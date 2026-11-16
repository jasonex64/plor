-- Fragments' test run's one word-list function (docs/milestones/M15-15f-fragments-test-run.md, 15f-2; migration
-- 20261116030004_judge_test_word.sql): only an admin may call it, it says whether a typed word is in the dictionary and shows
-- it as the real game does, gives a missed round's examples as the real game's own function does, and writes nothing. That
-- plor_app may execute it and still can't read the word list is checked here and by plor_app_role.test.sql. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f151', 'm15-ftr-admin@example.test'),
  ('00000000-0000-0000-0000-00000000f152', 'm15-ftr-player@example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-00000000f151');
create temp table d as select private.today() + 450 as day;
insert into private.puzzle (game_id, puzzle_date, content)
select 'substrings', day, jsonb_build_object('format', 1, 'game_id', 'substrings', 'date', day,
  'rounds', '["ck", "ro", "af", "own", "hes", "qxz", "zz"]'::jsonb, 'bonus_letter', 'f')
from d;
-- Tests load their own words: the real list isn't in git. A loaded one may hold them too.
insert into private.dictionary_word (word_key, spelling, plain, everyday) values
  ('rocks', 'rocks', 'rocks', true), ('cafe', 'cafe', 'cafe', false), ('cafe', 'café', 'cafe', true),
  ('qxzab', 'qxzab', 'qxzab', true), ('aqxzb', 'aqxzb', 'aqxzb', true), ('qxzcd', 'qxzcd', 'qxzcd', true),
  ('qxzefgh', 'qxzefgh', 'qxzefgh', true), ('qxzaa', 'qxzaa', 'qxzaa', false)
on conflict do nothing;

create function pg_temp.judge(p_user uuid, p_typed text, p_missed text[] default '{}') returns jsonb
  language sql as $$
    select private.judge_test_word(p_user, p_typed, p_typed, p_typed, p_missed)
  $$;

-- What a test run must leave as it was: every game table's count.
create function pg_temp.counts() returns bigint[] language sql return array[
  (select count(*) from private.puzzle), (select count(*) from private.run), (select count(*) from private.run_event),
  (select count(*) from private.question_open), (select count(*) from private.round_word), (select count(*) from private.round_reject),
  (select count(*) from private.points_ledger), (select count(*) from private.guest_run), (select count(*) from private.dictionary_word)];
create temp table before as select pg_temp.counts() as counts;

select throws_ok($$select pg_temp.judge('00000000-0000-0000-0000-00000000f152', 'rocks')$$, 'OB007', null, 'a player who is not an admin is refused');
select throws_ok($$select pg_temp.judge('00000000-0000-0000-0000-00000000f152', null, array['qxz'])$$, 'OB007', null, 'whatever they ask for');
select is(pg_temp.judge('00000000-0000-0000-0000-00000000f151', 'rocks') ->> 'word', 'rocks', 'an admin gets a word in the dictionary, shown as spelt');
select ok(pg_temp.judge('00000000-0000-0000-0000-00000000f151', 'zzzznope') -> 'word' = 'null'::jsonb, 'and a word that is not in it refused, as null');
select is(private.judge_test_word('00000000-0000-0000-0000-00000000f151', 'cafe', 'cafe', 'cafe', '{}') ->> 'word', 'café',
  'a word is shown as the real game shows it (private.shown_spelling)');
select is(private.judge_test_word('00000000-0000-0000-0000-00000000f151', 'cafe', 'café', 'cafe', '{}') ->> 'word',
  private.shown_spelling('cafe', 'café', 'cafe'), 'for a typed accent too');
select is(pg_temp.judge('00000000-0000-0000-0000-00000000f151', null) -> 'examples', '[]'::jsonb, 'with no missed round, no examples');
select is(
  (pg_temp.judge('00000000-0000-0000-0000-00000000f151', null, array['qxz', 'ck', 'qxz']) -> 'examples'),
  (select jsonb_build_array(to_jsonb(a.words), to_jsonb(b.words), to_jsonb(a.words))
   from private.round_examples_core((select day from d), '{}') a, private.round_examples_core((select day from d), '{}') b
   where a.round_idx = 5 and b.round_idx = 0),
  'a missed round''s examples are the real game''s own (private.round_examples_core), in the order asked');
select is((pg_temp.judge('00000000-0000-0000-0000-00000000f151', null, array['qxz']) -> 'examples' -> 0), '["aqxzb", "qxzab", "qxzcd"]'::jsonb,
  'three everyday words, shortest first');

select is(pg_temp.counts(), (select counts from before), 'judging words and asking for examples writes nothing');

select ok(has_function_privilege('plor_app', 'private.judge_test_word(uuid,text,text,text,text[])', 'execute'), 'plor_app may execute it');
select ok(not has_function_privilege('authenticated', 'private.judge_test_word(uuid,text,text,text,text[])', 'execute')
  and not has_function_privilege('anon', 'private.judge_test_word(uuid,text,text,text,text[])', 'execute'), 'and the website''s other roles may not');
select ok(not has_table_privilege('plor_app', 'private.dictionary_word', 'select'), 'plor_app still can''t read the word list');

select * from finish();
rollback;
