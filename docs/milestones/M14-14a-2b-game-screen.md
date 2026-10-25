# M14 14a-2b — Offbeat's game screen

**Status:** done (2026-10-25): merged in PR #81 on green CI, by auto-merge, which the human asked for ("Merge PR #81 once every CI check is green"). Approved by the human with its security change (2026-10-25: "I approve 14a-2b as drafted, including the security change (yesterday's host answers to every signed-in player). Build it.").

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
| A run left at a reveal past midnight (found while building: such a run stays in progress indefinitely, DECISIONS.md Game 1: Timer, so its player could read all 7 answers and then finish it) | "Hide from that player (Recommended)": a player whose own run yesterday is still going sees no answers until they finish it, as yesterday's leaderboard hides that day (M09 D5). Accepted: a second account could still read them |

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
| The page's sizes: cards 14px padding and radius, the chart 86px tall, stat numbers 24px, Start 52px, How to play 48px | Layout | Round 5's game screen (the approved mockups) |
| Smaller sizes: text 11px (the chart's days), 12px (stat labels, pills), 13px (the chart's caption), 14px (the answers, muted text), 20px (card headings); gaps of 1–16px | Layout | Round 5's game screen (recorded by 14a-2c, from 14a-2b's review) |
| How to play: 14px between paragraphs, 16px text at line height 1.45, in the page's 960px column | Layout | Round 3's How to play; L43's column. 14a-2b had 12px, 1.5 and a 640px width that no source gave, corrected by 14a-2c |
| The back links 44px tall | Touch target | As `globals.css`'s buttons (44px) |
| The average to one decimal, out of 7 ("5.2/7"); the best score with a thousands comma ("1,050") | The stats | Round 5's game screen |
| Safe and Caught pills: Paper `--safe` #14532D on `--safe-bg` #E3F4EA (8.0:1), `--caught` #8A1C26 on `--caught-bg` #FBE4E6 (7.6:1); Night #9BE3B4 on #1F3B2A (8.2:1), #FFB3B8 on #4A1F24 (8.2:1) | Yesterday's answers | Round 5's game screen, both themes (its light and dark palettes, `safeBg`/`safeFg`/`caughtBg`/`caughtFg`); ratios by WCAG 2.2's formula, checked in `src/app/colors.test.ts` |
| The feed's column, 360px from 1200px | Desktop | As Today's right column (14a-2a, L42) |

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
| The mockups draw Today's banner before and after a run only | During a run, Today's banner says "Your run is still going" with **Continue** to `/offbeat` | A run waiting at a reveal has no clock, so the clock bar doesn't show; without the link, Today would give no way back to it. Wording provisional (L32) |
| The clock bar showed away from Today (14a-2a) | It shows on every page but the game screen, Today included | The question is on `/offbeat` now, so Today is "away" |
| Round 5 heads the comments "Offbeat comments" | The feed keeps its heading and region name, "Feed" | It's the same feed component as Today's (criterion 6); one name for one thing. Renaming it is ROADMAP Next revision |
| Round 5 draws a pixel banner with the date | The plain block in Offbeat's colour, with the title and the date | The game's look is 14c (Out of scope) |
| Round 5 shows the streak in the header | The streak is in the stats card on the game screen; Today keeps its streak line | The header's sprout is 14b-2; the card is L35's |
| The chart's dash is for "a day not played" (L35 answers) | A run not finished yet (in progress) is a dash too | Its questions survived aren't final until it ends; the stats load again when the run ends |
| Styles in CSS Modules (DECISIONS.md, Styling) | Each bar's height is an inline style | It's the data (survived out of 7), not a style choice; everything else is in `offbeat.module.css` |
| Round 3's How to play says the Wind steals letters on questions 2, 4, 5 and 7 | The same words, as text | It matches `LETTER_SCHEDULE` today; if the schedule changes, the wording is changed with it, as the rules line's 20 seconds and points are |
| Round 3's How to play ends with "Start climbing" | It starts the run and opens `/offbeat` | What the button says it does |

