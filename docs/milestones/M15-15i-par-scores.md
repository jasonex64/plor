# M15 15i — Par scores on the boards

**Status:** in review. Approved by the human on 2026-11-15 ("Approve 15i"), built the same day on `m15-launch-readiness`; not merged, not on plor.app.

## Goal
The overall board and Fragments' own boards count a day as the player's points against a fixed par for that game, 0 to 100, in place of the % of that day's players beaten.

## Who uses it / what breaks without it
- Used by: every beta tester who looks at the Overall or Fragments board, on Today, the Friends tab and a group's page.
- Breaks without it: with a handful of testers a day's place is all or nothing. Of two players the lower gets 0 however close the scores were, and a player alone gets 100 (M16 16e, answers 25 and 26). The human, 2026-11-15: "it's going to feel like kind of disheartening if it's like you beat 0% of players and there's only 2 players".

## Source
No entry in `docs/SOURCES.md` covers how games are compared; the source is the human's answers below, which replace M16 16e's answers 2 (the percentile part), 15, 24, 25 and 27 (`docs/milestones/M16-16e-points-and-boards.md`).

## The human's answers (2026-11-15)
In their own words first:
- "if 2 players are actually very close to each other on the leaderboards, it'll feel close"; "a max day's points is like 1,500 … some sort of threshold, and you get some sort of score based off of that".
- "I just want whatever system we use to be able to scale if I add more games to the app, no matter how these sorts of games are scored or implemented. So I want something future-proof."
- "I care more about players being able to, I guess, feel like they're doing well in comparison to like the true accuracy … easiness to understand for players rather than trying to get the actual like pinpoint accurate."

