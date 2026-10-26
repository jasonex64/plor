-- M13 13e-4a: subsets of any category (docs/milestones/M13-13e-4-subsets.md, "13e-4a"). A category can name a base
-- category and one filter: a fact about its members (continent, conservation status; continent may be reached through
-- the member's country), a number at least some value (population), or the first letter of what's typed. Facts gain
-- three traits and numbers their own table (O2, O3); approval freezes the filter as `where` (A1; DECISIONS.md, Puzzle
-- content format); misses on a subset are learned only if the new answer fits it (A2).
-- No grant changes: every replaced function keeps its signature and grants; the new table and functions hold no grant
-- for plor_app (they're read inside the security-definer functions it already runs).

-- Thing-valued facts subsets filter on, from Wikidata (SOURCES.md, Wikidata properties): P17, P30, P141.
alter table private.fact drop constraint fact_trait_check,
  add constraint fact_trait_check check (trait in ('kind_of', 'member_of', 'country', 'continent', 'conservation_status'));

-- Numbers in their own table (human, 2026-10-26: "Their own table (Recommended)"): the value and the point in time
-- (P585) it's true for. A reload with a different value removes the old one from that moment, so a started day keeps
-- the number it had.
create table private.number_fact (
  id bigint generated always as identity primary key,
  thing_id uuid not null references private.thing (id) on delete cascade,
  trait text not null check (trait in ('population')),
  value numeric not null check (value >= 0),
  as_of date,
  origin text not null check (origin in ('source', 'ai', 'players', 'human')),
  source_ref text,
  added_at timestamptz not null default now(),
  removed_at timestamptz check (removed_at >= added_at)
);
create unique index number_fact_current on private.number_fact (thing_id, trait) where removed_at is null;
alter table private.number_fact enable row level security;
revoke all on table private.number_fact from public, anon, authenticated, service_role;

-- A subset's one filter, beside its base's root and member_of (copied by private.define_subset). The forms are A1's.
alter table private.category
  add column fact_trait text check (fact_trait in ('continent', 'conservation_status')),
  add column fact_value uuid references private.thing (id),
  add column fact_via text check (fact_via = 'country'),
  add column number_trait text check (number_trait = 'population'),
  add column at_least numeric,
  add column starts_with text check (starts_with ~ '^[a-z]$'),
  add check ((fact_trait is null) = (fact_value is null)),
  add check (fact_via is null or fact_trait = 'continent'),
  add check ((number_trait is null) = (at_least is null)),
  add check (num_nonnulls(fact_trait, number_trait, starts_with) <= 1);

-- A text held because the subset's filter can't be checked on a new answer (through its country, or a number): the
-- human can accept it for the subset (A2).
alter table private.miss_review drop constraint miss_review_outcome_check,
  add constraint miss_review_outcome_check check (outcome in ('accepted', 'held', 'held_subset', 'rejected', 'near_typo'));

-- The category's filter as format 3's `where` (A1), or null for a category with none.
create function private.category_where(c private.category) returns jsonb
  language sql immutable set search_path = ''
  return case
    when c.fact_trait is not null then jsonb_strip_nulls(jsonb_build_object('trait', c.fact_trait, 'value', c.fact_value, 'via', c.fact_via))
    when c.number_trait is not null then jsonb_build_object('number', c.number_trait, 'at_least', c.at_least)
    when c.starts_with is not null then jsonb_build_object('starts_with', c.starts_with)
  end;
revoke all on function private.category_where(private.category) from public, anon, authenticated, service_role;

-- Whether a typed (normalized) name starts with the letter, a leading "the " ignored (human, 2026-10-26: "What's
-- typed must start with it (Recommended)": "The Gambia" counts under G).
create function private.alias_starts(p_alias text, p_letter text) returns boolean
  language sql immutable set search_path = ''
  return left(regexp_replace(p_alias, '^the ', ''), 1) = p_letter;
revoke all on function private.alias_starts(text, text) from public, anon, authenticated, service_role;

-- Whether a thing fits a filter as the base stood at p_as_of: the fact (on the thing, or on its country), the number,
-- or a name starting with the letter. A null filter fits everything.
create function private.fits_where(p_thing uuid, p_where jsonb, p_as_of timestamptz) returns boolean
  language sql stable set search_path = ''
  return p_where is null
    or (p_where ? 'trait' and p_where ->> 'via' is null and exists (
      select from private.fact f
      where f.thing_id = p_thing and f.trait = p_where ->> 'trait' and f.value_thing = (p_where ->> 'value')::uuid
        and f.added_at <= p_as_of and (f.removed_at is null or f.removed_at > p_as_of)))
    or (p_where ->> 'via' = 'country' and exists (
      select from private.fact v join private.fact f on f.thing_id = v.value_thing
      where v.thing_id = p_thing and v.trait = 'country' and v.added_at <= p_as_of and (v.removed_at is null or v.removed_at > p_as_of)
        and f.trait = p_where ->> 'trait' and f.value_thing = (p_where ->> 'value')::uuid
        and f.added_at <= p_as_of and (f.removed_at is null or f.removed_at > p_as_of)))
    or (p_where ? 'number' and exists (
      select from private.number_fact n
      where n.thing_id = p_thing and n.trait = p_where ->> 'number' and n.value >= (p_where ->> 'at_least')::numeric
        and n.added_at <= p_as_of and (n.removed_at is null or n.removed_at > p_as_of)))
    or (p_where ? 'starts_with' and exists (
      select from private.thing_alias a
      where a.thing_id = p_thing and private.alias_starts(a.alias, p_where ->> 'starts_with')
        and a.added_at <= p_as_of and (a.removed_at is null or a.removed_at > p_as_of)));
revoke all on function private.fits_where(uuid, jsonb, timestamptz) from public, anon, authenticated, service_role;

-- Defines or redefines a subset: its base category's root and member_of, and one filter (A1's forms, with a fact's
-- value as a source entry of p_source). The base must be defined first, as data/categories.json orders them.
create function private.define_subset(p_key text, p_name text, p_of text, p_source text, p_where jsonb) returns void
  language plpgsql set search_path = ''
as $$
declare
  base private.category;
  value_id uuid;
begin
  select * into base from private.category where key = p_of;
  if not found then
    raise exception 'define_subset %: no base category %', p_key, p_of;
  end if;
  if p_where ? 'trait' then
    value_id := private.thing_by_ref(p_source, p_where ->> 'value');
    if value_id is null then
      raise exception 'define_subset %: % is not a % thing', p_key, p_where ->> 'value', p_source;
    end if;
  end if;
  insert into private.category (key, name, root, member_of, fact_trait, fact_value, fact_via, number_trait, at_least, starts_with)
  values (p_key, p_name, base.root, base.member_of, p_where ->> 'trait', value_id, p_where ->> 'via', p_where ->> 'number',
    (p_where ->> 'at_least')::numeric, p_where ->> 'starts_with')
  on conflict (key) do update set name = excluded.name, root = excluded.root, member_of = excluded.member_of,
    fact_trait = excluded.fact_trait, fact_value = excluded.fact_value, fact_via = excluded.fact_via,
    number_trait = excluded.number_trait, at_least = excluded.at_least, starts_with = excluded.starts_with;
  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'define_category', jsonb_build_object('key', p_key, 'name', p_name, 'of', p_of, 'where', p_where));
end;
$$;
revoke all on function private.define_subset(text, text, text, text, jsonb) from public, anon, authenticated, service_role;

-- As 13a-2's, with the three new traits among an item's facts and its population as a number fact (13e-4a).
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

  insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
  select s.thing_id, t.trait, private.thing_by_ref(p_source, v), 'source', ref
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status')) as t(trait)
  cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
  where private.thing_by_ref(p_source, v) <> s.thing_id
  on conflict (thing_id, trait, value_thing) do nothing;
  get diagnostics new_facts = row_count;

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

-- As 13b's, and fitting the category's filter.
create or replace function private.in_category_now(p_thing uuid, p_key text) returns boolean
  language sql stable set search_path = ''
as $$
  select exists (select from private.category_extra e where e.category = p_key and e.thing_id = p_thing and e.removed_at is null)
    or exists (
      select from private.category c
      where c.key = p_key and c.root <> p_thing
        and c.root in (select private.ancestors_as_of(p_thing, now()))
        and exists (select from private.thing_alias a where a.thing_id = p_thing and a.kind = 'name' and a.removed_at is null)
        and (c.member_of is null or exists (
          select from private.fact m
          where m.thing_id = p_thing and m.trait = 'member_of' and m.value_thing = c.member_of and m.removed_at is null))
        and private.fits_where(p_thing, private.category_where(c), now()));
$$;

-- As 13b's, and fitting the category's filter.
create or replace function private.category_members(p_key text) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive cat as (select c.root, c.member_of, private.category_where(c) as filter from private.category c where c.key = p_key),
  under (id) as (
    select root from cat
    union
    select f.thing_id from private.fact f join under u on f.value_thing = u.id where f.trait = 'kind_of' and f.removed_at is null
  )
  select u.id from under u cross join cat
  where u.id <> cat.root
    and exists (select from private.thing_alias a where a.thing_id = u.id and a.kind = 'name' and a.removed_at is null)
    and (cat.member_of is null or exists (
      select from private.fact m where m.thing_id = u.id and m.trait = 'member_of' and m.value_thing = cat.member_of and m.removed_at is null))
    and private.fits_where(u.id, cat.filter, now())
  union
  select e.thing_id from private.category_extra e where e.category = p_key and e.removed_at is null;
$$;

-- As 13b's, with the question's frozen filter (`where`): the thing fits it as of the day's answers, and a letter
-- subset's typed name starts with the letter, for an answer the human accepted for the category too.
create or replace function private.resolve_answer(p_game text, p_date date, p_index int, p_texts text[])
  returns table (alias text, thing_id uuid, caught boolean, ancestors uuid[])
  language plpgsql stable security definer set search_path = ''
as $$
declare
  q jsonb;
  as_of timestamptz;
  hosts uuid[];
  extras uuid[];
begin
  -- answers_as_of alone would hide a missing approved_at (greatest() skips nulls), so it's checked here (13b review).
  select p.content -> 'questions' -> p_index, private.answers_as_of(p.content, p.puzzle_date) into q, as_of
  from private.puzzle p where p.game_id = p_game and p.puzzle_date = p_date and p.content ->> 'format' = '3' and p.content ? 'approved_at';
  if q is null or as_of is null then
    raise exception 'resolve_answer: % % has no approved format-3 question %', p_game, p_date, p_index;
  end if;
  select array_agg(h::uuid) into hosts from jsonb_array_elements_text(q -> 'host_answers') as h;
  select coalesce(array_agg(e.thing_id), '{}') into extras
  from private.category_extra e
  where e.category = q ->> 'category' and e.added_at <= as_of and (e.removed_at is null or e.removed_at > as_of);
  return query
    select a.alias, a.thing_id, up.ids && hosts, up.ids
    from private.thing_alias a
    cross join lateral (select array_agg(x) as ids from private.ancestors_as_of(a.thing_id, as_of) as x) as up
    where a.alias = any(p_texts) and a.added_at <= as_of and (a.removed_at is null or a.removed_at > as_of)
      and (q -> 'where' ->> 'starts_with' is null or private.alias_starts(a.alias, q -> 'where' ->> 'starts_with'))
      and (a.thing_id = any(extras) or (
        a.thing_id <> (q ->> 'root')::uuid and (q ->> 'root')::uuid = any(up.ids)
        and exists (
          select from private.thing_alias n
          where n.thing_id = a.thing_id and n.kind = 'name' and n.added_at <= as_of and (n.removed_at is null or n.removed_at > as_of))
        and (q ->> 'member_of' is null or exists (
          select from private.fact m
          where m.thing_id = a.thing_id and m.trait = 'member_of' and m.value_thing = (q ->> 'member_of')::uuid
            and m.added_at <= as_of and (m.removed_at is null or m.removed_at > as_of)))
        and private.fits_where(a.thing_id, q -> 'where', as_of)));
end;
$$;

-- As 13c's, freezing a subset's filter as `where` (A1), and counting only names starting with a letter subset's
-- letter among the familiar answers that can be typed (O4).
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
      with recursive caught (id) as (
        select unnest(hosts)
        union
        select f.thing_id from private.fact f join caught c on f.value_thing = c.id where f.trait = 'kind_of' and f.removed_at is null
      )
      select count(distinct m.id) from unnest(member_ids) as m(id) join private.thing_alias a on a.thing_id = m.id
      where a.removed_at is null and m.id not in (select id from caught) and (pattern is null or a.alias !~ pattern)
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

-- As 13b's, with a subset's direct fact (a country's continent, an animal's status) on the new thing (A2).
create or replace function private.add_player_thing(p_key text, p_text text, p_origin text) returns uuid
  language plpgsql set search_path = ''
as $$
declare
  cat private.category;
  made uuid;
begin
  select * into strict cat from private.category where key = p_key;
  insert into private.thing (name) values (private.typed_form(p_key, p_text)) returning id into made;
  insert into private.thing_alias (thing_id, alias, kind, origin, source_ref) values (made, p_text, 'name', p_origin, 'miss:' || p_key);
  insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, 'kind_of', cat.root, p_origin, 'miss:' || p_key);
  if cat.member_of is not null then
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, 'member_of', cat.member_of, p_origin, 'miss:' || p_key);
  end if;
  if cat.fact_trait is not null and cat.fact_via is null then
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, cat.fact_trait, cat.fact_value, p_origin, 'miss:' || p_key);
  end if;
  return made;
