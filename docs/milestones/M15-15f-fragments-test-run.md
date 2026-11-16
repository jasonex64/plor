# M15 15f — Fragments' test run, and one date for both games on the Puzzles page

**Status:** in progress. Drafted 2026-11-15 from the human's request and answers below; the design's security part is approved in answer 2 ("Approve as proposed (Recommended)"). 15f-1 is being built.

## Goal
On `/admin/puzzles` a chosen date shows that date's day for both games, and an admin can play a test run of a Fragments day as they can an Offbeat one, with nothing saved.

## Who uses it / what breaks without it
- **Used by:** the human, approving the beta's days from 2026-11-17 and each weekly batch after it.
- **Breaks without it:** the human can't try a Fragments day before players get it ("why can't i playtest fragments like i can offbeat?"); a Fragments day is first played as their real run, on a day that can't change once started. And the page reads oddly: "tuesday 17 nov shows the one draft day for the first game, but shows every single of fragment's games from 17th through 30th" (`src/app/admin/puzzles/puzzles.tsx:64-77, 119`: `SubstringDays` is rendered once for the page, with every day).

## Source
- `docs/milestones/M14-14b-11-test-runs.md`, the ticket that built Offbeat's test run, and its answers: 1 "any day, but it should also be able to be the upcoming one too"; 2 "Nothing at all"; 3 "i need the real screen and animations so i can critique it"; 4 "Admins only"; 7 "Drafts too".
- DESIGN.md, "Test runs (admin)" and "Game 2's plain round".
- DECISIONS.md: Puzzle approval (the admin routes check the admin first); App database role (`plor_app`, least privilege); the Game 2 rows of 2026-11-07 (the dictionary is not readable by `plor_app`: `supabase/tests/game_2_rounds.test.sql`, "plor_app can't read the word list").
- CLAUDE.md, Security: grants are proposed first and recorded.

## Answers (human, 2026-11-15)
The request: "can u build it? make it the same type of style as the other game for now."
1. The page: "One date, both games (Recommended)": the chosen date shows Offbeat's day and Fragments' day, each with its own Approve and Play test.
2. The database function: "Approve as proposed (Recommended)". As put to the human: "one new function: admins only, reads the word list to judge one word, writes nothing. The website's limited login may call it; it still can't read the word list itself." **Claude's reading, to be said to the human with the build:** the real screen shows a missed round's example words, which are read from the same list, so the function also returns those for a round that ended without a word; still admins only, still writing nothing.
3. The rules: "Exactly the same (Recommended)": any drafted or approved Fragments day, the real play screen with the real 20-second timer, admins only, nothing saved, a bar saying it's a test with Restart.

## Assumptions (say if any is wrong)
- "Any day" for Fragments means what the files and the database hold: a draft in `content/substrings/` or an approved day in `private.puzzle`.
- A test run of a date with both a draft and an approved day plays the draft, as the page shows the draft there ("it has been redrafted").
- Fragments has no report of a refused word to the Audit page (Offbeat's test run reports a refused answer; game 2 has no such review), so a Fragments test run writes nothing at all.

## Acceptance criteria and plan
**15f-1 — one date, both games.** One pull request from `m15-launch-readiness`. No database change. Tests first.
- [ ] The Days row lists every date from today on that has a day of either game, and the chosen date shows Offbeat's day (or its "Not drafted" slot, as now) and then Fragments' day for that date alone (or that it has none) → verify: e2e, failing first: with Fragments days on several dates, the chosen date shows one Fragments day, and choosing another date shows that one.
- [ ] Approving a Fragments day works as before from its new place, the redraft message included → verify: `e2e/substring-days.e2e.ts`, changed only where it named the old list (say which lines and why).
- [ ] Nothing else on the page changes: the tomorrow warning, Offbeat's Approve and Play test, "Test an earlier day" → verify: `e2e/admin-area.e2e.ts`, `approve-and-play.e2e.ts`, `test-run.e2e.ts` and `calm.e2e.ts` pass unchanged.
- [ ] DESIGN.md says the page as built.

**15f-2 — Fragments' test run.** One pull request, after 15f-1 is merged. One migration: **the hosted `db push` is the human's, after the merge.**
- [ ] One new function, `private.judge_test_word` (the name may follow the file's neighbours): security definer, empty `search_path`, refuses anyone not in `private.admin` (OB007), reads `private.dictionary_word`, writes nothing; `plor_app` may execute it and still can't select from `private.dictionary_word`; no other grant, role or policy changes → verify: pgTAP, failing first (a non-admin refused; an admin gets a known word accepted and an unknown one refused; the table privilege unchanged; row counts of every game table equal before and after).
- [ ] `POST /api/admin/test/substrings` checks the admin before it reads anything (403 `admins_only`), plays a draft or an approved day by date (404 when there is neither; 422 with the problems for an invalid draft), holds no state (the browser sends its moves each time, as Offbeat's does), judges by the same rules as a real round (in the dictionary, holds the letters once everything but letters is dropped, not used earlier in the run, in time), scores with `src/game/substring-scoring.ts`, and writes nothing → verify: db tests, failing first, the last by comparing the counts of `private.run`, `question_open`, `round_word`, `round_reject` and the points ledger before and after a whole test run.
- [ ] `/admin/test2/<date>` (as `/play2` beside `/play`) shows the real Fragments screen with the test bar ("Test run: nothing is saved", Restart, back to Puzzles), the real countdown, a missed round's example words as a player sees them, and the result without Share, comments or a board → verify: e2e, a whole test day with an accepted word, a refused one and a timeout; then the database's counts unchanged.
- [ ] "Play test" stands beside Fragments' Approve on the Puzzles page → verify: the same e2e starts from it.
- [ ] Offbeat's test run is untouched → verify: `e2e/test-run.e2e.ts` and `src/app/api/admin/test/route.db.test.ts` pass unchanged.
- [ ] DECISIONS.md (a security change, with answer 2 quoted and the examples said plainly) and DESIGN.md.

## Out of scope
- A test run without the timer, or one that shows the answer words after every round (answer 3's other options).
- "Test an earlier day" for Fragments beyond what the page lists (Offbeat's own is a known rough edge: ROADMAP, Next revision).
- Any change to how Fragments is judged or scored for players.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 20 seconds | A round's timer in a test run | The real game's (`private.question_deadline`; human, 2026-10-22, S6); not a new number |
| 3 example words | A missed round | The real game's (M16 16d); not a new number |

No new number. If the build needs one, it stops and asks.

## Plan
15f-1: 1. the e2e for the chosen date → verify: fails on the old page. 2. The page: the Days row from both games' dates; Fragments' day inside the chosen date. → verify: that e2e, then the page's other e2e, one file at a time. 3. DESIGN.md. 4. The `reviewer`.
15f-2: 1. pgTAP for the function → fails; the migration → passes. 2. The route's db tests → fail; the route → pass. 3. The screen and its e2e. 4. DECISIONS, DESIGN. 5. The `reviewer`.

## Removes
15f-1: `SubstringDays`' whole-page list (its one day's view stays). 15f-2: nothing expected.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
