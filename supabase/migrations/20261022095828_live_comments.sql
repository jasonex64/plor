-- M08 8d: new comments and reactions reach friends' open pages (docs/milestones/M08-comments-and-reactions.md,
-- Design, "Live"). No new security change: these sends use the board topics and the own-board read policy approved in
-- M07 (D5, D6; DECISIONS.md: Real-time transport), as the ticket's design says.

-- A comment or reaction added or removed nudges the board topic of the player who made it (for their other tabs) and
-- of each of their friends: everyone who can see it, since a comment or reaction is seen only by its author and their
-- friends. The payload says only which day changed and whether it was the thread (comments and reactions on them) or
-- the reactions on runs; the page then refetches over HTTP, which keeps every rule about who sees what. So no comment
-- text is sent, and a player who hasn't finished gets nothing but the nudge. Like the board's sends, these go inside
-- the writing transaction, and a failed send is a WARNING, never a failed write (DECISIONS.md Log, 2026-10-22).
-- Deleting a comment also deletes its reactions, and each of those nudges too; a page refetches once per nudge.
create function private.broadcast_comments() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid;
  game text;
  day date;
  run_target uuid;
  kind text := 'comments_changed';
  recipient uuid;
begin
  if tg_op = 'DELETE' then
    actor := old.user_id; game := old.game_id; day := old.puzzle_date;
  else
    actor := new.user_id; game := new.game_id; day := new.puzzle_date;
  end if;
  -- Nested, because private.comment has no run_user_id and plpgsql checks a field only when the line runs.
  if tg_table_name = 'reaction' then
    if tg_op = 'DELETE' then run_target := old.run_user_id; else run_target := new.run_user_id; end if;
    if run_target is not null then kind := 'run_reactions_changed'; end if;
  end if;
  for recipient in
    select actor
    union all
    select case when f.user_a = actor then f.user_b else f.user_a end
    from private.friendship f where actor in (f.user_a, f.user_b)
  loop
    perform realtime.send(jsonb_build_object('v', 1, 'type', kind, 'gameId', game, 'puzzleDate', day), kind,
      'board:' || recipient::text, true);
  end loop;
  return null;
end;
$$;
revoke all on function private.broadcast_comments() from public, anon, authenticated, service_role;

create trigger comment_broadcast after insert or delete on private.comment
  for each row execute function private.broadcast_comments();
create trigger reaction_broadcast after insert or delete on private.reaction
  for each row execute function private.broadcast_comments();
