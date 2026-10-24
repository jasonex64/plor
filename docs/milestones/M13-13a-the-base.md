# M13 13a — The base

**Status:** in progress (2026-10-24): T1 approved by the human ("Approve T1 as proposed: animal, country, fruit, dog breed, kind of cheese, chemical element, US state. Start building 13a.").

## Goal
One complete day, built from the answer database by a Claude session, approved on the admin page and played end to end on the local stack.

## Who uses it / what breaks without it
- **Used by:**
  - the human, who approves days and can now look up any answer;
  - the drafting session, which builds days from the database instead of typing lists;
  - 13b–13d, which all build on it.
- **Breaks without it:** see the M13 ticket. Everything after 13a needs things with permanent IDs, facts, categories and the day's frozen copy.

## What the human decided for 13a (guided questions, 2026-10-24)
| Subject | Answer |
|---|---|
| Scope | "One full playable day (Recommended)": animals end to end first, then enough categories for one day |
| Who builds a day until in-app AI drafting | "Claude session drafts (Recommended)": the human picks or types the questions, a Claude session builds the day from the database with a script, and the human approves on the admin page |
| An item with two official classifications | "Accept in both (Recommended)": tomato counts for fruit and for vegetable when the source backs both |
| Credits for CC BY sources | "Privacy page section (Recommended)": a "Data sources" section |
| The test day's questions | "Claude picks, all sources (Recommended)", approved by the human (T1) |
| Reviewing an import | "Summary + flags (Recommended)": counts per category, 20 random samples, and flags (no English name, two meanings, duplicates) |
| Where it runs | "Local only (Recommended)": nothing goes to the hosted database until the human asks (M15) |
| Admin view | "Search and browse (Recommended)": read-only; editing and undo come with 13b |
| The host says "bear", a player says "polar bear" | "Caught: bear covers it (Recommended)": a host answer catches everything under it in the tree, but not the reverse. It replaces the Answer model's "one level of detail" rule, so DECISIONS.md changes in 13a-2 |
| How obscure an animal may be | "Any real animal (Recommended)": every animal with an English common name in the sources |
| Breeds and subspecies for "Name an animal" | "Yes, under their parent (Recommended)": beagle under dog, Bengal tiger under tiger |
| Splitting 13a | Claude's call, after measuring the animal list: **13a-1** is the base, the imports, admin browse and credits; **13a-2** is format 3, the game engine reading the frozen lists from indexed tables, the drafting script, the test day and the matching items. Each is its own PR |

**The measurement behind those questions** (2026-10-24, Wikidata Query Service).
- *Hypothesis:* tens of thousands of animals with English common names, too many for one query.
- *Result:* the one query for all animals timed out at the 60-second limit. Per group:

  | Group | Taxa with an English common name |
  |---|---|
  | Mammals | 6,665 |
  | Birds | 12,928 |
  | Reptiles | 17,251 |
  | Amphibians | 4,082 |
  | Ray-finned fish | 8,611 |
  | Cartilaginous fish | 1,064 |

  Insects, arachnids, crustaceans and molluscs each timed out on their own, so likely well over 100,000 in all.
- *So* a day can't carry its full lists inside `private.puzzle`'s JSON, re-read on every request, and the frozen lists go in indexed tables (13a-2). The import fetches group by group, splitting further on a timeout.

## Source
- **SOURCES.md, M13 D2 sources:**
  - Wikidata: labels, aliases, P171/P279 trees, closed lists; SPARQL limits;
  - Catalogue of Life: COL26.10, the classification of living things;
  - Open English WordNet 2025: the everyday tree and synonyms;
  - USDA FoodData Central.
- **PostgreSQL 17,** and **Supabase keys and RLS / database roles:** the new tables in `private`, with guarded functions, and `plor_app`'s grants.
- **DECISIONS.md:** Answer model (matching, one level of detail, match groups); Puzzle content format (this sub-ticket makes format 3); Puzzle drafting (rewritten for the database); Puzzle approval.
- **The M13 ticket,** D1, D3, D6 and D8.

## T1 — the test day (Claude's pick, approved by the human, 2026-10-24)
Seven concrete categories that use every source, in an order that rises roughly in how common the obvious answers are. Tuning is 13d.

