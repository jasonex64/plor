# M23 23c — The run on a clock (the server's side)

**Status:** designed 2026-11-24 from answers 5 to 11, 27, 28 and 31 to 33 in `M23-offbeat-on-a-clock.md`; **approved 2026-11-24, its security change included (the human: "Approve both", to "Approve both designs, including their two permission changes?")**. **Built 2026-11-24, in its PR** (after 23b-1's PR, #302, merged): the model, the migration, the server code and their tests; no screen (23d).

## Goal
The server can run, judge, time and score a day of the new Offbeat: three questions on one clock that grows with each accepted answer, for a signed-in player and a guest, with no screen yet.

## Who uses it / what breaks without it
- Used by: 23d's screens, which only draw what this returns; every player of the new game.
- Breaks without it: there is no new game. Today's tables allow one answer per question and a fixed 20 seconds each.

## Source
- The human's answers (the M23 ticket): 5 (three questions on one clock), 6 (time added shrinks as you go), 7 (a wrong or repeated answer changes nothing), 8 (no host, no taken letters), 9 (Next, no going back), 10 (20 s; 3, 5, 8 s; about 5% shrink), 11 (10, 25, 50 points), 27 (a guest gets the same run), 28 (the clock keeps running when the player is away), 31 (never less than 1 second), 32 (two tabs show the same run), and 33, asked for this ticket, 2026-11-24: a player who has run dry, "A Finish button, on the last question (Recommended)": on question 3 Finish ends the run at once with the score as it stands; time left is worth nothing.
- `docs/DECISIONS.md`: "Resolving typed text" (kept as it is: exact name first, else one typo; every alias counts), "Guest play", the Log's security changes for run tables.
- How a run works today, read by an Explore agent, 2026-11-24: `private.run` holds only the start; answers are rows `plor_app` inserts into `private.run_event`, one per question; Next is a row in `private.question_open`; the rules (in order, open, in time, not over) are triggers that raise `OB002` to `OB006`; a run's status and deadline are worked out when read (`private.run_status`), never stored; guests have mirror tables; Fragments shares `run` and `question_open`. **Unverified by this session:** the trigger bodies and `run_status` themselves; step 1 reads them.
- `.claude/skills/verify-offbeat-run/` (the TLA+ model of today's run; DECISIONS, "Formal verification"): this ticket replaces what it models, so the model is rebuilt here.

## Assumptions
1. The new rules apply to a day by its **format**: a day stored as format 4 (three questions, no host answers, no taken letters) is played on a clock; format 3 days keep today's rules until 23f removes them. So old and new live side by side and nothing changes on plor.app until a format 4 day is approved (23e, 23f).
2. Format 4's shape is fixed here only as far as the run reads it: three questions, each with its prompt, category, root and tiers (`levels`, as today: common or uncommon by answer, rare otherwise). Drafting and approving it is 23e; tests insert it directly.
3. The clock's numbers live in one SQL function, as today's 20 seconds does, and reach the screen through the run's state. Tuning one is a migration.
4. The rarity bonus (40/40/20, pooled shares) does not apply to a format 4 day: points by tier replace it (answer 11).

## Design
**What is stored.** A run's start (`private.run`, as today) and each Next (`private.question_open`, as today). New: one row per accepted answer in `private.clock_answer`: the question, the answer's entry, its tier, the milliseconds it added and the points it earned, and when. One row per answer per question, so the same answer can never count twice, whichever tab sends it. A Finish is one row in `private.clock_finish`. Guests get mirror tables keyed by their token's hash, as today's guest tables are.

**The clock is never stored.** The run's end is its start, plus 20 seconds, plus every answer's added milliseconds; or the Finish, if there is one. It is worked out from the rows each time, by the database's own clock, so a browser can't move it and a second tab reads the same run (answers 28 and 32).

**An answer** (the server resolves the typed text exactly as today, then inserts the row; a trigger applies the rules, as today's do):
- refused if the run hasn't started or is over (the clock has passed zero, or Finish was pressed), or the question isn't the open one;
- a repeat, or text that names nothing on the list, changes nothing; text that names nothing is logged as a miss, as today (answer 7);
- accepted: the trigger takes the run's lock, counts the answers already accepted in the run (n), reads the answer's tier from the day, and fills in `added_ms` = the tier's seconds × 0.95ⁿ, never less than 1 second, and the tier's points. The lock makes two tabs answering at once take turns, so each sees the other's answer in its count.

**Next** opens the next question while the run is live; never back, never past question 3. **Finish** is allowed only on question 3 while the run is live.

**The state the server returns** (to a signed-in player or a guest, on every read and after every action): whether the run is live or over, the open question's number and prompt (never a later one), the milliseconds left by the database's clock, each accepted answer with its tier, seconds added and points, and the score. Answers a player didn't find are returned only once the run is over.

**The score** is the sum of the answers' points. When the day closes, the ledger takes that sum for a format 4 day; boards and par are 23f's.

**The live board** gets a message on each accepted answer and each Next: the question number and the count of answers, never the answers. Its wording is 23d's.

**The model.** `verify-offbeat-run` is rewritten for this run, with two tabs: no answer counts after the run ends; only the open question takes answers; an answer counts once however often and wherever it is sent; Next never goes back or past 3; Finish only on 3; the end moves only by an accepted answer's added time; the added time uses a count that includes every earlier answer.

### The security change (needs the human's OK; recorded in DECISIONS.md's Log)
- Four new tables in `private`, RLS on: `clock_answer`, `clock_finish`, `guest_clock_answer`, `guest_clock_finish`. `plor_app` may **select and insert** on them (not update or delete), exactly as it may on `run_event` and `question_open` today.
- The rules are trigger functions, not granted to anyone. One read function for the run's state, executable by `plor_app`.
- What the app can newly do: record an answer or a Finish for the player or guest making the request, on a day being played. The tier, the time added and the points are filled in by the trigger, so nothing the browser sends can raise them.
- No change to roles, to RLS policies on existing tables, or to who is an admin.

## Acceptance criteria
- [x] A run starts with 20 000 ms; a first common, uncommon and rare answer add 3 000, 5 000 and 8 000; the twentieth accepted answer adds its tier's time × 0.95¹⁹; no answer ever adds under 1 000 (unit test on the arithmetic's SQL function, and a db test of a run).
- [x] A repeated answer, and text that names nothing, change neither clock nor score; the second is logged as a miss (db test).
- [x] An answer after the clock has passed zero is refused, whatever the request says (db test with the clock moved).
- [x] An answer to a question that isn't the open one is refused; Next never goes back or past question 3; Finish is refused before question 3 and ends the run on it (db tests).
- [x] Two connections sending different answers at the same moment both count, and the second one's added time uses n + 1 (db test with two clients).
- [x] A guest's run passes the same tests (db tests on the guest tables).
- [x] The state never holds a later question's prompt or an unfound answer while the run is live (unit test on the payload).
- [x] A closed format 4 day's ledger row equals the sum of its answers' points (db test).
- [x] The rebuilt model passes: `npm run verify -- offbeat-run`; and a deliberately broken copy (the lock removed) fails it.
- [x] `plor_app_role.test.sql` lists exactly the new grants; a format 3 day still plays by today's rules (the existing run tests pass untouched).

## Out of scope
- Every screen, the share text, the live board's wording (23d). Drafting and approving a format 4 day (23e). Boards from the switch day, par, removing the old game (23f).
- Tiers from play (answers 21 and 22): the draft writes them into the day (23e); this reads what the day holds.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 3 | Questions in a run | Human, 2026-11-23, answer 5 |
| 20 s | The clock at Start | Human, 2026-11-23, answer 10 |
| 3, 5, 8 s | Time a common, uncommon, rare answer adds | Human, 2026-11-23, answer 10; to tune |
| 0.95 per accepted answer | The shrink | Human, 2026-11-23, answer 10 ("about 5%") |
| 1 s | The least an answer adds | Human, 2026-11-24, answer 31 |
| 10, 25, 50 | Points by tier | Human, 2026-11-23, answer 11; to tune |
| 40 characters | The longest typed answer | Existing (`assertTypedLength`); kept |

## Plan
1. Read today's triggers (`answer_rule`, `open_rule`), `run_status`, the guest mirrors and `settleRuns` → verify: a note in Evidence of what is reused and what a format switch must touch; the design corrected if one rules it out.
2. The model first: rewrite `OffbeatRun.tla` for the design above → verify: `npm run verify -- offbeat-run` passes, and fails with the lock removed.
3. Failing db tests for each criterion, signed-in then guest → verify: each fails for its stated reason.
4. The migration (tables, grants, triggers, the numbers function, the state function) → verify: the db tests, `npx supabase test db`.
5. `src/game/`: start, answer, next, finish and the state for format 4, signed-in and guest; the routes → verify: unit and route tests.
6. The ledger for a closed format 4 day → verify: its db test.
7. DECISIONS.md (the run's rules, the Log's security line), the verify skill's coverage table → verify: the `reviewer` agent.

Hypothesis for step 2: taking the run's lock before counting is enough for "the added time uses a count that includes every earlier answer". Wrong if the model finds an interleaving where a Next or Finish slips between the count and the insert; then the Next and Finish take the same lock.

## Removes
The old TLA+ model of the seven-question run (replaced by the new one in the same skill). Nothing of the old game's code: that is 23f.

---
## Source diff
| Source says | We built | Why different |
|---|---|---|
| The design: "One read function for the run's state, executable by `plor_app`" | No state function. The app reads `run_status` and its own rows; `plor_app` executes `private.clock_start_ms()` instead, an immutable number the status views read | Fewer rights than approved, not more: one constant in place of a function that reads. Recorded in DECISIONS.md's Log |
| The design: the clock is read "by the database's own clock" | The triggers judge the time at the moment they hold the run's lock (`clock_timestamp()`); the old game judges at the statement's start | With a lock, a second tab's answer waits its turn; judging when it gets it keeps the check and the write one step, which is what the model checks |
| The design: "Next opens the next question" | The tab sends the question it is showing and the server opens the one after it; a tab that is behind gets `out_of_order` | Otherwise a stale tab's Next would skip a question the player never saw |
| The design: "Answers a player didn't find are returned only once the run is over" | Once over, the state lists per question the day's levelled answers (common and uncommon) not given. Rare ones are not listed | No granted function reads a category's members for a player. A finished player can already search a question's full list (`private.search_answers`, DECISIONS Log 2026-10-30); 23d decides what the result shows |
| The design: the live board gets "the question number and the count of answers" | The existing `friend_status` message, sent on each answer, Next and Finish: the question being played, no count | The message keeps its shape (v 2) until 23d decides the board's wording. A clock that runs out writes nothing, so sends nothing, as a timed-out run today |
| Plan's hypothesis: taking the lock before counting is enough; "wrong if ... a Next or Finish slips between the count and the insert; then the Next and Finish take the same lock" | All three take the lock. Without it the model breaks NoAnswerAfterEnd, OnlyTheOpenQuestion and CountIncludesEveryEarlierAnswer; Next's and Finish's own rules hold either way | The lock in Next and Finish protects the answers' rules (Evidence) |
| Answer 7: text that names nothing "is logged as a miss, as today" | As today, through `private.record_miss`, for a signed-in player; a guest's is stored nowhere, as today | Unchanged. `record_miss` also runs players' learning (a text typed by enough players becomes an answer), now on researched lists too: put to the human before 23e (ROADMAP, For M23) |
| Removes: "the old TLA+ model of the seven-question run" | As designed | Until 23f removes the old game, its run rules have no model check; the skill says so |
| Not in the design | An answer sent to a run that is over returns the run's state, not an error; `/finish` on a format 3 day is 409 `not_a_clock_day`; a clock answer or Finish with no run is refused as its foreign key would (23503) | The first as today's `time_up`; the others are refusals the design didn't name |
| Not in the design | A guest's clock answers are not added to `private.guest_tally` | Nothing reads them yet; 23e's tiers from play decide (ROADMAP, For M23) |

## Evidence
**Step 1, read by the main session, 2026-11-24** (`20261111120000_guest_play_data.sql` 17-129, `…game_2_rounds.sql` 103-130, baseline 925-943):
- The rules are plain functions (`answer_rule`, `open_rule`, `round_open_rule`) that `plor_app` may execute, called by invoker triggers (`check_run_event`, `check_question_open`) that read the facts first. The new game follows the same shape: a `clock_answer_rule` and a branch per trigger.
- `check_question_open` already branches on the game (`substrings`). A format 4 Offbeat day needs its own branch there, chosen by the day's format, since Next on a clock run doesn't wait for an answer: reuse of `question_open` holds, with that one trigger changed.
- `private.run_status` (a view, `security_invoker`) works a status out per game from `run_event`. A format 4 run needs a third branch: live while the clock is above zero and no Finish, else over. Other code reads `survived` as "finished" (the social gates), so an ended clock run reports `survived`; the design's "live or over" maps onto the existing words, no new status.
- `question_deadline` is the one home of today's 20 seconds; the clock's numbers get the same kind of home.
- Nothing read rules the design out. Not yet read: the guest triggers and `settleRuns` (before steps 3 and 6).

**Step 2, the model** (`npm run verify -- offbeat-run`, 2026-11-24): `OffbeatRun.cfg: every rule holds (233 distinct states, 1.0 s)`. With `Locked = FALSE`: `Error: Invariant CountIncludesEveryEarlierAnswer is violated.` (exit 1). Each rule alone without the lock: NoAnswerAfterEnd, OnlyTheOpenQuestion and CountIncludesEveryEarlierAnswer are violated; NextOnlyForward, FinishOnlyOnLast and AnswersOnlyForOpened hold.

**Step 3, failing first:** `supabase/tests/clock_run.test.sql` before the migration: `Bad plan. You planned 88 tests but ran 0.` (the tables don't exist), `Result: FAIL`. `plor_app_role.test.sql` after it, before its list was changed: test 15 failed on exactly nine new grants (select and insert on the four tables, execute on `clock_start_ms()`). The server tests: the subagent that wrote them saw the db and route tests fail first; it wrote `clock-state.ts` before its unit test, and checked that one by mutation instead (a `repeat` that is always false, and the ledger change reverted, each fail their tests).

**Per criterion** (all on slot 1's local stack, 2026-11-24):
- The numbers, and a run's first answers (3000, 4750, 7220 ms; 10, 25, 50 points; the twentieth x 0.95^19 = 1132 and 3019; never under 1000): `clock_run.test.sql`, tests 1 to 10 and the run's; `npm run test:sql`: `Files=43, Tests=921, Result: PASS`.
- A repeat and unknown text change nothing; the second is a miss: `clock_run.test.sql` ("a repeated answer raises nothing", "stores nothing", "moves no clock"); `src/game/clock-runs.plor-app.db.test.ts` (the miss row).
- An answer after the clock has passed zero is refused (OB003), with the run's start moved back: both files.
- Not the open question (OB006), Next never back or past 3 (OB002, OB003), Finish refused before question 3 (OB019) and ends the run on it: `clock_run.test.sql`.
- Two connections at once: `clock-runs.plor-app.db.test.ts`: B's insert waits for A's commit, both rows exist, B's time uses n + 1.
- A guest's run: every case in `clock_run.test.sql` runs on both table sets (88 tests = 10 numbers + 39 cases x 2); the guest flow and routes in the two server test files.
- The state holds no later prompt or unfound answer while live: `src/game/clock-state.test.ts` (4 tests).
- The ledger row of a closed format 4 day: `src/game/ledger.db.test.ts`, one new test.
- The model: step 2 above.
- The grants and the old game: `plor_app_role.test.sql` passes with the nine grants listed; the existing run tests pass untouched (`runs.db.test.ts`, `runs.plor-app.db.test.ts`, `guest-runs.plor-app.db.test.ts`, `misses.db.test.ts`, `guest_play.test.sql`, `game.test.sql`).
- All together: `npx tsc --noEmit -p .` and `npx eslint src scripts` clean; `npm test`: 77 files, 885 passed; `npm run test:db`: 69 files, 572 of 573 passed in each of three full runs; the one failure each time is `src/app/api/admin/bank/route.db.test.ts`, "answers 401 to a signed-out request", among the run's first tests, timing out at 5 s (5236 ms); it passes when run alone and touches nothing this ticket changed. Unexplained beyond that: CI's db job is the check.

**Not verified:** nothing was looked at in a browser (there is no screen). Old code that reads a day as format 3 (`src/game/offbeat.ts`, `me.ts`, shares, boards) was not changed and would mishandle a format 4 day: 23d and 23f, before any such day is approved. The few milliseconds between a trigger's check and its commit are outside the model.

## Review
The `reviewer` agent, 2026-11-24, fresh context. It reran `clock_run.test.sql` and `plor_app_role.test.sql` (103 tests, PASS), the model (233 states, every rule holds), `tsc`, and the four new or changed server test files (15 passed). **No blocking finding.** It confirmed by reading: the triggers' rights and empty `search_path`, that nothing an insert supplies survives them, that the lock serialises two tabs, that format 3 and Fragments paths only gain an early return or a filter, and that the smaller grant is recorded.
- Deferred to ROADMAP "Next revision", For M23: the model's `answerAfterEnd` flag reads Finish only, never the clock, so without the lock a tick between check and write goes unflagged; `clock-play.ts`'s re-read after a miss that lost the race with the clock's end is the one retry-shaped path; `clock_added_ms` treats an unknown tier as rare (unreachable: the table's check).
- Unverified by the reviewer: the full `npm test` and `npm run test:db` suites (run by the main session, Evidence), the lock-removed model run (the main session's, Evidence), the milliseconds between a trigger's check and its commit, and anything in a browser.
