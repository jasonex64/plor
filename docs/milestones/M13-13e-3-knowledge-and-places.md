# M13 13e-3 — Knowledge and places

**Status:** in progress (2026-10-25): built and reviewed; the review's blocking findings are fixed. The human answered the river short names and the LDNOOBW flags (below), rivers are re-fetched with both, and the re-checks and the PR wait on the other snapshots reaching the Mac (`data/snapshots/` is on the Windows checkout only). The design is approved (human, 2026-10-25: "I approve 13e-3's design. Build it."). The sitelinks source is in SOURCES.md ("Add it to SOURCES.md (Recommended)": Wikibase RDF Dump Format, 1.10 Sitelinks).

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
| **While building:** the source for "has an English Wikipedia article" | "Add it to SOURCES.md (Recommended)": Wikibase RDF Dump Format, 1.10 Sitelinks |
| Items Wikidata names only with a "mul" label (Juneau, 6 US cities, 37 rivers) | "Use mul when no English (Recommended)", with Wikidata's help page added to SOURCES.md |
| Rivers named "Mississippi River" with no short alias | "Yes, for rivers (Recommended)": "X River" and "River X" also give "X" |
| Soup, which no list gives room at Q7 | "soup can be in the questions 1-6 or wherever it can work and just not have it as q7", then "Move any blocker earlier (Recommended)" |
| **After the review:** river short names that make generic words rivers ("little" on 64 rivers) | "Skip shared names (Recommended)": a short name two or more rivers give is skipped |
| The batch's LDNOOBW flags (Evidence) | "Drop the slur, keep rest (Recommended)": Pūkio Stream's (Q32298578) listed alias is dropped; every other flagged name stays typeable |

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

**What building changed** (each from the human's answers above, or the checks):
- US cities are instances of city in the United States *or a subclass* (P31/P279*): Los Angeles is only a "charter city", and Philadelphia only a "city of Pennsylvania", in Wikidata.
- `labelled` reads mul labels when there's no English one; the rivers set adds short names (`riverShortNames`), only those a single river gives, and drops the listed aliases of the rivers in `RIVERS_DROP_LISTED_ALIASES` (named by ID, so the slur stays out of the repo).
- Four WordNet roots were widened after the gap check: religion (05955536-n, the belief sense, where Christianity is), currency (monetary unit 13625961-n, where euro and yen are), feeling (00026390-n, where hope and grief are) and boat or ship (vessel 04537861-n, where sailboat and yacht are).
- 17 more links (bowling and fencing → sport, pearl and amber → gem, six native elements → mineral, storm, cloud and lightning → weather, time unit → unit of measurement, food fish → seafood, bomb → weapon, techno → music genre), 105 in all.
- The draft moves a question that blocks the letters one place earlier and tries again (`moveEarlier`), so soup, dinosaur, monkey and Canadian provinces, which have no room at Q7, still draft.
- The footwear, cake and jewelry lists were reworked toward short host names; soup kept its list and moves earlier instead.

## Acceptance criteria
- [x] Each Wikidata set fetched, its manifest committed, its size measured and reported (MB in the local database) before it's kept.
- [x] About 25 new categories (about 20 WordNet, 5 places), each of at least 10 members, reviewed, with a bank question each.
- [x] Every bank answer resolves to one member; no host answer sits above another familiar answer.
- [x] Trial drafts succeed; the simulator drafts at least the 31 of 40 days of 13e-2.
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
- The footwear, cake and jewelry lists' old answers (replaced).
- English-only labels in Wikidata imports (`labelled`).
- Strict easiest-first as the only order in the draft (a blocking question moves earlier).
- River short names several rivers give, and Pūkio Stream's listed alias.
- Tests and lint reaching into another session's worktree under `.claude/worktrees/` (ROADMAP Housekeeping, pulled in: on the Mac, the M14 worktree there doubled `npm test`'s files and gave `npm run lint` 320 problems).
Otherwise it adds sets and categories, with nothing to remove: each set is a new source subset.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Wikidata labels in English (the SOURCES.md entry's "English labels and aliases") | English, else "mul" | Wikidata moved some names to mul (Juneau's English label removed 2026-09-28 as "redundant"); its help page says English falls back to mul. The human's OK, 2026-10-25 |
| City in the United States (Q1093829) | Q1093829 and its subclasses | Los Angeles and Philadelphia are only in subclasses |
| Rivers' Wikidata names | Plus "X" for "X River" and "River X", when no other river gives "X" | Players type "Mississippi"; a shared "X" (Little, Black) would be a dodge; the human's OK for both |
| Rivers' Wikidata aliases | Less Pūkio Stream's LDNOOBW-listed alias | It is a racial slur; the human's call |

