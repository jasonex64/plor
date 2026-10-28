-- The load's gaps (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3b-1; ROADMAP, "From the 13f-3a review";
-- human, 2026-10-28: "All eight now", "Keep while unfinished (Recommended)", "Name them, keep going (Recommended)").
-- A load is open in the session that holds its lock, from load_begin to load_finish:
-- 1. one load at a time: a second load_begin is refused while another session's load is open;
-- 2. only an open load marks what the files give, so a single `load <set>` and the suites' imports leave no load_seen rows;
-- 3. a ref to an item no import of this load gave (one that left its snapshot) is refused, as a fresh load refuses it;
-- 4. the circle checks walk the base as the files give it (what this load has marked, and players' and the admin's
--    facts), and load_finish checks again the facts this load added or brought back;
-- 5. the shown name the files give follows import_source's rename by a joining or merged item too;
-- 6. a category stays while an unfinished run of a day naming it exists, and record_miss refuses a missing category;
-- 7. load_finish names the approved days not started yet whose host answers it changed.

-- Every item an import of the open load gave, by source and ID (3).
create table private.load_seen_item (
  source text not null,
  source_id text not null,
  primary key (source, source_id)
);
alter table private.load_seen_item enable row level security;
revoke all on private.load_seen_item from public, anon, authenticated, service_role;
-- fresh: a fact this load added or brought back, which load_finish checks for circles again (4).
alter table private.load_seen_fact add column fresh boolean not null default false;

-- The session's load lock, a session-level advisory lock keyed by load_seen_item, so it outlives each set's
-- transaction and goes with the session if the load script dies.
create function private.load_open() returns boolean
  language sql stable set search_path = ''
  return exists (select from pg_catalog.pg_locks l
    where l.locktype = 'advisory' and l.pid = pg_catalog.pg_backend_pid() and l.granted
      and l.classid = 'private.load_seen_item'::regclass and l.objid = 0 and l.objsubid = 2);

-- Whether an import of the open load gave the item a ref names: "source:id", or an ID in p_source (as thing_by_ref).
-- One key lookup: thing_by_ref's two-branch "or" read the whole table for each ref once it held a load's items (a
-- reload stalled at 5 sets in 15 minutes).
create function private.load_ref_seen(p_source text, p_ref text) returns boolean
  language sql stable set search_path = ''
  return exists (select from private.load_seen_item s
    where s.source = case when position(':' in p_ref) > 0 then split_part(p_ref, ':', 1) else p_source end
      and s.source_id = case when position(':' in p_ref) > 0 then substr(p_ref, position(':' in p_ref) + 1) else p_ref end);

-- The kind_of ancestors as the files of the open load give them: owned facts this load marked, and every fact a
-- load doesn't own (players', the admin's). A row the files no longer give still counts for today (it ends at
-- midnight), but not for the circle checks: a fresh load of the same files wouldn't have it (4).
create function private.load_ancestors(p_thing uuid) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive up (id) as (
    select p_thing
    union
    select f.value_thing from private.fact f join up on f.thing_id = up.id
    where f.trait = 'kind_of' and (f.removed_at is null or f.removed_at > now())
      and (not (f.origin = 'source' or (f.origin = 'ai' and f.source_ref = 'links'))
        or exists (select from private.load_seen_fact s where s.thing_id = f.thing_id and s.trait = 'kind_of' and s.value_thing = f.value_thing))
  )
  select id from up;
$$;

