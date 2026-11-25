-- M23 23c, the run on a clock (docs/milestones/M23-23c-the-run-on-a-clock.md; DECISIONS.md, Log 2026-11-24). Security
-- change, approved by the human with the ticket (2026-11-24: "Approve both"): four tables plor_app may read and insert,
-- as it may run_event and question_open.
--
-- A day stored as format 4 is played on a clock: three questions, one clock that starts at 20 seconds, each accepted
-- answer adding time and points by its tier. Format 3 days and Fragments keep every rule they have. The clock is never
-- stored: a run ends at its start, plus the starting time, plus what its answers added, or at its Finish.
-- New failures: OB018 not_a_clock_day (a clock row for a day of another format), OB019 not_last_question (Finish before
-- the last question).

-- ====================================================================================================================
-- The numbers, in one place (the M23 ticket, answers 10, 11 and 31; the 23c ticket, Numbers).
-- ====================================================================================================================

-- The clock at Start.
create function private.clock_start_ms() returns int
  language sql immutable
  return 20000;

-- What an answer adds: its tier's time, 5% less for each answer the run already holds, never under a second.
create function private.clock_added_ms(p_tier text, p_answers int) returns int
  language sql immutable
  return greatest(1000, round(case p_tier when 'common' then 3000 when 'uncommon' then 5000 else 8000 end * power(0.95, p_answers)))::int;

create function private.clock_points(p_tier text) returns int
  language sql immutable
  return case p_tier when 'common' then 10 when 'uncommon' then 25 else 50 end;

-- ====================================================================================================================
-- The tables. One row per accepted answer per question, so an answer counts once whichever tab sends it; one Finish a
-- run. tier, added_ms, points and the times are filled in by the triggers below, whatever the insert says. The guest
-- tables are the same, keyed by the token's hash, and go with the guest's run.
-- ====================================================================================================================

create table private.clock_answer (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx >= 0),
  entry_id text not null,
  tier text not null check (tier in ('common', 'uncommon', 'rare')),
  added_ms integer not null check (added_ms >= 1000),
  points integer not null check (points > 0),
  created_at timestamptz not null,
  primary key (user_id, game_id, puzzle_date, question_idx, entry_id),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade
);

create table private.clock_finish (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  finished_at timestamptz not null,
  primary key (user_id, game_id, puzzle_date),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade
);

create table private.guest_clock_answer (
  token_hash text not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx >= 0),
  entry_id text not null,
  tier text not null check (tier in ('common', 'uncommon', 'rare')),
  added_ms integer not null check (added_ms >= 1000),
  points integer not null check (points > 0),
  created_at timestamptz not null,
  primary key (token_hash, game_id, puzzle_date, question_idx, entry_id),
  foreign key (token_hash, game_id, puzzle_date) references private.guest_run (token_hash, game_id, puzzle_date) on delete cascade
);

create table private.guest_clock_finish (
  token_hash text not null,
  game_id text not null,
  puzzle_date date not null,
  finished_at timestamptz not null,
  primary key (token_hash, game_id, puzzle_date),
  foreign key (token_hash, game_id, puzzle_date) references private.guest_run (token_hash, game_id, puzzle_date) on delete cascade
);

alter table private.clock_answer enable row level security;
alter table private.clock_finish enable row level security;
alter table private.guest_clock_answer enable row level security;
alter table private.guest_clock_finish enable row level security;

-- ====================================================================================================================
-- The rules, once. Each takes the facts its caller has read, as answer_rule and open_rule do, so a player's run and a
-- guest's are judged by the same lines. The time is the moment the rule runs, after its caller took the run's lock.
-- ====================================================================================================================

-- An answer: only on a clock day, only while the run is live, only to the open question.
create function private.clock_answer_rule(clock boolean, finished boolean, ends timestamptz, opened int, idx int) returns void
  language plpgsql
  as $$
begin
  if not clock then
    raise exception 'not_a_clock_day' using errcode = 'OB018';
  end if;
  if finished or clock_timestamp() > ends then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if idx <> opened then
    raise exception 'not_open: question % is open', opened using errcode = 'OB006';
  end if;
end
$$;

-- Next: only the question after the open one, of a live run, never past the last. A second tap (idx = opened) passes,
-- and the route's on conflict do nothing takes it.
create function private.clock_open_rule(finished boolean, ends timestamptz, questions int, opened int, idx int) returns void
  language plpgsql
  as $$