## Evidence
**Local stack, 2026-10-25.**
- **The imports, measured** (`pg_database_size` before and after each load): world capitals 199 members, about 0.1 MB; Canadian provinces and territories 13 (the dissolved District of Keewatin filtered out), under 0.1 MB; US cities 10,761 with an English Wikipedia article, about 11.6 MB with the first, narrower query (`P31 Q1093829`, 9,382 items; the subclass query added 1,280 things and 5,215 aliases); rivers 40,920, about 38 MB; US state capitals 50. The local database went from 236 to about 287 MB (plor.app's Free plan holds 500 MB).
- The state capitals fetch first stopped loudly (`49 capitals for 50 states`): Alaska's capital, Juneau (Q29445), has only a mul label on Wikidata (edit by MSGJ, 2026-09-28: "Remove all redundant labels/aliases same as mul label"). After the mul fallback: 50.
- `npm run base -- load all`: `LINKED data/links.json: {"links":105,…}`, `DEFINED 60 categories from data/categories.json`.
- `npm run base -- review` on the 26 new categories: sport 187, weapon 236, fabric 290, dance 107, gemstone 59, mineral 284, music_genre 96, language 768, religion 108, currency 406, feeling 448, weather 147, dinosaur 51, monkey 71, shark 39, whale 31, shape 63, unit 914, seafood 151, boat 190, verse_form 39, us_state_capital 50, world_capital 199, us_city 10,761, river 40,920, canadian_province 13 members.
- **LDNOOBW flags, for the human:** weapon 1 (butt shaft), fabric 1 (fag end), dance 1 (nude dancing), music_genre 2 ("negro spiritual", scat), feeling 8 (sexual feelings such as erotic love, sadism, nymphomania), boat 1 (destroyer escort), us_city 3 (Cumming, Hooker, Coon Rapids), river 32 (place names such as Dick Brook and Rio Negro, and **a Hawaiian stream, Pūkio Stream, whose Wikidata alias is a racial slur**).
- Every bank answer resolves to one member (Wikidata places by the lowest Q-number among same-named members: Mississippi River Q1497, River Thames Q19686, Chicago Q1297), and no host answer sits above another familiar answer (scratch check).
- Trial drafts (files deleted after): 2026-10-26 to 10-31 and 11-24 drafted, seven days in a row with no letter failure; 11-01 stopped on the gap, `only 4 bank questions ask a category not used within 30 days; 3 more needed` (60 − T1's 7 − 49).
- The full-day simulator (40 dates): **36 of 40** (13e-2: 31). The 4 failures block at Q7: cheese 2, bread 1, flower 1.
- `npm test` 255 passed, `npm run lint` 0 errors, `npx tsc --noEmit -p .` clean, `npm run test:db` 235 passed, `npm run test:sql` PASS (345), `npm run test:e2e` 27 passed, `npm run content:validate` OK. CI: in the PR.

## Review
**Reviewer agent, fresh context, 2026-10-25.**
- Blocking findings and how each was fixed:
  - the reorder moved the wrong question once a blocker reached the slot that covers Q5 and Q6 (`held` is a slot boundary): replaced by `fitOrder`, which moves each question of the stopped slot to each earlier place, nearest first, with `blockRange` and `moveTo`, and unit tests with a stand-in for the letters;
  - `labelled`'s English-over-mul choice had no test: the row fold is `foldLabels`, tested in either row order;
  - the "time unit" link made birthday and yesterday units, and iron and graphite brought in cast iron and "pencil" as minerals: time unit is replaced by its true units (second, minute, hour, half-hour, quarter-hour and the sub-second ones); iron and graphite are dropped, and their facts were deleted from the local database by hand; mineral's host bank takes halite for iron;
  - this ticket's Status line: updated.
- **Answered by the human (2026-10-25, the Mac session):** river short names made generic words rivers ("little" on 64 rivers, "black" 49, "white" 25, "north" 21, "big" 17, "la" from the LA River, "branch", "fork", "creek", "de"), a dodge: "Skip shared names (Recommended)". With it, in the re-fetched snapshot (40,923 rivers, 2026-10-25T19:57Z, `wikidata-rivers` manifest): little, black, white, north, big and branch name no river; la, fork, creek and de each name one, as one river alone gives them. Mississippi, Thames, Missouri, Ohio, Hudson, Columbia, Yukon, Mekong, Yangtze, Jordan, Niger, Potomac and St. Lawrence ("st lawrence" and "saint lawrence", Wikidata's own aliases of Q134750) each still name one river; **Colorado, Congo, Red and Snake no longer name any**, as several rivers give each (for the human to see in the PR). All 11 answers of `name-a-river` still resolve to one river. Pūkio Stream's aliases are now "pukio stream" and its plural only.
- Deferred to ROADMAP "Next revision" (for the human to see in the PR): the widened roots bring generic members (feeling: thing, state, soul, harassment, nationalism; boat or ship: bottom, shell, wreck, hulk; religion: theism, mysticism); gold and silver bring green gold and coin silver; Malabo is missing (Equatorial Guinea's capital is Ciudad de la Paz in Wikidata); Pago Pago and Charlotte Amalie come in as US cities; the older sets' `method` strings predate the mul fallback.
- **Not yet re-run after the fixes:** the trial drafts, the simulator (36 of 40 was before `fitOrder`), `npm test` (255 before the new tests), the db, SQL and e2e suites.
- **Re-run on the Mac (2026-10-25), after the river answer, which need no snapshots:** `npm test` 40 files, 260 passed, none under `.claude/worktrees/`; `npm run lint` clean; `npx tsc --noEmit -p .` clean; `npm run content:validate` OK. test:db, test:sql and test:e2e run in CI (a fresh stack; the Mac's shared stack carries M14's uncommitted migration). **On the Windows checkout only** (the snapshots): `npm run base -- fetch wikidata-rivers` (its old rivers snapshot has the same file name and the old checksum), `load all`, the trial drafts and the simulator.
