# M13 13e-8 — Knowledge

**Status:** in progress (2026-10-27, overnight): built under the human's overnight rules (HANDOFF, "Overnight rules"); no PR yet.

## Goal
24 knowledge categories from WordNet (the body, science, people, music, language), each with a bank question, toward 13e's 210 (126 before this batch).

## Who uses it / what breaks without it
- **Used by:** the drafting session and every player, as 13e-7.
- **Breaks without it:** the bank stays at 126 categories, short of 210, so days repeat a category inside the 30-day gap.

## What the human decided
The overnight rules (HANDOFF, "Overnight rules"; 13e-7's ticket quotes each answer): "Everyday things (Recommended), Knowledge"; "Merge each on green, keep going"; "Today's rules, unclear ones wait (Recommended)"; "Allow, never the same day (Recommended)"; "Keep going toward 210"; "Drop it from the batch (Recommended)".

## Source
- **SOURCES.md, Open English WordNet (M13, D2):** each category a WordNet branch already loaded by `oewn-nouns`.

## Design
1. **24 WordNet categories** with bank questions: bone, muscle, kind of tooth (within bone), disease, vitamin, alloy, kind of rock, acid, polygon (within shape), holiday, mythical creature, kind of athlete, kind of scientist, kind of artist, kind of musician, kind of writer, title for a ruler, cactus, stringed, wind and percussion instruments (within musical instrument), branch of natural science, branch of mathematics, punctuation mark.
2. **Left out, for the human** (the overnight rules): god or goddess (WordNet's noun snapshot has no Zeus, Thor or Athena, so no 6 familiar host answers: "Drop it from the batch"); organ (WordNet's branch mixes body organs with crude slang entries) and crime (it includes sexual offenses): unclear for an all-ages game; poem (the same branch as the old verse form); virtue (it holds the old religion category); gas (14 members shared with weapon, as pastry in 13e-7).

## Acceptance criteria
- [x] 24 categories, each with 10+ members and a bank question; `npm run content:validate` OK.
- [x] Each `within` passes `load all`'s root check; a wrong one is refused.
- [x] The review's flags handled by the overnight rules; unclear ones listed in the PR.
- [x] Each new question drafts in a trial day; the simulator drafts 40 of 40 (after strengthening three lists).
- [ ] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass.

## Out of scope
- More batches (13e-9 onward); the left-out categories (for the human).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 10 members | The smallest category | 13e: the human, "10 members" |
| 20–30 a batch | Batch size | 13e: "Batches with flags (Recommended)" |
| 6 host answers | A question's host bank | The human, 2026-10-27: "Drop it from the batch" |

## Removes
- Nothing: it adds categories.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The overnight rule: a category that blocks the simulator is dropped | Natural science, aircraft and liquor strengthened instead (8 uncommon answers each) | The human's earlier choice for the same case ("Strengthen the two"); dropping would have removed two categories already merged |

## Evidence (2026-10-27, overnight, the Windows PC)
- **`within` refused when wrong:** a first `load all` had "kind of musician" within "kind of artist" → `Error: data/categories.json: musician says it's within artist, but its root isn't under artist's`, and nothing was defined (the transaction rolled back); without it, "DEFINED 151 categories", then 150 with god or goddess left out.
- **Bank:** 24 questions, every answer checked to name one member (a check query); "physics" and "gong" by ID (each name fits two things).
- **Categories** (`npm run base -- review`): bone 118, muscle 99, tooth 18, disease 612, vitamin 25, alloy 94, rock 77, acid 144, polygon 38, holiday 93, mythical creature 42, athlete 159, scientist 123, artist 74, musician 83, writer 72, ruler 48, cactus 31, stringed 48, wind 80, percussion 34, natural science 278, mathematics 51, punctuation 21; none under 10. Shared bank answers: "gong" (a chime also called gong) and "physics" (two senses), both given by ID.
- **LDNOOBW flags, kept as real names** (for the human to see): muscle "anal sphincter"; disease "smut" and its kinds (plant diseases), "sexually transmitted disease", "spastic colon" (an alias of irritable bowel syndrome); athlete "hooker" (a rugby position) and "swinger".
- **Trial drafts:** all 24 draft (each with tree, color, fruit, weather, candy and boat), files deleted after.
- **The simulator:** first **`DRAFTED 37 of 40`** (hypothesis 40: disproved): 2027-03-02 blocked at "Name a branch of natural science", 04-10 at "Name a kind of aircraft" and 04-13 at "Name a liquor" (13e-7's), at question 7. Strengthened rather than dropped, as the human chose for the monkey and V flower on 2026-10-27 ("Strengthen the two (Recommended)"): eight more uncommon answers each, every one a member. Then **`DRAFTED 40 of 40; subset questions 95 of 280`**.
- **Suites:** `npm test` 416; `npm run test:db` first failed in `src/game/runs.db.test.ts` at the file level (34 skipped), which passed alone ("34 passed") and in a full rerun ("Tests 266 passed (266)"); `npx supabase test db` 28 files, 435, PASS.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
