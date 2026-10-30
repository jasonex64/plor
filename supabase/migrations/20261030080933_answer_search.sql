-- M14 14b-12 (docs/milestones/M14-14b-12-answer-lists.md): a player who has finished a day's run searches what each
-- question on their result card accepted; from the day's end, every question, as yesterday's card shows them. Security
-- change, approved by the human (2026-10-30: "Approve 14b-11c and 14b-12 as drafted, including their security changes
-- (report_test_miss and search_answers, which plor_app may execute)"; DECISIONS.md Log): plor_app may execute
-- private.search_answers.

-- The answers question p_index of a played day accepted that bear a name containing p_text (normalized by the caller,
-- src/game/answers.ts, as aliases are), at most p_limit: names starting with it first, then the most given, then by the
-- name that matched. With p_text empty, the most given only (the ticket: "An empty box shows the 10 most-given"). Each
-- with its main name, the name that matched (which can differ: "ursus maritimus" finds the polar bear), its tier from
-- the day's levels (anything unlisted is rare, M13 D5), and how many players gave it before the day's midnight, as the
-- result card's shares count them (src/game/ledger.ts, dayCounts), or null while fewer than p_min_players answered the
-- question (M11 H5; human, 2026-10-30: "Keep the 5-player minimum (Recommended)"). Never a thing ID.
--
-- Who may search (OB013 otherwise), as the day's host answers open (DECISIONS.md Log, 2026-10-25): before the day's
-- midnight, a player whose own run of it is over, for the questions they answered (their result card); after it, every
-- question, to anyone whose run of it isn't still going.
--
-- What the day accepted is what private.resolve_in, play's own check, accepts as of the day's answers
-- (private.answers_as_of); each candidate is checked with it, by every one of its names that matches, so the list holds
-- exactly that. Candidates must include everything the day accepted, so they're found with the base as it stood then:
-- names and acceptances valid at that moment, and the things under the frozen root through the one downward walk
-- (private.descendants_now), from the root and from every thing whose kind_of link ended since, which covers a branch
-- cut after the day was fixed (14b-12 review). The question's letter is applied to the names before any check, and its
-- filter before play's check, so a narrow question on a broad root (animal, 74,092 things) stops at the limit.
create function private.search_answers(p_user uuid, p_game text, p_date date, p_index int, p_text text, p_limit int, p_min_players int)
  returns table (name text, matched text, tier text, players int)
  language plpgsql stable security definer set search_path = ''
as $$
declare
  content jsonb;
  q jsonb;
  as_of timestamptz;
  run_state text;
  answered_here int;
  given int;
  kept int := 0;
  c record;
begin
  select p.content into content from private.puzzle p
  where p.game_id = p_game and p.puzzle_date = p_date and p.content ? 'approved_at';
  q := content -> 'questions' -> p_index;
  if q is null then
    raise exception using errcode = 'OB013', message = format('search_answers: %s %s has no question %s', p_game, p_date, p_index);
  end if;
  select s.status, s.answered into run_state, answered_here from private.run_status s
  where s.user_id = p_user and s.game_id = p_game and s.puzzle_date = p_date;
  if run_state = 'in_progress'
    or (p_date >= private.today() and (run_state is null or p_index >= answered_here)) then
    raise exception using errcode = 'OB013', message = format('search_answers: question %s of %s isn''t open to this player', p_index, p_date);
  end if;
  as_of := private.answers_as_of(content, p_date);
  select count(*)::int into given from private.run_event e
  where e.game_id = p_game and e.puzzle_date = p_date and e.question_idx = p_index and private.day_of(e.created_at) = e.puzzle_date;
  for c in
    with counts as (
      select e.entry_id::uuid as id, count(*)::int as n from private.run_event e
      where e.game_id = p_game and e.puzzle_date = p_date and e.question_idx = p_index and private.day_of(e.created_at) = e.puzzle_date
      group by e.entry_id
    ),
    members (id) as (
      select x.id from counts x where p_text = ''
      union
      select private.descendants_now(array[(q ->> 'root')::uuid]) where p_text <> ''
      union
      select private.descendants_now(array(
        select f.thing_id from private.fact f where f.trait = 'kind_of' and f.removed_at > as_of)) where p_text <> ''
      union
      select x.thing_id from private.category_extra x
      where p_text <> '' and x.category = q ->> 'category' and x.added_at <= as_of and (x.removed_at is null or x.removed_at > as_of)
    ),
    named as (
      select a.thing_id, array_agg(a.alias order by left(a.alias, length(p_text)) = p_text desc, a.alias) as aliases,
             bool_or(left(a.alias, length(p_text)) = p_text) as starts
      from private.thing_alias a join members m on m.id = a.thing_id
      where a.added_at <= as_of and (a.removed_at is null or a.removed_at > as_of) and strpos(a.alias, p_text) > 0
        and (q -> 'where' ->> 'starts_with' is null or private.alias_starts(a.alias, q -> 'where' ->> 'starts_with'))
      group by a.thing_id
    )
    select n.thing_id, n.aliases, t.name, coalesce(k.n, 0) as n
    from named n join private.thing t on t.id = n.thing_id left join counts k on k.id = n.thing_id
    order by n.starts desc, coalesce(k.n, 0) desc, n.aliases[1], n.thing_id
  loop
    exit when kept >= p_limit;
    -- A filter (a fact, a number) is checked here, in the list's order, so it runs only until the limit is reached: on
    -- every candidate at once it took 7.9 s for "a" among endangered animals (14b-12 Evidence).
    continue when q -> 'where' is not null and not q -> 'where' ? 'starts_with' and not private.fits_where(c.thing_id, q -> 'where', as_of);
    -- The first of its names, in the list's order, that the day accepted for it.
    select r.alias into matched from private.resolve_in(q, as_of, c.aliases) r join unnest(c.aliases) with ordinality as o(alias, ord) on o.alias = r.alias
    where r.thing_id = c.thing_id order by o.ord limit 1;
    if matched is not null then
      kept := kept + 1;
      name := c.name;
      tier := coalesce(q -> 'levels' ->> c.thing_id::text, 'rare');
      players := case when given >= p_min_players then c.n end;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function private.search_answers(uuid, text, date, int, text, int, int) from public, anon, authenticated, service_role;

grant execute on function private.search_answers(uuid, text, date, int, text, int, int) to plor_app;
