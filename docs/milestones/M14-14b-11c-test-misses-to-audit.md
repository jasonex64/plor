# M14 14b-11c — A test run's refused answers go to the Audit page

**Status:** approved (human, 2026-10-30: "Approve 14b-11c and 14b-12 as drafted, including their security changes (report_test_miss and search_answers, which plor_app may execute). Build 14b-11c first."); in review (PR #PR, waiting for CI and the human's word to merge). Built after 14b-11b merges, before 14b-12 and 14b-10a (human, 2026-10-30: "Both test-run tickets first").

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
- [x] A db test, as `plor_app`: a test run's refused text for a draft and for an approved day each adds one `reported` row. A repeat adds nothing, and `missed_answer` and every other table the 14b-11 tests count stay unchanged. A non-admin gets OB007.
- [x] A db test: Accept for this category on a `reported` row naming an existing thing makes that thing a member of the category, and a new test run of a draft accepts it. Accept on a row naming nothing makes a new member. Dismiss leaves the category as it was.
- [x] A db test: a near-typo text adds no row.
- [x] An e2e: an admin's test run refuses a text, the Audit page shows it as "From your test run", the admin accepts it, and a new test run of that draft accepts it.
- [x] `docs/DESIGN.md` describes the label, cited to its file and line.

## Out of scope
- Players' misses, which keep their threshold (M13 D4).
- Fixing the category tree itself (a link making every amino acid an acid): that's data work for a Claude session (DECISIONS.md, Links).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 1 player of 1 answered | A `reported` row's counts (`miss_review` requires `players > 0` and `answered >= players`) | The test run is one admin's one answer |
| One typo (any length) | Which refused texts are typos, not kept: `isNearTypo`, as play's audit counts a near-typo | DECISIONS.md, Answer model (`TYPO_MAX_EDITS`, tunables.ts); M13 13b ("Audit only (Recommended)") |
| 40 characters | The most a test run's refused text may be, typed and trimmed, as play's misses (`text_invalid`) | M02 ticket, Numbers (human, 2026-10-18); play holds it as the database's check `missed_answer_typed_length` |

## Plan
1. Migration: the `reported` outcome, `private.report_test_miss`, `audit_decide` and `audit_list` taking `reported` rows. Hypothesis: the existing audit and misses tests pass unchanged; a failure there disproves it.
2. `testRun` reports a refused text that isn't near a typo, through the test route.
3. The Audit page's label and buttons for `reported` rows.
4. Tests, DESIGN.md, the `reviewer`, the PR.

## Removes
Nothing is removed: this adds the one path from a test run to the audit, which has no duplicate. The `reported` outcome reuses the audit's existing decisions rather than adding new ones. `testRun`'s comment that a refused text is kept nowhere is rewritten.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Ticket design: a named thing's Accept "per meaning", as a rejected row's | Each "Accept" names what the thing is a kind of: `private.audit_list` returns each named thing's `kind_of` parents (`kinds`), lowercased as every name is (DECISIONS.md Log, 2026-10-27) | A test run's "apple" named four things, all called "apple", so the e2e found four identical buttons. "heel" names five. Rejected rows had the same problem and get the same help. `audit_list` stays admin-only with no grant change |
| Ticket design: "Nothing goes to `private.missed_answer`, so it never counts toward players' auto-accept threshold" | Also: `private.record_miss` ignores a `reported` row when deciding whether a text was already reviewed, and players reaching the threshold replace it, whatever was decided on it (an accepted report made the text a member, so players' misses never reach it) | The review found that any `miss_review` row for a text stopped players' learning of it, so one report, dismissed ("Dismiss is final"), would block it for good. That breaks answer 2: "auto-learning stay untouched" |
| Ticket design: every refused text that isn't a typo is reported | A letter subset's text that doesn't start with its letter isn't reported (`report_test_miss` takes the question and checks `where.starts_with`, as `record_miss` does) | The question can't accept such a text whatever is decided, so an Accept would silently do nothing (14b-11c review) |
| Play holds the 40 characters as the database's check on `missed_answer.typed` | A test run checks the typed, trimmed text in `reportTestMiss` (`src/game/runs.ts`), before anything else, and answers `text_invalid` as play does | A report writes no `missed_answer` row, so the database's check never sees it; the same length is measured the same way |
| Ticket criterion 1: "as `plor_app`" | The route db test (`src/app/api/admin/test/route.db.test.ts`, "a test run's refused answers go to the audit") connects as `postgres`, as every route test does locally. `plor_app`'s grant is checked by `plor_app_role.test.sql`, and the function's behaviour by pgTAP | The function only inserts into `miss_review` with its owner's rights, so `plor_app` needs no table grant. Its exact grants are what `plor_app_role.test.sql` pins |

## Evidence
Run on the Windows PC's local stack, 2026-10-30 (Pacific).

**Hypothesis** (Plan step 1): the existing audit and misses tests pass unchanged. They did: `misses.test.sql` passes. `plor_app_role.test.sql` failed only on the new approved grant until it was listed.

1. **Reported once, never as a player's miss, admins only.**
   - pgTAP `supabase/tests/test_misses.test.sql`, 12 tests: OB007 for a non-admin; a `reported` row, 1 of 1, waiting; a repeat adds nothing; `missed_answer` unchanged; it counts as waiting.
   - Route db test "reports a refused text for an approved day once, and never as a player's miss", and "reports a draft's refused text…": `npx vitest run src/app/api/admin/test/route.db.test.ts src/game/runs.plor-app.db.test.ts --no-file-parallelism` → `Tests  16 passed (16)`.
2. **The audit's decisions.**
   - pgTAP: Accept for this category makes the named thing a member, and Undo takes it out; Accept on a text naming nothing makes a new member; Dismiss leaves no answer; Link is refused (OB012).
   - The route test accepts "apple" for "Name an animal" through `POST /api/admin/audit`, and a new test run of the draft then accepts it.
3. **A near-typo isn't kept.** The route test's "dgo" (one typo from dog, too short for the typo rule) is refused, adds no row, and every counted table is unchanged.
4. **The e2e:** `npx playwright test e2e/test-run.e2e.ts e2e/audit.e2e.ts e2e/admin-area.e2e.ts` → `9 passed (41.7s)`. That includes "a test run's refused answer waits on the Audit page, and accepting it there makes the next test run accept it": the row shows "From your test run", the admin accepts "apple (fixture_fruit root)", and the next test run climbs. Afterwards there are 0 `reported` rows and 0 fixture `category_extra` rows on the stack.
5. **`docs/DESIGN.md`:** the last line of "Test runs (admin)".

**After the review fixes** (record_miss, the letter rule, the 40 characters):
- `npx supabase test db`: `Files=33, Tests=536`, `Result: PASS`. That includes `test_misses.test.sql`'s four new tests: no report without the subset's letter; 3 players replace a dismissed report with `(accepted,3,)`, the text becomes a member, and there is one review, not two.
- `npx vitest run src/app/api/admin/test/route.db.test.ts src/game/runs.plor-app.db.test.ts src/game/misses.db.test.ts src/app/api/admin/audit --no-file-parallelism`: `Tests  27 passed (27)`.
- `npx playwright test e2e/test-run.e2e.ts e2e/audit.e2e.ts`: `5 passed (26.5s)`.

**The suites:**
- `npm test`: `Tests  473 passed (473)`.
- `npx supabase test db`: before the fixes `Files=33, Tests=532`, `Result: PASS`; after them, see above.
- `npm run test:e2e`, before the review fixes: `81 passed (8.4m)`.
- `npm run test:db`: `Test Files  43 passed (43)`, `Tests  294 passed (294)`.
- `npx tsc --noEmit -p .` and eslint: clean.

## Review
The `reviewer` agent, 2026-10-30.
- **Blocking findings and how each was fixed** (each is a Source diff row):
  - A report stopped players' learning of its text. Fixed in `record_miss`.
  - A letter subset's report could never be accepted. Fixed: it isn't reported.
  - The 40-character limit had no Numbers row and measured the normalized text. Fixed: a Numbers row, and the limit is now measured on the typed text, as play does.
- **Deferred to ROADMAP "Next revision"** (For M14, "Found in 14b-11c's review"):
  - the undo branch's extra `chosen` condition;
  - an acceptance not showing in a started day's test runs;
  - `audit_decide` allowing Accept on a report that names things;
  - a report on a day frozen before its category changed;
  - the Audit page's note describing only players' texts;
  - no successful `report_test_miss` call as `plor_app`;
  - the route test's order dependence.