revoke all on function private.load_open(), private.load_ref_seen(text, text), private.load_ancestors(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.import_source(p_source text, p_snapshot text, p_items jsonb) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  ref text := p_source || ':' || p_snapshot;
  open boolean := private.load_open();
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
  -- An open load marks every item it gives first, so refs between items of this batch count (3).
  if open then
    insert into private.load_seen_item (source, source_id)
    select p_source, i->>'id' from jsonb_array_elements(p_items) as i
    on conflict do nothing;
    -- A ref to an item the base has but no import of this load gave: a fresh load of the same files would refuse it
    -- as unknown (13f-3a review). Refs the base lacks fall to the checks below.
    with refs (r) as (
      select i->>'same_as' from jsonb_array_elements(p_items) as i where i ? 'same_as'
      union
      select i->>'merged_into' from jsonb_array_elements(p_items) as i where i ? 'merged_into'
      union
      select v from jsonb_array_elements(p_items) as i
      cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
      cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    )
    select string_agg(r, ', ' order by r) into bad
    from refs where private.thing_by_ref(p_source, r) is not null and not private.load_ref_seen(p_source, r);
    if bad is not null then
      raise exception 'import_source: refs to items no file of this load gives (they left their snapshot, or load after this set): %', left(bad, 500);
    end if;
  end if;

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

  -- The shown name the files give each thing, as the renames above pick it on a fresh load (5): a joining WordNet item's
  -- name, or the name of a joining or merged item whose thing has no name the files give yet, replaces (strong); else
  -- the name of the item the thing was made from. A join or merge renames only a thing an earlier import made: one this
  -- batch makes doesn't exist yet for the rename's statement. load_finish shows it, so a load on a loaded base shows
  -- what a fresh one does (13f-3a; 13f-1's review: "cornet" kept on a live base). After the batch's items are linked
  -- (a fresh load's new items have no thing before), and before its names are marked, as the fresh rename reads the
  -- names before this batch's are added.
  if open then
    with batch as materialized (
      select p_source || ':' || (b->>'id') as ref from jsonb_array_elements(p_items) as b
    ), named as (
      select s.thing_id, i->>'name' as name, i->>'id' as id,
        (i ? 'same_as' or i ? 'merged_into')
        and not exists (select from batch
          where batch.ref = case when position(':' in coalesce(i->>'same_as', i->>'merged_into')) > 0
            then coalesce(i->>'same_as', i->>'merged_into') else p_source || ':' || coalesce(i->>'same_as', i->>'merged_into') end)
        and ((p_source = 'oewn' and i ? 'same_as') or not exists (
          select from private.thing_alias a where a.thing_id = s.thing_id and a.kind = 'name' and (a.removed_at is null or a.removed_at > now())
            and (a.origin <> 'source' or exists (select from private.load_seen_alias x where x.thing_id = a.thing_id and x.alias = a.alias)))) as strong,
        not (i ? 'same_as' or i ? 'merged_into') as made
      from jsonb_array_elements(p_items) as i
      join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    )
    insert into private.load_seen_name (thing_id, name, strong)
    select distinct on (thing_id) thing_id, name, strong from named
    where strong or made
    order by thing_id, strong desc, id
    on conflict (thing_id) do update set name = excluded.name, strong = true where excluded.strong;
  end if;

  insert into private.thing_alias (thing_id, alias, kind, origin, source_ref)
  select s.thing_id, a->>'alias', a->>'kind', 'source', ref
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join jsonb_array_elements(i->'aliases') as a
  on conflict (thing_id, alias) do nothing;
  get diagnostics new_aliases = row_count;

  -- A name waiting for midnight that the files give again stays (13f-3a; any import does it, so a single `load <set>`
  -- and the suites' fixture loads too).
  update private.thing_alias a set removed_at = null
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join jsonb_array_elements(i->'aliases') as x
  where a.thing_id = s.thing_id and a.alias = x->>'alias' and a.origin = 'source' and a.removed_at > now();

  -- Every name the files give, already loaded or not, so load_finish ends the ones they no longer give (13f-3a).
  if open then
    insert into private.load_seen_alias (thing_id, alias)
    select s.thing_id, a->>'alias'
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join jsonb_array_elements(i->'aliases') as a
    on conflict do nothing;
  end if;

  select string_agg(distinct v, ', ') into unknown
  from jsonb_array_elements(p_items) as i
  cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
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
    cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
    cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    where private.thing_by_ref(p_source, v) <> s.thing_id
    on conflict (thing_id, trait, value_thing) do nothing
    returning thing_id, trait, value_thing
  )
  select count(*), coalesce(array_agg(thing_id) filter (where trait = 'kind_of'), '{}'),
    coalesce(array_agg(value_thing) filter (where trait = 'kind_of'), '{}')
  into new_facts, kids, parents from added;

  -- A fact waiting for midnight that the files give again stays, and every fact the files give is marked, as for names.
  -- In an open load one brought back is checked for circles as a new one is, and both are fresh for load_finish's
  -- check (4).
  with revived as (
    update private.fact f set removed_at = null
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
    cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    where f.thing_id = s.thing_id and f.trait = t.trait and f.value_thing = private.thing_by_ref(p_source, v)
      and f.origin = 'source' and f.removed_at > now()
    returning f.thing_id, f.trait, f.value_thing
  )
  select kids || coalesce(array_agg(thing_id) filter (where open and trait = 'kind_of'), '{}'),
    parents || coalesce(array_agg(value_thing) filter (where open and trait = 'kind_of'), '{}')
  into kids, parents from revived;
  if open then
    insert into private.load_seen_fact (thing_id, trait, value_thing)
    select s.thing_id, t.trait, private.thing_by_ref(p_source, v)
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
    cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    where private.thing_by_ref(p_source, v) <> s.thing_id
    on conflict do nothing;
    update private.load_seen_fact s set fresh = true
    from unnest(kids, parents) as n(child, parent)
    where s.thing_id = n.child and s.trait = 'kind_of' and s.value_thing = n.parent;
  end if;

  -- A circle in kind_of leaves the host-answer pick nothing to keep (ROADMAP, 13a-2 review), and joins make one likelier
  -- (13e-5; human, 2026-10-26: "Yes, check on import (Recommended)"). Any new circle runs through a new fact, so only
  -- those are checked: a new fact's child already above its parent. Each parent is walked up once. The exception undoes
  -- the whole import. In an open load the walk reads the base as the files give it (4): a re-fetch that reverses an
  -- edge loads as it does fresh, and load_finish catches a circle a later set closes.
  if open then
    select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.child, p.name, n.parent, p.name, c.name)
    into circle
    from (select distinct x.parent from unnest(parents) as x(parent)) as top
    cross join lateral private.load_ancestors(top.parent) as above(id)
    join unnest(kids, parents) as n(child, parent) on n.parent = top.parent and n.child = above.id
    join private.thing c on c.id = n.child
    join private.thing p on p.id = n.parent
    limit 1;
  else
    select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.child, p.name, n.parent, p.name, c.name)
    into circle
    from (select distinct x.parent from unnest(parents) as x(parent)) as top
    cross join lateral private.ancestors_as_of(top.parent, now()) as above(id)
    join unnest(kids, parents) as n(child, parent) on n.parent = top.parent and n.child = above.id
    join private.thing c on c.id = n.child
    join private.thing p on p.id = n.parent
    limit 1;
  end if;
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
  if open then
    insert into private.load_seen_number (thing_id, trait)
    select s.thing_id, 'population'
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    where i ? 'population'
    on conflict do nothing;
  end if;

  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'import', jsonb_build_object('snapshot', p_snapshot, 'items', jsonb_array_length(p_items),
    'things', new_things, 'aliases', new_aliases, 'facts', new_facts, 'numbers', new_numbers));
  return jsonb_build_object('things', new_things, 'aliases', new_aliases, 'facts', new_facts, 'numbers', new_numbers);