begin
  if finished or clock_timestamp() > ends or idx >= questions then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if idx = opened then
    return;
  end if;
  if idx <> opened + 1 then
    raise exception 'out_of_order: expected question %', opened + 1 using errcode = 'OB002';
  end if;
end
$$;

-- Finish: only on the last question of a live run.
create function private.clock_finish_rule(clock boolean, ends timestamptz, questions int, opened int) returns void
  language plpgsql
  as $$
begin
  if not clock then
    raise exception 'not_a_clock_day' using errcode = 'OB018';
  end if;
  if clock_timestamp() > ends then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if opened <> questions - 1 then
    raise exception 'not_last_question: question % is open', opened using errcode = 'OB019';
  end if;
end
$$;

-- An answer's tier from the day: common or uncommon by its levels, rare otherwise.
create function private.clock_tier(p_game text, p_date date, idx int, entry text) returns text
  language sql stable set search_path = ''
  return coalesce((select p.content -> 'questions' -> idx -> 'levels' ->> entry from private.puzzle p
                   where p.game_id = p_game and p.puzzle_date = p_date), 'rare');

-- A run's facts, read under its lock: the run's row is locked first, so a second tab's answer, Next or Finish waits
-- here until this one has committed, and then reads what it wrote (each statement of a trigger sees what is committed).
-- has_run is false when the run isn't there: the answer and Finish triggers refuse the row as its foreign key would
-- (23503), before the columns they fill are missed.
create function private.clock_facts(p_user uuid, p_game text, p_date date)
  returns table (has_run boolean, clock boolean, questions int, opened int, finished boolean, answers int, ends timestamptz)
  language plpgsql set search_path = ''
  as $$
declare
  started timestamptz;
begin
  select r.started_at into started from private.run r
    where r.user_id = p_user and r.game_id = p_game and r.puzzle_date = p_date for update;
  if not found then
    return query select false, false, 0, 0, false, 0, null::timestamptz;
    return;
  end if;
  return query
    select true, p.content ->> 'format' = '4', jsonb_array_length(p.content -> 'questions'),
      (select coalesce(max(o.question_idx), 0)::int from private.question_open o
       where o.user_id = p_user and o.game_id = p_game and o.puzzle_date = p_date),
      exists (select from private.clock_finish f where f.user_id = p_user and f.game_id = p_game and f.puzzle_date = p_date),
      a.n, started + (private.clock_start_ms() + a.ms) * interval '1 millisecond'
    from private.puzzle p
    cross join (select count(*)::int as n, coalesce(sum(c.added_ms), 0) as ms from private.clock_answer c
                where c.user_id = p_user and c.game_id = p_game and c.puzzle_date = p_date) a
    where p.game_id = p_game and p.puzzle_date = p_date;
end
$$;

create function private.guest_clock_facts(p_token_hash text, p_game text, p_date date)
  returns table (has_run boolean, clock boolean, questions int, opened int, finished boolean, answers int, ends timestamptz)
  language plpgsql set search_path = ''
  as $$
declare
  started timestamptz;
begin
  select r.started_at into started from private.guest_run r
    where r.token_hash = p_token_hash and r.game_id = p_game and r.puzzle_date = p_date for update;
  if not found then
    return query select false, false, 0, 0, false, 0, null::timestamptz;
    return;
  end if;
  return query
    select true, p.content ->> 'format' = '4', jsonb_array_length(p.content -> 'questions'),
      (select coalesce(max(o.question_idx), 0)::int from private.guest_question_open o
       where o.token_hash = p_token_hash and o.game_id = p_game and o.puzzle_date = p_date),
      exists (select from private.guest_clock_finish f where f.token_hash = p_token_hash and f.game_id = p_game and f.puzzle_date = p_date),
      a.n, started + (private.clock_start_ms() + a.ms) * interval '1 millisecond'
    from private.puzzle p
    cross join (select count(*)::int as n, coalesce(sum(c.added_ms), 0) as ms from private.guest_clock_answer c
                where c.token_hash = p_token_hash and c.game_id = p_game and c.puzzle_date = p_date) a
    where p.game_id = p_game and p.puzzle_date = p_date;
end
$$;

-- ====================================================================================================================
-- The triggers. Owner's rights and an empty search_path, as count_guest_answer: locking the run's row needs more than
-- plor_app's select and insert, and nobody is granted these functions.
-- ====================================================================================================================

-- An answer. A repeat stores nothing and raises nothing. tier, added_ms and points come from the day and the count
-- of the run's answers, never from the insert.
create function private.check_clock_answer() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
declare
  f record;
