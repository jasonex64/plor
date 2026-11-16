# M15 15f — Fragments' test run, and one date for both games on the Puzzles page

**Status:** in progress. Drafted 2026-11-15 from the human's request and answers below; the design's security part is approved in answer 2 ("Approve as proposed (Recommended)"). 15f-1 is merged (PR #219, merge commit `d93b223`, 2026-11-15, nine green checks, the human's "Merge when green"). 15f-2 is merged (PR #220, 2026-11-15, as one squashed commit `f3d955e` from the human's GitHub account a moment before this session's own merge step, which found it already merged; nine green checks; the human's "Merge when green"); **it carries one migration, `20261116030004_judge_test_word.sql`: the hosted `db push` is the human's, after the merge.**

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
- [x] The Days row lists every date from today on that has a day of either game, and the chosen date shows Offbeat's day (or its "Not drafted" slot, as now) and then Fragments' day for that date alone (or that it has none) → verify: e2e, failing first: with Fragments days on several dates, the chosen date shows one Fragments day, and choosing another date shows that one. **Done:** `e2e/substring-days.e2e.ts`, "the chosen date shows one game 2 day, and choosing another date shows that one"; `src/app/admin/puzzle-dates.test.ts`.
- [x] Approving a Fragments day works as before from its new place, the redraft message included → verify: `e2e/substring-days.e2e.ts`, changed only where it named the old list (say which lines and why). **Done:** `e2e/substring-days.e2e.ts`, 2 passed; what changed in it is under Evidence.
- [x] Nothing else on the page changes: the tomorrow warning, Offbeat's Approve and Play test, "Test an earlier day" → verify: `e2e/admin-area.e2e.ts`, `approve-and-play.e2e.ts`, `test-run.e2e.ts` and `calm.e2e.ts` pass unchanged. **Done:** admin-area 4, approve-and-play 2, test-run 4 and calm 2 passed, their files unchanged.
- [x] DESIGN.md says the page as built. **Done:** the Puzzles page's bullet.

**15f-2 — Fragments' test run.** One pull request, after 15f-1 is merged. One migration: **the hosted `db push` is the human's, after the merge.**
- [x] One new function, `private.judge_test_word` (the name may follow the file's neighbours): security definer, empty `search_path`, refuses anyone not in `private.admin` (OB007), reads `private.dictionary_word`, writes nothing; `plor_app` may execute it and still can't select from `private.dictionary_word`; no other grant, role or policy changes → verify: pgTAP, failing first (a non-admin refused; an admin gets a known word accepted and an unknown one refused; the table privilege unchanged; row counts of every game table equal before and after). **Done:** `supabase/tests/fragments_test_run.test.sql`, 13 of 13; `supabase/tests/plor_app_role.test.sql`'s allow-list gains its one line.
- [x] `POST /api/admin/test/substrings` checks the admin before it reads anything (403 `admins_only`), plays a draft or an approved day by date (404 when there is neither; 422 with the problems for an invalid draft), holds no state (the browser sends its moves each time, as Offbeat's does), judges by the same rules as a real round (in the dictionary, holds the letters once everything but letters is dropped, not used earlier in the run, in time), scores with `src/game/substring-scoring.ts`, and writes nothing → verify: db tests, failing first, the last by comparing the counts of `private.run`, `question_open`, `round_word`, `round_reject` and the points ledger before and after a whole test run. **Done:** `src/app/api/admin/test/substrings/route.db.test.ts`, 11 tests, a whole test day compared with a real player's run on the same day.
- [x] `/admin/test2/<date>` (as `/play2` beside `/play`) shows the real Fragments screen with the test bar ("Test run: nothing is saved", Restart, back to Puzzles), the real countdown, a missed round's example words as a player sees them, and the result without Share, comments or a board → verify: e2e, a whole test day with an accepted word, a refused one and a timeout; then the database's counts unchanged. **Done:** `e2e/fragments-test-run.e2e.ts`, 3 passed.
- [x] "Play test" stands beside Fragments' Approve on the Puzzles page → verify: the same e2e starts from it. **Done:** the same e2e starts from it and measures it at 44px or more.
- [x] Offbeat's test run is untouched → verify: `e2e/test-run.e2e.ts` and `src/app/api/admin/test/route.db.test.ts` pass unchanged. **Done:** `e2e/test-run.e2e.ts` 4 passed; Offbeat's files and tests are not in the diff.
- [x] DECISIONS.md (a security change, with answer 2 quoted and the examples said plainly) and DESIGN.md. **Done:** DECISIONS, Log, 2026-11-15; DESIGN, "Test runs".

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
| Answer 2, as put to the human: the function "reads the word list to judge one word" | It also returns an accepted word's shown spelling, and the missed rounds' example words | The real screen shows both ("You played café"; a missed round's three words) and both come only from the word list; the examples were told to the human before the build, the spelling with the pull request |
| Answer 3: "Exactly the same" as a real round | No half-second lock between tries | The lock counts from the last stored try, and a test run stores nothing |
| The real judge: the server's clock decides `time_up` | The browser's countdown ends a test round; a try that reaches the server after 20 seconds, or while the time-up is on its way, is still judged | Stateless, as Offbeat's test run: the server keeps no open time. It is the admin's own practice run |
| The real routes: a try for a round already answered is `already_answered` | A 409 `not_open` | The moves the browser sends can't hold two words for one round |
| The ticket: a body flag for "play the draft" | None: the draft is played when the date has one, else the approved day, and the reply says which | One rule, the Assumptions' own |
| Answer 1: the chosen date shows both games' days | The small chip on each date in the Days row still tells Offbeat's state alone: a date only Fragments has reads "Not drafted" | The ticket: nothing else on the page changes; told to the human, whose call it is (ROADMAP, Next revision) |
| The ticket: a date Fragments has no day for says so | New words: "Nothing drafted for <date>." under Fragments, Offbeat's own line without its second sentence | No words were given; for the human to confirm |

## Evidence
**15f-2 (2026-11-15).**
- Failed first: pgTAP, "no function matches `private.judge_test_word`"; the route's db tests, an unresolved import of `./route`. The e2e was written after the screen; it was shown to fail by pointing the link at a wrong path (`toHaveURL`).
- After, each command alone: `npm test`: 69 files, 810 passed. The whole `npm run test:db`: 64 files, 501 passed. `npx supabase test db`: 41 files, 818 tests, PASS. `npx tsc --noEmit`: exit 0. `npm run lint`: clean.
- e2e, one file at a time: fragments-test-run 3, test-run 4, substring-days 2, admin-area 4, approve-and-play 2, play2 9, guest-play 5, look 7, how-to-play 7, boards 5, feed 8, today-games 4 passed; shell 9 passed and 1 failed (line 149, the known one: ROADMAP, For M15); calm failed once at creating a group (`toHaveURL`), a part this step doesn't touch, and passed 2 of 2 alone.
- **The function, read by the main session and the reviewer:** the admin check is its first statement and a null user is refused (OB007); it reads `private.dictionary_word` and writes nothing; `stable`, `security definer`, empty `search_path`; revoked from public, anon, authenticated and service_role, execute granted to `plor_app`, as `build_puzzle`'s. What it tells an admin: whether a key is a word, with its spelling, and three everyday example words for any letters. Nothing else is granted.
- **Nothing saved:** pgTAP and the db test count `run`, `run_event`, `question_open`, `round_word`, `round_reject`, `points_ledger`, `guest_run`, `puzzle` and `dictionary_word` before and after; the e2e counts again after a whole day in the browser.
- **Existing tests changed:** one line in `supabase/tests/plor_app_role.test.sql`, the list of functions `plor_app` may execute.
- The screen by eye, from screenshots of the local build (a round at 390px, the result at 390px and 1280px, the Puzzles page; three sent to the human, none kept). Words on screen: "Test run: nothing is saved" and "Test run of the draft: nothing is saved", Offbeat's own.
- **Not verified:** the function called as `plor_app` (the local app connects as `postgres`; the grant is shown by pgTAP's privilege checks); plor.app; the hosted push.

**15f-1 (2026-11-15).**
- Failed first, on the old page: the new e2e, "waiting for getByRole('navigation', { name: 'Days' }).getByRole('button', { name: 'Wed 19 Jan' })" (the old row listed Offbeat's dates alone). `slotDates`' three unit tests were written with the helper and not seen failing.
- After: `npm test`: 69 files, 809 passed. `npx tsc --noEmit`: exit 0. `npm run lint`: clean. e2e, one file at a time: substring-days 2, admin-area 4, approve-and-play 2, test-run 4, calm 2 passed. **`e2e/shell.e2e.ts`: 9 passed, 1 failed** (line 149: a player's Groups link lacks `aria-current="page"`); it fails the same way with this step's two page files put back to HEAD, so it is not this step's (ROADMAP, Next revision).
- **Existing assertions changed, all in `e2e/substring-days.e2e.ts`:** the region's name, "Fragments days" to "Fragments day" (the section holds one day); a click on the date's Days button before the day is used, in three places (each after a load, which chooses the default date again). What it proves of approving and of the redraft message is as before.
- The page by eye, from screenshots of the local build with the beta's real drafts (390px and 1280px, Wed 18 Nov chosen; one sent to the human, none kept): Offbeat's day, then a "Fragments" heading and that date's day alone; no sideways scroll.
- The build was cut off once when the app restarted; it left a dev server on port 3000 and two fixture drafts in `content/substrings/`, both removed before it went on.
- **Not verified:** the page on plor.app; `look`, `headings-invites`, `me`, `screen-readers` and `player-screens` e2e were not run (they open other pages).


## Review
- Blocking findings and how each was fixed: 15f-1 (the `reviewer`, 2026-11-15, one pass, by reading, with the admin unit tests and `tsc`; it ran no e2e): none. 15f-2 (the `reviewer`, 2026-11-15, one pass, by reading, with `tsc` and the game's and admin's unit tests; it ran no database or browser test): none in the code; it held the commit until this ticket was filled in.
- Deferred to ROADMAP "Next revision": 15f-1: three items (For M15). 15f-2: three items (For M15).
