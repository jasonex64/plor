# M13 13e-5b — Wikidata's own doubles

**Status:** planned (2026-10-27): guided questions answered (below, four rounds); a scaling check measured and folded in (chains, loops, forks, the review's size, one data file for hand decisions); the design, its SOURCES.md row, the retired-ID table and the sitelinks rule for loops and P2959 wait for the human's approval.

## Goal
One thing per real-world thing when Wikidata itself holds two items for it (one species under an old and a new scientific name, two pages that can't merge), so a typed name lands on one thing and a retired ID still finds it.

## Who uses it / what breaks without it
- **Used by:** every player, whose "dog" or "cat" should be one answer with one rarity; the drafting session, which today must pick one twin by ID; 13e-6 and every later batch, which load more Wikidata items.
- **Breaks without it:**
  - in `animal`, 4,211 names sit on two or more Wikidata-only things (2026-10-27, the Windows PC's full load). 749 of those are fully linked by Wikidata's own synonym marks, so they're one species twice; the rest are mostly different species sharing a name (a sample of 28: about 60% different species, about a third one species under an old and a new genus that Wikidata doesn't mark);
  - a twin left over splits a thing's answers and rarity between two IDs (`pickAnswer` makes a shared name one answer, `src/game/matching.ts`, but the counts and the host's catch see two things);
  - 13e-5's joins retired three IDs the bank named (killer whale, giraffe, horse) and two the T1 day still names; any merge retires one more, and a saved day naming it would no longer find its thing.

## What the human decided (guided questions, 2026-10-27)
Asked after 13e-5's review lists showed "dog" with two loaded taxa (human: "Next sub-ticket (13e-5b)").

| Question | The human's answer |
|---|---|
| What players get when Wikidata holds two items for one species | "for dog it should just be dog, and for northern shoveler do whatever u feel is best": one thing (Claude's reading: merge, as joins do) |
| How two items are known to be one | "Wikidata's mark + review (Recommended)" |
| Whose ID a merged thing keeps | "The current name (Recommended)" |
| 13e-5's migration on plor.app | "Push now (Recommended)": done (13e-5 Status) |
| The shown name after a merge | "WordNet's word first (Recommended)": WordNet's everyday word when WordNet names the thing, else the kept item's English label |
| Which leftovers a person looks at | "Only names players meet (Recommended)" |
| Which sets | "Every Wikidata set" |
| When merged items' facts disagree | "Kept item's facts win (Recommended)": the old item brings its names, not its facts |
| P460 "said to be the same as" ("uncertain or disputed") | "Review list only (Recommended)"; P2959's certain duplicates merge |
| Unmarked old-genus pairs (*Sylvia* / *Curruca althaea*) | "Review only (Recommended)": no guessing rule |
| What "players meet" means | "Bank answers (Recommended)": names that are a host or uncommon answer in `content/bank.json` |
| Where the review list is decided | "here, and summarize what i did more understandably": in chat, one by one, as on 2026-10-27 |
| Today's 30 decisions (13e-5) as merges | "Yes, count them (Recommended)": each pair merges, the current-name item keeping its ID |
| What a retired ID does | "Keep pointing (Recommended)" |

## Reading Wikidata (2026-10-27, the Windows PC)
**Hypothesis:** taxa carry a synonym property, and other items use P460 or P2959; disproved if those properties mean something else or link too few loaded pairs to help (under a tenth of the shared names). **Result:** held for taxa, weak elsewhere. Read with `wbgetentities` the same day:
- **P12763 "taxon synonym of"**: "name considered a preferred name, of which this item's taxon name is a synonym"; inverse **P1420 "taxon synonym"**; both for taxa (subject type Q16521). Among loaded items: 1,039 P1420 and 438 P12763 statements, 980 distinct pairs, fully covering 749 of `animal`'s 4,211 shared names (18%) and partly 38.
- **P460 "said to be the same as"**: "though this may be uncertain or disputed"; 44 loaded pairs in animals, 114 in places, 36 in rivers, 15 elsewhere.
- **P2959 "permanent duplicated item"**: "this item duplicates another item and they can't be merged, as one Wikimedia project includes two pages"; 6 loaded pairs, all in places.
- dog: Q26972265 (*Canis lupus familiaris*) lists Q20717272 as its synonym, so Q26972265 keeps its ID (13e-5's pick agrees). cat: Q57818409 (*Felis silvestris catus*) is a synonym of Q20980826 (*Felis catus*), so Q20980826 keeps its ID, and 13e-5's pick (Q57818409, more articles) follows it. Northern Shoveler (Q28106731 / Q25940): no mark; it merges by the human's 13e-5 decision.

**Proposed SOURCES.md row** (needs the human's OK before code): "Wikidata sameness marks (M13 13e-5b)": https://www.wikidata.org/wiki/Property:P12763, https://www.wikidata.org/wiki/Property:P1420, https://www.wikidata.org/wiki/Property:P460, https://www.wikidata.org/wiki/Property:P2959, read 2026-10-27; what each says, as above.

## Scaling check (2026-10-27, asked by the human before approving: "verify this design is scalable and will work as we make more and more questions and categories")
Measured on the Windows PC's full load:
- **The marks:** 983 merge pairs (taxon synonyms and P2959), **0 across two sets** (every pair is inside one set's snapshot). **178 items sit in chains** (A is B's old name, B is C's), the longest 2 steps; **166 items sit in two-way loops** (Wikidata marks each as the other's synonym, about 83 pairs), so "the current name" isn't defined for them; **10 old names point at two different current names** (forks).
- **The review's size:** of the bank's 904 answers (82 questions), 1 of 782 named answers names two members ("blue whale" in `whale`), because the draft refuses such a name, and **86 of the 122 answers given by ID share a name with another member**: about 1 answer in 10. They mix Wikidata twins (Dog, cat), WordNet's own senses ("love", "fear" in `feeling`; "dress" in `clothing`) and different things sharing a name ("lira", "robin").
- **What grows with more questions and categories:** each batch's new bank answers (about 1 in 10 to look at: a batch of ~25 categories with ~11 answers each brings ~25–30, most of them "different things", decided once); each new Wikidata set's marks (one more batched query in its fetch, as P13176 and P141 are read); the retired-ID table (one row per merge: ~1,000 for today's sets). Categories are recipes over the one base, so a merge made once is seen by every category, old and new. Nothing in the design is per category.

## Claude's design (for the human's approval)
1. **Merges at fetch.** Each Wikidata set's fetch reads P12763/P1420 and P2959 among its items (as 13e-5's fetch reads P13176) and folds each marked old item into the kept one in the snapshot: the kept item gains the old one's names as synonyms, keeps its own facts, and the old item's children in the tree point at the kept item. A merged-away item stays in the snapshot as `merged_into: <kept ID>`, so the load can record it (item 3). From the scaling check:
   - **chains fold to their end** (A → B → C: A and B both into C);
   - **a fork** (one old name, two current names) **doesn't merge**; it goes to the review, as 13e-5's "only clear cases";
   - **a pair across two sets** (none today) stops the fetch, naming it, until one appears and its handling is decided (build for today).
2. **Hand decisions in one data file,** `data/sameness.json`, read and checked at the disk boundary, instead of growing code constants: `merge` (the human's 30, and the review's yeses), `apart` (two things sharing a name, so the review never asks again), and 13e-5's WordNet `split` and `pick`, moved out of `OEWN_ANIMALS_HAND`. Each must still fit the data, or the fetch stops naming it, as today.
3. **The current name keeps its ID**: the item the synonym statement names as preferred (P12763's object, P1420's subject), at the end of a chain. Where none is named, a P2959 pair or a **two-way loop** (~83 pairs), the one with more sitelinks keeps its ID (the title rule's "better-known one"), *a choice for the human to confirm*.
4. **Retired IDs keep pointing** (a hard-to-reverse change: persisted data and format 3's "permanent thing IDs"; a DECISIONS.md entry before code): a table `private.thing_retired (id, thing_id, retired_at, source_ref)` written by `import_source`, and every reader that takes a thing ID from a file (the bank's `#<id>` answers, a day's thing IDs) resolves it through the table. The three bank answers made names in 13e-5 stay names; the T1 day's two retired IDs then resolve again. Whether `plor_app` needs a grant on it is settled in the build, and if it does it's a **security change** for the human.
5. **WordNet's word as the shown name**: when a WordNet item joins a thing, the thing's name becomes WordNet's word ("dog", not "Dog"). A change in `import_source`'s rename (a migration).
6. **The review's new list**, `npm run base -- review`: per category, names on two or more members that are a host or uncommon bank answer of that category (given by name or by ID), P460 pairs and forks among its members whose names are bank answers, leaving out pairs `data/sameness.json` already decides; each with both items' scientific names, ranks and sitelinks, for Claude to put to the human in chat with a recommendation: merge (one thing) or apart (different things; the bank keeps naming its one by ID). WordNet's own senses ("love" twice in `feeling`) come up here too and are decided apart; merging WordNet senses stays out of scope.

## Acceptance criteria
- [ ] The SOURCES.md row is in with the human's OK before code.
- [ ] After a fresh `load all`, Wikidata's marked pairs and the human's 30 are one thing each: in `animal`, "dog", "cat" and "northern shoveler" each name one member, shown as WordNet's word (db query; the counts in the PR).
- [ ] A merged thing keeps the current name's ID and its facts, and carries both items' names (pgTAP or db test on fixtures).
- [ ] A retired ID resolves to its thing wherever a file names a thing by ID (the bank's `#` answers, a day's IDs), tested; the T1 day's two retired IDs resolve.
- [ ] A stale hand decision stops the fetch, naming it; chains fold to their end; a fork isn't merged; a pair across sets stops the fetch (unit tests).
- [ ] `data/sameness.json` holds every hand decision, `OEWN_ANIMALS_HAND` is gone, and a decided pair isn't listed again by the review.
- [ ] The review prints the bank-answer leftovers and P460 pairs; the human decides them in chat, and the decisions are applied.
- [ ] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass; the simulator drafts the 39 of 40 it drafts today.
- [ ] A fresh `load all`'s size is measured.

## Out of scope
- Merging by name, genus or any guess (the human: "Review only").
- Leftover doubles no bank answer names (the human: "Bank answers").
- Pop culture (13e-6).
- Loading plor.app's answer base (M15).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| None | Merges follow Wikidata's marks and the human's decisions; the P2959 side compares sitelinks with no threshold | — |

## Plan
1. The human approves this design, the SOURCES.md row and the retired-ID table (DECISIONS.md entry).
2. **Hypothesis:** folding the marked pairs and the 30 removes most one-species doubles in `animal`; expected: the 749 fully linked names each name one member after the load, and the leftover bank-answer list is short enough for chat (tens, not hundreds). **Disproved if** a merge closes a circle (`import_source` refuses), or the leftover list runs to hundreds: then stop and re-ask.
3. Migration: `private.thing_retired`, `import_source` recording it and renaming to WordNet's word, the readers resolving through it.
4. The fetches' marks and the hand merges; re-fetch the Wikidata sets on this PC (the human copies the changed snapshots to the Mac).
5. Full load, the review's list decided in chat, the suites, the simulator, the size.
6. Review by the `reviewer` agent; blocking findings fixed, the rest to ROADMAP.

## Removes
- The one-species doubles Wikidata marks (749+ names in `animal`) and the human's 30 twins.
- `OEWN_ANIMALS_HAND` (moved to `data/sameness.json`), and its picks that become plain joins once their twins merge.
- ROADMAP's 13e-5 second-review item on retired IDs; the HANDOFF's waiting T1 question.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