end;
$$;

create or replace function private.load_links(p_links jsonb) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  open boolean := private.load_open();
  link jsonb;
  child uuid;
  parent uuid;
  added int := 0;
  n int;
  fresh boolean;
begin
  for link in select * from jsonb_array_elements(p_links) loop
    child := private.thing_by_ref('oewn', link ->> 'thing');
    parent := private.thing_by_ref('oewn', link ->> 'kind_of');
    if child is null or parent is null then
      raise exception 'link %: % or % is not in the base', link, link ->> 'thing', link ->> 'kind_of';
    end if;
    -- As import_source's refs: an item no import of this load gave would be unknown to a fresh load (3).
    if open and not (private.load_ref_seen('oewn', link ->> 'thing') and private.load_ref_seen('oewn', link ->> 'kind_of')) then
      raise exception 'link %: % or % is no longer in the files this load gives', link, link ->> 'thing', link ->> 'kind_of';
    end if;
    -- On a loaded base a rename lands in load_finish, after the links, so the name the files give counts (13f-3a review).
    if (select coalesce(s.name, t.name) from private.thing t left join private.load_seen_name s on s.thing_id = t.id where t.id = child)
        is distinct from link ->> 'name'
      or (select coalesce(s.name, t.name) from private.thing t left join private.load_seen_name s on s.thing_id = t.id where t.id = parent)
        is distinct from link ->> 'kind_of_name' then
      raise exception 'link %: the base names them % and %', link,
        (select name from private.thing where id = child), (select name from private.thing where id = parent);
    end if;
    if (open and child in (select private.load_ancestors(parent)))
      or (not open and child in (select private.ancestors_as_of(parent, now()))) then
      raise exception 'link %: % is already above %, so the link would make a cycle', link, link ->> 'name', link ->> 'kind_of_name';
    end if;
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
    values (child, 'kind_of', parent, 'ai', 'links')
    on conflict (thing_id, trait, value_thing) do nothing;
    get diagnostics n = row_count;
    fresh := n > 0;
    update private.fact set removed_at = null
    where thing_id = child and trait = 'kind_of' and value_thing = parent and origin = 'ai' and source_ref = 'links' and removed_at > now();
    fresh := fresh or found;
    if open then
      insert into private.load_seen_fact (thing_id, trait, value_thing, fresh) values (child, 'kind_of', parent, fresh)
      on conflict (thing_id, trait, value_thing) do update set fresh = load_seen_fact.fresh or excluded.fresh;
    end if;
    added := added + n;
  end loop;
  insert into private.base_log (actor, action, detail)
  values ('links', 'link', jsonb_build_object('links', jsonb_array_length(p_links), 'added', added));
  return jsonb_build_object('links', jsonb_array_length(p_links), 'added', added);
