-- Offbeat's game tables: the day boundary, published puzzles, runs, answers and logged misses
-- (docs/milestones/M00-data-design.md §4, §5, §7, §8; docs/milestones/M02-sign-in-and-play.md).
-- Expected failures raise their own SQLSTATE, which src/game/errors.ts maps to API errors:
--   OB001 day_over, OB002 out_of_order, OB003 run_over, OB004 puzzle_started.

-- §8: one global day that resets at midnight America/Los_Angeles, following DST (human, 2026-10-17).
-- day_of is the whole rule for any instant, so tests can ask about chosen instants; today() is the only
-- definition of "today" and every caller (run start, the answer trigger, the status view, publishing) uses it.
create function private.day_of(at_instant timestamptz) returns date
  language sql stable
  return (at_instant at time zone 'America/Los_Angeles')::date;

create function private.today() returns date
  language sql stable
  return private.day_of(now());

-- §4: one row per published day. The content is a validated format-1 file (src/content/puzzle.ts); the
-- format number lives inside it, and nothing reads a hash or publish time, so neither is stored (M02 Removes).
create table private.puzzle (
  game_id text not null,
  puzzle_date date not null,
  content jsonb not null,
  primary key (game_id, puzzle_date),
  -- The file's own game and date must be its key, as its path must be (DECISIONS.md: Puzzle content format).
  constraint puzzle_content_matches_key check (content ->> 'game_id' = game_id and content ->> 'date' = puzzle_date::text)
);

-- §4: a puzzle can't change once its day has started, whoever writes it.
create function private.refuse_started_puzzle_change() returns trigger
  language plpgsql
  as $$
begin
  if old.puzzle_date <= private.today() then
    raise exception 'puzzle_started: % % has started and cannot change', old.game_id, old.puzzle_date
      using errcode = 'OB004';
  end if;
  return new;
end
$$;

create trigger puzzle_frozen_once_started
  before update on private.puzzle
  for each row execute function private.refuse_started_puzzle_change();

-- §5: one run per player per day, its date pinned when it starts (the start route inserts private.today()).
-- The foreign key to puzzle means no run exists for an unpublished day (ROADMAP item from M00 review).
create table private.run (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null,
  puzzle_date date not null,
  started_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date),
  foreign key (game_id, puzzle_date) references private.puzzle (game_id, puzzle_date)
);

-- §5: one row per answered question, append-only (§7).
create table private.run_event (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx >= 0),
  entry_id text not null,
  matched boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date, question_idx),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade
);

-- §5: the day ends the run, checked at insert time inside the answer's transaction, so no answer slips in
-- after midnight between a check and the write. Order: the next index only, and nothing after a match or
-- after the last question. Two inserts for the same index meet at the primary key.
create function private.check_run_event() returns trigger
  language plpgsql
  as $$
declare
  answered int;
  died boolean;
  questions int;
begin
  if new.puzzle_date <> private.today() then
    raise exception 'day_over' using errcode = 'OB001';
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

create trigger run_event_rules
  before insert on private.run_event
  for each row execute function private.check_run_event();

-- §5: the four run states. security_invoker, so a reader needs its own grants and policies on the tables
-- (a view otherwise runs as its owner and skips RLS: M00 data design, "Principles used throughout").
create view private.run_status with (security_invoker = true) as
select
  r.user_id,
  r.game_id,
  r.puzzle_date,
  count(e.question_idx)::int as answered,
  jsonb_array_length(p.content -> 'questions') as questions,
  case
    when coalesce(bool_or(e.matched), false) then 'died'
    when count(e.question_idx) = jsonb_array_length(p.content -> 'questions') then 'survived'
    when r.puzzle_date < private.today() then 'abandoned'
    else 'in_progress'
  end as status
from private.run r
join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
left join private.run_event e on e.user_id = r.user_id and e.game_id = r.game_id and e.puzzle_date = r.puzzle_date
group by r.user_id, r.game_id, r.puzzle_date, p.content;

-- Typed text that matched no entry, kept for a human to review and add (human, 2026-10-18). It costs the
-- player nothing and belongs to the run it was typed in.
create table private.missed_answer (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx >= 0),
  typed text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  -- At most 40 characters; longer input is rejected and not logged (human, 2026-10-18; M02 ticket, Numbers).
  constraint missed_answer_typed_length check (char_length(typed) between 1 and 40 and typed = btrim(typed))
);

-- Backstop (M00 data design): RLS on, nothing for the Data API roles. §7 also takes everything from service_role.
alter table private.puzzle enable row level security;
alter table private.run enable row level security;
alter table private.run_event enable row level security;
alter table private.missed_answer enable row level security;
revoke all on table private.puzzle, private.run, private.run_event, private.run_status, private.missed_answer
  from public, anon, authenticated, service_role;
revoke all on sequence private.missed_answer_id_seq from public, anon, authenticated, service_role;
revoke all on function private.day_of(timestamptz), private.today(), private.refuse_started_puzzle_change(),
  private.check_run_event() from public, anon, authenticated, service_role;

-- plor_app: read puzzles, start runs, record answers (append-only: SELECT and INSERT only, §7), read the
-- status view, and log misses. The trigger and the view call today() as plor_app.
grant execute on function private.day_of(timestamptz), private.today() to plor_app;
grant select on table private.puzzle to plor_app;
grant select, insert on table private.run, private.run_event to plor_app;
grant select on table private.run_status to plor_app;
grant insert on table private.missed_answer to plor_app;

create policy puzzle_plor_app_select on private.puzzle for select to plor_app using (true);
create policy run_plor_app_select on private.run for select to plor_app using (true);
create policy run_plor_app_insert on private.run for insert to plor_app with check (true);
create policy run_event_plor_app_select on private.run_event for select to plor_app using (true);
create policy run_event_plor_app_insert on private.run_event for insert to plor_app with check (true);
create policy missed_answer_plor_app_insert on private.missed_answer for insert to plor_app with check (true);

-- plor_publisher (DECISIONS.md: Content publishing role): `npm run content:publish` only. It upserts puzzles;
-- the trigger above refuses any change to a started day.
grant usage on schema private to plor_publisher;
grant execute on function private.day_of(timestamptz), private.today() to plor_publisher;
grant select, insert, update on table private.puzzle to plor_publisher;

create policy puzzle_plor_publisher_select on private.puzzle for select to plor_publisher using (true);
create policy puzzle_plor_publisher_insert on private.puzzle for insert to plor_publisher with check (true);
create policy puzzle_plor_publisher_update on private.puzzle for update to plor_publisher using (true) with check (true);
