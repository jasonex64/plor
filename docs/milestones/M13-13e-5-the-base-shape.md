# M13 13e-5 — The base's shape

**Status:** in progress (2026-10-26): guided questions answered (below); the design approved (human, 2026-10-26: "Approve 13e-5's design. Read the Wikidata concept → taxon property and bring its SOURCES.md row."); the SOURCES.md row added ("Add it (Recommended)"); items 3 and 4 (circles refused, one walk) built, reviewed and passing every suite on the Mac, not yet in a PR; items 1 and 2 (the join, the review's lists) wait for the snapshots on the Mac (the human has no access to the Windows PC until later, 2026-10-26). Pop culture moves from 13e-5 to 13e-6 and is written against this shape. Item 7 (the scripts connect like the app), added from the 2026-10-26 audit by the human's approval, built and tested on the Mac, not yet in a PR. **2026-10-27, the Windows PC:** items 1 and 2 built against the snapshots; the fetch disproved "dog joins", and the human moved dog and Wikidata's own doubles to **13e-5b** ("Next sub-ticket (13e-5b)"); items 8 (the simulator as a command) and 9 (ANALYZE after `load all`) added; the full load, the review, the simulator (39 of 40) and the size done; reviewed; in review in one PR.

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
| 2026-10-27, after the fetch disproved "dog joins" (Reading the snapshots, below): what happens to "dog" and the 29 words like it, whose synset names several loaded taxa? | "whatever is most organized". Claude's reading: keep the rule (join only when one is loaded) and print them in the review, since their doubles are Wikidata's own (one species, two items) and 13e-5b fixes those once for all of them; a merge function here would be a second way |
| 2026-10-27: when are Wikidata's own doubles (3,783 names in `animal` on two or more Wikidata-only things) fixed? | "Next sub-ticket (13e-5b)": after 13e-5, before 13e-6, from a source read of how Wikidata marks a duplicate or replaced taxon |

**Item 7, from the 2026-10-26 codebase audit (finding TOOL-5, proposal 13-α; guided questions the same day):**

| Question | The human's answer |
|---|---|
| Should the scripts ever write to plor.app's database? | "Hosted too, guarded" |
| When it's built | "Guard now, hosted in M15" |
| Which PR | "fold into 13e-5, but can u explain like im five the entire changes that are going to be made and what they mean"; after the explanation: "Approve all three: … build the guard fix as 13e-5 item 7" |
| Which role a hosted load connects as (for M15) | "postgres, recorded" (DECISIONS.md Log, 2026-10-26) |
| How the hosted URL reaches the script (for M15) | "[No preference]": open for M15 |

Correction recorded with these: ROADMAP's Design review item 1 (a popularity tier per entry for the host's dodge) was replaced in 13c by host answers drawn at random from the bank (13c ticket, "How dodges get onto a day"), so it isn't a shape question.

## Source
- **The M13 ticket:** D2 (the sources, reviewed snapshots), D3 (Plor's own IDs, each linked to its source's), D6 (lenient aliases, one typo, two-entry ties a retry).
- **SOURCES.md, Wikidata (M13, D2)** and **Open English WordNet (M13, D2):** where joins and series links come from.
- **SOURCES.md, Wikibase RDF Dump Format, Sitelinks (13e-3):** the sitelink count that picks the better-known title.
- **SOURCES.md, Wikidata common-name link (13e-5):** P13176 and its inverse P14067, added by the human's OK (2026-10-26).
- **Item 7:** DECISIONS.md, "Database access from route handlers" ("pg receives explicit fields, never a `connectionString`"; any query parameter rejected, M00 review 3) and SOURCES.md's node-postgres row.
- **Not yet in SOURCES.md:** the property for "part of the series" and the class that marks a single-medium series; Claude brings their row with 13e-6, before its code.