end;
$$;

-- As 13f-3a's, holding the session's load lock until load_finish (1); a session that already holds it keeps it.
create or replace function private.load_begin() returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  cutoff timestamptz := (private.today() - 1)::timestamp at time zone 'America/Los_Angeles';
  erased_aliases int;
  erased_facts int;
  erased_numbers int;
begin
  if not private.load_open() and not pg_catalog.pg_try_advisory_lock('private.load_seen_item'::regclass::oid::int, 0) then
    raise exception 'load_begin: another load is running; wait for it to finish';
  end if;
  delete from private.thing_alias where origin = 'source' and removed_at <= cutoff;
  get diagnostics erased_aliases = row_count;
  delete from private.fact
  where (origin = 'source' or (origin = 'ai' and source_ref = 'links')) and removed_at <= cutoff;
  get diagnostics erased_facts = row_count;
  delete from private.number_fact where origin = 'source' and removed_at <= cutoff;
  get diagnostics erased_numbers = row_count;
  truncate private.load_seen_alias, private.load_seen_fact, private.load_seen_number, private.load_seen_name, private.load_seen_item;
  if erased_aliases + erased_facts + erased_numbers > 0 then
    insert into private.base_log (actor, action, detail)
    values ('load', 'erase', jsonb_build_object('aliases', erased_aliases, 'facts', erased_facts, 'numbers', erased_numbers));
  end if;
  return jsonb_build_object('aliases', erased_aliases, 'facts', erased_facts, 'numbers', erased_numbers);
end;
$$;

-- As 13f-3a's, and: only in the session whose load is open; a circle a later set closed through a fact this load added
-- or brought back is refused (4); a dropped category is kept while an unfinished run of a day naming it exists (6);
-- and the approved days not started yet whose host answers lost a name, a fact or a link, or were renamed, are named
-- (7). It releases the load lock.
create or replace function private.load_finish(p_categories text[]) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  midnight timestamptz := (private.today() + 1)::timestamp at time zone 'America/Los_Angeles';
  ending_aliases int;
  ending_facts int;
  ending_links int;
  ending_numbers int;
  renamed int;
  named_off uuid[];
  facts_off uuid[];
  links_off uuid[];
  renamed_things uuid[];
  erased_categories text[];
  kept_categories text[];
  touched jsonb;
  circle text;
