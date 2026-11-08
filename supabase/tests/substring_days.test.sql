-- Game 2's day through private.approve_puzzle (docs/milestones/M16-16c-a-day-of-game-2.md): only an admin approves one,
-- a past day is refused, a day that has started can't change, a day must be format 1, and game 1 stays format 3.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e611', 'm16-admin@example.test'),
  ('00000000-0000-0000-0000-00000000e612', 'm16-player@example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-00000000e611');
create temp table d as select private.today() + 410 as ahead, private.today() - 1 as past, private.today() as today;

create function pg_temp.day(p_date date, p_format int default 1, p_game text default 'substrings') returns jsonb
  language sql as $$
    select jsonb_build_object('format', p_format, 'game_id', p_game, 'date', p_date,
      'rounds', '["ou", "lu", "att", "yin", "odo", "hec", "vet"]'::jsonb, 'bonus_letter', 'f')
  $$;

select lives_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e611', pg_temp.day((select ahead from d)))$$, 'an admin approves a game 2 day');
select is((select content -> 'rounds' ->> 2 from private.puzzle where game_id = 'substrings' and puzzle_date = (select ahead from d)), 'att', 'the day is stored as drafted');
select ok((select content ? 'approved_at' from private.puzzle where game_id = 'substrings' and puzzle_date = (select ahead from d)), 'and carries approved_at');
select lives_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e611', pg_temp.day((select ahead from d)))$$, 'a day not yet started can be approved again');

select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e612', pg_temp.day((select ahead from d) + 1))$$, 'OB007', null, 'a player who is no admin is refused');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e611', pg_temp.day((select past from d)))$$, 'OB008', null, 'a past day is refused');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e611', pg_temp.day((select ahead from d) + 1, 3))$$, 'OB009', null, 'a game 2 day must be format 1');
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e611', pg_temp.day((select ahead from d) + 1, 1, 'offbeat'))$$, 'OB009', null, 'a game 1 day can''t be format 1');

select private.approve_puzzle('00000000-0000-0000-0000-00000000e611', pg_temp.day((select today from d)));
select throws_ok($$select private.approve_puzzle('00000000-0000-0000-0000-00000000e611', pg_temp.day((select today from d)))$$, 'OB004', null, 'a day that has started can''t change');

select * from finish();
rollback;
