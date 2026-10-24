# M13 13a — The base

**Status:** done (2026-10-24), on PR #71's merge.
- T1 was approved by the human ("Approve T1 as proposed: animal, country, fruit, dog breed, kind of cheese, chemical element, US state. Start building 13a.").
- **13a-1 is done:** merged in PR #70 by GitHub auto-merge, which waits for every required check, with the human's approval of its security change (human, 2026-10-24: "I approve 13a-1's security change (new answer-database tables; plor_app may only run the admin lookup). Merge PR #70 once every CI check is green").
- **13a-2 is done:** merged in PR #71 on green CI, with the human's approval of its security change (human, 2026-10-24: "I approve 13a-2's security change (plor_app may run private.resolve_answer and private.thing_names; approve_puzzle rewritten). Merge PR #71 once every CI check is green"). It holds format 3, the engine on the base and the drafting script, with 13a-3 folded in, since CI needs the T1 draft once the old drafts are gone.

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
- *So* a day can't carry its full lists inside `private.puzzle`'s JSON, re-read on every request, and the frozen lists go in indexed tables (13a-2). The import reads Wikidata's index in slices instead (How the imports work).

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

## How the imports work (decided while building 13a-1)
- **`npm run base -- fetch|load <set>` and `npm run base -- review <category>`** (scripts/base.ts) are the one way to import. A raw snapshot goes outside git (`data/snapshots/`); its committed manifest (`data/manifests/<set>.json`) holds the source, date, method, item count and checksum. `load` refuses a snapshot whose checksum doesn't match, and any database but the local stack.
- **Animals come in by slicing the query service's index (`bd:slice`).**
  - One query over the whole tree times out, and splitting the tree group by group also timed out at every high level, at 60 seconds each.
  - Slicing reads every parent-taxon link (P171), English common name (P1843) and scientific name (P225) in fixed slices: one slice of 50,000 parent links took 0.85 s (2026-10-24). The tree is then followed locally.
  - *Hypothesis:* the slices finish in minutes. *Disproved* by a timeout or a slice error.
- **Retries.** On HTTP 429 the script waits the Retry-After the service names and asks again, printing and counting each retry. A timeout or any other error stops the fetch.
- **Recipes found while checking the counts:**
  - Countries: "member of the UN with no end time" returns 203, because former states aren't marked ended. Adding "sovereign state, not dissolved" returns exactly 193.
  - Elements: 174 items have an atomic number. Capped at 118 there are exactly 118, one per number.
  - Dog breeds: no taxon has the English common name "dog", so breeds hang under *Canis lupus familiaris* (Q26972265) as well as "dog breed".
- **Catalogue of Life isn't used in 13a.** The animal tree is Wikidata's parent-taxon links. Catalogue of Life is the tie-breaker when sources disagree, a check that comes with 13b's facts rule. Its credit is added when it's used.
- **Animals come from Wikidata and Open English WordNet together** (the hypothesis below).
  - Wikidata's common names cover the long tail.
  - WordNet covers the everyday words Wikidata keeps only in labels, or that aren't species at all (horse, cow, fox, caterpillar, worm, calf).
  - A WordNet animal whose synset carries the Wikidata ID of a loaded thing merges into it, and its WordNet parents join the tree.
  - WordNet's "animal" (00015568-n) carries no Wikidata ID, so Claude linked it to Q729 ("animal").
- **Fruit comes from Wikidata alone,** whose tree has tomato under fruit. Open English WordNet supplies cheese, with USDA's cheeses linked to it.

## 13a-2 and 13a-3 (decided 2026-10-24, before 13a-2's code)
**The human's answers (guided questions):**

