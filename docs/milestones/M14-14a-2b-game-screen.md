# M14 14a-2b — Offbeat's game screen

**Status:** draft for the human's approval (2026-10-25), from the guided answers below. It includes a **security change** (yesterday's host answers shown to every signed-in player), which needs the human's explicit approval.

## Goal
Offbeat gets its own page, `/offbeat`: the day's rules before Start, the run itself and its result, how to play, the player's Offbeat stats, yesterday's answers, and Offbeat's comments. Today's Play opens it.

## Who uses it / what breaks without it
- **Used by:** every player, on every day they play: Play on Today now leads here (L25).
- **Breaks without it:** the run plays inline on Today (14a-2a's stop-gap), nothing states the stakes before the timer starts (the critique's P1), there's no How to play anywhere (the critique's heuristic 10 scored 1–2), and the stats and yesterday's answers the human chose (L35, L34) don't exist.

## What the human decided
Guided questions, 2026-10-25:
| Subject | Answer |
|---|---|
| Where the run plays | "On /offbeat (Recommended)": Start begins the questions there, and the result stays there; Today shows the banner and links in |
| "Average survived" | "Every finished run (Recommended)" |
| Days not played in the 7-day chart | "A gap with a dash (Recommended)", unlike a bar of 0 for a run caught on question 1 |
| Yesterday's answers | "The Wind's answers, plus yours if you played (Recommended)" |
| The reveal's risk (a category returns after 30+ days, its host answers drawn from its host bank) | "Yes, show them (Recommended)" |
| How to play | "Yes, in 14a-2b (Recommended)", moved from 14a-3 |
| Today's Result link | "/offbeat#result (Recommended)"; the clock bar's Result too |

Earlier decisions this builds: L25 (Play opens a separate game screen with How to play, the player's stats, yesterday's answers and the game's comments), L29 (How to play friendlier and told through the ridge and the Wind; round 3's wording, provisional per L32), L34 ("Yes, once the day is closed": every signed-in player sees a closed day's host answers; a security change), L35 ("Streak for this game, Best score, Average questions survived, Last 7 days chart"), and the best score: "Points plus the final bonus (Recommended)" (14a-2a's questions). The rules line above Start is round 5's ("7 questions · 20 seconds each…"), from the critique's P1.

## The security change, for the human's approval
- **What changes:** a new route, `GET /api/offbeat`, returns, to any signed-in player, yesterday's 7 questions with their host answers (names), as yesterday's approved puzzle holds them. Today, a player sees a question's host answers only after answering it in their own run.
- **Why it's safe enough:** only a **closed** day (before `private.today()`), which can't be played any more (DECISIONS.md, Day boundary); the human accepted the residual risk of a category returning (above). Nothing about today's puzzle is sent before the player answers, as now.
- **What doesn't change:** no grant, role or RLS change is expected. `plor_app` already has SELECT on `private.puzzle`, `private.run` and `private.run_event` (migration `20261019074108`), SELECT and INSERT on `private.points_ledger` (`20261022105344`), and EXECUTE on `private.thing_names` (`20261024213853`), each with a `using (true)` policy. The route reads with those. *Unverified* until the route is built and its db test passes as `plor_app`.
- **Recorded:** in DECISIONS.md's Log, with the human's words, when built.

