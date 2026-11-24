# Audit, 2026-11-23

The weekly audit, run by the Sunday scheduled task (late: started 2026-11-23, 23:43 Pacific). It changes this report and ROADMAP's "Next revision", and nothing else.

## Scope
`main` at `75063de` (after PR #295). No PR was open. Left out: whatever the 2026-11-11 audit or ROADMAP's "Next revision" already lists.

## Method
Three read-only auditors in parallel (Sonnet): bugs, bloat, docs. The main session then re-read every finding below at its cited lines and dropped what didn't hold or was already listed. `npx tsc --noEmit -p .` was run (clean); no test, lint, build, dev server or database was run.

**Deviation from the skill:** step 1 says to work in a new worktree, but CLAUDE.md ("Slots") now says "Never make another folder or worktree". This run used the free slot 3 (`C:/Users/jason/plor-3`) with a plain `git checkout -b audit-2026-11-23 origin/main` and no database reset (an audit needs none). That conflict is finding A1.

## Result in one paragraph
Nothing blocks play, loses data or leaks anything. The code checks its inputs at the boundaries and has no dead files, CSS classes, tunables, SQL functions or npm scripts. Most findings are in the docs: the audit and goodnight skills disagree with the slot rules, three milestones' Status lines are behind `main`, and DESIGN.md's line numbers have drifted. One small bug (A5) and some duplication (A6 to A8) make up the rest.

## Findings, most serious first
"Beta": would a friend in the small invited group plausibly hit it in normal play, and does it block play, lose data, show a wrong result, leak something private or break a deploy?

| ID | Kind | What goes wrong | Evidence | Beta | Milestone |
|---|---|---|---|---|---|
| A1 | docs, process | The audit skill tells the Sunday task to `git worktree add ../RIFF-audit-<date>` and later remove it; CLAUDE.md says "Never make another folder or worktree" and the slot tool exists for this. Each Sunday run has to break one rule or the other. Step 1 could say "take a free slot (`npm run slots`), check out `audit-<date>` from `origin/main`, no database reset", and step 6 "return the slot" | `.claude/skills/audit/SKILL.md:10`, `:18`; `CLAUDE.md` ("Slots, lanes and the inbox"); `docs/DECISIONS.md:39` | no | process |
| A2 | docs, process | `goodnight` builds its queue from tickets whose Status is `planned`, but approved tickets read "approved…", "in progress" or "building", so a literal reading finds nothing to do; it also says to work in a milestone's "existing worktree" and never mentions slots or the one-e2e-run-at-a-time rule. `request_keep_awake` is named nowhere else (*unverified* whether the tool exists) | `.claude/skills/goodnight/SKILL.md:12`, `:14`, `:17` | no | process |
| A3 | docs | Three Status lines are behind `main`: M21's ticket says 21a is "in pull request #238; merge on green checks" (merged, `fed7962`); M19's ticket and row say "in progress" though every step is merged and the row itself says "Done, 2026-11-13"; M20's row says "20n-1 built, its PR open" (merged in #296, `0871d03`). A session reading them waits on merged PRs. The rows carry each PR's history, so every PR must update two or three copies of the same list; that is why this keeps recurring (cf. 2026-11-11 W7) | `docs/milestones/M21-faster-e2e.md:3`; `docs/milestones/M19-pre-beta-fixes.md:3`; `docs/ROADMAP.md:85`, `:87`, `:88` | no | M19, M20, M21 |
| A4 | docs | DESIGN.md's `file:line` citations into the kit and globals have drifted: of 11 checked, none held (e.g. `.card` cited at `kit.module.css:7-20`, now at `:21`, while `:7-9` is the text-size comment; the focus ring cited at `globals.css:352-355`, now at about `:387`). Likely 20f's text sizes and later commits pushed lines down. DESIGN.md is M20's rule book, so a reader lands on the wrong rule. The other ~125 citations are *unverified* | `docs/DESIGN.md:19`, `:29`, `:69`; `src/app/kit.module.css:7-9`, `:21` | no | M20 |
| A5 | bug | Fragments' try routes check only that `text` is a string; Offbeat refuses over 40 characters before matching (`assertTypedLength`). A body of megabytes is cleaned and keyed whole and sent to SQL. The work is linear (not W1's blow-up), so one slow request, not a crash. Not timed: cost *unverified* | `src/app/api/substrings/try/route.ts:14`; `src/app/api/guest/substrings/try/route.ts:13`; `src/game/runs.ts:219` | no | M16 |
| A6 | bloat | e2e helpers are copied file to file: `idOf` five times (the same `auth.users` query), `finishOffbeat` three, `removeDay` and `addDay` two and three, `sheetOf` three. A change to a query or flow must be made in each copy. `e2e/players.ts` and `e2e/game.ts` are the shared homes | `e2e/boards.e2e.ts:73`, `:117`; `e2e/feed.e2e.ts:59`, `:118`; `e2e/look-audit.shots.ts:110`; `e2e/overall-board.e2e.ts:39`; `e2e/today-games.e2e.ts:64`, `:81` | no | M21 |
| A7 | bloat | Four exports have no importer anywhere, tests included: `encodeCursor`, `toComment`, `checkSchedule`, `pageName` (`git grep -lw` finds only the defining file). Not dead (used inside their files); the `export` is all that's surplus | `src/comments/feed-page.ts`, `src/comments/comments.ts`, `src/content/puzzle.ts`, `src/app/shell.tsx` | no | quick fix |
| A8 | bloat | Small helpers written twice: `shiftDay` (`src/app/day-text.ts:8-12`) and `daysBefore` (`src/friends/leaderboard.ts:79-83`) are the same date shift with the sign flipped; `oneDecimal` is defined identically in `src/game/par.ts:6` and `src/game/percentile.ts:6` | as cited | no | quick fix |
| A9 | docs | ROADMAP's "Focus" section still reads as current policy though it is superseded: "The MVP is every functional milestone, M00 to M12", plor.app "may lag behind `main`. Nothing is published for others until launch (M15)" (every merge publishes now), and "plor.app needn't be playable before launch" (the beta is live) | `docs/ROADMAP.md:29`, `:33`, `:34` | no | process |

