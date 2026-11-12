-- M18 18b, guest play's data (docs/milestones/M18-guest-play.md, Design and "Security changes proposed"; DECISIONS.md,
-- Current, "Guest play"). Security change, approved by the human with the ticket (2026-11-11: "Approve M18"; "Yes, all
-- three"). A guest is a keyless run held by the hash of a random token, never an auth.users row; what is kept of a guest
-- is a tally of answers with no one attached. Nothing here changes what a signed-in player can do or see: the player
-- triggers and game 2's judge keep every outcome, and now ask one shared function each for their rule.

-- ====================================================================================================================
-- The rules, once. Each takes the facts its caller has read from its own tables (a player's rows are keyed by user_id, a
-- guest's by the token's hash), so the order, the clock and the "over" rule are written here only. plor_app runs the
-- three the invoker triggers call, as it runs question_deadline; the judge's and the examples' cores run inside the
-- security definer functions and are not granted.
-- ====================================================================================================================

-- A game 1 answer (baseline check_run_event, unchanged in order and codes): nothing after a catch or the last question
-- (OB003), the next index only (OB002), only to a question opened with Start or Next (OB006), and inside its 20 seconds
-- (OB005, on statement time, M02 2f B21). started is when the question was opened, or null.
create function private.answer_rule(answered int, died boolean, questions int, idx int, started timestamptz) returns void
  language plpgsql
  as $$
begin
  if died or answered >= questions then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if idx <> answered then
    raise exception 'out_of_order: expected question %', answered using errcode = 'OB002';
  end if;
  if started is null then
    raise exception 'not_open: question % has not been opened', idx using errcode = 'OB006';
  end if;
  if statement_timestamp() > private.question_deadline(started) then
    raise exception 'time_up' using errcode = 'OB005';
  end if;
end
$$;

-- Next, game 1 (baseline check_question_open): only the question after the last answer, of a run still going.
create function private.open_rule(answered int, died boolean, questions int, idx int) returns void
  language plpgsql
  as $$
begin
  if died or answered >= questions then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if idx <> answered then
    raise exception 'out_of_order: expected question %', answered using errcode = 'OB002';
  end if;
end
$$;

-- Next, game 2 (20261107105151's check_question_open): round k+1 opens only once round k has a word or its 20 seconds
-- have passed, and never past the last round. opened is the last round opened; has_word and started are that round's.
-- A second tap on Next (idx = opened) passes, and the route's on conflict do nothing takes it.
create function private.round_open_rule(idx int, questions int, opened int, has_word boolean, started timestamptz) returns void
  language plpgsql
  as $$
begin
  if idx >= questions then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if idx = opened then
    return;
  end if;
  if idx <> opened + 1 then
    raise exception 'out_of_order: expected round %', opened + 1 using errcode = 'OB002';
  end if;
  if not has_word and statement_timestamp() <= private.question_deadline(started) then
    raise exception 'round_running: round % has its clock going', opened using errcode = 'OB014';
  end if;
end
$$;

revoke all on function private.answer_rule(int, boolean, int, int, timestamptz), private.open_rule(int, boolean, int, int),
  private.round_open_rule(int, int, int, boolean, timestamptz) from public, anon, authenticated, service_role;
grant execute on function private.answer_rule(int, boolean, int, int, timestamptz), private.open_rule(int, boolean, int, int),
  private.round_open_rule(int, int, int, boolean, timestamptz) to plor_app;

-- The player triggers, reading their facts and asking the shared rule. Same outcomes as before.
create or replace function private.check_run_event() returns trigger
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
  perform private.answer_rule(answered, died, questions, new.question_idx,
    private.question_started_at(new.user_id, new.game_id, new.puzzle_date, new.question_idx));
  return new;
end
$$;

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

-- Game 2's judge (20261107105151): every outcome decided here from facts the caller has read, so a player's words and a
-- guest's are judged by one rule. Order as before: empty, a stored word, time_up, locked, then the refusals. write says
-- the caller stores something: the accepted word, or a rejection (the time, never the word). The 0.5 second lockout is
-- the human's (2026-11-06, M16 16b, answer 9); the number lives here alone. p_stored_key is null for a round with no word.
create function private.judge_core(p_key text, p_clean text, p_plain text, p_letters text, p_stored_key text, p_stored_word text,
  p_started timestamptz, p_last_reject timestamptz, p_key_used boolean) returns table (outcome text, word text, write boolean)
  language plpgsql
as $$
declare
  reason text;
begin
  if p_key = '' then
    return query select 'empty'::text, null::text, false;
    return;
  end if;
  if p_stored_key is not null then
    if p_stored_key = p_key then
      return query select 'accepted'::text, p_stored_word, false;
    else
      return query select 'already_answered'::text, null::text, false;
    end if;
    return;
  end if;
  -- Statement time, as the answer trigger's: the try's own moment.
  if statement_timestamp() > private.question_deadline(p_started) then
    return query select 'time_up'::text, null::text, false;
    return;
  end if;
  if statement_timestamp() < p_last_reject + interval '0.5 seconds' then
    return query select 'locked'::text, null::text, false;
    return;
  end if;
  if not exists (select from private.dictionary_word w where w.word_key = p_key) then
    reason := 'not_a_word';
  elsif position(p_letters in p_key) = 0 then
    reason := 'needs_letters';
  elsif p_key_used then
    reason := 'already_used';
  end if;
  if reason is not null then
    return query select reason, null::text, true;
    return;
  end if;
  return query select 'accepted'::text, private.shown_spelling(p_key, p_clean, p_plain), true;
end;
$$;

-- For each round a finished run missed, 3 everyday words that would have fit, shortest first (16d, answer 5). p_done
-- holds the rounds that have a word.
create function private.round_examples_core(p_date date, p_done int[]) returns table (round_idx int, words text[])
  language sql stable
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
    and not ((r.n - 1)::int = any(p_done));
$$;

revoke all on function private.judge_core(text, text, text, text, text, text, timestamptz, timestamptz, boolean),
  private.round_examples_core(date, int[]) from public, anon, authenticated, service_role;

create or replace function private.judge_word(p_user uuid, p_date date, p_key text, p_clean text, p_plain text) returns jsonb
  language plpgsql security definer set search_path = ''
as $$
declare
  idx int;
  stored private.round_word;
  last_reject timestamptz;
  letters text;
  j record;
begin
  perform from private.run r where r.user_id = p_user and r.game_id = 'substrings' and r.puzzle_date = p_date for update;
  if not found then
    return jsonb_build_object('outcome', 'no_run');
  end if;
  select coalesce(max(o.question_idx), 0)::int into idx from private.question_open o
    where o.user_id = p_user and o.game_id = 'substrings' and o.puzzle_date = p_date;
  select * into stored from private.round_word w
    where w.user_id = p_user and w.game_id = 'substrings' and w.puzzle_date = p_date and w.round_idx = idx;
  select max(x.rejected_at) into last_reject from private.round_reject x
    where x.user_id = p_user and x.game_id = 'substrings' and x.puzzle_date = p_date and x.round_idx = idx;
  select p.content -> 'rounds' ->> idx into letters from private.puzzle p
    where p.game_id = 'substrings' and p.puzzle_date = p_date;
  select * into j from private.judge_core(p_key, p_clean, p_plain, letters, stored.word_key, stored.word,
    private.question_started_at(p_user, 'substrings', p_date, idx), last_reject,
    exists (select from private.round_word w
            where w.user_id = p_user and w.game_id = 'substrings' and w.puzzle_date = p_date and w.word_key = p_key));
  if j.write and j.outcome = 'accepted' then
    insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word)
    values (p_user, 'substrings', p_date, idx, p_key, j.word);
  elsif j.write then
    insert into private.round_reject (user_id, game_id, puzzle_date, round_idx, rejected_at)
    values (p_user, 'substrings', p_date, idx, statement_timestamp());
  end if;
  if j.word is null then
    return jsonb_build_object('outcome', j.outcome);
  end if;
  return jsonb_build_object('outcome', j.outcome, 'word', j.word);
end;
$$;

create or replace function private.round_examples(p_user uuid, p_date date) returns table (round_idx int, words text[])
  language sql stable security definer set search_path = ''
as $$
  select c.round_idx, c.words
  from private.round_examples_core(p_date, array(
    select w.round_idx::int from private.round_word w
    where w.user_id = p_user and w.game_id = 'substrings' and w.puzzle_date = p_date)) c
  where exists (select from private.run_status s
                where s.user_id = p_user and s.game_id = 'substrings' and s.puzzle_date = p_date and s.status = 'survived');
$$;

-- ====================================================================================================================
-- The guest tables. Shaped as the player tables, with the hash of the guest's token where user_id is. No foreign key to
-- auth.users, no board broadcast, no ledger. One run per token and game (the unique key; a guest's run is deleted when it
-- ends, so a replay starts a new one).
-- ====================================================================================================================

create table private.guest_run (
  token_hash text not null,
  game_id text not null,
  puzzle_date date not null,
  started_at timestamptz not null default now(),
  primary key (token_hash, game_id, puzzle_date),
  unique (token_hash, game_id),
  -- The shape auth_attempt checks for a hashed key (src/lib/auth-limits.ts, hashKey: SHA-256, hex).
  constraint guest_run_token_hashed check (token_hash ~ '^[0-9a-f]{64}$'),
  foreign key (game_id, puzzle_date) references private.puzzle (game_id, puzzle_date)
);

create table private.guest_run_event (
  token_hash text not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx >= 0),
  entry_id text not null,
  matched boolean not null,
  created_at timestamptz not null default now(),
  primary key (token_hash, game_id, puzzle_date, question_idx),
  foreign key (token_hash, game_id, puzzle_date) references private.guest_run (token_hash, game_id, puzzle_date) on delete cascade
);

