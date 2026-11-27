# M23, 23f: the switch

**Status:** designed 2026-11-26 from answers 58 to 69 in `M23-offbeat-on-a-clock.md`; **approved 2026-11-26** (the human: "Approve 23f"), the security changes below and the two reused numbers included. **23f-1 is merged, #325. 23f-2 is built and reviewed, PR open.** Next: 23f-3.

## Goal
Offbeat on plor.app is the game on a clock and nothing else: every page reads a clock day rightly, the old seven-question game and its data are gone, and the boards start from the switch day.

## Who uses it / what breaks without it
- Used by: every player, from the first approved day on a clock.
- Breaks without it: the game on a clock exists and no player can reach it. Approving a clock day today would show wrong or broken things beside it: "Your Offbeat" and Me count questions survived out of 7 (0 for a clock run), the feed says "survived every question" of any finished clock run, "Yesterday's answers" would fail on a clock day, a friend's score for today reads as nothing, and the combined board weighs Offbeat by the old game's par (each a reading of the code by a search agent, *unverified* until the build reads it).

## Source
- `docs/SOURCES.md`: the human's answers are the source for M23. Here: answers 58 to 69; answer 14 and the M23 ticket's 23f line ("Boards from the switch day, Offbeat off the overall board until its par is set, the old game removed, the old drafted days dropped"); the ticket's "Removes".
- The code as mapped 2026-11-26 by a search agent (*unverified*; the build confirms each before relying on it).

## The human's answers (2026-11-26), in short (quoted in the M23 ticket)
58 wipe the old days · 59 boards fresh from the switch day · 60 Offbeat off the combined board until par is set · 61 seven days approved first · 62 with the wipe: comments on those results, the old days themselves, the log of missed texts · 63 no copy · 64 the wipe runs inside the database push · 65 a "back soon" note until the switch · 66 stats: points and answers · 67 the feed: points and answer count · 68 yesterday: top answers per question · 69 the note's line: "Plor is being rebuilt. Back soon."

## Design
Three PRs, in this order, so that plor.app is never showing a half-switched game.

**23f-1, the note.** Wherever plor.app says "There's no puzzle today." it says **"Plor is being rebuilt. Back soon."** (answer 69), with the countdown line removed beside it (a new day starting brings nothing while paused). Offbeat only; Fragments' wording is the human's to decide below. The front page's "Seven questions, such as..." becomes the clock game's own line: **"Three questions, one clock. Name as many as you can."** 23f-3 puts back "There's no puzzle today." for a missed day after the switch.

**23f-2, every page reads a day on a clock.** Nothing is removed yet.
1. **"Your Offbeat" and Me** (answer 66): day streak, best score, average points a day, and a chart of points for the last 7 days. "Full runs" and "N of 7 survived" go.
2. **The feed** (answer 67): a finished clock run reads "scored 340 points with 14 answers".
3. **Yesterday** (answer 68): for each of yesterday's three questions, the answers most players gave and the rarest anyone found, each with how many players. Shown only when enough players played for a count to mean something, by the existing rule for sharing counts (`ANSWER_SHARE_MIN_PLAYERS`); how many of each is shown reuses the existing `RAREST_ANSWERS_SHOWN`. Signed-in players' answers only: a guest's are not kept by player (ROADMAP, For M23).
4. **Today's score** on a friend's row and the boards reads a clock run's points.
5. **Boards from the switch day** (answers 14, 59): Offbeat's weekly and overall boards count clock days only. With the wipe (below) nothing older exists to count, so no date is stored anywhere: the rule is "a day on a clock".
6. **The combined board** leaves Offbeat out (answer 60): `PAR_POINTS.offbeat` is removed, and the board says in a line under it that Offbeat joins once its typical score is known. Setting par later is its own small change, on the human's word and number.