begin
  if not private.load_open() then
    raise exception 'load_finish: no load is open in this session (private.load_begin)';
  end if;

  -- On a fresh load every fact is fresh and import_source has checked each against all the ones before it; facts this
  -- load found already loaded can close a circle through a fresh one only after its check, so they're walked again.
  if exists (select from private.load_seen_fact where trait = 'kind_of' and not fresh) then
    select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.thing_id, p.name, n.value_thing, p.name, c.name)
    into circle
    from (select distinct value_thing from private.load_seen_fact where trait = 'kind_of' and fresh) as top
    cross join lateral private.load_ancestors(top.value_thing) as above(id)
    join private.load_seen_fact n on n.trait = 'kind_of' and n.fresh and n.value_thing = top.value_thing and n.thing_id = above.id
    join private.thing c on c.id = n.thing_id
    join private.thing p on p.id = n.value_thing
    limit 1;
    if circle is not null then
      raise exception 'load_finish: a kind_of circle: %', circle;
    end if;
  end if;

  with ended as (
    update private.thing_alias a set removed_at = midnight
    where a.origin = 'source' and a.removed_at is null
      and not exists (select from private.load_seen_alias s where s.thing_id = a.thing_id and s.alias = a.alias)
    returning a.thing_id
  )
  select count(*), coalesce(array_agg(distinct thing_id), '{}') into ending_aliases, named_off from ended;
  with ended as (
    update private.fact f set removed_at = midnight
    where f.origin = 'source' and f.removed_at is null
      and not exists (select from private.load_seen_fact s where s.thing_id = f.thing_id and s.trait = f.trait and s.value_thing = f.value_thing)
    returning f.thing_id
  )
  select count(*), coalesce(array_agg(distinct thing_id), '{}') into ending_facts, facts_off from ended;
  with ended as (
    update private.fact f set removed_at = midnight
    where f.origin = 'ai' and f.source_ref = 'links' and f.removed_at is null
      and not exists (select from private.load_seen_fact s where s.thing_id = f.thing_id and s.trait = f.trait and s.value_thing = f.value_thing)
    returning f.thing_id
  )
  select count(*), coalesce(array_agg(distinct thing_id), '{}') into ending_links, links_off from ended;
  update private.number_fact n set removed_at = midnight
  where n.origin = 'source' and n.removed_at is null
    and not exists (select from private.load_seen_number s where s.thing_id = n.thing_id and s.trait = n.trait);
  get diagnostics ending_numbers = row_count;

  with changed as (
    update private.thing t set name = s.name
    from private.load_seen_name s
    where t.id = s.thing_id and t.name <> s.name
    returning t.id
  )
  select count(*), coalesce(array_agg(id), '{}') into renamed, renamed_things from changed;

  -- An approved day not started yet keeps what it was approved with only until its start, when it reads the base as it
  -- is then; each one this load changed is named, so the admin can check it again (human, 2026-10-28: "Name them, keep
  -- going (Recommended)").
  select coalesce(jsonb_agg(jsonb_build_object('date', p.puzzle_date, 'question', q.idx, 'answer', t.name, 'changes', ch.changes)
    order by p.puzzle_date, q.idx, t.name), '[]')
  into touched
  from private.puzzle p
  cross join jsonb_array_elements(p.content -> 'questions') with ordinality as q(v, idx)
  cross join jsonb_array_elements_text(coalesce(q.v -> 'host_answers', '[]')) as h(id)
  join private.thing t on t.id = h.id::uuid
  cross join lateral (select array_remove(array[
    case when t.id = any (named_off) then 'name ended' end,
    case when t.id = any (facts_off) then 'fact ended' end,
    case when t.id = any (links_off) then 'link ended' end,
    case when t.id = any (renamed_things) then 'renamed' end], null) as changes) as ch
  where p.puzzle_date > private.today() and p.content ? 'approved_at' and cardinality(ch.changes) > 0;

  select coalesce(array_agg(c.key order by c.key), '{}') into kept_categories
  from private.category c
  where c.key <> all (p_categories)
    and (exists (select from private.miss_review r where r.category = c.key)
      or exists (select from private.category_extra e where e.category = c.key)
      or exists (select from private.puzzle p cross join jsonb_array_elements(p.content -> 'questions') as q
        where p.puzzle_date >= private.today() - 1 and q ->> 'category' = c.key)
      -- A run waits at a reveal until Next, so a day of any age can still be played on (DECISIONS.md, Timer; human,
      -- 2026-10-28: "Keep while unfinished (Recommended)").
      or exists (select from private.run_status s
        join private.puzzle p on p.game_id = s.game_id and p.puzzle_date = s.puzzle_date
        cross join jsonb_array_elements(p.content -> 'questions') as q
        where s.status = 'in_progress' and q ->> 'category' = c.key));
  with gone as (
    delete from private.category c where c.key <> all (p_categories) and c.key <> all (kept_categories) returning c.key
  )
  select coalesce(array_agg(key order by key), '{}') into erased_categories from gone;

  truncate private.load_seen_alias, private.load_seen_fact, private.load_seen_number, private.load_seen_name, private.load_seen_item;
  perform pg_catalog.pg_advisory_unlock('private.load_seen_item'::regclass::oid::int, 0);
  insert into private.base_log (actor, action, detail)
  values ('load', 'erase', jsonb_build_object('at', midnight, 'aliases', ending_aliases, 'facts', ending_facts,
    'links', ending_links, 'numbers', ending_numbers, 'renamed', renamed,
    'categories', to_jsonb(erased_categories), 'kept_categories', to_jsonb(kept_categories), 'touched', touched));
  return jsonb_build_object('at', midnight, 'aliases', ending_aliases, 'facts', ending_facts, 'links', ending_links,
    'numbers', ending_numbers, 'renamed', renamed,
    'categories', to_jsonb(erased_categories), 'kept_categories', to_jsonb(kept_categories), 'touched', touched);
end;
$$;

-- As 13e-4a's, refusing a day whose question names a category the base doesn't have, where it returned without a word
-- (13f-3a review): load_finish keeps a category while an unfinished run of a day naming it exists (6), so a missing
-- one is a fault.
create or replace function private.record_miss(p_user uuid, p_game text, p_date date, p_index int, p_typed text, p_text text,
  p_near_typo boolean, p_listed boolean, p_min_players int, p_share_percent numeric) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  cat private.category;
  typed_by int;
  answered int;
  outcome text;
  made uuid;
begin
  insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed, normalized)
  select s.user_id, s.game_id, s.puzzle_date, p_index, p_typed, p_text
  from private.run_status s
  where s.user_id = p_user and s.game_id = p_game and s.puzzle_date = p_date and s.status = 'in_progress' and s.answered = p_index;
  if not found then
    return false;
  end if;
  if p_text = '' then
    return true;
  end if;
  select c.* into cat from private.puzzle p join private.category c on c.key = p.content -> 'questions' -> p_index ->> 'category'
  where p.game_id = p_game and p.puzzle_date = p_date;
  if not found then
    raise exception 'record_miss: % % question % names a category the base doesn''t have', p_game, p_date, p_index;
  end if;
  if cat.starts_with is not null and not private.alias_starts(p_text, cat.starts_with) then
    return true;
  end if;
  -- Two players reaching the threshold at once decide it once.
  perform pg_advisory_xact_lock(hashtextextended('miss:' || cat.key || ':' || p_text, 0));
  if exists (select from private.miss_review r where r.category = cat.key and r.text = p_text) then
    return true;
  end if;
  select count(distinct m.user_id) into typed_by
  from private.missed_answer m join private.category_questions(cat.key) q using (game_id, puzzle_date, question_idx)
  where m.normalized = p_text;
  if typed_by < p_min_players then
    return true;
  end if;
  select count(distinct x.user_id) into answered
  from (
    select m.user_id, m.game_id, m.puzzle_date, m.question_idx from private.missed_answer m
    union all
    select e.user_id, e.game_id, e.puzzle_date, e.question_idx from private.run_event e
  ) x join private.category_questions(cat.key) q using (game_id, puzzle_date, question_idx);
  if typed_by * 100 < answered * p_share_percent then
    return true;
  end if;
  -- Already a member since this day started (imported, or linked by the human): nothing to learn.
  if exists (select from private.thing_alias a where a.alias = p_text and a.removed_at is null and private.in_category_now(a.thing_id, cat.key)) then
    return true;
  end if;
  outcome := case
    when p_near_typo then 'near_typo'
    when exists (select from private.thing_alias a where a.alias = p_text and a.removed_at is null) then 'rejected'
    when p_listed then 'held'
    when cat.fact_via is not null or cat.number_trait is not null or cardinality(cat.fact_values) > 1 then 'held_subset'
    else 'accepted'
  end;
  if outcome = 'accepted' then
    made := private.add_player_thing(cat.key, p_text, 'players');
  end if;
  insert into private.miss_review (category, text, outcome, thing_id, players, answered)
  values (cat.key, p_text, outcome, made, typed_by, answered);
  insert into private.base_log (actor, action, detail)
  values ('players', 'miss_review', jsonb_build_object('category', cat.key, 'text', p_text, 'outcome', outcome,
    'thing', made, 'players', typed_by, 'answered', answered));
  return true;
