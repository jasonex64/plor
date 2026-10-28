# M13 13f-4 — Scale, and the For M13 leftovers

**Status:** approved (human, 2026-10-28: "I approve 13f-4's design as proposed. Build 13f-4a, the drafting tools' speed, first."); 13f-4a done (PR #117, merged on green CI 2026-10-28 UTC, `2dac4e6`); 13f-4b done (PR #118, merged on green CI 2026-10-28 UTC, `d6468f9`); 13f-4c built and reviewed, in review in PR #119.

## Goal
Measure the four scale items and fix the ones that slow the drafting tools; close or move every For M13 item left in ROADMAP, so the list is empty when M13 closes (`docs/milestones/M13-13f-the-review-backlog.md`, criterion 2).

## Who uses it / what breaks without it
- **Used by:** the drafting session (the category checks and the swap rounds), M15's load test (the two player-side scans), whoever reads ROADMAP's For M13.
- **Breaks without it:** the drafting tools stay slow as categories and swaps grow; M13 closes with 22 items still open, against the 13f ticket's criterion.

## What the human decided (2026-10-28)
Round 1:
- Where the four are measured: **"Split by kind (Recommended)"**: `record_miss`'s scans and `pooledCounts` (many players at once) move to M15's load test; `fits_where` per member and the swap rounds re-resolving all 7 (the drafting tools) are measured and fixed now.
- The beta's size, for any measurement of players: **"Tens a day"** (a friends beta, about 25 players).
- The 22 open For M13 items: **"Ask me item by item"**: each asked in rounds, except sub-items later work already closed, which close with their reason.

Round 2:
- 13a-2, a format-1 or format-2 day makes the engine raise: **"Close: loud is right (Recommended)"**.
- 13b, the misses test's 1% on a long-lived database, one outcome's log row checked, `question.members`' meaning: **"Fix the tests, check the count (Recommended)"**: the misses test counts only its own players, every outcome's log row is checked, and `members` is removed if nothing reads it, or its meaning said.
- 13c, the familiar rule's pgTAP covering the stolen letter only; ROADMAP naming `safeAnswerLeft`: **"Add the 3 cases, fix the doc (Recommended)"**: under a host, not in the levels, typeable by a second name.
- The question bank's identity and themes: **"Refuse both in validation (Recommended)"**: `content:validate` refuses two questions with one prompt and category, and a themed date with no tagged question; a prompt's typo fix losing its uses stays a known limit, said in the bank's docs.

Round 3:
- 13d, the bank route's 401 untested, M15 15a's and M16's tickets citing `private.save_questions` and `private.puzzle_questions`: **"Add the test, fix the tickets (Recommended)"**.
- 13e-1: **"Fix the two small ones (Recommended)"**: `content:validate -- <root>` reads `<root>`'s `data/categories.json`; the bank's errors name a question by its ID in every check. A single `load <set>` still defines no category (`load all` does), and the review's "no members" message says so. (Removing a dropped category: done in 13f-3a.)
- From 13e-2's batch, a host answer above another familiar answer and an untested refused links batch: **"Add check-bank flag + test (Recommended)"**: `npm run draft -- check-bank` flags it for the human per case; the draft doesn't refuse. (Cutlery: linked in 13f-2; removing links: 13f-3a; shelf and water: kept in 13f-2.)
- From 13e-2's batch, the late hosts leaning toward few stolen letters and the lists blocking Q7: **"To For M15, the beta (Recommended)"**; strengthening the lists is content for a later batch (Later).

Round 4:
- From 13e-4b: **"Fix the three, close the last (Recommended)"**: continents named by their label alone (as the IUCN statuses are); check-bank flags a bank answer in two status subsets; `ANIMALS_DROP_LISTED_NAMES` tested and loud when a taxon is gone. `fact_values` having no reference closes: things are retired, never deleted. (The less familiar hosts and animal K with bird K: settled in 13f-2.)
- From 13e-4a, `record_miss` reading the category's current filter: **"Read the day's frozen filter (Recommended)"**. (Oceania, Eurasia, the cities: 13f-2; a reload keeping a dropped population: 13f-3a.)
- From 13e-3, the rivers' alias drop: **"Test and make it loud (Recommended)"**: a helper with a test, refusing a listed main name and a gone ID; "rhine" stays (the human's answer covered short names only). (The database size: printed by every `load all` since 13e-11, and the warning near the limit is For M15; the generic members, green gold, Malabo, the US cities: 13f-2; the scratch scripts: `simulate` and `check-bank`.)
- From the 13e-5 review: **"Count them too, close (Recommended)"**: `one_walk.test.sql`'s unchanged-base check also counts `thing_source` and `thing_alias`. (The "unnamed" count: more accurate, kept; the snapshots' circles: none on either machine.)

