# M13 13e-4 — Subsets of any category

**Status:** in progress (2026-10-26): the design approved ("Approve 13e-4's design and go through O1–O5") with O1–O5 answered (below); 13e-4a done (PR #87); 13e-4b next. Pop culture moves to 13e-5 and uses this.

## Goal
Any broad category can give narrower questions: by a fact about its members ("Name an African country", "Name an endangered animal", later "Name a Nintendo racing game") or by its members' first letter ("Name a country that starts with D").

## Who uses it / what breaks without it
- **Used by:** the drafting session (13d), which gets many more questions from the sets already loaded; 13e-5 (pop culture), whose narrow questions are subsets of broad sets; every player who meets them.
- **Breaks without it:**
  - every narrow question needs its own import, so "Nintendo game", "Nintendo racing game" and "racing game" would be three sets of mostly the same things;
  - questions like "countries that start with D" or "African countries" can't be asked (human, 2026-10-26);
  - 13e's 210 categories can grow only by new imports, and the database with them.
- M13 already chose this: "New questions from traits", "Yes, combine traits" (e.g. animal + lives in Africa), and categories as recipes over facts (`M13-answer-lists-and-content.md`, design 3). Only `kind_of` and `member_of` facts exist so far.

## What the human decided (guided questions, 2026-10-26)
| Question | The human's answer |
|---|---|
| Which kinds of pop culture, over time | "Films and TV shows", "Music", "Board, card and video games", "Characters and franchises" (all four) |
| New releases | "Anything Wikidata has (Recommended)" |
| Which titles count | "English Wikipedia article (Recommended)" |
| The pop-culture batch's size | "About 5 pop-culture sets (Recommended)" |
| Which 5 | "One of each kind (Recommended)": board games, video games, films, bands, superheroes |
| Sets too big | "Narrower categories (Recommended)" |
| Titles that are ordinary words (Up, Yes) | "Keep them, ask narrowly (Recommended)" |
| Wording | "Mixed (Recommended)" |
| Films | "animated feature films, anime as well in general"; anime: "Anime series and films (Recommended)" |
| Video games | "nintendo, by genre"; then "Nintendo, plus genres overall" |
| Bands | "younger leaning and kpop included. dont need too many of these" |
| The top-up | "general knowledge but also be able to generate subets from the database for example if we have database of all countries, we can do "countries that start with d" or "countries with 1 mil gdp"" |
| Subsets, when | "i mean this should be expanded to all broad categories: the ability to generate subset/narrower questiosn from them"; then "Subsets first, as 13e-4 (Recommended)" |
| Letter subsets and the stolen letters | "Yes, the draft skips it (Recommended)": a letter subset isn't drafted on a day that steals its letter |
| Space | "figure out how much work it would be to apply to all the data we have so far (animals, places, etc.) then realistically draft a plan based on if doing this new mechanism will take more space)" |
| **The design and O1–O5** (after the survey and the 500 MB research) | "Approve 13e-4's design and go through O1–O5"; O1 "One entry listing them (Recommended)"; O2 "A core few"; O3 "Their own table (Recommended)"; O4 "What's typed must start with it (Recommended)"; O5: "these were just suggestions btw … (u can still add it)" |

The pop-culture answers are for 13e-5 and stay recorded here until its ticket is written.

## What it would take: the survey (2026-10-26)
**The database today** (a fresh `load all`, local): 260 MB. Facts are only `kind_of` (204,421) and `member_of` (193); `private.fact` holds 204,566 rows in 45 MB with its indexes, about **230 bytes a fact**. `private.fact.value_thing` is a thing and not null, so numbers (population, GDP) don't fit yet.

**What Wikidata gives our things** (a scratch count of truthy statements over a sample of up to 1,000 items per set, all items for small sets; estimates scaled to the set):

| Set (items) | Useful properties: share of items carrying them, estimated statements |
|---|---|
| countries (195) | continent P30 99%; population P1082 99%; GDP P2131 94% (4.3 values each, one a year); area P2046 99%; capital P36 99% |
| US states (51) | population, area, capital, inception: 98% each |
| world capitals (200) | country P17 100%; population 99%; area 97%; elevation 95% |
| US cities (10,762) | state (P131) 100%, 11,343; population 100%, 10,762; area 100% |
| places (30,313) | country 99%, 32,132; population 100% (1.5 values each), 46,773; area 79% |
| rivers (40,923) | country 100%, 41,987; flows into P403 78%; length P2043 36%, 14,855 |
| animals (70,899) | IUCN status P141 55%, 38,782; endemic to P183 9%, 14,109; native range P9714 15% |
| dog breeds (927) | country of origin P495 61%, 575 |
| elements (119) | atomic number, melting and boiling points, discoverer, year: 82–99% |
| fruit (3,004) | country of origin 20% |

**WordNet's categories** (49 of the 60; 11 are Wikidata's) have no facts beyond the kind-of tree, so for them only **letter subsets** come without new data.

