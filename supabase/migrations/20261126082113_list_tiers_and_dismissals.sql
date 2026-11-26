-- M23 23e-2, tiers and the texts on no list (docs/milestones/M23-23e-drafting-and-approving.md, design 7 and 8; the human's
-- answers 52 and 53 in M23-offbeat-on-a-clock.md). Security change, approved by the human with the ticket (2026-11-25:
-- "Approve 23e", security changes included; DECISIONS.md, Log): one table no role is granted, and four functions plor_app
-- may execute, each for an admin only (OB007 otherwise), in the pattern of 20261125011243_list_review.sql.
--
-- A tier change is a list edit like a strike or an add: it waits here until a session folds it into the list's file and the
-- next load marks it folded. It changes nothing a player sees by itself; a day built from the lists takes the tier into its
-- levels and rare examples (src/content/clock-day.ts), and the fold writes it into the file.

-- A list edit can now be a tier change, which carries the tier. The answer is named by its thing, so the same answer may
-- have a strike and a tier change: one edit of each kind, not of any kind.
alter table private.list_edit add column tier text;
alter table private.list_edit drop constraint list_edit_kind_check,
  add constraint list_edit_kind_check check (kind in ('strike', 'add', 'tier')),
  add constraint list_edit_tier_check check ((kind = 'tier') = (tier is not null) and (tier is null or tier in ('common', 'uncommon', 'rare')));
alter table private.list_edit drop constraint list_edit_category_thing_id_key,
  add constraint list_edit_category_thing_id_kind_key unique (category, thing_id, kind);

-- A text the admin dismissed from a list's page: typed on its clock days, on no list, and not wanted. It has no thing and
-- nothing to write into a file, so it is no list edit and no fold sees it. It stays, so a text typed again stays dismissed.
create table private.list_dismissed (
  category text not null references private.category (key),
  text text not null check (text <> ''),
  dismissed_by uuid not null,
  dismissed_at timestamptz not null default now(),
  primary key (category, text)
);

alter table private.list_dismissed enable row level security;

-- The edits not yet folded, and the lists seen, for the page: as before, with a tier edit's tier.
create or replace function private.list_edits(p_admin uuid) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.list_guard(p_admin, null);
  return jsonb_build_object(
    'edits', coalesce((select jsonb_agg(jsonb_build_object('category', e.category, 'name', e.name, 'kind', e.kind, 'at', e.edited_at)
                         || case when e.kind = 'tier' then jsonb_build_object('tier', e.tier) else '{}'::jsonb end order by e.id)
                       from private.list_edit e where e.folded_at is null), '[]'::jsonb),
    'seen', coalesce((select jsonb_agg(jsonb_build_object('category', s.category, 'at', s.seen_at) order by s.category)
                      from private.list_seen s), '[]'::jsonb));
end;
$$;

-- Gives the answer of a researched list that bears this typed form another tier. The answer must be one the file holds and
-- that still counts: not one added here and not yet in the file (its line is the file's to give a tier once the fold writes
-- it), and not one struck. Another change to the same answer replaces the first.
create function private.list_set_tier(p_admin uuid, p_category text, p_alias text, p_tier text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  root uuid;
  hits uuid[];
  target uuid;
begin
  perform private.list_guard(p_admin, p_category);
  if p_tier is null or p_tier not in ('common', 'uncommon', 'rare') then
    raise exception using errcode = 'OB012', message = format('lists: "%s" is not a tier', p_tier);
  end if;
  select c.root into root from private.category c where c.key = p_category;
  select array_agg(distinct a.thing_id) into hits
  from private.thing_alias a
  where a.alias = p_alias and a.removed_at is null and private.in_category_now(a.thing_id, p_category)
    and exists (select from private.fact f
                where f.thing_id = a.thing_id and f.trait = 'kind_of' and f.value_thing = root and f.removed_at is null);
  if hits is null or cardinality(hits) <> 1 then
    raise exception using errcode = 'OB012', message = format('lists: "%s" names %s answers of %s', p_alias, coalesce(cardinality(hits), 0), p_category);
  end if;
  target := hits[1];
  if exists (select from private.list_edit e where e.category = p_category and e.thing_id = target and e.kind in ('add', 'strike') and e.folded_at is null) then
    raise exception using errcode = 'OB012', message = format('lists: "%s" is added or struck, so it has no tier to change', p_alias);
  end if;
  insert into private.list_edit (category, thing_id, name, kind, tier, edited_by) values (p_category, target, p_alias, 'tier', p_tier, p_admin)
  on conflict (category, thing_id, kind) do update
    set name = excluded.name, tier = excluded.tier, edited_by = excluded.edited_by, edited_at = now(), folded_at = null;
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'list', jsonb_build_object('category', p_category, 'action', 'tier', 'text', p_alias, 'tier', p_tier, 'thing', target));
end;
$$;

