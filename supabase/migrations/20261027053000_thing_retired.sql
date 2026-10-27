-- M13 13e-5b: Wikidata's own doubles (docs/milestones/M13-13e-5b-wikidata-doubles.md). Hard to reverse (DECISIONS.md
-- Log, 2026-10-27): a join or a merge retires a thing ID, and private.thing_retired keeps it pointing at its thing
-- (human, 2026-10-27: "Keep pointing (Recommended)"). import_source takes merged_into, a merge within one source, and
-- names a thing WordNet joins by the joining item's name, which the load picks (scripts/base.ts, shownNames). Readers that take thing IDs from files resolve them: approve_puzzle
-- and thing_names, with their owners' rights, so plor_app needs no new grant.

-- Each retired ID and the thing it now names. Written by import_source only.
create table private.thing_retired (
  id uuid primary key,
  thing_id uuid not null references private.thing (id) on delete cascade,
  retired_at timestamptz not null default now(),
  source_ref text not null
);
create index thing_retired_thing on private.thing_retired (thing_id);
-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles; only functions with their
-- owners' rights read it.
alter table private.thing_retired enable row level security;
revoke all on table private.thing_retired from public, anon, authenticated, service_role;

-- The thing an ID names now: itself, or the thing a join or merge folded it into.
create function private.thing_now(p_id uuid) returns uuid
  language sql stable set search_path = ''
as $$
  select coalesce((select r.thing_id from private.thing_retired r where r.id = p_id), p_id);
$$;
revoke all on function private.thing_now(uuid) from public, anon, authenticated, service_role;