create table private.guest_question_open (
  token_hash text not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx > 0),
  opened_at timestamptz not null default now(),
  primary key (token_hash, game_id, puzzle_date, question_idx),
  foreign key (token_hash, game_id, puzzle_date) references private.guest_run (token_hash, game_id, puzzle_date) on delete cascade
);

-- Game 2's, as round_word and round_reject. They go only while the run's rows do (game 2 keeps no rarity count).
create table private.guest_round_word (
  token_hash text not null,
  game_id text not null,
  puzzle_date date not null,
  round_idx smallint not null check (round_idx >= 0),
  word_key text not null,
  word text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (token_hash, game_id, puzzle_date, round_idx),
  unique (token_hash, game_id, puzzle_date, word_key),
  foreign key (token_hash, game_id, puzzle_date) references private.guest_run (token_hash, game_id, puzzle_date) on delete cascade
);

create table private.guest_round_reject (
  token_hash text not null,
  game_id text not null,
  puzzle_date date not null,
  round_idx smallint not null check (round_idx >= 0),
  rejected_at timestamptz not null default statement_timestamp(),
  primary key (token_hash, game_id, puzzle_date, round_idx, rejected_at),
  foreign key (token_hash, game_id, puzzle_date) references private.guest_run (token_hash, game_id, puzzle_date) on delete cascade
);

