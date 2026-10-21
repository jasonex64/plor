# M02 2g — Content survey instead of the live playtest

**Status:** in progress. Asked for by the human on 2026-10-20 ("draft a message i can copypaste as well as a spreadsheet template … adjust roadmaps accordingly … we can delay/postpone those [puzzles]"). The message and template are in this PR; the scoring script waits for the responses (build for today).

## Goal
Measure how the questions play (catch rate, host bank share, missing answers) from emailed answers, so the live playtest can wait for the finished design.

## Who uses it / what breaks without it
- Used by: the human, to fix the puzzle lists and hosts before launch; M04, whose drafting reads the same numbers.
- Breaks without it: with the playtest moved to the MVP (human, 2026-10-20: "I don't want people to playtest the site when it's not done"), every catch rate stays an estimate (DECISIONS.md, Game 1) until launch. M04 and every content fix would be built on guesses.

## Decisions
| # | Question | Decision | By |
|---|---|---|---|
| D1 | Live playtest | Moved to the MVP: it becomes the M11 closed beta, and M12 (visual design) moves before M11 so testers see the finished design | human, 2026-10-20 |
| D2 | What replaces it now | An emailed survey of the prompts, framed as the game ("give an answer the host *didn't* pick"), so people answer the way they would in play | human, 2026-10-20 |
| D3 | The 28 published days (2026-10-26 to 11-22) | Taken off the calendar: the human deletes the not-yet-started rows from `private.puzzle` (plan step 2). The files stay in `content/offbeat/` with their dates until the live test's dates are known, then they're re-dated like M02 D2 and republished | human, 2026-10-20 |
| D4 | Response format | One row per person per day: `person,date,q1..q7` (`docs/survey/responses-template.csv`). People are numbered, never named, and answers are copied exactly as written | Claude, 2026-10-20 |

## Source
- DECISIONS.md, Game 1 and the answer model: difficulty is the share of players the host's answers catch; matching is by entry ID, after normalization.
- `docs/milestones/M03-puzzle-insights.md`: the report's measures and `buildInsights` (`src/insights/report.ts`), which takes answers and misses and has no user IDs.

## Acceptance criteria
- [x] A message the human can copy and paste, and a spreadsheet template (`docs/survey/message.md`, `docs/survey/responses-template.csv`).
- [x] ROADMAP: the playtest moves to the MVP (M11, now after M12); M02 and M03 close on the survey findings; items that waited on "the playtest" point to the survey or the live test.
- [ ] The not-yet-started days are gone from the hosted `private.puzzle` (the human's query output from plan step 2: `0` rows after 2026-10-20).
- [ ] The responses come back, and a script scores them through `normalize`, `matchAnswer` and `buildInsights`: one report per surveyed day (catch rate, host bank share, top answers) plus the answers that matched no entry. Unit test on a small fixture.
- [ ] The findings are recorded in M02 and M03, and the human picks the content changes.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 3 days (21 prompts) | Survey size | The human said "yes" to "the next 3–5 unplayed days" (2026-10-20); Claude took the low end to keep it to about 5 minutes. The human can add days |
| Who answers | Respondents | "The human plus a few friends" (M02 Numbers, human 2026-10-18) |
| `INSIGHTS_MIN_PLAYERS` | "Too few answers" flag | Already in `src/config/tunables.ts` (M03) |

## Plan
1. The human sends `docs/survey/message.md` and copies each reply into a copy of the template (Google Sheets or Excel, then **File → Download → CSV**).
2. **The human takes the scheduled days off the calendar** (Supabase dashboard → SQL Editor, which runs as `postgres`; `plor_publisher` has no delete grant). First see what would go:
   ```sql
   select puzzle_date from private.puzzle where game_id = 'offbeat' and puzzle_date > private.today() order by puzzle_date;
   ```
   Expected: 28 rows, 2026-10-26 to 2026-11-22. If you see anything else, stop. Then:
   ```sql
   delete from private.puzzle where game_id = 'offbeat' and puzzle_date > private.today();
   ```
   Expected: 28 rows deleted. `> private.today()` never touches a started day. No runs can exist for a future day, so the run foreign key can't block it. Run the first query again: expected 0 rows. The content stays in git; republishing restores it.
3. The human sends Claude the CSV (answers only, no names or emails). Claude writes the scoring script against it as its own PR, then records the findings.
4. The human decides the content fixes; the surveyed days are spoiled for the people who answered, so they get new prompts or the people are told before the live test.

## Removes
- The "playtest closes M02" checkpoint and the 2026-10-26 playtest dates (ROADMAP, M02 ticket), replaced here.
- The 28 published days in `private.puzzle` (plan step 2); the files stay.
- Part B of 2f no longer waits for a playtest.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
