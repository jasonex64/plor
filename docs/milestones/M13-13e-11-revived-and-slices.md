# M13 13e-11 — Revived categories and slices

**Status:** in review (approved by the human, 2026-10-27: "I approve 13e-11's design as drafted. Build it."; built and reviewed on the Mac, 2026-10-27)

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

## Built (2026-10-27, the Mac)
- **The size line:** `load all` ends with `DATABASE <size>` (`scripts/base.ts`, `analyzeBase`).
- **30 categories** (226 in all): the six revived (gun `within` weapon, social science, writing implement, soft drink `within` beverage, branch of natural science, percussion instrument `within` musical instrument, the last two with 13e-8's questions); three new areas (building material, coin, vine); 21 slices: bird of prey, game bird, parrot, waterfowl (`within` bird); amphibian, crustacean, mollusk (`within` animal); beetle (insect); sword (weapon); conifer, palm (tree); legume, squash (vegetable); cookie (cake); breakfast cereal (breakfast food); shirt, trousers (clothing); hat (headwear); truck (vehicle); house (building); religious holiday (holiday).
- **From the reserves:** fern out (no 6 familiar fern names) for bird of prey; butterfly out (no monarch or swallowtail, and two "cabbage butterfly" things) for sword; jacket out (no everyday jacket names: denim, leather) for shirt; fruit juice out (9 members, under 10) for squash; tea held back (it shares a member with herb as well as beverage, and `within` takes one parent).
- **The review's flags:** "negro vine" (`oewn:13260634-n`) holds an LDNOOBW-listed racial slur as its shown name, with only Latin names besides, so it's a `drop` row in `data/listed.json` (the overnight rule, and 13e-9b's "drop it if it has none"). Kept as real names: "cock's eggs" (a plant), "blackcock" (a grouse). Listed for the human: "Saturday night special" (gun), a term with a disputed racist origin.
- **18 bank answers swapped** that named two things or the same thing twice (check-bank), among them 13e-8's percussion question's marimba (the same thing as its xylophone, as 13e-8's review found), now kettledrum.

## Acceptance criteria
- [x] `load all` ends with `DATABASE <size>`; the size before and after is recorded here (the hypothesis: under 1 MB more, as categories, links and bank questions add no rows of their own).
- [x] 30 categories in `data/categories.json`, each with 10+ members and a bank question; each slice `within` its parent passes `load all`'s check; `content:validate` OK; `check-bank` 0 problems.
- [x] `npm run draft -- simulate` drafts 30 of 30 (the hypothesis: 226 categories give 32 days of room; a capacity failure would disprove it, and swaps are listed).
- [x] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass; the PR lists what was left out and anything unclear.

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
| Design 3: four new areas incl. fern | Three; fern out | Fewer than 6 fern names players know |
| Design 4: butterfly, jacket, fruit juice, tea among the slices | Sword, shirt, squash, bird of prey from the reserves | The weak-list rule (Built above); tea's `within` would need two parents |
| Design 2: the revived questions as drafted | Percussion's marimba swapped | It names the host's xylophone (13e-8's review finding) |
| Design 4: cookie within dessert | Within cake | Cookie's root sits under cake, not dessert's root; cake is itself in dessert's family |
| Design 2: natural science revived as it was | Moved above branch of medicine, and medicine marked `within` it | WordNet files medicine under natural science: all 72 of medicine's members answer both (review) |
| 13e-9b: a slur LDNOOBW misses goes on Plor's list | "old squaw" and "hottentot(s) bread" as phrases, not the bare words | The words are in official names (Squaw Lake, Squaw Creek, Hottentot Teal); the human's answer |
| A listed shown name is renamed when a clean name is left | WordNet's old squaw (`01856511-n`) dropped, Wikidata's Long-tailed Duck linked under sea duck | It's in two sets with different shown names, so one rename can't fit both; the link keeps the bird in waterfowl and bird |

## Evidence
On the Mac, 2026-10-27.
- **Size, hypothesis "under 1 MB more":** held. Before: `323 MB` (13e-10's base plus the suites' rows). The first `load all` printed `DATABASE 337 MB`; the hypothesis looked disproved, then dead rows were checked (a second hypothesis: `n_dead_tup` was 255 on `thing_alias`, so it was wrong too), and the 14 MB was the session's scratch table `public.scout_member` (`pg_total_relation_size` 14 MB), dropped: `323 MB` again. After a fresh `db reset` and `load all`: `DATABASE 316 MB`, the same as 13e-10's fresh base.
- **The load, after the review's fixes** (a fresh `db reset`): `oewn-animals … 0 names and 2 items dropped`, `oewn-nouns … 19 names and 11 items dropped` (the slur vine, WordNet's old squaw, and an entry whose names were all "Hottentot bread"); `DATABASE 316 MB`; then the long-tailed duck's link (`LINKED … 115`), after which waterfowl and bird each hold it again (1 and 1), no alias holds either phrase, "squaw lake" is still a name, and medicine's 72 members are inside natural science. Before the fixes: `LINKED … 114`; `DEFINED 226 categories` with every `within` passing; exit 0.
- **check-bank:** `CHECKED 226 questions: 0 problems`, after the 18 swaps.
- **The review** (`npm run base -- review` on the 30): each has 10+ members (shirt 11, sword 12, soft drink 14 the smallest; fruit juice's 9 took it out); the flags above.
- **simulate, hypothesis "30 of 30":** held. `DRAFTED 30 of 30; subset questions 78 of 210`. Swaps on 11 days, most from 2027-01-18 on, when fewer questions are eligible; the lists swapped out most: aircraft, knot, meal, waterfowl, lamp, soup.
- **Final run, on the finished data** (after the link): `CHECKED 226 questions: 0 problems`; `DRAFTED 30 of 30; subset questions 79 of 210`.
- **Suites:** `npm test` 43 files, 430 passed; `npm run lint` and `npx tsc --noEmit -p .` clean; `npm run test:db` 40 files, 270 passed; `npx supabase test db` Files=28, Tests=435, PASS; `npm run test:e2e` 61 passed.

## Review
The `reviewer` agent, 2026-10-27, in a fresh context (it walked the WordNet snapshot for overlaps and slurs; nothing against the database).
- Blocking findings and how each was fixed: natural science holds all of branch of medicine (medicine now `within` it); "old squaw" (waterfowl) and "Hottentot bread vine" (vine) are slurs LDNOOBW misses (two phrases on Plor's list, the human's answer: "Just the two phrases (Recommended)"; WordNet's old squaw dropped and the long-tailed duck linked, as above); cookie's `within` and the status lines unrecorded (Source diff, ROADMAP and the handoff updated).
- Deferred to ROADMAP "Next revision" (From the 13e-11 review): one-member overlaps (toothpick in building material and tool; natural science with mathematics and social science); hat and clothing sharing 34 through headwear; a few weak host answers (work-shirt, bellbottom trousers, prairie chicken, puffed wheat, moving van); "Name a kind of trousers" and `name-a-amphibian`'s wording; "paddy wagon" (truck) listed for the human beside "Saturday night special".
