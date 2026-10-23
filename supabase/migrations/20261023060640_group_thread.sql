-- M10 10d: one comment thread per group per day (docs/milestones/M10-groups.md, G4, G5, G6, G9). No new grant or
-- policy: plor_app's grants and policies on private.comment are table-wide (M08 8a), and the nudges use the board
-- topics and the own-board read policy approved in M07 (G5; DECISIONS.md: Real-time transport).

-- Null is the friends thread (M08); otherwise the comment is in that group's thread, seen by its current members
-- (G4; the routes decide who reads what). Its author must be a member, and leaving or being removed deletes their
-- comments there, with their reactions and reports (G6), because the comment hangs off the membership.
alter table private.comment add column group_id uuid;
alter table private.comment add constraint comment_group_member foreign key (group_id, user_id)
  references private.group_member (group_id, user_id) on delete cascade;
-- The membership cascade looks comments up by group and author.
create index comment_group on private.comment (group_id, user_id) where group_id is not null;

-- As 20261022095828_live_comments.sql, with one change: a group comment, or a reaction on one, nudges the board topic
-- of each current member of the group instead of the author's friends, and its payload names the group (G5). A
-- friends-thread payload is unchanged, so a page that predates groups keeps working. A reaction removed because its
-- comment was deleted sends nothing of its own: the comment's deletion already nudged everyone who saw it.
create or replace function private.broadcast_comments() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid;
  game text;
  day date;
  run_target uuid;
  comment_target bigint;
  grp uuid;
  kind text := 'comments_changed';
  payload jsonb;
  recipient uuid;
begin
  if tg_op = 'DELETE' then
    actor := old.user_id; game := old.game_id; day := old.puzzle_date;
  else
    actor := new.user_id; game := new.game_id; day := new.puzzle_date;
  end if;
  -- Nested, because each table has fields the other lacks and plpgsql checks a field only when the line runs.
  if tg_table_name = 'comment' then
    if tg_op = 'DELETE' then grp := old.group_id; else grp := new.group_id; end if;
  else
    if tg_op = 'DELETE' then
      run_target := old.run_user_id; comment_target := old.comment_id;
    else
      run_target := new.run_user_id; comment_target := new.comment_id;
    end if;
    if run_target is not null then
      kind := 'run_reactions_changed';
    else
      select c.group_id into grp from private.comment c where c.id = comment_target;
      if not found then return null; end if;
    end if;
  end if;
  payload := jsonb_build_object('v', 1, 'type', kind, 'gameId', game, 'puzzleDate', day);
  if grp is not null then payload := payload || jsonb_build_object('groupId', grp); end if;
  for recipient in
    select actor where grp is null
    union all
    select case when f.user_a = actor then f.user_b else f.user_a end
    from private.friendship f where grp is null and actor in (f.user_a, f.user_b)
    union all
    select m.user_id from private.group_member m where m.group_id = grp
  loop
    perform realtime.send(payload, kind, 'board:' || recipient::text, true);
  end loop;
  return null;
end;
$$;
revoke all on function private.broadcast_comments() from public, anon, authenticated, service_role;