begin
  select * into f from private.clock_facts(new.user_id, new.game_id, new.puzzle_date);
  if not f.has_run then
    raise exception 'no_run' using errcode = 'foreign_key_violation';
  end if;
  perform private.clock_answer_rule(f.clock, f.finished, f.ends, f.opened, new.question_idx);
  if exists (select from private.clock_answer a
             where a.user_id = new.user_id and a.game_id = new.game_id and a.puzzle_date = new.puzzle_date
               and a.question_idx = new.question_idx and a.entry_id = new.entry_id) then
    return null;
  end if;
  new.tier := private.clock_tier(new.game_id, new.puzzle_date, new.question_idx, new.entry_id);
  new.added_ms := private.clock_added_ms(new.tier, f.answers);
  new.points := private.clock_points(new.tier);
  new.created_at := clock_timestamp();
  return new;
end
$$;

create function private.check_guest_clock_answer() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
declare
  f record;
begin
  select * into f from private.guest_clock_facts(new.token_hash, new.game_id, new.puzzle_date);
  if not f.has_run then
    raise exception 'no_run' using errcode = 'foreign_key_violation';
  end if;
  perform private.clock_answer_rule(f.clock, f.finished, f.ends, f.opened, new.question_idx);
  if exists (select from private.guest_clock_answer a
             where a.token_hash = new.token_hash and a.game_id = new.game_id and a.puzzle_date = new.puzzle_date
               and a.question_idx = new.question_idx and a.entry_id = new.entry_id) then
    return null;
  end if;
  new.tier := private.clock_tier(new.game_id, new.puzzle_date, new.question_idx, new.entry_id);
  new.added_ms := private.clock_added_ms(new.tier, f.answers);
  new.points := private.clock_points(new.tier);
  new.created_at := clock_timestamp();
  return new;
end
$$;

-- Finish. A second one stores nothing and raises nothing.
create function private.check_clock_finish() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
declare
  f record;
begin
  select * into f from private.clock_facts(new.user_id, new.game_id, new.puzzle_date);
  if not f.has_run then
    raise exception 'no_run' using errcode = 'foreign_key_violation';
  end if;
  if f.finished then
    return null;
  end if;
  perform private.clock_finish_rule(f.clock, f.ends, f.questions, f.opened);
  new.finished_at := clock_timestamp();
  return new;
end
$$;

create function private.check_guest_clock_finish() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
declare
  f record;
begin
  select * into f from private.guest_clock_facts(new.token_hash, new.game_id, new.puzzle_date);
  if not f.has_run then
    raise exception 'no_run' using errcode = 'foreign_key_violation';
  end if;
  if f.finished then
    return null;
  end if;
  perform private.clock_finish_rule(f.clock, f.ends, f.questions, f.opened);
  new.finished_at := clock_timestamp();
  return new;
end
$$;

-- Next on a clock day: a trigger of its own on question_open, beside the one that keeps the other games' rules, which
-- now leaves a clock day to this one.
create function private.check_clock_question_open() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
declare
  f record;
begin
  -- Another game's day, or a format 3 day: nothing to check here, and no lock taken.
  if not exists (select from private.puzzle p
                 where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date and p.content ->> 'format' = '4') then
    return new;
  end if;
  select * into f from private.clock_facts(new.user_id, new.game_id, new.puzzle_date);
  if f.has_run then
    perform private.clock_open_rule(f.finished, f.ends, f.questions, f.opened, new.question_idx);
  end if;
  return new;
end
$$;

create function private.check_guest_clock_question_open() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
declare
  f record;
begin
  -- Another game's day, or a format 3 day: nothing to check here, and no lock taken.
  if not exists (select from private.puzzle p
                 where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date and p.content ->> 'format' = '4') then
    return new;
  end if;
  select * into f from private.guest_clock_facts(new.token_hash, new.game_id, new.puzzle_date);
  if f.has_run then
    perform private.clock_open_rule(f.finished, f.ends, f.questions, f.opened, new.question_idx);
  end if;
  return new;
end
$$;

