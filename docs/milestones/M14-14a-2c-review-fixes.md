# M14 14a-2c — 14a-2b's review fixes

**Status:** in review (2026-10-25), PR #82. Built from the human's overnight answers without a separate draft approval (human, 2026-10-25: "Start the overnight plan now: follow HANDOFF.md, building each sub-ticket from my answers without waiting for my approval of the draft, and merging on green CI"; HANDOFF.md, Overnight plan: "Review fixes, then 14a-3 (Recommended)").

## Goal
Fix the six items that 14a-2b's review deferred to ROADMAP, For M14, before 14a-3 builds on the game screen.

## Who uses it / what breaks without it
- **Used by:** every player on the game screen and its How to play page; and 14a-3, which reuses the screen's stats and settles.
- **Breaks without it:**
  - The rules line and How to play state the game's numbers in their own copy, so changing `tunables.ts` would leave them wrong.
  - Start climbing offers to start a run that has already started or ended.
  - The stats load and settle twice for a finished run.
  - The game screen's comments carry the feed's heading, not round 5's.
  - The live board's reset test can pass without the day changing.
  - 14a-2b's smaller sizes have no origin recorded.

## What the human decided
- The overnight plan, with these items first (HANDOFF.md, 2026-10-25).
- Each item, as 14a-2b's review deferred it (`docs/milestones/M14-14a-2b-game-screen.md`, Review).
- Round 5's heading for the game screen's comments: "Offbeat comments" (the approved mockups).

## Source
- `src/config/tunables.ts`:
  - `QUESTIONS_PER_DAY`;
  - `POINTS_PER_QUESTION`;
  - `LETTER_SCHEDULE` (DECISIONS.md: Config and tunables, "one location for every number").
- DECISIONS.md, Config and tunables: the 20 seconds are judged in SQL (`private.question_deadline`, `supabase/migrations/20261021081057_question_timer.sql`), not in `tunables.ts`.
- Round 5's game screen (the approved mockups): the heading and the sizes.

## Acceptance criteria
1. **Numbers from tunables.**
   - The rules line and How to play take these from `tunables.ts`:
     - the number of questions;
     - the lowest and highest points;
     - the questions where the Wind steals a letter.
   - Checked by `e2e/offbeat.e2e.ts`, which reads the same constants.
2. **Start climbing only before the run.** How to play shows Start climbing only while today's run hasn't started. Checked in `e2e/offbeat.e2e.ts`.
3. **One load per finished run.**
   - When the game screen opens on a finished run, `/api/offbeat` is requested with the page, and not again once the run's state arrives.
   - It is requested again when the run ends during the visit.
   - Checked in `e2e/offbeat.e2e.ts` from the order of the requests.
4. **"Offbeat comments".** On the game screen the feed's region and heading are "Offbeat comments"; on Today it stays "Feed". Checked in `e2e/offbeat.e2e.ts` and `e2e/today.e2e.ts`.
5. **The reset test waits for the reset's reload.** `e2e/live-board.e2e.ts`'s reset test on the game screen waits for the chart to draw before it waits for a stats request. Every request from the mount (two under Strict Mode) is sent before the chart can draw, so the request it waits for is the reset's.
6. **14a-2b's sizes recorded.** Its Numbers table records the smaller sizes as round 5's.
7. `npm run lint`, `npx tsc --noEmit -p .`, `npm test`, `npm run test:e2e` and CI pass.

## Out of scope
- Moving the 20 seconds into `tunables.ts`. They're judged in SQL by DECISIONS.md's rule, so a second copy would be a second place for one number. The words stay, with a comment naming `private.question_deadline`.
- `e2e/account.e2e.ts`'s one CI timeout. It stays in ROADMAP, since 14a-3 rewrites the Me tab and that test.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| None new | | The counts come from `tunables.ts`. The sizes are round 5's, recorded in 14a-2b's table |

## Plan
1. Tests first, in `e2e/offbeat.e2e.ts`, `today.e2e.ts` and `live-board.e2e.ts`: they fail against the current code.
   - **Ran, 2026-10-25:** all three cases of `e2e/offbeat.e2e.ts` failed, as expected. But the finished run counted 4 stats requests, not the 2 the hypothesis below predicted. React's Strict Mode runs each effect twice in development (the e2e suite runs the dev server). So the check became one that Strict Mode can't trip: no stats request starts after the first `/api/run` response.
2. The rules line and How to play read `tunables.ts`.
3. How to play reads the run's state before showing Start climbing.
4. The run's state reports whether it's over only once it has loaded, and the screen reloads its cards only when a run ends during the visit.
5. `Comments` takes the heading the page gives it.

