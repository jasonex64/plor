-- M12 12d: the live board hides a friend's progress until you've finished (docs/milestones/M12-12d-decided-fixes.md;
-- human, 2026-10-23: "hide progress until you've finished", and only "not started" or "started" before then).
-- Replaces M07 7c's broadcast_board (20261022073610_live_board.sql), whose sending, failure handling and topic policy
-- are unchanged. What changes is who gets which message:
--   * the player's own board, and a friend who has finished that day, get every change, as before;
--   * a friend who hasn't finished gets one message, when the run starts, saying only `started`. A message for each
--     answer or Next would show the friend's progress by its count and timing.
-- v is 2: `started` is a state a v1 page doesn't know, so an old page logs the message and refetches (M00 data
-- design §2), and the refetch's 409 client_outdated reloads it (protocol 5).
create or replace function private.broadcast_board() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  payload jsonb;
  started jsonb;
  recipient uuid;
begin
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
