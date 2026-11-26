-- M23 23e-2 (docs/milestones/M23-23e-drafting-and-approving.md, design 6; the human's answer 53: a text on no list waits for
-- the human). Security change, approved by the human with the ticket (2026-11-25: "Approve 23e", security changes included;
-- DECISIONS.md, Log): on a day on a clock (format 4) private.record_miss only stores the missed text; it decides nothing, so
-- no answer and no review row comes of it however many players typed it. A day of any other format is judged as before.
-- This is 20261030074353_test_misses.sql's function with one step added, after the empty-text return: nothing else, its
-- signature, security settings and grants are unchanged.
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
  if exists (select from private.puzzle p where p.game_id = p_game and p.puzzle_date = p_date and p.content ->> 'format' = '4') then
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
