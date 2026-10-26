-- M13 13e-4a review: private.audit_decide's Accept on a subset (docs/milestones/M13-13e-4-subsets.md, A2). No grant
-- changes: the function keeps its signature and its grant.

-- As 13e-4a's, with the acceptance for a subset whose filter a new thing can't carry (through its country, a number)
-- decided by that filter, whatever held the text (13e-4a review: a held offensive-word text never joined such a subset).
create or replace function private.audit_decide(p_admin uuid, p_review bigint, p_action text, p_thing uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  r private.miss_review;
  made uuid;
  decided text;
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_decide: admins only';
  end if;
  select * into r from private.miss_review where id = p_review for update;
  if not found then
    raise exception using errcode = 'OB012', message = format('audit: no review %s', p_review);
  end if;
  if p_action = 'undo' and r.decision = 'linked' then
    update private.thing_alias set removed_at = now() where thing_id = r.chosen and alias = r.text and removed_at is null;
    decided := 'undone';
  elsif p_action = 'undo' and r.decision = 'accepted' and r.outcome = 'rejected' then
    update private.category_extra set removed_at = now() where category = r.category and thing_id = r.chosen and removed_at is null;
    decided := 'undone';
  elsif p_action = 'undo' and r.thing_id is not null and (r.decision is null or r.decision = 'accepted') then
    update private.thing_alias set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    update private.fact set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    update private.category_extra set removed_at = now() where category = r.category and thing_id = r.thing_id and removed_at is null;
    decided := 'undone';
  elsif p_action = 'link' and r.outcome in ('accepted', 'near_typo') and r.decision is null then
    if p_thing is null or p_thing = r.thing_id or not private.in_category_now(p_thing, r.category) then
      raise exception using errcode = 'OB012', message = format('audit: %s is not a member of %s', p_thing, r.category);
    end if;
    if exists (select from private.thing_alias a where a.thing_id = p_thing and a.alias = r.text) then
      raise exception using errcode = 'OB012', message = format('audit: "%s" is or was already a name of %s', r.text, p_thing);
    end if;
    insert into private.thing_alias (thing_id, alias, kind, origin, source_ref)
    values (p_thing, r.text, 'synonym', 'human', 'miss_review:' || r.id);
    if r.thing_id is not null then
      update private.thing_alias set removed_at = now() where thing_id = r.thing_id and removed_at is null;
      update private.fact set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    end if;
    decided := 'linked';
  elsif p_action = 'accept' and r.outcome in ('held', 'held_subset') and r.decision is null then
    made := private.add_player_thing(r.category, r.text, 'human');
    -- The subset's filter, not the hold's reason, decides: a text held for the offensive-word list on such a subset
    -- needs it too (13e-4a review).
    if exists (select from private.category c where c.key = r.category and (c.fact_via is not null or c.number_trait is not null)) then
      insert into private.category_extra (category, thing_id, added_by) values (r.category, made, p_admin);
    end if;
    decided := 'accepted';
  elsif p_action = 'accept_for_category' and r.outcome = 'rejected' and r.decision is null then
    if p_thing is null or not exists (
      select from private.thing_alias a where a.thing_id = p_thing and a.alias = r.text and a.removed_at is null) then
      raise exception using errcode = 'OB012', message = format('audit: "%s" is not a name of %s', r.text, p_thing);
    end if;
    if exists (select from private.category_extra e where e.category = r.category and e.thing_id = p_thing) then
      raise exception using errcode = 'OB012', message = format('audit: %s is or was already accepted for %s', p_thing, r.category);
    end if;
    insert into private.category_extra (category, thing_id, added_by) values (r.category, p_thing, p_admin);
    decided := 'accepted';
  elsif p_action = 'dismiss' and r.outcome <> 'accepted' and r.decision is null then
    decided := 'dismissed';
  else
    raise exception using errcode = 'OB012',
      message = format('audit: can''t %s review %s (%s, %s)', p_action, p_review, r.outcome, coalesce(r.decision, 'undecided'));
  end if;
  update private.miss_review
  set decision = decided, decided_by = p_admin, decided_at = now(), thing_id = coalesce(made, thing_id),
    chosen = case when p_action in ('link', 'accept_for_category') then p_thing else chosen end
  where id = p_review;
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'audit', jsonb_build_object('review', p_review, 'action', p_action, 'thing', coalesce(made, p_thing)));
end;
$$;