end;
$$;

-- As 13a-1's and 13e-4a's, and in an open load a root, member_of or value no import of this load gave is refused, as
-- a fresh load refuses it as unknown (3).
create or replace function private.define_category(p_key text, p_name text, p_source text, p_root text, p_member_of text)
  returns void
  language plpgsql set search_path = ''
as $$
declare
  root_id uuid := private.thing_by_ref(p_source, p_root);
  member_id uuid := private.thing_by_ref(p_source, p_member_of);
begin
  if root_id is null or (p_member_of is not null and member_id is null) then
    raise exception 'define_category %: % or % is not a % thing', p_key, p_root, p_member_of, p_source;
  end if;
  if private.load_open() and not (private.load_ref_seen(p_source, p_root) and (p_member_of is null or private.load_ref_seen(p_source, p_member_of))) then
    raise exception 'define_category %: % or % is no longer in the files this load gives', p_key, p_root, p_member_of;
  end if;
  insert into private.category (key, name, root, member_of) values (p_key, p_name, root_id, member_id)
  on conflict (key) do update set name = excluded.name, root = excluded.root, member_of = excluded.member_of;
  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'define_category',
    jsonb_build_object('key', p_key, 'name', p_name, 'root', p_root, 'member_of', p_member_of));
end;
$$;

