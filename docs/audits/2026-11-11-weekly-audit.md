# Audit, 2026-11-11

Run overnight at the human's word ("lead an agent team to do overnight work ... that doesn't need me"), by the `audit` skill's method, not by the Sunday task. It changes this report, `2026-11-11-backlog-sort.md` beside it and ROADMAP's "Next revision", and nothing else.

## Scope
`main` at `3076d81` (after PR #179). No PR was open. Left out: `src/brew/`, `public/brew/`, `e2e/brew.e2e.ts` and `src/app/substrings.*`, which 14c-9 is rewriting in `RIFF-m14`; and whatever "Next revision" or the 2026-10-26 audit already lists.

## Method
Three read-only auditors in parallel (Sonnet, medium effort): bugs, bloat, docs. Each finding below was then re-read at its cited lines by the main session; what nobody ran is marked *unverified*. No test, dev server, build or database was run, as the 14c-9 session had the machine's port 3000 and local stack. One pure-Node timing was run (W1).

## Result in one paragraph
No finding blocks play for a closed beta. The server checks its inputs at every boundary and the bloat scan found no dead code outside the village. Three things deserve the human's eye before friends are invited: W1 (one long pasted answer can crash a request), W2 (game 2's dictionary owes a licence notice the app doesn't show) and W3 (14c-9's removal list leaves the village's test flag, video upload and decision rows behind).

## Findings, most serious first
"Beta" answers: would a friend in a small invited group plausibly hit it in normal play, and does it block play, lose data, show a wrong result, leak something private or break a deploy?

| ID | Kind | What goes wrong | Evidence | Beta | Milestone |
|---|---|---|---|---|---|
| W1 | bug | One very long answer makes the typo check build every one-edit spelling of it, twice, before the database's 40-character rule refuses it. Timed in plain Node: 1,000 characters 287 MB, 2,000 characters 890 MB. A pasted paragraph could run the request out of memory; the player sees a vague error (W8). The fix needs no new number: refuse over 40 characters before matching, as `reportTestMiss` does | `src/app/api/run/answer/route.ts:14`, `src/game/matching.ts:36-45`, `src/game/runs.ts:343` (the 40 rule, reached after), `:419`. Vercel's memory limit for this project is *unverified* | no (not normal play); cheap to close | M13 |
| W2 | docs, licence | Game 2's ticket promises that before game 2 goes live the About page shows UKACD's notice verbatim and ESDB's. Neither About nor Privacy names the dictionary, and no list a session reads (ROADMAP, HANDOFF, M15) carries the promise | `docs/milestones/M16-game-2-substrings.md:123`; `grep -ril ukacd src public` prints nothing | for the human: does the beta count as "live" | M16 |
| W3 | bloat | 14c-9's Removes list doesn't name the village's leftovers outside `src/`: the test browser's `--enable-unsafe-swiftshader` flag, CI's video upload of failed tests (kept for the village's failures), DECISIONS.md's "3D scenes" row, and SOURCES.md's three.js row. The 14c-9 session's local commits may already cover some (its commit `ad3b4b0` names the DECISIONS and SOURCES rows; the flag and the videos are *unverified* there). Whether to keep the videos for other flaky tests is the human's call | `playwright.config.ts:17-24`, `.github/workflows/e2e.yml:51-60`, `docs/DECISIONS.md:13` | no | M14 (14c-9) |
| W4 | test | `how-to-play.e2e.ts` refuses the words "show", "fuse" and "street" anywhere in How to play, to keep the festival's words out. The festival is gone, and an honest sentence with "show" in it now fails CI | `e2e/how-to-play.e2e.ts:164-172` | no | M14 |
| W5 | test | Two e2e tests failed on CI for reasons that aren't the village or Afterglow: a group's joiner's comment didn't reach the creator's open page in 5 s (runs 42886581915, 42798560916), and the game screen's side column was taken out once while loading (run 42907063874). Flake or real delivery gap: *unverified* | `e2e/groups.e2e.ts:27`, `:122`; `e2e/controls-and-state.e2e.ts:201` | no | M14 |
| W6 | docs | 14c-8 is merged (PR #179) but its ticket's Status, ROADMAP's M14 row and `main`'s HANDOFF say "in review, PR open". The 14c-9 session's local commit `b4ac330` fixes it; it reaches `main` with 14c-9's PR | `docs/milestones/M14-14c-8-plain-game-1.md:3` | no | M14 |
| W7 | docs | ROADMAP's milestone table never says the games went plain: the M14 row still ends on Afterglow and 6c "next". Seven ticket Status lines disagree with the table (14b-7, 14b-8, 14b-12, 14c-3, 14c-6, 13e-4, the M16 ticket), which matters because `goodnight` builds its queue from Status lines. M17's reads "planned. Approved" with the dictionary's approval quote, though its design round hasn't happened | `docs/ROADMAP.md:81`; each ticket's line 3; `docs/milestones/M17-profiles-and-friend-requests.md:3` | no | M14, M13, M16, M17 |
| W8 | bug | The browser reads every reply as JSON before looking at its status, so a platform error page shows the player "Something went wrong: SyntaxError…" | `src/lib/api-client.ts:24` | no | M15 |
| W9 | bug | `/api/answers?index=` takes any run of digits; one past the database's integer range should come back as a 500, not a 400. Not run | `src/app/api/answers/route.ts:18-19` | no | M15 |
| W10 | docs | `main`'s HANDOFF is 50 KB, about 40 of it superseded: it still tells sessions to run the deleted `check:afterglow-mutants`, gives plor.app's database state three ways, and names a private email address in a public repo. The two migrations waiting for plor.app (`20261107094310`, `20261107105151`) are named only inside one long paragraph | `docs/HANDOFF.md:15-19`, `:45`, `:50`, `:120`, `:124` | no; the address is for the human | process |
| W11 | docs | Guest play's home is told three ways (the M15 row, Design review 3, the plan to the beta), and it has no milestone number or ticket | `docs/ROADMAP.md:9`, `:43`, `:51`, `:84` | no | for the human |
| W12 | bloat | `reduceMotion` in `shown.ts` is exported for the village alone. The 14c-9 session's commit `a6e884a` says it removes the export | `src/app/shown.ts:48-51` | no | M14 (14c-9) |
| W13 | bloat | One date formatter is written three times; a rolled-back-transaction test helper four times and `asPlorApp` five | `src/app/me.tsx:22`, `src/app/offbeat.tsx:164`, `e2e/me.e2e.ts:57`; `src/game/ledger.db.test.ts:28` and three more | no | Later |
| W14 | bloat | About 80 e2e checks pin CSS values the stylesheet states (borders, lifts, heights). Some guard accessibility rules and should stay; the rest add time and flake to a suite that takes 37 to 45 minutes on CI. Not sorted one by one | `e2e/look.e2e.ts`, `calm.e2e.ts`, `alive.e2e.ts` | no | for the human (keep or cut) |
| W15 | bloat | `pluralize` is a runtime dependency used only by `scripts/base.ts`; the test that `/offbeat` and `/updraft` answer 404 guards addresses no player ever had | `package.json:30`; `e2e/offbeat.e2e.ts:183-193` | no | M15 |
| W16 | docs | ROADMAP's Later list still asks for shorter invite codes (done in 14b-3) and calls game 2 a draft; DECISIONS.md's "No code yet" for the shared pieces is true only of 16f; the points table is repeated in ROADMAP's Product section | `docs/ROADMAP.md:105`, `:112`; `docs/DECISIONS.md:91` | no | process |

## The three claims from the plan to the beta, now read
1. **A run left at a reveal never ends: true, and by design** (DECISIONS.md, Timer; `private.run_status`, baseline `:2813-2840`). What a friend sees: after closing the app at a reveal, the next day opens yesterday's reveal first and they must finish it to reach today.
2. **No length limit on an answer: true for the work before the database** (W1).
3. **`/api/admin/test` missing from the traced files: true for a draft's test run** (`src/app/api/admin/test/route.ts:36` reads `content/offbeat` at request time; `next.config.ts:15-18` doesn't list the route). Admin only. No production build was run, so the failure itself is *unverified*.

## CI's e2e
`gh run list --workflow e2e --limit 30`: 17 failed, 13 passed; the last three passed. Outside the village and Afterglow tests, which are gone or going, the failures were `play2.e2e.ts`'s whole-day test (13 runs; its own comments blame the village's drawing, so 14c-9 should end it: if it doesn't, the "Your word" box being re-made mid-typing is a real bug) and W5's two.

## Checked and sound
Every route takes the player from the verified session; ids, codes and dates are checked before SQL; game 1's answer races map to states, never a 500; game 2's lockout and clock are in SQL; ledger settlement is idempotent; no unused export, file, CSS class, tunable or route outside the village.

## Not covered
The middle of the baseline SQL, `src/insights`, `src/content`, most of `scripts/`, client components beyond those named, anything that needs a running app or a phone.
