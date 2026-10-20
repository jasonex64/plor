# M03 — Puzzle insights

**Status:** planned. Draft ticket by Claude on 2026-10-19, waiting for the human's decisions D1–D5 and Numbers. Written now, during the M02 playtest wait, at the human's request ("1 and 2 in parallel", 2026-10-19), so the playtest findings can come out of it.

## Goal
A per-question report shows the human how each puzzle really plays, and lets good unlisted answers be added to future puzzles before their day.

## Who uses it / what breaks without it
- Used by: the human, after every playtest day and then daily. The M02 playtest findings (catch rate per question, share of answers in the host bank, logged misses) come out of it. From M04, the AI drafting step reads the same numbers.
- Breaks without it: the human can't see which questions aren't working ("give good feedback to me so i can see what questions aren't hitting properly", human 2026-10-19) except by hand-written SQL. Misses pile up unread, so the lists don't grow from play, and M04 has nothing to learn from.

## Source
- `docs/DECISIONS.md`: Game 1 (difficulty = the share of players the host answers catch, rising gently through the day) and the answer model (accepted bank, host bank, host answers).
- `docs/milestones/M00-data-design.md` §5 (`run_event`, `run_status`) and the M02 tables (`missed_answer`, `puzzle`).
- PostgreSQL 17 (SOURCES.md): aggregate queries and views. Supabase database roles (SOURCES.md): a read-only login, if D1 says so.
- ROADMAP M03 and M04 rows (scope, synonyms from misses).

## Decisions needed before any code
| # | Decision | Options (Claude's recommendation first) | Status |
|---|---|---|---|
| D1 | Where the human reads the report | **(a) A command, `npm run insights -- <database-url> [date]`, printing a plain report** (connects as a new read-only login, `plor_insights`, that sees only aggregates and misses; the password is asked for, like content:publish). (b) A private admin page on plor.app, which needs an admin sign-in check and is a bigger security change. | open |
| D2 | What a question is compared with | **(a) No stored target yet: show each question's catch rate next to the day's other questions, and flag the ones that break the "rises gently" shape** (e.g. question 2 catching more than question 6). (b) Add an intended catch rate per question to the content format: a format change (DECISIONS.md "hard to reverse") and an estimate per question when drafting. | open |
| D3 | How a good miss becomes an accepted answer | **(a) The report prints each miss with how often it was typed. The human says which to add (as a new entry, or as another name for an existing one), and Claude edits the content file. Then `content:additions-check`, review and `content:publish`**, which reuses the 2d flow. (b) A command that writes chosen misses into the file itself. | open |
| D4 | Privacy of the report | **Aggregates only. Misses are shown without usernames or emails, and individual players are never listed.** | open |
| D5 | Which days the report covers | **Any finished day, and today's so far (marked as unfinished).** | open |

## Acceptance criteria (draft; final once D1–D5 are set)
- [ ] For a chosen day, the report shows for each question: players who reached it, how many were caught, the catch rate, the share of answers that were in the host bank, and the most common answers.
- [ ] It flags questions that break the day's gently rising shape (D2), and questions with fewer players than the minimum in Numbers.
- [ ] It lists the day's misses with counts, without who typed them (D4).
- [ ] Adding a chosen miss to a future puzzle goes through `content:additions-check`, the validator and `content:publish` (D3).
- [ ] The read-only login holds exactly the grants the report needs (pgTAP, like `plor_app_role.test.sql`); nothing personal is readable through it (test).
- [ ] The M02 playtest findings are produced with it (the M02 criterion).

## Out of scope
The AI drafting itself (M04); per-player history; a public stats view ("12% picked lion" is after the MVP); the visual design (M12).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Minimum players per question before its catch rate counts | Flagging (a playtest with a few friends gives small numbers) | — ask the human |
| What "breaks the rising shape" means | Flagging (D2a) | — ask the human, e.g. "a later question catches less than an earlier one by more than X points" |
| How many common answers to list per question | Report length | — ask the human |

## Plan
1. The human sets D1–D5 and the Numbers.
2. Migration: the read-only login and its grants (security change, needs the human's approval), plus pgTAP.
3. The report command, with tests against the local stack (fixture runs with known catch rates).
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
