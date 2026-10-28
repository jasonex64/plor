-- Removal on load (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3a; human, 2026-10-27: "Build it now
-- (Recommended)", "Erase it", "Keep the thing, erase the rest (Recommended)", "Player-added (Recommended)", "Human
-- decisions (Recommended)"). A load owns the names and facts it wrote from a source or a hand file (origin 'source',
-- and the links: origin 'ai', source_ref 'links'); `npm run base -- load all` opens a load (load_begin), each import and
-- the links mark every owned row the files give, already loaded or not, and load_finish ends the owned rows no file
-- gave at the next midnight (a load a day after erases them) and erases the categories data/categories.json no longer lists.
-- Readers of the base as it is now (drafting, approval, the admin pages) see an ended row gone at once; a started day
-- reads as of its start, so it keeps it until the day is over. A thing's row is never erased: it keeps its shown name,
-- so past results that point at its ID still show it (format 3: permanent IDs). Player-added rows (origin 'players')
-- and the admin's decisions (origin 'human', and private.category_extra) are never erased, and a category that holds
-- either is kept. Rows don't record their set (source_ref is the source and the snapshot's date, which sets share), so
-- what the files give is gathered across the whole load.

create table private.load_seen_alias (
  thing_id uuid not null,
  alias text not null,
  primary key (thing_id, alias)
);
create table private.load_seen_fact (
  thing_id uuid not null,
  trait text not null,
  value_thing uuid not null,
  primary key (thing_id, trait, value_thing)
);
create table private.load_seen_number (
  thing_id uuid not null,
  trait text not null,
  primary key (thing_id, trait)
);
-- strong: a joining WordNet item's name, which a later one replaces; the made-from item's name never replaces it.
create table private.load_seen_name (
  thing_id uuid primary key,
  name text not null,
  strong boolean not null
);
-- load_begin and load_finish log what they erased beside the imports and links.
alter table private.base_log drop constraint base_log_action_check,
  add constraint base_log_action_check check (action in ('import', 'define_category', 'miss_review', 'audit', 'link', 'erase'));

