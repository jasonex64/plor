-- M06 puzzle entry (docs/milestones/M06-puzzle-entry.md). An admin saves a day's questions and approves a drafted
-- day on the admin page; plor_app reaches the two tables only through two guarded functions, never by writing them
-- (human, 2026-10-21: "yes thats fine and admincan write changes thats fine"; security change). The admin page is the
-- one way puzzles get in, so plor_publisher and `npm run content:publish` go (DECISIONS.md: Puzzle approval).
-- New SQLSTATEs: OB007 admins_only, OB008 day_past. OB004 puzzle_started is reused for a day that has started.

-- The questions an admin typed for a day, waiting for a Claude session to draft the answers. Kept after the day is
-- approved; the approved puzzle holds its own copy of the prompts.
create table private.puzzle_questions (
  game_id text not null,
  puzzle_date date not null,
  prompts text[] not null,
  primary key (game_id, puzzle_date)
);
alter table private.puzzle_questions enable row level security;
revoke all on table private.puzzle_questions from anon, authenticated, service_role;
grant select on table private.puzzle_questions to plor_app;
create policy puzzle_questions_plor_app_select on private.puzzle_questions for select to plor_app using (true);

-- Both functions run with their owner's rights, so plor_app needs no write grant. Each one checks the admin itself,
-- and search_path is empty so every name is schema-qualified (PostgreSQL 17, CREATE FUNCTION, "Writing SECURITY
-- DEFINER Functions Safely").
create function private.save_questions(p_user uuid, p_game_id text, p_date date, p_prompts text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select from private.admin where user_id = p_user) then
    raise exception 'admins_only: % is not an admin', p_user using errcode = 'OB007';
  end if;
  if p_date < private.today() then
    raise exception 'day_past: % % is over', p_game_id, p_date using errcode = 'OB008';
  end if;
  -- Today can still get questions while it has no puzzle, so a missing day can be filled in.
  if exists (select from private.puzzle where game_id = p_game_id and puzzle_date = p_date and puzzle_date <= private.today()) then
    raise exception 'puzzle_started: % % has started and cannot change', p_game_id, p_date using errcode = 'OB004';
  end if;
  insert into private.puzzle_questions (game_id, puzzle_date, prompts) values (p_game_id, p_date, p_prompts)
  on conflict (game_id, puzzle_date) do update set prompts = excluded.prompts;
end;
$$;

-- The content was checked by src/content/puzzle.ts before the call; the table's own check ties it to its key, and the
-- existing trigger refuses changing a day that has started (OB004). A day with no puzzle yet, today included, can be
-- added.
create function private.approve_puzzle(p_user uuid, p_content jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select from private.admin where user_id = p_user) then
    raise exception 'admins_only: % is not an admin', p_user using errcode = 'OB007';
  end if;
  if (p_content ->> 'date')::date < private.today() then
    raise exception 'day_past: % % is over', p_content ->> 'game_id', p_content ->> 'date' using errcode = 'OB008';
  end if;
  insert into private.puzzle (game_id, puzzle_date, content)
  values (p_content ->> 'game_id', (p_content ->> 'date')::date, p_content)
  on conflict (game_id, puzzle_date) do update set content = excluded.content;
end;
$$;

revoke all on function private.save_questions(uuid, text, date, text[]), private.approve_puzzle(uuid, jsonb) from public;
grant execute on function private.save_questions(uuid, text, date, text[]), private.approve_puzzle(uuid, jsonb) to plor_app;

-- plor_publisher existed only for content:publish (DECISIONS.md: Content publishing role, replaced).
drop policy puzzle_plor_publisher_select on private.puzzle;
drop policy puzzle_plor_publisher_insert on private.puzzle;
drop policy puzzle_plor_publisher_update on private.puzzle;
revoke all on table private.puzzle from plor_publisher;
revoke execute on function private.day_of(timestamptz), private.today() from plor_publisher;
revoke usage on schema private from plor_publisher;
drop role plor_publisher;
