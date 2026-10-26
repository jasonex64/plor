-- M14 14b-2b-2b: an admin keeps a reported comment (docs/milestones/M14-14b-2b-2-admin-build.md; round 10's "Keep
-- comment", human, 2026-10-26: "Add Keep comment"). Security change (DECISIONS.md Log; human, 2026-10-26: "Approve it
-- (Recommended)"): as with deleting, an admin's keep is recorded only through a function with its owner's rights, which
-- plor_app may execute; plor_app may only read the record, so app code can't write a false one.

-- Which admin kept which comment, its author, its text, and when; the comment's reports made up to then are handled.
-- Its author may delete it later, so comment_id has no foreign key. The record goes with the admin's or the author's
-- account, as a deletion's does (M12 12d, D2 a).
create table private.comment_keep (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users (id) on delete cascade,
  comment_id bigint not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  kept_at timestamptz not null default now()
);
-- The account cascades look records up by admin and by author.
create index comment_keep_admin on private.comment_keep (admin_id);
create index comment_keep_author on private.comment_keep (author_id);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Only admins' routes read it.
alter table private.comment_keep enable row level security;
revoke all on table private.comment_keep from public, anon, authenticated, service_role;
grant select on table private.comment_keep to plor_app;
create policy comment_keep_plor_app_select on private.comment_keep for select to plor_app using (true);

-- Records that p_admin, an admin, kept a comment with an open report: one made after its last keep, if any. Its
-- reports stay, so it stays hidden for the players who reported it (M08 D5; human, 2026-10-26: "Still hidden
-- (Recommended)"), and it leaves the admins' list until another player reports it (each reports a comment once).
-- Returns false when nothing was recorded: the comment is missing or has no open report, or p_admin isn't an admin
-- (the route refuses a non-admin before it calls this).
create function private.keep_reported_comment(p_admin uuid, p_comment bigint) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  recorded int;
begin
  insert into private.comment_keep (admin_id, comment_id, author_id, body)
  select p_admin, c.id, c.user_id, c.body from private.comment c
  where c.id = p_comment
    and exists (select from private.admin a where a.user_id = p_admin)
    and exists (
      select from private.comment_report r
      where r.comment_id = c.id
        and not exists (select from private.comment_keep k where k.comment_id = c.id and k.kept_at >= r.created_at)
    );
  get diagnostics recorded = row_count;
  return recorded = 1;
end;
$$;
revoke all on function private.keep_reported_comment(uuid, bigint) from public, anon, authenticated, service_role;
grant execute on function private.keep_reported_comment(uuid, bigint) to plor_app;