alter table private.load_seen_alias enable row level security;
alter table private.load_seen_fact enable row level security;
alter table private.load_seen_number enable row level security;
alter table private.load_seen_name enable row level security;
revoke all on private.load_seen_alias, private.load_seen_fact, private.load_seen_number, private.load_seen_name
  from public, anon, authenticated, service_role;

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

  -- The shown name the files give each thing, already loaded or not, as the rules above pick it on a fresh load: a
  -- joining WordNet item's name, else the name of the item the thing was made from. load_finish shows it, so a load on a
  -- loaded base shows what a fresh one does (13f-3a; 13f-1's review: "cornet" kept on a live base).
  insert into private.load_seen_name (thing_id, name, strong)
  select distinct on (s.thing_id) s.thing_id, i->>'name', p_source = 'oewn' and i ? 'same_as'
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where (p_source = 'oewn' and i ? 'same_as') or not (i ? 'same_as' or i ? 'merged_into')
  order by s.thing_id, p_source = 'oewn' and i ? 'same_as' desc, i->>'id'
  on conflict (thing_id) do update set name = excluded.name, strong = true where excluded.strong;

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
  insert into private.load_seen_alias (thing_id, alias)
  select s.thing_id, a->>'alias'
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join jsonb_array_elements(i->'aliases') as a
  on conflict do nothing;

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
  update private.fact f set removed_at = null
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
  cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
  where f.thing_id = s.thing_id and f.trait = t.trait and f.value_thing = private.thing_by_ref(p_source, v)
    and f.origin = 'source' and f.removed_at > now();
  insert into private.load_seen_fact (thing_id, trait, value_thing)
  select s.thing_id, t.trait, private.thing_by_ref(p_source, v)
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
  cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
  where private.thing_by_ref(p_source, v) <> s.thing_id
  on conflict do nothing;

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
  insert into private.load_seen_number (thing_id, trait)
  select s.thing_id, 'population'
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'population'
  on conflict do nothing;

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
  link jsonb;
  child uuid;
  parent uuid;
  added int := 0;
  n int;
begin
  for link in select * from jsonb_array_elements(p_links) loop
    child := private.thing_by_ref('oewn', link ->> 'thing');
    parent := private.thing_by_ref('oewn', link ->> 'kind_of');
    if child is null or parent is null then
      raise exception 'link %: % or % is not in the base', link, link ->> 'thing', link ->> 'kind_of';
    end if;
    -- On a loaded base a rename lands in load_finish, after the links, so the name the files give counts (13f-3a review).
    if (select coalesce(s.name, t.name) from private.thing t left join private.load_seen_name s on s.thing_id = t.id where t.id = child)
        is distinct from link ->> 'name'
      or (select coalesce(s.name, t.name) from private.thing t left join private.load_seen_name s on s.thing_id = t.id where t.id = parent)
        is distinct from link ->> 'kind_of_name' then
      raise exception 'link %: the base names them % and %', link,
        (select name from private.thing where id = child), (select name from private.thing where id = parent);
    end if;
    if child in (select private.ancestors_as_of(parent, now())) then
      raise exception 'link %: % is already above %, so the link would make a cycle', link, link ->> 'name', link ->> 'kind_of_name';
    end if;
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
    values (child, 'kind_of', parent, 'ai', 'links')
    on conflict (thing_id, trait, value_thing) do nothing;
    get diagnostics n = row_count;
    update private.fact set removed_at = null
    where thing_id = child and trait = 'kind_of' and value_thing = parent and origin = 'ai' and source_ref = 'links' and removed_at > now();
    insert into private.load_seen_fact (thing_id, trait, value_thing) values (child, 'kind_of', parent) on conflict do nothing;
    added := added + n;
  end loop;
  insert into private.base_log (actor, action, detail)
  values ('links', 'link', jsonb_build_object('links', jsonb_array_length(p_links), 'added', added));
  return jsonb_build_object('links', jsonb_array_length(p_links), 'added', added);
end;
$$;

-- Erasing waits for midnight (Los Angeles, as private.day_of and answers_as_of count days): load_finish gives an owned
-- row the files no longer give a removed_at at the next day's start, so a started day, which reads the base as of its
-- start, stays as it began, and a later day doesn't hold it (human, 2026-10-27: "Erase at the next midnight
-- (Recommended)"). A run can be finished after midnight (DECISIONS.md, Timer), so an ended row is deleted only once a
-- whole day has passed since it ended (human, 2026-10-27: "Wait one more day (Recommended)"). A future removed_at is
-- only ever a load's: the admin's removals and a replaced population end at now(), and the admin removes player-added
-- and human rows only.

-- A load opens by erasing the owned rows that ended before yesterday began: no day in play, nor a run of yesterday
-- finished today, reads them now. Then nothing is seen. A row waiting for midnight stays ended unless this load gives it
-- again (import_source, load_links), so a load that fails half-way brings back only rows the files give (13f-3a review).
create function private.load_begin() returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  cutoff timestamptz := (private.today() - 1)::timestamp at time zone 'America/Los_Angeles';
  erased_aliases int;
  erased_facts int;
  erased_numbers int;
begin
  delete from private.thing_alias where origin = 'source' and removed_at <= cutoff;
  get diagnostics erased_aliases = row_count;
  delete from private.fact
  where (origin = 'source' or (origin = 'ai' and source_ref = 'links')) and removed_at <= cutoff;
  get diagnostics erased_facts = row_count;
  delete from private.number_fact where origin = 'source' and removed_at <= cutoff;
  get diagnostics erased_numbers = row_count;
  truncate private.load_seen_alias, private.load_seen_fact, private.load_seen_number, private.load_seen_name;
  if erased_aliases + erased_facts + erased_numbers > 0 then
    insert into private.base_log (actor, action, detail)
    values ('load', 'erase', jsonb_build_object('aliases', erased_aliases, 'facts', erased_facts, 'numbers', erased_numbers));
  end if;
  return jsonb_build_object('aliases', erased_aliases, 'facts', erased_facts, 'numbers', erased_numbers);
end;
$$;

-- What the files no longer give (an import or link that gives a row waiting for midnight again has kept it): the owned
-- names, facts, links and populations no import or link of this load marked end at the next midnight; each thing shows the
-- name the files give it; and the categories not in p_categories go now, except one that holds a player's miss or an
-- admin's addition, or that a day from yesterday on names (human, 2026-10-27: "Keep for those days (Recommended)";
-- yesterday's for a run finished today). Kept ones are named, not erased. A population isn't brought back: the import
-- adds the files' one as current beside it.
create function private.load_finish(p_categories text[]) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  midnight timestamptz := (private.today() + 1)::timestamp at time zone 'America/Los_Angeles';
  ending_aliases int;
  ending_facts int;
  ending_links int;
  ending_numbers int;
  renamed int;
  erased_categories text[];
  kept_categories text[];
begin
  update private.thing_alias a set removed_at = midnight
  where a.origin = 'source' and a.removed_at is null
    and not exists (select from private.load_seen_alias s where s.thing_id = a.thing_id and s.alias = a.alias);
  get diagnostics ending_aliases = row_count;
  update private.fact f set removed_at = midnight
  where f.origin = 'source' and f.removed_at is null
    and not exists (select from private.load_seen_fact s where s.thing_id = f.thing_id and s.trait = f.trait and s.value_thing = f.value_thing);
  get diagnostics ending_facts = row_count;
  update private.fact f set removed_at = midnight
  where f.origin = 'ai' and f.source_ref = 'links' and f.removed_at is null
    and not exists (select from private.load_seen_fact s where s.thing_id = f.thing_id and s.trait = f.trait and s.value_thing = f.value_thing);
  get diagnostics ending_links = row_count;
  update private.number_fact n set removed_at = midnight
  where n.origin = 'source' and n.removed_at is null
    and not exists (select from private.load_seen_number s where s.thing_id = n.thing_id and s.trait = n.trait);
  get diagnostics ending_numbers = row_count;

  update private.thing t set name = s.name
  from private.load_seen_name s
  where t.id = s.thing_id and t.name <> s.name;
  get diagnostics renamed = row_count;

  select coalesce(array_agg(c.key order by c.key), '{}') into kept_categories
  from private.category c
  where c.key <> all (p_categories)
    and (exists (select from private.miss_review r where r.category = c.key)
      or exists (select from private.category_extra e where e.category = c.key)
      or exists (select from private.puzzle p cross join jsonb_array_elements(p.content -> 'questions') as q
        where p.puzzle_date >= private.today() - 1 and q ->> 'category' = c.key));
  with gone as (
    delete from private.category c where c.key <> all (p_categories) and c.key <> all (kept_categories) returning c.key
  )
  select coalesce(array_agg(key order by key), '{}') into erased_categories from gone;

  truncate private.load_seen_alias, private.load_seen_fact, private.load_seen_number, private.load_seen_name;
  insert into private.base_log (actor, action, detail)
  values ('load', 'erase', jsonb_build_object('at', midnight, 'aliases', ending_aliases, 'facts', ending_facts,
    'links', ending_links, 'numbers', ending_numbers, 'renamed', renamed,
    'categories', to_jsonb(erased_categories), 'kept_categories', to_jsonb(kept_categories)));
  return jsonb_build_object('at', midnight, 'aliases', ending_aliases, 'facts', ending_facts, 'links', ending_links,
    'numbers', ending_numbers, 'renamed', renamed,
    'categories', to_jsonb(erased_categories), 'kept_categories', to_jsonb(kept_categories));
end;
$$;

revoke all on function private.load_begin() from public, anon, authenticated, service_role;
revoke all on function private.load_finish(text[]) from public, anon, authenticated, service_role;
