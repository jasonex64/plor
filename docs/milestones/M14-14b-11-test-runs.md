# M14 14b-11 — Test runs

**Status:** approved (human, 2026-10-29: "Approve 14b-11 as drafted, including the security change (two admin-only read functions plor_app may execute). Build it."), drafted from three rounds of guided questions; in progress. Built before 14b-10a, which is paused for it (human, 2026-10-29: "RIGHT NOW, AND PAUSE 10A'S WORK"; 10a's code is in `stash@{0}` in `C:/Users/jason/RIFF-m14`).

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
- [ ] A db test (as `plor_app`) runs a full test run of an approved day, today's and an upcoming one, and of a draft. It shows the row counts of `private.run`, `run_event`, `question_open`, `missed_answer`, `miss_review`, the points ledger, `thing_alias` and `category_extra` unchanged.
- [ ] A db test: a non-admin calling either new function gets OB007, and the route returns 403 `admins_only` before reading the date.
- [ ] A db test: a draft that approval refuses gets the same problem list from the test route, and approval itself still passes its existing tests (`approve_puzzle`'s pgTAP file unchanged and green).
- [ ] A unit test: the same typed texts give the same matched results and host answers through the test route as through `answer` on an approved day.
- [ ] An e2e (`e2e/test-run.e2e.ts`): an admin opens Play test on a draft with a changed host answer, plays to a catch, sees the result card with Share off, taps Restart, and plays again from question 1. A non-admin opening `/admin/test/<date>` sees no game.
- [ ] `docs/DESIGN.md` describes the test-run page, each value cited to its file and line.

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
- `approve_puzzle`'s inline building of each question, moved into the shared builder.
- `resolve_answer`'s inline matching, moved into the shared core.
- Nothing else. The test run adds a path that has no duplicate.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