Round 5:
- From the 13e-5 second review: **"Fix the review's reads (Recommended)"**: the review reads the animal snapshots only for categories in the animal tree and names a missing one; `simulate` lists the failed dates and stops on a lost connection rather than counting it as failed days. The snapshot-against-loaded check (`base_log` against the manifest) goes to Later. (A retired ID keeps pointing: the human's 13e-5b answer, "Keep pointing".)
- From the 13e-5b review: **"Fix the lists, live merge to M15 (Recommended)"**: the forks list without repeats or merged pairs; `thing_retired` refuses an ID recorded again for another thing. Merging loaded things on a live base goes to For M15. (Several WordNet items renaming one thing: the finish picks by ID since 13f-3b-1.)
- From the 13e-6 review: **"Loud drop, rest accepted (Recommended)"**: `dropListed` refuses a listed ID its set doesn't hold; shared title forms across sets and ties stay (same-named remakes share a name). (Flower V at Q7: the swaps, 13f-2.)
- From the 13f-3b-1 review: **"Fix the 4 real ones, rest to M15/Later (Recommended)"**: a dropped link no longer keeps a snapshot's same edge out; a fact given again after its midnight is added back; the unlock moves to the end of `load_finish`; `touched` names a host answer whose ancestor's fact or link ended. To For M15: a refused finish's circle staying, a single `load <set>` during `load all`, the session-mode connection, `kept_categories`' `run_status` cost; to Later: the shown-name mirror's merge case, the lock test's `first.end()`, the shown-name step's cost.

Round 6:
- From the 13f-3b-2 review: **"Fix the code ones (Recommended)"**: the draft test's `"dt\_%"` escape; `rootSetItems` naming a key `data/categories.json` lacks; `unusedHandNames`' comment back in place; `removeTestBase`'s comment true to the cascades; `sparql` taking only the service's own timeout error for a timeout; a test of a single load refusing a mistyped names.json row, and of `load_finish`'s circle order. The two-suites note stays in the handoff.
- From the 13f-2 review: **"Read once; \"oz\" stays out (Recommended)"**: the countries snapshot read once per load; "oz" stays out (the kept abbreviations are us, uk, usa, uae, prc and drc). (The poorly fitting members: accepted in 13f-2.)
- From the 13f-1 review, a player-added name keeping its punctuation: **"Tidy it (Recommended)"**: a player-added thing shows as its normalized form.
- From the 13f-1 review, names beyond a-z and pre-fold player rows: **"Accept, pre-fold rows to M15 (Recommended)"**: re-folding player rows written before the fold goes to For M15, the first time hosted player data exists. (A live load's renames and removals: 13f-3a.)

Round 7:
- From the 13e-10b review, alloy, lawyer, beer and liquor at Q7: **"Later, a content batch (Recommended)"**, with 13e-2's four.
- From the 13e-10 review: **"One helper, fix the comment (Recommended)"**: the host answer's shown-name rule in one function check-bank and the draft share. (The prompt fits, Mardi Gras, virus and disease, "wolf": 13f-2.)
- From the 13e-9b review: **"Loud unused rows, tidy the repeats (Recommended)"**: a `rename` or `drop_listed_names` row that applies to nothing stops the load; the source list written once. The merged-away double and a joined WordNet item's raw name go to Later (neither reachable with today's files).

During 13f-4b's build (2026-10-28): a name or fact the files give back after its end-midnight has passed can't come back as round 5 put it, as one key holds one row (a second row needs a changed uniqueness rule under every insert; clearing the old row's end changes a started day). Asked in plain words, the human chose **"Leave the gap, note it (Recommended)"**: it comes back at the next load after the old row is erased, recorded under For M15 with hosted loads.

During 13f-4c's build (2026-10-28): nine `drop_listed_names` rows match nothing on today's snapshots by design (their slurs were dropped at fetch; the rows guard a re-fetch), and the loud check stopped `load all` on them. Asked, the human chose **"Print them, don't stop (Recommended)"**: an unused guard row is printed, as unused drops are (13e-9b, "Strict, except drops"); an unused rename still stops the load.

## Source
- ROADMAP.md, For M13: the items below.
- `docs/milestones/M13-13f-the-review-backlog.md`, Design 4 and criterion 2.

## Items
### Scale (13f Design 4)
1. `record_miss` reads every miss and answer of its category (For M13, "Counting a miss…"; From 13e-4a): to For M15's load test (round 1).
2. `pooledCounts` scans format-3 answers through a JSON path with no index (13c review): to For M15's load test (round 1).
3. `fits_where` runs once per member for every category (From 13e-4a; about 2.6 s for animal): measured and fixed now.
4. Each swap round re-resolves and re-measures all 7 questions (13e-10b review; 56 s for 30 simulated days): measured and fixed now.

### The leftovers (ROADMAP For M13, open on 2026-10-28)
Smaller gaps from the 13a-2, 13b, 13c, 13d and 13e-1 reviews; the question bank's identity and themes; From 13e-2, 13e-4b, 13e-4a, 13e-3; from the 13e-5, 13e-5 second, 13e-5b, 13e-6, 13e-9b, 13e-10, 13e-10b, 13f-1, 13f-2, 13f-3b-1 and 13f-3b-2 reviews. Each one's answer is recorded below as it's given.

## Design (proposed 2026-10-28), three PRs
**13f-4a, the drafting tools' speed** (items 3 and 4): time `category_members` on animal and the 30-day `simulate` before; make `fits_where` cheap for a category with no filter (skip it, or let the planner inline it) and the swap rounds resolve and measure only the question swapped in, keeping the others'; time both again. Each change's goal is the same answers faster: `check-bank` and `simulate` give the same output before and after.
**13f-4b, the database's gaps** (one migration): the four from the 13f-3b-1 review; `record_miss` reading the day's frozen filter; `thing_retired` refusing an ID recorded for another thing; continents named by their label alone (a load change); player-added things shown in normalized form; with pgTAP for each, the familiar rule's three missing cases and `one_walk`'s fuller count.
**13f-4c, the tools and tests**: `content:validate` (duplicate prompt and category, a themed date with no tagged question, `<root>`'s categories, errors by question ID); check-bank's two new flags (a host answer above a familiar one; an answer in two status subsets); the loud hand-file rows (`rename`, `drop_listed_names`, `dropListed`, the rivers' and animals' drop lists); the review (animal snapshots only for the animal tree, the forks list, `rootSetItems`); `simulate`'s failed dates and lost connection; the shown-name helper; the countries snapshot read once; the 13f-3b-2 review's code notes; the misses test, every outcome's log row, `members`; the bank route's 401 test, the stale ticket names; and ROADMAP: every For M13 item closed or moved as answered.

## Acceptance criteria
- [x] Items 3 and 4: measured before and after on the real base, with the commands and times. *(13f-4a)*
- [x] Items 1 and 2: under For M15 with the round-1 answer. *(13f-4a)*
- [x] ROADMAP's For M13 has no open item; each is closed with evidence or moved with its reason. *(13f-4c)*
- [x] The suites pass; `check-bank` 0; `simulate` 30 of 30. *(13f-4a, 13f-4b, 13f-4c)*

## Out of scope
- The migration squash (its own sub-ticket after 13f).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Tens of players a day (about 25) | the beta's size, for any player-side measurement | the human, 2026-10-28, round 1 |

## Plan
1. Finish the guided questions, item by item; the human approves the design.
2. The scale fixes (items 3 and 4), measured before and after; review; PR.
3. The leftovers as answered; review; PR.

## Removes
- ROADMAP's For M13 list, emptied (closed or moved per the answers above).
- 13f-4a: the swap rounds' repeated resolving and measuring; `fits_where`'s per-member call for unfiltered categories.
- 13f-4b/c: `record_miss`'s read of the current filter; the countries snapshot's repeated reads; the second copy of the shown-name rule and of the source list; the raw punctuation on player-added names.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 13f-4a: make `fits_where` cheap for a category with no filter (skip it, or let the planner inline it) | `category_members` skips the call when the category has no filter; `fits_where` keeps `set search_path` | Skipping needs no change to a function three readers share; inlining would mean dropping its `set search_path = ''`, which the migrations' functions all set, and DECISIONS.md's Log asks of the security-definer ones |
| 13f-4a: the swap rounds resolve and measure only the question swapped in | Each bank question is resolved and measured once per `draft()` call, kept by its ID | The first attempt resolves all 7 anyway; a round's other 6 are then the ones already kept |
| 13f-4b, round 5: a fact given again after its midnight is added back | Not built; the gap stays | The human's answer during the build: "Leave the gap, note it (Recommended)" (one key holds one row) |
| 13f-4b: continents named by their label alone | `withValueNamesOnly` at load, for the countries' continent values wherever a set loads them; `data/names.json`'s row removing "oceania" from Insular Oceania goes, as the label rule now does it (the load stopped on it as unused) | The places set brings the junk names; the countries set already names them by label |
| 13f-4b: player-added things shown in normalized form | `add_player_thing` names the thing by the normalized text; `private.typed_form` goes with its last caller; DECISIONS.md's Learning from misses says so; `misses.test.sql`'s check of the old naming rule now checks the new one | The human's answer replaces 13b's "named the way players most often typed it" |
| 13f-4b: `record_miss` reads the day's frozen filter | It judges by the day's frozen question, and a new text on a day whose question no longer matches its category (root, member_of or filter) is held for the human, not added | `add_player_thing` builds a thing from the category as it is now, which for such a day would sit in neither (the review) |
| 13f-4c, round 3: `content:validate -- <root>` reads `<root>`'s categories | `validateRoot(root, categoriesFile)`: the command passes `data/categories.json`, the test its own file | The categories file isn't under the content root; the item's harm was the test leaning on the repo's file |
| 13f-4c, rounds 4 and 5: the rivers' alias drop and `ANIMALS_DROP_LISTED_NAMES` tested and loud; `dropListed` loud | Nothing built: the three are gone since 13e-9b, replaced by `data/listed.json`'s rows, whose gone IDs are printed (`drop`) or refused (`drop_listed_names`) | The rounds' answers assumed the code still existed |
| 13f-4c, round 7: an unused `rename` or `drop_listed_names` row stops the load | An unused rename stops it; an unused `drop_listed_names` row is printed | The human's answer during the build, "Print them, don't stop (Recommended)": nine rows guard a re-fetch |
| 13f-4c, round 6: a test of a single load refusing a mistyped names.json row | A command run, not a test (Evidence) | `main()` reads the real hand files and snapshots; a test would need a harness of its own |
| 13f-4c, round 2: the misses test counts only its own players | No change | Since 13f-3b-2 every db test removes its fixture days, so the share already counts only the file's players |
| 13f-4c, round 3: check-bank flags a host answer above a familiar one | 263 flags on today's bank (duck over mallard, airplane over jet, lake over pond) | A broad category's host answers are often parents of its familiar answers; the flag is for the human per case, and doesn't fail the command |
| (no source) | `record_miss` refuses a day question with no frozen root | Only format-3 days carry one, and the engine already refuses older formats (13f-4 round 2) |
| (no source) | Only `category_members` skips the call; `in_category_now` and `resolve_answer` still call `fits_where` | They run once per thing or per typed answer, not once per member of a category |

## Evidence
### 13f-4c (Windows, 2026-10-28 UTC)
- **Unit and db tests, each failing on the old code first where a fix was made:** the new unit tests on HEAD's scripts (13f-3b-2 style, temporary copies): the forks test fails (the chain-fed circle listed twice); `load_finish`'s circle order on the 13f-3b-1 `load_finish` names `lo z`, on today's `lo b`. The rest are new checks of new code (bank refusals, `bankFlags`, `unusedListedRows`, `rowsOnlyIn`, `isDayFailure`, `withValueNamesOnly`) or coverage (every outcome logged, the refused links batch, the bank route's 401).
- **The real base:** `load all` first stopped on nine `drop_listed_names` rows (guards against a re-fetch; asked, "Print them, don't stop"), then printed `data/listed.json: 9 drop_listed_names rows hold no listed name today (guards against a re-fetch): wikidata:Q32298578, …`, `DEFINED 231 categories`, nothing ended, `DATABASE 332 MB`, 80 s.
- **A single load and a mistyped row** (a temporary names.json `add` row giving apple "apple", restored after with `git checkout`): `npm run base -- load wikidata-fruit` stopped with `Error: data/names.json: add wikidata:Q89 "apple" did nothing in wikidata-fruit`.
- **The review** (after the review's fix: the joins are read when a member's WordNet item is in oewn-animals, not by the animal tree): `npm run base -- review dog_breed fruit animal_k`: dog_breed prints both join lines (0 and 0; its root isn't under animal, its members join), fruit none, animal_k `a WordNet word joined to a Wikidata thing sharing no name: 1 (mud turtle = Kinosternon)`.
- **`npm run draft -- check-bank`:** `CHECKED 231 questions: 0 problems`, then 263 `FLAG` lines (all host answers above a familiar one; no status flag on today's bank), `FLAGGED 263 for the human`.
- **`npm run draft -- simulate`:** `DRAFTED 30 of 30; subset questions 74 of 210`, output identical to 13f-4a's (`diff`), 256 s.
- **`npm run content:validate`:** `CONTENT OK content: 1 file(s)`.
- **Suites:** `npx supabase test db` 31 files, 510 PASS; `npm run test:db` 42 files, 280 passed, and after it the base holds `0|0` fixture categories and items; `npm test` 43 files, 458 passed; tsc clean; lint 0 errors (188 warnings, as before). `npm run test:e2e`: 60 passed, 1 failed, the known clock-bar flake (`shell.e2e.ts`); `npx playwright test --last-failed`: 1 passed.
- **ROADMAP:** For M13 holds 0 open items (`grep -c "^- \[ \]"` over the section).

### 13f-4b (Windows, 2026-10-28 UTC)
- **Before the fix**, the new checks on the previous functions (`typed_form`, `import_source`, `load_links`, `load_finish`, `record_miss` and `add_player_thing` put back in a rolled-back transaction, `psql -v ON_ERROR_ROLLBACK=on`; `pg_get_functiondef` after shows 13f-4b's in place and no `typed_form`):
  - `database_gaps.test.sql`: `not ok 2` (`have: 1 want: 0`, the miss off the day's letter learned), `not ok 3` (`have: accepted want: held_subset`), `not ok 5` (the retired ID's second thing not refused); 1 and 4 (the setup) pass;
  - `load_sync.test.sql`: `not ok 45` (`touched` `have: []`), `not ok 47` and `not ok 49` (`have: 2026-10-29 07:00:00+00 want: NULL`, the edge not brought back by the other kind);
  - `misses.test.sql`: `not ok 5` (`have: Jackalope want: jackalope`).
  - The familiar rule's three new cases in `puzzle_entry.test.sql` and `one_walk`'s fuller count are coverage of the rule as it was (no fix); they pass. The unlock's new place has no test: a failing last write can't be made in a test without a fault injected.
- **After:** `database_gaps.test.sql` 5, `load_sync.test.sql` 49, `puzzle_entry.test.sql` 18, `misses.test.sql`, `one_walk.test.sql`: PASS; `npx supabase test db` 31 files, 501 PASS; `npm run test:db` 41 files, 277 passed; `npm test` 43 files, 454 passed (`withValueNamesOnly`'s test); tsc and lint clean; `npm run test:e2e` 61 passed.
- **After the review's fixes** (a day whose question no longer matches its category holds a new text; the membership check's true branch tested): `database_gaps.test.sql` 9 PASS. Against 13f-3a's `record_miss` (rolled back, as above): `not ok 2`, `not ok 3`, `not ok 5` (`have: NULL want: rejected`, the day's filter ignored), `not ok 6` (`have: accepted want: held_subset`), `not ok 7` (`have: 1 want: 0`, a thing made); 4 passes before and after (an existing member, nothing to learn, which didn't change). `npx supabase test db` 31 files, 505 PASS; `npm run test:db` 41 files, 277 passed. (e2e ran before these SQL-only fixes.)
- **The real base:** `load all` first stopped, `data/names.json: remove wikidata:Q538 "oceania" did nothing in any set` (the label rule now does that row's job; the row removed); then `ENDING at 2026-10-29T07:00:00+00:00 … 37 names, 0 facts, 0 links, 0 populations` (the continents' extra names, nothing else), `DATABASE 329 MB`, 77 s; no retired-ID refusal. `check-bank`: `CHECKED 231 questions: 0 problems`.

### 13f-4a (Windows, 2026-10-28 UTC, the real base, 231 categories)
- **`category_members`** (`psql`, `	iming`): before, `animal` (56,169 members, no filter) 2017, 1727 and 1890 ms; `animal_k` (1,411, a letter subset) 3752 and 3565 ms; `fruit` (3,014) 66 and 70 ms. Hypothesis: the per-member `fits_where` call is most of a base category's time. Checked first by hand, the same query with `(cat.filter is null or private.fits_where(…))`: 504 and 701 ms, and the walk alone 226 ms, so it held. After the migration: `animal` 585, 540 and 561 ms; `animal_k` 3615 ms (a subset still checks each member, as designed); `fruit` 27 ms.
- **`npm run draft -- simulate`** (30 days): before, 265 s; with the migration alone, 265 s, the same output (`membersOf` runs `category_members` once per category per run, so its saving, about 1.3 s for animal, is too small to show in 265 s); with the swap change too, 218 s. `DRAFTED 30 of 30; subset questions 74 of 210` each time, and `diff` of the full output before and after: identical (8 swaps in the run).
- **`npm run draft -- check-bank`**: before 52 s, after 43 s; `CHECKED 231 questions: 0 problems`, output identical.
- **Suites:** `npx supabase test db` 30 files, 488 PASS; `npm run test:db` 41 files, 277 passed; `npm test` 43 files, 453 passed; tsc clean, lint clean on `scripts/draft.ts`.
- No test was added for the swap change. Its claim is the same answers faster, and the identical `simulate` output with 8 swaps is the evidence; a test would only re-check that a Map caches.

## Review
13f-4a: the `reviewer` agent, 2026-10-28, in a fresh context. No blocking findings: the migration's `category_members` matches 13e-5's but for the guard, `category_where` is null for exactly the 196 categories with no filter, and the per-draft cache shares no changing state across rounds. Two claims corrected as found (animal after: 0.54–0.59 s, not 0.58; the migration-only `simulate` run explained by `membersOf` running once per category). `.claude/settings.local.json` stays out of the commit.

13f-4b: the `reviewer` agent, 2026-10-28, in a fresh context. Blocking, fixed: an accepted text on a day approved before its category changed would get a thing built from the category now, in neither (now held for the human); the frozen membership check's true branch had no test (an existing member, an admin's addition, a member now outside the day's filter). Deferred to ROADMAP "Next revision" (From the 13f-4b review). The continents' ended names, for the human to see: North America's "na", "noam", "n am", "003 un m49 code", "turtle island" and the like, "australia and oceania", "the old continent", "s america" and the plurals (37 in all).

13f-4c: the `reviewer` agent, 2026-10-28, in a fresh context. Blocking, fixed: the review's animal-tree test dropped dog_breed's join flags without a word (now decided by the members' WordNet items); a ROADMAP line said an unused `drop_listed_names` row stops the load (it's printed); a sentence doubled in the handoff. The rest moved to Later ("Tool tidy-ups from M13's reviews", from the 13f-4c review), as For M13 stays empty.
