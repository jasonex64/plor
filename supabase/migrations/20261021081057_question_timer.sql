-- M13 13c-2: 20 seconds per question (human, 2026-10-21; docs/milestones/M13-game-mechanics.md, "Rules to build",
-- rule 3). A question starts when the run starts (Start) or when the previous answer is stored; when its time runs
-- out the run ends (G10). The database decides: the answer trigger refuses a late answer with OB005 time_up, and the
-- status view shows such a run as 'timed_out' with no write needed. Nothing new is stored: the start of the current
-- question is the last answer's created_at, or the run's started_at.
--
-- The timer replaces the day boundary as what ends an unfinished run. A run started before midnight Pacific can be
-- played to its end after midnight (human, 2026-10-21: "they get to play the puzzle but their score doesn't
-- contribute to leaderboard"; leaderboards are M08). So the trigger no longer raises OB001 day_over, and the view has
-- no 'abandoned' state: every run ends died, survived or timed_out within 20 seconds of its last activity.
-- Expected failures are now OB002 out_of_order, OB003 run_over, OB004 puzzle_started and OB005 time_up.

-- The one place the 20 seconds lives.
create function private.question_deadline(question_started_at timestamptz) returns timestamptz
  language sql immutable
  return question_started_at + interval '20 seconds';

create or replace function private.check_run_event() returns trigger
  language plpgsql
  as $$
declare
  answered int;
  died boolean;
  questions int;
  last_answer_at timestamptz;
  run_started_at timestamptz;
begin
  select count(*), coalesce(bool_or(e.matched), false), max(e.created_at) into answered, died, last_answer_at
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
  -- Statement time, like today() (M02 2f, B21): the answer's own moment, not its transaction's start.
  select r.started_at into run_started_at
    from private.run r
    where r.user_id = new.user_id and r.game_id = new.game_id and r.puzzle_date = new.puzzle_date;
  if statement_timestamp() > private.question_deadline(coalesce(last_answer_at, run_started_at)) then
    raise exception 'time_up' using errcode = 'OB005';
  end if;
  return new;
end
$$;

-- The run states, now four again: died, survived, timed_out, in_progress. deadline is the current question's, for
-- the client's countdown. A view's columns can't be renamed or dropped by create or replace, and status keeps its
-- name and type, so this keeps the view's grants; the new column goes last.
create or replace view private.run_status with (security_invoker = true) as
select
  r.user_id,
  r.game_id,
  r.puzzle_date,
  count(e.question_idx)::int as answered,
  jsonb_array_length(p.content -> 'questions') as questions,
  case
    when coalesce(bool_or(e.matched), false) then 'died'
    when count(e.question_idx) = jsonb_array_length(p.content -> 'questions') then 'survived'
    when statement_timestamp() > private.question_deadline(coalesce(max(e.created_at), r.started_at)) then 'timed_out'
    else 'in_progress'
  end as status,
  private.question_deadline(coalesce(max(e.created_at), r.started_at)) as deadline
from private.run r
join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
left join private.run_event e on e.user_id = r.user_id and e.game_id = r.game_id and e.puzzle_date = r.puzzle_date
group by r.user_id, r.game_id, r.puzzle_date, r.started_at, p.content;

-- plor_app evaluates the view and the trigger, so it runs the function, like today() (approved by the human,
-- 2026-10-21; DECISIONS.md Log).
revoke all on function private.question_deadline(timestamptz) from public, anon, authenticated, service_role;
grant execute on function private.question_deadline(timestamptz) to plor_app;
