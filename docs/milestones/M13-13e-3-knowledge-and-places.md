# M13 13e-3 — Knowledge and places

**Status:** planned (2026-10-25). The human answered three rounds of guided questions; the design below waits for the human's approval.

## Goal
The second batch of 13e (`M13-13e-growing-the-categories.md`): about 20 knowledge categories from WordNet and 5 place categories from new Wikidata imports, with their bank questions, and the four lists that block days at Q7 reworked.

## Who uses it / what breaks without it
- **Used by:** the drafting session (13d), and every player who meets the questions.
- **Breaks without it:**
  - the bank holds 34 of the 210 categories a day every day needs (13e), and none of them are places, a kind the human asked for (13e: "Places");
  - soup, jewelry, footwear and cake block 9 of 40 simulated days at Q7 (13e-2 Evidence).

## What the human decided (guided questions, 2026-10-25)
Already decided:
- links fill WordNet's gaps, precisely ("Precise, drop the word (Recommended)", 13e-2);
- letters first (13e-2);
- 5–6 common and 4–6 uncommon answers per question, no theme tags, friendlier wording where it means exactly the category, LDNOOBW names flagged for the human (13e-2).

| Question | The human's answer |
|---|---|
| What the second batch covers | "Mix: WordNet + places (Recommended)" |
| When pop culture comes in | "Its own batch, next (Recommended)": 13e-4, with its own questions on freshness and which titles count |
| The four lists that block days at Q7 | "Yes, fix them here (Recommended)" |
| Which kinds of places | "Capitals", "Cities", "Natural features", "Regions" (all four) |
| Which entries a big place set keeps | "English Wikipedia article (Recommended)" |
| How many place categories | "About 5 (Recommended)" |
| Which 5, with all four kinds picked | "One of each (Recommended)": world capitals, US state capitals, US cities, rivers, Canadian provinces and territories. Mountains, islands, lakes, world cities and national parks wait for a later batch |

## Source
- **Wikidata** (SOURCES.md, M13 D2): things, English labels and aliases, the concept tree, closed lists checked against it; SPARQL limits. **Whether an item has an English Wikipedia article** comes from its sitelinks (`schema:about` in the query service). The SOURCES.md entry doesn't list sitelinks among what it covers (*unverified* that the read user manual covers them): read the query service's user manual on sitelinks before building, and ask the human to add it if it isn't there.
- **Open English WordNet** (SOURCES.md, M13 D2), **LDNOOBW** (M13 13b).
- **13e-1** (`data/categories.json`, the review), **13e-2** (links, letters first, the batch's rules).

## Claude's design (for the human to approve)
**1. Five Wikidata sets** in `scripts/base.ts`, each fetched into a snapshot with its manifest, as countries were (13a), and **measured for size before it's kept** (13e: "Some, in 13e (Recommended)"):
- **world capitals:** the capital (P36) of each of the 193 countries in `wikidata-countries`, under "capital city" (Q5119). Countries with several capitals keep them all;
- **US state capitals:** the capital (P36) of each of the 50 states in `wikidata-us-states`, under a root checked by its label, as `rootItem` does;
- **US cities:** instances of city of the United States (Q1093829) with an English Wikipedia article;
- **rivers:** instances of river (Q4022) with an English Wikipedia article;
- **Canadian provinces and territories:** instances of province of Canada (Q11828004) and territory of Canada (Q9357527), 13 in all.

The Wikidata IDs above are Claude's reading, *unverified*: each is checked by its label when fetched, and a wrong one stops the fetch. Places already loaded for 13b's facts check are the same things (same Wikidata IDs), so the new sets add their kind_of facts to them.

**2. About 20 WordNet knowledge categories** with their links where WordNet leaves common answers out, checked as in 13e-2: every answer resolves, no host answer sits above another familiar answer, and a trial draft. Candidates from 13e-2's survey: sport (179 members), weapon (204), fabric (290), dance (107), gemstone (56), and more of the same kind.

**3. The four weak lists** (soup, jewelry, footwear, cake) reworked toward shorter, varied answers, with the simulator rerun against 13e-2's 31 of 40.

**4. One PR**, which the human approves by merging, with the review output, the LDNOOBW flags and each import's measured size.

## Acceptance criteria
- [ ] Each Wikidata set fetched, its manifest committed, its size measured and reported (MB in the local database) before it's kept.
- [ ] About 25 new categories (about 20 WordNet, 5 places), each of at least 10 members, reviewed, with a bank question each.
- [ ] Every bank answer resolves to one member; no host answer sits above another familiar answer.
- [ ] Trial drafts succeed; the simulator drafts at least the 31 of 40 days of 13e-2.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql`, `npm run test:e2e`, `npm run content:validate` and CI pass.

## Out of scope
- Pop culture, card and board games (13e-4).
- Mountains, islands, lakes, world cities and national parks (a later batch).
- Combined traits ("a capital in Europe"): their own ticket, after the 200 (13e).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| **about 5** place categories | This batch | Human, 2026-10-25: "About 5 (Recommended)" |
| **about 20** WordNet categories | This batch | The rest of 13e's 20–30 per batch (human, 2026-10-24) |
| English Wikipedia article | Which entries big sets keep | Human, 2026-10-25: "English Wikipedia article (Recommended)" |
| **10** members at least | Every category | 13e (human, 2026-10-24) |

## Plan
1. The human approves this design.
2. Read the query service's user manual on sitelinks; confirm SOURCES.md covers it, or ask.
3. Fetch and measure the five sets; report the sizes; keep them.
4. The WordNet categories with links; the bank questions; the four lists.
5. The checks, the review, the PR.

## Removes
- The four weak lists' current answers (replaced). Otherwise it adds sets and categories, with nothing to remove: each set is a new source subset.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
