# M23 — 23d, the clock game's screens

**Status:** designed 2026-11-25 from answers 40 to 47 in `M23-offbeat-on-a-clock.md`; **approved 2026-11-25 (the human: "Approve 23d")**. 23d-1 (the card before the run and the play screen) is built and merged 2026-11-25 (#312, on green checks and the human's "Merge when green"); 23d-2 (the result's missed answers, the share text, the live board) is built, reviewed and merged 2026-11-25 (#316, on green checks and the human's "Merge when green"); its migration reaches plor.app by the human's own `npx supabase db push`.

## Goal
A player can play a format 4 Offbeat day from start to result on a phone or a computer, signed in or as a guest, share the result, and see friends' runs on the live board.

## Who uses it / what breaks without it
- **Used by:** every player, once a format 4 day is approved (23e) and the switch is made (23f).
- **Breaks without it:** 23c's run has no screen: the clock game cannot be played, so the beta cannot restart.

## Source
- The human's answers 5 to 11, 27, 28, 32 and 33 (the game, the M23 ticket) and 40 to 47 (these screens).
- `docs/milestones/M23-23c-the-run-on-a-clock.md`: the state the server gives (`ClockState`), the routes, what a repeat and a miss return.
- `docs/DESIGN.md`: the game screens as built (the full-screen play skeleton, a game's card, the result's stacked rows, the live board), which this follows (answer 40: the app's own look).
- `node_modules/next/dist/docs/` for any Next.js code (AGENTS.md).

## Assumptions
1. The old seven-question screens stay as they are until 23f removes them: `/play` shows the clock game only on a format 4 day, by the day's format.
2. No sound, no new typeface, no new colour: the kit's pieces and Offbeat's banner colour (answer 40).
3. The three tiers are shown to players as "Common", "Uncommon" and "Rare", the words answers 10 and 11 use.

## Design

**Before the run:** today's one card (20n-4) with the rules in three lines (three questions, one clock that starts at 20 seconds, rarer answers add more time and points), Start and How to play.

**The play screen** (full screen, as today: Close and How to play at the top):
- the clock, counting down from the server's time left, as the kit's countdown bar with the seconds beside it;
- "Question 2 of 3" and the running points;
- the question;
- the input, in one fixed place with the phone keyboard open; Enter sends;
- **the last answer only** (answer 41), under the input: its name, its tier, the seconds it added and its points. In its place, when the last thing typed was not accepted: "Already said" for a repeat (answer 44), "Not on the list" for text that names nothing. A count of this question's answers sits beside it;
- Next (questions 1 and 2; no going back, said once in How to play), Finish on question 3 (answer 33);
- when the clock reaches zero, or on Finish, the result replaces it. A second tab shows the same run (answer 32); a lost connection carries on with the server's time (answer 28).

**The result:** one card (20n-4): the points, then per question a stacked row (20n-5's shape): the question, the count and points, the player's answers each with its tier, then **missed answers: three common, three uncommon, three rare** (answer 45), the same for every player that day, and a count of the rest ("and 452 more"). The nine are picked by the server from the question's levelled answers in an order fixed by the day and the question, so everyone sees the same ones; a player who gave one of them sees the next in that order.

**The share text** (answer 43, answer 46): the game's name and date, the points, then per question one line of squares, one per answer in the order given, coloured by tier, wrapping every 10, and the link. No answer's name.
```
Plor Offbeat, Nov 25: 340 points
1 🟩🟩🟦🟩🟪🟩🟦🟩
2 🟩🟦🟩🟩
3 🟩🟩🟩🟪🟦🟩🟩🟩🟦🟩
  🟩🟦
plor.app
```
Green common, blue uncommon, purple rare.

**The live board** (answer 47): a friend mid-run reads "Question 2 of 3 · 180 points", updating on each accepted answer and each Next; a finished one reads their points. The board's message gains the points (its version goes from 2 to 3); it still never carries an answer.

**Reduce motion:** every change is instant.

## Sub-parts, one PR each
- **23d-1:** the card before the run and the play screen, for a player and a guest, ending on the points and the answers given (the state 23c already gives).
- **23d-2:** the server's additions (the result's nine missed answers per question, fixed for the day; the board message's points, a migration), the full result, the share text, the live board's rows, How to play, DESIGN.md's result and board entries.
- Split changed 2026-11-25, before any code: the server's additions serve the result and the board only, so they go with them.
- **Found 2026-11-25, for 23d-2 and 23e:** a day holds only its common and uncommon answers (`levels`); every other member of the category is rare and no function `plor_app` may run lists a category's members for a player (`src/game/clock-state.ts`). So the three rare missed answers cannot be picked from the base at result time without a new grant. Settled 2026-11-25 (answers 48 and 49): with no grant, each question of the day carries `rare`, six rare answers in an order picked when it is drafted (23e), and the result shows the first three the player did not give. For the same reason the count of the rest ("and 452 more") cannot be read at result time, so each question also carries `size`, its list's count of answers when drafted. 23d-2 adds both fields to a format 4 day and its check; 23e fills them.

## Acceptance criteria
- [ ] On a format 4 day, a signed-in player and a guest each play a run from Start to the result at 390 × 844 and 1280 × 720 (`@visual` Playwright tests): an accepted answer shows its name, tier, seconds and points and moves the clock and the score; a repeat shows "Already said" and text off the list "Not on the list", neither moving anything; Next opens the next question and never the last; Finish shows only on question 3.
- [ ] With the phone keyboard's height taken off the screen, the input and the last answer are inside the visible area (measured in the test).
- [ ] A run whose clock reaches zero shows the result without a tap; reloading mid-run shows the same question, answers count and a clock within a second of the server's.
- [ ] The result lists every answer given with its tier, and per question three missed answers of each tier (fewer when fewer were missed) that are the same for two players, none of them one the player gave (db test for the pick; e2e for the screen).
- [ ] The share text matches the format above for a run with more than 10 answers on a question (unit test), and holds no answer's name.
- [ ] A friend's row on the live board reads the question and points mid-run and updates without a reload (e2e with two players); the board message holds no answer (unit test of the message).
- [ ] With Reduce motion on, nothing on these screens animates.
- [ ] A format 3 day still plays as before (the existing e2e tests pass).
- [ ] `npm run verify -- offbeat-run` passes, and the skill's sync commit moves if a covered file changed.

## Out of scope
- A style of its own for Offbeat (mocks A and B, M20 20m: the human judges them first; answer 40).
- Drafting and approving a format 4 day, tiers from play (23e). Boards and par from the switch, removing the old game and its screens (23f).
- Sound. A list of the answers given while playing (answer 41). The full list of missed answers (answer 42).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 3, 3, 3 | Missed answers shown per question, per tier | The human, 2026-11-25, answer 45: "3 each, same for everyone (Recommended)" |
| 6 | Rare answers a day carries per question | The human, 2026-11-25, answer 49: "6 per question (Recommended)" |
| 10 | Squares per line in the share text | The human, 2026-11-25, answer 46: "Wrap every 10 (Recommended)" |
| 390 × 844, 1280 × 720 | The sizes the screens are tested at | CLAUDE.md, Testing (`@visual`) |
| 20 s; 3, 5, 8 s; 10, 25, 50 points | Shown in the rules and How to play | Answers 10 and 11, read from the server (`private.clock_start_ms`, `clock_added_ms`, `clock_points`), never typed into the screen's code |

## Plan
**23d-1, as checks (each run, each passed):**
1. Read 23c's state and routes, the old game's screen and Fragments' → verify: the brief names what each gives (the builder's report).
2. The card, the play screen, the plain end, for a player and a guest → verify: `npx playwright test e2e/clock.e2e.ts` passes at both sizes.
3. A format 3 day still plays → verify: `npx playwright test e2e/offbeat.e2e.ts` passes.
4. The run's rules untouched → verify: `npm run verify -- offbeat-run` passes.

**23d-2, as checks:**
1. A format 4 day's question carries `rare` (six thing IDs, none in `levels`) and `size`; the day's check refuses one without them → verify: `npm test` (the puzzle check's tests, a failing case first).
2. The state's `missed` gives per question up to three common, three uncommon (in an order fixed by the day and the question) and three rare (the day's order), none the player gave, and the count of the rest → verify: `npx vitest run src/game/clock-state.test.ts`, and a db test that two players get the same nine.
3. The share text → verify: `npx vitest run src/game/share.test.ts` (a question with more than 10 answers; no answer's name).
4. The board message carries the run's points (version 3) and the board's read gives question and points → verify: the board's db tests and a unit test that the message holds no answer; `npm run test:sql`.
5. The result screen, the share button, the live board's rows, How to play → verify: `npx playwright test e2e/clock.e2e.ts` at both sizes, a two-player test for the board.
6. A format 3 day still plays, the run's rules hold → verify: `npx playwright test e2e/offbeat.e2e.ts`; `npm run verify -- offbeat-run`.

## Removes
Nothing: the old game's screens go in 23f.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 23d-1 (the design above) | | |
| The rules on the card "in three lines (three questions, one clock that starts at 20 seconds, rarer answers add more time and points)" | "3 questions, one clock." / "Every answer adds time." / "Rarer answers add more time and more points.": no seconds and no points named, on the card or in How to play | Numbers: they are read from the server, never typed into a screen, and the state does not carry the rules' numbers. Carrying them is a server change; in ROADMAP, For M23 |
| The clock "as the kit's countdown bar" | The bar starts full again at each accepted answer | `Countdown` draws the time left against the time left when it was shown, as in both other games; the state carries no whole length |
| Not designed | Today shows a card for a clock day (Play, Continue or Result) | Without it Today's Offbeat card stayed a loading placeholder on a format 4 day |
| Not designed | A tab that is behind (another tab pressed Next, or the run ended) reads the run again instead of showing an error | Answer 32: both tabs show the same run |
| "With the phone keyboard's height taken off the screen" | The test shortens the window to 390 × 500 | Playwright has no phone keyboard; 500 is the builder's stand-in. Not proof on a real phone: the human tries it on the preview |
| 23d-2 | | |
| The share text ends with the line `plor.app` | The text ends with the last question's squares; the Share button adds the page's own link after it (`https://plor.app/` on the site) | `ShareResult` already adds the link for both other games; the text naming the address too gave it twice |
| A question's line is "its number and squares" | A question with no answers is its number alone ("2") | Nothing to show; no trailing space |
| "A count of the rest" | The count is the question's `size` (its list's count when drafted) less the answers given and shown | Nothing a player's role may run counts a list (answers 48 and 49); `size` is filled at drafting (23e) |
| Not designed | The day's check for `rare` and `size` (`checkClockPuzzle`) exists and is tested, and nothing calls it yet | No code approves or loads a format 4 day until 23e, which wires it in; tests build such days directly |
| The board message "gains the points" | Every board message is version 3; only a clock run's carries `points`; on a clock day every friend is sent it, played or not | Answer 47 and its stated cost. A format 3 day and Fragments keep "only started until you finish" (their SQL tests changed in the version number only) |
| Not designed | The feed gives a finished clock run a time: its Finish, or its clock's end, whichever is first | A clock run has no answer events, so its time was empty and the Friends and Today pages crashed once a friend finished one (found by the board's e2e; `feed-page.clock.db.test.ts` failed first) |
| Not designed | The feed still words a finished clock run "survived" | The old game's wording; replaced in 23f |

## Evidence
**23d-1** (commands run 2026-11-25 on the local stack):
- A player and a guest play from Start to the end at both sizes; an accepted answer, a repeat, text off the list, Next, Finish only on question 3, the same run after a reload and in a second tab: `CI=1 npx playwright test e2e/clock.e2e.ts` → `8 passed (50.4s)` (4 tests, each at 390 × 844 and 1280 × 720).
- The clock reaching zero shows the end without a tap: the test loads a run with seconds left, sees the timer and the input, and waits for "Your answers" with no tap and no reload. Its first form passed whether or not the page's own count worked (the review); the stricter form then failed once, on the test's own mistake (it took the play screen's points chip for the end), and passes now.
- The input and the last answer inside a window shortened to 390 × 500: in the same run (see the Source diff: a stand-in).
- A format 3 day: `npx playwright test e2e/offbeat.e2e.ts` → `5 passed`.
- `npm run verify -- offbeat-run` → `OffbeatRun.cfg: every rule holds (233 distinct states, 1.0 s)`; no covered file changed, so the sync commit stays.
- `npx tsc --noEmit`, `npx eslint src e2e --quiet`: no output. `npm test` → `941 passed`.
- Looked at by the session at both sizes (the card, an accepted answer, a repeat, the end); pictures and the run's videos sent to the human in the app; CI's are in the PR run's `e2e-videos`.
- **Not verified:** a real phone's keyboard; Reduce motion beyond adding no motion (the end's score keeps the kit's `pop`, which has its own reduced-motion rule); the full e2e and db suites locally (CI runs them).

**23d-2** (commands run 2026-11-25 on the local stack, on the tree as committed):
- The result for a player and a guest, the same missed answers for two players, Share copying the squares and no answer, a friend's question and points arriving on the board with no reload: `CI=1 npx playwright test e2e/clock.e2e.ts` → `12 passed (4.5m)` (6 tests, each at 390 × 844 and 1280 × 720).
- The pick of the nine and `more`: `npx vitest run src/game/clock-state.test.ts` (in `npm test`); two players and a guest get the same ones from the database: `src/game/clock-runs.plor-app.db.test.ts`.
- The share text for more than 10 answers on a question, no answer's name: `src/game/share.test.ts` → `11 passed`.
- The board's read, the feed's time, the clock runs: `npx vitest run src/game/clock-runs.plor-app.db.test.ts src/app/api/board src/comments src/app/api/feed --no-file-parallelism` → `8 files, 44 passed`. The board message in SQL (version 3, points, no answer, a stranger gets nothing): `npm run test:sql` → `Result: PASS`.
- `npx tsc --noEmit`, `npx eslint src e2e scripts --quiet`: exit 0, no output. `npm test` → `79 files, 953 passed`.
- `npm run verify -- offbeat-run` → `OffbeatRun.cfg: every rule holds (233 distinct states, 1.1 s)`. `src/game/clock-play.ts` changed in one argument of the names read, nothing the model covers.
- A format 3 day: `npx playwright test e2e/offbeat.e2e.ts e2e/live-board.e2e.ts` → `12 passed, 1 failed`. The failure is `live-board.e2e.ts:32`, "a friend's run shows up live, with no spoiler": `Test timeout of 90000ms exceeded`, twice in a whole-file run, and it passed run alone (1.1 min). Its trace shows no failed step: five waits of about 5 seconds each for an Undo toast's send, and the test still navigating at 90 s. Read as a test at the edge of its time limit on this PC, **not shown to be unrelated to this change**; CI's e2e run decides, and the PR is not merged unless it is green. In ROADMAP, For M23.
- Videos of the result at both sizes sent to the human in the app; CI's are in the PR run's `e2e-videos`.
- **Not verified:** the screens looked at by the session (videos only, no pictures taken); Reduce motion beyond adding no motion; a real phone; the whole db suite locally (the builder's run had two known timeouts, `admin/bank` and `account/delete`, each passing alone); the new SQL test was written after the migration was applied, so it was never seen failing.

## Review
**23d-1 (the `reviewer` agent, fresh context, 2026-11-25):**
- Blocking, fixed: (1) the game page and the clock game each held the run and each timed midnight, the page's from the state it first loaded, so a run started after the page opened would have been thrown off its question at midnight: the clock game now uses the page's one state, one timer. Read from the code, not reproduced; no test covers midnight. (2) The clock-runs-out test could pass with the page's own count broken: made strict (Evidence).
- Not blocking, fixed: an answer could be sent while Next was on its way.
- Deferred to ROADMAP "Next revision", For M23: the rest.

**23d-2 (the `reviewer` agent, fresh context, 2026-11-25):**
- Blocking: none in the code. One on process, the ticket, ROADMAP and handoff not yet written when it read the tree: written in this commit.
- Checked and found sound, by reading and by the unit tests: nothing of an answer before the run is over or in a board message or read; the old "only started" rule for a format 3 day and Fragments; the migration's definer settings, a missing day, a guest run; the same nine for every player and the `more` count; `node:crypto` stays on the server; the feed's SQL.
- Between this PR's deploy and the human's `npx supabase db push`, plor.app's database still sends version 2: the board logs "unknown version" and reads the board again on each message, so it stays right. The beta is paused.
- Deferred to ROADMAP "Next revision", For M23: the rest.

- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