-- Takes a tier change back while the file does not hold it yet: the answer keeps the tier the file gives it.
create function private.list_unset_tier(p_admin uuid, p_category text, p_alias text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  gone private.list_edit;
begin
  perform private.list_guard(p_admin, p_category);
  delete from private.list_edit e
  where e.category = p_category and e.name = p_alias and e.kind = 'tier' and e.folded_at is null returning * into gone;
  if not found then
    raise exception using errcode = 'OB012', message = format('lists: no tier change of "%s" in %s to undo', p_alias, p_category);
  end if;
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'list', jsonb_build_object('category', p_category, 'action', 'untier', 'text', p_alias, 'thing', gone.thing_id));
end;
$$;

-- Dismisses a typed text for a researched list: it stops showing among the texts on no list, and stays dismissed however many
-- more players type it. Dismissing it again is no error.
create function private.list_dismiss(p_admin uuid, p_category text, p_text text) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  perform private.list_guard(p_admin, p_category);
  if coalesce(p_text, '') = '' then
    raise exception using errcode = 'OB012', message = 'lists: a dismissal needs a text';
  end if;
  insert into private.list_dismissed (category, text, dismissed_by) values (p_category, p_text, p_admin) on conflict do nothing;
  if found then
    insert into private.base_log (actor, action, detail)
    values ('admin:' || p_admin, 'list', jsonb_build_object('category', p_category, 'action', 'dismiss', 'text', p_text));
  end if;
end;
$$;

-- The texts players typed on the list's days on a clock (format 4) that are on no list now (not a name of a member of the
-- category) and not dismissed, most distinct players first, each with the text as typed most often (for Add). Only players'
-- misses are stored: a guest's are stored nowhere.
create function private.list_unlisted(p_admin uuid, p_category text) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.list_guard(p_admin, p_category);
  return coalesce((
    select jsonb_agg(jsonb_build_object('text', t.text, 'name', t.name, 'players', t.players) order by t.players desc, t.text)
    from (
      select m.normalized as text, mode() within group (order by m.typed) as name, count(distinct m.user_id)::int as players
      from private.missed_answer m
      join private.puzzle p on p.game_id = m.game_id and p.puzzle_date = m.puzzle_date and p.content ->> 'format' = '4'
      where p.content -> 'questions' -> m.question_idx::int ->> 'category' = p_category
        and m.normalized is not null and m.normalized <> ''
        and not exists (select from private.list_dismissed d where d.category = p_category and d.text = m.normalized)
        and not exists (select from private.thing_alias a
                        where a.alias = m.normalized and a.removed_at is null and private.in_category_now(a.thing_id, p_category))
      group by m.normalized) t), '[]'::jsonb);
end;
$$;

-- Privileges: the table is granted to nobody; plor_app runs the four functions, each of which refuses a non-admin.
revoke all on table private.list_dismissed from public, anon, authenticated, service_role;

revoke all on function private.list_set_tier(uuid, text, text, text), private.list_unset_tier(uuid, text, text),
  private.list_dismiss(uuid, text, text), private.list_unlisted(uuid, text) from public, anon, authenticated, service_role;

grant execute on function private.list_set_tier(uuid, text, text, text), private.list_unset_tier(uuid, text, text),
  private.list_dismiss(uuid, text, text), private.list_unlisted(uuid, text) to plor_app;