-- What is kept of a guest's answers: a count per answer, and nothing that names a run, a token, a time or an order of
-- answers. matched is the flag the answer was judged with (Insights count catches; it says nothing about a person).
create table private.guest_tally (
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx >= 0),
  entry_id text not null,
  matched boolean not null,
  n integer not null check (n > 0),
  primary key (game_id, puzzle_date, question_idx, entry_id, matched)
);

alter table private.guest_run enable row level security;
alter table private.guest_run_event enable row level security;
alter table private.guest_question_open enable row level security;
alter table private.guest_round_word enable row level security;
alter table private.guest_round_reject enable row level security;
alter table private.guest_tally enable row level security;

-- When a question started: Start for the first, Next for the rest; null while the reveal waits for Next.
create function private.guest_question_started_at(p_token_hash text, p_game text, p_date date, idx int) returns timestamptz
  language sql stable
  return case
    when idx = 0 then (select r.started_at from private.guest_run r
                       where r.token_hash = p_token_hash and r.game_id = p_game and r.puzzle_date = p_date)
    else (select o.opened_at from private.guest_question_open o
          where o.token_hash = p_token_hash and o.game_id = p_game and o.puzzle_date = p_date and o.question_idx = idx)
  end;

-- The guest triggers, reading their facts and asking the same shared rules as the player ones.
create function private.check_guest_run_event() returns trigger
  language plpgsql
  as $$
declare
  answered int;
  died boolean;
  questions int;
