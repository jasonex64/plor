# M03 — Puzzle insights

**Status:** done (closed in the roadmap reset, 2026-10-20; no further work in the MVP). Built and merged in PR #14; its last criterion, the M02 findings, was produced on 2026-10-21 by the 2g survey scoring through `buildInsights` (the live playtest it waited for moved to M11). Decisions D1–D5 and Numbers set by the human on 2026-10-19.

> **Since this ticket (2026-10-21 docs audit):**
> - No run is "abandoned" any more: a run started before midnight can be finished after it, and run status is in_progress, died, survived or timed_out (DECISIONS.md Log 2026-10-21; migration `20261021081057_question_timer.sql`).
> - AI puzzle drafting (here "M04") has no milestone: it is under ROADMAP "Later"; M04 became game mechanics.
> - Seeing friends' and group members' misses (D4's "M06/M07") is in Groups, now M10 (ROADMAP).
> - The live playtest is the closed beta in launch, now M15 (not M11); the visual design is now M14 (not M12).
>
> Milestone numbers here are the ones in use when it was written; ROADMAP.md has today's.

## Goal
A per-question report shows the human how each puzzle really plays, and lets good unlisted answers be added to future puzzles before their day.

## Who uses it / what breaks without it
- Used by: the human, after every playtest day and then daily. The M02 playtest findings (catch rate per question, share of answers in the host bank, logged misses) come out of it. From M04, the AI drafting step reads the same numbers.
- Breaks without it: the human can't see which questions aren't working ("give good feedback to me so i can see what questions aren't hitting properly", human 2026-10-19) except by hand-written SQL. Misses pile up unread, so the lists don't grow from play, and M04 has nothing to learn from.

## Source
- `docs/DECISIONS.md`: Game 1 (difficulty = the share of players the host answers catch, rising gently through the day) and the answer model (accepted bank, host bank, host answers).
- `docs/milestones/M00-data-design.md` §5 (`run_event`, `run_status`) and the M02 tables (`missed_answer`, `puzzle`).
- PostgreSQL 17 (SOURCES.md): aggregate queries and views. Supabase SSR auth (SOURCES.md) for the signed-in check; Next.js route handlers and pages.
- ROADMAP M03 and M04 rows (scope, synonyms from misses).

## Decisions needed before any code
| # | Decision | Options (Claude's recommendation first) | Status |
|---|---|---|---|
| D1 | Where the human reads the report | **A private admin page on plor.app** (human, 2026-10-19: "1b"). Admins are a **list of user IDs in the database** (`private.admin`), which the human fills in once in Supabase's SQL editor; no deploy and no env var (human, 2026-10-19). Security change: approved in principle by the human; the exact grants are in the PR | human, 2026-10-19 |
| D2 | What a question is compared with | **No stored target: each question is shown next to the day's others, and a question that breaks the "rises gently" shape is flagged** (human, 2026-10-19: "2a") | human, 2026-10-19 |
| D3 | How a good miss becomes an accepted answer | **The page lists misses with counts; the human picks which to add, Claude edits the content file, then `content:additions-check`, review, `content:publish`** (human, 2026-10-19: "3a") | human, 2026-10-19 |
| D4 | Privacy of the report | **The admin report shows aggregates and misses without usernames or emails, and never lists individual players.** Separately, players will see their friends' and group members' misses; that is social and goes to M06/M07 (human, 2026-10-19) | human, 2026-10-19 |
| D5 | Which days the report covers | **Any finished day, and today's so far (marked as unfinished)** (human, 2026-10-19) | human, 2026-10-19 |

## Acceptance criteria
- [x] For a chosen day, the report shows for each question: players who reached it, how many were caught, the catch rate, the share of answers that were in the host bank, and the most common answers.
- [x] It flags questions that break the day's gently rising shape (D2: a later question catches at least 10 points fewer than an earlier one), and marks questions with fewer than 5 players as "too few".
- [x] It lists the day's misses with counts, without who typed them (D4).
- [x] *(The flow exists: `content:additions-check` (M02 2d), the validator, review, `content:publish`; first real use after the playtest.)* Adding a chosen miss to a future puzzle goes through `content:additions-check`, the validator and `content:publish` (D3).
- [x] The page is reachable only by admins: signed-out → 401, signed in but not in `private.admin` → 403, admin → the report (route-level tests). The admin list can't be read or changed by `anon`, `authenticated` or a player (pgTAP).
- [x] `plor_app` gets only the grants the report needs (pgTAP, extending `plor_app_role.test.sql`).
- [x] The M02 findings are produced with it (the M02 criterion): since 2026-10-20 from the 2g survey, scored through `buildInsights` (`docs/milestones/M02-2g-survey.md`). *Done 2026-10-21: `npm run survey:score` builds each day's report with `buildInsights`; findings in the 2g ticket.*

## Out of scope
The AI drafting itself (M04); per-player history; a public stats view ("12% picked lion" is after the MVP); the visual design (M12).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Minimum players per question before its catch rate counts | "Too few" marking | 5 (human, 2026-10-19) |
| What "breaks the rising shape" means | Flagging (D2) | A later question catches at least 10 percentage points fewer players than an earlier one (human, 2026-10-19) |
| How many common answers to list per question | Report length | Top 5 (human, 2026-10-19) |

## Plan
1. The human sets D1–D5 and the Numbers.
2. Migration: `private.admin` and the grants the report needs (security change: shown to the human in the PR), plus pgTAP.
3. The report's queries (pure aggregation, tested against the local stack with fixture runs of known catch rates), the admin-only route and the page.
4. ~~Run it on the staging playtest data from 2026-10-26~~ Run `buildInsights` on the 2g survey answers (the playtest moved to M11, human 2026-10-20); record the M02 findings.
5. Reviewer pass, PR, merge on the human's approval.

## Removes
The hand-written SQL that M02's ticket would otherwise use for the playtest findings. Nothing in the code yet.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Ticket: "players who reached it" | Players who **answered** the question | A run that stopped at a question (still playing, or abandoned) gave no answer to count; catch rate and host-bank share are per answer. |
| D2: compare each question with the day's others | Only questions with at least 5 answers take part, on both sides of the comparison | A "too few" question's rate isn't reliable enough to flag or be flagged against (Numbers: 5). |
| Ticket: "lists the day's misses with counts" | Misses that differ only in case, spacing, punctuation or accents are one miss, shown in its most common spelling; the count is every time it was typed | The same normalization the content uses (DECISIONS.md: Answer model), so "okapi" and "Okapi" are one candidate for the human. |
| D1: the human fills `private.admin` | Nothing writes `private.admin` except `postgres` (the SQL editor); plor_app can only read it | Least privilege: no route can make an admin. |
| DECISIONS.md Test runner: `test:db` runs the db tests | One file at a time (`--no-file-parallelism`) | Two files raced on today's fixture puzzle (hypothesis 3 in Evidence); the row is updated in the same change. |

## Evidence
Run in the M03 worktree, branch `m03-puzzle-insights`, 2026-10-20, on a freshly reset local stack. Windows had reserved ports 54264–54363; the human first ran `net stop winnat` / `net start winnat` as administrator.

```text
$ npm run test:sql
game.test.sql ............ ok
plor_app_role.test.sql ... ok      # exact grant list now also has private.admin select and private.missed_answer select
private_schema.test.sql .. ok      # private.admin unreachable by anon, authenticated and service_role
profile.test.sql ......... ok
Files=4, Tests=74
Result: PASS
$ npm run test:db                  # one file at a time
 Test Files  8 passed (8)
      Tests  44 passed (44)
$ npm test
      Tests  124 passed (124)
$ npm run lint                     # no findings
$ npm run build                    # adds ○ /admin and ƒ /api/admin/insights
```

- **Report maths:** `src/insights/report.test.ts` covers counts, catch rate, host-bank share, "too few" under 5, the 10-point flag (at exactly 10, at 9, and 30% → 20%, which floating point gets wrong), the top 5 with ties, and misses grouped across case and accents.
- **Admin gate:** `route.test.ts` (signed out → 401). `route.db.test.ts`: player → 403 `admins_only`; admin → the report with no user ID or email in the JSON; malformed date → 400; a published day that hasn't started → 404 and absent from the day list. Removing the `<= private.today()` guards from `queries.ts` made two of these tests fail; restored afterwards (M03 review).
- **Browser check** (local `next start`, 375×812, a fixture day of 8 players):
  - Not admin: "This page is for admins only."
  - After adding the test user to `private.admin`, Q1: "Q1. Name an animal … Caught 3 of 8 (38%) … Most common: elephant (3), aardvark (2), alpaca (2), anteater (1)". "Not in the list" shows "okapi (2)" (typed as "okapi" and "Okapi").
  - Q2: "Caught 1 of 5 (20%)", with "Catches clearly fewer players than an earlier question".
  - Q3–Q7: "Too few players to judge yet."
  - The fixture data, the test users and the local puzzle were deleted afterwards.

Hypotheses on the way:
1. "Port 54322 is held by another session's stack." **Disproved:** nothing was listening; `netsh interface ipv4 show excludedportrange protocol=tcp` showed 54264–54363 reserved by Windows. Fixed by restarting winnat (human, administrator).
2. "Floating-point catch rates compare correctly at the 10-point line." **Disproved** by a test: 30% → 20% came out as 9.999… points and wasn't flagged. The comparison now uses whole numbers.
3. "Database test files can run in parallel." **Disproved:** `route.db.test.ts` and `runs.db.test.ts` both inserted today's fixture puzzle (`puzzle_pkey` duplicate). `test:db` now runs files one at a time.


## Review
**Review 1** (reviewer agent, fresh context, `origin/main...HEAD`, 2026-10-20):
- Blocking findings and how each was fixed:
  - The future-day guard had no test (the test asked for 2099-01-01, which has no puzzle at all). **Fixed:** the fixture publishes tomorrow; the test asserts 404 and that tomorrow is not in the day list; removing the guard makes it fail.
  - Evidence, Source diff and Review were empty while criteria were ticked (a doc script had failed halfway). **Fixed:** this section, the Evidence and the Source diff.
- Deferred to ROADMAP "Next revision": no day selector when today has no puzzle; impossible dates become a 500; the column-level grant on `missed_answer`; lower-bound counts in the db test; a test for an earlier "too few" question.