## Claude's design (approved by the human, 2026-10-26)
**Built in 13e-5** (each has a caller today):
1. **Auto-join.** The WordNet import's `same_as` already joins a synset to a loaded Wikidata thing (`scripts/base.ts`). It's extended to follow P13176 from a common-name item to its taxon, so a synset naming Q144 joins the loaded Q26972265: one thing, both sets of names and facts. **Only clear cases join:** when exactly one of the taxa the item names is loaded. Otherwise nothing joins, and the review prints the word with its taxa for a person to fix by hand (human, 2026-10-26: "Join only clear cases (Recommended)"). How a hand fix is written is settled in the build: `data/links.json` holds "kind of" links today, and whether it can carry a join is *unverified*.
2. **Odd joins in the review.** `npm run base -- review` prints every join where the two sides share no name, or where the WordNet side sits outside the WordNet branch matching the Wikidata set's root (an animal joined to a WordNet food). A person checks the list in the PR.
3. **Circles refused.** `private.import_source` refuses an import that would close a circle in "kind of", naming it, and nothing loads (fail loudly).
4. **One walk.** One function per direction (down: a root's members; up: a thing's ancestors), used by the five places above.

**Added from the audit, built in 13e-5** (the human, 2026-10-26, above):
7. **The scripts connect like the app.** `localClient` (`scripts/base.ts`, used by `npm run base` and `npm run draft`) checked `new URL(url).hostname` but gave pg the whole URL, and pg reads `?host=` from it, so `postgresql://…@127.0.0.1:54322/postgres?host=elsewhere` passed the guard and connected elsewhere, without verified TLS. It now reads `DATABASE_URL` through `src/config/env.ts`'s `readDatabaseUrl` (the app's parser, which refuses any query parameter), refuses any host but this machine (`isLocalHost`), and gives pg the parsed fields. Who uses it: the human and every drafting or loading session. A security change (secret handling), approved by the human and recorded in the DECISIONS.md Log. Loading plor.app's base stays out of scope until M15.

**Added in the build (2026-10-27, the Windows PC), each needed to meet a criterion above:**
8. **The simulator is a command,** `npm run draft -- simulate` (`scripts/draft.ts`): `draft()` for 40 dates 3 days apart from 2027-01-01, the drafted days on disk as the only past days, no files; it prints each day or its failure and the count. It was rewritten by hand as a scratch script for 13e-2, 13e-3 and 13e-4b (ROADMAP, From 13e-3), and criterion 8 needs it a fourth time (CLAUDE.md, "Repeated procedures are scripts"). Who uses it: every batch's check that days still draft.
9. **`load all` analyzes the base's tables at its end.** Right after a fresh `load all`, the planner's statistics still describe empty tables until autovacuum runs: a query over `animal` ran over 10 minutes and was cancelled, and after `analyze` it took 2.6 s (Evidence). Without it the review, criteria 2 and 4, can't run right after a load.

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
- [x] The review prints every common-name item that names more than one loaded taxon, unjoined (Evidence: 30 in `animal`).
- [ ] ~~After `npm run base -- load all`, "dog" names one member of `animal` (and of every category holding it), carrying WordNet's and Wikidata's names (db test on fixtures; the real count in the review output).~~ **Moved to 13e-5b** (human, 2026-10-27: "Next sub-ticket (13e-5b)"): dog's double is Wikidata's own, one species under two items, both loaded (Reading the snapshots). Giraffe, okapi and horse now name one member each (Evidence).
- [x] `npm run base -- review` prints odd joins; its output on the full load is in the PR (40 in `animal`).
- [x] An import that closes a circle fails, names it, and leaves the base unchanged (pgTAP: Evidence).
- [x] The five walks call one function per direction (diff), and `npm test`, `npm run test:db`, `npx supabase test db` and `npm run test:e2e` pass (Evidence).
- [x] `localClient` refuses a `DATABASE_URL` with a query parameter before connecting, refuses any host but this machine, and still connects to the local stack (item 7: Evidence).
- [x] Every one of the 40 simulated days that drafted before still drafts: 39 of 40, the same poem day failing as in 13e-4, once three bank answers named by retired IDs became names (Evidence).
- [x] A fresh `load all`'s database size is measured and recorded (for "Load all, pay when near"): 284 MB (297,989,811 bytes), 289 MB before.

## Out of scope
- Series and titles' code (13e-6).
- Loading plor.app's base from the scripts (item 7 stays local-only; the human: "Guard now, hosted in M15").
- Readers that skip `removed_at`, and the rest of ROADMAP's For M13 items (the human: "One tree-walk function" only).
- Pop-culture categories.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| None | Joins, circles and the walk need no tuning value; the title clash compares sitelink counts with no threshold | — |
| 40 days | The simulator's dates (item 8) | 13e-2's simulator, rerun with the same values in 13e-3 and 13e-4 so counts compare (13e-3 Evidence: "40 dates three days apart from 2027-01-01"; 13e-4 Evidence: 39 of 40) |
| 3 days apart | The same | The same |
| From 2027-01-01 | The same | The same |

