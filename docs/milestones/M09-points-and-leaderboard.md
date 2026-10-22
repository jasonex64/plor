# M09 — Points and friends leaderboard

**Status:** planned: every decision answered (D1–D11, human, 2026-10-22), including the rarity bonus's design and its Hard-to-reverse change to the ledger. The five numbers N1–N5 wait on the human; no code until they're given.

## Goal
Each finished run's points, the question ladder plus a rarity bonus, go into an append-only ledger. Each player sees an all-time leaderboard of themselves and their friends, equal to the ledger's sum.

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
  - midnight: "a run's points count whenever it's finished, for its own day, and a run that's never finished counts nothing" (2026-10-22, D1), replacing "their score doesn't contribute to leaderboard" (2026-10-21). The human's notes later the same day said the opposite, and D8 settled it: late runs count, but answers after midnight earn no rarity bonus;
  - the rarity bonus: "Offbeat gets a rarity bonus on top of the existing points" (2026-10-22, the human's notes; summarized under "The rarity bonus" below).

## The rarity bonus (the human's decision, 2026-10-22)
What the human decided, from their notes:
- **What stays:** sudden death, and the 25/50/75/100/150/250/350 ladder per survived question (DECISIONS.md, Game 1; M04 G1).
- **The bonus:** each survived answer earns a bonus that's bigger the fewer players gave the same answer (the same `entry_id`) to that question that day.
- **Who's counted:** only players who answered that question, not everyone who played the day.
- **Expectation, then real counts:** each answer starts from an expected popularity, and the day's real counts are blended in. On a small day the expectation dominates; on a big day the real counts do.
  - Early on, the expectation is a rough common/uncommon/rare tier per entry, set when the day is drafted and approved by the human on the admin page.
  - Later it comes from past days' real picks for similar prompts (M03 insights already counts picks).
- **Provisional, then final:** the player sees a provisional bonus right away, from the expectation alone. The final bonus is computed once the day is over, from the full day's counts.
- **The cap:** a run's total bonus is always less than the points for the next question it didn't survive. Getting further always beats rarer answers; the bonus only orders players who reached the same question.
- **1000 is no longer the maximum.** Comparing games will use daily percentiles (the draft M16 ticket, "Comparing games", PR #42, not merged). M09 builds none of that.
- **Earlier runs** get the rarity bonus too, computed from their stored answers.

## Design (Claude's, approved by the human, 2026-10-22)
- **The ledger** is `M00-data-design.md` §6 (approved 2026-10-17), changed by D9:
  - `private.points_ledger(id, user_id, game_id, puzzle_date, points, bonus, created_at)`;
  - one row per run, unique per (user, game, day); `points` is the run's total (ladder plus bonus) and `bonus` the bonus part, so the result screen and M16's percentiles can show both;
  - append-only: plor_app may only read and insert (§7, D7); deleting the account cascades.
- **The ladder part** is as answered: every finished run counts, even one finished after midnight (D1); a run that ran out of time scores the questions it survived (D2); a run never finished counts nothing. Answers given after the day's midnight earn no rarity bonus; answers before it keep theirs (D8, human, 2026-10-22).
- **The rarity bonus, as Claude proposes to compute it.** For one question on one day:
  - *n* is the number of players who answered it, and *c* is how many gave this answer;
  - the expected share *e* of this answer comes from the expectation (D11);
  - the blended share is *(W × e + c) / (W + n)*, where W says how strongly the expectation weighs, counted as if it were W players (N1). While *n* is below the minimum (N4), the blended share is just *e*;
  - the answer's bonus comes from its blended share by the formula or tiers the human gives (N2): a smaller share gives a bigger bonus;
  - the run's bonus is the sum over its survived answers, cut to one less than the points of the first question it didn't survive (so a run caught on question 4, worth 150, gets at most 99), or to the perfect-run cap (N3);
  - **provisional** (shown on the reveal and the result screen): the same steps with *n* and *c* as 0, so the expectation alone;
  - **final:** the counts are the day's answers recorded **before its midnight**. So the final bonus depends only on stored answers, not on when it's computed, and a run finished after midnight neither changes them nor, under D8 (c), earns a bonus for its late answers.
- **When the row is written** (D9, D10): once the run is finished and its day is closed. The settling function from D3 writes it; what closes a day is D10.
- **The leaderboard:** you and your friends, ranked by all-time total, highest first, ties alphabetically (D4), as a plain section on the home page (D6). Under D9 (a) today's points only arrive once the day closes, so D5's "not before you've finished" holds automatically.
- **Existing runs** get their rows the first time they're settled, with the final bonus computed from their stored answers (D3; §6, Backfill).

### The change to a "Hard to reverse" decision (approved by the human as D9, 2026-10-22; DECISIONS.md and §6 now hold it)
DECISIONS.md, Points ledger, said the row is "Written when a run ends (from M09), append-only … with the ending answer, or, for a run that ran out of time …, when the leaderboard settles it". It now reads:
> One row per run, written once the run is finished **and its day is closed** (D10), holding the run's total (`points`: the question ladder plus the final rarity bonus) and the bonus part (`bonus`). Append-only; unique per (user, game, day); the leaderboard is the sum of `points`. The final bonus uses only answers recorded before the day's midnight, so it doesn't depend on when it's computed.

`M00-data-design.md` §6 changed the same way: the ending answer no longer writes the row, because the final bonus isn't known yet. "1000 for a perfect run" left DECISIONS.md, Game 1: Scoring, which now describes the bonus.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| D1 | **A run still going when its day ends.** This covers a run started before midnight, and one left at a reveal (it stays in progress until Next). (a) It scores 0: only a run that ends before its day ends counts. (b) It scores the questions it survived before the day ended. (c) It counts whenever it's finished, for its own day | Claude first suggested (a), from the human's 2026-10-21 words, then (c) once the human questioned that rule | **(c)** (human, 2026-10-22: "a run's points count whenever it's finished, for its own day, and a run that's never finished counts nothing"). It replaces the 2026-10-21 rule (DECISIONS.md, Game 1: Timer; Log). **The human's later notes say the opposite: see D8** |
| D2 | **A run that ran out of time.** (a) It scores the questions it survived, like a caught run. (b) It scores 0 | (a). Running out of time ends the run like a catch, and DECISIONS.md, Game 1 already reads it that way, pending this ticket | **As suggested** (human, 2026-10-22: "otherwise the rest of the suggestions seem fine") |
| D3 | **What writes the row for a run with no ending answer** (ran out of time). (a) **Settle when read:** before the leaderboard is computed, rows are written for the shown players' runs that can no longer change; the ending answer calls the same function. (b) **A scheduled job** (Vercel Cron or Postgres `pg_cron`) writes them a while after each one ends | (a). It needs no new kind of infrastructure, no schedule (a number you'd have to pick) and no secret for a job's route. It also does the backfill: old runs get their rows the first time anyone's leaderboard shows them, so §6's separate `ledger:backfill` script isn't needed. The cost: a write happens inside a read, and a row's `created_at` is when it was settled, not when the run ended | **As suggested** (human, 2026-10-22: "otherwise the rest of the suggestions seem fine"). With the rarity bonus, "can no longer change" also needs the day closed (D9, D10) |
| D4 | **Who's on the leaderboard, and how it's ordered** | You and your friends, not friends of friends (like comments, M08). All-time total, highest first; ties alphabetically by name. A friend with no points shows 0 | **As suggested** (human, 2026-10-22: "otherwise the rest of the suggestions seem fine") |
| D5 | **Today's points before you've finished today** | Left out of everyone's totals until your own run today is over, then included. Otherwise a friend's total going up by 150 says they were caught on question 4 (DECISIONS.md, Game 1: no spoilers). The live board already shows "on question 3" then "finished" (ROADMAP "Next revision" has that for you), so you may prefer to include them | **As suggested** (human, 2026-10-22: "otherwise the rest of the suggestions seem fine"). Under D9 (a) it holds automatically: nothing of today reaches the leaderboard before the day closes |
| D6 | **Where it's shown** | A "Friends leaderboard" section on the home page, under "Friends today". The home screen is reworked in M11 | **As suggested** (human, 2026-10-22: "otherwise the rest of the suggestions seem fine") |
| D7 | **Security change:** a new table, `private.points_ledger`. plor_app may read and insert only (no update or delete), with one policy per command. The routes read only the viewer's and their friends' rows | Approve. It's the grant set §7 approved in the data design (2026-10-17); this records it as M09's change in DECISIONS.md, like M07's and M08's | **As suggested** (human, 2026-10-22: "otherwise the rest of the suggestions seem fine") |
| D8 | **Runs finished after midnight: count or not?** In chat (D1) the human chose "count whenever finished"; their notes, written the same day, say "runs finished after their day ended still don't count for the leaderboard", and list D1 and D2 as still open. (a) Keep D1 (c): they count, with the final bonus from the closed day's counts. (b) Go back to 2026-10-21: they don't count. (c) **The human's middle ground** (2026-10-22: "late runs can count but they wont earn the rarity bonus"): they count for the ladder, without the bonus. Applied either (c1) **per answer**: answers given before midnight keep their bonus, answers after it earn none; or (c2) **per run**: a run finished after midnight gets no bonus at all | (c1). It keeps the human's middle ground, and it's fairer at the edge: someone who starts at 11:58 and answers six questions before midnight keeps those six bonuses. It's also the same line the final counts already use (answers before midnight). (c2) is easier to say in one sentence ("finish before midnight to get the bonus") | **(c1), per answer** (human, 2026-10-22: "Per answer: answers before midnight keep their rarity bonus, answers after midnight earn none"). Late runs still count for the ladder (D1) |
| D9 | **Hard to reverse: when the ledger row is written.** (a) **One row per run, once the run is finished and its day is closed**, holding the total and the bonus part (the proposed text above). (b) **Two rows per run:** the ladder points when the run ends, and the bonus once the day closes; unique per (run, kind) | (a). One row, one rule, and no spoiler question (D5): today's scores reach the leaderboard the morning after. The cost: your own points join the leaderboard only after midnight, though the result screen shows them, with the provisional bonus, at once. (b) shows the ladder points sooner, at the price of two kinds of row | **(a)** (human, 2026-10-22: "Take Claude's suggestions for M09 D9 (one ledger row once the day closes), D10 (no scheduler: the day closes at midnight and the first leaderboard read settles it) and D11 (host bank as the common tier)"). DECISIONS.md, Points ledger and §6 now say so |
| D10 | **What closes a day.** DECISIONS.md has no way to run scheduled jobs (the data design says "There's still no closing job"), so Claude doesn't pick one. (a) **No scheduler:** a day counts as closed from its midnight Pacific, and the first leaderboard read after that settles its runs (D3's mechanism). (b) **A scheduled job** after each midnight, either Vercel Cron (calls a route; needs a secret and a schedule) or Supabase `pg_cron` (runs in the database; an extension to enable). Either one is a new mechanism and needs a source in SOURCES.md | (a) needs nothing new: since the final counts use only answers from before midnight, it doesn't matter when settling runs. (b) gives fixed-time writes, if something will need them (a daily notification, say). *The human to choose* | **(a)**, no scheduler (human, 2026-10-22: "Take Claude's suggestions for M09 D9 (one ledger row once the day closes), D10 (no scheduler: the day closes at midnight and the first leaderboard read settles it) and D11 (host bank as the common tier)") |
| D11 | **Where the expected popularity comes from in M09.** (a) **Flat:** every listed answer equally likely; no content change, but the provisional bonus is then the same for every answer to a question. (b) **The host bank as the "common" tier:** each day's content already has a host bank, the few most common answers, so those are "common" and the rest "uncommon"; no content change, and one more number (N5). (c) **A tier per entry** (common, uncommon, rare), set when drafting and approved on the admin page: content format 3, which is Hard to reverse, plus admin-page and drafting changes | (b) for M09: it gives a real provisional bonus from data that's already drafted and reviewed, with no format change. (c) can follow as its own ticket once the bonus has been seen in play; past days' picks (M03) can replace tiers later still | **(b)** (human, 2026-10-22: "Take Claude's suggestions for M09 D9 (one ledger row once the day closes), D10 (no scheduler: the day closes at midnight and the first leaderboard read settles it) and D11 (host bank as the common tier)"). Needs N5 |

