# M13 13e-10 — New areas and jobs

**Status:** planned, waiting for the human's approval (drafted 2026-10-27 from two rounds of guided questions)

## Goal
Make the simulator check what 13e's Done needs, 30 days drafted in a row, then add a batch of 20–30 categories from areas no category covers yet, plus narrow kinds of jobs, toward that goal (170 categories before this batch).

## Who uses it / what breaks without it
- **Used by:** the drafting session and every player, as 13e-7 to 13e-9; the stop check is used by every later batch.
- **Breaks without it:** at 170 categories a day can't be drafted every day (7 a day × the 30-day gap needs 210 at least). And nothing checks consecutive days today: `npm run draft -- simulate` drafts 40 days spaced 3 apart, so a bank that fails some day of a real month can pass it.

## What the human decided (2026-10-27)
Round 1, the long-term picture:
- When growth stops: **"When 30 days in a row draft (Recommended)"**: batches continue until a trial draft of 30 straight days succeeds, which may take a little more than 210; each extra batch is its own PR.
- The mix: **"New areas first (Recommended)"**: mostly things no category covers yet; narrower slices of old ones only when new areas run thin.
- People: **"Jobs only, closely reviewed (Recommended)"**: professions and their kinds, every member reviewed for slurs and insults; thief, servant and other people-by-behaviour branches stay out.
- Approval: **"You merge each (Recommended)"**: each batch's PR waits for the human's merge, flags listed (13e's rule; the overnight "merge on green" rule doesn't apply).

Round 2, the collisions:
- Card games: **"Within tabletop game (Recommended)"**: WordNet's card game is its own category, `within` tabletop_game, so a day never asks both.
- The check: **"Simulate does 30 in a row (Recommended)"**: `npm run draft -- simulate` drafts 30 consecutive days, replacing the 40 days spaced 3 apart.
- Jobs: **"Narrow kinds (Recommended)"**: one category per kind (doctor, farmer, lawyer…), each small enough to review every member; no broad "Name a job".

Unchanged from 13e and the overnight rules: 20–30 categories a batch, 10 members at least, 6 familiar host answers each naming one member, a category inside an old one is kept as `within`, alcohol allowed, and a weak list (under 6 host answers, or blocking the simulator) is left out and listed in the PR.

## Source
- **SOURCES.md, Open English WordNet (M13, D2):** each category a WordNet branch already loaded by `oewn-nouns`.
- **13d:** the 30-day gap (`REPEAT_GAP_DAYS`) and 7 questions a day (`QUESTIONS_PER_DAY`), which make 210 the least that can work. The gap is per category; a family only keeps two categories off one day (`src/content/bank.ts`, `gapProblems`, `pickQuestions`), so a `within` category adds a full slot.

## Design
1. **The simulator** (`scripts/draft.ts`, `simulate`) drafts 30 consecutive days from its start date instead of 40 days spaced 3 apart, with the same output lines and the same `DRAFTED n of 30` total. 13e's Done check becomes this run passing 30 of 30.
2. **The batch: 20–30 categories with bank questions.** Measured on the Mac's base (2026-10-27; members with a typeable name):
   - new areas: book (`06422547-n`, 86), academic degree (`06710094-n`, 63), ceremony (`01029321-n`, 60), exercise (`00625978-n`, 59), engine (`03292644-n`, 49), party (`08273889-n`, 37), grain (`07818393-n`, 24), cloud (`11459786-n`, 19);
   - card game (`00489236-n`, 50), `within` tabletop_game;
   - jobs: kinds of doctor (`10040615-n`, 55), farmer (`10098586-n`, 26), lawyer (`10269647-n`, 19);
   - the rest scouted the same way from new areas (WordNet roots no category covers, each prompt checked against its members), then narrower slices of old ones only if new areas run thin.
3. **Each list reviewed** with `npm run base -- review`: LDNOOBW's and Plor's flags, two parents, shared names; for the jobs, every member read for slurs and insults, which are dropped by ID in `data/listed.json` (13e-9b) or the category left out.
4. **One PR**, which the human merges. Later batches follow this ticket's rules, each its own sub-ticket, until simulate drafts 30 of 30.

## Acceptance criteria
- [ ] `npm run draft -- simulate` drafts 30 consecutive days and prints `DRAFTED n of 30`; before the new categories, at 170, it stops short (hypothesis: by about day 24, 170 ÷ 7; a full 30 would mean the run isn't testing what it should).
- [ ] 20–30 new categories in `data/categories.json`, each with 10+ members and a bank question; card game marked `within` tabletop_game; `npm run content:validate` OK and `npm run draft -- check-bank` 0 problems.
- [ ] Each job category's members all read (the review output in the PR), with every slur or insult dropped or the category left out.
- [ ] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass; the PR lists the categories left out and anything unclear.

## Out of scope
- Broad people categories and people-by-behaviour branches (thief, servant).
- Combined traits (13e: after the 200). Content days, staging, plor.app.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 30 consecutive days | The stop check and the simulator's run | Human, 2026-10-27: "When 30 days in a row draft (Recommended)", "Simulate does 30 in a row (Recommended)" |
| 20–30 a batch | Batch size | 13e: "Batches with flags (Recommended)" |
| 10 members | The smallest category | 13e: the human, "10 members" |
| 6 host answers | A question's host bank | The human, 2026-10-27: "Drop it from the batch" (overnight rules) |

## Plan
1. The human approves this ticket.
2. Simulate as 30 consecutive days; run it at 170 to see it stop (the hypothesis above).
3. Build the batch: scout, define, write the bank questions, review, simulate after.
4. The suites, the `reviewer` agent, one PR for the human to merge.

## Removes
- The simulator's 40-days-spaced-3-apart schedule (replaced by 30 in a row, one way).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