## Plan
1. The human approves this design. Claude reads the Wikidata property pages and brings the SOURCES.md rows.
2. **Hypothesis:** following the concept → taxon link joins most WordNet animal synsets that link a Wikidata concept, and few joins are odd. Expected: "dog", "cat", "horse" join; odd joins are a short list a person can read. **Disproved if** the odd list is too long to read in a PR, or common animals still have doubles: then stop and re-ask. *Partly tested 2026-10-26 (Reading Wikidata): the link is P13176, and it often names several taxa, which the human settled; the counts against the loaded base wait for the snapshots on this Mac.*
3. Migration: the one walk, the circle check in `import_source`. Then the import's join, the review's odd list.
4. Full load, the suites, the 40 trial drafts, the size.
5. Review by the `reviewer` agent; blocking findings fixed, the rest to ROADMAP.

## Removes
- Four of the five copies of the walk.
- `localClient`'s own URL parsing and its `connectionString` (item 7).
- 139 WordNet/Wikidata doubles (giraffe, okapi, horse, killer whale…) and the three bank answers picked by ID because of them (killer whale, giraffe, horse). "dog" and 29 like it move to 13e-5b.
- The scratch simulator, rewritten by hand three times (item 8), and ROADMAP's two items asking for it as a command (From 13e-3).
- ROADMAP For M13 items it closes: the membership walk written three times (13a-1), the kind_of walks (13a-2), merging across sources (13a-2), imports not refusing cycles (13a-2).
- ROADMAP's Design review item 1, marked replaced by 13c.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Design item 4: one function per direction | Down is the new `private.descendants_now(uuid[])`; up stays `private.ancestors_as_of`, which `base_lookup` (through `in_category_now`), `resolve_answer` and `load_links` already shared | The upward walk was already one function; only the downward one was copied (4 places, not 5) |
| — | The review's "unnamed" count now skips removed kind_of facts, as `descendants_now` does | One walk; the count is more accurate. Recorded in ROADMAP (13e-5 review) |
| Design item 1: follow P13176 from the ID a synset names | Also reads a synset's Wikidata IDs as a list: WordNet's JSON gives a list for some synsets, which the old link compared as one value, so they never joined | 139 joins the approved auto-join meant to make were missing; the "only clear cases" rule applies over all the IDs a synset names |
| Design item 1: a hand fix for a word naming several taxa, its form settled in the build | Not built | No caller: the human kept the rule ("whatever is most organized"), and 13e-5b fixes the doubles at Wikidata's side |
| Criterion 3: "dog" one member, a db test on fixtures | Moved to 13e-5b. The merge itself is `import_source`'s `same_as`, already in `answer_base.test.sql` ("same_as adds no thing"); the new rule is TypeScript, tested in `base.test.ts` | dog's synset names two loaded taxa (Reading the snapshots) |
| Design item 2: odd joins share no name, **or** the WordNet side is outside the branch matching the Wikidata root | Only the first | The second can't fire: only oewn-animals links to Wikidata, and `oewnSubtree` puts every item in it under 00015568-n; USDA's cheeses join by a shared name |
| Design item 2: the review prints them | The review reads both lists from the loaded snapshots, not the database | Which taxa a word could join exists only in the WordNet snapshot (`unjoined`); a snapshot fetched and not loaded would mislead (ROADMAP, 13e-5 second review) |
| The root's link applied only when its Wikidata root is loaded | Applied always | A missing root now fails the import ("same_as refs unknown") instead of loading WordNet's tree unjoined |
| 13a-1's fixture: a cycle loads and categories walk through it | The cycle is out of `answer_base.test.sql`; `one_walk.test.sql` asserts imports refuse one and the walk still stops on one loaded before 13e-5 | The human's rule changed it ("Yes, check on import (Recommended)") |