## Dropped on re-check
- A test that can't fail (`guest-tally.db.test.ts`, `toBeDefined()`), the pool's oversized `offset` and the date formatter written three times: already in ROADMAP's "Next revision" or the 2026-11-11 audit (W13).
- `/api/admin/test` missing from `outputFileTracingIncludes`: still true (`next.config.ts:15-21`), already in ROADMAP (`:45`).
- `20261114071510_drop_calendar_numbers.sql` lacks its siblings' deploy-order note: moot, the migration is pushed (HANDOFF, M16).
- DECISIONS.md log rows naming the removed `check:afterglow` scripts: log rows are history.
- `e2e/test-run.e2e.ts:60`'s `console.log`: deliberate, its comment says why.
- Exports used only by their own tests, and `scripts/base.ts`'s size: not bloat by the rules.
- `docs/HANDOFF.md` on `main` is long and partly superseded again: already listed (For the agent rules, the HANDOFF line); `m23-offbeat-on-a-clock`'s newer handoff will replace it.

## Checked and sound
Guest start and token (Turnstile fails closed; the cookie is httpOnly, secure, scoped to `/api/guest`; every account route refuses a guest cookie, by test). Guest runs map purge races to 409s. Friend requests lock both profiles in a fixed order. Held usernames lock and expire in order. Route inputs (ids, the answer index, NUL checks, admin first). Scoring and boards read days in UTC and settle idempotently. `api-client.ts` now handles a non-JSON error reply (2026-11-11 W8 fixed). Every non-test source file has an importer; every CSS module class, tunable, npm script target and live SQL function is used; environment variables are read only in `src/config/env.ts`.

## Not covered
The middle of the guest migration, Realtime policies in the baseline, `scripts/` beyond the bloat scan, client components, DESIGN.md's citations beyond 11, anything that needs a running app or a phone.
