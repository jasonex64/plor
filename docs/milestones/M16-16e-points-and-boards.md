# M16 16e — Points and boards for game 2

**Status:** in progress: approved ("Approve, build it", 2026-11-07). 16e-1, the score, is done (PR #164, merged on green CI, 2026-11-07); 16e-2, ledger rows, places and game 2's boards, is done (PR #165, merging on green CI at the human's "Merge when green"); 16e-3, the overall board, is next.

## Goal
Give a game 2 run its points, show each player where they stand that day, and add game 2's own boards and the overall board beside game 1's.

## Who uses it / what breaks without it
- Used by: every game 2 player, at the end of a run and on the friends and group boards. The overall board is used by anyone who plays either game.
- Breaks without it: game 2 has no points, so the beta can't compare players in it, and the shared account has no single ranking (answer 5 on the split, "Yes, keep the overall one").

## Source
- `docs/milestones/M16-game-2-substrings.md`, S7, S8, S9, S15, S16, S17, S19, "Comparing games (S9, S17)" and "Answers on the split" 4 and 5.
- `docs/DECISIONS.md`, Points ledger, Game 1 (Scoring), Game 2 (Tries; A run's day), and the Log rows for the friends board (M10 10a) and group boards (M12 12d).
- `docs/milestones/M16-16d-playing-it.md`: `round_word` holds each accepted word, which is what's scored.
- No outside source covers scoring: every number below is the human's or derived from their answers.

## The human's answers (2026-11-07)
Round 1, the long-term picture:
1. What the score rewards: "All three about equal". Longer words, many different letters across the run, and the bonus letter (S8) weigh about the same.
2. The overall board: "Show both". Each game's daily score becomes a percentile, and the board shows both the sum and the average of the games played.
3. Standing after a run: "Percentile and friend rank". "Better than 72% of players today", plus "2nd of 6 friends".
4. The weekly friends and group boards: "Per game, plus overall".

Round 2, how the score is built:
5. Length: "should exponentially go up".
6. Different letters: "bonus tracker as the whole run goes, at the end its cashed in per unique letter used and it should also exponentially go up".
7. A word using the bonus letter more than once: "Once per word".
8. Harder rounds: "Every round the same".

Round 3, the rates, after Claude measured the words (below):
9. Length rate: "kinda like 25 percent but round".
10. Different-letters rate: "15, but again round to nice numbers".
11. The bonus letter, which is in 68% of words for `e` and 1% for `j`: "Keep it as it is". The same bonus whatever the letter.
12. Who sizes the three parts: "Claude sizes, you approve".

Round 4, the sizes and the edges:
13. The sizes and worked runs below: "Approve these sizes".
14. A run left unfinished at midnight: "Count what it scored".
15. What a game 2 week adds up: "Daily percentiles", so an easy-letter day doesn't weigh more.
16. Players a day needs before "better than X%" shows: "10 players".

Round 5, the collisions:
17. A day under 10 players: "Day counts, line hidden". Its places count on the boards; only the line on the result screen is hidden.
18. Game 1's weekly boards: "Keep raw points".
19. When places show: "Live, final at midnight". At once as "so far today", settled at midnight.
20. During a run: "Word points and tracker". Each word's points right after it's accepted, and the letters used so far filling a tracker.

On the draft:
21. The overall board and today, after the collision below was put: "keep it consistent". **Claude's reading, confirmed** ("yes thats right"): every board counts a day from midnight, as game 1's do, game 2's own board included; the live "so far" numbers are the end of a run's "better than X%" and friend rank.
22. This ticket: "Approve, build it".

Before 16e-2:
23. Game 2's board beside game 1's: "A game switch on one board". One card with a switch, Game 1 / Game 2, and Overall in 16e-3.
24. A game 2 week's number: "Plain total, explained", with the line "Each day adds the % of players you beat."
25. A day only one player played: "100, top of the day".
26. A day's percentile: "One decimal", so 87.5 stays 87.5.

## What Claude measured (2026-11-07, local stack, 40,098 everyday words)
- Word length (letters alone): the middle is 8, 90% are 11 or fewer, the longest is 18.
- Different letters in 7 random everyday words of 5 to 8 letters, 500 runs: 13 at least, 16 at the 10th percentile, 18 in the middle, 20 at the 90th, 22 at most. With 9 to 12 letters the middle is 19, at most 24.
- Everyday words holding each letter: e 68%, i and s 54%, r 49%, a 48% … v 8%, w and k 7%, z, x and q 2%, j 1%.
These are random words, not real play: a real run's numbers come with the beta.

## Design (Claude, for approval)
**The score of a run** is three parts, all from `round_word` and the day's bonus letter, computed in one TypeScript function, as game 1's is (`src/game/scoring.ts`):
- **Words:** each accepted word scores by its length in letters alone (S19), 20 × 1.25^(length − 3), rounded (answers 5, 9).
- **Different letters:** at the end, the number of different letters across the run's words, n, scores 350 × 1.15^(n − 18), rounded, and 0 for a run with no word (answers 6, 10).
- **Bonus letter:** 120 for each word holding it, once per word (answers 7, 11).
- **Rounded** means two significant figures, and under 100 to the nearest 5, which gives the approved table (answer 13):

  | Word letters | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Points | 20 | 25 | 30 | 40 | 50 | 60 | 75 | 95 | 120 | 150 | 190 | 230 | 290 | 360 | 450 | 570 |

  | Different letters | 13 | 14 | 15 | 18 | 20 | 22 | 23 | 24 | 26 |
  |---|---|---|---|---|---|---|---|---|---|
  | Points | 170 | 200 | 230 | 350 | 460 | 610 | 700 | 810 | 1100 |

  The sizes 20, 350 and 120 are Claude's (answer 12), so that a typical run, taken as 7 words of 7 letters with 18 different letters and the bonus letter in 3 words, splits about a third each: 350 + 350 + 360 = 1060. Words over 18 letters (the dictionary's shortest is 3, `DICTIONARY_MIN_LETTERS`) and fewer than 13 different letters follow the same rule.
- Every round scores the same (answer 8), and a missed round scores nothing (S7).

**During a run** (answer 20): after an accepted word, its points, with the bonus letter's 120 when it holds it, and a tracker of the 26 letters, those used so far marked. At the end: the words' points, the different letters cashed in, the bonus letter, and the total.

**The ledger:** a game 2 run gets its one row like game 1's, once its day is closed, holding the total. A run left unfinished at midnight gets a row for what it scored (answer 14). Game 1's `bonus` column means its rarity bonus and nothing reads it back, so game 2 writes 0 there (Claude's reading).

**Where a player stands** (answers 3, 16, 17, 19):
- A day's percentile in a game is the share of that day's other players of that game the player beat, a tie counting as half ("Comparing games", Claude's proposal there). It's shown as "Better than X% of players today" only when the day has 10 players or more.
- Before midnight it's "so far today", among the runs finished so far, as a run still going would count low. From midnight it's final, among every run with a ledger row, so unfinished ones count (answer 14).
- Friend rank: "2nd of 6 friends", among the viewer and their friends who've played that day, so far or final in the same way.

**The boards** (answers 4, 15, 18):
- Game 1's friends board, group boards and yesterday's standings stay as they are, adding up raw points.
- Game 2 gets the same boards, each day counting as that day's percentile, 0 to 100, added up over the week, from that day's midnight (answer 21). A day under 10 players still counts (answer 17).
- The overall board, on the friends page and each group's, shows both views (answer 2): **Sum** adds each day's percentile in each game played, so playing both games counts; **Average** divides that by the number of game-days played.
- **For the human (a collision):** answer 19 asks for places live. Game 2's live places are cheap, as its score is final once a word is in. But game 1's points, including its rarity bonus, only become final at midnight, so the overall board would mix final and moving numbers. **Settled** (answer 21): every board, game 2's own included, counts a day from midnight on, like game 1's; the end of a run's "better than X%" and friend rank are the live "so far" numbers.

**16e-2 in detail** (Claude's readings of answers 14 to 26, for the human to overrule):
- **Ledger rows:** a board read first gives every game 2 run on a closed day its row, every player's, not only the board's, as a percentile needs the whole day. A game 2 day never hides from a board while the viewer's run goes on, as game 1's does, since a game 2 run stops at midnight.
- **The percentile:** (others beaten + half the others tied) ÷ others, to one decimal (answer 26), and 100 with no others (answer 25). On a board it uses every row of that day, whoever's board it is.
- **The end of a run:** "Better than 87.5% of players so far today" among the runs finished so far, shown from 10 of them (answer 16); and "2nd of 6 with your friends so far today", the viewer and their friends who've finished, shown once a friend has.
- **The routes:** the friends and group boards take `game`, `offbeat` or `substrings`, which they need, so one way asks for each; a request without it is refused, and the protocol goes from 6 to 7, as the request changed (DECISIONS.md, Network messages). Today's card stays game 1's (16f).

**Security:** none expected. `plor_app` already reads `round_word` and reads and inserts ledger rows (DECISIONS.md, Log, 2026-10-22 and 2026-11-07), and a percentile reads the day's rows, as a board already does. *Unverified until built:* if a query needs more, it goes to the human first.

**PRs:**
- **16e-1, the score:** the scoring function and its tests on hand-worked runs, the tunables, and the word points, tracker and end score on `/play2`.
- **16e-2, places and game 2's boards:** game 2's ledger rows, the percentile and friend rank at the end of a run, and game 2's friends and group boards. The ledger rows moved here from 16e-1 on building it, as their first reader is a board ("Build for today").
- **16e-3, the overall board:** both views on the friends page and each group's.

## Acceptance criteria
16e-1:
- [ ] The score of each worked run in "Numbers" comes out exactly, by unit tests, and so does every cell of both tables above.
- [ ] A word's points and the bonus letter's 120 show right after it's accepted, and the tracker marks its letters, by e2e.
- [ ] The end of a run shows its three parts and total, by e2e, and they match the scoring function's.
- [ ] Game 1's scoring and screens don't change: their tests pass unchanged.

16e-2:
- [ ] A finished run and one left unfinished at midnight each get one ledger row with their total once the day is closed, and settling again writes nothing, by db tests.
- [ ] The percentile and its tie rule on hand-made days, live and final, by db tests: under 10 players the line is hidden, at 10 it shows.
- [ ] Friend rank counts only the viewer and their friends who played that day, by route tests.
- [ ] Game 2's friends and group boards add up daily percentiles, a group's from the day each member joined, by route tests.
- [ ] A player sees nothing about another player's run beyond what the boards show, by route tests.

16e-3:
- [ ] Both overall views on hand-made weeks, by route tests: sum, average, a player who played one game, and a group member who joined mid-week.
- [ ] Both views show on the friends page and a group's page, by e2e.

## Out of scope
- Today with two games, the shared streak, comments, the mixed feed, Me, the live board and Share: 16f.
- "Better than X%" on game 1's screens: game 1's screens are M14's `/play` build, and 16f brings the games together.
- Moonbrew's look for game 2: 16g.
- Tuning the sizes from real runs: after the beta, if the human asks.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 20 × 1.25^(length − 3) | Word points | Rate: human, answer 9 ("kinda like 25 percent but round"). Size 20: Claude, answer 12, approved in answer 13 |
| 350 × 1.15^(n − 18) | Different letters | Rate: human, answer 10. Size 350 at 18: Claude, answer 12, approved in answer 13 |
| 120 a word | Bonus letter | Claude, answer 12, approved in answer 13 |
| Two significant figures, under 100 to the nearest 5 | Rounding | Claude's reading of "round" and "nice numbers" (answers 9, 10); its table was approved (answer 13) |
| 18 different letters, 7 letters a word, 3 bonus words | The typical run the sizes balance | Claude, from the measurements above; not real play |
| 10 players | Before "better than X%" shows | Human, answer 16 |
| A tie counts as half | The percentile | Claude's proposal in "Comparing games", for approval here |
| Worked runs: typical 7×7, 18, 3 = 1060; short 7×5, 15, 2 = 680; long 7×10, 20, 3 = 1485; wide 7×7, 23, 3 = 1410; an `e` day with the bonus in all 7 = 1540; a `j` day with none = 700; two misses, 5×7, 14, 1 = 570 | The scoring tests | Approved, answer 13 |

## Plan
1. 16e-1, then 16e-2, then 16e-3, one PR each, each merged before the next starts.
2. Each PR updates this ticket's Status, the M16 ticket's status line and the ROADMAP row.

## Removes
Nothing in 16e-1: game 2 had no points. 16e-2 removes the weekly boards' one meaning, game 1 alone, and protocol 6: a board names its game. Game 1's boards are kept by answer 18. 16e-3 lists its own.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| "Live, final at midnight" for places (answer 19) | The boards count a day from midnight; only the end of a run is "so far" | Answer 21, "keep it consistent", confirmed ("yes thats right") |
| 16e-1 writes game 2's ledger rows | 16e-2 does | Their first reader is a board ("Build for today"), noted under Design |
| The tables stop at 18 letters and start at 13 different letters | The rule scores longer words and every count down to 1 | The full dictionary holds words over 18 letters, and a run can use fewer than 13 letters; the rule the tables came from covers them |

## Evidence
### 16e-2
- **Places:** `npx vitest run src/game/percentile.test.ts`, 6 passed: the share beaten, a tie as half, one decimal, 100 alone, a day's places, a week's total. Written beside the function, not before; then broken on purpose and seen to fail: a tie counted as a win (2 failed), 0 for a lone player (1 failed).
- **Ledger rows and the end of a run:** `npx vitest run src/game/substring-places.db.test.ts --no-file-parallelism`, 3 passed: a closed day's finished run (420) and unfinished one (65) get one row each, settling again writes none, today's waits; the standing is hidden at 9 finished and 50 at 10, with a tie and an unfinished run that doesn't count, and a friend rank only once a friend has finished.
- **Boards:** `npx vitest run src/app/api/leaderboard src/app/api/groups/leaderboard --no-file-parallelism`, 28 passed. The new `substrings.db.test.ts`: a board without a game, or `chess`, is refused with `unknown_game`; game 2's friends board shows B 66.7 and A 33.3, places among four players yesterday, two of them strangers whose runs were settled too; a group member who joined today counts 0; game 1's board stays at 0. Game 1's own board tests now name `game=offbeat`.
- **Screens:** `npx playwright test e2e/play2.e2e.ts e2e/player-screens.e2e.ts e2e/leaderboard-graph.e2e.ts e2e/today.e2e.ts --retries=0`, 22 passed, with the Friends board's switch to game 2, its note, and a total that isn't in points. `player-screens.e2e.ts`'s held route now matches the board's query.
- **Review's blockers** (below): `npx vitest run src/app/ordinal.test.ts`, 13 passed (1st, 2nd, 3rd, 11th to 13th, 21st, 111th, 112th); `npx vitest run src/app/api/substrings src/app/api/leaderboard/substrings.db.test.ts --no-file-parallelism`, 27 passed, with `standing` null mid-run, no friend rank before a friend finishes, then 1st and 2nd of 2 for both players at the route, and a board response holding only the circle's names, places and days; `npx playwright test e2e/play2.e2e.ts --retries=0`, 6 passed, with "1st of 2 with your friends so far today." on screen.
- **Game 1's wider e2e:** `npx playwright test e2e/groups.e2e.ts e2e/live-board.e2e.ts e2e/jumps-and-finds.e2e.ts e2e/me.e2e.ts e2e/shell.e2e.ts e2e/offbeat.e2e.ts e2e/approve-and-play.e2e.ts --retries=0`: 30 passed, 1 failed, `live-board.e2e.ts`'s "a reconnect refetches the board", waiting for the reconnect's request; run alone, `--repeat-each=2`, 2 passed. 16e-2 doesn't touch the live board.
- `npm test`, `npx tsc --noEmit -p .`, `npx eslint src e2e`, `npm run build` and `check:client-bundle` pass.

### 16e-1
- **Scoring,** written before the function: `npx vitest run src/game/substring-scoring.test.ts` failed (`Cannot find module './substring-scoring'`), then 12 passed: both tables cell by cell, the seven worked runs, a run with no word, and a word holding the bonus letter three times.
- **Routes:** `npx vitest run src/app/api/substrings --no-file-parallelism`, 21 passed. A route test compared rounds exactly and failed on the new fields, as expected; it now checks a word's points, the bonus letter's 120 (`aqmjb`), and the end score, 70 + 120 + 65 = 255 for six letters.
- **Screen:** `npx playwright test e2e/play2.e2e.ts --retries=0`, 5 passed: the tracker's count from 0 to 6, "You played aqmjb: 30 points, and 120 for the bonus letter.", and the end score's four numbers. The first two runs each had a failure in a step this change doesn't touch (sign-in's email poll, the lockout, a 30 s timeout on Today), with every test taking about twice as long as earlier; each passed when run again, alone or in full.
- **Game 1 unchanged:** `npx playwright test e2e/play2.e2e.ts e2e/offbeat.e2e.ts e2e/approve-and-play.e2e.ts e2e/shell.e2e.ts --retries=0`: 19 passed, 2 failed in `shell.e2e.ts` waiting on a first visit to `/admin/puzzles` and a group's page; `npx playwright test e2e/shell.e2e.ts --retries=0` then passed 10 of 10.
- **Review's two blockers** (below): `npx vitest run src/app/api/substrings --no-file-parallelism`, 21 passed, and `npx playwright test e2e/play2.e2e.ts --retries=0`, 5 passed. Each check was then broken on purpose and failed: the word's points read from its spelling (1 failed), the bonus letter read from its spelling (1 failed), and every letter marked (`e2e/play2.e2e.ts:113`).
- `npm test`: 615 passed. `npm run build` lists `/play2`, `check:client-bundle` is OK, and `npx tsc --noEmit -p .` and `npx eslint` are clean.

## Review
- Blocking findings and how each was fixed (16e-1, the `reviewer` agent, 2026-11-07):
  1. The e2e checked the tracker's count, not which letters it marks: it now checks the marked letters after each word.
  2. No test proved a word scores by its letters alone, as every test word's spelling was its key: a route test word is now spelled `aqm-ǰb`, with a hyphen and a j with a caron, and scores 30 with the bonus letter's 120.
- 16e-2, the `reviewer` agent, 2026-11-07: (1) friend rank and "nothing beyond the boards" were tested only below the routes: route tests now check `standing` and the board response's fields; (2) the end of a run's standing text and its 1st/2nd/12th had no test: `src/app/ordinal.ts` has its own, and the e2e shows a friend rank. It found the places, privacy and game 1's boards correct. Deferred to ROADMAP, For M16: cost at scale, a midnight window, the docs on what a board reads, three untested ties and sums, points wording in Graph, a DESIGN citation, and a test that needs yesterday free.
- Deferred to ROADMAP "Next revision" (For M16): 1 and 2 different letters scoring the same, a stale header comment, the tracker's letters for a screen reader, and a mid-run total that already holds the different letters.
- The reviewer found the formula reproduces both tables and every worked run, nothing leaking before its time, and game 1 untouched.