**Space.** The facts most subsets would use (country and state for places and rivers; continent through the country; population and area; IUCN status and endemic-to for animals; country of origin for breeds; the elements' numbers) come to roughly **160,000–240,000 rows, about 40–55 MB** at today's 230 bytes a fact. Letter subsets cost nothing: they're worked out from names when a day's answers are fixed. A fresh database would go from 260 MB to about **300–315 MB** of the hosted Free plan's 500 MB, before 13e-5's pop-culture sets (the human asked to be warned near the limit; plor.app's answer database is empty today).

## Claude's design (for the human to approve)
1. **New facts, measured before they're kept.** Each Wikidata fetch in `scripts/base.ts` also takes the chosen properties (O2): thing-valued ones (country, state, continent, IUCN status, endemic to, country of origin) as new traits in `private.fact`, and numbers (population, area, GDP, length) in a new numeric fact (a column or a table, O3). For a property with several values, the one with the latest "point in time" (P585) is kept. Every set is re-fetched, which also does ROADMAP's From 13e-3 item "re-fetch the older sets for the mul fallback".
2. **Subset recipes.** A category in `data/categories.json` can name a base category and a filter instead of a root: a fact (`continent` is Africa), a number against a threshold (`population` at least N), or a first letter. `private.category_members` applies it. Continent for cities and rivers comes through their country. Each subset is still a category, so the bank, the gap, the review and the admin pages work as they do now.
3. **Letters.** A letter subset is not drafted on a day whose stolen letters include its letter (human: "Yes, the draft skips it"): the pick leaves it out before the letters are chosen.
4. **Freezing a day.** Approval already freezes each question's `root`, `member_of` and member count; a subset adds its filter. That changes format 3's approved fields, a **hard-to-reverse** area (DECISIONS.md, Puzzle content format), so its exact shape is reviewed before code.
5. **The first subsets and their bank questions,** in the batch's usual way (13e: 20–30 a batch, each reviewed, the human merges): letter subsets of countries, US states, animals and some WordNet categories, and fact subsets of countries, cities, rivers and animals.
6. **Two PRs:** 13e-4a, the facts and the machinery (with the size measured); 13e-4b, the first batch of subset categories.

## O1–O5, answered (human, 2026-10-26)
- **O1 — The source:** one SOURCES.md row, "Wikidata properties (13e-4)", listing each property's page and its use ("One entry listing them (Recommended)"). Each page is read before the row is added; a later property joins the row with the human's OK.
- **O2 — Which properties:** "A core few": **country** (P17), **continent** (P30), **population** (P1082) and **IUCN conservation status** (P141). Continent is direct for countries, US states and Canadian provinces, and comes through the country for cities, capitals, places and rivers. State (P131), area, GDP, length, endemic-to and country of origin wait for a later batch. With these four, the estimate is about half the survey's 40–55 MB.
- **O3 — Numbers:** "Their own table (Recommended)": thing, trait, value and the date it's true for (P585, the latest kept). Population is its only trait for now (build for today).
- **O4 — Letter subsets:** "What's typed must start with it (Recommended)": a member counts when the typed name starts with the letter, with a leading "The" ignored ("The Gambia" counts under G; "Deutschland" counts for Germany under D). So the letter is checked on the typed answer, not only on the member list, and approval freezes the letter with the question.
- **O5 — Thresholds:** the examples were illustrations (human: "these were just suggestions btw for like the gdp stuff wasn't word for word exactly the categories i wanted (u can still add it)"). Claude proposes the subsets and thresholds in 13e-4b's batch; the human sets each number there.
- **The 500 MB research** (2026-10-26, for the human; Supabase's pricing, database size, disk size, billing FAQ and cost control pages, the last four not in SOURCES.md): Free has 500 MB, then a grace period and possibly read-only or a pause; Pro is $25 a month with 8 GB, daily backups and no pausing. Not decided: the plan stays Free while building.

## 13e-4a — The facts and the machinery
**Status:** done (2026-10-26): merged in PR #87 (`6c4d5ee`, 2026-10-26 05:56 UTC) on green CI, 10 of 10 checks (runs 40276452444 and 40276445920 on `7796848`), by auto-merge (human, 2026-10-25: "Merge on green CI (Recommended)"). Its 3 migrations wait for plor.app's next `db push`, at the human's request.

**Source:** SOURCES.md, Wikidata properties (M13 13e-4), read 2026-10-26; Wikidata (M13 D2); 13a–13e-3's tickets for the base, the format, misses and the draft.

**Which sets get which facts** (O2's four):
| Set | Facts |
|---|---|
| countries | continent (P30, every one listed), population (P1082) |
| US states, US state capitals, US cities, Canadian provinces | population |
| world capitals | country (P17), population; continent through the country |
| rivers | country (P17); continent through the country |
| animals | IUCN conservation status (P141) |
| places, dog breeds, elements, fruit | none (places have no category; the others' facts aren't among O2's four) |

About 93,000 rows (survey: rivers' countries 42,000, animals' statuses 39,000, populations 11,300), about 21 MB at 230 bytes a fact, before measuring.

**The design:**
1. **Facts.** `private.fact`'s traits widen to `country`, `continent` and `conservation_status` (thing-valued, as today). The values are things: the 193 countries already loaded; the continents and the 9 IUCN statuses, fetched as items with names and no `kind_of` (as places are), so no category takes them in and 13b's facts check knows "africa" names a continent. A P17 value that isn't one of the 193 countries is dropped and counted (A3).
2. **Numbers** in their own table, `private.number_fact` (O3): thing, trait (`population` only), value, the point in time (P585), origin, source_ref, added_at, removed_at. From each thing's best-rank values, the one with the latest point in time is kept; a reload with a different value removes the old from that moment and adds the new, so a started day keeps the number it had.
3. **Subset recipes** in `data/categories.json`: `"of": "<base key>"` (the subset takes its base's root and member_of) and one filter: `"fact": {"trait": …, "value": …, "via"?: "country"}`, `"at_least": {"number": "population", "value": N}`, or `"starts_with": "d"`. `private.category` gains the filter's columns, and one SQL function decides whether a thing fits a filter as of a moment, used by `category_members`, `in_category_now` and `resolve_answer`.
4. **Letters** (O4): a letter subset accepts a typed name that starts with its letter, a leading "the " ignored; its members are things with such a name. The approval's and the draft's "3 familiar answers typeable" checks count only such names; the draft's host bank names must start with it too. A day that steals the letter at or before the question can't type any answer, so the draft's letter search already refuses it and `fitOrder` moves the question earlier ("Yes, the draft skips it"); a unit test shows it.
5. **The format change** (A1): an approved question of a subset gains `where`, the filter as approval froze it. Days without it are unchanged.
6. **Misses on subsets** (A2).
7. **Re-fetch every Wikidata set** with its facts (also ROADMAP From 13e-3, the mul fallback for the older sets), each measured before it's kept.
8. **Tests:** db tests of the filters in `category_members` and `resolve_answer` (as of a day), the number reload, misses on subsets; unit tests for the categories parser, the letter rule and the draft's letter skip; pgTAP for the new table's grants (none for `plor_app`).

**Answered by the human (2026-10-26):**
- **A1 — the format's new field:** "Approve it (Recommended)", after a walk-through with an example day: an approved subset question gains `where`, one of `{"trait": "continent", "value": "<thing id>", "via": "country"}` (via only for continent), `{"trait": "continent" | "conservation_status", "value": "<thing id>"}`, `{"number": "population", "at_least": N}` or `{"starts_with": "<letter>"}`. Approval writes it; drafts and days without it are unchanged. DECISIONS.md, Puzzle content format, records it.
- **A2 — misses on a subset:** "Learn only if it fits (Recommended)": a letter subset learns only a text starting with its letter (any other is logged and nothing more); a direct fact filter (`continent` of a country, an animal's status) is added to the new thing with its root; a `via` or number filter can't be carried, so an otherwise accepted text is held for the human, who can accept it for the subset on the audit page.
- **A3 — countries outside the 193:** "Drop and count them (Recommended)".
- **A4 — number filters:** "At least only (Recommended)".

**The repeat gap and families** (asked while building, 2026-10-26): "Separate, not same day": each subset keeps its own 30-day gap, but a day holds one question per family (a base and its subsets). `gapProblems`, `pickQuestions` and `namedQuestions` take the family from `data/categories.json`.

**What building changed:**
- A subset is defined by its own function, `private.define_subset(key, name, of, source, where)`, which copies its base's root and member_of; `define_category` is unchanged, so its callers and tests are too.
- A held text for a subset has its own outcome, `held_subset`, as the audit page says "held" means an offensive-word match; Accept there makes a new thing accepted for that subset (`category_extra`), and Undo ends that too.
- A letter subset's named host answers must start with its letter: `content:validate` checks the names in the bank, and the draft checks the things' names.
- `import_source` reports `numbers` beside things, aliases and facts (`answer_base.test.sql`'s three expected results gain `"numbers": 0`).

**Removes:** `private.fact`'s two-trait check; the older Wikidata snapshots (re-fetched); the countries' and capitals' fetches without facts. Nothing else: the rest adds to the categories and the base.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 230 bytes | A fact's cost, for the size estimate | Measured, 2026-10-26: 45 MB for 204,566 rows |
| 500 MB | The hosted plan's limit | Supabase pricing, SOURCES.md (DECISIONS.md Log, Storage) |
| 20–30 | Categories per batch | 13e (human, 2026-10-24) |
| 10 members at least | Every subset category | 13e (human, 2026-10-24) |
| Each threshold | Number filters | The human, per subset in 13e-4b (O5) |

## Out of scope
- An AI that writes subsets by itself: Claude proposes each batch's subsets in a session and the human approves them by merging (human, 2026-10-26: "Claude proposes, I approve (Recommended)"). ROADMAP's "AI that drafts days" stays in Later.
- Pop culture: 13e-5, with the answers above.
- AI-filed traits ("can fly") and facts for WordNet's categories.
- Combining two filters ("an African country that starts with K"): after this, if the human asks.

## Plan
1. ~~The human approves the design and answers O1–O5.~~ Done, 2026-10-26.
2. 13e-4a: the migration, the fetches with the new properties (measured per set before they're kept), the recipe filters, the letter rule in the draft, the format change, tests (db tests for `category_members` filters; unit tests for the letter skip).
3. 13e-4b: the first subset batch with bank questions, review output and the simulator.

## Removes
- `private.fact`'s two-trait check (widened).
- The older Wikidata snapshots fetched before the mul fallback (re-fetched).
- 13e's "combined traits later, after the 200" (moved ahead by the human, 2026-10-26).
Otherwise it adds facts and recipes to the sets already loaded, which is the point: fewer separate imports.

---

## 13e-4a Source diff
| Source says | We built | Why different |
|---|---|---|
| P1082 population: several values allowed when a point in time tells them apart; a single best value | The best-rank values, the one with the latest point in time; two differing values tied for latest are left out and counted (3 US cities) | The import can't choose between them, so it says how many it skipped |
| P17 country: values may be historical countries or dependent territories | Only the 193 countries of `wikidata-countries`; the rest dropped and counted (11 for capitals, 250 for rivers) | A3, the human: "Drop and count them (Recommended)" |
| P141: one of 9 values | Values outside the 9 dropped and counted (1) | The import knows only the 9 status things |
| P30 continent: every continent a subject spans | As the source says, Eurasia and Insular Oceania included | No difference; their fit for questions is 13e-4b's review |

## 13e-4a Evidence
**Local stack, the Windows checkout, 2026-10-26.**
- **The re-fetch** (`npm run base -- fetch <set>`, each set once; places twice, below):
  - countries: `continent on 193 of 193 items`, `population on 193 of 193 items`; 203 items, so 2 roots and 8 continent things (Africa 54 countries, Europe 47, Asia 46, North America 23, South America 12, Oceania 12, Insular Oceania 6, Eurasia 1; Russia, Turkey, Kazakhstan and four Pacific states list two or three);
  - US states 50 of 50 populations; US state capitals 50 of 50; Canadian provinces 13 of 13;
  - world capitals: `country on 197 of 199 items, 11 values outside the things loaded dropped` (Amsterdam and Copenhagen name only the Kingdom of the Netherlands and of Denmark), population on 198;
  - US cities: `population on 10735 of 10761 items, 3 left out with two latest values`;
  - rivers: `country on 40662 of 40922 items, 250 values outside the things loaded dropped`;
  - animals: `conservation_status on 37271 of 71689 items, 1 values outside the 9 dropped`, 71,698 items;
  - places' first fetch stopped loudly (`SyntaxError: Bad control character in string literal`: the service appended its error to a response it had started), and a second run fetched 30,442 items (30,313 before). Hypothesis before the rerun: load on the service, so a rerun succeeds; it did.
- **The load** (`npm run base -- load all`): `pg_database_size` from **269 MB to 291 MB (+22 MB)**; new rows: country 42,020, conservation_status 37,301, continent 201 facts, 11,186 populations; the mul fallback brought 853 more animals, 127 places and 14 fruit. `fact` is 64 MB, `number_fact` 2.3 MB.
- **Real-data trials** (subsets defined inside a rolled-back transaction): African countries 54 (11 ms); countries starting with D 17 (29 ms: any of a country's names counts toward membership); African rivers 1,170 (1.3 s); endangered animals 2,846 (2.7 s); animals starting with Z 694 (5.0 s); US cities of 1,000,000+ 13 (Chicago, Dallas, Houston, Los Angeles, Manhattan, New York City, Philadelphia, Phoenix, Queens, San Antonio, San Diego, San Jose, The Bronx). That last one took **9.3 s** before `20261026053032_number_fact_lookup.sql` and **0.46 s** after (hypothesis: the partial index can't serve the as-of check; disproved if still over 2 s). A first attempt counting five subsets in one query ran over 5 minutes before the index and was cancelled; not reproduced after it.
- **The suites:** `npx tsc --noEmit -p .` clean; `npx eslint scripts src` clean; `npm run content:validate` `CONTENT OK`; `npm test` 39 files, **343 passed**; `npm run test:sql` `Files=22, Tests=388`, `Result: PASS` (`subsets.test.sql` 43); `npm run test:db` 40 files, **262 passed**; `npm run test:e2e` 37 passed, 2 failed (groups, and Me's avatar slots), and `--last-failed` 2 passed (this PC is slow: 13e-3 Evidence). The e2e run was before the review's fixes, which change no page; CI runs it again.
- **The tests catch what they claim** (each rule broken on purpose in the local database, then restored): `fits_where` reading `now()` instead of the day's moment fails "but a started day keeps the number it had", "and the facts" and "and the names a letter subset reads"; approval without the letter clause fails "and only those: a name not starting with it doesn't make up for one the letters block".
- CI: 10 of 10 on `7796848` (runs 40276452444 and 40276445920), e2e included.

## 13e-4a Review
**Reviewer agent, fresh context, 2026-10-26.** Blocking findings and how each was fixed:
1. The as-of test proved nothing (its things' names were newer than the day): it now ages the whole test base, uses an old value that fits and a new one that doesn't, and covers a fact and a letter name too.
2. The approval's letter test passed without the letter clause: it now fails without it (U stolen, "germany" typeable but not starting with D).
3. An offensive-word text held on a `via` or number subset could never join it: Accept decides `category_extra` by the subset's filter, in `20261026054153_subset_accept.sql`, with a test.
4. No Evidence or Source diff: above.
5. Stale status lines, ROADMAP and HANDOFF: updated.
6. The TypeScript copy of the letter rule had no test and was a second way: removed; the draft asks `private.alias_starts`, and content:validate's bank name check, which used it, is gone (the draft refuses those names).
7. The letter-skip unit test assumed its result: removed; `draft.db.test.ts` checks `familiarLeft` on a letter subset (none left with D stolen; a typeable name not starting with D doesn't count).

Non-blocking findings are in ROADMAP, Next revision, From 13e-4a.
