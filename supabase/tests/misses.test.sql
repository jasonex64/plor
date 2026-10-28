-- Learning from misses (docs/milestones/M13-13b-learning-from-misses.md; migration 20261025002908_learning_from_misses.sql):
-- the threshold, what a text becomes, from which day it counts, and the audit. Run with `npm run test:sql`.
-- now() is fixed inside this transaction, so "earlier" moments are made by moving timestamps back.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(34);

select private.import_source('wikidata', 'mb-test', '[
  {"id": "mb-animal", "name": "animal", "aliases": [{"alias": "mb animal", "kind": "name"}]},
  {"id": "mb-bear", "name": "bear", "aliases": [{"alias": "mb bear", "kind": "name"}], "kind_of": ["mb-animal"]},
  {"id": "mb-rock", "name": "rock", "aliases": [{"alias": "mb rock", "kind": "name"}]}
]'::jsonb);
select private.define_category('mb_animal', 'animal', 'wikidata', 'mb-animal', null);
select private.define_category('mb_big', 'animal (big)', 'wikidata', 'mb-animal', null);

-- Days, each asking one category in question 1. Past days have started: their answers are fixed as of their approval.
create function pg_temp.day(d date, cat text, approved timestamptz) returns jsonb language sql return jsonb_build_object(
  'format', 3, 'game_id', 'offbeat', 'date', d, 'approved_at', approved, 'questions', jsonb_build_array(jsonb_build_object(
    'prompt', 'Name an animal', 'category', cat, 'host_bank', '[]'::jsonb, 'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb,
    'root', (select root from private.category where key = cat), 'member_of', null, 'members', 1)));
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', '2000-01-01', pg_temp.day('2000-01-01', 'mb_animal', now() - interval '2 days')),
  ('offbeat', '2000-01-02', pg_temp.day('2000-01-02', 'mb_big', now() - interval '2 days')),
  ('offbeat', '2000-01-03', pg_temp.day('2000-01-03', 'mb_animal', now() - interval '6 hours')),
  ('offbeat', '2099-01-01', pg_temp.day('2099-01-01', 'mb_animal', now() - interval '1 day')),
  ('offbeat', '2099-01-02', pg_temp.day('2099-01-02', 'mb_big', now() - interval '1 day'));

create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@misses.example.test' from generate_series(1, 500) as s(n);
insert into private.run (user_id, game_id, puzzle_date)
  select pg_temp.u(n), 'offbeat', d from generate_series(1, 400) as s(n) cross join (values ('2000-01-01'::date), ('2000-01-02')) as t(d);
insert into private.admin (user_id) values (pg_temp.u(500));

-- Player n misses question 1 of day d, typing typed (normalized to text).
create function pg_temp.miss(n int, d date, typed text, text text, near boolean = false, listed boolean = false) returns boolean
  language sql return private.record_miss(pg_temp.u(n), 'offbeat', d, 0, typed, text, near, listed, 3, 1);
create function pg_temp.review(cat text, t text) returns private.miss_review language sql
  return (select r from private.miss_review r where r.category = cat and r.text = t);
create function pg_temp.resolves(d date, t text) returns uuid[] language sql
  return (select array_agg(r.thing_id order by r.thing_id) from private.resolve_answer('offbeat', d, 0, array[t]) r);

-- The threshold: at least 3 players, and at least 1% of the category's players (M13 D4).
select pg_temp.miss(1, '2000-01-01', 'Jackalope', 'jackalope'), pg_temp.miss(2, '2000-01-01', 'Jackalope', 'jackalope');
select is((pg_temp.review('mb_animal', 'jackalope')).id, null, 'two players aren''t enough');
select ok(pg_temp.miss(3, '2000-01-01', 'jackalope', 'jackalope'), 'the miss is logged');
select is((pg_temp.review('mb_animal', 'jackalope')).outcome, 'accepted', 'the third player makes it an answer');
select ok(private.in_category_now((pg_temp.review('mb_animal', 'jackalope')).thing_id, 'mb_animal'), 'a member of the category now');
-- Named by its normalized text, not the way players typed it ("Jackalope"), as every name is shown (13f-4b).
select is((select name from private.thing where id = (pg_temp.review('mb_animal', 'jackalope')).thing_id), 'jackalope',
  'named by its normalized text');
