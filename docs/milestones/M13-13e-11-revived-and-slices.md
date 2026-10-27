# M13 13e-11 — Revived categories and slices

**Status:** planned, waiting for the human's approval (drafted 2026-10-27 from two rounds of guided questions)

## Goal
30 more categories with bank questions (196 → 226), so `npm run draft -- simulate` drafts 30 days in a row (13e's stop rule); and `load all` prints the database's size.

## Who uses it / what breaks without it
- **Used by:** the drafting session and every player, as 13e-7 to 13e-10; the size line is used by whoever loads a base.
- **Breaks without it:** simulate drafts 28 of 30 at 196 categories; the 2 failures are `only 0 bank questions ask a category not used within 30 days` (13e-10b's Evidence). Without the size line, the base's growth toward the plan's limit (DECISIONS.md Log, Storage: the human warned near 500 MB) is measured only when someone remembers.

## What the human decided (2026-10-27)
Round 1:
- Size: **"30 and keep track of database size"**.
- **"Bring them back (Recommended)"**: the six left out only for blocking the simulator (gun and social science, writing implement and soft drink from 13e-9; branch of natural science and percussion instrument from 13e-8), since 13e-10b's swap now handles a blocking question on the day.
- The rest: **"Narrower slices (Recommended)"**: `within` categories, never asked on the same day as their parent.

Round 2:
- Tracking: **"load all prints it (Recommended)"**: `npm run base -- load all` ends with the database's size, and each batch's ticket records it before and after.
- Slice groups: **all four**: birds, other animals, plants and food, things to wear and use.

Unchanged: new areas first (13e-10), 10 members at least, 6 familiar host answers each naming one member, LDNOOBW and Plor's flags reviewed, a weak list left out and listed in the PR, the human merges each batch.

## Source
- **SOURCES.md, Open English WordNet (M13, D2):** each category a WordNet branch loaded by `oewn-nouns`.
- **13e-8 and 13e-9's tickets** for the revived six, their roots and the bank questions drafted then.
- **PostgreSQL `pg_database_size`** for the size line (the measure used in the handoff since 13e-5).

## Design
1. **The size line:** after `ANALYZED`, `load all` prints `DATABASE <size>` from `pg_size_pretty(pg_database_size(current_database()))`.
2. **Six revived categories** with their earlier bank questions, re-checked by check-bank and the review.
3. **Four new areas** (no category covers them; measured 2026-10-27 on the Mac's base): building material (`14810638-n`, 101), coin (`13409418-n`, 43), fern (`11566165-n`, 177), vine (`13121436-n`, 275).
4. **20 slices**, each `within` its parent, chosen across the four groups from (members):
   - birds, within bird: game bird (49), parrot (21), waterfowl (69), wading bird (127), bird of prey (346);
   - other animals: amphibian (107), crustacean (82), mollusk (87) within animal; beetle (65), butterfly (38) within insect;
   - plants and food: conifer (164), palm (48) within tree; legume (`07724543-n`, 39), squash (`07731306-n`, 17) within vegetable; tea (`07949514-n`, 12), fruit juice (10) within beverage; cookie (31) within dessert; breakfast cereal (`07718541-n`, 18) within breakfast food;
   - things to wear and use: jacket (27) within coat; shirt (12), trousers (29) within clothing; boot (12) within footwear; hat (34) within headwear; truck (26) within vehicle; house (`03549540-n`, 61) within building; sword (13) within weapon; religious holiday (63) within holiday.
   The 20 are the ones whose prompts fit and that have 6 familiar host answers; the rest are reserves for a list that drops.
5. **Left out** (scouted): shrub (shares flower), fastener (holds knot), gas (shares weapon and fuel), pastry and pie (share dessert outside its tree), citrus fruit (WordNet's, its names already answer Wikidata's fruit), motor vehicle (holds car), mushroom (10 morels only).
6. **Families** aren't a constraint: 138 families over 196 categories, the largest video game with 13, and a day holds one per family.

## Acceptance criteria
- [ ] `load all` ends with `DATABASE <size>`; the size before and after is recorded here (the hypothesis: under 1 MB more, as categories, links and bank questions add no rows of their own).
- [ ] 30 categories in `data/categories.json`, each with 10+ members and a bank question; each slice `within` its parent passes `load all`'s check; `content:validate` OK; `check-bank` 0 problems.
- [ ] `npm run draft -- simulate` drafts 30 of 30 (the hypothesis: 226 categories give 32 days of room; a capacity failure would disprove it, and swaps are listed).
- [ ] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass; the PR lists what was left out and anything unclear.

## Out of scope
- The other left-outs waiting on the human (toy, cosmetic, berry, nut, god or goddess, organ, crime, letter): not chosen this round.
- A warning near the hosted plan's limit (ROADMAP, For M15).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 30 categories | The batch | Human, 2026-10-27: "30 and keep track of database size" |
| 30 consecutive days | The stop check | 13e-10: "When 30 days in a row draft (Recommended)" |
| 10 members, 6 host answers | Each category | 13e and the overnight rules |

## Plan
1. The human approves this ticket.
2. The size line; size before.
3. The revived six, the four new areas, the slices; bank questions; `load all` (a reset if a drop needs it), the review, check-bank.
4. simulate; the suites; the `reviewer` agent; one PR for the human.

## Removes
- Nothing in code; the six revived categories leave the "left out" lists of 13e-8 and 13e-9's tickets and ROADMAP.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
