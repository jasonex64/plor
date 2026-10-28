# M13 13f-3 — Import and draft tools

**Status:** 13f-3a done (PR #114, merged on green CI 2026-10-28 UTC, `6e3bd73`; its migration pushed to plor.app the same day) (approved by the human, 2026-10-27: "I approve 13f-3's design as drafted. Build 13f-3a, removal on load, first."). 13f-3b not started.

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

## 13f-3b — Failures, tests, admin, cleanup
### Design (each with a test that fails before its fix, where a test can)
- **Silent failures to fail loudly:** `drop_from_set`'s set checked against the sets, and a ref both dropped and set-dropped refused; a single `load <set>` judging names.json's rows for that set; `import_source` refusing a `same_as` that disagrees with the one already linked; the review's `joins…get(t)!` and the circle refusal naming a dropped ID or one circle as named errors; `OEWN_ANIMALS_HAND`'s synset in both `split` and `pick` refused; `define_category` clearing the filter columns when a subset becomes a base; `latestNumber` checking every tied value; a swapped-in question's error naming the swaps before it; a SPARQL reply cut off with an error reported as a timeout; `approvePuzzle` not splitting a problem that holds "; ".
- **Tests for daily code:** `resolveNames`/`nameCandidates` and `expectedCatches` (draft); check-bank on a retired `#<id>`; `within`'s refusal (db) and its unit test's cross-source model fixed; `valueItems` and `define_subset` with some values unknown; the root's `same_as` and the familiar check's 3 agreeing with `FAMILIAR_SAFE_MIN`.
- **The admin pages:** Puzzles' missing name fails loudly; a host answer with a match group can be changed on the page with its group's key.
- **Cleanup:** each db test removes the things, categories and fixture days it adds (`fixture_animal`, `dt_`); the review's "no parent" count.
- **To Later (comment-only, fetch-only or style):** `matching.ts`'s stale comment, `pickHosts`'s constants comment, `FACT_TRAITS`' place, the pop groups' `method` text, `simulateDates`' export, `analyzeBase`'s table list, the `Where` type, `fetchTaxa`/`byIds`/P13176 tests, `titleForms`' numbers, the import's slices, `thing_names`' duplicates, `membersOf`' cache, error codes reused, `env.ts`' two spellings, DECISIONS.md Game 1's wording.

### Acceptance criteria
- [ ] Each silent failure listed fails loudly in a test.
- [ ] Each daily helper listed has a test.
- [ ] The two admin fixes, with e2e or route tests.
- [ ] After the db suite, the local base holds no `fixture_` or `dt_` category or thing.
- [ ] The Later items moved with their reason; the suites pass.

## Out of scope
- Scale (13f-4). New content.

## Numbers
None new.

## Plan
1. The human approves this ticket.
2. 13f-3a: the owned-row rule, the erase step, shown names, tests; load twice (before/after) on the real base and compare with a fresh one; review; PR; merge.
3. 13f-3b: the same.

## Removes
- 13f-3a: the need for a `db reset` before `load all` (the handoff's steps); `import_source`'s insert-only behaviour for owned rows.
- 13f-3b: the closed ROADMAP items, and the fixture rows the suites leave.

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

## Review
The `reviewer` agent twice, 2026-10-27, each in a fresh context (read-only queries; no loads).
- Blocking findings and how each was fixed:
  - First review: erasing at once broke "a started day never changes" (the human chose the next midnight); populations weren't ended (`load_seen_number`); shown names followed the files only for one-source things (`load_seen_name`, applied in `load_finish`); the output (totals, nothing at zero); the tests (reload against fresh, links, populations, kept categories filtered to the test's).
  - Second review: `load_begin` brought ended rows back before the load had given them again, so a failed load undid the last one's ends (now an import or a link brings back only the rows it gives; first put in `load_finish`, which left the suites' fixture names ended when their helpers re-imported them, 11 `test:db` failures, so it moved to `import_source` and `load_links`); the first load after midnight deleted rows a run of yesterday finished late still reads (asked: "Wait one more day (Recommended)"); the category-keeping rules lacked tests and the human's word (tests added; "Keep for those days (Recommended)"); a reload refused a link to a thing renamed in the same load (`load_links` checks the files' name); the ticket and handoff unfinished.
- Deferred to ROADMAP "Next revision" (From the 13f-3a review): the circle checks seeing facts the files dropped until the finish; refs to an item that left its snapshot still resolving on a reload; a category a day before yesterday uses erased while a run of it can be resumed (`record_miss` then returns quietly); import_source's "no name alias" rename not mirrored; no word on approved future days a load touches; no lock against two loads at once; the test's smaller gaps (resolve_answer end to end on a fixture day; the truncate's exclusive locks for the file's run); leftover `load_seen_*` rows from single loads and suites.
