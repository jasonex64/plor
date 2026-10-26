# M13 13e-4 — Subsets of any category

**Status:** in progress (2026-10-26): the design approved ("Approve 13e-4's design and go through O1–O5") with O1–O5 answered (below); 13e-4a done (PR #87); 13e-4b and 13e-4c done (PR #92). Pop culture moves to 13e-6 and uses this (renumbered 2026-10-26, when the base's shape took 13e-5: `M13-13e-5-the-base-shape.md`).

## Goal
Any broad category can give narrower questions: by a fact about its members ("Name an African country", "Name an endangered animal", later "Name a Nintendo racing game") or by its members' first letter ("Name a country that starts with D").

## Who uses it / what breaks without it
- **Used by:** the drafting session (13d), which gets many more questions from the sets already loaded; 13e-6 (pop culture), whose narrow questions are subsets of broad sets; every player who meets them.
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

The pop-culture answers are for 13e-6 and stay recorded here until its ticket is written.

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

**Space.** The facts most subsets would use (country and state for places and rivers; continent through the country; population and area; IUCN status and endemic-to for animals; country of origin for breeds; the elements' numbers) come to roughly **160,000–240,000 rows, about 40–55 MB** at today's 230 bytes a fact. Letter subsets cost nothing: they're worked out from names when a day's answers are fixed. A fresh database would go from 260 MB to about **300–315 MB** of the hosted Free plan's 500 MB, before 13e-6's pop-culture sets (the human asked to be warned near the limit; plor.app's answer database is empty today).

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
**Status:** done (2026-10-26): merged in PR #87 (`6c4d5ee`, 2026-10-26 05:56 UTC) on green CI, 10 of 10 checks (runs 40276452444 and 40276445920 on `7796848`), by auto-merge (human, 2026-10-25: "Merge on green CI (Recommended)"). Its 3 migrations were pushed to plor.app at the human's request (2026-10-26, from a clean checkout of main at `6c4d5ee`; `migration list --linked` matches on all 36; `test db --linked` 22 files, 388 tests, PASS).

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

## 13e-4b — The first subsets
**Status:** done (2026-10-26): merged in PR #92 (`f526633`, 2026-10-26 10:46 UTC) on green CI, every check (runs 40307500816 and 40307496875 on `ea5e346`; the push run's build first failed fetching Google Fonts, the same commit's other run having passed, and passed when that job was re-run unchanged), by auto-merge. Its migration `20261026061619_subset_values.sql` was pushed to plor.app at the human's request ("please push with supabase cli when it's done"): from a clean checkout of main, `db push --linked --include-all` (M14's two later migrations were already there; the two sets share no function or column), `migration list --linked` 39 of 39 matching, `test db --linked` 24 files, 406 tests, PASS (a first run stopped after 160 tests and 272 s, cause unverified, likely the connection; the rerun passed).

**What the human decided (guided questions, 2026-10-26):**
| Question | The human's answer |
|---|---|
| Which kinds of subsets | "By first letter", "By IUCN status" (continent and population wait) |
| Where in the day | "Wherever easiest-first puts them (Recommended)" |
| Which letters | "Any letter with 10+ members (Recommended)" |
| Batch size | "About 20–30 (Recommended)" |
| The IUCN subsets | "endangered or extinct?", then "Both, endangered as players mean it (Recommended)": "Name an endangered animal" accepts vulnerable, endangered or critically endangered (strictly, gorilla is CR and lion VU: 13e-4b survey), and "Name an extinct animal" |
| Which bases get letters | "Countries and capitals", "Animals", "US cities and rivers", "Everyday WordNet lists" |
| Letters per base | "At most 2 letters per base (Recommended)" |
| **The format** (hard to reverse) | "Approve: always a list (Recommended)": a fact filter holds `values`, a list, and a thing fits with any of them; a continent is a one-item list. No day has been approved with `where` yet, so nothing stored changes |

**The survey** (the local base, 2026-10-26): named animals by status: least concern 24,141, vulnerable 3,063, endangered 2,846, data deficient 2,648, near threatened 2,363, critically endangered 1,693, extinct 475, extinct in the wild 26. Vulnerable: lion, giraffe, koala, cheetah, polar bear, snow leopard, hippopotamus; endangered: tiger, chimpanzee, red panda, blue whale, Asian elephant; critically endangered: gorilla, orangutan, black rhinoceros, vaquita, Sumatran tiger; extinct: dodo, great auk, passenger pigeon, thylacine. "Giant panda" has no status in Wikidata's taxon (the "panda" alias reaches two taxa).

**Claude's design** (approved, 2026-10-26: "I approve 13e-4b's design. Build it."):
1. **The format change:** `private.category.fact_value` becomes `fact_values` (a list), `where`'s fact form becomes `{"trait", "values": […], "via"?}`, and `fits_where` matches any of them; `data/categories.json`'s `fact` takes `values`. DECISIONS.md's Puzzle content format row says so.
2. **Two IUCN subsets** of `animal`: `endangered_animal` (Q278113, Q96377276, Q219127) and `extinct_animal` (Q237350), each with a bank question.
3. **Letter subsets**, at most 2 per base, over countries, world capitals, animals, US cities, rivers and some everyday WordNet lists, to about 20–28 in all: for each base, letters with at least 10 members, preferring the 9 letters the Wind never steals (f, j, k, q, v, w, x, y, z; `LETTER_TIERS`), whose questions no day's letters can block, then the others. Each with a bank question (5–6 common and 4–6 uncommon answers, the host's starting with the letter).
4. **The status and continent things' aliases:** only their names, no Wikidata alternative labels (ROADMAP From 13e-4a: "na", "lc", "dd" and "003 un m49 code" made those misses "rejected" in every category).
5. **Checks:** the review output for each subset (count, sample, flags), trial drafts, the simulator, one PR the human approves by merging.

**Decided while building (human, 2026-10-26):**
| Question | The human's answer |
|---|---|
| "Name an extinct animal" refuses woolly mammoth and T. rex: IUCN lists only modern extinctions | "Reword it (Recommended)": "Name an animal that went extinct in modern times" |
| The batch's LDNOOBW flags: "darkie charlie", the kitefin shark's (Q1321783) first English name, a racial slur, in `animal`, `animal_k` and `endangered_animal`; the rest innocent (willow tit, Syrian wild ass, bastard sturgeon, Rio Negro frog) | "Drop the slur, keep the rest (Recommended)": the animals import drops that taxon's listed names by ID (`ANIMALS_DROP_LISTED_NAMES`), as rivers' Pūkio Stream alias is dropped |
| May the local database be rebuilt to prove the bank on a fresh load | "Yes, rebuild it (Recommended)", once the M14 session is done with the shared stack |

**What building changed** (Claude's calls, for the review):
- The two fruit letter subsets (`fruit_k`, `fruit_j`) were dropped: Wikidata's fruit tree makes them mostly apple and rice cultivars ("Jonagold", "Kinuhikari"); vehicle W, tree F and flower W were tried as replacements and were weak too, so the batch is 22, not 24.
- A miss on a subset of several values (`endangered_animal`) is held for the human (`held_subset`), as a new thing can't be given one of three statuses; A2 had a direct one-value fact go on the new thing.
- Small lists have fewer uncommon answers than design point 3's 4–6, after taking out answers under a host answer (kingfisher over kookaburra, fly over flesh fly, fishing over fly-fishing): `tool_w` 2; `flower_v`, `clothing_j`, `sport_f`, `insect_f` 3.
- A name several members bear became `#<id>`: the member whose own name it is, else the Wikidata item with the lowest Q-number (13e-3's rule for places), else the WordNet entry; "Washington" (a small town, as Washington, D.C. isn't a US city by that name) left the host answers.
- The draft lists a category's members once per connection (`membersOf`): the 40-day simulator ran over 35 minutes with the big subsets, and 2.4 minutes after.

**Review (reviewer agent, fresh context, 2026-10-26), blocking:**
1. **The committed animals snapshot lost about 800 taxa** (Pan-Euungulata's branch: giraffe, hippopotamus, whales, pigs, deer), so on a fresh load five bank answers (vaquita, black rhinoceros, quagga, aurochs, bluebuck) name no member; the local database kept them only because loading never removes rows. Investigated: not a Wikidata edit (Artiodactyla's parent last changed 2026-10-15, and its chain reaches Animalia), and no page came back short; each read loses a different branch (06:22: 70,957 items; 07:3x: 69,114, with the branch back and carps, minnows and shiners gone, 3,566 animals in all). Cause: **13e-4c**.
2. The ticket's status, decisions and changes while building: this section.
3. ROADMAP and HANDOFF: updated with 13e-4c.
4. The local database still holds the continent and status things' junk aliases and the dropped fruit subsets (loading only adds): the rebuild the human approved clears them.
Non-blocking findings go to ROADMAP, From 13e-4b.

**13e-4b Evidence, on a fresh load** (2026-10-26, after 13e-4c; the human's OK to rebuild: "Yes, reset it now (Recommended)"):
- `npx supabase db reset`, then `npm run base -- load all` in 43 s: `LOADED wikidata-animals (2026-10-26): {"facts":110855,"things":71753,"aliases":212909,"numbers":0}`, `LINKED data/links.json: {"added":111,"links":111}`, `DEFINED 82 categories from data/categories.json` (60 and the 22 subsets; `fruit_k` and `fruit_j` gone). The local database is **284 MB** (291 MB before, holding every earlier read's rows).
- The status things' names are their labels alone ("least concern", "data deficient", "endangered"); **North America keeps its junk aliases** ("na", "noam", "003 un m49 code") because continents also come in through `wikidata-places`, which keeps Wikidata's alternative labels: design point 4 holds for statuses only (ROADMAP, From 13e-4b). No alias "darkie charlie" is left.
- **Every bank answer resolves on this fresh load:** all 82 questions, each named answer to exactly one member and each `#<id>` a member (scratch check: `0 problems`); no host answer sits above another familiar answer (`0 host answers above another familiar answer`).
- `npm run base -- review` on the 22 subsets: members from 13 (`tool_w`) to 7,605 (`endangered_animal`): country B 24, country M 26, capital K 28, capital B 32, animal K 1,436, animal W 3,434, US city W 732, US city J 134, river K 1,663, river V 2,066, bird W 120, bird K 23, fish W 63, insect W 43, insect F 41, tree W 85, flower V 38, clothing J 19, sport F 21, tool W 13, extinct 475. LDNOOBW flags: the slur (dropped, above) and innocent names (willow tit, Syrian wild ass, bastard sturgeon, Rio Negro frog, Fluke's "butt", San Marino's "sm", Negro ant), kept (the human's answer).
- Trial drafts 2026-10-27 to 11-01 and 11-24: all 7 drafted (e.g. 10-31: `country_b us_city_j endangered_animal language vegetable insect_w furniture`), files deleted after.
- The simulator (scratch: `draft()` for 40 dates three days apart from 2027-01-01): **`DRAFTED 39 of 40; subset questions 64 of 273`** in 2 min 47 s; the one failure blocks at Q7 on "Name a kind of poem" (13e-3's `verse_form`). Before `membersOf` it ran over 35 minutes and was stopped.
- `npx tsc --noEmit -p .` clean; `npx eslint scripts src` clean; `npm run content:validate` `CONTENT OK`; `npm test` 39 files, **343 passed**; `npm run test:sql` `Files=22, Tests=391`, `Result: PASS` (`subsets.test.sql` 46); `npm run test:db` 40 files, **262 passed**. e2e: no page changed; CI runs it.

## 13e-4c — Reading Wikidata's animal tree by key
**Status:** done (2026-10-26): with 13e-4b in PR #92 (see 13e-4b's Status for the CI runs and the plor.app push; human, 2026-10-26: "One PR for both (Recommended)", as GitHub holds one open PR per branch; a one-off exception to "one PR per sub-ticket").

**The problem** (13e-4b review, then measured): the animals import reads Wikidata's whole parent-taxon list (P171, about 4 million statements) and its names (P1843), scientific names (P225) and statuses (P141) in pages by position (`bd:slice` offsets, 50,000 rows each). The same page gives different rows on different requests: five requests in a row went to five servers (wdqs2007, wdqs2022, wdqs2014, wdqs2015, wdqs2010), and the page at offset 2,000,000 returned different rows even from the same server twice (wdqs2014, wdqs2008). Each server orders results by its own internal IDs, and the servers are independent and may hold different data (SOURCES.md, Wikidata Query Service behaviour), and Wikidata keeps changing during a read. So reading by position skips and repeats rows, and one skipped parent link cuts off its whole branch: taxa under Animalia came out as 2,366,663, then 2,360,800, then 2,325,989 on three reads the same day.

**What the human decided (guided questions, 2026-10-26):**
| Question | The human's answer |
|---|---|
| How to make the import reliable | First "not sure what u mean are there that many animals?" (the answer: about 2.3 million animal entries, about 52,000 with an English name), then "Research it first" |
| Where the fix goes | "Its own sub-ticket, first (Recommended)": 13e-4b waits for it |
| Taxa per batch | After the measurement below, "5,000 (Recommended)" |
| The sources | "Add both (Recommended)": T203646 and T221774 in SOURCES.md, with the test |

**The measurement** (children of N taxa from the snapshot, `VALUES ?p { … } ?t wdt:P171 ?p`, two runs each, 2026-10-26): 1,000: 0.8 s and 0.6 s; 5,000: 3.3 s and 2.1 s; 10,000: 16.5 s and 2.6 s; 20,000: 4.9 s. Time follows the rows returned and the server's load more than N; none neared 60 s.

**Claude's design** (from the answers: by key, 5,000 a batch, two runs that agree):
1. **The tree top-down:** from Animalia, the children of 5,000 taxa at a time, level by level, each taxon asked about once (a cycle can't loop), keeping each child's parents found inside the tree, as now.
2. **Names, scientific names and statuses by ID,** 5,000 at a time: English common names for every taxon in the tree, scientific names and statuses for the taxa kept (named ones and their ancestors).
3. **Removes** `sliced()` and `BASE_SLICE_ROWS`, the only reads by position; adds `BASE_BATCH_IDS = 5000` (the human, 2026-10-26).
4. **The proof:** two full fetches give the same items (the same IDs, names and parents); the counts are printed and recorded.

**Decided after its review (human, 2026-10-26):** the shown name for a taxon with several English names: "Wikidata's English label first (Recommended)": the English label when it is one of the common names ("vaquita", not the alphabetical "Chochito"; the bluebuck, not "Blaubok"), else the first common name alphabetically. The labels are read by ID for the kept taxa, with the rest.

**What building changed:** a taxon's display name is its first English name **in alphabetical order**: the query service returns a taxon's names in no fixed order, so the first two by-key fetches named 65 of the 12,886 taxa with several English names differently (the elephant shark "Ghost Shark", then "Whitefish"). Every name stays typeable either way; the name is what the host says, and what the letter-subset host check reads. Claude's call: the old "first as returned" was arbitrary too.

**Evidence (2026-10-26, the Windows checkout):**
- Three reads by position the same day gave 2,366,663, 2,360,800 and 2,325,989 taxa under Animalia, each losing a different branch (13e-4b review). The page at offset 2,000,000 returned different rows on six requests, the same server twice included: wdqs2010, wdqs2014, wdqs2008 gave `Q80980176, Q107545447`; wdqs2014 and wdqs2008 also gave `Q14538644, Q14538645` and `Q49601072, Q49601076`.
- **By key, run 1** (`npm run base -- fetch wikidata-animals`, 26 min 20 s, one 429 wait honoured): the tree in 81 levels, `2368292 taxa under Q729`, `71744 taxa kept, 53583 with an English name`, `FETCHED wikidata-animals: 71753 items`. More than any read by position kept (71,698 at most).
- **Run 2:** the same 2,368,292 taxa and 71,753 items; **0 IDs in one run only**; parents, aliases and statuses identical; 65 display names different (above).
- **Run 3**, with names in alphabetical order (the committed snapshot): against run 2, 0 IDs differ and 0 items differ in parents, aliases or statuses. The kitefin shark (Q1321783) is "Kitefin shark", with "kitefin shark", its plural and "dalatias licha" as its names.
- `npx tsc --noEmit -p .` and `npx eslint scripts src` clean; `scripts/base.test.ts` 16 passed (the alphabetical name included).
- **Run 4**, with the English label first (the human's answer after the review; the committed snapshot): against run 3, 0 IDs differ and 0 items differ in parents, aliases or statuses; 3,504 taxa renamed, e.g. Q725493 "Chochito" to "Vaquita", Q2000591 "Marlin" to "White marlin"; where the label is the scientific name the alphabetical rule stays (Q746580 "Blaubok"; "bluebuck" still answers). Then the local database rebuilt again (`db reset` + `load all`, 284 MB), and every 13e-4b check rerun on it: the bank 0 problems, no host above a familiar answer, the simulator 39 of 40, the 7 trial drafts, `npm test` 343, `test:sql` 391, `test:db` 262, tsc, lint and content:validate clean.

## 13e-4b and 13e-4c Source diff
| Source says | We built | Why different |
|---|---|---|
| P141 IUCN status: 9 values, "endangered" (Q96377276) one of them | "Name an endangered animal" accepts vulnerable, endangered and critically endangered (Q278113, Q96377276, Q219127) | Players mean the threatened statuses by "endangered" (gorilla is CR, lion VU); the human: "Both, endangered as players mean it (Recommended)" |
| P141: extinct (Q237350) and extinct in the wild (Q239509) are two values | "Name an animal that went extinct in modern times" takes extinct alone | Animals extinct in the wild still live in captivity; IUCN's list holds only modern extinctions, so the prompt says so (the human: "Reword it (Recommended)") |
| Query service: SPARQL with a 60 s limit (SOURCES.md, Wikidata) | Reads by key, 5,000 IDs a query, never `bd:slice` by position | Reading by position skips and repeats rows across servers (SOURCES.md, Wikidata Query Service behaviour, and the measurement); 13a's `bd:slice` reads are gone |
| P1843 taxon common name: several English values, in no fixed order | One shown name: the English label when it is a common name, else the first alphabetically; every value stays typeable | A fetch must give the same snapshot twice; the human chose the label rule |

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
- Pop culture: 13e-6, with the answers above.
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