## Source
- `docs/ROADMAP.md`: Product and the M09 row.
- The human's notes on the rarity bonus (2026-10-22), summarized above.
- `docs/DECISIONS.md`: Hard to reverse (Points ledger; Puzzle content format); Game 1 (Timer, Scoring, no spoilers); Row-level security in `private`; App database role; Config and tunables.
- `docs/milestones/M00-data-design.md`: §5 (runs, `run_status`), §6 (the ledger), §7 (append-only grants), §8 (the day boundary).
- `docs/milestones/M04-game-mechanics.md`, G1: the points ladder. `docs/milestones/M03-puzzle-insights.md`: pick counts.
- `docs/SOURCES.md`: PostgreSQL 17 (constraints, `INSERT … ON CONFLICT DO NOTHING`, transactions).
- If D10 is (b): a source for the scheduler, added to SOURCES.md by the human first.

## Acceptance criteria
*(They get exact values once N1–N5 are given.)*
- [ ] `private.points_ledger` exists as D9 says. pgTAP checks plor_app's exact grants (select, insert), that plor_app can't update or delete it, that a second row for the same run is refused, `bonus` between 0 and `points`, and the account cascade.
- [ ] The ladder part is right for each kind of run: caught on question 4 (150), survived (1000 before the bonus), ran out of time on question 3 (75, D2), and finished after midnight (D8).
- [ ] The final bonus matches a hand-worked example, from stored answers: a rare and a common answer on a day above the minimum (N4), and the same on a day below it, where only the expectation counts.
- [ ] The cap holds: a run caught on question k never gets a bonus of k's points or more, and a perfect run never exceeds N3. A test also checks the human's rule directly: across many simulated runs, every run that got further outranks every run that didn't.
- [ ] Answers recorded after the day's midnight don't change that day's final counts, and earn no bonus themselves (D8).
- [ ] The provisional bonus shows on the reveal and the result screen, from the expectation alone (D11).
- [ ] No row is written before the run is finished and its day closed (D9, D10), and settling again never adds a second row or changes one.
- [ ] Runs from before M09 get their rows with the bonus. Evidence: settling twice, where the second time writes 0 rows, and every row equals the recomputed score.
- [ ] The leaderboard shows the viewer and their friends only, ordered as D4 says, with each total equal to that player's ledger sum. Route tests use a friend, a non-friend and a friend of a friend.
- [ ] Signed out gets 401.
- [ ] The home page shows the leaderboard (D6), checked in the e2e test or a browser.