| Q | Prompt | Built from | Why |
|---|---|---|---|
| 1 | Name an animal | Catalogue of Life tree, with Wikidata's English common names | The category M04 measured (223 of 226); the biggest list |
| 2 | Name a country | Wikidata: members of the United Nations | A closed list from Wikidata itself (193 expected) |
| 3 | Name a fruit | Open English WordNet and Wikidata | Tests "accept in both" (tomato) |
| 4 | Name a dog breed | Wikidata | A long tail of niche answers |
| 5 | Name a kind of cheese | Open English WordNet and USDA FoodData Central | The USDA source |
| 6 | Name a chemical element | Wikidata | A closed list (118 expected) |
| 7 | Name a US state | Wikidata | A closed list (50 expected) |

## Acceptance criteria
- [ ] **The tables** in `private`: things (a random permanent ID, its name), aliases (with their kind and origin), facts (thing, trait, value, origin, source reference, when), categories (a recipe over facts, or a kept member list), and a log of every addition.
  - Writes go only through guarded functions.
  - `plor_app` gets only what the admin browse needs.
  - pgTAP checks the exact grants.
  - It's a security change, proposed in this sub-ticket's PR and recorded in DECISIONS.md.
- [ ] **Import scripts,** one per source, through the task runner (CLAUDE.md: repeated procedures are scripts). Each one:
  - pulls only the needed subset, within the SPARQL limits;
  - keeps the raw snapshot outside git (gitignored);
  - commits a manifest: source, version or snapshot date, query, counts and checksum;
  - prints the review summary: counts per category, 20 random samples, and flags.

  Loaded into the local stack only.
- [ ] **Category recipes** return the T1 lists. The closed lists match their expected counts: 193 countries, 118 elements, 50 states. Tomato is a member of both fruit and vegetable (db test).
- [ ] **Animals end to end, first.** The animal category holds at least the 223 of 226 animals M04 counted.
  - *Hypothesis:* it does.
  - *Disproved* if it doesn't, which would mean M04 measured a different source version.
  - The one-typo rule's tie rate over the animal list is measured and recorded. With thousands of entries, more typos may land between two entries.
- [ ] **Content format 3** (Hard to reverse; DECISIONS.md updated in the same PR):
  - every entry's ID is its thing's permanent ID;
  - each question names its category recipe;
  - each entry carries its popularity level (common, uncommon, rare), set by the drafting session's first guess, used by the bonus in 13c;
  - the validator checks format 3;
  - format 2 is retired (D8).
- [ ] **Drafting from the database:** a script turns 7 questions into a format-3 draft, building each list from its category with aliases, the host bank, host answers, letters (schedule A, the existing picker) and levels. DECISIONS.md, "Puzzle drafting" is rewritten for it. The T1 day is drafted with it.
- [ ] **Approval and play:**
  - the T1 day is approved on `/admin/puzzles`;
  - its frozen copy is in `private.puzzle`;
  - a run plays all 7 questions on the local stack, with typed answers matched by their aliases (e2e);
  - answers are stored by thing ID.
- [ ] **Admin search and browse:** an admin looks up a thing by name or alias and sees its names, aliases, facts and categories (e2e). A non-admin gets 403.
- [ ] **Credits:** the privacy page has a "Data sources" section crediting the CC BY sources, and names Wikidata and USDA.
- [ ] **The M13 matching items:** a plural alias without its synonym, digits under the typo rule, and zero-width characters stripped by normalization. Each has a test.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql` and `npm run test:e2e` pass, and so does CI.

## Out of scope
- Learning from misses, the audit page and undo: 13b.
- Rarity from play, the dodging host, and the 3-familiar-answers rule: 13c.
- The question bank, themes, the repeat gap, AI-filed traits ("can fly") and trait recipes, and tuning: 13d.
- The hosted database (M15), and in-app AI drafting (ROADMAP Later).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 193, 118, 50 | Expected counts of countries (UN members), elements and US states | Facts about the world, checked against Wikidata in the evidence. Not tuning values |
| 20 random samples | The import review summary | Human, 2026-10-24: "Summary + flags (Recommended)", Claude's option text |
| 223 of 226 animals | The animal hypothesis | M04 measurement (ROADMAP, M13 row) |
| SPARQL limits: 60 s, 5 parallel queries | The import scripts | SOURCES.md, Wikidata |

## Plan
1. The human approves T1.
2. Tables, functions and grants with pgTAP; then the animal import and its recipe, testing the hypothesis.
3. The other T1 imports and recipes, then format 3 and the validator, then the drafting script, then approval and play, then admin browse, then credits and the matching items.

## Removes
- Format 2 and its validator rules: hand-typed per-day accepted banks, retired by D8.
- `content/offbeat/*.json` as the drafting source. The old drafted days stay in git history; how M15 retires the files is 15a's.
- `scripts/content-plurals.ts`: aliases now come from the database, which covers plurals. To confirm while building, and removed in the same PR if so.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
