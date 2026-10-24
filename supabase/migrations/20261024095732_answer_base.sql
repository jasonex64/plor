-- M13 13a-1: the answer database's base (docs/milestones/M13-13a-the-base.md; M13 ticket D1, D3, D6). Things with a
-- permanent ID of Plor's own (D3 a), their names and aliases, facts linking them ("kind of", "member of"), categories
-- as recipes over those facts, and a log of every import. Security change (DECISIONS.md Log; D1 a, human,
-- 2026-10-24): the tables hold no grant for plor_app; imports run as the owner through private.import_source, and
-- plor_app may only execute private.base_lookup, which checks the caller is an admin (the admin browse page).

-- A thing: one answer, whatever names it goes by. name is its US English display name (human, 2026-10-24: "US
-- English"); a taxon with no English name keeps its scientific one and has no 'name' alias, so it can't be answered.
create table private.thing (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name <> ''),
  created_at timestamptz not null default now()
);

-- Which entry in a source each thing came from (D3 a: Plor's IDs, linked to the source's own).
create table private.thing_source (
  source text not null check (source in ('wikidata', 'col', 'oewn', 'usda')),
  source_id text not null check (source_id <> ''),
  thing_id uuid not null references private.thing (id) on delete cascade,
  primary key (source, source_id)
);
create index thing_source_thing on private.thing_source (thing_id);

-- The names a thing can be typed as, normalized when written (src/content/puzzle.ts, normalize). kind says what the
-- alias is; origin who added it (D6 a: names from the sources, nicknames from the AI and players).
create table private.thing_alias (
  thing_id uuid not null references private.thing (id) on delete cascade,
  alias text not null check (alias <> ''),
  kind text not null check (kind in ('name', 'synonym', 'plural', 'scientific')),
  origin text not null check (origin in ('source', 'ai', 'players', 'human')),
  source_ref text,
  added_at timestamptz not null default now(),
  primary key (thing_id, alias)
);
-- Typed text is looked up by alias.
create index thing_alias_alias on private.thing_alias (alias);

-- A fact links two things: "polar bear kind_of bear", "France member_of United Nations". kind_of makes the tree
-- a host answer covers (human, 2026-10-24: "Caught: bear covers it").
create table private.fact (
  id bigint generated always as identity primary key,
  thing_id uuid not null references private.thing (id) on delete cascade,
  trait text not null check (trait in ('kind_of', 'member_of')),
  value_thing uuid not null references private.thing (id) on delete cascade,
  origin text not null check (origin in ('source', 'ai', 'players', 'human')),
  source_ref text,
  added_at timestamptz not null default now(),
  unique (thing_id, trait, value_thing),
  check (thing_id <> value_thing)
);
-- Categories walk the tree downward, from a value to the things under it.
create index fact_value on private.fact (trait, value_thing);

-- A category is a recipe: everything under root in the kind_of tree, optionally only those that are member_of a
-- thing (UN members among countries). key names it in a question (format 3, 13a-2).
create table private.category (
  key text primary key check (key ~ '^[a-z][a-z_]*$'),
  name text not null check (name <> ''),
  root uuid not null references private.thing (id),
  member_of uuid references private.thing (id)
);

-- Every import and category change, by whom and when. Each alias and fact also carries its own origin, source_ref
-- and added_at, so a row can be traced to the import that added it.
create table private.base_log (
  id bigint generated always as identity primary key,
  actor text not null check (actor <> ''),
  action text not null check (action in ('import', 'define_category')),
  detail jsonb not null,
  at timestamptz not null default now()
);

-- DECISIONS.md, Row-level security in `private`: RLS on, and nothing for the Data API roles. plor_app has no grant
-- on these tables; it reaches them only through private.base_lookup.
alter table private.thing enable row level security;
alter table private.thing_source enable row level security;
alter table private.thing_alias enable row level security;
alter table private.fact enable row level security;
alter table private.category enable row level security;
alter table private.base_log enable row level security;
revoke all on table private.thing, private.thing_source, private.thing_alias, private.fact, private.category,
  private.base_log from public, anon, authenticated, service_role;

-- Loads one source's snapshot: each item is {id, name, aliases: [{alias, kind}], kind_of: [ids], member_of: [ids]},
-- with ids in that source. Things already linked to the same source ID are kept (and keep their name); new aliases
-- and facts are added. Every kind_of or member_of id must name a thing of that source, in this snapshot or an earlier
-- one, or nothing is loaded. Run by the import scripts as the owner (scripts/base.ts); no role is granted it.
create function private.import_source(p_source text, p_snapshot text, p_items jsonb) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  ref text := p_source || ':' || p_snapshot;
  new_things int;
  new_aliases int;
  new_facts int;
  unknown text;
