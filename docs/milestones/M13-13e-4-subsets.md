# M13 13e-4 — Subsets of any category

**Status:** planned (2026-10-26): the guided questions are answered (below), the survey of what it would take is done, and the design waits for the human's approval and the open questions (O1–O5). Pop culture moves to 13e-5 and uses this.

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

## Open, for the human
- **O1 — The source.** SOURCES.md's Wikidata entry covers things, labels, the trees and closed lists, not these properties. Add each property's Wikidata page (P17, P30, P131, P1082, P2046, P2131, P141, P183, P495, P2043, P585) to SOURCES.md?
- **O2 — Which properties.** The survey's list above, or fewer to start?
- **O3 — Numbers.** A number column on the fact table, or its own table? (A migration either way, applied to plor.app at the next `db push`.)
- **O4 — Letter subsets.** Which names count ("The Gambia" under G or T?), and must the typed answer itself start with the letter ("Deutschland" for Germany)?
- **O5 — Thresholds.** Every number filter needs its threshold from the human ("countries with 1 mil gdp": GDP of at least US$1 million covers every country, so did you mean something else, such as population over 1 million or GDP over US$1 trillion?).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 230 bytes | A fact's cost, for the size estimate | Measured, 2026-10-26: 45 MB for 204,566 rows |
| 500 MB | The hosted plan's limit | Supabase pricing, SOURCES.md (DECISIONS.md Log, Storage) |
| 20–30 | Categories per batch | 13e (human, 2026-10-24) |
| 10 members at least | Every subset category | 13e (human, 2026-10-24) |
| Each threshold | Number filters | **The human (O5)** |

## Out of scope
- Pop culture: 13e-5, with the answers above.
- AI-filed traits ("can fly") and facts for WordNet's categories.
- Combining two filters ("an African country that starts with K"): after this, if the human asks.

## Plan
1. The human approves the design and answers O1–O5.
2. 13e-4a: the migration, the fetches with the new properties (measured per set before they're kept), the recipe filters, the letter rule in the draft, the format change, tests (db tests for `category_members` filters; unit tests for the letter skip).
3. 13e-4b: the first subset batch with bank questions, review output and the simulator.

## Removes
- `private.fact`'s two-trait check (widened).
- The older Wikidata snapshots fetched before the mul fallback (re-fetched).
- 13e's "combined traits later, after the 200" (moved ahead by the human, 2026-10-26).
Otherwise it adds facts and recipes to the sets already loaded, which is the point: fewer separate imports.