## Reading the snapshots (2026-10-27, the Windows PC)
**Hypothesis** (Plan 2): "dog", "cat" and "horse" join; the odd list is short. **Result:** the odd list is short and horse joins, but "dog" and "cat" don't, so that half is disproved and the human was asked (decisions table, 2026-10-27).
- `npm run base -- fetch oewn-animals` → "oewn-animals: 326 Wikidata IDs not loaded, 4 of them with P13176; 2 joined by it, 30 unjoined", "FETCHED oewn-animals: 4010 items, snapshot 2026-10-27". P13176 joins little: the loaded taxa are mostly named directly.
- Against the 2026-10-24 snapshot: 1,190 joins → 1,329; 0 lost, 0 changed, 139 added, every one from a synset whose Wikidata IDs are a list (the first fetch failed on one: `VALUES ?c { … wd:Q124657158,Q664443 … }`).
- **dog's synset lists two loaded taxa itself:** Q26972265 "Dog" (Canis lupus familiaris) and Q20717272 "Domestic Dog" (Canis familiaris); cat's, Q20980826 "cat" and Q57818409 "house cat". Most of the 30 are such pairs (Surfbird Q28070835 / Q1274741); a few aren't (horseshoe crab: Limulidae / Atlantic horseshoe crab).
- Wikidata's own doubles are bigger than WordNet's: in `animal`, 5,095 names were on two or more members, 3,783 of them on two or more Wikidata-only things (a query before the reload). Some may be truly different animals sharing a name.

