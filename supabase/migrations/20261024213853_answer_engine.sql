-- M13 13a-2: days built on the answer database (docs/milestones/M13-13a-the-base.md, "13a-2 and 13a-3"). A format-3
-- day keeps no copy of its lists: every typed answer is resolved against the base as of the day's approval, so a
-- started day never changes and the database grows with the base, not with days (human, 2026-10-24, on size).
-- Security change (DECISIONS.md Log): plor_app may execute private.resolve_answer and private.thing_names, which
-- read the base with their owner's rights and return only what a published day's answer needs.

-- A new thing takes the item's thing_id when it has one: the import computes it from the source entry, so the same
-- import gives the same IDs on every database (human, 2026-10-24: "Same everywhere (Recommended)"; M13 D3).
-- A thing merged from another source keeps its name, unless it had no name players can type (a taxon named by its
-- scientific name): then it takes the merging item's, so a WordNet "horse" merged into a Wikidata taxon shows as
-- "horse" (13a-1 review: display names after a merge).
create or replace function private.import_source(p_source text, p_snapshot text, p_items jsonb) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  ref text := p_source || ':' || p_snapshot;
  new_things int;
  new_aliases int;
  new_facts int;
  unknown text;
begin
  select string_agg(distinct i->>'same_as', ', ') into unknown
  from jsonb_array_elements(p_items) as i
  where i ? 'same_as' and private.thing_by_ref(p_source, i->>'same_as') is null;
  if unknown is not null then
    raise exception 'import_source: same_as refs unknown: %', left(unknown, 500);
  end if;

  -- New source IDs get a new thing, or the same_as one. "materialized" makes each random ID once, for both inserts.
  with item as materialized (
    select distinct on (i->>'id') i->>'id' as source_id, i->>'name' as name, private.thing_by_ref(p_source, i->>'same_as') as same,
      (i->>'thing_id')::uuid as given
    from jsonb_array_elements(p_items) as i
  ), fresh as materialized (
    select coalesce(n.same, n.given, gen_random_uuid()) as thing_id, n.source_id, n.name, n.same is null as is_new from item n
    where not exists (select from private.thing_source s where s.source = p_source and s.source_id = n.source_id)
  ), made as (
    insert into private.thing (id, name) select thing_id, name from fresh where is_new returning id
  ), linked as (
    insert into private.thing_source (source, source_id, thing_id) select p_source, source_id, thing_id from fresh
  ), renamed as (
    update private.thing t set name = f.name from fresh f
    where not f.is_new and t.id = f.thing_id
      and not exists (select from private.thing_alias a where a.thing_id = t.id and a.kind = 'name')
  )
  select count(*) into new_things from made;

  insert into private.thing_alias (thing_id, alias, kind, origin, source_ref)
  select s.thing_id, a->>'alias', a->>'kind', 'source', ref
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join jsonb_array_elements(i->'aliases') as a
  on conflict (thing_id, alias) do nothing;
  get diagnostics new_aliases = row_count;

  select string_agg(distinct v, ', ') into unknown
  from jsonb_array_elements(p_items) as i
  cross join (values ('kind_of'), ('member_of')) as t(trait)
  cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
  where private.thing_by_ref(p_source, v) is null;
  if unknown is not null then
    raise exception 'import_source: refs unknown: %', left(unknown, 500);
  end if;

  insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
  select s.thing_id, t.trait, private.thing_by_ref(p_source, v), 'source', ref
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join (values ('kind_of'), ('member_of')) as t(trait)
  cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
  where private.thing_by_ref(p_source, v) <> s.thing_id
  on conflict (thing_id, trait, value_thing) do nothing;
  get diagnostics new_facts = row_count;

  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'import', jsonb_build_object('snapshot', p_snapshot, 'items', jsonb_array_length(p_items),
    'things', new_things, 'aliases', new_aliases, 'facts', new_facts));
  return jsonb_build_object('things', new_things, 'aliases', new_aliases, 'facts', new_facts);
end;
$$;

-- A thing and everything above it in the kind_of tree, as the base stood at p_as_of.
create function private.ancestors_as_of(p_thing uuid, p_as_of timestamptz) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive up (id) as (
    select p_thing
    union
    select f.value_thing from private.fact f join up on f.thing_id = up.id where f.trait = 'kind_of' and f.added_at <= p_as_of
  )
  select id from up;
$$;
revoke all on function private.ancestors_as_of(uuid, timestamptz) from public, anon, authenticated, service_role;

-- The members a format-3 question accepts for some typed texts (normalized by the caller, src/game/matching.ts): for
-- each alias among p_texts, every thing that bears it and was a member of the question's category when the day was
-- approved (under its root, with a name players can type, and member_of its thing if it has one), whether the host
-- catches it (it is a host answer or under one: human, 2026-10-24, "Caught: bear covers it"), and its ancestors, so
-- the caller can pick among several. Only published days are read.
create function private.resolve_answer(p_game text, p_date date, p_index int, p_texts text[])
  returns table (alias text, thing_id uuid, caught boolean, ancestors uuid[])
  language plpgsql stable security definer set search_path = ''
as $$
declare
  q jsonb;
  as_of timestamptz;
  hosts uuid[];