**Hypothesis for step 4:** the second load comes from `onOver(false)` being reported before `/api/run` answers, then `true` once it does. Reporting only after the state loads leaves one load for a finished run. What would disprove it: two `/api/offbeat` requests still counted after the change.

## Removes
- The chart's "6 days before today" written into the SQL of `src/game/offbeat.ts`. It's now `STATS_CHART_DAYS` in `tunables.ts`, since DECISIONS.md keeps every number there. Found while writing 14a-3a.
- How to play's 640px width, 12px gap and 1.5 line height, which no source gave (found while recording 14a-2b's sizes). Round 3's 14px and 1.45 replace them, and the 960px column replaces the width.
- The copy's typed numbers (seven questions, 25 and 350 points, questions 2, 4, 5 and 7).
- The cards' `runOver` key on the game screen.
- Start climbing after the run has started.
- The six items from ROADMAP's For M14 list.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Round 3's How to play says "Seven questions, one climb." (L29) | "7 questions, one climb." | Criterion 1: the count comes from `QUESTIONS_PER_DAY`, as a figure. The rules line already uses a figure ("7 questions · 20 seconds each"), and the wording is provisional (L32) |
| 14a-2b's review asked the reset test to check new-day content | It checks that the reload is the reset's, not the first load | The test fakes only the browser's clock. The server decides the day (DECISIONS.md, Day boundary), so a reload after a faked midnight returns the same day, and the old check (yesterday's list) didn't show a new day either |

## Evidence
Run on the Windows checkout against the local stack, 2026-10-25.
- **Tests first:** with the tests changed and the code not yet, `npx playwright test e2e/offbeat.e2e.ts` → `3 failed`:
  - the How to play text: "Seven questions" where `7 questions, one climb.` was expected;
  - the finished run's stats: requested again after the run loaded, `["stats", "stats"]` where `[]` was expected;
  - "Offbeat comments": not found.
- **After the fixes:**
  - `npx playwright test e2e/offbeat.e2e.ts e2e/today.e2e.ts e2e/live-board.e2e.ts`: 12 passed. The one failure was `today.e2e.ts`'s friend check, which read the game screen's feed as "Feed" and now reads "Offbeat comments".
  - `npx playwright test e2e/today.e2e.ts e2e/groups.e2e.ts`: `6 passed (45.2s)`.
- **The hypothesis for step 4 held.** The second load came from the run's end being reported before its state loaded. With the report held until the state loads, no stats request starts after the run's state arrives.
- **Criterion 7:**
  - `npx tsc --noEmit -p .`: no output.
  - `npm run lint`: no problems.
  - `npm test`: `Test Files  40 passed (40)`, `Tests  257 passed (257)`.
  - `npm run test:e2e`: `29 passed`, 1 failed. The failure was `shell.e2e.ts`'s clock bar case: the timer wasn't found on the Friends tab. It passed alone, and `npx playwright test e2e/shell.e2e.ts --repeat-each 4` gave `28 passed`. It's recorded in ROADMAP as a flaky test; this sub-ticket doesn't touch the clock bar.
  - CI: with the PR.
- **After the review:**
  - **Start climbing:** the check now waits for the clock bar to show and the network to go quiet. A check that it catches the bug: with the button shown whatever the run's state, it failed with `Expected: 0, Received: 1`. With the code restored, it passed.
  - **The reset:** the test waits for a request sent after the chart draws.
  - `npx playwright test e2e/offbeat.e2e.ts e2e/live-board.e2e.ts -g "Play opens|counts the run|feed sits|reset leaves" --repeat-each 2` → `8 passed (30.5s)`.

## Review
The `reviewer` agent, in a fresh context, on `6cf0968..f97ed44`. It re-ran tsc, lint, `npm test` (257), `e2e/offbeat.e2e.ts` (3) and `today` with `live-board` (10).
- Blocking findings and how each was fixed:
  - **Criterion 2's check could pass before How to play had the run's state.** It now waits for the clock bar and for the network to go quiet, and it was shown to fail with the bug in place.
  - **Criterion 5's wait could catch Strict Mode's second mount response.** It now waits for a request sent after the chart draws. Every mount request is sent before that.
  - **Sizes in `offbeat.module.css` without an origin.** The line height 1.1, the 8px 2px and 6px 0 paddings, the 3px and 999px corners, the 2px 8px pill padding and Start's 20px are now in 14a-2b's Numbers, as round 5's.
  - **"Seven" became "7" without a Source diff row.** The row is added.
- Deferred to ROADMAP "Next revision" (For M14):
  - `onOver`'s comment should say that `runOver` can be stale across the reset;
  - the load-order check should assert that the run was seen;
  - a long comment line.
