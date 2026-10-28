# M13 13f-3 — Import and draft tools

**Status:** 13f-3a done (PR #114, merged on green CI 2026-10-28 UTC, `6e3bd73`; its migration pushed to plor.app the same day) (approved by the human, 2026-10-27: "I approve 13f-3's design as drafted. Build 13f-3a, removal on load, first."). 13f-3b: two rounds of guided questions answered and the design approved (2026-10-28), in two PRs; 13f-3b-1, the load's gaps, done (PR #115, merged on green CI 2026-10-28 UTC, `dae910c`; its migration not yet on plor.app, the human: "Don't push the migration to plor.app yet"); 13f-3b-2, failures, tests, admin, cleanup, built, in review (its PR number follows).

## Goal
Make the load match the files exactly, removing what they no longer give (13f-3a); and close the tool items that can fail silently or mislead, with tests for the code that runs every day, the two admin fixes, and suites that clean up after themselves (13f-3b).

## Who uses it / what breaks without it
- **Used by:** whoever loads a base (locally now, plor.app in M15), the drafting session, the admin pages, the test suites.
- **Breaks without it:** a link, category, renamed or removed name, or a re-fetched set's dropped rows stay in the base until a `db reset`, which plor.app can't do once players exist (it bit in 13e-3: the rivers' old short names stayed on Windows). A typo in a hand file can do nothing without a word. The Puzzles page shows a raw ID for a missing name. The suites leave fixture things in the local base, where the admin lookup shows them.

## What the human decided (2026-10-27)
Round 1:
- Removal: **"Build it now (Recommended)"**: a load makes the base match the files and snapshots exactly, so local and hosted loads behave the same, before plor.app gets a real base (M15).
- Scope: **"Failures and tests first (Recommended)"**: everything that can fail silently or mislead, and tests for code that runs every day (draft, load); comment-only and fetch-only items move to Later.
- Admin: **"Fix both (Recommended)"**: a missing name shows as an error, not an ID; changing a host answer that has a match group can be fixed on the page.
- Leftovers: **"Suites clean up (Recommended)"**: each db test removes what it adds.

Round 2:
- What a load does with a row the files no longer give: **"Erase it"** (asked again in simpler words; the first wording asked to be reworded).
- The thing itself: **"Keep the thing, erase the rest (Recommended)"**: its names, facts and links are erased so it stops counting; its row and shown name stay, so past results still show it, and thing IDs stay permanent (format 3).
- Never removed: **"Player-added (Recommended)"** and **"Human decisions (Recommended)"**: only rows a load once loaded from a source or a hand file. (Not chosen: keeping everything an approved day names.)
- **"Two (Recommended)"**: 13f-3a and 13f-3b, a PR each.

## Decided during the build (2026-10-27)
- When an erase happens, since DECISIONS.md promises a started day never changes: **"Erase at the next midnight (Recommended)"**: "A load marks what to erase; the rows go when the next day starts, so today's day stays exactly as it began. The promise holds; erasing waits up to a day."
- After the second review (a run can be finished after midnight, DECISIONS.md Timer): **"Wait one more day (Recommended)"**: "Erased rows go a day later, so a run finished the next day still counts them. A run left open for 2+ days could still lose one. Erasing waits up to 2 days."
- A category the file drops while an approved day uses it: **"Keep for those days (Recommended)"**: "The category stays until no approved day from today on uses it, then goes at a later load." Built as from yesterday on, for a run of yesterday finished today (the answer above).

## 13f-3b's guided questions (2026-10-28)
Round 1:
- The 13f-3a review's eight deferred items (ROADMAP, "From the 13f-3a review"): **"All eight now"** (not chosen: the three safety ones only, or none).
- The admin item "changing a host answer that has a match group": **"Close it (Recommended)"**: format 3 retired match groups (DECISIONS.md, Catching) and host answers are ticked chips, so there's nothing to build.
- A missing name on the Puzzles page, with plor.app's answer database empty by choice: **"Mark each one (Recommended)"**: the page loads, each missing answer shows as an error naming its ID, and approval stays refused.

Round 2:
- A category only an older day uses, while a run of that day can still be resumed (a run waits at a reveal until Next, DECISIONS.md Timer): **"Keep while unfinished (Recommended)"**: a category stays while any unfinished run of a day naming it exists; no new number, nothing players see changes.
- A load changing a host answer's name or link on an approved day not yet started: **"Name them, keep going (Recommended)"**: the load finishes and prints each such day and question.
- Shipping: **"Two PRs (Recommended)"**: 13f-3b-1, the load gaps; 13f-3b-2, failures, tests, admin, cleanup. This replaces round 2 of 2026-10-27's "a PR each" for 13f-3b.

Approved (2026-10-28): "I approve 13f-3b's design as proposed. Build 13f-3b-1, the load's gaps, first."

During 13f-3b-1's build (2026-10-28), item 8's truncate: no fix keeps the test's base looking empty without a copy (30 s and more a run) or a test-only option in `load_finish`. Asked in simpler words, the human chose **"Keep it, fail fast (Recommended)"**: "Keep the test as it is, but have it give up at once with a clear error if something else is using the tables, instead of waiting."

## Source
- ROADMAP.md, For M13: the items below and the tickets they cite.
- DECISIONS.md, Answer model (format 3: permanent thing IDs) and its Hard to reverse list; 13e-5b's `private.thing_retired`.

## 13f-3a — Removal on load
### Design
1. **What a load owns:** every alias, fact and link it wrote from a source or a hand file (`origin` `source`, or the hand files' rows: links, added names); never `origin` `players` or `human`.
2. **After `load all`**, each owned row the files no longer give is erased (deleted): an alias a snapshot dropped or names.json removed, a kind_of fact a snapshot dropped, a link links.json dropped, a category categories.json dropped (`private.category`), and a set's item no longer in its snapshot, whose owned names and facts go while its thing row and shown name stay. Rows end at the next midnight (Pacific) and a load a day after it deletes them; a category goes at once unless a day from yesterday on names it (decided during the build).
3. **Shown names follow the files:** a rename (names.json) or a source's new name updates `private.thing.name` on load, so a non-reset load shows what a fresh one does (13f-1's review: "cornet" kept on a live base).
4. **The load prints what it erased** per set (names, facts, links, categories), and erasing nothing prints nothing; a `db reset` before `load all` is no longer needed, and the handoff's steps say so.
5. A security and hard-to-reverse note goes to DECISIONS.md: the base's source rows are erased when the files drop them (human, 2026-10-27: "Erase it"), past days' scores can change with them, and thing rows are never erased.

### Acceptance criteria
- [x] On a base loaded before a change, a second `load all` with an alias, a fact, a link and a category removed from the files leaves the base identical to a fresh `db reset` + `load all` (a db test, and the real base compared by counts).
- [x] A player-added alias and a human decision survive a load that doesn't name them (db test).
- [x] A thing whose item left its snapshot keeps its row and shown name, with no names, facts or links of the load's (db test).
- [x] `check-bank` 0, `simulate` 30 of 30, the suites pass.

## 13f-3b-1 — The load's gaps (proposed 2026-10-28, from ROADMAP "From the 13f-3a review")
### Design (each with a db test that fails before its fix)
1. **One load at a time:** `load_begin` takes a lock that `load_finish` releases, so a second load is refused by name instead of emptying the first one's `load_seen_*`.
2. **No leftovers:** a single `load <set>` and the suites' fixture imports leave no `load_seen_*` rows.
3. **A reload refuses what a fresh load refuses:** a ref to an item that left its snapshot is unknown to this load (`thing_by_ref` checks the load's own items), not found through its old `thing_source` row.
4. **Circle checks on a reload:** `import_source`'s and `load_links`' circle checks ignore facts this load hasn't given, so a re-fetch that reverses an edge loads on a reloaded base as it does fresh; a fact brought back in the finish is checked again.
5. **Shown names:** `load_seen_name` mirrors `import_source`'s rename of a thing with no name alias by a joining non-WordNet or merged item.
6. **Categories in unfinished runs:** a category stays while any unfinished run of a day naming it exists (round 2); `record_miss` raises instead of returning quietly when a day's category is missing.
7. **Approved future days:** the load prints each approved day not yet started, and its question, whose host answer's name or link it ended or renamed (round 2).
8. **The db test:** `resolve_answer` end to end on a fixture day (an ended name counts today, not tomorrow); the truncate's exclusive locks replaced by a scope that doesn't hold three tables for the file's run.

### Acceptance criteria
- [x] Each of 1–8 has a db test that fails before its fix and passes after. *(Items 1–7: each has a check that fails on 13f-3a's code (Evidence). Item 8 has no fix to fail before: its end-to-end check is new coverage of 13f-3a's behaviour, and the human kept the truncate.)*
- [x] On the real base, a reload of a fresh load prints nothing ended, renamed or touched; `check-bank` 0, `simulate` 30 of 30, the suites pass.

## 13f-3b-2 — Failures, tests, admin, cleanup
### Design (each with a test that fails before its fix, where a test can)
- **Silent failures to fail loudly:** `drop_from_set`'s set checked against the sets, and a ref both dropped and set-dropped refused; a single `load <set>` judging names.json's rows for that set; `import_source` refusing a `same_as` that disagrees with the one already linked; the review's `joins…get(t)!` and the circle refusal naming a dropped ID or one circle as named errors; `OEWN_ANIMALS_HAND`'s synset in both `split` and `pick` refused; `define_category` clearing the filter columns when a subset becomes a base; `latestNumber` checking every tied value; a swapped-in question's error naming the swaps before it; a SPARQL reply cut off with an error reported as a timeout; `approvePuzzle` not splitting a problem that holds "; ".
- **Tests for daily code:** `resolveNames`/`nameCandidates` and `expectedCatches` (draft); check-bank on a retired `#<id>`; `within`'s refusal (db) and its unit test's cross-source model fixed; `valueItems` and `define_subset` with some values unknown; the root's `same_as` and the familiar check's 3 agreeing with `FAMILIAR_SAFE_MIN`.
- **The admin pages:** each missing name on Puzzles shows as an error naming its ID, in the host bank and the read-only host answers alike, and the page still loads (round 1); approval stays refused (`checkHostNames`). The match-group item is closed, not built (round 1).
- **Cleanup:** each db test removes the things, categories and fixture days it adds (`fixture_animal`, `dt_`); the review's "no parent" count.
- **To Later (comment-only, fetch-only or style):** `matching.ts`'s stale comment, `pickHosts`'s constants comment, `FACT_TRAITS`' place, the pop groups' `method` text, `simulateDates`' export, `analyzeBase`'s table list, the `Where` type, `fetchTaxa`/`byIds`/P13176 tests, `titleForms`' numbers, the import's slices, `thing_names`' duplicates, `membersOf`' cache, error codes reused, `env.ts`' two spellings, DECISIONS.md Game 1's wording.

### Acceptance criteria
- [x] Each silent failure listed fails loudly in a test.
- [x] Each daily helper listed has a test.
- [x] The missing-name fix, with an e2e or route test; the match-group item closed in ROADMAP with its reason.
- [x] After the db suite, the local base holds no `fixture_` or `dt_` category or thing.
- [x] The Later items moved with their reason; the suites pass.

## Out of scope
- Scale (13f-4). New content.

## Numbers
None new.

## Plan
1. The human approves this ticket.
2. 13f-3a: the owned-row rule, the erase step, shown names, tests; load twice (before/after) on the real base and compare with a fresh one; review; PR; merge.
3. 13f-3b-1, then 13f-3b-2: the same, a PR each (round 2, 2026-10-28).

## Removes
- 13f-3a: the need for a `db reset` before `load all` (the handoff's steps); `import_source`'s insert-only behaviour for owned rows.
- 13f-3b-1: ROADMAP's "From the 13f-3a review" item; `record_miss`'s quiet return; the test's wait on the truncate's locks (kept, taken with `nowait`).
- 13f-3b-2: the closed ROADMAP items (the match-group one among them), the raw-ID fallbacks on Puzzles, the fixture rows the db suites leave, `approvePuzzle`'s split on "; ", and `removeCreatedPuzzles` (now `removeFixtures`).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 13f-3a Design 2: each owned row the files no longer give is erased after `load all` | It ends at the next midnight (Pacific, `removed_at`) and a load a day after that midnight deletes it; an import or link that gives it again before then brings it back | The human's answers during the build ("Erase at the next midnight (Recommended)", "Wait one more day (Recommended)"): DECISIONS.md promises a started day never changes, every started day reads the base as of its start, and a run can be finished the day after |
| Design 2: a category categories.json dropped is erased | Erased at once, unless a player's miss, an admin's addition or a day from yesterday on names it | `private.category` has no `removed_at`; a day in play whose category vanished would break, not just score differently ("Keep for those days (Recommended)"; yesterday's for a run finished today) |
| Design 2 lists aliases, facts, links, categories | Populations end too (`load_seen_number`) | The first review: a population a snapshot dropped stayed current |
| Design 3: a rename or a source's new name updates the shown name | `load_finish` shows each thing the name the files give: a joining WordNet item's, else the name of the item it was made from (`load_seen_name`) | One rule for fresh loads and reloads alike. import_source's other case, a joining item naming a thing that has no name yet, isn't mirrored: on the real base, a reload of a fresh load renamed 0 things |
| Design 4: the load prints what it erased per set | One total for the whole load, and nothing when it's zero | Rows don't record their set (`source_ref` is the source and the snapshot's date), so what to end is decided across the whole load |
| (no source) | Readers of the base as it is now (drafting, approval, `record_miss`, the admin pages: `removed_at is null`) see an ended row gone at once | The days they work on start after the midnight the row ends; only started days must keep it, and those read as of their start |
| (no source) | `load_links` checks a link's names against the name this load gives the thing | On a loaded base the rename lands in `load_finish`, after the links; a renamed thing named in links.json would refuse a reload that a fresh load takes (second review) |
| (no source) | The db test truncates `thing_alias`, `fact` and `number_fact` inside its rolled-back transaction | `load_finish` ends every owned row the test's loads don't give. On the Mac's loaded base that took 95 s per run, and two runs left 7.6 million dead rows (1.7 GB); on plor.app it would lock every row |
| 13f-3b-1 Design 1: `load_begin` takes a lock that `load_finish` releases | A session-level advisory lock, and `load all` runs on one connection from begin to finish | Each set imports in its own transaction, so a transaction lock would end with the first set; a session's lock also goes with the session if the script dies, so a crashed load never blocks the next |
| Design 3: `thing_by_ref` checks the load's own items | `thing_by_ref` is unchanged; `import_source`, `load_links`, `define_category` and `define_subset` refuse, in an open load, a ref to an item no import of it gave (`load_seen_item`) | `thing_by_ref` is called for every ref of every import and by the app's readers; a check per call there would slow every import, and only a load should see its own items |
| Design 4: a fact brought back in the finish is checked again | Brought back by `import_source` and `load_links` (13f-3a's second review moved it there); `load_finish` walks again from each fact this load added or brought back, only when the load also found facts already loaded | On a fresh load every fact is new and each import already checked it against all before it; the walk again would double the check for nothing |
| Design 7: a host answer's name or link | Its names, facts and links, and renames | A fact ending (the answer no longer under its category's root) changes what the day accepts more than a name does |
| Design 5: `load_seen_name` mirrors the fresh rename | Mirrors it, but a thing two joining WordNet items name gets the one with the lower ID; a fresh load's import picks either, so its finish renamed 2 ("central chimpanzee", "wolverine") and every reload after renamed 0 | The import's rename takes whichever joining row Postgres meets first; the finish's pick is fixed, so reloads agree with each other |
| Design 8: the truncate's locks replaced | Kept, taken with `nowait` first | The human's answer during the build: "Keep it, fail fast (Recommended)" |
| 13f-3b-2 Design: approval's problems not split on "; " | `approve_puzzle` gives them as a JSON list in the error's detail, and `approvePuzzle` reads that | A separator a name can't hold doesn't exist; the message stays as it was for a person reading it |
| Design: a single `load <set>` judging names.json's rows for that set | It judges the add and remove rows whose item only that set holds (`handNamesOnlyIn`) | An item in two sets (Oceania, in places and continents) may take its row in the other, which only `load all` sees |
| Design: the review's `joins…get(t)!` | Only `joins.wikidata.get(t)!` stops by name now (`taxonName`) | `joins.wordnet.get(id)!` runs only on IDs `joins.odd` holds, all WordNet items, so it can't miss |
| Design: the review's "no parent" count | The items of the set holding the category's root with no parent, that no item's fact names as a value and that join nothing; fruit shows 1 (Barley grits), every other category 0 | Sets that hold no tree (places) or values (continents, statuses, genres) would fill the count with items that are meant to have no parent |
| Design: the root's `same_as` test | A unit test that the root is linked even when its Wikidata root isn't loaded | The import's refusal of an unknown `same_as` is already a pgTAP test (`answer_base.test.sql`) |
| Design: the familiar check's 3 agreeing with `FAMILIAR_SAFE_MIN` | A db test in `scripts/draft.db.test.ts` that runs `familiarLeft` and `approve_puzzle` at the minimum and one below | As the username lengths' agreement test: the boundary on both sides, not the constant read back |
| Design: each db test removes what it adds | `removeFixtures` (was `removeCreatedPuzzles`) also takes out the fixture base a file loaded; `removeTestBase` takes out a test's own things; `src/admin/bank.db.test.ts` loads the fixture inside its rolled-back transaction | That test read the names other files' leftovers gave it, and failed once none were left |
| Design: a host answer whose name is missing, on the page | A missing one in the editable chips can only be unticked and is drawn as a blocked one (danger colour while ticked, dashed and muted once unticked); while ticked, its question says it isn't in the answer database and Approve waits, as for a stolen letter; the read-only list shows it in the danger colour | Approval refuses it (`checkHostNames`), so ticking it could only end in that refusal (the review: the chip looked the same ticked or not) |
| Design, To Later: the import's slices | Closed as obsolete in ROADMAP, not moved | No `bd:slice` or OFFSET paging is left: `byIds` reads by key since 13e-4c |

## Evidence
On the Mac, 2026-10-27/28 (UTC), with the migration applied to the local stack.
- **db test** `npx supabase test db supabase/tests/load_sync.test.sql`: `Tests=17 … Result: PASS` (after the second review's fixes, `Tests=23 … Result: PASS`), 0 s, and 0 dead rows left in `thing_alias`, `fact` and `number_fact`. It loads an "ls" tree from files A and then B beside an "lf" tree loaded fresh from B, compares them as of the next midnight (names, facts, links, populations, shown names, a joining WordNet item's included), and checks the next-midnight end, a same-day reload bringing rows back (with a linked thing renamed), a load that never finishes bringing back nothing its files don't give, a load the day after keeping them and one a day later erasing them, players' and the admin's rows kept, an item that left its snapshot keeping its thing and shown name, and a category erased or kept (a player's miss, an admin's addition, yesterday's day; erased when only an older day names it).
- **A reload of a fresh real base:** no ENDING or RENAMED line (0 ended, 0 renamed).
- **Reload equals fresh (criterion 1):** with "metal" (names.json `add`), the "trumpet" rename and the brownie link taken out of the files and festival out of categories.json, `load all` on the loaded base printed `ENDING at 2026-10-28T07:00:00+00:00, as the files no longer give them: 1 names, 0 facts, 1 links, 0 populations`, `RENAMED 1 things`, `ERASED 1 categories: festival`. The rows as a day from that midnight reads them, against a fresh `db reset` + `load all` of the same files: aliases 772,991 (`dcd7530e…`), facts 339,820 (`9c5d21fe…`), populations 11,180 (`d7831036…`), categories 230 (`4e31c5e1…`), identical; things 247,713 against 247,652. The 61 extra are the suites' fixture things, kept by design (a reload after the suites ran on the fresh base gave 247,713 again). With the files restored, `load all` printed `RENAMED 1` (cornet's thing shows "trumpet" again), `DEFINED 231`, nothing ended.
- **After the suites**, `load all` printed `ENDING … 79 names, 53 facts`, `ERASED 9 categories: dt_base, dt_d, fixture_animal, …` (the suites' fixtures; 13f-3b makes the suites remove them).
- **check-bank** `CHECKED 231 questions: 0 problems`; **simulate** `DRAFTED 30 of 30; subset questions 74 of 210`.
- **Suites:** `npm test` 43 files, 444 passed; lint and tsc clean; `npm run test:db` 40 files, 270 passed; `npx supabase test db` 29 files, 452 PASS; `npm run test:e2e` 61 passed.
- **Size:** `DATABASE 316 MB` fresh; 321 MB after the suites and a reload.
- **After the second review's fixes** (rows brought back by the import or link that gives them; the one-day wait; the categories' tests; links checked against the files' names): `load_sync.test.sql` `Tests=23 … PASS`; `npx supabase test db` 29 files, 458 PASS; `npm run test:db` 40 files, 270 passed (with the revive first in `load_finish`, 11 failed: the fixtures' names stayed ended; this is why it moved); `load all` after the suites: `ENDING … 79 names, 53 facts, 0 links, 0 populations`, `ERASED 9 categories: dt_base, dt_d, fixture_animal, …` (the suites' fixtures again), `DATABASE 328 MB`; check-bank `CHECKED 231 questions: 0 problems`; simulate `DRAFTED 30 of 30`; `npm run test:e2e` 61 passed; `npm test` 444, lint and tsc clean (before the SQL-only fixes).

### 13f-3b-1 (Windows, 2026-10-28 UTC)
- **Before the migration**, `npx supabase test db supabase/tests/load_sync.test.sql`: `Tests: 23 Failed: 0 … You planned 43 tests but ran 23` (13f-3a's 23 pass, the file stops at 13f-3b-1's first check, `private.load_open` missing). **After** (with the review's fix): `Files=1, Tests=44 … Result: PASS`.
- **Each new check on 13f-3a's code** (the review asked for it run, not read): 13f-3a's seven functions put back in a transaction rolled back, `private.load_open` stubbed to false (13f-3a has no lock), the test file run with `psql -v ON_ERROR_ROLLBACK=on` so each statement stands alone: `pass 24 FAIL 25 FAIL 26 FAIL 27 pass 28 FAIL 29 FAIL 30 FAIL 31 FAIL 32 pass 33 FAIL 34 FAIL 35 pass 36 FAIL 37 FAIL 38 FAIL 39 FAIL 40 FAIL 41 pass 42 pass 43 FAIL 44`. Failing: (1) 25, finishing with none open; (2) 26, `have: 15 want: 0`; (3) 27, 29–31, no refusal; (4) 32, `died: … a kind_of circle: ls aye … kind_of ls c, and ls c is already under ls aye`, and 34; (5) 35 and 37, `have: ls n want: ls you`; (6) 38–40; (7) 41. Passing: 24 (the stub), 28 (a fresh load's refusal, the control), 33 and 36 (after 32's import was refused), 42–43 (item 8, coverage of 13f-3a's behaviour). Afterwards `pg_get_functiondef` shows 13f-3b-1's `load_open` and `load_finish` in place.
- `scripts/base.db.test.ts` (two sessions): passes in `npm run test:db`, 41 files, 271 passed.
- **The real base, fresh then reloaded** (`npx supabase db reset --local`, `npm run base -- load all` twice): fresh `RENAMED 2 things` (Source diff, design 5), 231 categories, `DATABASE 315 MB`, 99 s; reload: no ENDING, RENAMED, ERASED or CHANGED line, 69 s (69 s before the change).
- Two hypotheses were disproved on the way: a reload renamed 425 and then 654 things. The first: a join into a thing the same batch makes can't rename it on a fresh load. The second: the shown-name step ran before the batch's items were linked, so a fresh load marked no names for its new items. Both fixed before the runs above. A reload also stalled (5 sets in 15 minutes) on `load_ref_seen`'s two-branch lookup, now one key lookup.
- **After the suites**, `load all`: `ENDING … 79 names, 53 facts, 0 links, 0 populations`, `ERASED 9 categories: dt_base, dt_d, fixture_animal, …`, `DATABASE 319 MB` (as 13f-3a's). `check-bank`: `CHECKED 231 questions: 0 problems`. `simulate`: `DRAFTED 30 of 30; subset questions 74 of 210`.
- **Suites:** `npx supabase test db` 29 files, 478 PASS; `npm run test:db` 41 files, 271 passed (before the review's test fix, which touched only `load_sync.test.sql`); `npm test` 43 files, 444 passed; tsc clean; lint 0 errors, none in the changed files. `npm run test:e2e`: 60 passed, 1 failed, `shell.e2e.ts` "clock above the tab bar", the known flake (ROADMAP, 14b-2c items); `npx playwright test --last-failed`: 1 passed.

### 13f-3b-2 (Windows, 2026-10-28 UTC)
- **Before the fixes**, the new tests run against the old code:
  - **Unit tests** (temporary copies of HEAD's `scripts/base.ts` and `scripts/draft.ts`, removed after): `7 failed | 70 passed`. Failing: the swapped-in day's error, `latestNumber`'s three-way tie, the split-and-pick synset, `drop_from_set`'s set and double drop, `handNamesOnlyIn` and `parentless` (new), and the SPARQL cut-off reply. Passing: `valueItems` and the root's `same_as`, which are coverage of how the old code already behaved.
  - **pgTAP** `tool_failures.test.sql`, with 13f-3b-1's `import_source`, `load_finish` and `define_category` and the old `approve_puzzle` put back in a rolled-back transaction:
    - `not ok 2` (the `same_as` kept apart without a word);
    - `not ok 3` (`… kind_of tf z …`: the old pick follows the IDs, not the names; with the first IDs tried it happened to agree, so the test was changed until it couldn't);
    - `not ok 5` (the filter left on);
    - 7–9 errored (no detail on the old refusal);
    - 1, 4 and 6 passed (the control, the setup, the unknown values, which the old code already named).
  - **Route db test:** with HEAD's `src/admin/puzzles.ts`, "lists a host answer the base doesn't have with no name" fails with `"name": "11d6ab82-…"`.
  - **The review's taxon lookup:** `taxonName` is new, so its test can't run on the old code; HEAD read `joins.wikidata.get(t)!.name`, which throws a TypeError for a missing taxon. `taxonName`'s unit test: 60 of 60 in `scripts/base.test.ts`.
  - **The page's missing chip** (drawn as blocked once unticked; Approve waits while one is ticked): typechecked and covered by the route test's data, but *unverified* on screen; no e2e draws it.
- **After:**
  - `tool_failures.test.sql` `Tests=9 … PASS`;
  - `npx supabase test db` 30 files, 488 PASS;
  - `npm run test:db` 41 files, 277 passed;
  - `npm test` 43 files, 452 passed;
  - tsc clean; lint 0 errors, none in the changed files;
  - `npm run test:e2e` 61 passed (the e2e files still load the fixture base and leave it; ROADMAP keeps that open).
- **The base after the db suite:**
  - The check: categories `like 'fixture\_%' or 'dt\_%'`, wikidata source IDs `like 'fixture\_%' or 'dt-%'`, and their `base_log` rows.
  - First run: `0|0|0` (categories, items, names).
  - After the review: with e2e's leftovers in the base, `before: 7|55|120`, then `npm run test:db` (41 files, 277 passed), then `after: 0|0|0` (categories, items, log rows).
- **The real base:**
  - `load all` printed no ENDING, RENAMED, ERASED or CHANGED line, `DATABASE 322 MB`, 71 s (the `same_as` refusal found nothing on the real files);
  - `npm run base -- load wikidata-fruit` loaded and judged its own names.json rows;
  - `npm run base -- review fruit animal`: `items of the root's set under nothing (not in the category): 1 (Barley grits)` for fruit, 0 for animal.

## Review
13f-3b-2: the `reviewer` agent, 2026-10-28, in a fresh context.
- Blocking:
  - fixed: the missing chip looked the same ticked or unticked, and a ticked one didn't hold Approve;
  - fixed: the review's taxon lookup had no test (`taxonName`, exported and tested);
  - fixed: the handoff and the Source diff (the slices closed as obsolete) were behind;
  - **waits on the human:** the page reads approval's problems from the error's detail, which plor.app's `approve_puzzle` doesn't give until `20261028060000_load_gaps.sql` and `20261028080000_tool_failures.sql` are pushed (this one needs the other's functions). Merged code deploys to plor.app at once, so until then an approval refused there answers 500 instead of its problems. Push both right after the merge, at the human's word.
- Deferred to ROADMAP "Next revision" (From the 13f-3b-2 review).

13f-3b-1: the `reviewer` agent, 2026-10-28, in a fresh context (read-only queries while e2e ran).
- Blocking, fixed: (1) "and not on tomorrow's" passed for the wrong reason: the links row of `ls-c kind_of ls-root`, ended since item 3, blocked the files' source fact at the same key, so nothing of ls-a resolved tomorrow; the test now gives the link again and checks that "ls aye" resolves tomorrow; (2) the "fails before its fix" criterion stood on reading; the checks were run on 13f-3a's code (Evidence); (3) the ticket's Status, ROADMAP's row and the handoff still said the design waited on approval, and the "From the 13f-3a review" item wasn't closed.
- Deferred to ROADMAP "Next revision" (From the 13f-3b-1 review).

13f-3a:
The `reviewer` agent twice, 2026-10-27, each in a fresh context (read-only queries; no loads).
- Blocking findings and how each was fixed:
  - First review: erasing at once broke "a started day never changes" (the human chose the next midnight); populations weren't ended (`load_seen_number`); shown names followed the files only for one-source things (`load_seen_name`, applied in `load_finish`); the output (totals, nothing at zero); the tests (reload against fresh, links, populations, kept categories filtered to the test's).
  - Second review: `load_begin` brought ended rows back before the load had given them again, so a failed load undid the last one's ends (now an import or a link brings back only the rows it gives; first put in `load_finish`, which left the suites' fixture names ended when their helpers re-imported them, 11 `test:db` failures, so it moved to `import_source` and `load_links`); the first load after midnight deleted rows a run of yesterday finished late still reads (asked: "Wait one more day (Recommended)"); the category-keeping rules lacked tests and the human's word (tests added; "Keep for those days (Recommended)"); a reload refused a link to a thing renamed in the same load (`load_links` checks the files' name); the ticket and handoff unfinished.
- Deferred to ROADMAP "Next revision" (From the 13f-3a review): the circle checks seeing facts the files dropped until the finish; refs to an item that left its snapshot still resolving on a reload; a category a day before yesterday uses erased while a run of it can be resumed (`record_miss` then returns quietly); import_source's "no name alias" rename not mirrored; no word on approved future days a load touches; no lock against two loads at once; the test's smaller gaps (resolve_answer end to end on a fixture day; the truncate's exclusive locks for the file's run); leftover `load_seen_*` rows from single loads and suites.
