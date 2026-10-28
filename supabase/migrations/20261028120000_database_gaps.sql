-- The database's gaps (docs/milestones/M13-13f-4-scale-and-leftovers.md, 13f-4b; the human's answers, rounds 4 to 6,
-- 2026-10-28). As the latest import_source, load_links, load_finish, record_miss and add_player_thing, and:
-- - a fact and a link for one edge share a row, so a load brings it back by either kind it owns (import_source,
--   load_links);
-- - import_source refuses a retired ID given for another thing than the one it points at;
-- - load_finish names an approved day not started yet whose host answer's ancestor lost its kind_of, and unlocks last;
-- - record_miss judges a miss by the day's frozen question (its root, member_of and filter), not the category now;
-- - add_player_thing shows a player-added thing as players' text normalized; typed_form goes with its last caller.

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
  -- An item already linked keeps its thing, so a same_as naming another thing (a re-fetch where a WordNet synset
  -- newly names a loaded Wikidata thing) would be kept apart without a word (ROADMAP, 13a-1 review; 13f-3b-2).
  select string_agg(format('%s (its thing %s, same_as %s)', i->>'id', s.thing_id, private.thing_by_ref(p_source, i->>'same_as')), ', ')
  into bad
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'same_as' and s.thing_id <> private.thing_by_ref(p_source, i->>'same_as');
  if bad is not null then
    raise exception 'import_source: same_as names another thing than the one the item is loaded as (npx supabase db reset, then npm run base -- load all): %', left(bad, 500);
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

  -- A retired ID keeps pointing at the thing it was recorded for; given again for another thing it would point at the
  -- old one without a word (13e-5b review; 13f-4b).
  select string_agg(format('%s (retired for %s, now given for %s)', r.id, r.thing_id, s.thing_id), ', ') into bad
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  join private.thing_retired r on r.id = (i->>'thing_id')::uuid
  where r.thing_id <> s.thing_id;
  if bad is not null then
    raise exception 'import_source: retired IDs given for another thing: %', left(bad, 500);
  end if;

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
  -- A fact and a link for one edge share one row (one key), so either kind the load owns brings it back (13f-3b-1
  -- review; 13f-4b).
  -- In an open load one brought back is checked for circles as a new one is, and both are fresh for load_finish's
  -- check (4).
  with revived as (
    update private.fact f set removed_at = null
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
    cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    where f.thing_id = s.thing_id and f.trait = t.trait and f.value_thing = private.thing_by_ref(p_source, v)
      and (f.origin = 'source' or (f.origin = 'ai' and f.source_ref = 'links')) and f.removed_at > now()
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
  -- edge loads as it does fresh, and load_finish catches a circle a later set closes. When one import closes several,
  -- the refusal names the first by name, the same one each time (ROADMAP, 13e-5 review; 13f-3b-2).
  if open then
    select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.child, p.name, n.parent, p.name, c.name)
    into circle
    from (select distinct x.parent from unnest(parents) as x(parent)) as top
    cross join lateral private.load_ancestors(top.parent) as above(id)
    join unnest(kids, parents) as n(child, parent) on n.parent = top.parent and n.child = above.id
    join private.thing c on c.id = n.child
    join private.thing p on p.id = n.parent
    order by c.name, p.name, n.child, n.parent
    limit 1;
  else
    select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.child, p.name, n.parent, p.name, c.name)
    into circle
    from (select distinct x.parent from unnest(parents) as x(parent)) as top
    cross join lateral private.ancestors_as_of(top.parent, now()) as above(id)
    join unnest(kids, parents) as n(child, parent) on n.parent = top.parent and n.child = above.id
    join private.thing c on c.id = n.child
    join private.thing p on p.id = n.parent
    order by c.name, p.name, n.child, n.parent
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
    -- The edge's row may be a snapshot's: either kind the load owns comes back (13f-3b-1 review; 13f-4b).
    update private.fact set removed_at = null
    where thing_id = child and trait = 'kind_of' and value_thing = parent
      and (origin = 'source' or (origin = 'ai' and source_ref = 'links')) and removed_at > now();
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
  kinds_off uuid[];
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
    order by c.name, p.name, n.thing_id, n.value_thing
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
    returning f.thing_id, f.trait
  )
  select count(*), coalesce(array_agg(distinct thing_id), '{}'), coalesce(array_agg(distinct thing_id) filter (where trait = 'kind_of'), '{}')
  into ending_facts, facts_off, kinds_off from ended;
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
    case when t.id = any (renamed_things) then 'renamed' end,
    -- An ended kind_of above it moves it out from under its category's root too (13f-3b-1 review; 13f-4b).
    case when exists (select from private.ancestors_as_of(t.id, now()) as up(id)
      where up.id <> t.id and up.id = any (kinds_off || links_off)) then 'above it ended' end], null) as changes) as ch
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
  insert into private.base_log (actor, action, detail)
  values ('load', 'erase', jsonb_build_object('at', midnight, 'aliases', ending_aliases, 'facts', ending_facts,
    'links', ending_links, 'numbers', ending_numbers, 'renamed', renamed,
    'categories', to_jsonb(erased_categories), 'kept_categories', to_jsonb(kept_categories), 'touched', touched));
  -- Last: an unlock isn't undone by a rollback, so a failed write above leaves the load open, not half closed
  -- (13f-3b-1 review; 13f-4b).
  perform pg_catalog.pg_advisory_unlock('private.load_seen_item'::regclass::oid::int, 0);
  return jsonb_build_object('at', midnight, 'aliases', ending_aliases, 'facts', ending_facts, 'links', ending_links,
    'numbers', ending_numbers, 'renamed', renamed,
    'categories', to_jsonb(erased_categories), 'kept_categories', to_jsonb(kept_categories), 'touched', touched);