select is((select count(*)::int from private.base_log where action = 'miss_review' and detail ->> 'text' = 'jackalope'), 1, 'logged');
select ok(pg_temp.miss(4, '2000-01-01', 'jackalope', 'jackalope'), 'a later miss is still logged');
select is((select count(*)::int from private.miss_review where text = 'jackalope'), 1, 'and the text is decided once');
select ok(not private.record_miss(pg_temp.u(1), 'offbeat', '2000-01-01', 1, 'x', 'x', false, false, 3, 1),
  'a miss on a question the player isn''t on isn''t logged');

-- With 301 players answering the category, 3 aren't 1%; the 4th player makes it.
insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed, normalized)
  select pg_temp.u(n), 'offbeat', '2000-01-02', 0, 'other', 'other' from generate_series(101, 398) as s(n);
select pg_temp.miss(n, '2000-01-02', 'wolpertinger', 'wolpertinger') from generate_series(1, 3) as s(n);
select is((pg_temp.review('mb_big', 'wolpertinger')).id, null, '3 of 301 players aren''t 1%');
select pg_temp.miss(4, '2000-01-02', 'wolpertinger', 'wolpertinger');
select is((select (r.outcome, r.players, r.answered)::text from private.miss_review r where r.text = 'wolpertinger'),
  '(accepted,4,302)', '4 of 302 are');

-- What a text becomes, in order: a near-typo and a rejected text wait in the audit, a listed word is held.
select pg_temp.miss(n, '2000-01-01', 'mb bera', 'mb bera', near => true) from generate_series(1, 3) as s(n);
select pg_temp.miss(n, '2000-01-01', 'mb rock', 'mb rock') from generate_series(1, 3) as s(n);
select pg_temp.miss(n, '2000-01-01', 'mb crud', 'mb crud', listed => true) from generate_series(1, 3) as s(n);
select results_eq($$select text, outcome, thing_id is null from private.miss_review where category = 'mb_animal' and text <> 'jackalope' order by text$$,
  $$values ('mb bera'::text, 'near_typo'::text, true), ('mb crud', 'held', true), ('mb rock', 'rejected', true)$$,
  'only a new word becomes a member; the others make no thing');

-- From the next day: a day that started before the text was accepted doesn't accept it; a day approved before but
-- starting after does.
select is(pg_temp.resolves('2000-01-01', 'jackalope'), null, 'a day that had started keeps its answers');
select is(pg_temp.resolves('2099-01-01', 'jackalope'), array[(pg_temp.review('mb_animal', 'jackalope')).thing_id],
  'a day approved earlier that starts later accepts it');

-- The audit: admins only.
select throws_ok(format('select private.audit_list(%L)', pg_temp.u(1)), 'OB007', null, 'a player can''t read the audit');
select throws_ok(format('select private.audit_decide(%L, 1, %L, null)', pg_temp.u(1), 'dismiss'), 'OB007', null, 'nor decide');
select is(private.audit_open_count(pg_temp.u(500)), 3, 'three texts wait for review: near-typo, rejected, held');
select is(jsonb_array_length(private.audit_list(pg_temp.u(500))), 5, 'the audit lists every text');

-- Undo, from now: as if jackalope had been accepted 12 hours ago, a day approved 6 hours ago keeps it after the undo,
-- and a day starting later doesn't have it.
update private.thing_alias set added_at = now() - interval '12 hours' where thing_id = (pg_temp.review('mb_animal', 'jackalope')).thing_id;
update private.fact set added_at = now() - interval '12 hours' where thing_id = (pg_temp.review('mb_animal', 'jackalope')).thing_id;
select private.audit_decide(pg_temp.u(500), (pg_temp.review('mb_animal', 'jackalope')).id, 'undo', null);
select is(pg_temp.resolves('2000-01-03', 'jackalope'), array[(pg_temp.review('mb_animal', 'jackalope')).thing_id],
  'a day that started before the undo keeps the answer');
select is(pg_temp.resolves('2099-01-01', 'jackalope'), null, 'a day starting after it doesn''t');

