-- M13 13b: learning from misses (docs/milestones/M13-13b-learning-from-misses.md). A text enough players type for a
-- category becomes an answer from the next day on, unless the facts reject it, and the human audits every outcome.
-- Security change (DECISIONS.md Log; human, 2026-10-24: "I approve 13b's design, adding LDNOOBW to SOURCES.md, and its
-- security change (new miss-review tables; plor_app may run the one miss function; admin-only audit functions)"):
-- plor_app logs a miss only through private.record_miss, which may add to the base; the audit runs through admin-only
-- functions; the new tables hold no grant for plor_app.

-- Removal from a moment on: nothing is deleted, so a day that started before keeps what it had (13b design, 4).
alter table private.thing_alias add column removed_at timestamptz, add check (removed_at >= added_at);
alter table private.fact add column removed_at timestamptz, add check (removed_at >= added_at);

-- The miss's text normalized as aliases are (src/content/puzzle.ts, normalize), which misses are counted by. Null on
-- misses logged before 13b: those days (formats 1 and 2) name no category, so they're never counted.
alter table private.missed_answer add column normalized text;

-- A thing the human accepted for one category against the facts ("Listed, you decide (Recommended)": "spider" for an
-- insect, "close enough"), without changing its facts anywhere else.
create table private.category_extra (
  category text not null references private.category (key),
  thing_id uuid not null references private.thing (id) on delete cascade,
  added_by uuid not null,
  added_at timestamptz not null default now(),
  -- Undone from this moment on (human, 2026-10-24: "Yes, undo anything (Recommended)").
  removed_at timestamptz check (removed_at >= added_at),
  primary key (category, thing_id)
);

-- A text that reached the threshold for a category (M13 D4), decided once: accepted (a new member), held (on the
-- LDNOOBW list), rejected (it names a thing outside the category) or near_typo (one typo from a member). thing_id is
-- the thing made for it, when one was; chosen the thing an admin linked it to or accepted for the category.
create table private.miss_review (
  id bigint generated always as identity primary key,
  category text not null references private.category (key),
  text text not null check (text <> ''),
  outcome text not null check (outcome in ('accepted', 'held', 'rejected', 'near_typo')),
  thing_id uuid references private.thing (id),
  players int not null check (players > 0),
  answered int not null check (answered >= players),
  reached_at timestamptz not null default now(),
  decision text check (decision in ('undone', 'linked', 'accepted', 'dismissed')),
  chosen uuid references private.thing (id),
  decided_by uuid,
  decided_at timestamptz,
  unique (category, text),
  check ((decision is null) = (decided_by is null) and (decision is null) = (decided_at is null))
);

alter table private.base_log drop constraint base_log_action_check,
  add constraint base_log_action_check check (action in ('import', 'define_category', 'miss_review', 'audit'));

alter table private.category_extra enable row level security;
alter table private.miss_review enable row level security;
revoke all on table private.category_extra, private.miss_review from public, anon, authenticated, service_role;

-- A thing and everything above it in the kind_of tree, as the base stood at p_as_of.
create or replace function private.ancestors_as_of(p_thing uuid, p_as_of timestamptz) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive up (id) as (
    select p_thing
    union
    select f.value_thing from private.fact f join up on f.thing_id = up.id
    where f.trait = 'kind_of' and f.added_at <= p_as_of and (f.removed_at is null or f.removed_at > p_as_of)
  )
  select id from up;
$$;

-- Whether a thing is a member of a category now: under its root with a name players can type (and member_of its
-- thing if it has one), or accepted for it by the human.
create function private.in_category_now(p_thing uuid, p_key text) returns boolean
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
          where m.thing_id = p_thing and m.trait = 'member_of' and m.value_thing = c.member_of and m.removed_at is null)));
$$;
revoke all on function private.in_category_now(uuid, text) from public, anon, authenticated, service_role;

-- A category's members now (the approval checks, drafting, the review): as before, without what was removed, and with
-- what the human accepted for it.
create or replace function private.category_members(p_key text) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive cat as (select root, member_of from private.category where key = p_key),
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
  union
  select e.thing_id from private.category_extra e where e.category = p_key and e.removed_at is null;
$$;

-- When a format-3 day's answers are fixed: the start of its day (midnight Pacific, as private.next_reset), or its
-- approval if that came later (human, 2026-10-24: "Yes, from the next day (Recommended)"). A day approved ahead picks
-- up what was learned before it starts; a started day never changes.
create function private.answers_as_of(p_content jsonb, p_date date) returns timestamptz
  language sql stable set search_path = ''
  return greatest((p_content ->> 'approved_at')::timestamptz, p_date::timestamp at time zone 'America/Los_Angeles');