end;
$$;

create or replace function private.record_miss(p_user uuid, p_game text, p_date date, p_index int, p_typed text, p_text text,
  p_near_typo boolean, p_listed boolean, p_min_players int, p_share_percent numeric) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  cat private.category;
  q jsonb;
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
  -- The day's question as approved (its root, member_of and filter, frozen in the day: 13a-2, 13e-4a), as the answer
  -- check reads it, not the category as it is now, which a redefined subset changes (13e-4a review; 13f-4b).
  select p.content -> 'questions' -> p_index into q from private.puzzle p where p.game_id = p_game and p.puzzle_date = p_date;
  if q ->> 'root' is null then
    raise exception 'record_miss: % % question % has no frozen root (not format 3)', p_game, p_date, p_index;
  end if;
  if q -> 'where' ->> 'starts_with' is not null and not private.alias_starts(p_text, q -> 'where' ->> 'starts_with') then
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
  if exists (select from private.thing_alias a where a.alias = p_text and a.removed_at is null
      and (exists (select from private.category_extra e where e.category = cat.key and e.thing_id = a.thing_id and e.removed_at is null)
        or ((q ->> 'root')::uuid <> a.thing_id and (q ->> 'root')::uuid in (select private.ancestors_as_of(a.thing_id, now()))
          and exists (select from private.thing_alias n where n.thing_id = a.thing_id and n.kind = 'name' and n.removed_at is null)
          and (q ->> 'member_of' is null or exists (select from private.fact m
            where m.thing_id = a.thing_id and m.trait = 'member_of' and m.value_thing = (q ->> 'member_of')::uuid and m.removed_at is null))
          and private.fits_where(a.thing_id, q -> 'where', now())))) then
    return true;
  end if;
  outcome := case
    when p_near_typo then 'near_typo'
    when exists (select from private.thing_alias a where a.alias = p_text and a.removed_at is null) then 'rejected'
    when p_listed then 'held'
    when q -> 'where' ? 'via' or q -> 'where' ? 'number' or jsonb_array_length(coalesce(q -> 'where' -> 'values', '[]')) > 1 then 'held_subset'
    -- add_player_thing builds the thing from the category as it is now; a day approved before the category changed
    -- (its root, member_of or filter) would get a thing in neither, so the human decides it on the audit (13f-4b review).
    when (q ->> 'root')::uuid <> cat.root or (q ->> 'member_of')::uuid is distinct from cat.member_of
      or (q -> 'where') is distinct from private.category_where(cat) then 'held_subset'
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

create or replace function private.add_player_thing(p_key text, p_text text, p_origin text) returns uuid
  language plpgsql set search_path = ''
as $$
declare
  cat private.category;
  made uuid;
begin
  select * into strict cat from private.category where key = p_key;
  -- Shown as players' text normalized, as every name is (13f-1: "jackalope", not "JACKALOPE!!!"; 13f-4b).
  insert into private.thing (name) values (p_text) returning id into made;
  insert into private.thing_alias (thing_id, alias, kind, origin, source_ref) values (made, p_text, 'name', p_origin, 'miss:' || p_key);
  insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, 'kind_of', cat.root, p_origin, 'miss:' || p_key);
  if cat.member_of is not null then
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, 'member_of', cat.member_of, p_origin, 'miss:' || p_key);
  end if;
  if cat.fact_trait is not null and cat.fact_via is null and cardinality(cat.fact_values) = 1 then
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, cat.fact_trait, cat.fact_values[1], p_origin, 'miss:' || p_key);
  end if;
  return made;
end;
$$;

drop function private.typed_form(text, text);
