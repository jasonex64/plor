-- M23 23b-2, the admin's review of a researched list (docs/milestones/M23-23b-research-and-review.md, Part 3 and "The
-- security change"; DECISIONS.md, Log 2026-11-24). Security change, approved by the human with the ticket (2026-11-24:
-- "Approve both"): two tables no role is granted, four writing functions and one reading function plor_app may execute,
-- each for an admin only (OB007 otherwise).
--
-- A strike ends an answer's membership at the next midnight, as a load ends what the files stop giving, so a day being
-- played never changes. An add makes the answer a member the way the Audit page accepts one. Both wait here until a
-- session folds them into the list's file and the next load marks them folded.

alter table private.base_log drop constraint base_log_action_check,
  add constraint base_log_action_check check (action in ('import', 'define_category', 'miss_review', 'audit', 'link', 'erase', 'list'));

-- One row per answer struck or added and not yet undone. name is the typed form struck (a strike) or the name as the
-- admin wrote it (an add). folded_at: when a load found the edit in the list's file.
create table private.list_edit (
  id bigint generated always as identity primary key,
  category text not null references private.category (key),
  thing_id uuid not null references private.thing (id) on delete cascade,
  name text not null check (name <> ''),
  kind text not null check (kind in ('strike', 'add')),
  edited_by uuid not null,
  edited_at timestamptz not null default now(),
  folded_at timestamptz,
  unique (category, thing_id)
);

-- A list the human has looked through, with who and when.
create table private.list_seen (
  category text primary key references private.category (key),
  seen_by uuid not null,
  seen_at timestamptz not null default now()
);

alter table private.list_edit enable row level security;
alter table private.list_seen enable row level security;

-- The checks every function here starts with: the caller is an admin (OB007), and the category is a researched list
-- (OB012): its root came from a list file.
create function private.list_guard(p_admin uuid, p_category text) returns void
  language plpgsql set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'lists: admins only';
  end if;
  if p_category is not null and not exists (
    select from private.category c join private.thing_source s on s.thing_id = c.root
    where c.key = p_category and s.source = 'research') then
    raise exception using errcode = 'OB012', message = format('lists: %s is not a researched list', p_category);
  end if;
end;
$$;

-- Strikes the answer of a researched list that bears this typed form: it stops being an answer at the next midnight.
-- Striking an answer added here and not yet folded takes the add back instead.
create function private.list_strike(p_admin uuid, p_category text, p_alias text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  root uuid;
  hits uuid[];
  target uuid;
  midnight timestamptz := private.next_reset();
begin
  perform private.list_guard(p_admin, p_category);
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
  update private.fact f set removed_at = midnight
  where f.thing_id = target and f.trait = 'kind_of' and f.value_thing = root and f.removed_at is null;
  delete from private.list_edit e where e.category = p_category and e.thing_id = target and e.kind = 'add' and e.folded_at is null;
  if not found then
    insert into private.list_edit (category, thing_id, name, kind, edited_by) values (p_category, target, p_alias, 'strike', p_admin);
  end if;
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'list', jsonb_build_object('category', p_category, 'action', 'strike', 'text', p_alias, 'thing', target, 'ends', midnight));
end;
$$;

-- Takes a strike back while the answer is still one: before the midnight it would have ended at.
create function private.list_unstrike(p_admin uuid, p_category text, p_alias text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  edit private.list_edit;
begin
  perform private.list_guard(p_admin, p_category);
  select * into edit from private.list_edit e
  where e.category = p_category and e.name = p_alias and e.kind = 'strike' and e.folded_at is null for update;
  if not found then
    raise exception using errcode = 'OB012', message = format('lists: no strike of "%s" in %s to undo', p_alias, p_category);
  end if;
  update private.fact f set removed_at = null
  where f.thing_id = edit.thing_id and f.trait = 'kind_of' and f.removed_at > now()
    and f.value_thing = (select c.root from private.category c where c.key = p_category);
  if not found then
    raise exception using errcode = 'OB012', message = format('lists: "%s" already stopped being an answer of %s', p_alias, p_category);
  end if;
  delete from private.list_edit e where e.id = edit.id;
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'list', jsonb_build_object('category', p_category, 'action', 'unstrike', 'text', p_alias, 'thing', edit.thing_id));
end;
$$;