begin
  select count(*), coalesce(bool_or(e.matched), false) into answered, died
    from private.guest_run_event e
    where e.token_hash = new.token_hash and e.game_id = new.game_id and e.puzzle_date = new.puzzle_date;
  select jsonb_array_length(p.content -> 'questions') into questions
    from private.puzzle p
    where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
  perform private.answer_rule(answered, died, questions, new.question_idx,
    private.guest_question_started_at(new.token_hash, new.game_id, new.puzzle_date, new.question_idx));
  return new;
end
$$;

create function private.check_guest_question_open() returns trigger
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

-- The only writer of guest_tally: it adds the answer in the same statement as the event row, so a retry the event's
-- primary key refuses (or an insert that does nothing on conflict) counts once. Owner's rights and an empty search_path,
-- as take_auth_attempt: plor_app holds no write on the tally. It counts only while the answer's day is open, the players'
-- test (`private.day_of(created_at) = puzzle_date`, src/game/ledger.ts), made here because the tally keeps no time:
-- now() is the transaction's start, as the event's created_at default.
create function private.count_guest_answer() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if private.day_of(now()) = new.puzzle_date then
    insert into private.guest_tally (game_id, puzzle_date, question_idx, entry_id, matched, n)
    values (new.game_id, new.puzzle_date, new.question_idx, new.entry_id, new.matched, 1)
    on conflict (game_id, puzzle_date, question_idx, entry_id, matched)
    do update set n = private.guest_tally.n + 1;
  end if;
  return null;
end
$$;

create trigger guest_run_event_rules
  before insert on private.guest_run_event
  for each row execute function private.check_guest_run_event();

create trigger guest_run_event_tally
  after insert on private.guest_run_event
  for each row execute function private.count_guest_answer();

create trigger guest_question_open_rules
  before insert on private.guest_question_open
  for each row execute function private.check_guest_question_open();

