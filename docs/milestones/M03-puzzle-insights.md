# M03 — Puzzle insights

**Status:** in progress. Decisions D1–D5 and Numbers set by the human on 2026-10-19. Written now, during the M02 playtest wait, at the human's request ("1 and 2 in parallel", 2026-10-19), so the playtest findings can come out of it.

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
- [ ] For a chosen day, the report shows for each question: players who reached it, how many were caught, the catch rate, the share of answers that were in the host bank, and the most common answers.
- [ ] It flags questions that break the day's gently rising shape (D2: a later question catches at least 10 points fewer than an earlier one), and marks questions with fewer than 5 players as "too few".
- [ ] It lists the day's misses with counts, without who typed them (D4).
- [ ] Adding a chosen miss to a future puzzle goes through `content:additions-check`, the validator and `content:publish` (D3).
- [ ] The page is reachable only by admins: signed-out → 401, signed in but not in `private.admin` → 403, admin → the report (route-level tests). The admin list can't be read or changed by `anon`, `authenticated` or a player (pgTAP).
- [ ] `plor_app` gets only the grants the report needs (pgTAP, extending `plor_app_role.test.sql`).
- [ ] The M02 playtest findings are produced with it (the M02 criterion).

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
4. Run it on the staging playtest data from 2026-10-26; record the M02 findings.
5. Reviewer pass, PR, merge on the human's approval.

## Removes
The hand-written SQL that M02's ticket would otherwise use for the playtest findings. Nothing in the code yet.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
