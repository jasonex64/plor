-- M07 7c: the live board (docs/milestones/M07-friends-and-live-board.md). Security change, approved by the human
-- on 2026-10-21 as D5 and D6 (DECISIONS.md: Real-time transport, and the Log).

-- D6: when a player starts, answers or opens the next question, their new state goes to the board topic of each
-- friend, and to their own so their page learns when their run ends. It's sent inside the same transaction, and
-- Realtime delivers it only after COMMIT, never after ROLLBACK (plan step 1, observed 2026-10-21). realtime.send
-- turns its own failures into a Postgres WARNING (its source, local stack 2026-10-22), so a failed send never fails
-- the answer; that friend's row on other boards stays stale until their next page load or reconnect. Accepted by
-- the human, 2026-10-22, over failing the answer (DECISIONS.md Log).
-- No spoilers: the payload says only playing (with the question) or finished, never how a run ended
-- (DECISIONS.md, Game 1: server is authoritative). How a friend's run ended comes over HTTP once the viewer has
-- finished.
create function private.broadcast_board() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  payload jsonb;
  recipient uuid;
begin
  select rs.status, rs.answered into s from private.run_status rs
  where rs.user_id = new.user_id and rs.game_id = new.game_id and rs.puzzle_date = new.puzzle_date;
  payload := jsonb_build_object(
    'v', 1,
    'type', 'friend_status',
    'username', (select p.username::text from private.profile p where p.user_id = new.user_id),
    'gameId', new.game_id,
    'puzzleDate', new.puzzle_date,
    'state', case when s.status = 'in_progress' then 'playing' else 'finished' end,
    'question', case when s.status = 'in_progress' then s.answered + 1 end
  );
  for recipient in
    select new.user_id
    union all
    select case when f.user_a = new.user_id then f.user_b else f.user_a end
    from private.friendship f where new.user_id in (f.user_a, f.user_b)
  loop
    perform realtime.send(payload, 'friend_status', 'board:' || recipient::text, true);
  end loop;
  return null;
end;
$$;
revoke all on function private.broadcast_board() from public, anon, authenticated, service_role;

create trigger run_broadcast_board after insert on private.run
  for each row execute function private.broadcast_board();
create trigger run_event_broadcast_board after insert on private.run_event
  for each row execute function private.broadcast_board();
create trigger question_open_broadcast_board after insert on private.question_open
  for each row execute function private.broadcast_board();

-- D5: a signed-in browser may join only its own board, `board:<own user id>`, and only to receive. There is no
-- INSERT policy, so browsers can't send. Shown to work on the local stack in plan step 1: the owner subscribed, and
-- another user got "Unauthorized". RLS on realtime.messages is already on and owned by Supabase, so it isn't
-- enabled here (Supabase Realtime /authorization).
create policy board_own_topic_select on realtime.messages for select to authenticated
  using ((select realtime.topic()) = 'board:' || (select auth.uid())::text and realtime.messages.extension = 'broadcast');