end;
$$;

-- As 13b's, for a subset (A2: "Learn only if it fits (Recommended)"): a letter subset's text that doesn't start with
-- its letter is logged and nothing more; a text a subset's filter can't be checked on (through its country, a number)
-- is held for the human instead of accepted.
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
    return true;
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
    when cat.fact_via is not null or cat.number_trait is not null then 'held_subset'
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

-- As 13b's: a held_subset text accepted by the human becomes a new thing accepted for the subset, as its filter can't
-- be checked on it (A2); undoing an accepted text also ends that acceptance.
create or replace function private.audit_decide(p_admin uuid, p_review bigint, p_action text, p_thing uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  r private.miss_review;
  made uuid;
  decided text;
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_decide: admins only';
  end if;
  select * into r from private.miss_review where id = p_review for update;
  if not found then
    raise exception using errcode = 'OB012', message = format('audit: no review %s', p_review);
  end if;
  if p_action = 'undo' and r.decision = 'linked' then
    update private.thing_alias set removed_at = now() where thing_id = r.chosen and alias = r.text and removed_at is null;
    decided := 'undone';
  elsif p_action = 'undo' and r.decision = 'accepted' and r.outcome = 'rejected' then
    update private.category_extra set removed_at = now() where category = r.category and thing_id = r.chosen and removed_at is null;
    decided := 'undone';
  elsif p_action = 'undo' and r.thing_id is not null and (r.decision is null or r.decision = 'accepted') then
    update private.thing_alias set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    update private.fact set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    update private.category_extra set removed_at = now() where category = r.category and thing_id = r.thing_id and removed_at is null;
    decided := 'undone';
  elsif p_action = 'link' and r.outcome in ('accepted', 'near_typo') and r.decision is null then
    if p_thing is null or p_thing = r.thing_id or not private.in_category_now(p_thing, r.category) then
      raise exception using errcode = 'OB012', message = format('audit: %s is not a member of %s', p_thing, r.category);
    end if;
    if exists (select from private.thing_alias a where a.thing_id = p_thing and a.alias = r.text) then
      raise exception using errcode = 'OB012', message = format('audit: "%s" is or was already a name of %s', r.text, p_thing);
    end if;
    insert into private.thing_alias (thing_id, alias, kind, origin, source_ref)
    values (p_thing, r.text, 'synonym', 'human', 'miss_review:' || r.id);
    if r.thing_id is not null then
      update private.thing_alias set removed_at = now() where thing_id = r.thing_id and removed_at is null;
      update private.fact set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    end if;
    decided := 'linked';
  elsif p_action = 'accept' and r.outcome in ('held', 'held_subset') and r.decision is null then
    made := private.add_player_thing(r.category, r.text, 'human');
    if r.outcome = 'held_subset' then
      insert into private.category_extra (category, thing_id, added_by) values (r.category, made, p_admin);
    end if;
    decided := 'accepted';
  elsif p_action = 'accept_for_category' and r.outcome = 'rejected' and r.decision is null then
    if p_thing is null or not exists (
      select from private.thing_alias a where a.thing_id = p_thing and a.alias = r.text and a.removed_at is null) then
      raise exception using errcode = 'OB012', message = format('audit: "%s" is not a name of %s', r.text, p_thing);
    end if;
    if exists (select from private.category_extra e where e.category = r.category and e.thing_id = p_thing) then
      raise exception using errcode = 'OB012', message = format('audit: %s is or was already accepted for %s', p_thing, r.category);
    end if;
    insert into private.category_extra (category, thing_id, added_by) values (r.category, p_thing, p_admin);
    decided := 'accepted';
  elsif p_action = 'dismiss' and r.outcome <> 'accepted' and r.decision is null then
    decided := 'dismissed';
  else
    raise exception using errcode = 'OB012',
      message = format('audit: can''t %s review %s (%s, %s)', p_action, p_review, r.outcome, coalesce(r.decision, 'undecided'));
  end if;
  update private.miss_review
  set decision = decided, decided_by = p_admin, decided_at = now(), thing_id = coalesce(made, thing_id),
    chosen = case when p_action in ('link', 'accept_for_category') then p_thing else chosen end
  where id = p_review;
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'audit', jsonb_build_object('review', p_review, 'action', p_action, 'thing', coalesce(made, p_thing)));
end;
$$;
