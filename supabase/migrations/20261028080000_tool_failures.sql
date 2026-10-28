-- Failures to fail loudly (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3b-2; human, 2026-10-27: "Failures
-- and tests first (Recommended)"). As 13f-3b-1's and 13f-3a's functions, and:
-- - import_source refuses a same_as naming another thing than the one its item is already loaded as;
-- - import_source and load_finish name the same circle each time when there are several;
-- - define_category clears a subset's filter when its key becomes a base;
-- - approve_puzzle gives its problems as a JSON list in the error's detail, so the admin page splits none in two.

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
  -- A key that was a subset becomes a base: its filter goes with it (ROADMAP, 13e-4a review; 13f-3b-2).
  on conflict (key) do update set name = excluded.name, root = excluded.root, member_of = excluded.member_of,
    fact_trait = null, fact_values = null, fact_via = null, number_trait = null, at_least = null, starts_with = null;
  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'define_category',
    jsonb_build_object('key', p_key, 'name', p_name, 'root', p_root, 'member_of', p_member_of));
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
    raise exception 'puzzle_invalid: format 3 expected' using errcode = 'OB009', detail = '["format 3 expected"]';
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
    -- The problems as a JSON list too, so a category name holding "; " stays one problem (ROADMAP, 13a-2 review).
    raise exception 'puzzle_invalid: %', array_to_string(problems, '; ') using errcode = 'OB009', detail = to_jsonb(problems)::text;
  end if;
  insert into private.puzzle (game_id, puzzle_date, content)
  values (p_content ->> 'game_id', (p_content ->> 'date')::date, p_content || jsonb_build_object('questions', approved, 'approved_at', now()))
  on conflict (game_id, puzzle_date) do update set content = excluded.content;
end;
$$;
