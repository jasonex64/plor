-- A game 2 run in the database (docs/milestones/M16-16d-playing-it.md): the rounds' rules, the judge's every outcome, the
-- shown spelling, the end of a run, and what plor_app may touch. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000e621', 'm16-g2@example.test');
create temp table d as select private.today() + 440 as day;
insert into private.puzzle (game_id, puzzle_date, content)
select 'substrings', day, jsonb_build_object('format', 1, 'game_id', 'substrings', 'date', day,
  'rounds', '["ck", "ro", "af", "own", "hes", "qxz", "zz"]'::jsonb, 'bonus_letter', 'f')
from d;
-- Tests load their own words: the real list isn't in git. A loaded one may hold them too.
insert into private.dictionary_word (word_key, spelling, plain, everyday) values
  ('rocks', 'rocks', 'rocks', true), ('backs', 'backs', 'backs', true), ('stack', 'stack', 'stack', false),
  ('cafe', 'cafe', 'cafe', false), ('cafe', 'café', 'cafe', true),
  ('wellknown', 'well-known', 'well-known', true),
  ('hes', 'he''s', 'he''s', true), ('hes', 'hes', 'hes', false),
  ('note', 'note', 'note', true),
  -- A made-up round, so a loaded real list can't change its examples: the first three stand, and two more words don't.
  ('qxzab', 'qxzab', 'qxzab', true), ('aqxzb', 'aqxzb', 'aqxzb', true), ('qxzcd', 'qxzcd', 'qxzcd', true),
  ('qxzefgh', 'qxzefgh', 'qxzefgh', true), ('qxzaa', 'qxzaa', 'qxzaa', false)
on conflict do nothing;

create function pg_temp.judge(p_key text, p_clean text default null, p_plain text default null) returns jsonb
  language sql as $$
    select private.judge_word('00000000-0000-0000-0000-00000000e621', (select day from d), p_key, coalesce(p_clean, p_key), coalesce(p_plain, p_clean, p_key))
  $$;
create function pg_temp.outcome(p_key text) returns text language sql as $$ select pg_temp.judge(p_key) ->> 'outcome' $$;
create function pg_temp.unlock() returns void language sql as $$ update private.round_reject set rejected_at = rejected_at - interval '1 second' $$;
-- The round's clock run out, as a test can't wait 20 seconds.
create function pg_temp.time_out(p_round int) returns void language plpgsql as $$
begin
  if p_round = 0 then update private.run set started_at = started_at - interval '21 seconds';
  else update private.question_open set opened_at = opened_at - interval '21 seconds' where question_idx = p_round;
  end if;
end $$;
create function pg_temp.open(p_round int) returns void language sql as $$
  insert into private.question_open (user_id, game_id, puzzle_date, question_idx)
  select '00000000-0000-0000-0000-00000000e621', 'substrings', day, p_round from d
$$;
create function pg_temp.status() returns text language sql as $$ select status from private.run_status where game_id = 'substrings' $$;
create function pg_temp.answered() returns int language sql as $$ select answered from private.run_status where game_id = 'substrings' $$;

select is(pg_temp.outcome('rocks'), 'no_run', 'no run, no judging');
insert into private.run (user_id, game_id, puzzle_date) select '00000000-0000-0000-0000-00000000e621', 'substrings', day from d;

select is(pg_temp.status(), 'in_progress', 'a new run is in progress');
select is(pg_temp.answered(), 0, 'with no round done');
select ok((select deadline is not null from private.run_status where game_id = 'substrings'), 'and round 1''s clock running');

select is((select count(*)::int from realtime.messages where topic = 'board:00000000-0000-0000-0000-00000000e621'), 0, 'a game 2 run tells no board yet');

