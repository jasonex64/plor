-- M14 14b-2b-2b: the audit's one-click link for a near-typo (docs/milestones/M14-14b-2b-2-admin-build.md; round 10,
-- board 3: "the near-typo's first action is one click"). Security change (DECISIONS.md Log; human, 2026-10-26: "New
-- lookup function (Recommended)"): an admin-only function with its owner's rights, which plor_app may execute.

-- The answers a waiting near-typo review could be linked to: the category's members now (as private.audit_decide's
-- link requires) bearing a name among p_texts, the texts within a typo of what was typed, which the caller works out
-- with the game's own typo rule (src/game/matching.ts, withinTypo), so the rule has one place. Empty for a review that
-- isn't a waiting near-typo.
create function private.audit_near(p_admin uuid, p_review bigint, p_texts text[]) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_near: admins only';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.name, t.id)
    from private.miss_review r
    join private.thing t on t.id in (select a.thing_id from private.thing_alias a where a.alias = any(p_texts) and a.removed_at is null)
    where r.id = p_review and r.outcome = 'near_typo' and r.decision is null and private.in_category_now(t.id, r.category)), '[]');
end;
$$;
revoke all on function private.audit_near(uuid, bigint, text[]) from public, anon, authenticated, service_role;
grant execute on function private.audit_near(uuid, bigint, text[]) to plor_app;
