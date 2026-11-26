-- Approving a day on a clock (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1; migration
-- 20261126070647_clock_day_approval.sql): private.build_puzzle builds a day of format 4 for an admin only, holds it to what
-- the base can say (each question's category is a researched list and every answer it names is a member of it), and
-- approval stores it. Called as the test's own role, as puzzle_entry.test.sql explains; that plor_app may only execute
-- build_puzzle, and not the clock function under it, is checked here. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- A researched list of hats, and a category of another source that is not a list.
select private.import_source('research', 'cd-test', '[
  {"id": "cd_hat", "name": "cd hat"},
  {"id": "cd_hat/beanie", "name": "cd beanie", "aliases": [{"alias": "cd beanie", "kind": "name"}], "kind_of": ["cd_hat"], "thing_id": "00000000-0000-5000-8000-0000000cd001"},
  {"id": "cd_hat/fez", "name": "cd fez", "aliases": [{"alias": "cd fez", "kind": "name"}], "kind_of": ["cd_hat"], "thing_id": "00000000-0000-5000-8000-0000000cd002"},
  {"id": "cd_hat/beret", "name": "cd beret", "aliases": [{"alias": "cd beret", "kind": "name"}], "kind_of": ["cd_hat"], "thing_id": "00000000-0000-5000-8000-0000000cd003"},
  {"id": "cd_hat/cap", "name": "cd cap", "aliases": [{"alias": "cd cap", "kind": "name"}], "kind_of": ["cd_hat"], "thing_id": "00000000-0000-5000-8000-0000000cd004"}
]'::jsonb);
select private.define_category('cd_hat', 'cd hat', 'research', 'cd_hat', null);
select private.import_source('wikidata', 'cd-test', '[
  {"id": "cd-animal", "name": "cd animal"},
  {"id": "cd-bear", "name": "cd bear", "aliases": [{"alias": "cd bear", "kind": "name"}], "kind_of": ["cd-animal"], "thing_id": "00000000-0000-5000-8000-0000000cd010"}
]'::jsonb);
select private.define_category('cd_animal', 'cd animal', 'wikidata', 'cd-animal', null);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000cd01', 'cd-admin@example.test'),
  ('00000000-0000-0000-0000-00000000cd02', 'cd-player@example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-00000000cd01');
-- Far ahead, so local runs and other tests never collide with it.
create temp table d as select private.today() + 420 as ahead;

-- A one-question day on a clock for a date: beanie and fez are levels, beret and cap rare unless a test says otherwise.
create function pg_temp.day(p_date date, p_category text, p_levels jsonb, p_rare jsonb) returns jsonb
  language sql
  return jsonb_build_object('format', 4, 'game_id', 'offbeat', 'date', p_date::text, 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'Name a hat', 'category', p_category, 'levels', p_levels, 'rare', p_rare, 'size', 4)));
create temp table good as select pg_temp.day((select ahead from d), 'cd_hat',
  '{"00000000-0000-5000-8000-0000000cd001": "common", "00000000-0000-5000-8000-0000000cd002": "uncommon"}'::jsonb,
  '["00000000-0000-5000-8000-0000000cd003", "00000000-0000-5000-8000-0000000cd004"]'::jsonb) as content;

select throws_ok($$select private.build_puzzle('00000000-0000-0000-0000-00000000cd02', (select content from good))$$,
  'OB007', null, 'a player who is not an admin cannot build a day on a clock');

create temp table built as select private.build_puzzle('00000000-0000-0000-0000-00000000cd01', (select content from good)) as content;
select is((select content -> 'questions' -> 0 ->> 'root' from built), (select root::text from private.category where key = 'cd_hat'), 'a built day has its list''s root');
select ok((select content -> 'questions' -> 0 ? 'member_of' from built), 'and its member_of, as approval stores them');
select is((select (content -> 'questions' -> 0) - 'root' - 'member_of' from built), (select content -> 'questions' -> 0 from good),
  'and keeps what the draft held, nothing else: no host answers, no member count');
select ok(not (select content ? 'approved_at' from built), 'but no approval time: it is not approved');

-- Refused with the base's own problems, as OB009.
select throws_ok($$select private.build_puzzle('00000000-0000-0000-0000-00000000cd01', pg_temp.day((select ahead from d), 'cd_animal',
    '{"00000000-0000-5000-8000-0000000cd010": "common"}'::jsonb, '[]'::jsonb))$$,
  'OB009', 'puzzle_invalid: question 1: cd_animal is not a researched list', 'a category that is not a researched list is refused');
select throws_ok($$select private.build_puzzle('00000000-0000-0000-0000-00000000cd01', pg_temp.day((select ahead from d), 'cd_nope', '{}'::jsonb, '[]'::jsonb))$$,
  'OB009', 'puzzle_invalid: question 1: no category cd_nope', 'nor a category that does not exist');
select throws_ok($$select private.build_puzzle('00000000-0000-0000-0000-00000000cd01', pg_temp.day((select ahead from d), 'cd_hat',
    '{"00000000-0000-5000-8000-0000000cd010": "common"}'::jsonb, '[]'::jsonb))$$,
  'OB009', 'puzzle_invalid: question 1: level on 00000000-0000-5000-8000-0000000cd010, which is not a cd_hat', 'a level on a thing outside the list is refused');
select throws_ok($$select private.build_puzzle('00000000-0000-0000-0000-00000000cd01', pg_temp.day((select ahead from d), 'cd_hat',
    '{}'::jsonb, '["00000000-0000-5000-8000-0000000cd010"]'::jsonb))$$,
  'OB009', 'puzzle_invalid: question 1: rare answer 00000000-0000-5000-8000-0000000cd010 is not a cd_hat', 'and so is a rare answer outside it');

-- Approval stores it, with its approval time and its built question.
select private.approve_puzzle('00000000-0000-0000-0000-00000000cd01', (select content from good));
select ok((select content ->> 'format' = '4' and content ? 'approved_at' and content -> 'questions' -> 0 ? 'root'
  from private.puzzle where game_id = 'offbeat' and puzzle_date = (select ahead from d)), 'approval stores the day on a clock with its approval time and its built question');

-- Grants: plor_app runs build_puzzle as before, and cannot run the function under it.
select ok(has_function_privilege('plor_app', 'private.build_puzzle(uuid, jsonb)', 'execute'), 'plor_app still executes build_puzzle');
select ok(not has_function_privilege('plor_app', 'private.build_clock_day(jsonb)', 'execute'), 'and is granted nothing new');

select * from finish();
rollback;