## Out of scope
- Group leaderboards (M10) and the home screen (M11).
- Weekly or daily leaderboards, streaks and badges.
- Daily percentiles and comparing games (M16).
- Per-entry tiers (content format 3) and expectations from past days' picks (D11: the host bank is the common tier for now).
- The look (M14).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Points per question: 25, 50, 75, 100, 150, 250, 350 | The ladder | Human, 2026-10-21 (M04 G1; `POINTS_PER_QUESTION`) |
| The day ends at midnight `America/Los_Angeles` | Which answers count toward a day's final counts; when a day closes (D10) | Human, 2026-10-17 (§8; `private.day_of`) |
| N1: how strongly the expectation weighs against a day's real counts (W, in players) | The blended share | **Blank: ask the human** |
| N2: the formula from an answer's blended share to bonus points, or the bonus per tier | Each answer's bonus | **Blank: ask the human** |
| N3: the bonus cap on a perfect run | The cap when no question was missed | **Blank: ask the human** |
| N4: the minimum number of players who answered a question before its real counts matter | The blended share | **Blank: ask the human** |
| N5 (only if D11 is (b)): the expected share of players who give a host-bank answer | Splitting the expectation between "common" and "uncommon" | **Blank: ask the human** |

## Plan
1. ~~The human answers D1–D7.~~ Done, 2026-10-22.
2. ~~The human answers D8–D11.~~ Done, 2026-10-22, and DECISIONS.md (Points ledger; Game 1: Scoring; Log) and §6 updated. The human gives N1–N5.
3. **9a, the ledger and scoring:** the table and grants (D7, D9), the ladder (D1, D2, D8), the rarity bonus and its cap, provisional and final (D11, N1–N5), and settling (D3, D10), with pgTAP and route tests first, including the hand-worked examples.
4. **9b, the leaderboard:** the route and the home-page section (D4–D6), route tests first, plus a browser or e2e check.
5. Each sub-ticket gets its own PR and a reviewer pass.

## Removes
- §6's planned `npm run ledger:backfill` script is never built, because settling does the backfill (D3).
- The ending answer writing the ledger row (§6, "When it's written"; D9).
- "1000 for a perfect run" as the maximum (DECISIONS.md, Game 1: Scoring; the comment on `POINTS_PER_QUESTION`).
- The 2026-10-21 rule that a run finished after midnight doesn't count (D1, D8).
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