-- Round 1, "ck".
select is(pg_temp.outcome(''), 'empty', 'an empty try is not judged');
select is((select count(*)::int from private.round_reject), 0, 'and does not lock');
select is(pg_temp.outcome('zzzzz'), 'not_a_word', 'a word outside the dictionary is refused');
select is((select count(*)::int from private.round_reject), 1, 'and locks');
select is(pg_temp.outcome('rocks'), 'locked', 'the next try within 0.5 s is refused unjudged');
select is((select count(*)::int from private.round_reject), 1, 'and adds no second lock');
select pg_temp.unlock();
select is(pg_temp.outcome('note'), 'needs_letters', 'a word without the round''s letters is refused');
select pg_temp.unlock();
select throws_ok($$select pg_temp.open(1)$$, 'OB014', null, 'Next is refused while the round runs');
select is(pg_temp.judge('rocks') ->> 'outcome', 'accepted', 'a word with the letters is accepted');
select is((select word from private.round_word where round_idx = 0), 'rocks', 'and stored');
select is(pg_temp.status(), 'in_progress', 'the run goes on');
select is(pg_temp.answered(), 1, 'with one round done');
select ok((select deadline is null from private.run_status where game_id = 'substrings'), 'and no clock until Next');
select is(pg_temp.judge('rocks') ->> 'outcome', 'accepted', 'a retry of the stored word returns it');
select is(pg_temp.outcome('backs'), 'already_answered', 'another word for a filled round is refused');
select throws_ok($$select pg_temp.open(2)$$, 'OB002', null, 'a round can''t be skipped');

-- Round 2, "ro": the word from round 1 can't come back.
select pg_temp.open(1);
select is(pg_temp.outcome('rocks'), 'already_used', 'no word twice in a run');
select pg_temp.unlock();
select pg_temp.time_out(1);
select is(pg_temp.outcome('rocks'), 'time_up', 'no try past the 20 seconds');
select is((select count(*)::int from private.round_word where round_idx = 1), 0, 'a timed-out round has no word');
select is(pg_temp.status(), 'in_progress', 'and the run goes on');

-- The shown spelling's steps (DECISIONS.md, Game 2).
select pg_temp.open(2);
select is(pg_temp.judge('cafe', 'cafe', 'cafe') ->> 'word', 'café', 'accents win: "cafe" shows café');
select pg_temp.open(3);
select is(pg_temp.judge('wellknown', 'wellknown', 'wellknown') ->> 'word', 'well-known', 'the first spelling, for letters alone');
select pg_temp.open(4);
select is(pg_temp.judge('hes', 'he''s', 'he''s') ->> 'word', 'he''s', 'the typed spelling, if it is real');

-- To the end, a miss on the last round.
select is((select count(*)::int from private.round_examples('00000000-0000-0000-0000-00000000e621', (select day from d))), 0, 'no examples before the run ends');
select pg_temp.open(5);
select pg_temp.time_out(5);
select pg_temp.open(6);
select is(pg_temp.status(), 'in_progress', 'round 7 is playing');
select pg_temp.time_out(6);
select is(pg_temp.status(), 'survived', 'a run ends after round 7''s timeout');
select is(pg_temp.answered(), 7, 'with every round done');
select throws_ok($$select pg_temp.open(7)$$, 'OB003', null, 'never past round 7');
select is(
  (select words from private.round_examples('00000000-0000-0000-0000-00000000e621', (select day from d)) where round_idx = 5),
  array['aqxzb', 'qxzab', 'qxzcd'], 'a missed round gets three everyday words, shortest first');
select is((select count(*)::int from private.round_examples('00000000-0000-0000-0000-00000000e621', (select day from d)) where round_idx = 0), 0, 'a round with a word gets none');

-- What plor_app may touch: its reads, and the two functions. Every word goes through the judge.
select ok(not has_table_privilege('plor_app', 'private.dictionary_word', 'select'), 'plor_app can''t read the word list');
select ok(has_table_privilege('plor_app', 'private.round_word', 'select') and not has_table_privilege('plor_app', 'private.round_word', 'insert'), 'plor_app reads round_word and can''t write it');

select * from finish();
rollback;
