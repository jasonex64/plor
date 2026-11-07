-- Game 2's rounds (docs/milestones/M16-16d-playing-it.md; docs/milestones/M16-16b-run-model-and-format.md, "Run model").
-- Three tables, the shared run rules choosing by game, and the judge. Every game 1 branch below is the baseline's,
-- unchanged. Security, approved by the human (2026-11-06, "Yes, approved"; 2026-11-07, "Yes, approved (Recommended)"):
-- plor_app reads round_word, and runs the judge and round_examples. It can't read the word list, and it writes no word
-- or rejection itself, which is narrower than 16b's grant.

-- One row per proper spelling. Only the loader writes it (`npm run base -- load dictionary`). plain is the spelling with
-- its accents off, for the shown spelling's steps; everyday is the picker's mark, used here for a missed round's examples.
create table private.dictionary_word (
  word_key text not null,
  spelling text not null,
  plain text not null,
  everyday boolean not null default false,
  primary key (word_key, spelling)
);

-- One accepted word a round, and no word twice in a run (M16 S10). word is the spelling shown.
create table private.round_word (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  round_idx smallint not null check (round_idx >= 0),
  word_key text not null,
  word text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, game_id, puzzle_date, round_idx),
  unique (user_id, game_id, puzzle_date, word_key),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade
);

-- Only for the lockout: when, with no word (16b, answer 2).
create table private.round_reject (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  round_idx smallint not null check (round_idx >= 0),
  rejected_at timestamptz not null default statement_timestamp(),
  primary key (user_id, game_id, puzzle_date, round_idx, rejected_at),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade
);

alter table private.dictionary_word enable row level security;
alter table private.round_word enable row level security;
alter table private.round_reject enable row level security;
revoke all on table private.dictionary_word, private.round_word, private.round_reject from public, anon, authenticated, service_role;
grant select on table private.round_word to plor_app;
create policy round_word_plor_app_select on private.round_word for select to plor_app using (true);

-- Next: game 1's as in the baseline. Game 2's round k+1 opens only once round k has a word or its 20 seconds have passed,
-- and never past the last round (16b, "Run model").
create or replace function private.check_question_open() returns trigger
  language plpgsql
  as $$
declare
  answered int;
  died boolean;
  questions int;
  opened int;
begin
  if new.game_id = 'substrings' then
    select coalesce(max(o.question_idx), 0) into opened
      from private.question_open o
      where o.user_id = new.user_id and o.game_id = new.game_id and o.puzzle_date = new.puzzle_date;
    select jsonb_array_length(p.content -> 'rounds') into questions
      from private.puzzle p
      where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
    if new.question_idx >= questions then
      raise exception 'run_over' using errcode = 'OB003';
    end if;
    -- A second tap on Next: the route's on conflict do nothing takes it, as for game 1.
    if new.question_idx = opened then
      return new;
    end if;
    if new.question_idx <> opened + 1 then
      raise exception 'out_of_order: expected round %', opened + 1 using errcode = 'OB002';
    end if;
    if not exists (select from private.round_word w
                   where w.user_id = new.user_id and w.game_id = new.game_id and w.puzzle_date = new.puzzle_date and w.round_idx = opened)
       and statement_timestamp() <= private.question_deadline(private.question_started_at(new.user_id, new.game_id, new.puzzle_date, opened)) then
      raise exception 'round_running: round % has its clock going', opened using errcode = 'OB014';
    end if;
    return new;
  end if;
  select count(*), coalesce(bool_or(e.matched), false) into answered, died
    from private.run_event e
    where e.user_id = new.user_id and e.game_id = new.game_id and e.puzzle_date = new.puzzle_date;
  select jsonb_array_length(p.content -> 'questions') into questions
    from private.puzzle p
    where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
  if died or answered >= questions then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if new.question_idx <> answered then
    raise exception 'out_of_order: expected question %', answered using errcode = 'OB002';
  end if;
  return new;
end
$$;

-- As the baseline's for game 1. For game 2, answered is the rounds done, a round being done with a word or past its
-- clock, and a run that has done them all is 'survived', the finished state the social gates already read: no round
-- ends a run (M16 S7). deadline is the open round's, null between rounds.
create or replace view private.run_status with (security_invoker = true) as
select
  s.user_id,
  s.game_id,
  s.puzzle_date,
  s.answered,
  s.questions,
  case
    when s.died then 'died'
    when s.answered = s.questions then 'survived'
    when statement_timestamp() > private.question_deadline(private.question_started_at(s.user_id, s.game_id, s.puzzle_date, s.answered)) then 'timed_out'
    else 'in_progress'
  end as status,
  case when not s.died and s.answered < s.questions
    then private.question_deadline(private.question_started_at(s.user_id, s.game_id, s.puzzle_date, s.answered))
  end as deadline
