# M13 13f — The review backlog

**Status:** the four sub-tickets done (13f-1 PR #110, 13f-2 PR #112, 13f-3 PRs #114 to #116, 13f-4 PRs #117 to #119, all merged on green CI by 2026-10-28); ROADMAP's For M13 is empty. Next, the migration squash that closes M13, its own sub-ticket (approved by the human, 2026-10-27: "I approve 13f's plan as drafted. Start 13f-1, player scoring: list its items and ask its guided questions.")

## Goal
Clear ROADMAP's 40 open "For M13" items before M13 closes, in four sub-tickets by what they touch, each with its own guided questions before code; then close M13 with the migration squash decided for its end.

## Who uses it / what breaks without it
- **Used by:** players (scoring and matching, category answers), the drafting session and whoever loads a base (tools), M15's beta (scale).
- **Breaks without it:** the items are each review findings from 13a to 13e-11: answers refused or scored wrongly, lists with odd members, tools that fail silently, a miss counter that scans everything. Left open, they ride into launch.

## What the human decided (2026-10-27)
Triage, after 13e was done:
- What next: **"Triage the 40 items (Recommended)"**.
- Which groups to fix before M13 closes: **all four**: "Player scoring (Recommended)", "Category polish", "Import and draft tools", "Scale".
- The rest: **"Move them to Later (Recommended)"** (nothing is left once all four are chosen, but any item a sub-ticket's questions set aside goes to Later, or For M15 for scale).
- The product calls: **"Now, a round of questions"**:
  - the medium letters: **"Confirm C P H U B D M G (Recommended)"** (DECISIONS.md Log);
  - the host bank: **"Yes, 6 (Recommended)"** (DECISIONS.md Log);
  - the old survey: **"we also had no letter stealing from then. ignore survey results"** (DECISIONS.md Log; the item closes);
  - regional fruit (PGI products): **"Keep them (Recommended)"**;
  - country codes as country names: **"Remove the codes (Recommended)"**;
  - "ununnilium": **"Keep it on element 110 only (Recommended)"**.

## Source
- ROADMAP.md, "Next revision", For M13: each item names the review that found it and its files.
- The tickets of 13a to 13e-11 for each item's context.

## Design
Four sub-tickets, each its own PR on this branch, in this order. Each starts by listing its exact items from ROADMAP (by section and bullet) in its own file, then asks the guided questions those items hold (several already carry a "for the human" question), then builds:
1. **13f-1, player scoring:** what players get credit and points for. Matching edge cases (`src/game/matching.ts`); aliases the sources miss or invent ("China", music genres, dances, "Washington"); "dog" naming two members (concept against taxon); the rare tier counting members at approval and the provisional bonus in huge categories; approval against a moving base; readers of the base skipping `removed_at`; a player-added thing named by its raw form; the leftover slang aliases (13e-10's review).
2. **13f-2, category polish:** the decided data fixes (country codes out, "ununnilium" on element 110 only); prompt-fit oddities and generic members from widened roots; weak host answers and a host answer above a familiar one; unmarked overlaps (one-member, headwear in clothing, `animal_k` and `bird_k` sharing answers); the links waiting on the human (cutlery under kitchen utensil, shelf and water); the thin lists simulate swaps out most; "wolf" back in animal_w; the names listed for the human (Saturday night special, paddy wagon, abortionist).
3. **13f-3, import and draft tools:** silent failures and missing checks: `import_source` ignoring a disagreeing `same_as`; the review's "no parent" count; nothing removing a link, a category or a set's rows; unused `listed.json` rows; the shown-name rule in one place; untested helpers (`fetchTaxa`, `byIds`, `resolveNames`, `expectedCatches`, `valueItems`); the admin pages' raw IDs and the match-group rule error; error codes reused; `env.ts`'s two spellings of one check; the `dt_` and fixture leftovers in the local base.
4. **13f-4, scale:** `record_miss` scanning every miss and answer of its category, `pooledCounts` scanning without an index, `fits_where` running per member, the swap rounds re-resolving all 7: each measured first, fixed if it matters at the beta's size, otherwise moved to For M15 with its measurement.
5. **Then M13 closes:** the migrations squashed into one baseline (human, 2026-10-26: "When M13 ends"), as its own sub-ticket with its own questions.

## Acceptance criteria
- [x] Each sub-ticket lists its items, asks its questions, and closes or moves every item it lists, with evidence per item. *(each sub-ticket's Evidence)*
- [x] ROADMAP's For M13 has no open item when 13f-4 merges; any item set aside is under Later or For M15 with the reason. *(13f-4c)*
- [ ] The decided data fixes hold after a fresh `load all`: no country holds a two-letter code as a name; "ununnilium" names element 110 only; PGI fruit still in fruit. *(2026-10-28, the Windows base after `load all` (reloads equal a fresh load since 13f-3a): 0 countries answer to a two-letter code beyond us and uk; "ununnilium" names darmstadtium alone; the PGI fruit not yet checked, so open)*

## Out of scope
- The migration squash (its own sub-ticket after 13f).
- New categories.

## Numbers
None new. Each sub-ticket records any number its questions settle.

## Plan
1. The human approves this ticket.
2. 13f-1: list, ask, build, review, PR, merge. Then 13f-2, 13f-3, 13f-4 the same way.

## Removes
- ROADMAP's For M13 items, each as it's closed or moved.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
