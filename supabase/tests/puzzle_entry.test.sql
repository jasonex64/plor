-- Puzzle entry's guarded functions (docs/milestones/M06-puzzle-entry.md; migrations 20261021232903_puzzle_entry.sql,
-- 20261024213853_answer_engine.sql and 20261025042950_rarity_and_the_host.sql), whoever calls them: only an admin may approve a day, a past day
-- is refused, a day that has started can't change, and a format-3 day must hold up against the answer database. They're
-- called as the test's own role, which can't SET ROLE plor_app locally; that plor_app may only execute them, never write
-- the tables, is checked by plor_app_role.test.sql and game.test.sql.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e601', 'm06-admin@example.test'),
  ('00000000-0000-0000-0000-00000000e602', 'm06-player@example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-00000000e601');
-- A fixed day far ahead, so local runs and other tests never collide with it.
create temp table d as select private.today() + 400 as ahead, private.today() - 1 as past;

-- A tiny category: pet > dog, cat, crab, hamster, mouse, horse; rock is outside it.
select private.import_source('wikidata', 'pe-test', '[
  {"id": "pe-pet", "name": "pet", "aliases": [], "thing_id": "00000000-0000-5000-8000-0000000e6100"},
  {"id": "pe-dog", "name": "dog", "aliases": [{"alias": "dog", "kind": "name"}], "kind_of": ["pe-pet"], "thing_id": "00000000-0000-5000-8000-0000000e6101"},
  {"id": "pe-cat", "name": "cat", "aliases": [{"alias": "cat", "kind": "name"}], "kind_of": ["pe-pet"], "thing_id": "00000000-0000-5000-8000-0000000e6102"},
  {"id": "pe-crab", "name": "crab", "aliases": [{"alias": "crab", "kind": "name"}], "kind_of": ["pe-pet"], "thing_id": "00000000-0000-5000-8000-0000000e6103"},
  {"id": "pe-hamster", "name": "hamster", "aliases": [{"alias": "hamster", "kind": "name"}], "kind_of": ["pe-pet"], "thing_id": "00000000-0000-5000-8000-0000000e6105"},
  {"id": "pe-mouse", "name": "mouse", "aliases": [{"alias": "mouse", "kind": "name"}], "kind_of": ["pe-pet"], "thing_id": "00000000-0000-5000-8000-0000000e6106"},
  {"id": "pe-horse", "name": "horse", "aliases": [{"alias": "horse", "kind": "name"}], "kind_of": ["pe-pet"], "thing_id": "00000000-0000-5000-8000-0000000e6107"},
  {"id": "pe-elsewhere", "name": "rock", "aliases": [{"alias": "rock", "kind": "name"}], "thing_id": "00000000-0000-5000-8000-0000000e6104"}
]'::jsonb);
select private.define_category('pet', 'pet', 'wikidata', 'pe-pet', null);
-- A one-question day for a date, with its host bank, host answers, stolen letter and familiar answers (levels): by
-- default cat, hamster, mouse and horse, uncommon.
create function pg_temp.day(p_date date, p_bank text[], p_hosts text[], p_steals text default null, p_category text default 'pet',
  p_levels jsonb default '{"00000000-0000-5000-8000-0000000e6102": "uncommon", "00000000-0000-5000-8000-0000000e6105": "uncommon",
    "00000000-0000-5000-8000-0000000e6106": "uncommon", "00000000-0000-5000-8000-0000000e6107": "uncommon"}') returns jsonb
  language sql
  return jsonb_build_object('format', 3, 'game_id', 'offbeat', 'date', p_date::text, 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'Name a pet', 'category', p_category, 'host_bank', to_jsonb(p_bank), 'host_answers', to_jsonb(p_hosts), 'levels', p_levels)
      || case when p_steals is null then '{}'::jsonb else jsonb_build_object('steals', p_steals) end));
create temp table ids as select '00000000-0000-5000-8000-0000000e6101' as dog, '00000000-0000-5000-8000-0000000e6102' as cat,
  '00000000-0000-5000-8000-0000000e6103' as crab, '00000000-0000-5000-8000-0000000e6104' as rock;


select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e602', pg_temp.day((select ahead from d), array[(select dog from ids)], array[(select dog from ids)]))$$,
  'OB007', null, 'a player who is not an admin cannot approve a day');
select lives_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d), array[(select dog from ids), (select cat from ids)], array[(select dog from ids)]))$$,
  'an admin approves a future day');
select ok((select content ? 'approved_at' from private.puzzle where game_id = 'offbeat' and puzzle_date = (select ahead from d)), 'approval stores the moment answers are resolved as of');
select is((select (content->'questions'->0->>'members')::int from private.puzzle where game_id = 'offbeat' and puzzle_date = (select ahead from d)), 6,
  'and the category''s member count');
select is((select content->'questions'->0->>'root' from private.puzzle where game_id = 'offbeat' and puzzle_date = (select ahead from d)), '00000000-0000-5000-8000-0000000e6100',
  'and its root, so a later change to the category leaves the day as it was');
-- A day file may name an ID a merge retired (13e-5b): it's approved and stored under its thing's current ID.
select private.import_source('wikidata', 'pe-test', '[
  {"id": "pe-dog-old", "name": "old dog", "aliases": [{"alias": "hound", "kind": "name"}], "merged_into": "wikidata:pe-dog", "thing_id": "00000000-0000-5000-8000-0000000e6108"}
]'::jsonb);
select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d) + 1,
  array['00000000-0000-5000-8000-0000000e6108', (select cat from ids)], array['00000000-0000-5000-8000-0000000e6108']));