-- Adds an answer to a researched list, as the Audit page accepts a held text (private.add_player_thing, origin human).
-- p_alias is the name normalized as typed text is; p_name is the name as the admin wrote it, for the list's file.
create function private.list_add(p_admin uuid, p_category text, p_name text, p_alias text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  made uuid;
begin
  perform private.list_guard(p_admin, p_category);
  if coalesce(p_alias, '') = '' or coalesce(btrim(p_name), '') = '' then
    raise exception using errcode = 'OB012', message = 'lists: an answer needs a name';
  end if;
  if exists (select from private.thing_alias a
             where a.alias = p_alias and a.removed_at is null and private.in_category_now(a.thing_id, p_category)) then
    raise exception using errcode = 'OB012', message = format('lists: "%s" is already an answer of %s', p_alias, p_category);
  end if;
  made := private.add_player_thing(p_category, p_alias, 'human');
  insert into private.list_edit (category, thing_id, name, kind, edited_by) values (p_category, made, btrim(p_name), 'add', p_admin);
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'list', jsonb_build_object('category', p_category, 'action', 'add', 'text', p_alias, 'thing', made));
end;
$$;

-- Marks a researched list as looked through; marking it again moves the date.
create function private.list_mark_seen(p_admin uuid, p_category text) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  perform private.list_guard(p_admin, p_category);
  insert into private.list_seen (category, seen_by) values (p_category, p_admin)
  on conflict (category) do update set seen_by = excluded.seen_by, seen_at = now();
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'list', jsonb_build_object('category', p_category, 'action', 'seen'));
end;
$$;

-- The edits not yet folded into the files, and the lists seen, for the page.
create function private.list_edits(p_admin uuid) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.list_guard(p_admin, null);
  return jsonb_build_object(
    'edits', coalesce((select jsonb_agg(jsonb_build_object('category', e.category, 'name', e.name, 'kind', e.kind, 'at', e.edited_at) order by e.id)
                       from private.list_edit e where e.folded_at is null), '[]'::jsonb),
    'seen', coalesce((select jsonb_agg(jsonb_build_object('category', s.category, 'at', s.seen_at) order by s.category)
                      from private.list_seen s), '[]'::jsonb));
end;
$$;

-- The loader's, once it has found these edits in the list files (scripts/base.ts): they are marked folded, and an
-- added answer's own thing, which the file's line now replaces, stops at the next midnight.
create function private.list_fold(p_ids bigint[]) returns void
  language plpgsql set search_path = ''
as $$
declare
  midnight timestamptz := private.next_reset();
begin
  update private.thing_alias a set removed_at = midnight
  where a.removed_at is null and a.thing_id in (select e.thing_id from private.list_edit e where e.id = any(p_ids) and e.kind = 'add' and e.folded_at is null);
  update private.fact f set removed_at = midnight
  where f.removed_at is null and f.thing_id in (select e.thing_id from private.list_edit e where e.id = any(p_ids) and e.kind = 'add' and e.folded_at is null);
  update private.list_edit e set folded_at = now() where e.id = any(p_ids) and e.folded_at is null;
end;
$$;

-- Privileges: the tables are granted to nobody; plor_app runs the five functions, each of which refuses a non-admin.
revoke all on table private.list_edit, private.list_seen from public, anon, authenticated, service_role;

revoke all on function private.list_guard(uuid, text), private.list_strike(uuid, text, text), private.list_unstrike(uuid, text, text),
  private.list_add(uuid, text, text, text), private.list_mark_seen(uuid, text), private.list_edits(uuid), private.list_fold(bigint[])
  from public, anon, authenticated, service_role;

grant execute on function private.list_strike(uuid, text, text), private.list_unstrike(uuid, text, text),
  private.list_add(uuid, text, text, text), private.list_mark_seen(uuid, text), private.list_edits(uuid) to plor_app;
