-- Game 2's days reach the database (docs/milestones/M16-16c-a-day-of-game-2.md, 16c-2). As 20261030054018_test_runs.sql's,
-- with game 2's branch: approval chooses by game_id, as the audit's FUT-6 asked, and game 1's path doesn't change. The
-- admin and past-day checks stay first and shared. A game 2 day's rules are in src/content/substrings.ts, which the route
-- applies; here it's held to its format, as a day can't be stored in another game's shape.
create or replace function private.approve_puzzle(p_user uuid, p_content jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select from private.admin where user_id = p_user) then
    raise exception 'admins_only: % is not an admin', p_user using errcode = 'OB007';
  end if;
  if (p_content ->> 'date')::date < private.today() then
    raise exception 'day_past: % % is over', p_content ->> 'game_id', p_content ->> 'date' using errcode = 'OB008';
  end if;
  if p_content ->> 'game_id' = 'substrings' then
    if p_content ->> 'format' is distinct from '1' then
      raise exception 'puzzle_invalid: format 1 expected' using errcode = 'OB009', detail = '["format 1 expected"]';
    end if;
    insert into private.puzzle (game_id, puzzle_date, content)
    values (p_content ->> 'game_id', (p_content ->> 'date')::date, p_content || jsonb_build_object('approved_at', now()))
    on conflict (game_id, puzzle_date) do update set content = excluded.content;
    return;
  end if;
  insert into private.puzzle (game_id, puzzle_date, content)
  values (p_content ->> 'game_id', (p_content ->> 'date')::date,
          private.build_puzzle(p_user, p_content) || jsonb_build_object('approved_at', now()))
  on conflict (game_id, puzzle_date) do update set content = excluded.content;
end;
$$;
