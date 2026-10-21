-- M13 13c-4: reveal, then "Next" (G5, human, 2026-10-21; docs/milestones/M13-game-mechanics.md, "Rules to build",
-- rule 5). After an answer the player sees the reveal; the next question and its 20 seconds start only when they tap
-- Next. Question 1 still starts with the run (Start, run.started_at). Questions 2 to 7 start at a row here, so the
-- timer migration's "the previous answer starts the next question" is replaced. A run waiting on the reveal has no
-- deadline and stays in progress.
-- New failure: OB006 not_open, an answer to a question that hasn't been opened with Next.

-- One row per question opened with Next, append-only like run_event (M00 data design §7).
create table private.question_open (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx > 0),
  opened_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date, question_idx),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade
);

-- When a question started: Start for the first, Next for the rest; null while the reveal waits for Next.
create function private.question_started_at(run_user uuid, run_game text, run_date date, idx int) returns timestamptz
  language sql stable
  return case
    when idx = 0 then (select r.started_at from private.run r
                       where r.user_id = run_user and r.game_id = run_game and r.puzzle_date = run_date)
    else (select o.opened_at from private.question_open o
          where o.user_id = run_user and o.game_id = run_game and o.puzzle_date = run_date and o.question_idx = idx)
  end;

-- Next opens only the question after the last answer, of a run still going: not after a catch, the last question,
-- or one already open (the primary key).
create function private.check_question_open() returns trigger
  language plpgsql
  as $$
declare
  answered int;
  died boolean;
  questions int;
begin
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

create trigger question_open_rules
  before insert on private.question_open
  for each row execute function private.check_question_open();

-- The answer trigger: as the timer migration's, but the question's 20 seconds run from when it was opened, and an
-- answer to a question not yet opened is refused.
create or replace function private.check_run_event() returns trigger
  language plpgsql
  as $$
declare
  answered int;
  died boolean;
  questions int;
  started timestamptz;
begin
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
  started := private.question_started_at(new.user_id, new.game_id, new.puzzle_date, new.question_idx);
  if started is null then
    raise exception 'not_open: question % has not been opened', new.question_idx using errcode = 'OB006';
  end if;
  -- Statement time, like today() (M02 2f, B21): the answer's own moment, not its transaction's start.
  if statement_timestamp() > private.question_deadline(started) then
    raise exception 'time_up' using errcode = 'OB005';
  end if;
  return new;
end
$$;

-- deadline is null while the reveal waits for Next, so such a run is in progress with no clock. The columns are the
-- timer migration's, in the same order, so create or replace keeps the view's grants.
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
  group by r.user_id, r.game_id, r.puzzle_date, p.content
) s;

-- The next reset, for the countdown (ROADMAP item from the M00 review): midnight America/Los_Angeles after today(),
-- following DST. It sits next to day_of, the only other place the time zone is named.
create function private.next_reset() returns timestamptz
  language sql stable
  return (private.today() + 1)::timestamp at time zone 'America/Los_Angeles';

-- Backstop and grants, as for the other game tables (first game-tables migration). Security change: plor_app reads
-- and inserts question_open (append-only) and runs the two functions; waiting for the human's approval.
alter table private.question_open enable row level security;
revoke all on table private.question_open from public, anon, authenticated, service_role;
revoke all on function private.question_started_at(uuid, text, date, int), private.check_question_open(), private.next_reset()
  from public, anon, authenticated, service_role;
grant select, insert on table private.question_open to plor_app;
grant execute on function private.question_started_at(uuid, text, date, int), private.next_reset() to plor_app;
create policy question_open_plor_app_select on private.question_open for select to plor_app using (true);
create policy question_open_plor_app_insert on private.question_open for insert to plor_app with check (true);
