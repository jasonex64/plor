# M22 — Today's board

**Status:** done: approved 2026-11-17 (the human: "approve and lets make it so that ppl who playtest can see it rn"); 22a merged in PR #241 (`3c1afd9`, 2026-11-17, every check green, the human's "Yes, auto-merge") and live on plor.app.

## Goal
A player sees today's scores on the leaderboards as soon as their own run of that game is over, instead of the morning after.

## Who uses it / what breaks without it
- Used by: every beta tester, from day one (2026-11-17): Today's Leaderboard card (768px and wider), the Friends tab's leaderboard and each group's leaderboard.
- Breaks without it: a day's scores reach a board only after its midnight Pacific (M09 D9, D10), so on the beta's first day every board is empty and a player who has just finished can't see how they did against anyone until tomorrow. The human, 2026-11-17: "immediate change: we need to be able to see the leaderboards right away for player satisfaction".

## The human's answers (2026-11-17, three rounds)
| # | Question | Answer (quoted) |
|---|---|---|
| 1 | When should a player see today's scores? | "Once they've finished": as soon as their own run is over; before that, nobody learns how far a friend got (DECISIONS.md, Game 1: no spoilers, and M09 D5 still hold) |
| 2 | What number should today's board show before midnight? | "Score as shown now": the score the result screen already shows (Offbeat: the question points plus the rarity bonus estimated so far). It can shift a little at midnight when the bonus is settled |
| 3 | Where should today's scores appear? | "A 'Today' choice": Today's Leaderboard card gets Today beside Yesterday and This week, and opens on Today. The weekly totals stay as they are, adding a day only once it's over |
| 4 | Which games and boards? | "Both games + Overall": Offbeat, Fragments and Overall, for friends and for each group |
| 5 | Who is listed? | "Finished, then the rest": players who've finished, ranked by score, then everyone else without a score |
| 6 | Overall | "After both; partial counts": the viewer sees today's Overall once they've finished both of today's games; a player who's finished one shows that game's score only |
| 7 | Before finishing, on the card | "A 'finish to see' line": Today stays chosen and shows one line |
| 8 | Live updates | "Load once (Recommended)": it loads when the board opens or a choice changes |
| 9 | Phones (no Leaderboard card on Today below 768px since M16 16f-5) | "Friends tab + groups": the Friends tab's and each group's leaderboard get a Today section above This week, with the same rules; Today's page on phones stays as 16f-5 left it |
| 10 | Words | "Finish to see": "Finish today's Offbeat to see today's board." Rows below the scores say "playing" or "not played yet" |

