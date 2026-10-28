-- The drafting tools' speed (docs/milestones/M13-13f-4-scale-and-leftovers.md, 13f-4a; human, 2026-10-28: "Split by
-- kind (Recommended)"). As 13e-5's category_members, but a category with no filter doesn't call fits_where for each
-- member: set search_path keeps it from being inlined, so the call alone took most of a base category's time (animal,
-- 56,169 members: 1.7 to 2.0 s with it, 0.5 to 0.7 s without; the ticket's Evidence). A subset still checks each member.

create or replace function private.category_members(p_key text) returns setof uuid
  language sql stable set search_path = ''
as $$
  with cat as (select c.root, c.member_of, private.category_where(c) as filter from private.category c where c.key = p_key),
  under (id) as (select private.descendants_now(array[root]) from cat)
  select u.id from under u cross join cat
  where u.id <> cat.root
    and exists (select from private.thing_alias a where a.thing_id = u.id and a.kind = 'name' and a.removed_at is null)
    and (cat.member_of is null or exists (
      select from private.fact m where m.thing_id = u.id and m.trait = 'member_of' and m.value_thing = cat.member_of and m.removed_at is null))
    and (cat.filter is null or private.fits_where(u.id, cat.filter, now()))
  union
  select e.thing_id from private.category_extra e where e.category = p_key and e.removed_at is null;
$$;
