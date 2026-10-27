# M13 13f-3 — Import and draft tools

**Status:** planned, waiting for the human's approval (drafted 2026-10-27 from two rounds of guided questions)

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

## Source
- ROADMAP.md, For M13: the items below and the tickets they cite.
- DECISIONS.md, Answer model (format 3: permanent thing IDs) and its Hard to reverse list; 13e-5b's `private.thing_retired`.

## 13f-3a — Removal on load
### Design
1. **What a load owns:** every alias, fact and link it wrote from a source or a hand file (`origin` `source`, or the hand files' rows: links, added names); never `origin` `players` or `human`.
2. **After `load all`**, each owned row the files no longer give is erased (deleted): an alias a snapshot dropped or names.json removed, a kind_of fact a snapshot dropped, a link links.json dropped, a category categories.json dropped (`private.category`), and a set's item no longer in its snapshot, whose owned names and facts go while its thing row and shown name stay.
3. **Shown names follow the files:** a rename (names.json) or a source's new name updates `private.thing.name` on load, so a non-reset load shows what a fresh one does (13f-1's review: "cornet" kept on a live base).
4. **The load prints what it erased** per set (names, facts, links, categories), and erasing nothing prints nothing; a `db reset` before `load all` is no longer needed, and the handoff's steps say so.
5. A security and hard-to-reverse note goes to DECISIONS.md: the base's source rows are erased when the files drop them (human, 2026-10-27: "Erase it"), past days' scores can change with them, and thing rows are never erased.

### Acceptance criteria
- [ ] On a base loaded before a change, a second `load all` with an alias, a fact, a link and a category removed from the files leaves the base identical to a fresh `db reset` + `load all` (a db test, and the real base compared by counts).
- [ ] A player-added alias and a human decision survive a load that doesn't name them (db test).
- [ ] A thing whose item left its snapshot keeps its row and shown name, with no names, facts or links of the load's (db test).
- [ ] `check-bank` 0, `simulate` 30 of 30, the suites pass.

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

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
