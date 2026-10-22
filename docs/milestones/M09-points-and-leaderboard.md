# M09 — Points and friends leaderboard

**Status:** in review: every decision answered (D1–D11) and every number given (N1–N5), human, 2026-10-22. 9a, the ledger and scoring, is merged (PR #45, 2026-10-22); 9b, the leaderboard, is in review (its PR), the milestone's last.

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
- **The numbers, put together** (N1–N5, human, 2026-10-22), for one question on one day:
  - expected share *e*: a host-bank answer gets 50% ÷ (answers in the host bank); any other listed answer gets 50% ÷ (the other listed answers). When every listed answer is in the host bank (a 12-sign zodiac, say), each gets 1 ÷ (listed answers), since there's no "other" group to share the rest. *That last rule is Claude's reading; no number is involved*;
  - blended share *s* = (10 × *e* + *c*) ÷ (10 + *n*) once *n* ≥ 5, otherwise *s* = *e*;
  - the answer's bonus = the question's points × 0.5 × (1 − *s* ÷ 20%), never below 0, rounded down;
  - the run's bonus is the sum, cut to one less than the first missed question's points, and to 500 for a perfect run. With "up to half", the sum never goes past either cap, so getting further always wins without any cutting. The caps stay as a guard in case the numbers change;
  - *worked example:* question 1, "Name an animal", is worth 25 with 6 host-bank animals and 220 others. "dog" (host bank) is provisionally +7 (*e* ≈ 8.3%), "axolotl" +12 (*e* ≈ 0.23%). After a day where 20 players answered, 8 of them dog and 1 axolotl: dog *s* ≈ 29%, so +0; axolotl *s* ≈ 3.4%, so +10.
- **Changing the numbers later:** they live in `src/config/tunables.ts` with their origin, like every tunable (DECISIONS.md, Config and tunables), so a change is one edit and a deploy. The ledger is append-only, so rows already written keep the bonus they got; days settled after the change use the new numbers. Re-scoring past days would be a decision of its own.
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
| D5 | **Today's points before you've finished today** | Left out of everyone's totals until your own run today is over, then included. Otherwise a friend's total going up by 150 says they were caught on question 4 (DECISIONS.md, Game 1: no spoilers). The live board already shows "on question 3" then "finished" (ROADMAP "Next revision" has that for you), so you may prefer to include them | **As suggested** (human, 2026-10-22: "otherwise the rest of the suggestions seem fine"). Under D9 (a) today's points can't reach the leaderboard before the day closes; a closed day the viewer is still playing needed one more rule (Source diff, 9b review) |
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
- [x] **9a** `private.points_ledger` exists as D9 says. pgTAP checks plor_app's exact grants (select, insert), that plor_app can't update or delete it, that a second row for the same run is refused, `bonus` between 0 and `points`, and the account cascade.
- [x] **9a** The ladder part is right for each kind of run: caught on question 4 (150), survived (1000 before the bonus), ran out of time on question 3 (75, D2), and finished after midnight (D8).
- [x] **9a** The final bonus matches a hand-worked example, from stored answers: a rare and a common answer on a day above the minimum (N4), and the same on a day below it, where only the expectation counts.
- [x] **9a** The cap holds: a run caught on question k never gets a bonus of k's points or more, and a perfect run never exceeds N3. A test also checks the human's rule directly: across many simulated runs, every run that got further outranks every run that didn't.
- [x] **9a** Answers recorded after the day's midnight don't change that day's final counts, and earn no bonus themselves (D8).
- [x] **9a** The provisional bonus shows on the reveal and the result screen, from the expectation alone (D11).
- [x] **9a** No row is written before the run is finished and its day closed (D9, D10), and settling again never adds a second row or changes one.
- [x] Runs from before M09 get their rows with the bonus. Evidence: settling twice, where the second time writes 0 rows, and every row equals the recomputed score. (**9a**: settling, shown on two fixture days; **9b**: the leaderboard settles the players it shows, shown with real players' runs from yesterday.)
- [x] **9b** The leaderboard shows the viewer and their friends only, ordered as D4 says, with each total equal to that player's ledger sum. Route tests use a friend, a non-friend and a friend of a friend.
- [x] **9b** Signed out gets 401.
- [x] **9b** The home page shows the leaderboard (D6), checked in the e2e test or a browser.

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
| N1: how strongly the expectation weighs against a day's real counts (W, in players) | The blended share | **10 players** (human, 2026-10-22: "yeah common answers can still earn something otherwise it's fine", taking Claude's suggested numbers with the zero line moved from 10% to 20%) |
| N2: the formula from an answer's blended share to bonus points | Each answer's bonus | **Up to half the question's points, shrinking to 0 at a 20% share**: bonus = question's points × 0.5 × (1 − share ÷ 20%), never below 0, rounded down (human, 2026-10-22: "yeah common answers can still earn something otherwise it's fine", taking Claude's suggested numbers with the zero line moved from 10% to 20%) |
| N3: the bonus cap on a perfect run | The cap when no question was missed | **500** (half of 1000, which N2 gives anyway) (human, 2026-10-22: "yeah common answers can still earn something otherwise it's fine", taking Claude's suggested numbers with the zero line moved from 10% to 20%) |
| N4: the minimum number of players who answered a question before its real counts matter | The blended share | **5 players**, the same as the insights report's "too few" (`INSIGHTS_MIN_PLAYERS`, M03) (human, 2026-10-22: "yeah common answers can still earn something otherwise it's fine", taking Claude's suggested numbers with the zero line moved from 10% to 20%) |
| N5: the expected share of players who give a host-bank answer | Splitting the expectation between "common" and "uncommon" (D11) | **50%**, the middle of the M02 survey's measured 14% to 86% on open questions (`M02-2g-survey.md`, finding 4) (human, 2026-10-22: "yeah common answers can still earn something otherwise it's fine", taking Claude's suggested numbers with the zero line moved from 10% to 20%) |

## Plan
1. ~~The human answers D1–D7.~~ Done, 2026-10-22.
2. ~~The human answers D8–D11 and gives N1–N5.~~ Done, 2026-10-22, and DECISIONS.md (Points ledger; Game 1: Scoring; Log) and §6 updated.
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
| §6: `user_id uuid → auth.users on delete cascade` | A foreign key to the player's run that day, `(user_id, game_id, puzzle_date) → private.run`, cascading | **9a.** Stricter: a ledger row can only exist for a real run. The account cascade still holds, through the run (pgTAP) |
| D3, D9, D10: the leaderboard settles the players it shows | `settleRuns` exists and is tested in 9a; its caller, the leaderboard route, is 9b | **9a.** The ticket's plan splits the ledger (9a) from the leaderboard (9b); until 9b, no request writes ledger rows |
| "A day closes at its midnight Pacific" (D10) | A day is closed when `puzzle_date < private.today()`; an answer counts toward its day when `private.day_of(created_at) = puzzle_date` | **9a.** Both use the one definition of the day (§8), so settling and counting agree with the reset |
| The provisional bonus is shown "right away" | The reveal says "rarity bonus +N (estimate)", and the result screen "plus a rarity bonus of about N. The final bonus is worked out once the day is over." Each safe answer in the result list shows its bonus too. A bonus of 0 is shown as +0 | **9a.** The ticket doesn't say how; the look is M14. Showing +0 tells the player their answer was a common one |
| D4: "ties alphabetically by name" | By name with `localeCompare`, then by username, so two friends with the same display name keep a stable order | **9b.** Display names needn't be unique (M07 7a) |
| D6: a plain section on the home page | "Friends leaderboard", under "Friends today": each player's name, "(you)" for the viewer, and their all-time points, with the note "A day's points count once that day is over." It loads once when the page opens | **9b.** Points change only when a day closes (D9), so nothing on the page can change them while it's open |
| D5: today's points stay out until your run today is over | A closed day's points stay out of every total, the viewer's included, while the viewer's own run that day is still in progress | **9b review.** A run can be finished after midnight (DECISIONS.md, Game 1: Timer), so a closed day can still be in play for the viewer, and a friend's total going up would show how far the friend got. The same rule as M08 8a's past-day thread; D5's purpose, applied to the case its wording ("today") didn't name |
| D3: "before the leaderboard is computed, rows are written for the shown players' runs that can no longer change" | Each leaderboard read calls `settleRuns` for the viewer and their friends, inside the request | **9b.** As decided. A friend's finished runs on closed days are settled by whoever's leaderboard shows them first |
| Tests (DECISIONS.md, Test runner) | `src/game/ledger.db.test.ts` builds a closed past day in a rolled-back transaction, as the local superuser, with the answer triggers switched off (`session_replication_role`) only while inserting it, then settles as plor_app with them on | **9a.** A closed day's answers need times in the past, which the triggers refuse by design. The thing under test (settling) runs with every trigger and grant in force |

## Evidence
**9a** (local stack, 2026-10-22):
- `npm run test:sql`: `points_ledger.test.sql .... ok`, `plor_app_role.test.sql .... ok`, `Files=12, Tests=172`, `Result: PASS`.
  - The first file checks a row with its total and bonus, one row per run (23505), a row needs its run (23503), points and bonus never negative and the bonus never more than the total (23514), plor_app can't update, delete or truncate, and the account cascade.
  - The second lists `private.points_ledger insert, select` among plor_app's exact grants. Both failed before the migration (the table missing; the grants list).
- `npx vitest run src/game/scoring.test.ts`: `Tests  12 passed (12)`. It checks, by hand-worked numbers:
  - expected shares: dog 1/12, aardvark 0.5/220, a zodiac sign 1/12 (every sign in the host bank);
  - the blend: the expectation alone below 5 answers; (10 × 1/12 + 8) / 30 = 29.4% for dog after 20;
  - the ticket's example: dog +7 then +0, aardvark +12, a single answer's final +10; half the points at a share of 0, nothing at 20% or more;
  - the cap: 99 after 3 survived, 24 after none, 500 for a perfect run, and a sum over the cap is cut;
  - the human's rule for every k from 0 to 7: the most a run surviving k can earn stays under the cap, and under the least a run surviving k + 1 earns;
  - a run's score with no counts, with an answer after midnight (ladder yes, bonus no), and with counts on one question and too few on another.
- `npm run test:db`: `Tests  123 passed (123)`. `src/game/ledger.db.test.ts` builds a closed day (2001-02-03) with 20 players on question 1 (8 dog, one each of 4 other animals and 8 more) and settles six players as plor_app:
  - A, caught on question 4: **185** (ladder 150, bonus 35: dog 0 at a 29.4% share, california 14 and watch-a-movie 21 from the expectation, since only 4 and 2 players answered those);
  - C, out of time on question 3: **99** (75, bonus 24: aardvark 10 at a 3.41% share, ohio 14);
  - E, started at 23:59:40 and finished after midnight: **85** (75, bonus 10: alpaca before midnight 10, florida after it 0). E's late florida also stays out of question 2's count: counting it would make 5 answers there, and A's california would earn 9, not 14;
  - B, perfect: ladder 1000 plus a bonus;
  - D, waiting at a reveal: no row; F, caught today: no row;
  - A's second closed day (2001-02-05), where only A answered dog: **32** (25, bonus 7 from the expectation, as fewer than 5 answered). Scoring every run with one day's counts, on purpose, made this test fail; restored, it passed (9a review);
  - 5 rows written, then 0 on a second settle, with the rows unchanged. A player with no runs, or none at all: 0.
  - `src/game/runs.db.test.ts` now expects the run state's `bonus` (0 before starting; the expected-share bonus after a safe answer).
- `npm test`: `Tests  204 passed (204)`.
- `npm run test:e2e`: `3 passed (24.8s)`. The watcher, caught on question 1, sees "You survived 0 of 7 questions and scored 0 points, plus a rarity bonus of about 0.". A new test gives a safe answer to today's question 1 and sees the reveal line "+25 points, rarity bonus +N (estimate) · 25 points so far" (9a review).
- `npm run lint`: no problems. `npx tsc --noEmit`: no errors. `npm run build`: `✓ Compiled successfully`. `npm run check:client-bundle`: `CLIENT BUNDLE OK: 67 files, 5 patterns, 3 env values`.

**9b** (local stack, 2026-10-22):
- `npm run test:db`: `Tests  129 passed (129)`. `src/app/api/leaderboard/route.db.test.ts` signs in five real players (A; B and E, A's friends; C, no one's friend; D, B's friend only). Their runs from yesterday are written directly and answered today, so they earn no bonus (D8) and each total is its ladder: A 25, B 75, C 25, E 25; D didn't play. It checks:
  - before A's leaderboard is read, A, B and E have no ledger rows; reading it returns B 75, A 25 (you), E 25: highest first, and A before E in their tie by name;
  - reading it settled exactly A's, B's and E's runs (3 rows); C, not shown, has none; A's run today (one safe answer, 25 so far, still going) adds nothing (D9);
  - reading it again returns the same and writes nothing;
  - B sees B 75 (you), A 25, D 0: their own friends, and a friend with no points shows 0;
  - D, waiting at a reveal in yesterday's run, sees B 0 and D 0: yesterday stays out while D's run that day is going; once D is caught on question 2, B 75 and D 25 (9b review; it failed first, showing B 75);
  - with A's display name set to "Zed", A shows as Zed and moves after E in the tie.
- `npm test`: `Tests  205 passed (205)`, with `src/app/api/leaderboard/route.test.ts` (401 signed out).
- `npm run test:e2e`: `3 passed (26.2s)`. After both players are caught today, the watcher's "Friends leaderboard" lists the player then the watcher, both "0 points" (tied, by name).
- `npm run test:sql`: `Files=12, Tests=172`, `Result: PASS`. `npm run lint`: no problems. `npx tsc --noEmit`: no errors. `npm run build`: `✓ Compiled successfully`, with `ƒ /api/leaderboard`. `npm run check:client-bundle`: `CLIENT BUNDLE OK: 67 files, 5 patterns, 3 env values`.

## Review
**9a** (the `reviewer` agent, fresh context, 2026-10-22; it recomputed every hand-worked number and re-ran the checks):
- Blocking findings and how each was fixed:
  - **Settling across more than one closed day was untested,** though one settle must handle every past day a player has (the backfill). A's second day is in the test now, and scoring with the wrong day's counts was shown to fail it.
  - **The reveal's bonus line was ticked without evidence.** A new e2e test shows it after a safe answer.
- It found the formula, the numbers' origins, settling's rules, the migration and grants, the provisional wiring and the test approach correct.
- Deferred to ROADMAP "Next revision" (From M09): a weak `select, insert` privilege check in pgTAP, the perfect run's bonus not pinned, the "many simulated runs" wording, §6's text drifting from the built table, an answer committed just after midnight missing an early settle, and the result line's wording for a bonus of 0 or a late run.

**9b** (the `reviewer` agent, fresh context, 2026-10-22; it re-ran every check):
- Blocking finding and its fix:
  - **A closed day's points reached a viewer still playing that day's run** (started before midnight, or left at a reveal), so a friend's total showed how far the friend got. Fixed in `getLeaderboard`: those days stay out of every total until the viewer's run that day is over. A new route test failed first, then passed. It's recorded in the Source diff as D5's purpose applied to a case its wording didn't name.
- It found who's shown, the totals, the order, settling exactly the shown players, the route's 401 and the yesterday fixtures correct.
- Deferred to ROADMAP "Next revision" (From M09): a third copy of the viewer-and-friends query, two test gaps (a friend of a friend's runs never settled; totals checked against the ladder, not read from the ledger), the e2e only showing 0 points, settling IDs without a profile, and no test running the whole leaderboard read as plor_app.