-- As 20261111120000's, with a clock day left to the trigger above.
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
    perform private.round_open_rule(new.question_idx, questions, opened,
      exists (select from private.round_word w
              where w.user_id = new.user_id and w.game_id = new.game_id and w.puzzle_date = new.puzzle_date and w.round_idx = opened),
      private.question_started_at(new.user_id, new.game_id, new.puzzle_date, opened));
    return new;
  end if;
  if exists (select from private.puzzle p
             where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date and p.content ->> 'format' = '4') then
    return new;
  end if;
  select count(*), coalesce(bool_or(e.matched), false) into answered, died
    from private.run_event e
    where e.user_id = new.user_id and e.game_id = new.game_id and e.puzzle_date = new.puzzle_date;
  select jsonb_array_length(p.content -> 'questions') into questions
    from private.puzzle p
    where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
  perform private.open_rule(answered, died, questions, new.question_idx);
  return new;
end
$$;

create or replace function private.check_guest_question_open() returns trigger
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
      from private.guest_question_open o
      where o.token_hash = new.token_hash and o.game_id = new.game_id and o.puzzle_date = new.puzzle_date;
    select jsonb_array_length(p.content -> 'rounds') into questions
      from private.puzzle p
      where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
    perform private.round_open_rule(new.question_idx, questions, opened,
      exists (select from private.guest_round_word w
              where w.token_hash = new.token_hash and w.game_id = new.game_id and w.puzzle_date = new.puzzle_date and w.round_idx = opened),
      private.guest_question_started_at(new.token_hash, new.game_id, new.puzzle_date, opened));
    return new;
  end if;
  if exists (select from private.puzzle p
             where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date and p.content ->> 'format' = '4') then
    return new;
  end if;
  select count(*), coalesce(bool_or(e.matched), false) into answered, died
    from private.guest_run_event e
    where e.token_hash = new.token_hash and e.game_id = new.game_id and e.puzzle_date = new.puzzle_date;
  select jsonb_array_length(p.content -> 'questions') into questions
    from private.puzzle p
    where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
  perform private.open_rule(answered, died, questions, new.question_idx);
  return new;
end
$$;

create trigger clock_answer_rules
  before insert on private.clock_answer
  for each row execute function private.check_clock_answer();

create trigger clock_finish_rules
  before insert on private.clock_finish
  for each row execute function private.check_clock_finish();

create trigger question_open_clock_rules
  before insert on private.question_open
  for each row execute function private.check_clock_question_open();

create trigger guest_clock_answer_rules
  before insert on private.guest_clock_answer
  for each row execute function private.check_guest_clock_answer();

create trigger guest_clock_finish_rules
  before insert on private.guest_clock_finish
  for each row execute function private.check_guest_clock_finish();

create trigger guest_question_open_clock_rules
  before insert on private.guest_question_open
  for each row execute function private.check_guest_clock_question_open();

-- The live board hears an answer and a Finish as it hears a run_event (Next already sends, from question_open): the
-- same friend_status, the question being played, nothing of an answer or a score.
create trigger clock_answer_broadcast_board after insert on private.clock_answer
  for each row execute function private.broadcast_board();

create trigger clock_finish_broadcast_board after insert on private.clock_finish
  for each row execute function private.broadcast_board();

-- ====================================================================================================================
-- A run's status. As 20261107105151's and 20261111120000's, with a clock day's branch: in progress while the clock is
-- above zero and there is no Finish, with answered the open question and deadline the run's end; then 'survived', the
-- finished state the social gates read, with every question counted. No clock run is 'died' or 'timed_out'.
-- ====================================================================================================================

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
  where r.game_id <> 'substrings' and p.content ->> 'format' is distinct from '4'
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
where r.game_id = 'substrings'
union all
select
  r.user_id,
  r.game_id,
  r.puzzle_date,
  case when d.done then jsonb_array_length(p.content -> 'questions') else c.idx end as answered,
  jsonb_array_length(p.content -> 'questions') as questions,
  case when d.done then 'survived' else 'in_progress' end as status,
  case when not d.done then d.ends end as deadline
from private.run r
join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
cross join lateral (
  select coalesce(max(o.question_idx), 0)::int as idx from private.question_open o
  where o.user_id = r.user_id and o.game_id = r.game_id and o.puzzle_date = r.puzzle_date
) c
cross join lateral (
  select e.ends, (statement_timestamp() > e.ends or exists (
    select from private.clock_finish f
    where f.user_id = r.user_id and f.game_id = r.game_id and f.puzzle_date = r.puzzle_date)) as done
  from (select r.started_at + (private.clock_start_ms() + coalesce((
          select sum(a.added_ms) from private.clock_answer a
          where a.user_id = r.user_id and a.game_id = r.game_id and a.puzzle_date = r.puzzle_date), 0)) * interval '1 millisecond' as ends) e
) d
where r.game_id <> 'substrings' and p.content ->> 'format' = '4';

