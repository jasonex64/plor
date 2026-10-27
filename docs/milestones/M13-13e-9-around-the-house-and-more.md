# M13 13e-9 — Around the house, and more

**Status:** done (2026-10-27): built and reviewed overnight under the human's overnight rules (HANDOFF, "Overnight rules"), merged on green CI in PR #105.

## Goal
22 more WordNet categories, everyday things and knowledge, each with a bank question, toward 13e's 210 (148 before this batch, 170 after).

## Who uses it / what breaks without it
- **Used by:** the drafting session and every player, as 13e-7 and 13e-8.
- **Breaks without it:** the bank stays at 148 categories, short of 210.

## What the human decided
The overnight rules (HANDOFF, "Overnight rules"; 13e-7's ticket quotes each answer).

## Source
- **SOURCES.md, Open English WordNet (M13, D2):** each category a WordNet branch already loaded by `oewn-nouns`.

## Design
1. **22 WordNet categories** with bank questions: bridge, clock, computer, door, flag, fuel, garden, hormone, knot, painting, road, rope, soldier, star, tower, window, form of government; within an old category: bed and table (furniture), coffee and milk (beverage), skirt (clothing).
2. **Left out** (the overnight rules): gland (crude slang entries, as organ in 13e-8); phone (WordNet's branch is speech sounds, not telephones); philosophy (mixed with kinds of law); chocolate (shares candy), crystal (holds gemstone), cutlery and tableware (share tool and knife), genre (holds music genre), monster (shares mythical creature), pie (shares dessert), pigment (shares mineral), poison (shares weapon), seat (holds chair). Drafted and then left out because they block the simulator ("no letters fit schedule A"): gun (2027-01-07), social science (01-28, 01-31, 04-01), writing implement (04-04), soft drink (01-31). Letter, drafted to be asked as "Name a letter of the Greek alphabet": WordNet has no branch for Greek letters, and its letter branch also holds the Hebrew and Latin letters, "vowel" and "digraph", so the prompt would accept answers it doesn't ask for.
3. **Thin old lists strengthened** (the overnight rules, "strengthen thin lists"): scientist (13e-8) gets 8 more uncommon answers, which unblocks 2027-01-19; sandwich gets 6, which alone didn't unblock 01-31.
4. **`npm run draft -- check-bank`** (ROADMAP, From 13e-3: the list checks as a command): every bank answer must give exactly one member of its category as the draft reads it (the draft's own matching, letter subsets included), and no two answers of one question may name the same thing; it exits 1 on any problem. It replaces the scratch checks run by hand since 13e-6, and it found 6 old problems, fixed here: 5 answers naming the same thing as another answer of their question, each swapped (dinosaur's apatosaur for utahraptor, seafood's prawn for cockle, weather's freeze for drizzle, tree's redwood for balsa, weapon's lance for boomerang) and whale's "blue whale" naming two things (now given by ID).
5. **Shared names marked reviewed** in `data/sameness.json`: flag's "banner" and "streamer", form of government's "republic" (each given by ID in the bank).

## Acceptance criteria
- [x] 22 categories, each with 10+ members and a bank question; `npm run content:validate` OK.
- [x] Each `within` passes `load all`'s check; every category inside another (by tree or by shared members, any source) has `within` or is left out.
- [x] The review's flags handled by the overnight rules; unclear ones listed in the PR.
- [x] Each new question drafts in a trial day; the simulator drafts 40 of 40.
- [x] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass.

## Out of scope
- The left-out categories (for the human); more batches.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 10 members | The smallest category | 13e: the human, "10 members" |
| 20–30 a batch | Batch size | 13e: "Batches with flags (Recommended)" |
| 6 host answers | A question's host bank | The human, 2026-10-27: "Drop it from the batch" |

## Removes
- The 6 old bank problems above (the swapped answers).
- The scratch bank checks run by hand since 13e-6 (never committed), replaced by `check-bank`.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The overnight rule: a category that blocks the simulator is dropped | Scientist (13e-8) and sandwich (13d), already merged, strengthened instead (8 and 6 uncommon answers); this batch's own blockers, gun, social science, writing implement and soft drink, dropped | As 13e-8 did for aircraft and liquor: dropping would remove merged categories, and the human chose strengthening for that case (2026-10-27, "Strengthen the two"). Sandwich's strengthening didn't by itself unblock 01-31, and stays as a stronger list |
| ROADMAP, From 13e-3: the list checks as a `scripts/` command | `npm run draft -- check-bank` in `scripts/draft.ts`, sharing the draft's matching (`nameCandidates`), with db tests in `scripts/draft.db.test.ts` | None: built as the item asks, after 13e-8's review found an answer naming the same thing as the host's |

## Evidence (2026-10-27, overnight, the Windows PC)
- **Load:** `npm run base -- load all` → "DEFINED 170 categories from data/categories.json"; every `within` (bed, table, coffee, milk, skirt) passed its check.
- **Categories:** bridge 17, clock 14, computer 37, door 18, flag 18, fuel 49, garden 21, hormone 71, knot 32, painting 24, road 57, rope 27, soldier 65, star 17, tower 21, window 24, form of government 26, bed 24, table 51, coffee 17, milk 20, skirt 14; none under 10.
- **Bank:** `npm run draft -- check-bank` → "CHECKED 170 questions: 0 problems". Before the fixes it listed the 6 old problems (Design 4), and on a first try at strengthening sandwich it caught "submarine" and "Cuban sandwich" naming one thing ("Cuban sandwich" taken out).
- **LDNOOBW flags, kept as real names** (for the human to see): fuel "spunk" (an alias of kindling), hormone "sex hormone", painting "nude".
- **Trial drafts:** all 23 (letter still in) draft for 2027-06-01 with the new question first, then tree, color, fruit, weather, candy and boat ("trial days drafted: 23 of 23"), files deleted after. Placed last instead (Q7, the most host answers), computer, hormone, knot, star and coffee don't fit that date's letters; the picked days move a blocking question earlier, and the simulator below is the measure.
- **The simulator:** first **`DRAFTED 34 of 40`** with all 27 (hypothesis 40: disproved): blocked at Q7 by gun (2027-01-07), scientist (01-19, 13e-8's), social science (01-28, 01-31, 04-01) and writing implement (04-04). Gun, social science and writing implement left out, scientist strengthened → **`DRAFTED 39 of 40`**, 01-31 blocked at "Name a sandwich" or after it (second disproval: hypothesis 40). Sandwich strengthened → still 39 (01-31). Re-planned instead of guessing: 01-31's seven questions are video game, soldier, sport (F), gemstone, Greek letter, soft drink and sandwich, three of them new; leaving out one new question at a time gave soft drink **40 of 40**, Greek letter 39, soldier 39 (hypothesis: soft drink, the thinnest list). Soft drink left out → `DRAFTED 40 of 40; subset questions 94 of 280`; then letter left out (Design 2) → **`DRAFTED 40 of 40; subset questions 96 of 280`**.
- **Suites** (before letter was left out, which touches only data): `npx tsc --noEmit -p .` clean; `npm test` 416 passed; `npm run test:db` 268 passed (41 files), and after the review's fixes 269 passed (40 files; the bank check's tests moved into `scripts/draft.db.test.ts`), `npx tsc` clean and `npm test` 416 again; `npx supabase test db` 28 files, 435, PASS; `npm run test:e2e` 60 passed, 1 failed: the clock-bar test (ROADMAP's known flake), which passed on `npx playwright test --last-failed` ("1 passed").

## Review (`reviewer` agent, fresh context, 2026-10-27)
- Blocking findings and how each was fixed:
  - **check-bank was a second way to match answers**, without the draft's letter rule ("hockey" passed for sport F, which the draft would refuse): moved to `npm run draft -- check-bank`, on `nameCandidates`, the one matching `resolveNames` now uses too; tests for an off-letter name and a non-member ID on the letter subset, and for an answer listed twice. → "Tests 10 passed (10)" (`npx vitest run scripts/draft.db.test.ts`), "CHECKED 170 questions: 0 problems".
  - **Computer and table accept answers their prompts don't ask for**, as letter did: computer has web site, chat room, newsgroup, social networking service, portal site, bulletin board system, slide rule, pari-mutuel machine, planner; table has the bars and counters (wine bar, sushi bar, snack bar, checkout, meat counter, booth and more). Kept, and listed for the human: they are a fringe of each list in WordNet's own tree, the case ROADMAP's "widened roots bring generic members" item already holds, where letter was mostly other alphabets for a Greek prompt, with no Greek branch to use; the overnight rules leave a category out only for its host answers or the simulator.
  - **Unfamiliar host answers:** hormone's "aldosterone" swapped with "progesterone", rope's "hawser" with "high wire". → `DRAFTED 40 of 40; subset questions 96 of 280`.
  - **The handoff** was stale: rewritten in this PR.
- Deferred to ROADMAP "Next revision": "From the 13e-9 review".