from (
  select
    r.user_id,
    r.game_id,
    r.puzzle_date,
    count(e.question_idx)::int as answered,
    jsonb_array_length(p.content -> 'questions') as questions,
    coalesce(bool_or(e.matched), false) as died
  from private.run r
  join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
  left join private.run_event e on e.user_id = r.user_id and e.game_id = r.game_id and e.puzzle_date = r.puzzle_date
  where r.game_id <> 'substrings'
  group by r.user_id, r.game_id, r.puzzle_date, p.content
) s
union all
select
  r.user_id,
  r.game_id,
  r.puzzle_date,
  (c.idx + (d.done)::int)::int as answered,
  jsonb_array_length(p.content -> 'rounds') as questions,
  case when c.idx + (d.done)::int = jsonb_array_length(p.content -> 'rounds') then 'survived' else 'in_progress' end as status,
  case when not d.done then d.ends end as deadline
from private.run r
join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
cross join lateral (
  select coalesce(max(o.question_idx), 0)::int as idx from private.question_open o
  where o.user_id = r.user_id and o.game_id = r.game_id and o.puzzle_date = r.puzzle_date
) c
cross join lateral (
  select e.ends, (statement_timestamp() > e.ends or exists (
    select from private.round_word w
    where w.user_id = r.user_id and w.game_id = r.game_id and w.puzzle_date = r.puzzle_date and w.round_idx = c.idx)) as done
  from (select private.question_deadline(private.question_started_at(r.user_id, r.game_id, r.puzzle_date, c.idx)) as ends) e
) d
where r.game_id = 'substrings';

-- The shown spelling's four steps (DECISIONS.md, Game 2, "Matching and showing"), with code-point order. On its own so
-- each step can be tested. A key with no spelling gives null: the judge has checked it has one.
create function private.shown_spelling(p_key text, p_clean text, p_plain text) returns text
  language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select w.spelling from private.dictionary_word w
     where p_clean = p_plain and w.word_key = p_key and w.spelling <> w.plain and w.plain = p_clean
     order by w.spelling collate "C" limit 1),
    (select w.spelling from private.dictionary_word w where w.word_key = p_key and w.spelling = p_clean),
    (select w.spelling from private.dictionary_word w
     where p_clean = p_plain and w.word_key = p_key and w.spelling <> w.plain
     order by w.spelling collate "C" limit 1),
    (select w.spelling from private.dictionary_word w where w.word_key = p_key order by w.spelling collate "C" limit 1));
$$;

revoke all on function private.shown_spelling(text, text, text) from public, anon, authenticated, service_role;

-- The judge (16b, "Run model"; M16 16d). The route passes the try's letters-only key, its cleaned text, and that text
-- with its accents off, all from src/game/substring-try.ts, so there's one normalizer. A row lock on the run takes tries
-- one at a time, so parallel ones can't all pass the lockout. Each rejection stores when, with no word.
create function private.judge_word(p_user uuid, p_date date, p_key text, p_clean text, p_plain text) returns jsonb
  language plpgsql security definer set search_path = ''
as $$
declare
  idx int;
  letters text;
  stored private.round_word;
  last_reject timestamptz;
  reason text;
  word text;
