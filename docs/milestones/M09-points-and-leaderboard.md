# M09 — Points and friends leaderboard

**Status:** planned: Claude's draft, waiting on the human's answers to D1–D7.

## Goal
Each finished run's points go into an append-only ledger, and each player sees an all-time leaderboard of themselves and their friends, equal to the ledger's sum.

## Who uses it / what breaks without it
- **Used by:**
  - players, to compare themselves with friends over time;
  - groups (M10), whose leaderboards sum the same ledger over a group's members;
  - the home screen (M11), which shows friends' scores.
- **Breaks without it:**
  - Points exist only on the result screen of one day's run (M04), so friends can't compare totals.
  - M10 and M11 have no scores to show.
- **The human's words:**
  - "Points and an all-time friends leaderboard" (ROADMAP, Product);
  - midnight: "they get to play the puzzle but their score doesn't contribute to leaderboard" (2026-10-21; DECISIONS.md, Game 1: Timer).

## Claude's design (for the human to approve)
- **The ledger** is `M00-data-design.md` §6 as approved (2026-10-17):
  - `private.points_ledger(id, user_id, game_id, puzzle_date, points, created_at)`;
  - one row per run, unique per (user, game, day), points ≥ 0;
  - append-only: plor_app may only read and insert (§7);
  - deleting the account cascades.
- **What a run scores:** the formula is the one already in use: surviving questions 1 to 7 earns 25, 50, 75, 100, 150, 250 and 350 (`POINTS_PER_QUESTION`, human, 2026-10-21). D1 and D2 settle the cases the formula doesn't cover.
- **When the row is written:**
  - §6 writes it in the same transaction as the run's ending answer: the catch, or the last safe answer.
  - Two kinds of run have no such answer: a run that ran out of time, and a run left at a reveal, which never ends by itself. D3 settles them.
- **The leaderboard:** you and your friends, ranked by all-time total, highest first (D4). It's shown as a plain section on the home page (D6); the look is M14.
- **Existing runs** get their rows when M09 ships, and a rerun adds nothing (§6, Backfill).

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| D1 | **A run still going when its day ends.** This covers a run started before midnight, and one left at a reveal (it stays in progress until Next). (a) It scores 0: only a run that ends before its day ends counts. (b) It scores the questions it survived before the day ended, and what happens after midnight doesn't count | (a). It's your words read as written ("their score doesn't contribute"), and it's one simple rule. The cost: someone who closes the tab at the reveal after question 6 gets 0, not 650. If that feels harsh, pick (b) ||
| D2 | **A run that ran out of time.** (a) It scores the questions it survived, like a caught run. (b) It scores 0 | (a). Running out of time ends the run like a catch, and DECISIONS.md, Game 1 already reads it that way, pending this ticket ||
| D3 | **What writes the row for a run with no ending answer** (ran out of time; and, under D1 (b), a day that ended). (a) **Settle when read:** before the leaderboard is computed, rows are written for the shown players' runs that can no longer change; the ending answer calls the same function. (b) **A scheduled job** (Vercel Cron or Postgres `pg_cron`) writes them a while after each one ends | (a). It needs no new kind of infrastructure, no schedule (a number you'd have to pick) and no secret for a job's route. It also does the backfill: old runs get their rows the first time anyone's leaderboard shows them, so §6's separate `ledger:backfill` script isn't needed. The cost: a write happens inside a read, and a row's `created_at` is when it was settled, not when the run ended ||
| D4 | **Who's on the leaderboard, and how it's ordered** | You and your friends, not friends of friends (like comments, M08). All-time total, highest first; ties alphabetically by name. A friend with no points shows 0 ||
| D5 | **Today's points before you've finished today** | Left out of everyone's totals until your own run today is over, then included. Otherwise a friend's total going up by 150 says they were caught on question 4 (DECISIONS.md, Game 1: no spoilers). The live board already shows "on question 3" then "finished" (ROADMAP "Next revision" has that for you), so you may prefer to include them ||
| D6 | **Where it's shown** | A "Friends leaderboard" section on the home page, under "Friends today". The home screen is reworked in M11 ||
| D7 | **Security change:** a new table, `private.points_ledger`. plor_app may read and insert only (no update or delete), with one policy per command. The routes read only the viewer's and their friends' rows | Approve. It's the grant set §7 approved in the data design (2026-10-17); this records it as M09's change in DECISIONS.md, like M07's and M08's ||

## Source
- `docs/ROADMAP.md`: Product and the M09 row (its three questions are D1, D2 and D3).
- `docs/DECISIONS.md`: Hard to reverse, Points ledger; Game 1 (Timer, Scoring, no spoilers); Row-level security in `private`; App database role; Config and tunables.
- `docs/milestones/M00-data-design.md`: §5 (runs, `run_status`), §6 (the ledger, the formula, backfill), §7 (append-only grants), §8 (the day boundary).
- `docs/milestones/M04-game-mechanics.md`, G1: the points formula.
- `docs/SOURCES.md`: PostgreSQL 17 (constraints, `INSERT … ON CONFLICT DO NOTHING`, transactions).
- If D3 is (b): a source for the scheduler (Vercel Cron or Supabase `pg_cron`) has to be added to SOURCES.md by the human first.

## Acceptance criteria
*(Written for Claude's suggestions; they change with the answers.)*
- [ ] `private.points_ledger` exists as in §6. pgTAP checks plor_app's exact grants (select, insert), that plor_app can't update or delete it, that a second row for the same run is refused, and the account cascade.
- [ ] A run's row holds the right points. A route or database test covers each case: caught on question 4 (150), survived (1000), ran out of time on question 3 (75, D2), still at a reveal when its day ended (D1), and started before midnight but finished after (D1).
- [ ] No row is written for a run whose points can still change, and writing again never adds a second row or changes one (D3).
- [ ] Runs from before M09 get their rows. Evidence: settling twice, where the second time writes 0 rows, and the ledger sum equals the recomputed score for every finished run (§6, Backfill).
- [ ] The leaderboard shows the viewer and their friends only, ordered as D4 says, with each total equal to that player's ledger sum. Route tests use a friend, a non-friend and a friend of a friend.
- [ ] Today's points stay out of the totals until the viewer's own run today is over (D5). A route test checks before and after.
- [ ] Signed out gets 401.
- [ ] The home page shows the leaderboard (D6), checked in the e2e test or a browser.

## Out of scope
- Group leaderboards (M10) and the home screen (M11).
- Weekly or daily leaderboards, streaks and badges.
- Changing the points formula or the result screen's points (M04).
- The look (M14).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Points per question: 25, 50, 75, 100, 150, 250, 350 | Each run's points | Human, 2026-10-21 (M04 G1; `POINTS_PER_QUESTION`) |
| The day ends at midnight `America/Los_Angeles` | Whether a run ended within its day (D1) | Human, 2026-10-17 (§8; `private.day_of`) |
| *Only if D3 is (b):* how often the job runs | Settling runs with no ending answer | **Blank: ask** |

## Plan
1. The human answers D1–D7.
2. **9a, the ledger:** the table and grants, the scoring of every kind of run (D1, D2), the write path (D3) and the backfill, with pgTAP and route tests first.
3. **9b, the leaderboard:** the route and the home-page section (D4–D6), route tests first, plus a browser or e2e check.
4. Each sub-ticket gets its own PR and a reviewer pass.

## Removes
- If D3 is (a): §6's planned `npm run ledger:backfill` script is never built, because settling does the backfill. §6 and DECISIONS.md, Points ledger, are updated to say how rows for runs with no ending answer are written.
- No existing code is removed, because this adds a new feature.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
