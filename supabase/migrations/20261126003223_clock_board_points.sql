-- The live board on a day on a clock (docs/milestones/M23-23d-the-screens.md, "The live board"; the human, 2026-11-25, answer 47:
-- "Question and points (Recommended)", whose stated cost is that a friend still to play sees scores before their own run).
-- As 20261114230701's broadcast_board, with two changes, both only for a run of a day on a clock (a day stored as format 4):
--   * the message carries the run's points, the sum of its answers' points, and its version goes 2 to 3 for every message (a
--     message of another game's run or a format 3 day has no `points`, and is otherwise as before);
--   * every friend is sent the message, as the player's own board is, not only a friend who has finished the day: a friend sees
--     "Question 2 of 3, 180 points" while the run is on, and the points once it has ended.
-- A format 3 day and Fragments keep the rule of 20261024031116: a friend who has not finished the game that day is sent only
-- `started`, from the run's insert. The message never carries an answer or a thing's name. The function's owner, search_path
-- and revokes are unchanged (create or replace keeps them).
create or replace function private.broadcast_board() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  payload jsonb;
  started jsonb;
  recipient uuid;
  on_clock boolean;
begin
  select rs.status, rs.answered into s from private.run_status rs
  where rs.user_id = new.user_id and rs.game_id = new.game_id and rs.puzzle_date = new.puzzle_date;
  select coalesce(p.content ->> 'format' = '4', false) into on_clock from private.puzzle p
  where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
  payload := jsonb_build_object(
    'v', 3,
    'type', 'friend_status',
    'username', (select p.username::text from private.profile p where p.user_id = new.user_id),
    'gameId', new.game_id,
    'puzzleDate', new.puzzle_date,
    'state', case when s.status = 'in_progress' then 'playing' else 'finished' end,
    'question', case when s.status = 'in_progress' then s.answered + 1 end
  );
  if on_clock then
    payload := payload || jsonb_build_object('points', (
      select coalesce(sum(c.points), 0)::int from private.clock_answer c
      where c.user_id = new.user_id and c.game_id = new.game_id and c.puzzle_date = new.puzzle_date));
  end if;
  started := payload || jsonb_build_object('state', 'started', 'question', null);
  perform realtime.send(payload, 'friend_status', 'board:' || new.user_id::text, true);
  for recipient in
    select case when f.user_a = new.user_id then f.user_b else f.user_a end
    from private.friendship f where new.user_id in (f.user_a, f.user_b)
  loop
    if on_clock or exists (select from private.run_status rs
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