begin
  perform from private.run r where r.user_id = p_user and r.game_id = 'substrings' and r.puzzle_date = p_date for update;
  if not found then
    return jsonb_build_object('outcome', 'no_run');
  end if;
  if p_key = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  select coalesce(max(o.question_idx), 0)::int into idx from private.question_open o
    where o.user_id = p_user and o.game_id = 'substrings' and o.puzzle_date = p_date;
  select * into stored from private.round_word w
    where w.user_id = p_user and w.game_id = 'substrings' and w.puzzle_date = p_date and w.round_idx = idx;
  if found then
    if stored.word_key = p_key then
      return jsonb_build_object('outcome', 'accepted', 'word', stored.word);
    end if;
    return jsonb_build_object('outcome', 'already_answered');
  end if;
  -- Statement time, as the answer trigger's: the try's own moment.
  if statement_timestamp() > private.question_deadline(private.question_started_at(p_user, 'substrings', p_date, idx)) then
    return jsonb_build_object('outcome', 'time_up');
  end if;
  select max(x.rejected_at) into last_reject from private.round_reject x
    where x.user_id = p_user and x.game_id = 'substrings' and x.puzzle_date = p_date and x.round_idx = idx;
  -- The human, 2026-11-06: "0.5 seconds" (M16 16b, answer 9). The server enforces it, so the number lives here alone.
  if statement_timestamp() < last_reject + interval '0.5 seconds' then
    return jsonb_build_object('outcome', 'locked');
  end if;
  select p.content -> 'rounds' ->> idx into letters from private.puzzle p
    where p.game_id = 'substrings' and p.puzzle_date = p_date;
  if not exists (select from private.dictionary_word w where w.word_key = p_key) then
    reason := 'not_a_word';
  elsif position(letters in p_key) = 0 then
    reason := 'needs_letters';
  elsif exists (select from private.round_word w
                where w.user_id = p_user and w.game_id = 'substrings' and w.puzzle_date = p_date and w.word_key = p_key) then
    reason := 'already_used';
  end if;
  if reason is not null then
    insert into private.round_reject (user_id, game_id, puzzle_date, round_idx, rejected_at)
    values (p_user, 'substrings', p_date, idx, statement_timestamp());
    return jsonb_build_object('outcome', reason);
  end if;
  word := private.shown_spelling(p_key, p_clean, p_plain);
  insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word)
  values (p_user, 'substrings', p_date, idx, p_key, word);
  return jsonb_build_object('outcome', 'accepted', 'word', word);
end;
$$;

-- For each round a finished run missed, 3 everyday words that would have fit, shortest first (16d, answer 5). Nothing
-- until the run is over, so a player can't use them.
create function private.round_examples(p_user uuid, p_date date) returns table (round_idx int, words text[])
  language sql stable security definer set search_path = ''
as $$
  select (r.n - 1)::int, array(
    select q.spelling from (
      select distinct on (length(w.word_key), w.word_key) w.word_key, w.spelling
      from private.dictionary_word w
      where w.everyday and position(r.letters in w.word_key) > 0
      order by length(w.word_key), w.word_key, w.spelling collate "C"
    ) q
    order by length(q.word_key), q.word_key
    limit 3)
  from private.puzzle p
  cross join lateral jsonb_array_elements_text(p.content -> 'rounds') with ordinality as r(letters, n)
  where p.game_id = 'substrings' and p.puzzle_date = p_date
    and exists (select from private.run_status s
                where s.user_id = p_user and s.game_id = 'substrings' and s.puzzle_date = p_date and s.status = 'survived')
    and not exists (select from private.round_word w
                    where w.user_id = p_user and w.game_id = 'substrings' and w.puzzle_date = p_date and w.round_idx = r.n - 1);
$$;

revoke all on function private.judge_word(uuid, date, text, text, text), private.round_examples(uuid, date) from public, anon, authenticated, service_role;
grant execute on function private.judge_word(uuid, date, text, text, text), private.round_examples(uuid, date) to plor_app;

-- As the baseline's, but a game 2 run tells nobody yet: friends' boards show game 1's state, and would read it as
-- playing that game. Game 2's board comes with the shared screens (M16 16f).
create or replace function private.broadcast_board() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  payload jsonb;
  started jsonb;
  recipient uuid;
begin
  if new.game_id = 'substrings' then
    return null;
  end if;
  select rs.status, rs.answered into s from private.run_status rs
  where rs.user_id = new.user_id and rs.game_id = new.game_id and rs.puzzle_date = new.puzzle_date;
  payload := jsonb_build_object(
    'v', 2,
    'type', 'friend_status',
    'username', (select p.username::text from private.profile p where p.user_id = new.user_id),
    'gameId', new.game_id,
    'puzzleDate', new.puzzle_date,
    'state', case when s.status = 'in_progress' then 'playing' else 'finished' end,
    'question', case when s.status = 'in_progress' then s.answered + 1 end
  );
  started := payload || jsonb_build_object('state', 'started', 'question', null);
  perform realtime.send(payload, 'friend_status', 'board:' || new.user_id::text, true);
  for recipient in
    select case when f.user_a = new.user_id then f.user_b else f.user_a end
    from private.friendship f where new.user_id in (f.user_a, f.user_b)
  loop
    if exists (select from private.run_status rs
               where rs.user_id = recipient and rs.game_id = new.game_id and rs.puzzle_date = new.puzzle_date
                 and rs.status in ('died', 'survived', 'timed_out')) then
      perform realtime.send(payload, 'friend_status', 'board:' || recipient::text, true);
    elsif tg_table_name = 'run' then
      perform realtime.send(started, 'friend_status', 'board:' || recipient::text, true);
    end if;
  end loop;
  return null;
end;
$$;