Round 2:
1. The rule: "A fixed par per game instead" (over a share of the day's best score). Score ÷ par × 100, capped at 100, as the option said.
2. Whose best score sets 100: "Everyone who played". Nothing left to decide under a fixed par, as no other player's score enters.
3. Fragments' own board: "The same share-of-best score". **Claude's reading, to confirm:** the same new score as Overall, so against the par.
4. When: "Before the beta" (2026-11-17).

Round 3:
5. Offbeat's par: "shouldnt a "perfect" run also include some rarity bonuses as well? otherwise how we gonna differentiate from all the ppl surivivng all days". Then, told a perfect run is 1,000 and the bonus adds up to 500: "1,250: perfect plus half the bonus".
6. Fragments' par: "1,500".
7. Uneven pars: "You review after week one". Claude reports each game's real spread of scores after the beta's first week; the human picks new pars.
8. Past days when a par changes: "Rescore them with the new par".
9. The ticket: "Approve 15i".

## Design (Claude, for approval)
- **A day's score in a game** is `min(100, points ÷ par × 100)`, to one decimal (16e's answer 26, kept). Points are the day's ledger row, as now, so every midnight rule stays (16e answers 21, 35, 38).
- **The par is one number per game**, beside the game's other tunables (`src/config/tunables.ts`). A new game joins the overall board by naming its par; nothing else about how it scores matters. Nothing is stored: boards work the score out from the ledger on each read, so a changed par rescores every day (answer 8). No migration.
- **Where it shows:** the overall board's Sum and Average (friends, groups, Today's card, yesterday's card) and Fragments' own boards and graph. Offbeat's own board keeps raw points (16e, answer 18).
- **What stays:** Sum and Average and their switch; hiding a day's Offbeat part while the viewer's own run of it goes on (16e, answer 32); the result screen's "Better than X% of players so far today" from 10 players, and the friend rank, which are not board totals.
- **What changes for a player:** a day alone is no longer 100, and a day's leader no longer gets 100 for a weak run.
- **Words (Claude's, for the human to change):** under Fragments' board, "Each day adds your score out of 100. 1,500 points is a full 100." Under Overall's Sum, "Each day adds your score out of 100 in each game." Under Average, "Your average score out of 100, per game played."
- **For the human, a known unevenness:** Offbeat pays most of its points on the last two questions, so a run ending after five questions (400 points) is 32, while a Fragments run of the size the scoring was built around (1,060) is 70.7. Until week one's review (answer 7), Fragments days will likely add more than Offbeat days. *Unverified:* no real play data exists yet.
- **Protocol:** the routes' requests and responses keep their shape, so no bump. *Unverified until built.*
- **Security:** none; no new grant, table or route.
- **plor.app:** merging publishes it. Boards there show par scores from that moment, for past days too. No `db push`.

## Acceptance criteria
- [x] The score, its cap and its one decimal, by unit tests: 0, a score under par, par, over par.
- [x] The overall board's Sum and Average on hand-made weeks, by the route tests rewritten to par scores: two close players get close numbers, a lone player gets their own score and not 100.
- [x] Fragments' friends and group boards and yesterday's card add up par scores, by route tests.
- [x] The three notes read as approved, by e2e.
- [x] `docs/DESIGN.md` and DECISIONS' log say par scores.

## Out of scope
- Offbeat's own board (raw points, as now).
- The result screen's "Better than X%" line and friend rank.
- Retuning the pars (after week one, the human's).
- Keeping a past day's score when a par changes (answer 8).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 1,250 | Offbeat's par | Human, 2026-11-15, answer 5 |
| 1,500 | Fragments' par | Human, 2026-11-15, answer 6 |
| 100 | The cap | Human, 2026-11-15, answer 1 |
| One decimal | A day's score | Human, 2026-11-07, 16e answer 26 |

## Plan
1. The score function and the two pars, test first → verify: `npx vitest run src/game/percentile.test.ts` (or the file that replaces it) fails, then passes.
2. The boards read par scores (`src/friends/leaderboard.ts`) → verify: `npm run test:db -- -t "the overall board"`, `-t "yesterday's standings for each game"` and Fragments' board tests, with their expected numbers rewritten by hand first and failing.
3. The notes' words → verify: `npx playwright test e2e/overall-board.e2e.ts e2e/today-games.e2e.ts --retries=0`.
4. DESIGN.md, DECISIONS' log, this ticket's Status and ROADMAP's M15 row → verify: `git diff --stat` lists them.
5. The `reviewer` agent on the diff.

## Removes
- `places()` in `src/friends/leaderboard.ts`, with its read of every player's ledger rows of the day.
- `dayPercentiles`, `placeTotal` and `placeAverage` from `src/game/percentile.ts`, and their tests; the last two live on as `scoreTotal` and `scoreAverage` in `src/game/par.ts`. `percentile()` stays for the result screen.
- The three old notes under the boards.
- Not removed: a board read still settles every player's runs of the closed days, which only places needed. *Unverified* whether anything else relies on it, so it is in ROADMAP, Next revision, For M15.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Answer 3: "The same share-of-best score" for Fragments' board | The par score, as on Overall | Answer 1 chose the par over a share of the day's best; Claude's reading, put to the human with the draft and approved with it (answer 9) |
| Design: Fragments' note says "1,500 points is a full 100." | The number is read from `PAR_POINTS`, so the note follows a changed par | One place for the number (DECISIONS, Config and tunables) |
| Plan step 2: the tests' numbers rewritten first and seen to fail | The code changed first, then the numbers; the old numbers were not run against the new code | An order slip; the new numbers were worked out by hand before the run, and are in each test's header |

## Evidence
All on 2026-11-15, local stack, checkout `C:/Users/jason/RIFF-m15`.
- **The score:** `npx vitest run src/game/par.test.ts` before `par.ts` existed: 1 file failed, no tests (the import). After: `npx vitest run src/game/par.test.ts src/game/percentile.test.ts`, 2 files, 11 passed: 0, 50, 100 at par, 100 over it, 93.3 and 6.7 to one decimal.
- **The boards:** `npm run test:db -- -t "the overall board|game 2.s boards|yesterday.s standings for each game"`: 3 files passed, 15 tests passed. In them: A's 1,410 and G's 1,350 on Fragments are 94 and 90; B's day alone, 50 points, is 3.3 and not 100; C's 1,300 on Offbeat stops at 100; a group member counts from the day they joined.
- **The notes and the screens:** `npx playwright test e2e/overall-board.e2e.ts e2e/play2.e2e.ts -g "overall board shows|switches to game 2" --retries=0`: 2 passed. Overall on the Friends page and a group's: Sum, Y 100 then X 80; Average, X 80 then Y 33.3, each with its note; Fragments' note on the Friends board.
- **Today's card and the live boards:** `npx playwright test e2e/today-games.e2e.ts e2e/boards.e2e.ts --retries=0`, after the review: 9 passed.
- **Types and lint:** `npx tsc --noEmit -p .` and `npx eslint` on the five changed source files printed nothing.
- **Not run:** the full db and e2e suites (CI's); nobody has looked at the boards in a browser by hand.

## Review
The `reviewer` agent, 2026-11-15, on the staged diff, in a fresh context. It worked every rewritten number by hand and found them right, and found nothing else using what was removed.
- Blocking findings and how each was fixed: one, `docs/HANDOFF.md` didn't mention 15i. Fixed: the handoff is rewritten in this change.
- Deferred to ROADMAP "Next revision" (For M15): stale comments about places in `src/app/api/leaderboard/route.db.test.ts`, and the name `places` in `src/app/leaderboard.tsx`.
- Answered here: plan step 3's `e2e/today-games.e2e.ts` hadn't been run; it and `e2e/boards.e2e.ts` were run after the review (Evidence).
