# M23 23c — The run on a clock (the server's side)

**Status:** designed 2026-11-24 from answers 5 to 11, 27, 28 and 31 to 33 in `M23-offbeat-on-a-clock.md`; **approved 2026-11-24, its security change included (the human: "Approve both", to "Approve both designs, including their two permission changes?")**. Not started: it is built after 23b-1's PR, one sub-ticket's PR at a time.

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
- [ ] A run starts with 20 000 ms; a first common, uncommon and rare answer add 3 000, 5 000 and 8 000; the twentieth accepted answer adds its tier's time × 0.95¹⁹; no answer ever adds under 1 000 (unit test on the arithmetic's SQL function, and a db test of a run).
- [ ] A repeated answer, and text that names nothing, change neither clock nor score; the second is logged as a miss (db test).
- [ ] An answer after the clock has passed zero is refused, whatever the request says (db test with the clock moved).
- [ ] An answer to a question that isn't the open one is refused; Next never goes back or past question 3; Finish is refused before question 3 and ends the run on it (db tests).
- [ ] Two connections sending different answers at the same moment both count, and the second one's added time uses n + 1 (db test with two clients).
- [ ] A guest's run passes the same tests (db tests on the guest tables).
- [ ] The state never holds a later question's prompt or an unfound answer while the run is live (unit test on the payload).
- [ ] A closed format 4 day's ledger row equals the sum of its answers' points (db test).
- [ ] The rebuilt model passes: `npm run verify -- offbeat-run`; and a deliberately broken copy (the lock removed) fails it.
- [ ] `plor_app_role.test.sql` lists exactly the new grants; a format 3 day still plays by today's rules (the existing run tests pass untouched).

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

## Evidence

## Review