begin
  select p.content->'questions'->p_index, (p.content->>'approved_at')::timestamptz into q, as_of
  from private.puzzle p where p.game_id = p_game and p.puzzle_date = p_date and p.content->>'format' = '3';
  if q is null or as_of is null then
    raise exception 'resolve_answer: % % has no approved format-3 question %', p_game, p_date, p_index;
  end if;
  select array_agg(h::uuid) into hosts from jsonb_array_elements_text(q->'host_answers') as h;
  return query
    select a.alias, a.thing_id, up.ids && hosts, up.ids
    from private.thing_alias a
    cross join lateral (select array_agg(x) as ids from private.ancestors_as_of(a.thing_id, as_of) as x) as up
    where a.alias = any(p_texts) and a.added_at <= as_of
      and a.thing_id <> (q->>'root')::uuid and (q->>'root')::uuid = any(up.ids)
      and exists (select from private.thing_alias n where n.thing_id = a.thing_id and n.kind = 'name' and n.added_at <= as_of)
      and (q->>'member_of' is null or exists (
        select from private.fact m
        where m.thing_id = a.thing_id and m.trait = 'member_of' and m.value_thing = (q->>'member_of')::uuid and m.added_at <= as_of));
end;
$$;
revoke all on function private.resolve_answer(text, date, int, text[]) from public, anon, authenticated, service_role;
grant execute on function private.resolve_answer(text, date, int, text[]) to plor_app;

-- The display names of things, for the reveal, the board and the insights.
create function private.thing_names(p_ids uuid[]) returns table (id uuid, name text)
  language sql stable security definer set search_path = ''
as $$
  select t.id, t.name from private.thing t where t.id = any(p_ids);
$$;
revoke all on function private.thing_names(uuid[]) from public, anon, authenticated, service_role;
grant execute on function private.thing_names(uuid[]) to plor_app;

-- Approving a format-3 day (DECISIONS.md, Puzzle approval; the admin page is still the one way in). Besides the M06
-- checks, it refuses a day whose questions don't hold up against the base, with every problem in one message (OB009):
-- an unknown category; a host bank entry that isn't a member; a host answer outside the host bank; a question with
-- no member the host doesn't catch that can still be typed (M04 rule 6). Whether a host answer's name avoids the
-- stolen letters is checked by the approve route, which normalizes names as the game does (src/content/puzzle.ts). It stores the day with approved_at, the moment its answers are
-- resolved as of, and per question its category's root and member_of, so a later change to the category leaves the
-- day as it was, and its member count, which the provisional bonus divides by (src/game/scoring.ts).
create or replace function private.approve_puzzle(p_user uuid, p_content jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  approved jsonb := '[]';
  q jsonb;
  cat private.category;
  stolen text := '';
  pattern text;
  hosts uuid[];
  bank uuid[];
  members int;
  problems text[] := '{}';
begin
  if not exists (select from private.admin where user_id = p_user) then
    raise exception 'admins_only: % is not an admin', p_user using errcode = 'OB007';
  end if;
  if (p_content ->> 'date')::date < private.today() then
    raise exception 'day_past: % % is over', p_content ->> 'game_id', p_content ->> 'date' using errcode = 'OB008';
  end if;
  if p_content ->> 'format' is distinct from '3' then
    raise exception 'puzzle_invalid: format 3 expected' using errcode = 'OB009';
  end if;
  for i in 0 .. jsonb_array_length(p_content -> 'questions') - 1 loop
    q := p_content -> 'questions' -> i;
    stolen := stolen || coalesce(q ->> 'steals', '');
    pattern := case when stolen = '' then null else '[' || stolen || ']' end;
    select * into cat from private.category where key = q ->> 'category';
    if not found then
      problems := problems || format('question %s: no category %s', i + 1, q ->> 'category');
      continue;
    end if;
    select coalesce(array_agg(x::uuid), '{}') into hosts from jsonb_array_elements_text(q -> 'host_answers') as x;
    select coalesce(array_agg(x::uuid), '{}') into bank from jsonb_array_elements_text(q -> 'host_bank') as x;
    create temp table if not exists approve_member (id uuid primary key) on commit drop;
    truncate approve_member;
    insert into approve_member select private.category_members(cat.key);
    members := (select count(*) from approve_member);
    problems := problems || array(
      select format('question %s: host bank entry %s is not a %s', i + 1, b, cat.key)
      from unnest(bank) as b where b not in (select id from approve_member));
    problems := problems || array(
      select format('question %s: host answer %s is not in the host bank', i + 1, h) from unnest(hosts) as h where h <> all (bank));
    -- What the host catches: the host answers and everything under them.
    if not exists (
      with recursive caught (id) as (
        select unnest(hosts)
        union
        select f.thing_id from private.fact f join caught c on f.value_thing = c.id where f.trait = 'kind_of'
      )
      select from approve_member m join private.thing_alias a on a.thing_id = m.id
      where m.id not in (select id from caught) and (pattern is null or a.alias !~ pattern)
    ) then
      problems := problems || format('question %s: no answer the host doesn''t catch can be typed without %s', i + 1, stolen);
    end if;
    approved := approved || jsonb_build_array(q || jsonb_build_object('root', cat.root, 'member_of', cat.member_of, 'members', members));
  end loop;
  if cardinality(problems) > 0 then
    raise exception 'puzzle_invalid: %', array_to_string(problems, '; ') using errcode = 'OB009';
  end if;
  insert into private.puzzle (game_id, puzzle_date, content)
  values (p_content ->> 'game_id', (p_content ->> 'date')::date, p_content || jsonb_build_object('questions', approved, 'approved_at', now()))
  on conflict (game_id, puzzle_date) do update set content = excluded.content;
end;
$$;
