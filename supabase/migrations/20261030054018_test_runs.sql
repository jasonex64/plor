-- M14 14b-11, test runs (docs/milestones/M14-14b-11-test-runs.md): an admin plays any day, a draft too, and nothing is
-- saved. Approval's building of a day and play's matching of an answer each move into one function, so a test run
-- builds and checks a day exactly as approval and play do. Security change, approved by the human (2026-10-29: "Approve
-- 14b-11 as drafted, including the security change (two admin-only read functions plor_app may execute)"; DECISIONS.md
-- Log): plor_app may execute private.build_puzzle and private.resolve_draft_answer, which raise OB007 unless the caller
-- is an admin and write nothing.

-- The members a question accepts for some typed texts, as of a time: private.resolve_answer's matching (its comment in
-- the baseline says what it reads), here so a published day and a draft resolve one way. q is a question as approval
-- builds it (category, root, member_of, where, host_answers). Not granted: only the two guarded functions below call
-- it, with their owner's rights.
create function private.resolve_in(q jsonb, as_of timestamptz, p_texts text[])
  returns table (alias text, thing_id uuid, caught boolean, ancestors uuid[])
  language plpgsql stable set search_path = ''
as $$
declare
  hosts uuid[];
  extras uuid[];
begin
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

revoke all on function private.resolve_in(jsonb, timestamptz, text[]) from public, anon, authenticated, service_role;

-- As the baseline's, its matching in private.resolve_in.
create or replace function private.resolve_answer(p_game text, p_date date, p_index int, p_texts text[])
  returns table (alias text, thing_id uuid, caught boolean, ancestors uuid[])
  language plpgsql stable security definer set search_path = ''
as $$
declare
  q jsonb;
  as_of timestamptz;
begin
  -- answers_as_of alone would hide a missing approved_at (greatest() skips nulls), so it's checked here (13b review).
  select p.content -> 'questions' -> p_index, private.answers_as_of(p.content, p.puzzle_date) into q, as_of
  from private.puzzle p where p.game_id = p_game and p.puzzle_date = p_date and p.content ->> 'format' = '3' and p.content ? 'approved_at';
  if q is null or as_of is null then
    raise exception 'resolve_answer: % % has no approved format-3 question %', p_game, p_date, p_index;
  end if;
  return query select * from private.resolve_in(q, as_of, p_texts);
end;
$$;

-- A drafted day as approval would store it now, without storing it: the baseline's private.approve_puzzle checks and
-- builds, moved here (its comment there says what they are), so a test run of a draft is refused with approval's own
-- problems (14b-11, answer 11). Whether the day is over is approval's question, not this one's: a test run may play a
-- past day.
create function private.build_puzzle(p_user uuid, p_content jsonb) returns jsonb
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
  return p_content || jsonb_build_object('questions', approved);
end;
$$;

revoke all on function private.build_puzzle(uuid, jsonb) from public, anon, authenticated, service_role;

grant execute on function private.build_puzzle(uuid, jsonb) to plor_app;

-- As the baseline's, its checks and building in private.build_puzzle. The admin is checked here too, before the day's
-- date, so a player who isn't one learns nothing about it.
create or replace function private.approve_puzzle(p_user uuid, p_content jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select from private.admin where user_id = p_user) then
    raise exception 'admins_only: % is not an admin', p_user using errcode = 'OB007';
  end if;
  if (p_content ->> 'date')::date < private.today() then
    raise exception 'day_past: % % is over', p_content ->> 'game_id', p_content ->> 'date' using errcode = 'OB008';
  end if;
  insert into private.puzzle (game_id, puzzle_date, content)
  values (p_content ->> 'game_id', (p_content ->> 'date')::date,
          private.build_puzzle(p_user, p_content) || jsonb_build_object('approved_at', now()))
  on conflict (game_id, puzzle_date) do update set content = excluded.content;
end;
$$;

-- A draft's question (from private.build_puzzle) resolved as of now, for a test run (14b-11, answer 10: it plays as if
-- approved this second). Admins only, as build_puzzle; it reads, and writes nothing.
create function private.resolve_draft_answer(p_user uuid, p_question jsonb, p_texts text[])
  returns table (alias text, thing_id uuid, caught boolean, ancestors uuid[])
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin where user_id = p_user) then
    raise exception 'admins_only: % is not an admin', p_user using errcode = 'OB007';
  end if;
  return query select * from private.resolve_in(p_question, now(), p_texts);
end;
$$;

revoke all on function private.resolve_draft_answer(uuid, jsonb, text[]) from public, anon, authenticated, service_role;

grant execute on function private.resolve_draft_answer(uuid, jsonb, text[]) to plor_app;