## Evidence (items 1, 2, 8 and 9, 2026-10-27, the Windows PC)
- **The full load,** fresh: `npx supabase db reset --local`, then `npm run base -- load all` → `LOADED oewn-animals (2026-10-27): {"facts":4040,"things":2681,"aliases":12304,"numbers":0}`, …, `DEFINED 82 categories from data/categories.json`, `ANALYZED the base's tables`, in 54 s. No import refused a circle, so no snapshot holds one (the 13e-5 review's unverified item).
- **Size:** `select pg_database_size('postgres')` → 297989811, `284 MB` (289 MB before the reload).
- **Joined:** in `animal`, "giraffe" names one member, `Giraffe` (`wikidata:Q15083 oewn:02441664-n`); "okapi" `Okapi`; "horse" `Domestic Horse` (`wikidata:Q10758650 oewn:02377103-n`); "killer whale" one; "dog" still two (`oewn:02086723-n`, `wikidata:Q26972265`). `animal` has 57,224 members (57,358 before).
- **Item 9:** the first query over `animal` after a fresh load ran over 10 minutes (`pg_stat_activity`: active 00:10:12) and was cancelled; after `analyze`, 2.6 s. After another reset and a load that analyzes, the same query took 2.5 s.
- **The review,** `npm run base -- review` with all 82 keys (2 min 33 s, exit 0; output in the PR): `animal` flags 40 odd joins (e.g. "crow = Corvus", "zebra finch = Sunda Zebra Finch", "ten-spined stickleback = Ninespine Stickleback") and 30 unjoined words (e.g. "dog: Dog (Q26972265) / Domestic Dog (Q20717272)"); its subsets flag their share (bird 9 and 18, fish 9, insect 5); no category outside the animal family flags either.
- **The simulator** (item 8), `npm run draft -- simulate`: first `DRAFTED 35 of 40`, 4 days failing on `animal_k: #069d0b31-… is not a member`. That ID was WordNet's killer whale, picked by ID because two things carried the name; joined, the thing takes the Wikidata side's ID. Three bank answers named retired IDs (killer whale, giraffe, horse; the other 121 of 124 ID answers exist), and each name now resolves to one member, so they became names. Rerun: **`DRAFTED 39 of 40; subset questions 64 of 273`** in 2 min 57 s, exit 1, the one failure 2027-03-26 at "Name a kind of poem", as in 13e-4.
- **Unit:** `npm test` → "Test Files 40 passed (40) Tests 391 passed (391)" (388 + 3). `npx tsc --noEmit -p .` exits 0; `npx eslint scripts` clean; `npm run content:validate` → "CONTENT OK content: 1 file(s)".
- **Not changed:** the T1 day (`content/offbeat/2026-10-24.json`, unapproved) still names WordNet's horse and giraffe by their retired IDs (Waiting on the human, HANDOFF).

## Evidence (items 3 and 4, 2026-10-26, the Mac)
- **Migration applied locally:** `npx supabase migration up --local` → "Applying migration 20261026212300_one_walk.sql... Migrations applied".
- **pgTAP:** `npx supabase test db` → "Files=25, Tests=414 … Result: PASS" (406 before, 8 new in `one_walk.test.sql`). The 13a-1 fixture's cycle first failed as expected: "import_source: a kind_of circle: loop two (…) kind_of loop one (…), and loop one is already under loop two".
- **The db suite:** `npm run test:db` → "Test Files 40 passed (40) Tests 264 passed (264)", before the review's added pgTAP test, which touches no TypeScript.
- **Unit:** `npm test` → "Test Files 40 passed (40) Tests 386 passed (386)". `npx tsc --noEmit -p .` exits 0; `npx eslint scripts/base.ts scripts/draft.ts` clean.
- **No other walk:** `grep -rn "with recursive" scripts src | grep -v "\.test\."` prints nothing; the migration holds one recursive walk, `descendants_now`'s.
- **Time:** a synthetic import of 57,000 things in a binary tree (rolled back) took 2.7 s with the circle check, `{"facts": 56999, "things": 57000}`. Real taxa: *unverified*.
- **e2e:** `npm run test:e2e -- --reporter=line` → "44 passed (1.4m)", rerun once the M14 session's suite had finished and port 3000 was free. The first run had collided with the M14 worktree's `next dev`, which started on port 3000 at 14:27:18 mid-run (38 failed with `ERR_CONNECTION_REFUSED` or timeouts); it doesn't count.

## Evidence (item 7, 2026-10-26, the Mac)
- **Hypothesis first:** a `127.0.0.1…?host=elsewhere.invalid` URL passes today's guard and pg tries `elsewhere.invalid` (`.invalid` never resolves, RFC 6761); disproved if the old code already refused it, or the fixed code still connects.
- **Red, before the fix:** `npx vitest run scripts/base.test.ts -t localClient` → "× refuses a query parameter that would send pg to another host, before connecting … but got 'getaddrinfo ENOTFOUND elsewhere.inval…'", "Tests 1 failed | 1 passed".
- **Green, after:** the same command → "✓ refuses a query parameter … 1ms", "✓ refuses a database that isn't this machine 0ms".
- **Still connects locally:** a throwaway script calling `localClient()` with `.env.local` → `connected: { current_user: 'postgres', port: 5432 }` (deleted after).
- **Unit:** `npm test` → "Test Files 40 passed (40) Tests 388 passed (388)" (386 + the 2 new). `npx tsc --noEmit -p .` exits 0; `npx eslint scripts/base.ts scripts/base.test.ts src/config/env.ts` clean. `npm run test:db`, pgTAP and e2e not rerun: item 7 touches no SQL, and the db suite shares the stack with the M14 session.

## Review of items 1, 2, 8 and 9 (`reviewer` agent, fresh context, 2026-10-27)
- Blocking findings and how each was fixed:
  - the simulator's 40, 3 and 2027-01-01 had no origin in this ticket: the Numbers table names them;
  - ANALYZE and the simulator weren't ticket items, and ROADMAP's simulator items stayed open: items 8 and 9 above, the Removes list, ROADMAP's two items marked done.
- Its own checks: 0 joins lost or changed between the snapshots, 139 added, 30 unjoined, 40 odd; every unjoined taxon ID is in the Wikidata snapshots; the manifest's checksum matches.
- Deferred to ROADMAP "Next revision": For M13, "From the 13e-5 second review".

## Review (`reviewer` agent, fresh context, 2026-10-26)
- Blocking findings and how each was fixed:
  - nothing tested that the walk stops on a circle already in a base (bases loaded before 13e-5 may hold one): `one_walk.test.sql` now inserts one directly and asserts a finite walk;
  - ticket, ROADMAP and HANDOFF not updated: done in the same commit.
- Deferred to ROADMAP "Next revision": For M13, "From the 13e-5 review" (the unnamed count, which circle is named, the unchanged-base test's reach, the real snapshots unverified).
- **Item 7** (`reviewer` agent, fresh context, 2026-10-26): no blocking findings (`readServerEnv`'s checks and messages unchanged, pg gets fields only, no secret printed). Deferred to ROADMAP, For M13: `readSupabaseAuthEnv`'s `LOCAL_HOSTS.has` beside `isLocalHost`. Closed, not parked: the scripts' missing-URL message now points at DECISIONS instead of `.env.local`, and the remote-host test also passed before the fix (a regression guard, not the red test).
