-- A test run's refused texts on the Audit page (docs/milestones/M14-14b-11c-test-misses-to-audit.md; migration
-- 20261030074353_test_misses.sql): only an admin reports one, a repeat adds nothing, nothing reaches players' misses,
-- and the audit decides it with its existing actions. Called as the test's own role, as puzzle_entry.test.sql explains;
-- that plor_app may only execute it is checked by plor_app_role.test.sql.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e801', 'tm-admin@example.test'),
  ('00000000-0000-0000-0000-00000000e802', 'tm-player@example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-00000000e801');

-- A tiny category: tm pet > tm dog; tm amino is outside it.
select private.import_source('wikidata', 'tm-test', '[
  {"id": "tm-pet", "name": "tm pet", "aliases": [], "thing_id": "00000000-0000-5000-8000-0000000e8100"},
  {"id": "tm-dog", "name": "tm dog", "aliases": [{"alias": "tm dog", "kind": "name"}], "kind_of": ["tm-pet"], "thing_id": "00000000-0000-5000-8000-0000000e8101"},
  {"id": "tm-amino", "name": "tm amino", "aliases": [{"alias": "tm amino", "kind": "name"}], "thing_id": "00000000-0000-5000-8000-0000000e8102"}
]'::jsonb);
select private.define_category('tm_pet', 'tm pet', 'wikidata', 'tm-pet', null);
create temp table misses as select count(*) as n from private.missed_answer;
-- The question a test run reports from, as approval builds it; with a letter, a letter subset's.
create function pg_temp.q(letter text = null) returns jsonb language sql return jsonb_build_object('category', 'tm_pet',
  'root', '00000000-0000-5000-8000-0000000e8100', 'member_of', null)
  || case when letter is null then '{}'::jsonb else jsonb_build_object('where', jsonb_build_object('starts_with', letter)) end;
create function pg_temp.review(p_text text) returns private.miss_review language sql
  return (select r from private.miss_review r where r.category = 'tm_pet' and r.text = p_text);

select throws_ok($$select private.report_test_miss('00000000-0000-0000-0000-00000000e802', pg_temp.q(), 'tm amino')$$,
  'OB007', null, 'a player who is not an admin cannot report a test run''s miss');
select ok(private.report_test_miss('00000000-0000-0000-0000-00000000e801', pg_temp.q(), 'tm amino'), 'an admin''s test run reports a refused text');
select is((select (outcome, players, answered, decision) from private.miss_review where category = 'tm_pet' and text = 'tm amino')::text,
  '(reported,1,1,)', 'as a reported review, 1 player of 1, waiting');
select ok(not private.report_test_miss('00000000-0000-0000-0000-00000000e801', pg_temp.q(), 'tm amino'), 'a repeat adds nothing');
select is((select count(*) from private.missed_answer), (select n from misses), 'and nothing reaches players'' misses');
select is(private.audit_open_count('00000000-0000-0000-0000-00000000e801'),
  (select count(*)::int from private.miss_review where outcome <> 'accepted' and decision is null), 'it counts as waiting on the admin pages');

-- A text naming a thing outside the category: Accept for this category makes that thing a member of it alone.
select private.audit_decide('00000000-0000-0000-0000-00000000e801', (pg_temp.review('tm amino')).id, 'accept_for_category', '00000000-0000-5000-8000-0000000e8102');
select ok(exists (select from private.category_extra where category = 'tm_pet' and thing_id = '00000000-0000-5000-8000-0000000e8102' and removed_at is null),
  'accepting a reported text for the category makes the thing it names a member');
select private.audit_decide('00000000-0000-0000-0000-00000000e801', (pg_temp.review('tm amino')).id, 'undo', null);
select ok(not exists (select from private.category_extra where category = 'tm_pet' and thing_id = '00000000-0000-5000-8000-0000000e8102' and removed_at is null),
  'and undoing it takes the thing out again');

-- A text naming nothing: Accept makes it a new member.
select private.report_test_miss('00000000-0000-0000-0000-00000000e801', pg_temp.q(), 'tm newt');
select private.audit_decide('00000000-0000-0000-0000-00000000e801', (pg_temp.review('tm newt')).id, 'accept', null);
select ok(private.in_category_now((pg_temp.review('tm newt')).thing_id, 'tm_pet'), 'accepting a reported text that names nothing makes a new member');

-- Dismiss leaves the category as it was.
select private.report_test_miss('00000000-0000-0000-0000-00000000e801', pg_temp.q(), 'tm rock');
select private.audit_decide('00000000-0000-0000-0000-00000000e801', (pg_temp.review('tm rock')).id, 'dismiss', null);
select is((pg_temp.review('tm rock')).decision, 'dismissed', 'a reported text can be dismissed');
select ok(not exists (select from private.thing_alias where alias = 'tm rock'), 'leaving no new answer');
select throws_ok($$select private.audit_decide('00000000-0000-0000-0000-00000000e801', (pg_temp.review('tm rock')).id, 'link', '00000000-0000-5000-8000-0000000e8101')$$,
  'OB012', null, 'a reported text can''t be linked, as a rejected one can''t');

-- A letter subset's text that doesn't start with its letter isn't reported: no decision could make it count.
select ok(not private.report_test_miss('00000000-0000-0000-0000-00000000e801', pg_temp.q('b'), 'tm newt'), 'a text without the subset''s letter isn''t reported');

-- Players' learning goes on as if a report weren't there: a dismissed report doesn't stop 3 players (the threshold
-- passed here) from making the text a member, and their row replaces the report.
select private.report_test_miss('00000000-0000-0000-0000-00000000e801', pg_temp.q(), 'tm gecko');
select private.audit_decide('00000000-0000-0000-0000-00000000e801', (pg_temp.review('tm gecko')).id, 'dismiss', null);
insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', '2000-02-01', jsonb_build_object(
  'format', 3, 'game_id', 'offbeat', 'date', '2000-02-01', 'approved_at', now() - interval '1 day', 'questions', jsonb_build_array(
    pg_temp.q() || jsonb_build_object('prompt', 'Name a pet', 'host_bank', '[]'::jsonb, 'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb, 'members', 1))));
insert into auth.users (id, email) select ('00000000-0000-0000-0000-0000000e88' || lpad(n::text, 2, '0'))::uuid, n || '@tm.example.test' from generate_series(1, 3) as s(n);
insert into private.run (user_id, game_id, puzzle_date) select ('00000000-0000-0000-0000-0000000e88' || lpad(n::text, 2, '0'))::uuid, 'offbeat', '2000-02-01' from generate_series(1, 3) as s(n);
select private.record_miss(('00000000-0000-0000-0000-0000000e88' || lpad(n::text, 2, '0'))::uuid, 'offbeat', '2000-02-01', 0, 'tm gecko', 'tm gecko', false, false, 3, 1)
from generate_series(1, 3) as s(n);
select is(((pg_temp.review('tm gecko')).outcome, (pg_temp.review('tm gecko')).players, (pg_temp.review('tm gecko')).decision)::text, '(accepted,3,)',
  'players reaching the threshold replace a dismissed report with their own decision');
select ok(private.in_category_now((pg_temp.review('tm gecko')).thing_id, 'tm_pet'), 'and the text becomes a member, as players'' learning makes it');
select is((select count(*)::int from private.miss_review where category = 'tm_pet' and text = 'tm gecko'), 1, 'one review of the text, not two');

select * from finish();
rollback;
