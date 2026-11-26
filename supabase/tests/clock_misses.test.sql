-- A text typed on a day on a clock (format 4) is logged and makes no answer however many players type it, while on a
-- day of seven questions (format 3) it still does (docs/milestones/M23-23e-drafting-and-approving.md, 23e-2, design 6;
-- the human's answer 53). Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(13);

select private.import_source('wikidata', 'cm-test', '[
  {"id": "cm-animal", "name": "animal", "aliases": [{"alias": "cm animal", "kind": "name"}]},
  {"id": "cm-bear", "name": "bear", "aliases": [{"alias": "cm bear", "kind": "name"}], "kind_of": ["cm-animal"]}
]'::jsonb);
select private.define_category('cm_animal', 'animal', 'wikidata', 'cm-animal', null);

-- One day of each format asking the category in question 1.
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', '2000-02-01', jsonb_build_object('format', 4, 'game_id', 'offbeat', 'date', '2000-02-01', 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'Name an animal', 'category', 'cm_animal', 'levels', '{}'::jsonb, 'rare', '[]'::jsonb, 'size', 1,
      'root', (select root from private.category where key = 'cm_animal'), 'member_of', null)))),
  ('offbeat', '2000-02-02', jsonb_build_object('format', 3, 'game_id', 'offbeat', 'date', '2000-02-02', 'approved_at', now() - interval '2 days',
    'questions', jsonb_build_array(jsonb_build_object('prompt', 'Name an animal', 'category', 'cm_animal', 'host_bank', '[]'::jsonb,
      'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb, 'root', (select root from private.category where key = 'cm_animal'), 'member_of', null, 'members', 1))));

create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@clockmisses.example.test' from generate_series(1, 5) as s(n);
insert into private.run (user_id, game_id, puzzle_date)
  select pg_temp.u(n), 'offbeat', d from generate_series(1, 5) as s(n) cross join (values ('2000-02-01'::date), ('2000-02-02')) as t(d);

-- Player n types text on question 1 of day d, three players being enough to reach the threshold.
create function pg_temp.miss(n int, d date, text text) returns boolean language sql
  return private.record_miss(pg_temp.u(n), 'offbeat', d, 0, text, text, false, false, 3, 1);

select ok((select bool_and(pg_temp.miss(n, '2000-02-01', 'cm jackalope')) from generate_series(1, 4) as s(n)), 'four players'' misses on a day on a clock are logged');
select is((select count(*)::int from private.missed_answer where puzzle_date = '2000-02-01' and normalized = 'cm jackalope'), 4, 'each one is stored');
select is((select count(*)::int from private.miss_review where category = 'cm_animal'), 0, 'they make no review');
select is((select count(*)::int from private.thing_alias where alias = 'cm jackalope'), 0, 'and no answer');
select is((select count(*)::int from private.base_log where action = 'miss_review' and detail ->> 'text' = 'cm jackalope'), 0, 'and nothing is logged as a decision');
select ok(not private.record_miss(pg_temp.u(1), 'offbeat', '2000-02-01', 1, 'x', 'x', false, false, 3, 1), 'a miss on a question the player is not on is still not logged');

-- The same on a day of seven questions makes an answer, as before.
select ok((select bool_and(pg_temp.miss(n, '2000-02-02', 'cm unicorn')) from generate_series(1, 3) as s(n)), 'three players'' misses on a day of seven questions are logged');
select is((select outcome from private.miss_review where category = 'cm_animal' and text = 'cm unicorn'), 'accepted', 'and the third makes it an answer');

-- A clock day's miss decides nothing even when misses on days of seven questions already meet the threshold: three players
-- typed "cm yeti" on the day of seven questions (stored without deciding it), and a fourth types it on the day on a clock.
insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed, normalized)
  select pg_temp.u(n), 'offbeat', '2000-02-02', 0, 'cm yeti', 'cm yeti' from generate_series(1, 3) as s(n);
select ok(pg_temp.miss(4, '2000-02-01', 'cm yeti'), 'a fourth player''s miss on the day on a clock is logged');
select is((select count(*)::int from private.miss_review where category = 'cm_animal' and text = 'cm yeti'), 0, 'and decides nothing');
select is((select count(*)::int from private.thing_alias where alias = 'cm yeti'), 0, 'and nothing became an answer');
select ok(pg_temp.miss(4, '2000-02-02', 'cm yeti'), 'the same player''s miss on the day of seven questions is logged');
select is((select outcome from private.miss_review where category = 'cm_animal' and text = 'cm yeti'), 'accepted', 'and it does decide it');
select * from finish();
rollback;