-- As run_status (20261107105151's), over the guest tables.
create view private.guest_run_status with (security_invoker = true) as
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
  where r.game_id <> 'substrings'
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
where r.game_id = 'substrings';

-- ====================================================================================================================
-- Game 2 for a guest, and ending a guest's run. All security definer with an empty search_path, execute to plor_app
-- alone, as judge_word and round_examples.
-- ====================================================================================================================

create function private.guest_judge_word(p_token_hash text, p_date date, p_key text, p_clean text, p_plain text) returns jsonb
  language plpgsql security definer set search_path = ''
as $$
declare
  idx int;
  stored private.guest_round_word;
  last_reject timestamptz;
  letters text;
  j record;
begin
  perform from private.guest_run g where g.token_hash = p_token_hash and g.game_id = 'substrings' and g.puzzle_date = p_date for update;
  if not found then
    return jsonb_build_object('outcome', 'no_run');
  end if;
  select coalesce(max(o.question_idx), 0)::int into idx from private.guest_question_open o
    where o.token_hash = p_token_hash and o.game_id = 'substrings' and o.puzzle_date = p_date;
  select * into stored from private.guest_round_word w
    where w.token_hash = p_token_hash and w.game_id = 'substrings' and w.puzzle_date = p_date and w.round_idx = idx;
  select max(x.rejected_at) into last_reject from private.guest_round_reject x
    where x.token_hash = p_token_hash and x.game_id = 'substrings' and x.puzzle_date = p_date and x.round_idx = idx;
  select p.content -> 'rounds' ->> idx into letters from private.puzzle p
    where p.game_id = 'substrings' and p.puzzle_date = p_date;
  select * into j from private.judge_core(p_key, p_clean, p_plain, letters, stored.word_key, stored.word,
    private.guest_question_started_at(p_token_hash, 'substrings', p_date, idx), last_reject,
    exists (select from private.guest_round_word w
            where w.token_hash = p_token_hash and w.game_id = 'substrings' and w.puzzle_date = p_date and w.word_key = p_key));
  if j.write and j.outcome = 'accepted' then
    insert into private.guest_round_word (token_hash, game_id, puzzle_date, round_idx, word_key, word)
    values (p_token_hash, 'substrings', p_date, idx, p_key, j.word);
  elsif j.write then
    insert into private.guest_round_reject (token_hash, game_id, puzzle_date, round_idx, rejected_at)
    values (p_token_hash, 'substrings', p_date, idx, statement_timestamp());
  end if;
  if j.word is null then
    return jsonb_build_object('outcome', j.outcome);
  end if;
  return jsonb_build_object('outcome', j.outcome, 'word', j.word);
end;
$$;

create function private.guest_round_examples(p_token_hash text, p_date date) returns table (round_idx int, words text[])
  language sql stable security definer set search_path = ''
as $$
  select c.round_idx, c.words
  from private.round_examples_core(p_date, array(
    select w.round_idx::int from private.guest_round_word w
    where w.token_hash = p_token_hash and w.game_id = 'substrings' and w.puzzle_date = p_date)) c
  where exists (select from private.guest_run_status s
                where s.token_hash = p_token_hash and s.game_id = 'substrings' and s.puzzle_date = p_date and s.status = 'survived');
$$;

-- Ends one guest run: deletes its guest_run row, and its events, opens and round rows go by cascade, with the owner's
-- rights, so plor_app holds no delete on any guest table. It takes the game as well as the hash, because a token may
-- hold a run in each game. It refuses a run still in progress (OB015): plor_app can read every hash, and this keeps it
-- from ending a guest's run that isn't over (M18 ticket, Source diff). A run that is not there is already ended.
create function private.end_guest_run(p_token_hash text, p_game_id text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  state text;
begin
  select s.status into state from private.guest_run_status s where s.token_hash = p_token_hash and s.game_id = p_game_id;
  if state = 'in_progress' then
    raise exception 'run_not_over: a guest run that is still going cannot be ended' using errcode = 'OB015';
  end if;
  delete from private.guest_run g where g.token_hash = p_token_hash and g.game_id = p_game_id;
end;
$$;

-- Deletes every guest run of a day that has closed (midnight Pacific, private.today()): nothing is scheduled in this app,
-- and a run left at a reveal never ends by itself (docs/milestones/M18-guest-play.md, "When a guest run ends").
create function private.purge_guest_days() returns void
  language sql security definer set search_path = ''
as $$
  delete from private.guest_run g where g.puzzle_date < private.today();
$$;

-- ====================================================================================================================
-- Privileges: no wider than the player ones (baseline: select and insert on run, run_event, question_open, select on
-- run_status; 20261107105151: select on round_word, nothing on round_reject). No delete on any guest table, no write on
-- guest_tally, no insert on guest_round_word, nothing on guest_round_reject. Policies: one per granted command, for
-- plor_app only (DECISIONS.md, Row-level security in `private`).
-- ====================================================================================================================

revoke all on table private.guest_run, private.guest_run_event, private.guest_question_open, private.guest_round_word,
  private.guest_round_reject, private.guest_tally, private.guest_run_status from public, anon, authenticated, service_role;

grant select, insert on table private.guest_run, private.guest_run_event, private.guest_question_open to plor_app;
grant select on table private.guest_round_word, private.guest_tally, private.guest_run_status to plor_app;

create policy guest_run_plor_app_select on private.guest_run for select to plor_app using (true);
create policy guest_run_plor_app_insert on private.guest_run for insert to plor_app with check (true);
create policy guest_run_event_plor_app_select on private.guest_run_event for select to plor_app using (true);
create policy guest_run_event_plor_app_insert on private.guest_run_event for insert to plor_app with check (true);
create policy guest_question_open_plor_app_select on private.guest_question_open for select to plor_app using (true);
create policy guest_question_open_plor_app_insert on private.guest_question_open for insert to plor_app with check (true);
create policy guest_round_word_plor_app_select on private.guest_round_word for select to plor_app using (true);
create policy guest_tally_plor_app_select on private.guest_tally for select to plor_app using (true);

-- plor_app evaluates the status view and the invoker triggers, so it runs the lookup, as it runs question_started_at.
revoke all on function private.guest_question_started_at(text, text, date, int), private.check_guest_run_event(),
  private.check_guest_question_open(), private.count_guest_answer(), private.guest_judge_word(text, date, text, text, text),
  private.guest_round_examples(text, date), private.end_guest_run(text, text), private.purge_guest_days()
  from public, anon, authenticated, service_role;
grant execute on function private.guest_question_started_at(text, text, date, int),
  private.guest_judge_word(text, date, text, text, text), private.guest_round_examples(text, date),
  private.end_guest_run(text, text), private.purge_guest_days() to plor_app;
