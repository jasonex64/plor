# M13 13e-5 — The base's shape

**Status:** in progress (2026-10-26): guided questions answered (below); the design approved (human, 2026-10-26: "Approve 13e-5's design. Read the Wikidata concept → taxon property and bring its SOURCES.md row."); the SOURCES.md row added ("Add it (Recommended)"). Pop culture moves from 13e-5 to 13e-6 and is written against this shape.

## Goal
Settle how the answer base names and links things before the remaining ~150 categories are written against it: one thing per real-world thing, no circles in the "kind of" tree, one function that walks the tree, and the rules for series and titles that 13e-6 builds.

## Who uses it / what breaks without it
- **Used by:** every player, since a category holding two "dog"s gives the typed word two answers; the drafting session, which today picks one of the two by ID (ROADMAP, For M13, "Merging across sources"); 13e-6 and every later batch, written once against a settled shape instead of reworked.
- **Breaks without it:**
  - doubles like "dog" stay: WordNet's synset links Wikidata's *concept* (Q144), and the animals set loads the *taxon* (Q26972265), so they never join (found in 13a-2's T1 drafting);
  - a circle in the "kind of" tree makes the host-answer pick keep nothing (ROADMAP, 13a-2 review: `pickAnswer`), and joins and series links make one likelier; the import doesn't refuse them;
  - the walk is written five times (`private.category_members`, `private.base_lookup`, `private.ancestors_as_of`, `approve_puzzle`'s caught set, the review query: ROADMAP, 13a-1 and 13a-2 reviews), so joins would have to be right in five places.

## What the human decided (guided questions, 2026-10-26)
Asked after Claude's answer to "can you tell me if u think growing the answer database this big so early is bad if we havne't fully defined the shape of it".

| Question | The human's answer |
|---|---|
| When the shape is settled | "Before 13e-5 (Recommended)" |
| How doubles like "dog" are fixed | First "i need tradeoffs and simpler wording to decide"; then "Auto-join on import (Recommended)" |
| How a wrong join is caught | "Review lists odd joins (Recommended)" |
| Circles in the "kind of" tree | First "lower level language"; then "Yes, check on import (Recommended)" |
| Series or entries, for pop culture | "series covers entries only if it isnt too much work and wont interfere with other categories or cause trouble" |
| Franchises across media (Pokémon) | "Skip cross-media series" |
| Titles | "Very lenient (Recommended)": "Lion King" = "The Lion King", "Breath of the Wild" = "Zelda: Breath of the Wild", "Mario Kart 8" = "Mario Kart Eight" |
| Two things sharing a short title in one category | "The better-known one (Recommended)": the one with more Wikipedia articles across languages (Wikidata's sitelink count) |
| What else goes in this sub-ticket | "One tree-walk function" (removed-row readers stay in ROADMAP) |
| Hosted storage | "Load all, pay when near" (DECISIONS.md Log, 2026-10-26) |
| A word naming several taxa (cat 2, cattle 5, rabbit 9; asked after reading Wikidata) | "Join only clear cases (Recommended)": join when exactly one linked taxon is loaded, otherwise print it in the review |
| P13176/P14067's SOURCES.md row | "Add it (Recommended)" |

Correction recorded with these: ROADMAP's Design review item 1 (a popularity tier per entry for the host's dodge) was replaced in 13c by host answers drawn at random from the bank (13c ticket, "How dodges get onto a day"), so it isn't a shape question.

## Source
- **The M13 ticket:** D2 (the sources, reviewed snapshots), D3 (Plor's own IDs, each linked to its source's), D6 (lenient aliases, one typo, two-entry ties a retry).
- **SOURCES.md, Wikidata (M13, D2)** and **Open English WordNet (M13, D2):** where joins and series links come from.
- **SOURCES.md, Wikibase RDF Dump Format, Sitelinks (13e-3):** the sitelink count that picks the better-known title.
- **SOURCES.md, Wikidata common-name link (13e-5):** P13176 and its inverse P14067, added by the human's OK (2026-10-26).
- **Not yet in SOURCES.md:** the property for "part of the series" and the class that marks a single-medium series; Claude brings their row with 13e-6, before its code.

## Claude's design (approved by the human, 2026-10-26)
**Built in 13e-5** (each has a caller today):
1. **Auto-join.** The WordNet import's `same_as` already joins a synset to a loaded Wikidata thing (`scripts/base.ts`). It's extended to follow P13176 from a common-name item to its taxon, so a synset naming Q144 joins the loaded Q26972265: one thing, both sets of names and facts. **Only clear cases join:** when exactly one of the taxa the item names is loaded. Otherwise nothing joins, and the review prints the word with its taxa for a person to fix by hand (human, 2026-10-26: "Join only clear cases (Recommended)"). How a hand fix is written is settled in the build: `data/links.json` holds "kind of" links today, and whether it can carry a join is *unverified*.
2. **Odd joins in the review.** `npm run base -- review` prints every join where the two sides share no name, or where the WordNet side sits outside the WordNet branch matching the Wikidata set's root (an animal joined to a WordNet food). A person checks the list in the PR.
3. **Circles refused.** `private.import_source` refuses an import that would close a circle in "kind of", naming it, and nothing loads (fail loudly).
4. **One walk.** One function per direction (down: a root's members; up: a thing's ancestors), used by the five places above.

**Decided now, built in 13e-6** with the first data that uses them (build for today: nothing calls them before pop culture loads):
5. **Series.** A single-medium series (one whose Wikidata class marks it as a series of one kind of work) is a thing, and its entries are "kind of" it, so a host saying "Mario Kart" catches "Mario Kart 8", as "bear" catches "polar bear". A franchise spanning media is no series: its entries stand alone. If reading Wikidata shows this takes more than the import's one extra link, or touches categories outside pop culture, Claude stops and asks (the human's condition).
6. **Titles.** Aliases drop a leading "the"/"a"/"an", take the part after a subtitle's colon and the part before it with the subtitle, and spell numbers both ways. When a short form fits two members of one category, it goes to the one with more sitelinks; the other keeps its full title.

## Reading Wikidata (2026-10-26, on the Mac)
**Hypothesis:** Q144 and Q26972265 link by a direct statement, likely P460 "said to be the same as" or a subclass link. **Result:** a direct link, by neither guess: Q144 has **P13176 "taxon known by this common name"** ("taxon item to which this common name refers") to Q26972265, and Q26972265 has its inverse, **P14067 "common organism"** ("organisms known by this common name"); each property names the other by P1696 "inverse property". Queries run against `query.wikidata.org` the same day:
- **P13176 is sparse:** 875 statements in all of Wikidata.
- **Most common animals aren't split:** "horse" (Q726), "lion", "tiger", "pig", "chicken", "maize", "tomato" are taxa themselves (P31 Q16521), so WordNet links the loaded thing directly (*unverified* against the snapshots, which aren't on this Mac).
- **The split ones often name several taxa:** dog 2 (Canis lupus familiaris, Canis familiaris), cat 2, cattle 5, cow 4, rabbit 9 genera, bear 2 (Ursidae and brown bear), mouse 2 (Gliridae, jumping mice); sheep, bee and duck 1 each. So "follow the link" isn't one-to-one: joining a concept with every taxon it names would fold separate taxa into one thing.
- Apple, banana and rice are neither taxa nor P13176 concepts among the items with over 50 sitelinks; their joins are out of this sub-ticket's reach and stay as they are.

