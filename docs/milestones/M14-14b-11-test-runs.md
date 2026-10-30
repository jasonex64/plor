# M14 14b-11 — Test runs

**Status:** approved (human, 2026-10-29: "Approve 14b-11 as drafted, including the security change (two admin-only read functions plor_app may execute). Build it."), drafted from three rounds of guided questions; in review (PR #PR, waiting for CI and the human's word to merge). Then 14b-10a resumes from its stash. Built before 14b-10a, which is paused for it (human, 2026-10-29: "RIGHT NOW, AND PAUSE 10A'S WORK"; 10a's code is in `stash@{0}` in `C:/Users/jason/RIFF-m14`).

## Goal
An admin can play any day, past, today, upcoming or still a draft, on the real game screen as often as they like, and nothing is saved.

## Who uses it / what breaks without it
- Used by: the human, as admin, to test themself on a day and to critique the game screen and its animations (14b-10b's motion next).
- Breaks without it: a player gets one run per day (`private.run`'s primary key, M00 §5), so the human can play a day once, and only today. A draft can't be felt before it is approved, and the screen's animations can be seen only once a day.

## What the human decided (2026-10-29, on the Windows PC, quoted)
The ask: "is there a way we can just have a test puzzle i can play over and over again to test myself maybe in admin soemwhere".

**Round 1, the long-term picture:**
1. Which puzzle: "any day, but it should also be able to be the upcoming one too".
2. What a test run leaves behind: "Nothing at all" ("No stats, streak, leaderboard, rarity or miss-learning").
3. How close to the real game: "i need the real screen and animations so i can critique it".
4. Who: "Admins only" ("Lives behind the Admin link; players never see it").

**Round 2, the collisions:**
5. Checking with nothing saved: "Server checks, saves nothing (Recommended)" ("Same matching code as real play, through an admin-only path that writes nothing").
6. The end: "Real end screen, read-only" ("Your results plus the day's real board and rarity as they stand, with comments, reactions and share switched off … on an upcoming day the board is empty").
7. Which days: "Drafts too" ("Also unapproved drafts, so you can play one before approving it").
8. Where in the plan: "An M14 sub-ticket now".

**Round 3:**
9. A draft's host answers: "Whatever the page shows now (Recommended)" ("The drawn answers plus any changes you've made on the page but not approved yet").
10. A draft's answer lists, after asking "CAN U EXPLAIN IT IN MORE DETAIL" and the explanation (a day names categories; its members are fixed at approval and at its day's start; a draft has none fixed): "Yes, build them now (Recommended)" ("a draft plays as if approved this second. Needs one new admin-only database function, a security change you approve in the ticket").
11. A draft approval would refuse: "Refuse, listing the problems" ("The same check and wording approval gives").
12. Starting over: "A Restart button in the run" ("Always visible during a test run, alongside a clear 'Test run' label").
13. When: "RIGHT NOW, AND PAUSE 10A'S WORK".

## Source
- `docs/milestones/M00-data-design.md` §5 (runs and events: what a test run must not write) and §7 (append-only).
- DECISIONS.md: Game 1 (Timer: 20 seconds a question; Scoring; "Server is authoritative"), Answer model, Puzzle content format, Puzzle approval, and the Log rows of 2026-10-24 on `private.resolve_answer` and `private.approve_puzzle` (the two functions this reuses).
- `docs/milestones/M06-puzzle-entry.md` (the admin puzzles page and approval).
- SOURCES.md, Next.js (route handlers; read the bundled guide in `node_modules/next/dist/docs/` before writing the route, AGENTS.md) and PostgreSQL 17 (functions, `security definer`).

## Design (proposed)
**Where.** Each day on the admin puzzles page (`/admin/puzzles`) gets a **Play test** button. For a draft it carries the host answers the page shows now, saved or not (answer 9). It opens `/admin/test/<date>`, an admin page that shows the real game component (`Game` in `src/app/game.tsx`) with a "Test run" label and a **Restart** button above it the whole time (answer 12). Players never see the link, and the page and its route refuse non-admins (answer 4).

**Checking, with nothing saved (answers 2, 5).** One admin route, `POST /api/admin/test`, takes the date, the draft's host answers (drafts only) and the texts typed so far. The browser holds the run; the server keeps nothing. Each call it resolves every text with the same matching code as real play (`resolveTyped` in `src/game/matching.ts`) and returns a `RunState`, the type the game screen already draws. So the screen, its reveal and its animations run unchanged. A text that names nothing is a free retry, as in play, but isn't logged as a miss, so nothing learns from it. The 20-second timer counts down in the browser alone: nothing is stored for the database to judge, and it's the admin's own test. Start, Next and Restart are the browser's.

**Approved days, any date (answer 1).** Answers resolve through `private.resolve_answer` as now, against the base as of the day's fixed time. For an upcoming day that time is still ahead, so it reads the base as it stands now (*unverified* that `private.ancestors_as_of` takes a future time; the db test checks it).

**Drafts (answers 10, 11).** `private.approve_puzzle`'s checks and its building of each question (root, members, `where`) move into one function that returns the approved content without storing it. Approval calls it and then stores the result; the test route calls it to play a draft. A draft approval would refuse is refused with approval's own problem list. `private.resolve_answer`'s matching moves into a core that takes a question and a time. The published-day function calls it with the stored question; a new admin-only function calls it with the draft's built question and `now()`. So there is still one way to check an answer and one way to build a day.

**The end (answer 6).** The real result card, with Share switched off. The bonus is the provisional one from pooled past days, as in play. The "given by" shares and the board come from the day's real counts as they stand, and nothing of the test run is added to them. An upcoming day or a draft has none, so the board is empty. Comments, reactions and share are off. Whether the live friends board can be read for a day other than today is *unverified*; if it can't, the board shows only for today, and the ticket records that as a deviation.

**Security change** (CLAUDE.md, "Security changes need a human"; recorded in DECISIONS.md Log once approved). `plor_app` may execute two new functions:
- The draft builder: security definer, empty `search_path`. It raises OB007 unless `p_user` is in `private.admin`, and reads the base as `approve_puzzle` does.
- The draft resolver: security definer, empty `search_path`, the same admin check. It reads the base as `resolve_answer` does.

Neither writes anything. No table, grant on a table, RLS or role changes. The test route checks the admin before reading any date or draft, as the approve route does.

## Acceptance criteria
- [x] A db test (as `plor_app`) runs a full test run of an approved day, today's and an upcoming one, and of a draft. It shows the row counts of `private.run`, `run_event`, `question_open`, `missed_answer`, `miss_review`, the points ledger, `thing_alias` and `category_extra` unchanged.
- [x] A db test: a non-admin calling either new function gets OB007, and the route returns 403 `admins_only` before reading the date.
- [x] A db test: a draft that approval refuses gets the same problem list from the test route, and approval itself still passes its existing tests (`approve_puzzle`'s pgTAP file unchanged and green).
- [x] A db test (it needs the base; the ticket said unit): the same typed texts give the same matched results and host answers through the test route as through `answer` on an approved day.
- [x] An e2e (`e2e/test-run.e2e.ts`): an admin opens Play test on a draft with a changed host answer, plays to a catch, sees the result card with Share off, taps Restart, and plays again from question 1. A non-admin opening `/admin/test/<date>` sees no game.
- [x] `docs/DESIGN.md` describes the test-run page, each value cited to its file and line.

## Out of scope
- Saving test runs or their history (answer 2).
- Players' practice mode (answer 4).
- Timing a test run on the database's clock.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 20 seconds a question | The test run's countdown | DECISIONS.md, Game 1: Timer (human, 2026-10-21) |
| Points ladder, rarity bonus | The result card | DECISIONS.md, Game 1: Scoring (`POINTS_PER_QUESTION`, `tunables.ts`) |

No new numbers.

## Plan
1. Migration: split `approve_puzzle` and `resolve_answer` as above, and add the two admin-only functions. Hypothesis: every existing pgTAP and db test still passes unchanged, because approval's and play's behaviour doesn't change. A failing approval or resolve test disproves it.
2. `POST /api/admin/test` and a `testState` beside `buildState` in `src/game/runs.ts`, reusing it.
3. `Game` takes where its run comes from (play or test), so the screen code is shared. The `/admin/test/[date]` page, the label and Restart, and Play test on the admin puzzles page.
4. Tests as in the criteria, `docs/DESIGN.md`, then the `reviewer`.

## Removes
- `approve_puzzle`'s inline checks and building of each question, moved into `private.build_puzzle`.
- `resolve_answer`'s inline matching, moved into `private.resolve_in`.
- `approved_at` from the TypeScript `ApprovedPuzzle` type (`src/content/puzzle.ts`): no TypeScript read it; the two fixtures that write it to the database say so in their own types.
- The approve route's own `isHostAnswerLists` and its inline content and host-name checks, and `approvePuzzle`'s inline OB009 parsing: moved into `src/admin/puzzles.ts` (`isHostAnswerLists`, `draftProblems`, `problemsOf`), which the approve and test routes share.
- `candidates(db, game, date, …)` in `src/game/matching.ts`: replaced by a lookup (`dayLookup`, `draftLookup`) that `resolveTyped` and `isNearTypo` take, so a draft resolves through the same matching.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| DECISIONS.md, Game 1: Timer: "The database is the judge … The client only displays the time left that the server measured" | A test run's 20 seconds (from `private.question_deadline`) count down in the browser, which says when they ran out | Nothing of a test run is stored for the database to judge (answer 2), and it's the admin's own test; the ticket's design and Out of scope said so, and the human approved it (2026-10-29) |
| Ticket design: "the board come[s] from the day's real counts" | The result card's "given by" shares and the provisional bonus come from the day's real counts; the game screen's cards show after the run; no friends board | The game screen has no live board (`src/app/offbeat.tsx`, OffbeatScreen: the run, the cards and the comments), so the end screen has none to show; the ticket's "unverified" about reading it for other days is moot |
| Ticket design: Play test on each day of the puzzles page | Also a "Test an earlier day" date field on that page | The page lists only today and later (`listDays`), and answer 1 is "any day" |
| Ticket: a unit test compares the test route with play | A db test (`src/app/api/admin/test/route.db.test.ts`, "gives the same results as play") | Both paths read the answer base, so the comparison needs the local stack |
| Ticket: "*unverified* that `private.ancestors_as_of` takes a future time" | Verified: an upcoming day resolves (pgTAP `test_runs.test.sql` test 10; the route and plor_app db tests) | — |

## Evidence
Run on the Windows PC's local stack, 2026-10-29 (Pacific), on the uncommitted tree before the PR.

**Hypotheses.** Step 1 expected every existing pgTAP and db test to pass unchanged after the split. They did, apart from `plor_app_role.test.sql`, whose exact grant list failed on the two new grants (test 15). That failure was expected: the approved security change adds them, so they joined the list. The plor_app test expected the role's existing grants to cover a finished test run. It passed the first time.

1. **As plor_app, full runs and nothing written** (`src/game/runs.plor-app.db.test.ts`, "plays full test runs of today, an upcoming day and a draft, as an admin, and writes nothing"). All three climb all 7 stops to `survived`. A draft's host catches. All nine tables' counts are equal before and after. The route test (`route.db.test.ts`) and pgTAP (`test_runs.test.sql` test 9) compare the same counts as `postgres`.
   `npx vitest run src/game/runs.plor-app.db.test.ts --no-file-parallelism` → `Test Files  1 passed (1)`, `Tests  3 passed (3)`.
2. **Admins only.** pgTAP `test_runs.test.sql` tests 1 and 2: OB007 for a non-admin on `build_puzzle` and on `resolve_draft_answer`. `route.db.test.ts` "answers 403 admins_only … before reading the date" sends `date: "not a date"` and gets 403, not 400. `plor_app_role.test.sql` lists plor_app's exact grants.
3. **A refused draft, and approval unchanged.** `route.db.test.ts` "refuses a draft approval would refuse": the test route's 422 body equals the approve route's. pgTAP test 7 gives the same OB009 message from `build_puzzle`. `puzzle_entry.test.sql` is unchanged and passes.
4. **Same results as play.** `route.db.test.ts` "gives the same results as play for the same texts": the same answer, matched, host answers, points and bonus as the run routes' run.
   `npx vitest run src/app/api/admin … --no-file-parallelism` (13 files with the matching and run tests) → `Test Files  13 passed (13)`, `Tests  101 passed (101)`.
5. **The e2e** (`npx playwright test e2e/test-run.e2e.ts`): `ok 1 … an admin plays a draft as a test run, with a host answer changed on the page, and restarts it (8.0s)`, `ok 2 … a player who isn't an admin sees no game on a test run's page (2.4s)`, `2 passed`. The admin's run count is 0 after both runs.
6. **`docs/DESIGN.md`**, "Test runs (admin)": each line cites its file and line, and the reviewer checked them.

**The suites:**
- `npm test`: `Test Files  47 passed (47)`, `Tests  473 passed (473)`.
- `npx supabase test db`: `Files=32, Tests=520`, `Result: PASS`.
- `npm run test:db`: `Test Files  43 passed (43)`, `Tests  292 passed (292)`. That run came before the plor_app test grew to full runs; that file passed again after (item 1).
- `npm run test:e2e`: `77 passed (9.6m)`, `2 failed`. The two were `me.e2e.ts` "names carry an avatar slot…" (the Friends board's empty heading) and `shell.e2e.ts` "away from the game screen, a question in play shows its clock…" (the known flaky clock-bar test, ROADMAP For M14). Neither touches what changed here. `npx playwright test --last-failed` → `2 passed (19.6s)`.
- `npx tsc --noEmit -p .` and `npm run lint`: clean.

## Review
The `reviewer` agent, in a fresh context, 2026-10-29.
- **Blocking findings and how each was fixed:**
  - Criterion 1 wasn't met as written: the plor_app test played one answer and counted only `private.run`, so a missing grant on a finished run's reads would have passed. Fixed: it plays full runs of today, an upcoming day and a draft, and compares all nine counts (Evidence 1).
- **Deferred to ROADMAP "Next revision"** (For M14, "Found in 14b-11's review"):
  - a time-up and an answer can cross in the browser;
  - the route's redundant `texts.length` checks;
  - `hostLists` repeating `isHostAnswerLists`;
  - a draft of an approved, played day showing that day's shares;
  - `build_puzzle` not declared `stable`;
  - "Test an earlier day" offering today.
- **Handled here:** the timer's Source diff row, the untested `survived` status (now reached by Evidence 1) and the ticket's end sections.