## Source
- Next.js 16.4.2 bundled docs (SOURCES.md): route handlers and data security (`02-guides/data-security.md`), layouts and pages, CSS.
- WCAG 2.2 (SOURCES.md): 1.1.1 and 1.3.1 (the chart's values as text), 1.4.3, 2.2.1 (the 20 seconds, stated before Start), 4.1.2.
- DECISIONS.md: Game 1 (7 questions, 20 seconds, points 25 to 350, the rarity bonus final at the day's close, M09 D9), Day boundary, Points ledger.
- The approved mockups (rounds 3, 5 and 6) and the M14 ticket's decisions.

## Acceptance criteria
1. **The page.** `/offbeat`, signed in, shows Offbeat's banner with the day, the rules line ("7 questions · 20 seconds each. Give an answer the Wind didn't think of. Each question you survive is worth more: 25 points up to 350."), **Start** and **How to play**. Today's Play is a link to `/offbeat`. Checked in `e2e/offbeat.e2e.ts`.
2. **The run plays there.** Start begins question 1 on `/offbeat`; the reveal, Next and the result happen there; the result's details are at `/offbeat#result`. Today's banner after playing and the clock bar's Result link to `/offbeat#result`. The moved e2e suites play on `/offbeat`. Checked in `e2e/offbeat.e2e.ts` and the existing suites.
3. **How to play.** How to play opens `/offbeat/how-to-play`, with round 3's wording and Start. Checked in `e2e/offbeat.e2e.ts`.
4. **Your Offbeat.** The streak, the best score (points plus the final bonus, over days already closed), the average questions survived over every finished run, and a 7-day chart (today and the 6 days before) with each day's questions survived, a dash for a day not played, and the values as text for screen readers. Checked by a db route test with hand-worked numbers, and on the page in `e2e/offbeat.e2e.ts`.
5. **Yesterday's answers.** Each of yesterday's questions with the Wind's answers, and, for a player who played it, their answer and safe or caught. None for a day with no puzzle. Nothing from today's puzzle is in the route's answer. Checked by a db route test (a player who played yesterday, one who didn't, and today's puzzle absent) and in `e2e/offbeat.e2e.ts`.
6. **Offbeat's comments.** The feed, as on Today (locked until played), on the game screen: below on phones, in a right column from 1200px. Checked in `e2e/offbeat.e2e.ts`.
7. **Desktop and reflow.** From 1200px the comments sit in a right column; no sideways scroll at 320px. Checked in `e2e/offbeat.e2e.ts`.
8. `npm run lint`, `npx tsc --noEmit -p .`, `npm test`, `npm run test:db`, `npm run build`, `npm run test:e2e` and CI pass, and the security change is in DECISIONS.md's Log.

## Out of scope
- The game's own look and motion (14c): the banner stays the plain block; the result stays as it is, below.
- The "Skip the game screen" setting (L39), with settings (14a-3).
- Stats across games and a stats page (14a-3's Me tab).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 7 days, today included | The chart | L35 ("Last 7 days chart") |
| Yesterday only | The revealed answers | L34, L25 ("Yesterday's answers") |
| 7 questions, 20 seconds, 25 to 350 points | The rules line and How to play | DECISIONS.md, Game 1 |
| The page's sizes | Layout | The approved mockups (rounds 3, 5 and 6), as 14a-2a's |

## Plan
1. Tests first: the db route test for `GET /api/offbeat` (stats with hand-worked numbers; yesterday's answers for a player who played and one who didn't; no today) and `e2e/offbeat.e2e.ts` fail.
2. `GET /api/offbeat`: the stats from the player's runs and the points ledger, and yesterday's answers from yesterday's approved puzzle, `thing_names` and the player's own events.
3. `/offbeat` and `/offbeat/how-to-play` pages through `Home`'s views; the game component moves there from Today; Today's banner becomes links.
4. The moved e2e suites play on `/offbeat`.
5. The security change in DECISIONS.md's Log, the reviewer, the fixes, the evidence, the PR.

**Hypothesis for step 2:** the best score can come from the points ledger, once the route settles the player's closed runs with `settleRuns` (`src/game/ledger.ts`), as the leaderboard reads do. A day's row is written only when its day has closed, with its final bonus, and settling is lazy: it happens on the first read after the close, with no scheduler (DECISIONS.md, Points ledger). So today's run never counts before its day closes. What would disprove it: after settling, a closed day the player finished still has no ledger row, so that day would be missing from "best".

## Removes
- Playing on Today: the game component leaves Today; the banner keeps the score line and links.
- Today's Result anchor (`#result` on `/`): the clock bar's and the banner's Result links move to `/offbeat#result`, and the clock bar's Back goes to `/offbeat`, not `/`.
- 14a-2a's stop-gap (Play starting the run in place).
- How to play from 14a-3's scope.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
