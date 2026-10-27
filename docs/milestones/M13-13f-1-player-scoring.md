# M13 13f-1 — Player scoring

**Status:** in review (approved by the human, 2026-10-27: "I approve 13f-1's design as drafted. Build it."; built and reviewed on the Mac, 2026-10-27)

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

## Decided during the build (2026-10-27)
- The rare tier: **"Defer to the beta (Recommended)"**: counting at the day's start needs a cached count `plor_app` may run (a security change), and the case needs a member to join between two of a family's days; moved to ROADMAP For M15 with its reasoning.
- A player-added answer's shown name: **"every single thing should be displayed as al lowercase but how u store it is up to u"**: every thing name reaches screens in lowercase (`thingNames`, the one reader), storage unchanged (DECISIONS.md Log).
- The midnight window: **"Defer with the rare tier (Recommended)"** (For M15).

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
- [x] After `db reset` and `load all`: "China" answers the country question with the People's Republic, and each added name answers its question (db test or query evidence); trumpet, tuba, ukulele, sulfuric acid and peyote show by their common names; building shows "brothel"; none of the listed phrases is a name in the base.
- [x] A miss holding a newly listed phrase is held: `isListed` holds each new phrase (`misses.test.ts`), and `misses.db.test.ts` holds a Plor-listed miss (review: the db test's phrase is "kaffir cat").
- [ ] ~~A rare answer added before its day starts earns the full bonus (scoring test).~~ Deferred to For M15 (the human's answer).
- [x] Each edge case in Design 6 has a test that fails before its fix, except the review's two-parents count (`scripts/base.ts`, `reviewOne`): it prints for a person to read and has no test harness, and the fix is one `removed_at is null`, as the other review queries have (review).
- [x] `check-bank` 0 problems; `simulate` 30 of 30; `npm test`, `test:db`, pgTAP, e2e pass.

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
| Design 1: names added by a function like `load_links`, after links | Added in `loadSet` (`withAddedNames`), before the listed-word drop | No migration or grant, and an added name that's listed is still dropped; the load's one path for an item's names |
| Design 2: salsa, jazz, disco, sourdough named | Not named; ROADMAP Later | They aren't things in the base (only the sauce, disco music, the leaven); a name needs a thing |
| Design 2: Confucianism named | A link under religion (`data/links.json`) | It's a thing outside religion's tree, not a missing name |
| Design 5: the rare tier counted at the day's start | Deferred to For M15 | The human's answer above: a cached count is a security change, for a rare case |
| Design 6: typo edits substitute any character a name holds | `normalize` folds ł ı ß đ ø æ œ þ ð ħ, and the load re-normalizes every snapshot name (`withNormalizedAliases`) | Plain typing then matches exactly ("lodz" is "Łódź") without widening the typo search; 2,194 names held such letters, the Latin ones the most |
| Design 6: player-facing ID fallback fails loudly | Already did (`named` throws) | Found while building; the admin pages' fallback is 13f-3's |
| Design 6: `approve_puzzle` reads members as of a fixed moment | Closed, no code | Play reads members as of the day's start (13b), so a fact after the check counts by design, and a new member can't remove a familiar answer |
| Design 6: a player-added thing's name tidied | Every name shown in lowercase | The human's answer above |
| Design 6: the midnight window | Deferred to For M15 | The human's answer above |
| "shrink" on the list costs "shrink-wrap" its names | No cost | The base stores "shrink-wrap" with its hyphen, which never matches the whole word |

## Evidence
On the Mac, 2026-10-27, after a fresh `db reset` and `load all`.
- **The load:** `oewn-nouns … listed words: 32 names and 13 items dropped` (gypsy cab and torture chamber emptied, with 13e-11's eleven); `LINKED … 116`; `DEFINED 226`; `DATABASE 316 MB`.
- **Names (queries):** "china" answers country (1 member), "washington" answers world capital (1), "metal" and "country" answer music genre (1 each), "tap" answers dance (1), "bahai" and "confucianism" answer religion (1 each). Shown names: trumpet, tuba, ukulele, sulfuric acid, peyote, brothel. No alias holds a newly listed phrase (0); the psychiatrist's names are "psychiatrist, psychiatrists".
- **Folding, hypothesis "0 folded letters left after the load":** disproved first (1,170 left: snapshots hold names normalized at fetch, which the load wrote as they were), fixed with `withNormalizedAliases`, then held: 0 left; "lodz" and 10 "…strasse…" names now exist.
- **Tests:** `normalize` folds (3 cases) and `thingNames` lowercases: 4 tests that fail on the old code and pass on the new; `withNormalizedAliases`, `withAddedNames`, `parseNames`, and a rename of a shown name that isn't listed (`scripts/base.test.ts`); Plor's list holds the new phrases and not "shrink-wrap" (`misses.test.ts`). `src/app/api/offbeat/route.db.test.ts` expected "Italy": the display rule now shows "italy", so `nameOf` returns the shown form.
- **check-bank** 0 problems on 226; **simulate** 30 of 30.
- **After the review's fixes:** `npm test` 43 files, 440 passed; lint and tsc clean; `npm run test:db` 40 files, 270 passed (the admin base test now expects "leaf thing", shown in lowercase); `npx supabase test db` 435 PASS; `npm run test:e2e` 61 passed.
- **Before the review:** `npm test` 43 files, 438 passed; lint and tsc clean; `npm run test:db` 40 files, 270 passed; `npx supabase test db` Files=28, Tests=435, PASS; `npm run test:e2e` 61 passed.

## Review
The `reviewer` agent, 2026-10-27, in a fresh context (unit tests and read-only queries on the base).
- Blocking findings and how each was fixed: the game's stolen-letter filter kept its own normalizer without the fold, so "ß" wasn't blocked with S stolen (G11): it now normalizes each character with `normalize`, and the admin strike-through checks `includes`; the admin Base and Audit pages read thing names outside `thingNames`: one `shownName` now lowercases every reader; moving renames out of listed.json lost the "both dropped and kept" check, and an added name could be listed or added twice: `checkHandFiles` refuses each, and a rename to the name an item already shows is refused; the two-parents criterion had no test (marked, with its reason); ROADMAP and the handoff were stale (updated).
- Deferred to ROADMAP "Next revision" (From the 13f-1 review): a `load all` without a reset keeps old aliases and shown names (`import_source` only adds); older player-made forms and `missed_answer` rows aren't refolded; `matching.ts`'s comment still names "ø"; 1,007 names hold other characters (ʻ and non-Latin scripts), 31 things with no plain alias; player-added names keep punctuation ("jackalope!!!"), for the human.