How a concept naming several taxa joins is put to the human (below).

## Acceptance criteria
- [x] The Wikidata rows (concept → taxon) are in SOURCES.md with the human's OK before code (P13176, P14067; 2026-10-26).
- [ ] The review prints every common-name item that names more than one loaded taxon, unjoined.
- [ ] After `npm run base -- load all`, "dog" names one member of `animal` (and of every category holding it), carrying WordNet's and Wikidata's names (db test on fixtures; the real count in the review output).
- [ ] `npm run base -- review` prints odd joins; its output on the full load is in the PR.
- [ ] An import that closes a circle fails, names it, and leaves the base unchanged (pgTAP).
- [ ] The five walks call one function per direction (diff), and `npm test`, `npm run test:db`, `npx supabase test db` and `npm run test:e2e` pass.
- [ ] Every one of the 40 simulated days that drafted before still drafts.
- [ ] A fresh `load all`'s database size is measured and recorded (for "Load all, pay when near").

## Out of scope
- Series and titles' code (13e-6).
- Readers that skip `removed_at`, and the rest of ROADMAP's For M13 items (the human: "One tree-walk function" only).
- Pop-culture categories.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| None | Joins, circles and the walk need no tuning value; the title clash compares sitelink counts with no threshold | — |

## Plan
1. The human approves this design. Claude reads the Wikidata property pages and brings the SOURCES.md rows.
2. **Hypothesis:** following the concept → taxon link joins most WordNet animal synsets that link a Wikidata concept, and few joins are odd. Expected: "dog", "cat", "horse" join; odd joins are a short list a person can read. **Disproved if** the odd list is too long to read in a PR, or common animals still have doubles: then stop and re-ask. *Partly tested 2026-10-26 (Reading Wikidata): the link is P13176, and it often names several taxa, which the human settled; the counts against the loaded base wait for the snapshots on this Mac.*
3. Migration: the one walk, the circle check in `import_source`. Then the import's join, the review's odd list.
4. Full load, the suites, the 40 trial drafts, the size.
5. Review by the `reviewer` agent; blocking findings fixed, the rest to ROADMAP.

## Removes
- Four of the five copies of the walk.
- The second "dog" (and every concept/taxon double) and the drafting session's pick by ID.
- ROADMAP For M13 items it closes: the membership walk written three times (13a-1), the kind_of walks (13a-2), merging across sources (13a-2), imports not refusing cycles (13a-2).
- ROADMAP's Design review item 1, marked replaced by 13c.
