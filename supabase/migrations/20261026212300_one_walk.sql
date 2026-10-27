-- M13 13e-5: the base's shape (docs/milestones/M13-13e-5-the-base-shape.md; human, 2026-10-26: "One tree-walk
-- function", "Yes, check on import (Recommended)"). The downward kind_of walk, written in category_members,
-- approve_puzzle's caught set, scripts/draft.ts and the review, becomes private.descendants_now; the upward one is
-- already private.ancestors_as_of. import_source refuses a kind_of circle, as load_links does (13e-2). No grant changes:
-- every replaced function keeps its signature and grants, and the new one is reached only through them and the
-- owner's scripts.

-- Things and everything under them in the kind_of tree now. "union" visits each thing once, so a circle can't loop.
create function private.descendants_now(p_things uuid[]) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive down (id) as (
    select unnest(p_things)
    union
    select f.thing_id from private.fact f join down d on f.value_thing = d.id where f.trait = 'kind_of' and f.removed_at is null
  )
  select id from down;
$$;
revoke all on function private.descendants_now(uuid[]) from public, anon, authenticated, service_role;

-- As 13e-4a's, refusing a kind_of circle.
create or replace function private.import_source(p_source text, p_snapshot text, p_items jsonb) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  ref text := p_source || ':' || p_snapshot;
  new_things int;
  new_aliases int;
  new_facts int;
  new_numbers int;
  unknown text;
  kids uuid[];
  parents uuid[];
  circle text;
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
  cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status')) as t(trait)
  cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
  where private.thing_by_ref(p_source, v) is null;
  if unknown is not null then
    raise exception 'import_source: refs unknown: %', left(unknown, 500);
  end if;

  with added as (
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
    select s.thing_id, t.trait, private.thing_by_ref(p_source, v), 'source', ref
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status')) as t(trait)
    cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    where private.thing_by_ref(p_source, v) <> s.thing_id
    on conflict (thing_id, trait, value_thing) do nothing
    returning thing_id, trait, value_thing
  )
  select count(*), coalesce(array_agg(thing_id) filter (where trait = 'kind_of'), '{}'),
    coalesce(array_agg(value_thing) filter (where trait = 'kind_of'), '{}')
  into new_facts, kids, parents from added;

  -- A circle in kind_of leaves the host-answer pick nothing to keep (ROADMAP, 13a-2 review), and joins make one likelier
  -- (13e-5; human, 2026-10-26: "Yes, check on import (Recommended)"). Any new circle runs through a new fact, so only
  -- those are checked: a new fact's child already above its parent. Each parent is walked up once. The exception undoes
  -- the whole import.
  select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.child, p.name, n.parent, p.name, c.name)
  into circle
  from (select distinct x.parent from unnest(parents) as x(parent)) as top
  cross join lateral private.ancestors_as_of(top.parent, now()) as above(id)
  join unnest(kids, parents) as n(child, parent) on n.parent = top.parent and n.child = above.id
  join private.thing c on c.id = n.child
  join private.thing p on p.id = n.parent
  limit 1;
  if circle is not null then
    raise exception 'import_source: a kind_of circle: %', circle;
  end if;

  -- A population that changed ends the old one now, then the new one is added: two statements, so the current-row
  -- unique index never sees both.
  update private.number_fact n set removed_at = now()
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'population' and n.thing_id = s.thing_id and n.trait = 'population' and n.removed_at is null
    and n.value <> (i->'population'->>'value')::numeric;
  insert into private.number_fact (thing_id, trait, value, as_of, origin, source_ref)
  select s.thing_id, 'population', (i->'population'->>'value')::numeric, (i->'population'->>'as_of')::date, 'source', ref
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'population' and not exists (
    select from private.number_fact n where n.thing_id = s.thing_id and n.trait = 'population' and n.removed_at is null);
  get diagnostics new_numbers = row_count;

  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'import', jsonb_build_object('snapshot', p_snapshot, 'items', jsonb_array_length(p_items),
    'things', new_things, 'aliases', new_aliases, 'facts', new_facts, 'numbers', new_numbers));
  return jsonb_build_object('things', new_things, 'aliases', new_aliases, 'facts', new_facts, 'numbers', new_numbers);
end;
$$;

-- As 13e-4b's, walking with descendants_now.
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
    and private.fits_where(u.id, cat.filter, now())
  union
  select e.thing_id from private.category_extra e where e.category = p_key and e.removed_at is null;
$$;

-- As 13e-4a's, the host's caught set walked with descendants_now.
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
  member_ids uuid[];
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
    -- In a variable, not a temp table: a security-definer function must not touch a relation the caller's session
    -- could have created first in pg_temp (PostgreSQL 17, "Writing SECURITY DEFINER Functions Safely"; 13a-2 review).
    member_ids := array(select private.category_members(cat.key));
    members := cardinality(member_ids);
    problems := problems || array(
      select format('question %s: host bank entry %s is not a %s', i + 1, b, cat.key)
      from unnest(bank) as b where b <> all (member_ids));
    -- The bonus's first guess splits each tier among its members (src/game/scoring.ts, firstGuess), so a level on a
    -- thing outside the category would skew every rare answer's share (13c review).
    problems := problems || array(
      select format('question %s: level on %s, which is not a %s', i + 1, l, cat.key)
      from jsonb_object_keys(coalesce(q -> 'levels', '{}')) as l where l::uuid <> all (member_ids));
    problems := problems || array(
      select format('question %s: host answer %s is not in the host bank', i + 1, h) from unnest(hosts) as h where h <> all (bank));
    -- Three familiar answers (common or uncommon in the day's levels) the host doesn't catch, the host answers and
    -- everything under them, that can be typed past the letters stolen so far (human, 2026-10-24: "Typeable and safe
    -- (Recommended)"; FAMILIAR_SAFE_MIN in src/config/tunables.ts, which scripts/draft.ts uses to pick the letters).
    if (
      select count(distinct m.id) from unnest(member_ids) as m(id) join private.thing_alias a on a.thing_id = m.id
      where a.removed_at is null and m.id not in (select private.descendants_now(hosts)) and (pattern is null or a.alias !~ pattern)
        and (cat.starts_with is null or private.alias_starts(a.alias, cat.starts_with))
        and q -> 'levels' ? m.id::text
    ) < 3 then
      problems := problems || format('question %s: fewer than 3 familiar answers the host doesn''t catch can be typed without %s', i + 1, stolen);
    end if;
    approved := approved || jsonb_build_array(q || jsonb_build_object('root', cat.root, 'member_of', cat.member_of, 'members', members)
      || case when private.category_where(cat) is null then '{}' else jsonb_build_object('where', private.category_where(cat)) end);
  end loop;
  if cardinality(problems) > 0 then
    raise exception 'puzzle_invalid: %', array_to_string(problems, '; ') using errcode = 'OB009';
  end if;
  insert into private.puzzle (game_id, puzzle_date, content)
  values (p_content ->> 'game_id', (p_content ->> 'date')::date, p_content || jsonb_build_object('questions', approved, 'approved_at', now()))
  on conflict (game_id, puzzle_date) do update set content = excluded.content;
end;
$$;
