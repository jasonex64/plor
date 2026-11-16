-- M15 15g: a question's answer pool on the admin pages (docs/milestones/M15-15g-the-answer-pool.md). The human, approving
-- Offbeat days and reading the question bank, sees how many answers a category holds, finds them by any part of any
-- name, and reads them a page at a time.
--
-- Security change (DECISIONS.md Log; human, 2026-11-15: "Approve 15g", asked as "Approve 15g, including the one new
-- admin-only database function?"): plor_app may execute private.category_pool, which checks the caller is an admin as
-- private.base_lookup does (OB007). It reads only; plor_app still has no grant on the base's tables.

-- A category's members (private.category_members, as approval counts them), those with a live alias holding p_search,
-- and one page of them by name: p_limit rows from p_offset, or every row when p_limit is null. p_search is normalized
-- by the caller, as aliases are when written; an empty one matches every member. A row's alias is the one that
-- matched: the thing's name when that matches, else the first other alias. Null for a category that doesn't exist.
create function private.category_pool(p_admin uuid, p_key text, p_search text, p_offset integer, p_limit integer) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
declare
  -- In a variable, not a temp table, as private.approve_puzzle keeps its members (a security-definer function must
  -- not touch a relation the caller's session could have created first in pg_temp).
  member_ids uuid[];
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'category_pool: admins only';
  end if;
  if not exists (select from private.category c where c.key = p_key) then
    return null;
  end if;
  member_ids := array(select private.category_members(p_key));
  return (
    with hit as (
      select t.id, t.name,
        (select a.alias from private.thing_alias a
         where a.thing_id = t.id and a.removed_at is null and strpos(a.alias, p_search) > 0
         order by a.kind <> 'name', a.alias limit 1) as alias
      from unnest(member_ids) as m(id) join private.thing t on t.id = m.id
    ),
    found as (select h.id, h.name, h.alias from hit h where p_search = '' or h.alias is not null),
    page as (select f.id, f.name, f.alias from found f order by lower(f.name), f.id offset p_offset limit p_limit)
    select jsonb_build_object(
      'members', cardinality(member_ids),
      'matching', (select count(*) from found),
      'rows', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'alias', p.alias) order by lower(p.name), p.id), '[]') from page p))
  );
end;
$$;

revoke all on function private.category_pool(uuid, text, text, integer, integer) from public, anon, authenticated, service_role;

grant execute on function private.category_pool(uuid, text, text, integer, integer) to plor_app;
