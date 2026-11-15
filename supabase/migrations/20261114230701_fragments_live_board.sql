-- Fragments' live board (docs/milestones/M16-16f-the-shared-pieces.md, 16f-6; docs/DECISIONS.md, Log 2026-11-14, "Fragments' live
-- board: what is broadcast", approved by the human as answer 55).
-- As the game 2 migration's broadcast_board without its early return for game 2: a Fragments run sends the same
-- friend_status as an Offbeat run (the friend's name, the game, the day, started, playing or finished, and the round being
-- played), nothing of a word or a score, and a friend who hasn't finished that game today is sent only `started`, from the
-- run's insert alone. The payload keeps its shape, so v stays 2. The function's owner, search_path and revokes are
-- unchanged (create or replace keeps them).
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

-- A word given moves the board, and the last word shows the run finished. Only the run's insert sends `started`, so a
-- word reaches a friend who has finished Fragments and nobody else.
create trigger round_word_broadcast_board after insert on private.round_word
  for each row execute function private.broadcast_board();
