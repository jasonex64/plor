# M13 13e-10b — The draft swaps a blocker

**Status:** planned, waiting for the human's approval (drafted 2026-10-27 from two rounds of guided questions)

## Goal
When no letters fit a day's 7 questions, even after moving the blocker earlier, the draft swaps the blocking question for the pick's next choice and tries again, so a thin list costs a question instead of the whole day.

## Who uses it / what breaks without it
- **Used by:** the drafting session, every day it drafts; `npm run draft -- simulate`, 13e's stop check.
- **Breaks without it:** in 13e-10's 30-day run, 9 of 30 days failed (`no letters fit schedule A`), each at Q7, where a vowel is stolen after four consonants. The draft already tries every letter order schedule A allows and moves the blocker earlier (`fitOrder`, human, 2026-10-25), but it never changes which 7 questions it picked. Each failure is a day a person fixes by hand, and adding categories doesn't help, so 13e's stop rule (30 days in a row) can't be reached.

## What the human decided (2026-10-27)
After 13e-10's simulate: **"Draft swaps the blocker (Recommended)"**. The human's first idea was to remove different letters; the draft already tries every letter schedule A allows, so that would mean changing schedule A's letter sets, a game-feel change, and this was chosen instead.

Round 1:
- What replaces it: **"The pick's next choice (Recommended)"**: the question `pickQuestions` would have chosen next (gap, theme, least recently used), then the one after, until letters fit.
- How many tries: **"Until one fits (Recommended)"**: until the letters fit or no eligible question is left; no new number.
- Hand-picked days: **"Never (Recommended)"**: a `--questions` day keeps its 7 and fails as today, naming the blocker.
- Reporting: **"Say it in the summary (Recommended)"**: the draft's summary names each question swapped out and why.

Round 2:
- Themed dates: **"Next themed first (Recommended)"**: a themed blocker is replaced by the next themed question if one is eligible, then any (the pick's ranking already puts themed questions first).
- The swapped-out question: **"Stays eligible (Recommended)"**: not counted as used, so it ranks high again the next day; a truly thin list keeps showing in summaries.
- Rebuilding the day: **"Re-sort and retry (Recommended)"**: the new 7 go easiest first, and the letter search and `fitOrder` run as for any day.

## Source
- **13d** (`docs/milestones/M13-13d-the-question-bank.md`): the pick (`pickQuestions`), the 30-day gap, the date's theme first, never used then least recently used.
- **13e-3** (`fitOrder`; human, 2026-10-25: "Move any blocker earlier (Recommended)") and **M04 rule 6** (schedule A, `LETTER_SCHEDULE`, `LETTER_TIERS`): unchanged.
- **13e-10** (simulate as 30 consecutive days) for the evidence.

## Design
1. **`pickQuestions` takes the questions to leave out** for this date. A question left out is skipped as if it weren't in the bank; the gap, family and ranking rules are unchanged, so the next choice is what the pick would have chosen without it.
2. **`draft()` (picked days only):** pick, order easiest first, `fitOrder`. If no letters fit, leave out the blocker and pick again: the last question of the block range first (`blockRange`, where the letters stopped), then, if that one alone can't make it fit, the next of the range. Repeat until the letters fit or the pick throws for too few eligible questions. That throw is the day's failure, with its usual message, plus the swaps tried.
3. **The summary** lists each swap: `swapped out "<prompt>": no letters fit with it` (the guide's lines, as the soft guide prints).
4. **The swapped-out question isn't marked used**: nothing is written for it, as today.
5. **`--questions` days** don't swap.

## Acceptance criteria
- [ ] `npm test`: a unit test where the first 7 can't fit and a swap gives a day that does; the swapped-out question is named in the summary; a hand-picked day with the same block still fails, naming it.
- [ ] `npm run draft -- simulate` on the Mac's base (196 categories): more than 13e-10's 21 of 30 days draft. Hypothesis: the 9 letter blocks become swaps, and any day still failing fails for too few eligible questions (categories), not letters. A letter failure would disprove it.
- [ ] `npm run draft -- check-bank` 0 problems; `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass.

## Out of scope
- Changing schedule A or its letter sets (`LETTER_SCHEDULE`, `LETTER_TIERS`).
- Fixing the thin lists the summaries name: that's for the batches, or by hand.
- New categories (the next batch).

## Numbers
None new. No limit on tries ("Until one fits (Recommended)").

## Plan
1. The human approves this ticket.
2. `pickQuestions` with the left-out questions; its unit tests.
3. The swap loop in `draft()` and the summary lines; unit test with a stubbed letter search.
4. `simulate` (the hypothesis above), the suites, the `reviewer` agent, one PR for the human.

## Removes
- The day failures that a swap now fixes. No code goes: `fitOrder` stays as the first step, and the failure message stays for hand-picked days and for a day the swaps can't fix.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