create or replace view private.guest_run_status with (security_invoker = true) as
select
  s.token_hash,
  s.game_id,
  s.puzzle_date,
  s.answered,
  s.questions,
  case
    when s.died then 'died'
    when s.answered = s.questions then 'survived'
    when statement_timestamp() > private.question_deadline(private.guest_question_started_at(s.token_hash, s.game_id, s.puzzle_date, s.answered)) then 'timed_out'
    else 'in_progress'
  end as status,
  case when not s.died and s.answered < s.questions
    then private.question_deadline(private.guest_question_started_at(s.token_hash, s.game_id, s.puzzle_date, s.answered))
  end as deadline
from (
  select
    r.token_hash,
    r.game_id,
    r.puzzle_date,
    count(e.question_idx)::int as answered,
    jsonb_array_length(p.content -> 'questions') as questions,
    coalesce(bool_or(e.matched), false) as died
  from private.guest_run r
  join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
  left join private.guest_run_event e on e.token_hash = r.token_hash and e.game_id = r.game_id and e.puzzle_date = r.puzzle_date
  where r.game_id <> 'substrings' and p.content ->> 'format' is distinct from '4'
  group by r.token_hash, r.game_id, r.puzzle_date, p.content
) s
union all
select
  r.token_hash,
  r.game_id,
  r.puzzle_date,
  (c.idx + (d.done)::int)::int as answered,
  jsonb_array_length(p.content -> 'rounds') as questions,
  case when c.idx + (d.done)::int = jsonb_array_length(p.content -> 'rounds') then 'survived' else 'in_progress' end as status,
  case when not d.done then d.ends end as deadline
from private.guest_run r
join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
cross join lateral (
  select coalesce(max(o.question_idx), 0)::int as idx from private.guest_question_open o
  where o.token_hash = r.token_hash and o.game_id = r.game_id and o.puzzle_date = r.puzzle_date
) c
cross join lateral (
  select e.ends, (statement_timestamp() > e.ends or exists (
    select from private.guest_round_word w
    where w.token_hash = r.token_hash and w.game_id = r.game_id and w.puzzle_date = r.puzzle_date and w.round_idx = c.idx)) as done
  from (select private.question_deadline(private.guest_question_started_at(r.token_hash, r.game_id, r.puzzle_date, c.idx)) as ends) e
) d
where r.game_id = 'substrings'
union all
select
  r.token_hash,
  r.game_id,
  r.puzzle_date,
  case when d.done then jsonb_array_length(p.content -> 'questions') else c.idx end as answered,
  jsonb_array_length(p.content -> 'questions') as questions,
  case when d.done then 'survived' else 'in_progress' end as status,
  case when not d.done then d.ends end as deadline
from private.guest_run r
join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
cross join lateral (
  select coalesce(max(o.question_idx), 0)::int as idx from private.guest_question_open o
  where o.token_hash = r.token_hash and o.game_id = r.game_id and o.puzzle_date = r.puzzle_date
) c
cross join lateral (
  select e.ends, (statement_timestamp() > e.ends or exists (
    select from private.guest_clock_finish f
    where f.token_hash = r.token_hash and f.game_id = r.game_id and f.puzzle_date = r.puzzle_date)) as done
  from (select r.started_at + (private.clock_start_ms() + coalesce((
          select sum(a.added_ms) from private.guest_clock_answer a
          where a.token_hash = r.token_hash and a.game_id = r.game_id and a.puzzle_date = r.puzzle_date), 0)) * interval '1 millisecond' as ends) e
) d
where r.game_id <> 'substrings' and p.content ->> 'format' = '4';

-- ====================================================================================================================
-- Typed text on a clock day. As 20261030054018's, for a day of either format; a day with no host answers catches none.
-- ====================================================================================================================

create or replace function private.resolve_in(q jsonb, as_of timestamptz, p_texts text[])
  returns table (alias text, thing_id uuid, caught boolean, ancestors uuid[])
  language plpgsql stable set search_path = ''
as $$
declare
  hosts uuid[];
  extras uuid[];
