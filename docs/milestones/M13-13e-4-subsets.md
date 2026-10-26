# M13 13e-4 — Subsets of any category

**Status:** approved (2026-10-26): the human approved the design ("Approve 13e-4's design and go through O1–O5") and answered O1–O5 (below); 13e-4a is next. Pop culture moves to 13e-5 and uses this.

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
**Status:** in progress (2026-10-26): designed below, the format change and A1–A4 answered by the human; being built.

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