**23f-3, the old game goes, and the wipe.**
7. **Code removed:** the seven-question screens, host answers, taken letters, sudden death, the old scoring and its tunables, the old draft with `simulate` and `check-bank` (so `npm run draft -- <date>` drafts a clock day, the word `clock` gone), the bank's old fields and the Bank admin page, the old test run, the old SQL rules, their tests, and the drafted files `content/offbeat/` in the old format. What Fragments or the clock game also use stays. `content/bank.json` keeps each question's wording and list.
8. **The wipe, one migration** (answers 58, 62, 63, 64). On whatever database it is pushed to, for the game Offbeat and days in the old format only, it deletes for good:
   - every run and its answers, signed-in and guest, and the guests' tallies;
   - their points in the ledger;
   - every comment and reaction on those results, and the kept or deleted-comment records that belong to them;
   - the days themselves;
   - every missed text logged, and the review rows made from them.
   It keeps: Fragments entirely; players, friends, groups; the answer lists, including answers players' texts once added; anything of a day on a clock. **No copy is made and it cannot be undone. It runs the moment the human runs `npx supabase db push`, with no count shown first** (answers 63, 64, each against the recommendation). The PR will state the row counts on plor.app, read through the Supabase connector before merging, so the human sees the size before pushing.
9. After the push the database refuses a day in the old format.

**The human's own steps, after 23f-3 is merged:** `npx supabase db push` (the wipe); draft and approve seven days on a clock on plor.app's Admin page (answer 61); the first approved day's date is the switch day. Nothing in these PRs approves a day or pushes anything.

## Security changes proposed (need the human's approval; recorded in DECISIONS.md when built)
- A migration that deletes data, as listed in 8, with the old game's SQL functions dropped and `private.build_puzzle` refusing format 3.
- A read of how many players gave each answer on a past clock day (design 3), for any signed-in player, counts only, under the existing minimum of players. No new table.
- No grant widened.

## Assumptions
- Comment "kept" and "deleted" records can be tied to their game; if they cannot, the build stops and asks rather than deleting Fragments' ones.
- No clock day is approved on plor.app before 23f-3's push; the wipe does not touch one if it is.
- Removing the Bank admin page loses nothing the clock game needs (the Lists page replaced it).

## Asked before 23f-1 (2026-11-26; answers 70 and 71 in the M23 ticket)
- Fragments shows the note too: "Yes, both games (Recommended)". Its own line comes back by hand when Fragments gets days again (ROADMAP, For M23).
- The front page's line changes now, with the note: "Now, with the note (Recommended)".

## Acceptance criteria
- [ ] 23f-1: with no day approved, /play, the Today card and the guest front page show the note → `e2e/`, `@visual`.
- [ ] 23f-2: stats, feed line, yesterday, today's score, each on a clock day → unit and db tests, each failing first; `e2e/`, `@visual`; yesterday hidden under the minimum of players.
- [ ] 23f-2: the combined board has no Offbeat part → db test, failing first.
- [ ] 23f-3: on a database seeded with old Offbeat runs, comments, misses, days, a Fragments run and a clock run, the migration leaves only the last two and what belongs to them → `npm run test:sql`, failing first.
- [ ] 23f-3: `npm run draft -- <date>` writes a clock day; a format 3 day is refused by approval → tests.
- [ ] 23f-3: nothing of the old game is left unused → `npx tsc --noEmit`, `npx eslint`, `npm test`, `npm run test:sql`, the whole e2e suite, `npm run verify -- offbeat-run`.

