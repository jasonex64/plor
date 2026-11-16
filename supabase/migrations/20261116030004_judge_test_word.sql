-- M15 15f-2, Fragments' test run (docs/milestones/M15-15f-fragments-test-run.md). Security change, approved by the human
-- (2026-11-15, answer 2: "Approve as proposed (Recommended)"; DECISIONS.md Log): plor_app may execute one admin-only
-- function that reads the word list. A test run saves nothing, so it has no run to judge a word against (private.judge_word)
-- and no finished run to give examples (private.round_examples); the browser holds the run and the route judges from the
-- moves it sends. What only the word list can answer is this function's: how a typed word is shown if it is in the
-- dictionary, and, for the rounds that ended without a word, those rounds' example words, picked as private.
-- round_examples_core picks them. It reads private.dictionary_word and writes nothing; plor_app still can't read the table.
-- The rest of a try's rules (the letters, a word used earlier in the run, the clock, the points) are the route's, from the
-- moves, in TypeScript.
create function private.judge_test_word(p_user uuid, p_key text, p_clean text, p_plain text, p_missed text[]) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin where user_id = p_user) then
    raise exception 'admins_only: % is not an admin', p_user using errcode = 'OB007';
  end if;
  return jsonb_build_object(
    -- The word as the real game shows it (private.shown_spelling), null when the key is not a dictionary word or none was asked.
    'word', case when p_key is not null and exists (select from private.dictionary_word w where w.word_key = p_key)
                 then private.shown_spelling(p_key, p_clean, p_plain) end,
    -- For each of the missed rounds' letters, in the order given, as private.round_examples_core.
    'examples', coalesce((
      select jsonb_agg(to_jsonb(array(
        select q.spelling from (
          select distinct on (length(w.word_key), w.word_key) w.word_key, w.spelling
          from private.dictionary_word w
          where w.everyday and position(m.letters in w.word_key) > 0
          order by length(w.word_key), w.word_key, w.spelling collate "C"
        ) q
        order by length(q.word_key), q.word_key
        limit 3)) order by m.n)
      from unnest(p_missed) with ordinality as m(letters, n)), '[]'::jsonb));
end;
$$;

revoke all on function private.judge_test_word(uuid, text, text, text, text[]) from public, anon, authenticated, service_role;
grant execute on function private.judge_test_word(uuid, text, text, text, text[]) to plor_app;