select is((select content->'questions'->0->'host_answers' from private.puzzle where game_id = 'offbeat' and puzzle_date = (select ahead from d) + 1),
  jsonb_build_array((select dog from ids)), 'a retired ID in a day file is approved as its thing''s current ID');
select throws_like($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d) + 2,
  array['00000000-0000-5000-8000-0000000e6108', (select dog from ids), (select cat from ids)], array[(select dog from ids)]))$$,
  '%name one thing now%', 'a day naming a retired ID beside its thing is refused');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select past from d), array[(select dog from ids)], array[(select dog from ids)]))$$,
  'OB008', null, 'a day that is over cannot be approved');

-- A format-3 day that doesn't hold up against the base is refused, every problem in one message (OB009).
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', jsonb_build_object('format', 2, 'game_id', 'offbeat', 'date', (select ahead from d)::text))$$,
  'OB009', 'puzzle_invalid: format 3 expected', 'an older format is refused');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d), array[(select dog from ids)], array[(select dog from ids)], null, 'nothing'))$$,
  'OB009', 'puzzle_invalid: question 1: no category nothing', 'an unknown category is refused');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d), array[(select rock from ids)], array[(select dog from ids)]))$$,
  'OB009', format('puzzle_invalid: question 1: host bank entry %s is not a pet; question 1: host answer %s is not in the host bank',
    '00000000-0000-5000-8000-0000000e6104', '00000000-0000-5000-8000-0000000e6101'),
  'a host bank entry outside the category, and a host answer outside the host bank, are refused together');
-- A level on a thing outside the category is refused: the bonus's first guess splits each tier among its members.
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d),
    array[(select dog from ids)], array[(select dog from ids)], null, 'pet',
    '{"00000000-0000-5000-8000-0000000e6102": "uncommon", "00000000-0000-5000-8000-0000000e6105": "uncommon",
      "00000000-0000-5000-8000-0000000e6106": "uncommon", "00000000-0000-5000-8000-0000000e6104": "uncommon"}'))$$,
  'OB009', 'puzzle_invalid: question 1: level on 00000000-0000-5000-8000-0000000e6104, which is not a pet',
  'a level on a thing outside the category is refused');
-- Three familiar answers must stay typeable and safe (M13 13c; FAMILIAR_SAFE_MIN). The host catches dog; exactly three
-- familiar ones left (cat, hamster, mouse) pass; with H stolen, hamster and horse can't be typed, leaving cat and mouse.
select lives_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d),
    array[(select dog from ids)], array[(select dog from ids)], null, 'pet',
    '{"00000000-0000-5000-8000-0000000e6102": "uncommon", "00000000-0000-5000-8000-0000000e6105": "uncommon", "00000000-0000-5000-8000-0000000e6106": "uncommon"}'))$$,
  'three familiar answers typeable and safe are enough');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601',
    pg_temp.day((select ahead from d), array[(select dog from ids)], array[(select dog from ids)], 'h'))$$,
  'OB009', 'puzzle_invalid: question 1: fewer than 3 familiar answers the host doesn''t catch can be typed without h',
  'a question with fewer than 3 familiar answers typeable and safe is refused');

-- The rule's other parts (13c review; 13f-4b). A familiar answer under a host answer is caught, so it doesn't count:
-- with puppy under dog, cat, hamster and puppy leave two.
select private.import_source('wikidata', 'pe-test', '[{"id": "pe-puppy", "name": "puppy", "aliases": [{"alias": "puppy", "kind": "name"}], "kind_of": ["pe-dog"], "thing_id": "00000000-0000-5000-8000-0000000e6109"}]'::jsonb);
select throws_like($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d),
    array[(select dog from ids)], array[(select dog from ids)], null, 'pet',
    '{"00000000-0000-5000-8000-0000000e6102": "uncommon", "00000000-0000-5000-8000-0000000e6105": "uncommon", "00000000-0000-5000-8000-0000000e6109": "uncommon"}'))$$,
  '%question 1: fewer than 3 familiar answers%', 'a familiar answer under a host answer doesn''t count');
-- Only members in the levels are familiar: mouse and horse are safe members, but with only cat and hamster in the levels
-- two are left.
select throws_like($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day((select ahead from d),
    array[(select dog from ids)], array[(select dog from ids)], null, 'pet',
    '{"00000000-0000-5000-8000-0000000e6102": "uncommon", "00000000-0000-5000-8000-0000000e6105": "uncommon"}'))$$,
  '%question 1: fewer than 3 familiar answers%', 'a safe member outside the levels doesn''t count');
-- A familiar answer typeable by another of its names counts: with H stolen, hamster's "cricetid" can still be typed, so
-- cat, mouse and hamster make three (the day refused above, now approved).
select private.import_source('wikidata', 'pe-test', '[{"id": "pe-hamster", "name": "hamster", "aliases": [{"alias": "hamster", "kind": "name"}, {"alias": "cricetid", "kind": "synonym"}], "kind_of": ["pe-pet"]}]'::jsonb);
select lives_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601',
    pg_temp.day((select ahead from d), array[(select dog from ids)], array[(select dog from ids)], 'h'))$$,
  'a familiar answer typeable by a second name counts');

-- A day that has started can't change. Today gets a puzzle here if it has none (rolled back at the end).
insert into private.puzzle (game_id, puzzle_date, content)
  select 'offbeat', private.today(), jsonb_build_object('game_id', 'offbeat', 'date', private.today()::text)
  where not exists (select from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today());
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e601', pg_temp.day(private.today(), array[(select dog from ids)], array[(select dog from ids)]))$$,
  'OB004', null, 'a day that has started cannot be approved again');

select * from finish();
rollback;