| Subject | Answer |
|---|---|
| A name shared by unrelated members ("robin": American and European) | "Caught if any meaning is (Recommended)" |
| Scientific names as answers | "Yes, they count (Recommended)" |
| The reveal's "You said ___" | The thing's main name ("yes" to Claude's suggestion) |
| A stolen letter and an alias that avoids it ("Ursus maritimus" when P is gone) | "Yes: letters limit typing (Recommended)": today's rule, unchanged |
| Thing IDs across databases | "Same everywhere (Recommended)": computed from the source entry (RFC 4122 version 5), so a drafted day holds on every database with the same snapshots (refines M13 D3) |

**Claude's design:**
- **No per-day copy** (the human asked about database size, 2026-10-24). A format-3 day stores, per question:
  - its prompt and category key;
  - its host answers, with display names;
  - its host bank and the drafting session's popularity levels;
  - the stolen letter.

  It also stores the day's `approved_at` and each category's member count at approval, for the bonus. Every answer is resolved against the base **as of `approved_at`**: only aliases and facts added by then count. So a started day never changes, and the database grows only with the base, not with days.
- **Resolving a typed answer:**
  1. **Exact:** the normalized text is looked up by the alias index. The candidates are the things with that alias that are members of the question's category, walking up their kind_of facts to its root, as of `approved_at`.
  2. **Otherwise one typo** (text of 4+ letters, as today):
     - every text one edit away (a deletion, insertion, substitution or swap of neighbours), over the alphabet the aliases use, is looked up the same way;
     - an alias with a stolen letter doesn't count;
     - the typed text resolves if exactly one alias is that close.

     This is today's rule (`editDistanceAtMost`), enumerated instead of scanned, so it needs no similarity threshold.
- **One alias, several members:**
  - On one line of the tree, it is the highest (evidence: "aardvark" at three ranks).
  - Unrelated members ("robin") are one answer, caught if any of them is (human).
  - The answer stored is the caught member if there is one; else the highest popularity level, then the smallest ID. The rule is deterministic, so counts and the bonus agree.
- **Caught:** the answer is a host answer, or has one among its ancestors (human: "bear covers polar bear"). Match groups go: the tree replaces them.
- **Format 2 is retired** (M13 D8): its validator rules, `content:plurals`, the per-day lists, and the format-2 fixtures. The tests get a small base fixture and a format-3 day.
- **13a-2** is the format, the engine (runs, matching, payload, scoring, ledger, board, insights) and the admin puzzles page on it, with the tests rebuilt.
- **13a-3,** folded into 13a-2's PR (CI validates the drafted days, and the T1 draft is the only one left), is:
  - the drafting script;
  - format 3's draft validator and letter picker;
  - the T1 day drafted, approved and played (e2e);
  - the matching items (digits, zero-width characters).

## Acceptance criteria
- [x] **The tables** in `private`: things (a random permanent ID, its name), aliases (with their kind and origin), facts (thing, trait, value, origin, source reference, when), categories (a recipe over facts, or a kept member list), and a log of every addition.
  - Writes go only through guarded functions.
  - `plor_app` gets only what the admin browse needs.
  - pgTAP checks the exact grants.
  - It's a security change, proposed in this sub-ticket's PR and recorded in DECISIONS.md.
- [x] **Import scripts,** one per source, through the task runner (CLAUDE.md: repeated procedures are scripts). Each one:
  - pulls only the needed subset, within the SPARQL limits;
  - keeps the raw snapshot outside git (gitignored);
  - commits a manifest: source, version or snapshot date, query, counts and checksum;
  - prints the review summary: counts per category, 20 random samples, and flags.

  Loaded into the local stack only.
- [x] **Category recipes** return the T1 lists. The closed lists match their expected counts: 193 countries, 118 elements, 50 states. Tomato is a member of both fruit and vegetable (db test).
- [x] **Animals end to end, first.** The animal category holds at least the 223 of 226 animals M04 counted.
  - *Hypothesis:* it does.
  - *Disproved* if it doesn't, which would mean M04 measured a different source version.
  - The one-typo rule's tie rate over the animal list is measured and recorded. With thousands of entries, more typos may land between two entries.
- [x] **Content format 3** (Hard to reverse; DECISIONS.md updated in the same PR):
  - every entry's ID is its thing's permanent ID;
  - each question names its category recipe;
  - each entry carries its popularity level (common, uncommon, rare), set by the drafting session's first guess, used by the bonus in 13c;
  - the validator checks format 3;
  - format 2 is retired (D8).
- [x] **Drafting from the database:** a script turns 7 questions into a format-3 draft, building each list from its category with aliases, the host bank, host answers, letters (schedule A, the existing picker) and levels. DECISIONS.md, "Puzzle drafting" is rewritten for it. The T1 day is drafted with it.
- [x] **Approval and play:**
  - the T1 day is approved on `/admin/puzzles`;
  - its frozen copy is in `private.puzzle`;
  - a run plays all 7 questions on the local stack, with typed answers matched by their aliases (e2e);
  - answers are stored by thing ID.
- [x] **Admin search and browse:** an admin looks up a thing by name or alias and sees its names, aliases, facts and categories (e2e). A non-admin gets 403.
- [x] **Credits:** the privacy page has a "Data sources" section crediting the CC BY sources, and names Wikidata and USDA.
- [x] **The M13 matching items:** a plural alias without its synonym, digits under the typo rule, and zero-width characters stripped by normalization. Each has a test.
- [x] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql` and `npm run test:e2e` pass, and so does CI. Local, 2026-10-24: 35 files (204 tests), 33 db files (222 tests), `Result: PASS`, 13 e2e passed. CI on PR #71 at `0ffaf79`: check, db, e2e, secrets and Vercel all pass (runs 40143057892, 40143059567).

## Out of scope
- Learning from misses, the audit page and undo: 13b.
- Rarity from play, the dodging host, and the 3-familiar-answers rule: 13c.
- The question bank, themes, the repeat gap, AI-filed traits ("can fly") and trait recipes, and tuning: 13d.
- The hosted database (M15), and in-app AI drafting (ROADMAP Later).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 193, 118, 50 | Expected counts of countries (UN members), elements and US states | Facts about the world, checked against Wikidata in the evidence. Not tuning values |
| 20 random samples (`BASE_REVIEW_SAMPLE`) | The import review summary | Human, 2026-10-24: "Summary + flags (Recommended)", whose option text said 20 |
| 223 of 226 animals | The animal hypothesis | M04 measurement (ROADMAP, M13 row) |
| SPARQL limits: 60 s, 5 parallel queries | The import scripts | SOURCES.md, Wikidata |
| 50,000 rows per slice (`BASE_SLICE_ROWS`) | How many rows each bd:slice request asks for | Human, 2026-10-24: "50,000 (Recommended)", after Claude measured one such slice at 0.85 s against the 60 s limit |
| 118 (atomic number cap) | The element recipe | The known elements. Checked against Wikidata: 118 items, one per number |

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
| T1, Q1 (animal): "Catalogue of Life tree, with Wikidata's English common names" | Wikidata's parent-taxon tree and common names, merged with Open English WordNet's animal tree. Catalogue of Life isn't used yet | Wikidata alone held 84 of the 226 old animals; with WordNet, 224. Catalogue of Life's role is the tie-breaker when sources disagree, which comes with 13b's facts rule. Approved by the human, 2026-10-24: "Approve as built (Recommended)" |
| T1, Q3 (fruit): "Open English WordNet and Wikidata" | Wikidata alone | Its tree holds tomato under fruit, the "accept in both" case. Approved by the human with the row above |
| Wikidata (SOURCES.md): SPARQL queries within 60 s | The large sets are read with bd:slice, the query service's index slicing | One query over the animal tree, or over any high group, times out. bd:slice isn't named in the SOURCES.md pages (*unverified* as a documented feature); it worked on 2026-10-24 |
| M13 D3: "IDs owned by Plor (a random ID per thing)" | Computed from the source entry (RFC 4122 version 5) | The human's refinement, 2026-10-24: "Same everywhere (Recommended)" |
| The 13a design: 13a-3 as its own PR | Folded into 13a-2's PR | CI validates the drafted days; once format 2 is retired, the T1 draft is the only one |
| USDA FoodData Central: SR Legacy food descriptions | Only the first part of "Cheese, <kind>, …", without a note in parentheses, and not the nine descriptions in `USDA_NOT_KINDS` | The rest of a description is a variant (low fat, shredded), not a kind (human, 2026-10-24: "Keep real kinds only (Recommended)") |

## Evidence
**13a-1 (2026-10-24, local stack):**
- **The animal hypothesis (≥ 223 of the 226 animals of 2026-10-26's question 1).**
  - **Disproved first,** with Wikidata's common names (P1843) alone: 84 of 226. Horse, cow, elephant, fox, eagle and shark were missing, because Wikidata keeps everyday names in labels, not in P1843.
  - **Holds** with Open English WordNet's animal tree added (`oewn-animals`). The animal category holds **224 of 226**; missing: koi, clownfish.
  - WordNet alone covers 223, the number M04 recorded, so M04 measured WordNet.
- **Sizes.**
  - The sliced reads: 3,997,724 parent links (P171), 784,777 common names (P1843, every language) and 4,000,298 scientific names (P225).
  - 2,358,255 taxa sit under Q729. Kept: 70,899 taxa, 53,013 of them with an English name.
  - In the database: **89.9 MB** for the base tables with their indexes, holding 78,073 things, 234,412 aliases and 82,376 facts (`pg_total_relation_size`).
- **Loads,** in order. Each line is `LOADED <set>: {things, aliases, facts}`:

  | Set | Things | Aliases | Facts |
  |---|---|---|---|
  | wikidata-animals | 70,899 | 209,685 | 72,622 |
  | wikidata-dog-breeds | 927 | 2,497 | 1,852 |
  | oewn-animals | 2,820 new (4,010 items) | 12,673 | 4,041 |
  | wikidata-countries | 195 | 1,154 | 386 |
  | wikidata-elements | 119 | 606 | 118 |
  | wikidata-us-states | 51 | 450 | 50 |
  | wikidata-fruit | 3,004 | 7,151 | 3,250 |
  | oewn-cheese | 38 | 108 | 37 |
  | usda-cheese | 20 | 88 | 20 |
- **Reviews** (`npm run base -- review <key>`), for the human:

  | Category | Members | Flags |
  |---|---|---|
  | US state | 50 | none |
  | Chemical element | 118 | 1 alias on two members ("ununnilium": darmstadtium / roentgenium, a Wikidata error) |
  | Country | 193 | 1 alias on two members ("bh": Bahrain / Bosnia and Herzegovina: country codes come in as alternative labels) |
  | Fruit | 2,999 | Wikidata's tree brings in thousands of named apple and pear cultivars, and protected-origin products ("Limone di Siracusa PGI"). 251 under two or more parents; 56 aliases on two members |
  | Cheese | 48 (37 WordNet, root left out; 11 new from USDA, another 20 merged into WordNet's) | none, after two fixes. A USDA note in parentheses had been read as part of a name. And nine USDA "kinds" that describe a cheese were dropped (human, 2026-10-24: "Keep real kinds only (Recommended)"): pasteurized process, mexican, mexican blend, american cheddar, dry white, white, fresh, low fat, low-sodium (`USDA_NOT_KINDS`) |
  | Dog breed | 928 | 924 under two or more parents (dog breed, the domestic dog, and a WordNet parent such as terrier) |
  | Animal | 56,787 | 4,958 under two or more parents; 9,710 aliases on two or more members; 17,857 unnamed ancestors left out |

  The animal duplicates are mostly one name at several ranks of one line (Wikidata gives "aardvark" to the species, its genus and its order) or a WordNet entry that didn't merge. **For 13a-2:** when a typed name fits several members on one line of the tree, it resolves to the highest, which covers the rest.
- **Tests:**
  - `npm run test:sql` → `Result: PASS`, including `answer_base.test.sql` (19 tests);
  - `npx vitest run scripts/base.test.ts` → 8 passed;
  - `src/app/api/admin/base/route.db.test.ts` → 4 passed;
  - `npx playwright test e2e/admin-base.e2e.ts` → 1 passed;
  - `npx tsc --noEmit -p .` and `npm run lint` clean.

**13a-2 (2026-10-24, local stack):**
- **Format 3 and the engine,** on the fixture base and day (`src/test/answer-fixture.ts`):
  - `npm test` → 35 files passed (204 tests), including:
    - `matching.test.ts`: one-edit texts, the shared-name pick, answers among candidates;
    - `scoring.test.ts`: hand-worked bonuses (cat 9, kiwi 4, green 6; with counts, cat 5);
    - `content-validate.test.ts`: 14 format-3 rules;
    - `draft.test.ts`: the letter picker.
  - `npm run test:db` → all files passed, including:
    - `runs.db.test.ts`, 34 tests on the new engine;
    - `matching.db.test.ts`: exact and scientific names, a catch under "bear", "aardvark" at two ranks, "robin", typos (one answer, two answers, under 4 letters, digits, past a stolen letter), and an alias added after approval;
    - `ledger.db.test.ts`: hand-worked points: A 150 + 0, A's second day 25 + 9, B 1000 + 67, C and E 75 + 8.
  - `npm run test:sql` → `Result: PASS`, including `answer_engine.test.sql` (IDs given, a merge's display name, resolving as of approval) and `puzzle_entry.test.sql` (approval against the base, OB009).
  - `npm run test:e2e` → 13 passed, on the fixture day, including `approve-and-play.e2e.ts`: an admin approves a fixture draft on `/admin/puzzles` (stored with `approved_at` and its member counts), and a player survives all 7 questions past the stolen letters.
- **The T1 day with the real data.** `npm run draft` wrote `content/offbeat/2026-10-24.json`, with letters Q2 M, Q4 C, Q5 T and Q7 E.
  - Getting there, the draft refused "dog" and "cat": each names several members. It also refused "China", which names no country (below). And no letters fit until question 5's hosts were narrowed to Brie.
  - An admin approved it on `/admin/puzzles`. The member counts were 56,787, 193, 2,999, 928, 48, 118 and 50.
  - A player survived all 7: "aardvrk" read as Aardvark (a typo), "kiwi" shown as kiwifruit, then Kenya, Shiba Inu, Gouda, neon and Hawaii, past the stolen letters. 1000 points, with a provisional bonus of about 479.
  - Recorded by a temporary Playwright script on the local stack, deleted after.
- **Found while drafting,** for Next revision:
  - WordNet's "dog" (linked to Wikidata's concept Q144) didn't merge with Wikidata's dog taxon (Q26972265), so "dog" names two members.
  - "China" isn't an alias of the People's Republic of China.
  - Plurals of proper names come in as aliases ("peoples republic of chinas").
  - In a category of 56,787, every answer outside the host bank earns near the full provisional bonus, which 13c's levels address.

## Review
**13a-1:** the `reviewer` agent reviewed the diff in a fresh context, 2026-10-24.
- **Blocking findings and how each was fixed:**
  - *A 429 with no Retry-After header retried at once, forever* (`Number(null)` is 0). The header is now checked first, and a missing or unusable one stops the fetch.
  - *Two numbers outside `tunables.ts`, one with no allowed origin.* `BASE_SLICE_ROWS` and `BASE_REVIEW_SAMPLE` are now in `src/config/tunables.ts`. The human chose the slice size (50,000).
  - *An empty Source diff while T1's sources changed.* Filled in; the human approved the sources as built.
  - *HANDOFF.md, the ROADMAP row and this Status line were stale.* All updated.
  - *private.base_lookup was never tested as plor_app.* `src/admin/base.plor-app.db.test.ts`: the lookup works as plor_app, and plor_app can neither read the tables nor import.
  - *The cheese evidence didn't add up.* Reloaded and counted again: 48.
- **Taken now, though not blocking:**
  - "adapted" in the CC BY 4.0 credit for WordNet;
  - two stale comments in scripts/base.ts;
  - the USDA descriptors, dropped with the human's OK.
- **For 13a-2 (done there):** a WordNet animal merged into a Wikidata thing keeps that thing's name, which can be scientific; the frozen day needs a display-name rule. Also, a typed name on several members of one tree line resolves to the highest (Evidence).
- **Deferred to ROADMAP "Next revision":**
  - a final slice that comes back exactly full;
  - slicing a live index;
  - same_as ignored on items already linked;
  - fruit items left with no parent;
  - the membership walk written three times;
  - the fruit and country flags.

**13a-2:** the `reviewer` agent reviewed the diff in a fresh context, 2026-10-24.
- **Blocking findings and how each was fixed:**
  - *`private.approve_puzzle`, a security-definer function, used a temp table,* which a caller's session could have created first in `pg_temp`. The members are now held in an array variable.
  - *The SQL tests missed cases:*
    - a `member_of` question;
    - the root's exclusion (checked by a name the root didn't hold);
    - a membership added after approval.

    `answer_engine.test.sql` now covers all three (plan 14).
  - *No committed test approved a day on `/admin/puzzles` or played all 7 questions.* `e2e/approve-and-play.e2e.ts` does both, on the fixture.
  - *The Status line, HANDOFF, the ROADMAP row and this section said "reviewed" before the review was recorded.* All updated, with the DECISIONS.md Log row naming the `approve_puzzle` rewrite.
- **Deferred to ROADMAP "Next revision"** (For M13):
  - `pickAnswer` on a kind_of cycle;
  - typo edits only insert plain letters;
  - an import racing an approval;
  - the tree walks, written in more places;
  - names falling back to IDs;
  - the drafting script's name resolution, untested;
  - the OB009 message split on "; ";
  - fixture things left in the local base;
  - old-format content failing loudly.
