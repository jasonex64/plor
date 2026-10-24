-- M12 12d: a record of which admin deleted which reported comment (docs/milestones/M12-12d-decided-fixes.md; human,
-- 2026-10-23: "add record of which admin does it"). Security change (DECISIONS.md Log; D1 (a), human, 2026-10-24):
-- the deletion and its record are one statement in a function with its owner's rights, which plor_app may execute;
-- plor_app may only read the record, so app code can't skip it or write a false one.

-- Which admin deleted which comment, its author, its text, and when. The comment row is gone, so comment_id has no
-- foreign key. The record goes with the admin's or the author's account (D2 (a), human, 2026-10-24), so an account
-- deletion still removes everything tied to the account (M12 A5).
create table private.comment_deletion (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users (id) on delete cascade,
  comment_id bigint not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  deleted_at timestamptz not null default now()
);
-- The account cascades look records up by admin and by author.
create index comment_deletion_admin on private.comment_deletion (admin_id);
create index comment_deletion_author on private.comment_deletion (author_id);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Only admins' routes read it.
alter table private.comment_deletion enable row level security;
revoke all on table private.comment_deletion from public, anon, authenticated, service_role;
grant select on table private.comment_deletion to plor_app;
create policy comment_deletion_plor_app_select on private.comment_deletion for select to plor_app using (true);

-- Deletes a reported comment for everyone, with its reports and reactions (M08 D4, D5), and records it, when p_admin
-- is an admin. Returns false when nothing was deleted: the comment is missing or has no report, or p_admin isn't an
-- admin (the route refuses a non-admin before it calls this, M08 8c).
create function private.delete_reported_comment(p_admin uuid, p_comment bigint) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  recorded int;
begin
  with deleted as (
    delete from private.comment c
    where c.id = p_comment
      and exists (select from private.admin a where a.user_id = p_admin)
      and exists (select from private.comment_report r where r.comment_id = c.id)
    returning c.id, c.user_id, c.body
  )
  insert into private.comment_deletion (admin_id, comment_id, author_id, body)
  select p_admin, d.id, d.user_id, d.body from deleted d;
  get diagnostics recorded = row_count;
  return recorded = 1;
end;
$$;
revoke all on function private.delete_reported_comment(uuid, bigint) from public, anon, authenticated, service_role;
grant execute on function private.delete_reported_comment(uuid, bigint) to plor_app;
