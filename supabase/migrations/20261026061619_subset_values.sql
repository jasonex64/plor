-- M13 13e-4b: a fact filter holds a list of values, and a thing fits with any of them (docs/milestones/M13-13e-4-subsets.md,
-- 13e-4b; human, 2026-10-26: "Approve: always a list (Recommended)"), so "Name an endangered animal" takes vulnerable,
-- endangered or critically endangered ("Both, endangered as players mean it (Recommended)"). Format 3's `where` fact
-- form becomes {trait, values, via?} (DECISIONS.md, Puzzle content format); no day was approved with the one-value
-- form. A new thing can't be given one of several values, so a miss on such a subset is held for the human, as a via or
-- number subset's is (A2). No grant changes: every replaced function keeps its signature and grants.

alter table private.category add column fact_values uuid[] check (cardinality(fact_values) > 0);
update private.category set fact_values = array[fact_value] where fact_value is not null;

create or replace function private.category_where(c private.category) returns jsonb
  language sql immutable set search_path = ''
  return case
    when c.fact_trait is not null then jsonb_strip_nulls(jsonb_build_object('trait', c.fact_trait, 'values', to_jsonb(c.fact_values), 'via', c.fact_via))
    when c.number_trait is not null then jsonb_build_object('number', c.number_trait, 'at_least', c.at_least)
    when c.starts_with is not null then jsonb_build_object('starts_with', c.starts_with)
  end;

-- The one-value column goes once nothing reads it (category_where's body depended on it).
alter table private.category drop column fact_value,
  add check ((fact_trait is null) = (fact_values is null));

-- As 13e-4a's, a fact matching any of the filter's values.
create or replace function private.fits_where(p_thing uuid, p_where jsonb, p_as_of timestamptz) returns boolean
  language sql stable set search_path = ''
  return p_where is null
    or (p_where ? 'trait' and p_where ->> 'via' is null and exists (
      select from private.fact f
      where f.thing_id = p_thing and f.trait = p_where ->> 'trait'
        and f.value_thing in (select v::uuid from jsonb_array_elements_text(p_where -> 'values') as v)
        and f.added_at <= p_as_of and (f.removed_at is null or f.removed_at > p_as_of)))
    or (p_where ->> 'via' = 'country' and exists (
      select from private.fact v join private.fact f on f.thing_id = v.value_thing
      where v.thing_id = p_thing and v.trait = 'country' and v.added_at <= p_as_of and (v.removed_at is null or v.removed_at > p_as_of)
        and f.trait = p_where ->> 'trait'
        and f.value_thing in (select x::uuid from jsonb_array_elements_text(p_where -> 'values') as x)
        and f.added_at <= p_as_of and (f.removed_at is null or f.removed_at > p_as_of)))
    or (p_where ? 'number' and exists (
      select from private.number_fact n
      where n.thing_id = p_thing and n.trait = p_where ->> 'number' and n.value >= (p_where ->> 'at_least')::numeric
        and n.added_at <= p_as_of and (n.removed_at is null or n.removed_at > p_as_of)))
    or (p_where ? 'starts_with' and exists (
      select from private.thing_alias a
      where a.thing_id = p_thing and private.alias_starts(a.alias, p_where ->> 'starts_with')
        and a.added_at <= p_as_of and (a.removed_at is null or a.removed_at > p_as_of)));

-- As 13e-4a's, with a fact filter's values as source entries of p_source, each one loaded.
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

-- As 13e-4a's: a subset's direct fact goes on the new thing only when it has one value (several can't be chosen among).
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
  if cat.fact_trait is not null and cat.fact_via is null and cardinality(cat.fact_values) = 1 then
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, cat.fact_trait, cat.fact_values[1], p_origin, 'miss:' || p_key);
  end if;
  return made;
end;
$$;

-- As 13e-4a's, holding a text for a subset of several values too.
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

-- As 13e-4a review's, accepting a held text for a subset of several values too.
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
    -- The subset's filter, not the hold's reason, decides: a text held for the offensive-word list on such a subset
    -- needs it too (13e-4a review).
    if exists (select from private.category c where c.key = r.category and (c.fact_via is not null or c.number_trait is not null or cardinality(c.fact_values) > 1)) then
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