revoke all on function private.answers_as_of(jsonb, date) from public, anon, authenticated, service_role;

-- As 13a-2's, resolved as of private.answers_as_of instead of the approval alone, without what was removed by then,
-- and with what the human accepted for the question's category by then.
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
      and (a.thing_id = any(extras) or (
        a.thing_id <> (q ->> 'root')::uuid and (q ->> 'root')::uuid = any(up.ids)
        and exists (
          select from private.thing_alias n
          where n.thing_id = a.thing_id and n.kind = 'name' and n.added_at <= as_of and (n.removed_at is null or n.removed_at > as_of))
        and (q ->> 'member_of' is null or exists (
          select from private.fact m
          where m.thing_id = a.thing_id and m.trait = 'member_of' and m.value_thing = (q ->> 'member_of')::uuid
            and m.added_at <= as_of and (m.removed_at is null or m.removed_at > as_of)))));
end;
$$;

-- As 13a-2's, without what was removed.
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
    problems := problems || array(
      select format('question %s: host answer %s is not in the host bank', i + 1, h) from unnest(hosts) as h where h <> all (bank));
    -- What the host catches: the host answers and everything under them.
    if not exists (
      with recursive caught (id) as (
        select unnest(hosts)
        union
        select f.thing_id from private.fact f join caught c on f.value_thing = c.id where f.trait = 'kind_of' and f.removed_at is null
      )
      select from unnest(member_ids) as m(id) join private.thing_alias a on a.thing_id = m.id
      where a.removed_at is null and m.id not in (select id from caught) and (pattern is null or a.alias !~ pattern)
    ) then
      problems := problems || format('question %s: no answer the host doesn''t catch can be typed without %s', i + 1, stolen);
    end if;
    approved := approved || jsonb_build_array(q || jsonb_build_object('root', cat.root, 'member_of', cat.member_of, 'members', members));
  end loop;
  if cardinality(problems) > 0 then
    raise exception 'puzzle_invalid: %', array_to_string(problems, '; ') using errcode = 'OB009';
  end if;
  insert into private.puzzle (game_id, puzzle_date, content)
  values (p_content ->> 'game_id', (p_content ->> 'date')::date, p_content || jsonb_build_object('questions', approved, 'approved_at', now()))
  on conflict (game_id, puzzle_date) do update set content = excluded.content;
end;
$$;

-- The questions of format-3 days that ask a category.
create function private.category_questions(p_key text) returns table (game_id text, puzzle_date date, question_idx smallint)
  language sql stable set search_path = ''
as $$
  select p.game_id, p.puzzle_date, (q.i - 1)::smallint
  from private.puzzle p cross join jsonb_array_elements(p.content -> 'questions') with ordinality as q(v, i)
  where p.content ->> 'format' = '3' and q.v ->> 'category' = p_key;
$$;
revoke all on function private.category_questions(text) from public, anon, authenticated, service_role;

-- The way players most often typed a text for a category, which a thing made for it is named.
create function private.typed_form(p_key text, p_text text) returns text
  language sql stable set search_path = ''
as $$
  select m.typed from private.missed_answer m join private.category_questions(p_key) q using (game_id, puzzle_date, question_idx)
  where m.normalized = p_text group by m.typed order by count(*) desc, m.typed limit 1;
$$;
revoke all on function private.typed_form(text, text) from public, anon, authenticated, service_role;

-- A new thing for a text, a member of the category from now: under its root, and member_of its thing if it has one.
create function private.add_player_thing(p_key text, p_text text, p_origin text) returns uuid
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
  return made;
end;
$$;
revoke all on function private.add_player_thing(text, text, text) from public, anon, authenticated, service_role;

