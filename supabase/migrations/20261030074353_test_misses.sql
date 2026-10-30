-- M14 14b-11c (docs/milestones/M14-14b-11c-test-misses-to-audit.md): a text an admin's test run refused waits on the
-- Audit page as a `reported` review, decided with the audit's existing actions. Security change, approved by the human
-- (2026-10-30: "Approve 14b-11c and 14b-12 as drafted, including their security changes (report_test_miss and
-- search_answers, which plor_app may execute)"; DECISIONS.md Log): plor_app may execute private.report_test_miss.

-- reported: from an admin's test run, 1 player of 1. It never touches private.missed_answer, so players' threshold
-- (private.record_miss) never counts it.
alter table private.miss_review drop constraint miss_review_outcome_check,
  add constraint miss_review_outcome_check check (outcome in ('accepted', 'held', 'held_subset', 'rejected', 'near_typo', 'reported'));

-- Adds a test run's refused text (normalized by the caller, src/game/runs.ts, as misses are) to the audit for the
-- question's category, unless the category already has a review of that text, decided or not; true when it was added.
-- p_question is the question as the test run plays it (approved, or a draft as approval would build it now). As
-- private.record_miss, a letter subset's text that doesn't start with its letter is left out: no decision could make
-- the question accept it (14b-11c review). Admins only, as the test route (OB007). The caller leaves out a text a typo
-- from a member, as play's audit would call it a near-typo, not a gap.
create function private.report_test_miss(p_user uuid, p_question jsonb, p_text text) returns boolean
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_user) then
    raise exception using errcode = 'OB007', message = 'report_test_miss: admins only';
  end if;
  if p_question -> 'where' ->> 'starts_with' is not null and not private.alias_starts(p_text, p_question -> 'where' ->> 'starts_with') then
    return false;
  end if;
  insert into private.miss_review (category, text, outcome, players, answered)
  values (p_question ->> 'category', p_text, 'reported', 1, 1)
  on conflict (category, text) do nothing;
  return found;
end;
$$;

revoke all on function private.report_test_miss(uuid, jsonb, text) from public, anon, authenticated, service_role;

grant execute on function private.report_test_miss(uuid, jsonb, text) to plor_app;

-- As the baseline's, with a reported text decided as a held one (accept: a new member) or a rejected one
-- (accept_for_category: a thing it names joins this category alone), and that acceptance undone as a rejected one's.
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
  elsif p_action = 'undo' and r.decision = 'accepted' and r.outcome in ('rejected', 'reported') and r.chosen is not null then
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
  elsif p_action = 'accept' and r.outcome in ('held', 'held_subset', 'reported') and r.decision is null then
    made := private.add_player_thing(r.category, r.text, 'human');
    -- The subset's filter, not the hold's reason, decides: a text held for the offensive-word list on such a subset
    -- needs it too (13e-4a review).
    if exists (select from private.category c where c.key = r.category and (c.fact_via is not null or c.number_trait is not null or cardinality(c.fact_values) > 1)) then
      insert into private.category_extra (category, thing_id, added_by) values (r.category, made, p_admin);
    end if;
    decided := 'accepted';
  elsif p_action = 'accept_for_category' and r.outcome in ('rejected', 'reported') and r.decision is null then
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

-- As the baseline's, with each thing a text names carrying the names of what it's a kind of, so its meanings can be told
-- apart on the Audit page ("heel": a bottom, a skeletal structure; 14b-11c, where a test run's "apple" offered four
-- identical buttons).
create or replace function private.audit_list(p_admin uuid) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_list: admins only';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'category', r.category, 'category_name', c.name, 'text', r.text, 'outcome', r.outcome,
      'players', r.players, 'answered', r.answered, 'reached_at', r.reached_at,
      'thing', (select jsonb_build_object('id', t.id, 'name', t.name) from private.thing t where t.id = r.thing_id),
      'decision', r.decision, 'decided_at', r.decided_at,
      'chosen', (select jsonb_build_object('id', t.id, 'name', t.name) from private.thing t where t.id = r.chosen),
      'named', (
        select coalesce(jsonb_agg(distinct jsonb_build_object('id', t.id, 'name', t.name, 'kinds', (
          select coalesce(jsonb_agg(pt.name order by pt.name), '[]')
          from private.fact f join private.thing pt on pt.id = f.value_thing
          where f.thing_id = t.id and f.trait = 'kind_of' and f.removed_at is null))), '[]')
        from private.thing_alias a join private.thing t on t.id = a.thing_id
        where a.alias = r.text and a.removed_at is null and a.thing_id is distinct from r.thing_id)
    ) order by r.reached_at desc, r.id desc)
    from private.miss_review r join private.category c on c.key = r.category), '[]');
end;
$$;

-- As the baseline's, with an admin's test-run report (outcome reported) left out of what players' learning checks, and
-- replaced once players reach the threshold, so a report never stops players' learning (human, 2026-10-30, 14b-11c
-- answer 2: "auto-learning stay untouched"; 14b-11c review).
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
  -- An admin's test-run report doesn't count: players' learning goes on as if it weren't there (14b-11c).
  if exists (select from private.miss_review r where r.category = cat.key and r.text = p_text and r.outcome <> 'reported') then
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
  -- Players reaching the threshold replace a test-run report of the same text, whatever was decided on it: an accepted
  -- one made the text a member, which returned above.
  insert into private.miss_review (category, text, outcome, thing_id, players, answered)
  values (cat.key, p_text, outcome, made, typed_by, answered)
  on conflict (category, text) do update set outcome = excluded.outcome, thing_id = excluded.thing_id, players = excluded.players,
    answered = excluded.answered, reached_at = now(), decision = null, chosen = null, decided_by = null, decided_at = null;
  insert into private.base_log (actor, action, detail)
  values ('players', 'miss_review', jsonb_build_object('category', cat.key, 'text', p_text, 'outcome', outcome,
    'thing', made, 'players', typed_by, 'answered', answered));
  return true;
end;
$$;
