# M14 14b-11c — A test run's refused answers go to the Audit page

**Status:** approved (human, 2026-10-30: "Approve 14b-11c and 14b-12 as drafted, including their security changes (report_test_miss and search_answers, which plor_app may execute). Build 14b-11c first."); in progress. Built after 14b-11b merges, before 14b-12 and 14b-10a (human, 2026-10-30: "Both test-run tickets first").

## Goal
An answer refused in an admin's test run waits on the Audit page, marked as from a test run, where the admin accepts it for the category or dismisses it with the page's existing buttons.

## Who uses it / what breaks without it
- Used by: the human, testing days (14b-11) and finding answers they expect that a question refuses.
- Breaks without it: a test run keeps nothing (14b-11, answer 2), so each gap the human finds is lost. Examples: "footwear doesnt include heel, acid doesnt include amino acid" (human, 2026-10-30). The Audit page can already fix both kinds of gap, but only for texts players' misses brought there.

## What the human decided (2026-10-30, on the Windows PC, quoted)
1. The two cases, in the human's words: "one where the existing object is alr in the database but just isnt part of the category, and one situation where u just dont have the word (but the word could technically fit in multiple categories)". Explained in reply: the Audit page's Accept for this category covers the first, and its Accept the second, one category at a time.
2. Where they go: "Yes, to the Audit page (Recommended)" ("Only the refused text and its question are kept, marked as from a test run, for you to accept or dismiss. Scores, streak, rarity and auto-learning stay untouched, so 'nothing saved' holds for everything else").
3. Order: "Both test-run tickets first" (this one, then 14b-12, then 14b-10a).

## Source
- `docs/milestones/M13-13b-learning-from-misses.md`: the audit, `private.miss_review`, and `private.audit_decide`'s decisions (accept, accept_for_category, dismiss).
- DECISIONS.md, Answer model and its 2026-10-24 Log row (learning from misses), and the 14b-11 Log row (test runs).
- `docs/milestones/M14-14b-11-test-runs.md` (the test route and `testRun`).

## Design (proposed)
- **What's kept.** When a test run's answer is refused ("isn't in our list"), the test route adds one audit row for the question's category and the normalized text, with a new outcome, `reported` (an admin's test run). It counts as 1 player of 1. Nothing goes to `private.missed_answer`, so it never counts toward players' auto-accept threshold (answer 2: "auto-learning stay[s] untouched"). It needs no saved run, so a draft's misses can be kept too.
- **Duplicates.** If the category already has a row for that text, decided or not, nothing is added (`miss_review`'s `unique (category, text)`).
- **Typos.** A text one typo from a member isn't kept: it's a typo, not a gap. The test run already corrects one typo in a text of 4+ letters, as play does.
- **On the Audit page.** A `reported` row is labelled "From your test run".
  - If the text names things outside the category (amino acid, heel), it shows them, as a rejected row does, with **Accept for this category** per meaning.
  - If it names nothing, it offers **Accept**, which makes it a new member, as a held row does.
  - Both offer **Dismiss**.
  - `private.audit_decide` accepts these decisions on `reported` rows. Its other rules are unchanged.
- **Who.** Only an admin's test run reports a miss. The function checks the admin, as `build_puzzle` does.

**Security change** (CLAUDE.md, "Security changes need a human"; recorded in DECISIONS.md Log once approved):
- `plor_app` may execute one new function, `private.report_test_miss(p_user, p_category, p_text)`. It is security definer with an empty `search_path`, and raises OB007 unless the user is an admin.
- It inserts one `miss_review` row with outcome `reported`, or nothing if the category already has that text.
- `miss_review`'s outcome check gains `reported`. No grant on a table, RLS or role changes.

## Acceptance criteria
- [ ] A db test, as `plor_app`: a test run's refused text for a draft and for an approved day each adds one `reported` row. A repeat adds nothing, and `missed_answer` and every other table the 14b-11 tests count stay unchanged. A non-admin gets OB007.
- [ ] A db test: Accept for this category on a `reported` row naming an existing thing makes that thing a member of the category, and a new test run of a draft accepts it. Accept on a row naming nothing makes a new member. Dismiss leaves the category as it was.
- [ ] A db test: a near-typo text adds no row.
- [ ] An e2e: an admin's test run refuses a text, the Audit page shows it as "From your test run", the admin accepts it, and a new test run of that draft accepts it.
- [ ] `docs/DESIGN.md` describes the label, cited to its file and line.

## Out of scope
- Players' misses, which keep their threshold (M13 D4).
- Fixing the category tree itself (a link making every amino acid an acid): that's data work for a Claude session (DECISIONS.md, Links).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 1 player of 1 answered | A `reported` row's counts (`miss_review` requires `players > 0` and `answered >= players`) | The test run is one admin's one answer |
| One typo, 4+ letters | Which refused texts are typos, not kept | DECISIONS.md, Answer model (`TYPO_MAX_EDITS`, `TYPO_MIN_LETTERS`, tunables.ts) |

## Plan
1. Migration: the `reported` outcome, `private.report_test_miss`, `audit_decide` and `audit_list` taking `reported` rows. Hypothesis: the existing audit and misses tests pass unchanged; a failure there disproves it.
2. `testRun` reports a refused text that isn't near a typo, through the test route.
3. The Audit page's label and buttons for `reported` rows.
4. Tests, DESIGN.md, the `reviewer`, the PR.

## Removes
Nothing is removed: this adds the one path from a test run to the audit, which has no duplicate. The `reported` outcome reuses the audit's existing decisions rather than adding new ones.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
