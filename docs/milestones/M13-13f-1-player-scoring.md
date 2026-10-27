# M13 13f-1 — Player scoring

**Status:** planned, waiting for the human's approval (drafted 2026-10-27 from two rounds of guided questions)

## Goal
Close every For M13 item about what players get credit and points for: names the sources lack, offensive or wrong names, the rare tier's size, and the matching and approval edge cases.

## Who uses it / what breaks without it
- **Used by:** every player (accepted answers, points, the names shown); the drafting session (host answers named as players know them).
- **Breaks without it:** "China" is refused as a country and can never be learned (the facts check rejects it: "china" names porcelain); likewise "Washington" for a capital, "country" and "metal" as music, salsa, tap, jazz and disco as dances, sourdough, Confucianism. Building shows "whorehouse" as an answer. An answer added before its day starts scores 0 instead of the full bonus. Trumpet shows as "cornet".

## The items (ROADMAP, For M13)
Open, in this ticket:
1. **Aliases the sources miss or invent** ("China"; plurals of proper names as noise) — 13a-2.
2. **From 13e-3:** aliases lacking: "country", "metal" (music genre); salsa, tap, jazz, disco (dance); Confucianism, Baha'i (religion); "Washington" for Washington, D.C.
3. **From 13e-2:** aliases WordNet lacks: "sourdough" (bread).
4. **The rare tier counts members at approval** (`firstGuess` divides by `question.members`) — 13c; with **13b's** "`question.members` is no longer the number of answers a day accepts".
5. **Matching edge cases** (`src/game/matching.ts`): typo edits only insert or substitute plain letters, digits and space; names shown fall back to the thing's ID — 13a-2.
6. **Approval against a moving base** (`approve_puzzle` checks members at `now()` while an import may commit) — 13a-2.
7. **Readers of the base that skip `removed_at`**: the review's two-parents query still reads facts without it — 13a-2/13c.
8. **From 13b:** a player-added thing is named by the raw form most players typed ("JACKALOPE!!!"); an acceptance or import across midnight lands in a day that has started.
9. **From 13e-10:** slang aliases ("shrink", "headshrinker", "sawbones"); **from 13e-7:** "gypsy cab" (car), "whorehouse" as a shown name (building), "torture chamber" (room).
10. **From 13e-8:** answers shown under WordNet's first word: trumpet as "cornet", tuba "bass horn", ukulele "uke", sulfuric acid "vitriol", peyote "mescal".

Already closed (checked on the Mac's base, 2026-10-27), to be marked in ROADMAP:
- **"dog" names two members** (Merging across sources): one animal member since 13e-5.
- **The provisional bonus in very large categories:** 13c's levels (40/40/20) replaced the expectation; a rare answer earning nearly the full bonus is the design.
- **From 13e-2:** "uno" naming hassium: tabletop game has Uno as its own member since 13e-6, and hassium's alias is outside it; "brussels sprout" is now a vegetable's name.

## What the human decided (2026-10-27)
Round 1:
- Missing names: **"A hand file of names (Recommended)"**: reviewed lines, loaded by `load all`, as links are.
- Which should go (all four picked): **"gypsy cab" (car)**, **"whorehouse" (building)** (renamed "brothel"), **doctor slang** ("shrink", "headshrinker", "sawbones"), **"torture chamber" (room)**.
- The rare tier: **"Count at the day's start (Recommended)"**: its size is the members when the day starts, when answers freeze (13b).
- Wrong shown names: **"Rename by hand (Recommended)"**: reviewed rename rows.

Round 2:
- **"One names file (Recommended)"**: `data/names.json` holds every added name and every rename; listed.json's renames move into it, and listed.json keeps only drops.
- **"List it too"**: "shrink" on Plor's list with the others, accepting that "shrink-wrap" loses those names.

## Source
- ROADMAP.md, For M13, the items above, and the tickets they cite (13a-2, 13b, 13c, 13e-2, 13e-3, 13e-7, 13e-8, 13e-10).
- 13e-9b's `data/listed.json` and Plor's list (`src/game/plor-listed.ts`); 13e-2's links (`data/links.json`, `private.load_links`).

## Design
1. **`data/names.json`**, every hand decision on names, parsed and checked at load like the other hand files:
   - `add`: `{ ref, name, why }`: a name added to an item ("wikidata:Q148" ← "China"), loaded by `load all` after links through a function like `load_links` (it refuses an unknown ref, and a name the item already has).
   - `rename`: `{ ref, name, why }`: the item's new shown name, which must be one of its names (after the listed words' drop and the added names). Listed.json's `rename` moves here; a listed shown name with no rename still stops the load.
2. **The names added:** China, Washington (D.C.), country and metal (music genres), salsa, tap, jazz, disco (their dance members), sourdough, Confucianism and Baha'i, each to the member its prompt means, found by review; others the review of these turns up are listed in the PR, not added silently.
3. **The renames:** trumpet, tuba, ukulele, sulfuric acid, peyote shown by their common names; "whorehouse" → "brothel".
4. **Plor's list** gains "gypsy cab(s)", "whorehouse(s)", "headshrinker(s)", "sawbones", "shrink(s)", "torture chamber(s)": dropped at load, held when typed. An item the list empties goes ("torture chamber"); one whose shown name is listed needs a rename (whorehouse → brothel), and the load stops on any other, as now ("shrink-wrap" gets its decision then).
5. **The rare tier:** `firstGuess`'s rare size counts the members as of the day's start, the moment answers freeze, instead of `question.members` from approval; the design of the count (frozen at the start, or read live) is settled in the build, recorded in the Source diff.
6. **Matching and approval edge cases:** typo edits may substitute any character the name holds; a name missing from `thing_names` fails loudly instead of showing an ID; `approve_puzzle` reads members as of a moment it fixes before checking; the review's two-parents query skips removed facts; a player-added thing is named by its most-typed normalized-then-tidied form; the midnight window: acceptances are dated by their commit, not their transaction's start. Each with its test; any that turns out to need a human choice is asked before it's built.

## Acceptance criteria
- [ ] After `db reset` and `load all`: "China" answers the country question with the People's Republic, and each added name answers its question (db test or query evidence); trumpet, tuba, ukulele, sulfuric acid and peyote show by their common names; building shows "brothel"; none of the listed phrases is a name in the base.
- [ ] A miss holding a newly listed phrase is held (`misses.db.test.ts`).
- [ ] A rare answer added before its day starts earns the full bonus (scoring test).
- [ ] Each edge case in Design 6 has a test that fails before its fix.
- [ ] `check-bank` 0 problems; `simulate` 30 of 30; `npm test`, `test:db`, pgTAP, e2e pass.

## Out of scope
- Category polish (13f-2), tools (13f-3), scale (13f-4).

## Numbers
None new.

## Plan
1. The human approves this ticket.
2. `data/names.json` and its loader; move listed.json's renames.
3. The names, renames and Plor's list; load; review.
4. The rare tier; the edge cases, each test first.
5. check-bank, simulate, suites, the `reviewer` agent, one PR for the human.

## Removes
- `data/listed.json`'s `rename` list (moved to `data/names.json`).
- The closed ROADMAP items listed above, and this ticket's items as they're done.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