-- Link: wolpertinger becomes a name of bear; its own thing goes.
select throws_ok(format('select private.audit_decide(%L, %s, %L, %L)', pg_temp.u(500), (pg_temp.review('mb_big', 'wolpertinger')).id, 'link',
  private.thing_by_ref('wikidata', 'mb-rock')), 'OB012', null, 'a text links only to a member of its category');
select private.audit_decide(pg_temp.u(500), (pg_temp.review('mb_big', 'wolpertinger')).id, 'link', private.thing_by_ref('wikidata', 'mb-bear'));
select is(pg_temp.resolves('2099-01-02', 'wolpertinger'), array[private.thing_by_ref('wikidata', 'mb-bear')],
  'a linked text names the thing it was linked to');

-- Accept a held word; accept a rejected one for this category alone; dismiss a near-typo.
select private.audit_decide(pg_temp.u(500), (pg_temp.review('mb_animal', 'mb crud')).id, 'accept', null);
select is(pg_temp.resolves('2099-01-01', 'mb crud'), array[(pg_temp.review('mb_animal', 'mb crud')).thing_id], 'an accepted held word is an answer');
select private.audit_decide(pg_temp.u(500), (pg_temp.review('mb_animal', 'mb rock')).id, 'accept_for_category', private.thing_by_ref('wikidata', 'mb-rock'));
select is(pg_temp.resolves('2099-01-01', 'mb rock'), array[private.thing_by_ref('wikidata', 'mb-rock')], 'rock is an answer for this category');
select ok(not private.in_category_now(private.thing_by_ref('wikidata', 'mb-rock'), 'mb_big'), 'and for no other');
select private.audit_decide(pg_temp.u(500), (pg_temp.review('mb_animal', 'mb bera')).id, 'dismiss', null);
select is(private.audit_open_count(pg_temp.u(500)), 0, 'nothing left to review');
select throws_ok(format('select private.audit_decide(%L, %s, %L, null)', pg_temp.u(500), (pg_temp.review('mb_animal', 'mb bera')).id, 'undo'),
  'OB012', null, 'a decision that doesn''t fit the text''s state is refused');

-- Every decision that made an answer can be undone, from now (human, 2026-10-24: "Yes, undo anything (Recommended)").
select private.audit_decide(pg_temp.u(500), (pg_temp.review('mb_big', 'wolpertinger')).id, 'undo', null);
select is(pg_temp.resolves('2099-01-02', 'wolpertinger'), null, 'an undone link names nothing on a later day');
select private.audit_decide(pg_temp.u(500), (pg_temp.review('mb_animal', 'mb rock')).id, 'undo', null);
select is(pg_temp.resolves('2099-01-01', 'mb rock'), null, 'an undone acceptance for the category ends on a later day');
select ok(not private.in_category_now(private.thing_by_ref('wikidata', 'mb-rock'), 'mb_animal'), 'and now');
select private.audit_decide(pg_temp.u(500), (pg_temp.review('mb_animal', 'mb crud')).id, 'undo', null);
select is(pg_temp.resolves('2099-01-01', 'mb crud'), null, 'an accepted held word can be undone too');

-- A format-3 day with no approved_at can't be resolved (the day's start alone would hide it).
insert into private.puzzle (game_id, puzzle_date, content)
  values ('offbeat', '2000-01-04', pg_temp.day('2000-01-04', 'mb_animal', now()) - 'approved_at');
select throws_ok($$select * from private.resolve_answer('offbeat', '2000-01-04', 0, array['mb bear'])$$, 'P0001', null,
  'a day with no approval time isn''t resolved');

-- Every outcome is logged, not only the accepted one's (13b review; 13f-4c): one base_log row per review this file made.
select is((select count(*)::int from private.miss_review r where r.category like 'mb\_%' and not exists (
    select from private.base_log l where l.action = 'miss_review' and l.detail ->> 'category' = r.category and l.detail ->> 'text' = r.text
      and l.detail ->> 'outcome' = r.outcome)), 0, 'every review''s outcome is logged');
select ok((select count(distinct outcome) from private.miss_review where category like 'mb\_%') >= 3, 'across several outcomes');

select * from finish();
rollback;