create or replace function private.define_subset(p_key text, p_name text, p_of text, p_source text, p_where jsonb) returns void
  language plpgsql set search_path = ''
as $$
declare
  base private.category;
  value_ids uuid[];
  unknown text;
begin
  select * into base from private.category where key = p_of;
  if not found then
    raise exception 'define_subset %: no base category %', p_key, p_of;
  end if;
  if p_where ? 'trait' then
    select string_agg(v, ', ') into unknown from jsonb_array_elements_text(p_where -> 'values') as v where private.thing_by_ref(p_source, v) is null;
    if unknown is not null then
      raise exception 'define_subset %: % not % things', p_key, unknown, p_source;
    end if;
    if private.load_open() then
      select string_agg(v, ', ') into unknown from jsonb_array_elements_text(p_where -> 'values') as v where not private.load_ref_seen(p_source, v);
      if unknown is not null then
        raise exception 'define_subset %: % no longer in the files this load gives', p_key, unknown;
      end if;
    end if;
    select array_agg(private.thing_by_ref(p_source, v)) into value_ids from jsonb_array_elements_text(p_where -> 'values') as v;
  end if;
  insert into private.category (key, name, root, member_of, fact_trait, fact_values, fact_via, number_trait, at_least, starts_with)
  values (p_key, p_name, base.root, base.member_of, p_where ->> 'trait', value_ids, p_where ->> 'via', p_where ->> 'number',
    (p_where ->> 'at_least')::numeric, p_where ->> 'starts_with')
  on conflict (key) do update set name = excluded.name, root = excluded.root, member_of = excluded.member_of,
    fact_trait = excluded.fact_trait, fact_values = excluded.fact_values, fact_via = excluded.fact_via,
    number_trait = excluded.number_trait, at_least = excluded.at_least, starts_with = excluded.starts_with;
  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'define_category', jsonb_build_object('key', p_key, 'name', p_name, 'of', p_of, 'where', p_where));
end;
$$;
