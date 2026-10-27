# M13 13e-10b — The draft swaps a blocker

**Status:** in review (approved by the human, 2026-10-27: "I approve 13e-10b's design as drafted. Build it."; built and reviewed on the Mac, 2026-10-27)

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
2. **`draft()` (picked days only), through `withSwaps`:** pick, order easiest first, `fitOrder`. If no letters fit, leave out each question of the block range alone (`blockRange`, where the letters stopped), last first, picking, re-sorting and retrying each time; the first that fits wins. When none fits alone, the last stays out and the next round starts from that day (so a thin list is the one left out, not the questions that replace it: review). Repeat until the letters fit or the pick throws for too few eligible questions. That throw is the day's failure, with its usual message, plus the swaps tried.
3. **The summary** lists each swap: `swapped out "<prompt>": no letters fit with it` (the guide's lines, as the soft guide prints).
4. **The swapped-out question isn't marked used**: nothing is written for it, as today.
5. **`--questions` days** don't swap.

## Acceptance criteria
- [x] `npm test`: a unit test where the first 7 can't fit and a swap gives a day that does (`withSwaps`, a two-question block included); the summary's swap line (`swapLines`). A hand-picked day with the same block still fails, naming it: shown by the command in Evidence, not a test, because `draft()` needs a loaded base whose letters block, and the fixture base can't make one without a second base for this alone (review; the `ids` path calls `namedQuestions` and never `withSwaps`).
- [x] `npm run draft -- simulate` on the Mac's base (196 categories): more than 13e-10's 21 of 30 days draft. Hypothesis: the 9 letter blocks become swaps, and any day still failing fails for too few eligible questions (categories), not letters. A letter failure would disprove it.
- [x] `npm run draft -- check-bank` 0 problems; `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass.

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
| Design 3: the summary names each swap | `draft()` also returns `swapped`, and `simulate` prints `swapLines(swapped)` on each day's line | So simulate shows swaps without matching the summary's text (review) |
| AC 1: a test that a hand-picked day still fails | The command in Evidence | `draft()` needs a loaded base whose letters block; the `ids` path never calls `withSwaps` (review) |

## Evidence
On the Mac, 2026-10-27, on 13e-10's base (196 categories, fresh after 13e-10's `db reset` and `load all`).
- **simulate** (the hypothesis: the 9 letter blocks become swaps, and what still fails fails for too few categories): held. `npm run draft -- simulate`: `DRAFTED 28 of 30; subset questions 58 of 196`, in 56 s, up from 13e-10's 21 of 30. Seven swaps on five days: beer (01-02), alloy (01-11, 01-22, 01-27), lawyer (01-17, 01-22) and liquor (01-22). The two failures are `2027-01-29: only 0 bank questions ask a category not used within 30 days; 7 more needed` and the same for 01-30, which is capacity (196 ÷ 7 = 28 days). The same on the final code after the review's fix: 28 of 30, the same seven swaps (each a one-question block at Q7, where the old and new rules agree).
- **A hand-picked day isn't swapped:** `npm run draft -- 2027-01-02 --questions name-a-mythical-being,name-a-bone,name-a-bird,name-a-fish,name-a-coat,name-a-book,name-a-beer` → `no letters fit schedule A for 2027-01-02: questions 1 to 6 hold; the block is at "Name a kind of beer" or after it. Change that question's bank or uncommon answers`; no file written (`content/offbeat/` holds only `2026-10-24.json`).
- **Tests:** `withSwaps`, five cases (fits after swaps, the attempt order, a two-question block whose real blocker is the first, no swap, and the pick running out with and without swaps); `swapLines`; `pickQuestions` leaving a themed question out brings in the eighth themed one. `npm test` 43 files, 430 passed; `npm run lint` and `npx tsc --noEmit -p .` clean; `npm run draft -- check-bank` 0 problems on 196; `npm run test:db` 40 files, 270 passed; `npx supabase test db` Files=28, Tests=435, PASS; `npm run test:e2e` 61 passed (the db, pgTAP and e2e runs before the review's fix, which changed only `scripts/draft.ts`; `test:db` rerun after it: 270 passed).

## Review
The `reviewer` agent, 2026-10-27, in a fresh context (unit tests, tsc, eslint; nothing against the database).
- Blocking findings and how each was fixed: in a two-question block, dropping the last of each new range could drop innocent replacements until the day failed and blame them in the summary; now each question of the range is tried alone, last first, and the last stays out only when none fits alone (Design 2, with a test). The AC's summary and hand-picked tests: `swapLines` is tested, and `draft()` returns `swapped` so `simulate` no longer matches summary text; the hand-picked case is the Evidence command (Source diff). The ticket's Status, Source diff and Evidence, ROADMAP's row and the handoff (done in this PR).
- Deferred to ROADMAP "Next revision": each swap round re-resolves all 7 questions, not just the new one; an error from building a swapped-in question doesn't name the swaps before it.