-- Names for the IDs a page holds, a retired one included (the admin puzzles page reads drafts' IDs from files).
create or replace function private.thing_names(p_ids uuid[]) returns table (id uuid, name text)
  language sql stable security definer set search_path = ''
as $$
  select x.id, t.name from unnest(p_ids) as x(id) join private.thing t on t.id = private.thing_now(x.id);
$$;

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
  bad text;
begin
  -- A merge names a kept item of the same source, in this batch or already loaded; never both same_as and merged_into.
  with kept as (
    select p_source || ':' || (k->>'id') as ref from jsonb_array_elements(p_items) as k where not k ? 'merged_into'
  )
  select string_agg(distinct i->>'id', ', ') into bad
  from jsonb_array_elements(p_items) as i left join kept on kept.ref = i->>'merged_into'
  where i ? 'merged_into' and (i ? 'same_as' or (kept.ref is null and private.thing_by_ref(p_source, i->>'merged_into') is null));
  if bad is not null then
    raise exception 'import_source: merged_into must name a kept item of this source, and not beside same_as: %', left(bad, 500);
  end if;
  -- A merge reaches only items not loaded yet: one already loaded as its own thing would keep it silently.
  with kept as (
    select p_source || ':' || (k->>'id') as ref, (k->>'thing_id')::uuid as given from jsonb_array_elements(p_items) as k where not k ? 'merged_into'
  )
  select string_agg(distinct i->>'id', ', ') into bad
  from jsonb_array_elements(p_items) as i left join kept on kept.ref = i->>'merged_into'
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'merged_into' and s.thing_id is distinct from coalesce(private.thing_by_ref(p_source, i->>'merged_into'), kept.given);
  if bad is not null then
    raise exception 'import_source: already loaded as their own things, so they can''t merge now (npx supabase db reset, then npm run base -- load all): %', left(bad, 500);
  end if;

  select string_agg(distinct i->>'same_as', ', ') into unknown
  from jsonb_array_elements(p_items) as i
  where i ? 'same_as' and private.thing_by_ref(p_source, i->>'same_as') is null;
  if unknown is not null then
    raise exception 'import_source: same_as refs unknown: %', left(unknown, 500);
  end if;

  -- New source IDs get a new thing, or the same_as one, or the kept item's for a merge (13e-5b: the kept item's thing
  -- when loaded, else its given ID in this batch). "materialized" makes each random ID once, for both inserts.
  -- The kept items a merge can name in this batch, joined once (a lookup per item scanned the batch for each).
  with kept as materialized (
    select p_source || ':' || (k->>'id') as ref, (k->>'thing_id')::uuid as given
    from jsonb_array_elements(p_items) as k where not k ? 'merged_into'
  ), item as materialized (
    select distinct on (i->>'id') i->>'id' as source_id, i->>'name' as name, i ? 'same_as' as joined,
      coalesce(private.thing_by_ref(p_source, i->>'same_as'), private.thing_by_ref(p_source, i->>'merged_into'), kept.given) as same,
      (i->>'thing_id')::uuid as given
    from jsonb_array_elements(p_items) as i left join kept on kept.ref = i->>'merged_into'
  ), fresh as materialized (
    select coalesce(n.same, n.given, gen_random_uuid()) as thing_id, n.source_id, n.name, n.same is null as is_new, n.joined, n.given from item n
    where not exists (select from private.thing_source s where s.source = p_source and s.source_id = n.source_id)
  ), made as (
    insert into private.thing (id, name) select thing_id, name from fresh where is_new returning id
  ), linked as (
    insert into private.thing_source (source, source_id, thing_id) select p_source, source_id, thing_id from fresh
  ), retired as (
    -- A join or a merge retires the ID the item would have had; files naming it still find its thing (DECISIONS.md
    -- Log, 2026-10-27: "Keep pointing").
    insert into private.thing_retired (id, thing_id, source_ref)
    select f.given, f.thing_id, ref from fresh f where not f.is_new and f.given is not null and f.given <> f.thing_id
    on conflict (id) do nothing
  ), renamed as (
    -- A joining WordNet item's name is the thing's shown name; the load picks it (scripts/base.ts, shownNames; 13e-5b,
    -- human, 2026-10-27: "Keep a name WordNet lists (Recommended)").
    update private.thing t set name = f.name from fresh f
    where not f.is_new and t.id = f.thing_id
      and ((p_source = 'oewn' and f.joined) or not exists (select from private.thing_alias a where a.thing_id = t.id and a.kind = 'name'))
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
  -- A day's thing IDs come from its file, so an ID a join or merge retired is read as its thing's (13e-5b), and the day
  -- is stored with the current IDs. Two IDs the file holds apart that now name one thing would lose a level or repeat
  -- an answer, so they're refused.
  problems := problems || array(
    select format('question %s: %s name one thing now (%s)', x.n, string_agg(i.id, ' and '), private.thing_now(i.id::uuid))
    from jsonb_array_elements(p_content -> 'questions') with ordinality as x(q, n)
    cross join lateral (
      select h as id, 'host_bank' as part from jsonb_array_elements_text(x.q -> 'host_bank') as h
      union all select l, 'levels' from jsonb_object_keys(coalesce(x.q -> 'levels', '{}')) as l
    ) as i
    group by x.n, i.part, private.thing_now(i.id::uuid) having count(distinct i.id) > 1);
  p_content := jsonb_set(p_content, '{questions}', (
    select coalesce(jsonb_agg(x.q || jsonb_build_object(
      'host_answers', (select coalesce(jsonb_agg(private.thing_now(h::uuid)), '[]') from jsonb_array_elements_text(x.q -> 'host_answers') as h),
      'host_bank', (select coalesce(jsonb_agg(private.thing_now(b::uuid)), '[]') from jsonb_array_elements_text(x.q -> 'host_bank') as b),
      'levels', (select coalesce(jsonb_object_agg(private.thing_now(l.key::uuid), l.value), '{}') from jsonb_each(coalesce(x.q -> 'levels', '{}')) as l)
    ) order by x.n), '[]')
    from jsonb_array_elements(p_content -> 'questions') with ordinality as x(q, n)));
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