-- Logs a miss for the question the player is on (false if it isn't: no run in progress at that index), and decides
-- what the text becomes once enough players typed it for the question's category (M13 D4): at least p_min_players,
-- and at least p_share_percent of the players who answered the category (a miss counts as answering), counted over
-- every day. In order: one typo from a member (p_near_typo) waits in the audit; a text naming a thing outside the
-- category is rejected (Facts win) and waits in the audit; one on the LDNOOBW list (p_listed) is held for the human;
-- any other becomes a new member. The caller (src/game/runs.ts) normalizes the text and works out the two flags.
create function private.record_miss(p_user uuid, p_game text, p_date date, p_index int, p_typed text, p_text text,
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
revoke all on function private.record_miss(uuid, text, date, int, text, text, boolean, boolean, int, numeric)
  from public, anon, authenticated, service_role;
grant execute on function private.record_miss(uuid, text, date, int, text, text, boolean, boolean, int, numeric) to plor_app;
-- One way to log a miss: through private.record_miss (DECISIONS.md, one way per thing). The insert policy goes with
-- the grant, so restoring one alone doesn't reopen the table (13b review).
revoke insert on table private.missed_answer from plor_app;
drop policy missed_answer_plor_app_insert on private.missed_answer;

-- The audit (human, 2026-10-24: "an easy way for me to audit what's added and remove if needed"): every text that
-- reached the threshold, newest first, with the things already named by it (a rejected text's meanings) and the thing
-- an admin chose. Admins only (OB007), as private.base_lookup.
create function private.audit_list(p_admin uuid) returns jsonb
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
        select coalesce(jsonb_agg(distinct jsonb_build_object('id', t.id, 'name', t.name)), '[]')
        from private.thing_alias a join private.thing t on t.id = a.thing_id
        where a.alias = r.text and a.removed_at is null and a.thing_id is distinct from r.thing_id)
    ) order by r.reached_at desc, r.id desc)
    from private.miss_review r join private.category c on c.key = r.category), '[]');
end;
$$;
revoke all on function private.audit_list(uuid) from public, anon, authenticated, service_role;
grant execute on function private.audit_list(uuid) to plor_app;

-- "N to review" on the admin pages ("Count on admin page (Recommended)"): held, rejected and near-typo texts not
-- yet decided.
create function private.audit_open_count(p_admin uuid) returns int
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_open_count: admins only';
  end if;
  return (select count(*)::int from private.miss_review where outcome <> 'accepted' and decision is null);
end;
$$;
revoke all on function private.audit_open_count(uuid) from public, anon, authenticated, service_role;
grant execute on function private.audit_open_count(uuid) to plor_app;

-- An admin's decision on a text, taking effect from now (13b design, 4), so a day that started before keeps what it
-- had. A decision that doesn't fit the text's state raises OB012.
--   undo: any decision that made an answer, from now (human, 2026-10-24: "Yes, undo anything (Recommended)"): an
--     accepted text's thing stops being an answer, a link's name goes, an acceptance for the category ends.
--   link: the text becomes a name of p_thing, a member of the category ("New answer, you link (Recommended)"); an
--     accepted text's own thing stops being an answer.
--   accept: a held text becomes a new member.
--   accept_for_category: p_thing, which the rejected text names, becomes a member of this category alone. A rejected
--     text can't be linked (human, 2026-10-24: "keep china as only the place and country for now").
--   dismiss: a held, rejected or near-typo text stays out.
create function private.audit_decide(p_admin uuid, p_review bigint, p_action text, p_thing uuid) returns void
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
  elsif p_action = 'accept' and r.outcome = 'held' and r.decision is null then
    made := private.add_player_thing(r.category, r.text, 'human');
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
revoke all on function private.audit_decide(uuid, bigint, text, uuid) from public, anon, authenticated, service_role;
grant execute on function private.audit_decide(uuid, bigint, text, uuid) to plor_app;

-- The admin lookup, as 13a-1's, without what was removed.
create or replace function private.base_lookup(p_admin uuid, p_alias text) returns jsonb
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
                    order by a.kind, a.alias), '[]') from private.thing_alias a where a.thing_id = t.id and a.removed_at is null),
      'sources', (select coalesce(jsonb_agg(jsonb_build_object('source', s.source, 'id', s.source_id)
                    order by s.source), '[]') from private.thing_source s where s.thing_id = t.id),
      'facts', (select coalesce(jsonb_agg(jsonb_build_object('trait', f.trait, 'value', v.name, 'origin', f.origin,
                    'source_ref', f.source_ref) order by f.trait, v.name), '[]')
                from private.fact f join private.thing v on v.id = f.value_thing where f.thing_id = t.id and f.removed_at is null),
      'categories', (select coalesce(jsonb_agg(c.key order by c.key), '[]') from private.category c where private.in_category_now(t.id, c.key))
    ) order by t.name)
    from private.thing t
    where t.id in (select a.thing_id from private.thing_alias a where a.alias = p_alias and a.removed_at is null)), '[]');
end;
$$;