begin
  -- New source IDs get a new thing. "materialized" makes each random ID once, for both inserts.
  with item as materialized (
    select distinct on (i->>'id') i->>'id' as source_id, i->>'name' as name from jsonb_array_elements(p_items) as i
  ), fresh as materialized (
    select gen_random_uuid() as thing_id, n.source_id, n.name from item n
    where not exists (select from private.thing_source s where s.source = p_source and s.source_id = n.source_id)
  ), made as (
    insert into private.thing (id, name) select thing_id, name from fresh returning id
  ), linked as (
    insert into private.thing_source (source, source_id, thing_id) select p_source, source_id, thing_id from fresh
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
  where not exists (select from private.thing_source s where s.source = p_source and s.source_id = v);
  if unknown is not null then
    raise exception 'import_source: % ids not in this source: %', p_source, left(unknown, 500);
  end if;

  insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
  select s.thing_id, t.trait, sv.thing_id, 'source', ref
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join (values ('kind_of'), ('member_of')) as t(trait)
  cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
  join private.thing_source sv on sv.source = p_source and sv.source_id = v
  where sv.thing_id <> s.thing_id
  on conflict (thing_id, trait, value_thing) do nothing;
  get diagnostics new_facts = row_count;

  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'import', jsonb_build_object('snapshot', p_snapshot, 'items', jsonb_array_length(p_items),
    'things', new_things, 'aliases', new_aliases, 'facts', new_facts));
  return jsonb_build_object('things', new_things, 'aliases', new_aliases, 'facts', new_facts);
end;
$$;
revoke all on function private.import_source(text, text, jsonb) from public, anon, authenticated, service_role;

-- Defines or redefines a category by its root (and optional member_of) as source entries. Run by the import scripts
-- as the owner; no role is granted it.
create function private.define_category(p_key text, p_name text, p_source text, p_root text, p_member_of text)
  returns void
  language plpgsql set search_path = ''
as $$
declare
  root_id uuid := (select thing_id from private.thing_source where source = p_source and source_id = p_root);
  member_id uuid := (select thing_id from private.thing_source where source = p_source and source_id = p_member_of);
begin
  if root_id is null or (p_member_of is not null and member_id is null) then
    raise exception 'define_category %: % or % is not a % thing', p_key, p_root, p_member_of, p_source;
  end if;
  insert into private.category (key, name, root, member_of) values (p_key, p_name, root_id, member_id)
  on conflict (key) do update set name = excluded.name, root = excluded.root, member_of = excluded.member_of;
  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'define_category',
    jsonb_build_object('key', p_key, 'name', p_name, 'root', p_root, 'member_of', p_member_of));
end;
$$;
revoke all on function private.define_category(text, text, text, text, text) from public, anon, authenticated, service_role;

-- A category's members: every thing under its root in the kind_of tree (the root itself excluded: "animal" isn't an
-- answer to "Name an animal"), that has a name players can type, and, if the category says so, is member_of its
-- thing. union (not union all) ends the walk on a cycle in a source's tree.
create function private.category_members(p_key text) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive cat as (select root, member_of from private.category where key = p_key),
  under (id) as (
    select root from cat
    union
    select f.thing_id from private.fact f join under u on f.value_thing = u.id where f.trait = 'kind_of'
  )
  select u.id from under u cross join cat
  where u.id <> cat.root
    and exists (select from private.thing_alias a where a.thing_id = u.id and a.kind = 'name')
    and (cat.member_of is null or exists (
      select from private.fact m where m.thing_id = u.id and m.trait = 'member_of' and m.value_thing = cat.member_of));
$$;
revoke all on function private.category_members(text) from public, anon, authenticated, service_role;

-- The admin browse page (human, 2026-10-24: "Search and browse (Recommended)"): every thing one of whose aliases is
-- exactly p_alias (normalized by the caller), with its names, sources, facts and the categories it falls in. Raises
-- OB007 for a caller who isn't an admin, as the puzzle functions do (M06); the route checks first too.
create function private.base_lookup(p_admin uuid, p_alias text) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'base_lookup: admins only';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'aliases', (select coalesce(jsonb_agg(jsonb_build_object('alias', a.alias, 'kind', a.kind, 'origin', a.origin)
                    order by a.kind, a.alias), '[]') from private.thing_alias a where a.thing_id = t.id),
      'sources', (select coalesce(jsonb_agg(jsonb_build_object('source', s.source, 'id', s.source_id)
                    order by s.source), '[]') from private.thing_source s where s.thing_id = t.id),
      'facts', (select coalesce(jsonb_agg(jsonb_build_object('trait', f.trait, 'value', v.name, 'origin', f.origin,
                    'source_ref', f.source_ref) order by f.trait, v.name), '[]')
                from private.fact f join private.thing v on v.id = f.value_thing where f.thing_id = t.id),
      'categories', (
        with recursive up (id) as (
          select t.id
          union
          select f.value_thing from private.fact f join up on f.thing_id = up.id where f.trait = 'kind_of'
        )
        select coalesce(jsonb_agg(c.key order by c.key), '[]') from private.category c
        where c.root in (select id from up where id <> t.id)
          and exists (select from private.thing_alias a where a.thing_id = t.id and a.kind = 'name')
          and (c.member_of is null or exists (
            select from private.fact m where m.thing_id = t.id and m.trait = 'member_of' and m.value_thing = c.member_of)))
    ) order by t.name)
    from private.thing t
    where t.id in (select a.thing_id from private.thing_alias a where a.alias = p_alias)), '[]');
end;
$$;
revoke all on function private.base_lookup(uuid, text) from public, anon, authenticated, service_role;
grant execute on function private.base_lookup(uuid, text) to plor_app;