## Out of scope
- Offbeat's par and its place on the combined board. Researching more lists. A Play test for a clock day. Counting guests' answers.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 7 | days approved before the switch | answer 61 (the human's step; no code) |
| existing `ANSWER_SHARE_MIN_PLAYERS` | yesterday's counts shown | existing tunable, reused |
| existing `RAREST_ANSWERS_SHOWN` | how many of each yesterday shows | existing tunable, reused: the human confirms with approval |

## Plan
Written as `<step> → verify: <check>` per PR, 23f-1 first.

**23f-1.** Assumptions: the one `NoPuzzleBanner` (`src/app/game.tsx`) serves Offbeat's Today card and /play for players and guests, and `src/app/substrings.tsx` holds Fragments' line (both read 2026-11-26). The error text "There's no puzzle today yet. Check back later." (`src/app/messages.ts`), shown only when a Start races a missing day, stays.
1. An e2e test, `@visual`: with no day approved for either game, the guest front page, a player's Today, /play and Fragments' page each show "Plor is being rebuilt. Back soon.", none shows "A new day starts in", and the guest front page shows "Three questions, one clock. Name as many as you can." → verify: `npx playwright test e2e/paused-note.e2e.ts` fails on the old wording.
2. The note in one constant, used by Offbeat's banner (its countdown removed) and Fragments' card; the front page's line → verify: the test in 1 passes.
3. The e2e tests that wait on the old line read the new one; DESIGN.md's lines for it → verify: `npx playwright test e2e/play2.e2e.ts e2e/admin-base.e2e.ts e2e/bank.e2e.ts`; `grep -rn "no puzzle today\." src e2e docs/DESIGN.md` finds nothing.
4. → verify: `npx tsc --noEmit`, `npx eslint src e2e scripts --quiet`, `npm test`.

**23f-2.** The code as a search agent read it on 2026-11-26 (*unverified* until the build reads each): a clock run's answers are in `private.clock_answer` and never in `run_event`; `private.run_status` calls every finished clock run 'survived' with 3 answered; a closed clock day has a `points_ledger` row like any day; `getYesterday` (`src/game/offbeat.ts`) reads `host_answers`, which a clock day has not, so it would throw and take the whole "Your Offbeat" card with it; today's board (`offbeatToday`, `src/friends/leaderboard.ts`) reads `run_event` only, so a clock finisher scores 0.

Readings chosen where the design left room, each in the Source diff when built:
- **No "clock days only" filter is written** (design 5). Until 23f-3's wipe the old days are still in the database and no clock day exists on plor.app, and after it no old day can exist, so a filter would guard a state that cannot happen. Stats and boards read points from the ledger whatever the day's kind; 23f-3's wipe makes "a day on a clock" true and its tests show it.
- **Yesterday** shows the new view when yesterday was a day on a clock and the old view when it was an old day (nothing is removed yet). "Enough players" is per question: players who gave at least one answer on it, against `ANSWER_SHARE_MIN_PLAYERS`. Top is most players first, rarest is fewest first and never repeats a top one, ties by name; `RAREST_ANSWERS_SHOWN` of each. Only a day before today can be read. The answer search is not drawn on a clock day (it counts the old game's answers).
- **The chart's** bars are measured against the highest of its seven days (no par exists to measure against).
- **The feed's** points and answers stop at the day's midnight, as the ledger's do.

Steps, part A (stats, feed, today's score, the combined board):
1. A db test: a player with closed days has `best`, `average` (points a day) and seven days of points from `/api/offbeat` and `/api/me`, and neither answers "full runs" or "survived" → verify: `npx vitest run src/app/api/offbeat/route.db.test.ts src/app/api/me/route.db.test.ts --no-file-parallelism` fails first, then passes.
2. "Your Offbeat" and Me draw them: streak, best score, average points a day, the points chart; a named day reads its points → verify: `e2e/offbeat.e2e.ts`, `e2e/me.e2e.ts`, `e2e/profile.e2e.ts`, `@visual`, changed to the new words, pass.
3. A db test: a finished clock run's feed item carries its points and its number of answers; a unit test: it reads "scored 340 points with 14 answers" → verify: `npx vitest run src/comments/feed-page.clock.db.test.ts --no-file-parallelism` and the unit test fail first, then pass; an `@visual` e2e shows the line.
4. A db test: on a clock day, today's board gives a finished friend their run's points → verify: `npx vitest run src/app/api/leaderboard/today/route.db.test.ts --no-file-parallelism` fails first, then passes.
5. A db test: the combined board, today's and the week's, has no Offbeat part; `PAR_POINTS.offbeat` is gone; the board says under it that Offbeat joins once its typical score is known → verify: `npx vitest run src/app/api/leaderboard/overall.db.test.ts src/app/api/leaderboard/today/route.db.test.ts --no-file-parallelism` fails first, then passes; `e2e/overall-board.e2e.ts` passes with the line.

Steps, part B (Yesterday):
6. A db test: with a clock day yesterday, `/api/offbeat` answers (it threw before) with, per question, the top and the rarest answers and their players; a question under the minimum gives none; today's day cannot be read → verify: `npx vitest run src/app/api/offbeat/route.db.test.ts --no-file-parallelism` fails first, then passes.
7. The card draws it → verify: an `@visual` e2e with enough players shows a top and a rarest answer with their counts, and with too few the "too few players" words.
8. → verify: `npx tsc --noEmit`, `npx eslint src e2e scripts --quiet`, `npm test`, `npm run test:sql`, the db tests of every file touched; the whole e2e suite in CI.

## Removes
23f-1: the "no puzzle today" line, until 23f-3. 23f-2: the old stats' wording and `PAR_POINTS.offbeat`. 23f-3: the old game, as design 7, and the old data, as design 8.

---
## Source diff
**23f-1.**
- As designed: the note's words are answer 69's, on both games (answer 70); Offbeat's countdown beside it is gone; the front page's line is answer 71's.
- Deviation: with neither game's day approved, Today and the guest front page show one card, Offbeat's (`src/app/today-games.ts`, as before this change), so the note shows once there, not on two cards. Fragments' own page shows it.
- Not changed: the error text "There's no puzzle today yet. Check back later." (`src/app/messages.ts`), as the plan said.

**23f-2.**
- As designed: stats (streak, best score, average points a day, a 7-day points chart; "full runs" and "survived" gone), the feed's "scored 340 points with 14 answers", Yesterday's top and rarest answers per question with their players, today's board reading a clock run's points, the combined board without Offbeat and its line.
- **No "clock days only" filter** (design 5): stats and boards read the ledger whatever the day's kind; the wipe in 23f-3 is what leaves only days on a clock. Until then an old day's points still count on Offbeat's own boards and stats, as before.
- **No new database access.** The design proposed a new read for Yesterday; `plor_app` could already read `private.clock_answer` (`20261124235832_clock_run.sql`), so no migration, function or grant was added. Recorded in DECISIONS.md's log as the approved read.
- Yesterday: "enough players" is per question, players who gave an answer on it before the day's midnight; a rarest answer never repeats a top one, so a question with few different answers shows no rarest line; the answer search is not drawn on a clock day; an old day keeps the old view. The words "Most players gave:", "Rarest answers:" and "N players" are the builder's, for the human to confirm.
- Not changed: "Your run from yesterday is still going. Finish it to see the host's answers." also shows for a clock run still going after midnight, where no host exists (ROADMAP, For M23).
- Stats: a day's points join the average and the chart once the day is closed, as the ledger has them; the chart's bars are against the highest of the seven days; the average is over every closed day, a whole number.
- The feed's points and answers stop at the day's midnight, as the ledger's do; a clock run's line shows on the player's own item too.
- The combined board: it is Fragments' score alone for now; a player of Offbeat only is listed on 0; its closed line reads "Finish today's Fragments to see today's board."; it no longer settles Offbeat's runs (Offbeat's own board, stats and Me still do). The line under it shows under every combined board, Today's card included.
- Words the builders chose, for the human to confirm: the chips "avg. points a day" and "best score", the chart's caption "Points, last 7 days" and its "not scored" / "not scored yet", a calendar day's ", 340 points".

## Evidence
**23f-2** (2026-11-26 and 27, slot 1; the builders' runs unless said):
- Stats, failing first: `npx vitest run src/app/api/offbeat/route.db.test.ts src/app/api/me/route.db.test.ts --no-file-parallelism`, 7 failed (`expected { date, survived: 4 } to deeply equal { date, points: 400 }`); then passed.
- Feed, failing first: `src/app/ended-text.test.ts` (`expected 'ran out of time on question undefined' to be 'scored 340 points with 14 answers'`) and `src/comments/feed-page.clock.db.test.ts` (`expected { result: 'survived' } to deeply equal { result: 'scored', points: 340, answers: 2 }`); then 17 passed across the feed's files. The feed's e2e was seen failing on the old `feed-page.ts`.
- Today's score, failing first: `src/app/api/leaderboard/today/route.db.test.ts`'s clock case gave 0 for both players on the old code; then 9 passed.
- Combined board, failing first: `overall.db.test.ts` and `today/route.db.test.ts` (`expected [ 'offbeat', 'substrings' ] to deeply equal [ 'substrings' ]`); then every file under `src/app/api/leaderboard` passed.
- Yesterday, failing first: `npx vitest run src/app/api/offbeat/route.db.test.ts --no-file-parallelism`, 1 failed: `TypeError: Cannot read properties of undefined (reading 'map') ❯ hostAnswers src/game/payload.ts:31` (the crash the plan expected); then 10 passed: a question of 6 players shows three top and three rarest, one of 4 players none, an answer after midnight and today's answers never.
- The orchestrator's own runs after both halves: `npx tsc --noEmit` and `npx eslint src e2e scripts --quiet` clean; `npm test` 81 files, 1007 passed; `npm run test:db` 623 passed and 1 failed, `src/app/api/admin/bank/route.db.test.ts` timing out at 5 s on a signed-out request, a file this change does not touch: alone it failed once more and then passed twice. Not shown unrelated; CI's `db` check decides.
- After the review's fixes: `npx playwright test e2e/offbeat.e2e.ts e2e/me.e2e.ts e2e/boards.e2e.ts`, 25 passed. Before them (builders): `e2e/offbeat`, `me`, `profile`, `overall-board`, `boards`, `clock` 40 passed; `e2e/yesterday-clock.e2e.ts` 2 passed.
- Not seen failing first: the e2e tests of the stats, the combined board's line and Yesterday (written after the code; their db tests were).
- No migration, so `npm run test:sql` was not run.
- Videos (stats, the feed line, the combined board's line, Yesterday, each at both sizes) were sent to the human; CI's are in the PR run's `e2e-videos` artifact.
- Not verified: the whole e2e suite locally (CI runs it); any of it on a real phone.

**23f-1** (2026-11-26, slot 1, the builder's runs unless said):
- Failing first: `npx playwright test e2e/paused-note.e2e.ts` on the old wording: 8 failed (`getByText('Plor is being rebuilt. Back soon.')`, element(s) not found). The builder did not keep the full output.
- After: the same command, 8 passed (4 tests at 390 × 844 and 1280 × 720); again with `CI=1`, 8 passed.
- `npx playwright test e2e/play2.e2e.ts e2e/admin-base.e2e.ts e2e/bank.e2e.ts`: 11 passed.
- `grep -rn "no puzzle today\." src e2e docs/DESIGN.md`: nothing (the orchestrator's run too).
- `npx tsc --noEmit` clean, `npx eslint src e2e scripts --quiet` clean (the orchestrator's runs too); `npm test`: 80 files, 1004 passed.
- Videos of the four screens at both sizes were sent to the human; CI's are in the PR run's `e2e-videos` artifact.
- Not verified: the whole e2e suite locally (CI runs it); the note on a real phone.

## Review
**23f-2:** the `reviewer` agent, fresh context, 2026-11-27 (it ran the type check, lint and unit tests, not the db or e2e tests). Blocking, fixed: a branch of today's closed line for two games on the combined board, which can no longer happen (`src/app/leaderboard.tsx`). Taken now though filed as next revision: `{ tag: "@visual" }` on the two changed tests in `e2e/offbeat.e2e.ts` and `e2e/me.e2e.ts`. It judged each changed assertion as made untrue by the ticket, not weakened, and found Yesterday's read exposes no player, no guest answer, nothing of today and nothing under the minimum. The rest is in ROADMAP, "Next revision", For M23.

**23f-1:** the `reviewer` agent, fresh context, 2026-11-26: no blocking finding in the code or tests (it did not run Playwright). Its smaller items are in ROADMAP, "Next revision", For M23.