begin
  select coalesce(array_agg(h::uuid), '{}') into hosts from jsonb_array_elements_text(q -> 'host_answers') as h;
  select coalesce(array_agg(e.thing_id), '{}') into extras
  from private.category_extra e
  where e.category = q ->> 'category' and e.added_at <= as_of and (e.removed_at is null or e.removed_at > as_of);
  return query
    select a.alias, a.thing_id, up.ids && hosts, up.ids
    from private.thing_alias a
    cross join lateral (select array_agg(x) as ids from private.ancestors_as_of(a.thing_id, as_of) as x) as up
    where a.alias = any(p_texts) and a.added_at <= as_of and (a.removed_at is null or a.removed_at > as_of)
      and (q -> 'where' ->> 'starts_with' is null or private.alias_starts(a.alias, q -> 'where' ->> 'starts_with'))
      and (a.thing_id = any(extras) or (
        a.thing_id <> (q ->> 'root')::uuid and (q ->> 'root')::uuid = any(up.ids)
        and exists (
          select from private.thing_alias n
          where n.thing_id = a.thing_id and n.kind = 'name' and n.added_at <= as_of and (n.removed_at is null or n.removed_at > as_of))
        and (q ->> 'member_of' is null or exists (
          select from private.fact m
          where m.thing_id = a.thing_id and m.trait = 'member_of' and m.value_thing = (q ->> 'member_of')::uuid
            and m.added_at <= as_of and (m.removed_at is null or m.removed_at > as_of)))
        and private.fits_where(a.thing_id, q -> 'where', as_of)));
end;
$$;

create or replace function private.resolve_answer(p_game text, p_date date, p_index int, p_texts text[])
  returns table (alias text, thing_id uuid, caught boolean, ancestors uuid[])
  language plpgsql stable security definer set search_path = ''
as $$
declare
  q jsonb;
  as_of timestamptz;
begin
  -- answers_as_of alone would hide a missing approved_at (greatest() skips nulls), so it's checked here (13b review).
  select p.content -> 'questions' -> p_index, private.answers_as_of(p.content, p.puzzle_date) into q, as_of
  from private.puzzle p
  where p.game_id = p_game and p.puzzle_date = p_date and p.content ->> 'format' in ('3', '4') and p.content ? 'approved_at';
  if q is null or as_of is null then
    raise exception 'resolve_answer: % % has no approved format-3 or format-4 question %', p_game, p_date, p_index;
  end if;
  return query select * from private.resolve_in(q, as_of, p_texts);
end;
$$;

-- ====================================================================================================================
-- Privileges: plor_app reads and inserts the four tables, as run_event and question_open (no update, no delete), and
-- runs the starting time, which the status views it evaluates read. The rules, the facts and the triggers are granted
-- to nobody. Policies: one per granted command, for plor_app only (DECISIONS.md, Row-level security in `private`).
-- ====================================================================================================================

revoke all on table private.clock_answer, private.clock_finish, private.guest_clock_answer, private.guest_clock_finish
  from public, anon, authenticated, service_role;

grant select, insert on table private.clock_answer, private.clock_finish, private.guest_clock_answer, private.guest_clock_finish
  to plor_app;

create policy clock_answer_plor_app_select on private.clock_answer for select to plor_app using (true);
create policy clock_answer_plor_app_insert on private.clock_answer for insert to plor_app with check (true);
create policy clock_finish_plor_app_select on private.clock_finish for select to plor_app using (true);
create policy clock_finish_plor_app_insert on private.clock_finish for insert to plor_app with check (true);
create policy guest_clock_answer_plor_app_select on private.guest_clock_answer for select to plor_app using (true);
create policy guest_clock_answer_plor_app_insert on private.guest_clock_answer for insert to plor_app with check (true);
create policy guest_clock_finish_plor_app_select on private.guest_clock_finish for select to plor_app using (true);
create policy guest_clock_finish_plor_app_insert on private.guest_clock_finish for insert to plor_app with check (true);

revoke all on function private.clock_start_ms(), private.clock_added_ms(text, int), private.clock_points(text),
  private.clock_answer_rule(boolean, boolean, timestamptz, int, int), private.clock_open_rule(boolean, timestamptz, int, int, int),
  private.clock_finish_rule(boolean, timestamptz, int, int), private.clock_tier(text, date, int, text),
  private.clock_facts(uuid, text, date), private.guest_clock_facts(text, text, date),
  private.check_clock_answer(), private.check_guest_clock_answer(), private.check_clock_finish(), private.check_guest_clock_finish(),
  private.check_clock_question_open(), private.check_guest_clock_question_open()
  from public, anon, authenticated, service_role;

grant execute on function private.clock_start_ms() to plor_app;