## Design (Claude's, from the answers; for approval)
- **Nothing changes in the points ledger** (DECISIONS.md, Hard to reverse, Points ledger). Closed days, the weekly totals and Yesterday still come from it. Today's board is read from today's runs, each scored by the function the result screen uses: Offbeat's `scoreRun` (`src/game/scoring.ts`; points plus the provisional bonus, as `buildState` in `src/game/runs.ts`), Fragments' `scoreRun` (`src/game/substring-scoring.ts`, as `runTotals` in `src/game/substring-places.ts`). Shown as the boards already show each game (M15 15i): Offbeat as points, Fragments as its par score out of 100 (`PAR_POINTS`), Overall as both par scores added up.
- **The server keeps the secret.** One route, `GET /api/leaderboard/today?game=<offbeat|fragments|overall>[&group=<id>]`, signed in only (401 otherwise), a group's members only (the group page's 404 otherwise, as `getYesterdayBoard`). Until the viewer may see it (their own run of that game finished; for Overall, both of today's games), the reply holds no score and no player's state, only that it's closed. Once open: the finished players ranked as every board ranks them (`ranked`, ties by name), then the rest by name, each "playing" (a run in progress) or "not played yet" (no run). On Overall a player who's finished one game is ranked with that game's par score (answer 6); "playing" there means a run in progress in either game.
- **A game with no approved day today** has no Today board: the reply says so, and the card and section show "No Offbeat today." (or Fragments). For Overall with only one game approved today, Overall opens once the viewer has finished that one. *These words are Claude's, for approval.*
- **Today's Leaderboard card** (`LeaderboardCard`, `src/app/leaderboard.tsx`): the Period switch becomes Today / Yesterday / This week, Today on every load; its chip says today's date. Before the viewer may see it: "Finish today's Offbeat to see today's board." ("Fragments", or for Overall "Finish both of today's games to see today's board.": the Overall line is Claude's, for approval).
- **The Friends tab's and each group's leaderboard** (`Leaderboard`): a "Today" section above This week, the same rules and lines. It's a list in Graph too (one day has no race). On Overall it follows the Count switch: Average is the player's par scores today divided by the games they've finished today (as the weekly Average, per game played).
- **No live updates** (answer 8): each board loads once, and again on a change of choice.
- **No security change:** no table, grant, policy or function changes; `plor_app` already reads `private.run`, `run_event`, `round_word` and `run_status`, and the route decides the rows (DECISIONS.md, Row-level security in `private`). No migration.
- **DECISIONS.md, Log** gets one line: today's board is read from runs with the result screen's scores, shown to a viewer once their own run is over; the ledger is unchanged.

## Source
- `docs/DECISIONS.md`: Points ledger (unchanged; why today's points aren't in it); Game 1: no spoilers; Row-level security in `private`; Log.
- `docs/milestones/M09-points-and-leaderboard.md`: D5 (not before you've finished), D9 and D10 (the day closes at midnight), D11 (the provisional bonus).
- `docs/milestones/M16-16e-points-and-boards.md` (the boards per game, Overall's Sum and Average) and `M16-16f-the-shared-pieces.md` (16f-5: no card on Today below 768px; 16f-6: the Game switch).
- `docs/milestones/M15-15i-par-scores.md`: par scores on the boards.
- `docs/SOURCES.md`: Next.js 16.4 (route handlers; read in `node_modules/next/dist/docs/` before writing the route), PostgreSQL 17 (queries), Vitest, Playwright.

## Acceptance criteria
- [x] **22a** The route returns no score and no player's state to a viewer who hasn't finished that game today (Overall: both games), for friends and for a group. Db test.
- [x] **22a** Once the viewer has finished: finished players ranked by score, ties by name, then the rest by name as "playing" or "not played yet". An Offbeat player's score equals the result screen's `points + bonus` for the same run (`buildState`); a Fragments player's equals `parScore(runTotals)`. Db tests.
- [x] **22a** Overall opens only after both of today's games are finished, and a player who's finished one is ranked with that game's par score. Db test.
- [x] **22a** Signed out gets 401; a non-member asking for a group gets 404; a game with no approved day says so. Route and db tests.
- [x] **22a** The ledger is untouched: reading today's board writes no `points_ledger` row for today. Db test.
- [x] **22a** Today's card opens on Today and shows the "finish to see" line before the player's run is over and the ranked board after it; the Friends tab's board shows the Today section above This week. Targeted e2e.
- [x] **22a** `npx tsc --noEmit -p .`, `npm run lint` and `npm test` pass; CI's checks are green.
- [x] **22a** DESIGN.md describes the Today choice and section.

## Out of scope
- Live updates (answer 8); adding today to the weekly totals (answer 3); Today's page on phones (answer 9).
- Guests' boards; changing the ledger or when a day closes.

## Numbers
No new number. Used as they are: `PAR_POINTS` (M15 15i, the human, 2026-11-15) and `POINTS_PER_QUESTION` and the bonus tunables (M09, the human, 2026-10-22), through the scoring functions.

## Plan
1. The route and its reads, db and route tests first: a closed board, ranking and the rest, Offbeat's score equal to `buildState`'s, Fragments' par score, Overall after both with partial counts, 401, 404, no day, no ledger write → verify: `npm run test:db -- -t "today's board"` fails before and passes after; `npm test -- src/app/api/leaderboard/today`.
2. Today's card: the Today choice first and on every load, the lines → verify: targeted e2e (`npm run test:e2e -- e2e/boards.e2e.ts`) with a new case for the closed and open card.
3. The Today section on the Friends tab's and groups' boards → verify: the same e2e file, a case on the Friends tab.
4. DESIGN.md, DECISIONS.md Log, this ticket's Status, ROADMAP's row → verify: `git diff --stat` lists them.
5. `npx tsc --noEmit -p .`, `npm run lint`, `npm test`, then the reviewer agent → verify: each exits 0; the reviewer's findings recorded under Review.

Hypothesis for step 1: Offbeat's provisional score for a finished run computed from `run_event` with today's pooled counts equals what `GET` on the run returns as `points + bonus`, because both call `scoreRun` with the same events and pooled counts. A test where they differ would disprove it.

## Removes
Nothing yet: this adds a route and a board section. Anything the change makes unused is listed in each commit.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| M09 D9/D10: a day's points reach the boards once it closes at midnight | Today's board shows today's scores before midnight, read from runs; the ledger, the weekly totals and Yesterday still wait for midnight | The human's answers 1 to 3, 2026-11-17; DECISIONS.md, Log, 2026-11-17 |
| Design: "No Offbeat today." for a game with no day | Also "No games today." on Overall when neither game has a day | Overall needed a line too; Claude's words, like the Overall "finish" line |
| Design: the Friends and group boards show Today above This week | As designed; a failed today's read shows its own error line | Review: one shared error let the week's answer clear today's |

## Evidence
- Db tests, `npm run test:db -- -t "today's board"` (2026-11-17): `Tests  8 passed | 512 skipped (520)`. They cover the closed board for friends and a group, ranking with each Offbeat score equal to the answer route's `points + bonus`, the rest's "playing" and "not played yet", a stranger never listed, a group's members and a non-member's 404, Fragments' par scores, Overall after both with a one-game player's par score and the Average, no day today, and no ledger row written. The whole db suite ran once by mistake (a file filter is ignored): `Test Files  1 failed | 65 passed`, the one being this file before its typed-answer fix.
- Signed out: `npm test` (2026-11-17): `Test Files  71 passed (71)`, `Tests  822 passed (822)`, including `GET /api/leaderboard/today refuses a signed-out player with 401`.
- `npx tsc --noEmit -p .`: no output. `npx eslint` on every changed file: exit 0 (`npm run lint`'s 188 warnings are all in `.claude/` and `.github/` skill scripts, none in this change).
- E2e, `npm run test:e2e -- e2e/boards.e2e.ts e2e/live-board.e2e.ts e2e/today.e2e.ts e2e/alive.e2e.ts e2e/calm.e2e.ts`: `1 failed, 23 passed (3.8m)`. The failure was "the reset reloads every section of Today" still waiting for the card's Yesterday read; it now waits for Today's. Rerun of `e2e/live-board.e2e.ts e2e/boards.e2e.ts`: `14 passed (1.6m)`, including "today's board opens once the viewer has finished, on Today's card and the Friends tab" and the card's closed lines for Offbeat, Fragments and Overall.

- CI on PR #241 (`gh pr checks 241`, 2026-11-17): check, db, e2e, secrets, Vercel and Vercel Preview Comments all `pass`. After the merge, Vercel's status on `3c1afd9`: "Deployment has completed"; `GET https://plor.app/api/leaderboard/today?game=offbeat` without the app's headers answers 409 where it answered 404 before the deploy (the route is there). Not checked: the board signed in on plor.app.

## Review
- The `reviewer` agent (fresh context, 2026-11-17) found no leak, the Offbeat score equal to `buildState`'s, Overall and the group 404 right. Blocking findings and how each was fixed: the Friends and group boards shared one error between today's read and the week's, so the week's answer could clear a failed Today silently: Today has its own error line now (`leaderboard.tsx`, `todayError`); this ticket's Evidence and Review, and `docs/HANDOFF.md`, were not written yet: written.
- Deferred to ROADMAP "Next revision" (For M22): the card's Overall Today is Sum only; the uncached pooled-counts read per card open; no test of a failed today's read; two DESIGN.md citations into `leaderboard.tsx` already stale on `main`.