## Evidence
Run on the Windows checkout against the local stack, 2026-10-25.
- **Criteria 4 and 5, and the security change** (`src/app/api/offbeat/route.db.test.ts`): `npx vitest run src/app/api/offbeat/route.db.test.ts --no-file-parallelism` → `Tests  7 passed (7)`. It covers streak 5, best 1000, average 2.8 and the chart `–, 2, –, 4, 0, 1, –`, worked by hand in the file's header. It also covers yesterday's questions with the Wind's answers and P's own; N's with none of their own; Q's hidden while their yesterday run is still going (`{ state: "in_play" }`); a day with no puzzle (`{ state: "none" }`); nothing with today's marker; and the same reads and the settling as `plor_app`.
- **The hypothesis held:** the route settles first. T-2's finished run had no ledger row, and the route wrote it, at 0 points. The test was written after the route, so it never failed first. As a check that it catches the case, the `settleRuns` line was removed and the file run again: `Tests  2 failed | 5 passed (7)` (criterion 4's case and the `plor_app` case). Then the line was restored: `7 passed`.
- **Criteria 1–3, 6 and 7** (`e2e/offbeat.e2e.ts`): `npx playwright test e2e/offbeat.e2e.ts --repeat-each 3` → `9 passed (59.6s)`.
- **Criterion 2 in the moved suites:**
  - `today.e2e.ts`: Play is a link to `/offbeat`; the score and Result are on Today after the run; Result opens `/offbeat#result`; the feed's link goes to `/offbeat`.
  - `shell.e2e.ts`: Today is current on `/offbeat`; the clock bar isn't on the game screen; its Back goes to `/offbeat` and its Result to `/offbeat#result`.
  - `groups`, `live-board` and `approve-and-play` play through `play()` in `e2e/players.ts`.
- **After the review**, with the Continue step: `npx playwright test e2e/today.e2e.ts` → `4 passed (1.4m)`.
- **Contrast** of the Safe and Caught pills in Paper and Night: `npx vitest run src/app/colors.test.ts` → `Tests  30 passed (30)`.
- **Criterion 8:**
  - `npx tsc --noEmit -p .`: no output.
  - `npm run lint`: no problems.
  - `npm test`: `Test Files  40 passed (40)`, `Tests  254 passed (254)`.
  - `npm run test:db`: `Test Files  38 passed (38)`, `Tests  242 passed (242)`.
  - `npm run test:e2e`: `30 passed (3.0m)`.
  - `npm run build`: compiled, with `○ /offbeat` and `○ /offbeat/how-to-play` among the routes.
  - The security change is in DECISIONS.md's Log, 2026-10-25.
  - **CI, at d3468d8:** runs 40184128537 (pull_request) and 40184125913 (push) passed `check`, `db`, `e2e` and `secrets`; Vercel passed too. Merged as 6cf0968, 2026-10-25 10:21 UTC.
  - **Earlier CI, at a9f44d4 and 5fc556d:** each push run failed `e2e`, in today.e2e's first case. It was a race in the test: the check could pass on the game screen's banner before the move to Today landed. Fixed in d3468d8, which waits for Today's address first; 12 of 12 local runs passed.

## Review
The `reviewer` agent, in a fresh context, on `515e7b5..17fb445`. It found no leak in the security change: only `private.today() - 1` is read, a run in progress is answered with `in_play` before any answer is read, and `plor_app`'s grants cover the reads and the settling. It re-ran the route db test (7 passed), the contrast test (30), `npm test` (254), lint and tsc.
- Blocking findings and how each was fixed:
  - Today's "Your run is still going" and **Continue** had no test. `today.e2e.ts`'s first case now goes to Today with the question in play, checks the line, and continues the run through Continue.
  - The eight pill colours had no origin in Numbers. They are now recorded there, from round 5's light and dark palettes, with their ratios.
- Deferred to ROADMAP "Next revision" (For M14):
  - The rules line and How to play type the game's numbers instead of reading tunables.
  - The live-board reset test's weak check after the reset.
  - `/api/offbeat` is loaded twice for a run that's already over.
  - The smaller sizes aren't in Numbers.
  - Start climbing shows after the run has started.
  - "Feed" vs "Offbeat comments".
