-- M23 23e-1: approving a day on a clock (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1; DECISIONS.md, Log).
-- Security change, approved by the human with the ticket (2026-11-25: "Approve 23e", security changes included):
-- private.build_puzzle, which private.approve_puzzle and the admin's test run both call, accepts a day of format 4 from
-- an admin. It is the function of 20261030054018_test_runs.sql with one new step; the format 3 path, its security settings
-- (security definer, an empty search_path) and its grant to plor_app are unchanged, and nothing new is granted.
--
-- The day's rules that need no database (three questions of three different lists, a wording, six rare answers, a size) are
-- src/content/puzzle.ts's, which the approve route applies; here a day is held to what only the base can say: each question's
-- category is a researched list, and every answer it names, in its levels or among its rare ones, is a member of it. A day
-- is stored with each question's root and member_of, as a day of seven questions is.

-- A day on a clock as approval stores it. Not granted: only private.build_puzzle calls it, with its owner's rights, as it
-- calls private.resolve_in (20261030054018_test_runs.sql).
create function private.build_clock_day(p_content jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  approved jsonb := '[]';
  q jsonb;
  cat private.category;
  member_ids uuid[];
  problems text[] := '{}';
begin
  for i in 0 .. jsonb_array_length(p_content -> 'questions') - 1 loop
    q := p_content -> 'questions' -> i;
    select * into cat from private.category where key = q ->> 'category';
    if not found then
      problems := problems || format('question %s: no category %s', i + 1, q ->> 'category');
      continue;
    end if;
    if not exists (select from private.thing_source s where s.thing_id = cat.root and s.source = 'research') then
      problems := problems || format('question %s: %s is not a researched list', i + 1, cat.key);
      continue;
    end if;
    member_ids := array(select private.category_members(cat.key));
    problems := problems || array(
      select format('question %s: level on %s, which is not a %s', i + 1, l, cat.key)
      from jsonb_object_keys(coalesce(q -> 'levels', '{}')) as l where l::uuid <> all (member_ids));
    problems := problems || array(
      select format('question %s: rare answer %s is not a %s', i + 1, r, cat.key)
      from jsonb_array_elements_text(coalesce(q -> 'rare', '[]')) as r where r::uuid <> all (member_ids));
    approved := approved || jsonb_build_array(q || jsonb_build_object('root', cat.root, 'member_of', cat.member_of));
  end loop;
  if cardinality(problems) > 0 then
    raise exception 'puzzle_invalid: %', array_to_string(problems, '; ') using errcode = 'OB009', detail = to_jsonb(problems)::text;
  end if;
  return jsonb_set(p_content, '{questions}', approved);
end;
$$;

revoke all on function private.build_clock_day(jsonb) from public, anon, authenticated, service_role;

-- As 20261030054018_test_runs.sql's, with a day of format 4 built by private.build_clock_day.
create or replace function private.build_puzzle(p_user uuid, p_content jsonb) returns jsonb
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
  if p_content ->> 'format' = '4' then
    return private.build_clock_day(p_content);
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
