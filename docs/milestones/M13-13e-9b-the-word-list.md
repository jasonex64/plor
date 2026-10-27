# M13 13e-9b — Plor's word list

**Status:** planned, waiting for the human's approval (drafted 2026-10-27 from two rounds of guided questions)

## Goal
Remove the racial slur "kaffir", in every spelling, from the answer base and from what players can get accepted, with a short word list of Plor's own that sits beside LDNOOBW and is checked everywhere LDNOOBW is.

## Who uses it / what breaks without it
- Used by: players (they never see the slur as a shown name or get it accepted as an answer), the human (each rename is their decision), every `npm run base -- load`.
- Breaks without it: today "Name a disease" accepts "kaffir pox", "Name a fruit" shows and accepts "kaffir lime", "Name an animal" accepts "kaffir cat", "Name a tree" accepts "kaffir boom" (checked on the Mac's base, 2026-10-27). LDNOOBW doesn't list the word, so nothing holds it when players type it either: 3 players and 1% would make it an accepted answer again (13b).

## Source
- LDNOOBW, English list (SOURCES.md): the list Plor holds words by today, and the whole-word match `isListed` uses (`src/game/misses.ts`; human, 2026-10-24: "Hold listed words (Recommended)"). It doesn't list this word, so Plor's list is the human's own (below), recorded as their decision.
- Open English WordNet 2025 and Wikidata (SOURCES.md): where the word comes from. Found on 2026-10-27 in `oewn-nouns`, `oewn-animals` and `wikidata-fruit`, and in `wikidata-places` (Zulu people's synonyms).

## The human's answers (2026-10-27)
Round 1, the long-term picture:
- How far: **"Plor's own list (Recommended)"**: a short list of extra words, checked everywhere LDNOOBW is (imports, the review's flags, players' misses); the next slur found is one line to add; the words are written in the repo, as LDNOOBW's are.
- When: **"At load (Recommended)"**: the snapshots stay as fetched and every load removes the word; no re-fetch, no manifest change, nothing to copy between machines. The current fetch-time drops move to load too, so there is one way to drop.
- Shown names: **"Rename it (Recommended)"**: keep the thing under its best clean common name; drop it only if it has none.
- Misses: **"Held, like LDNOOBW (Recommended)"**: never accepted automatically; it waits on the audit page.

Round 2, the collisions:
- Latin names: **"Keep Latin names (Recommended)"**: "caffer" and "caffra" stay off the list (12 species keep their formal names, such as *Syncerus caffer*, the African buffalo); "caffer cat" is listed as a phrase.
- "kafir": **"Yes, list it (Recommended)"**: Zulu people's synonym "kafirs" and "kafir corn" go; WordNet's Nuristani-people entry "Kafir" (`09709027-n`, in no category) has no other name, so it goes.
- The cat and the tree: **"Drop them (Recommended)"**: "wildcat" and "coral tree" stay as their own entries.
- Renaming: **"You, in a hand file (Recommended)"**: each rename is a line in a data file; the load stops on a listed shown name with no decision.

## Design
1. **Plor's list**, `src/game/plor-listed.ts`, beside `ldnoobw-en.ts`: `kaffir`, `kaffirs`, `kafir`, `kafirs`, `kaffer`, `kaffers`, `caffre`, `caffres`, `kafferboom`, `kafferbooms`, `caffer cat`, `caffer cats`. Whole words and phrases, as LDNOOBW's are matched, so each plural and the compound are listed. `isListed` checks both lists, so the misses hold (`src/game/runs.ts`) and the review's flag (`scripts/base.ts`, the members-with-a-listed-alias check) cover it with no change of their own.
2. **The hand file**, `data/listed.json`, every hand decision about listed words, checked at load (an ID it names that no loaded set holds stops the load, as `data/sameness.json` does):
   - `drop`: items that go whole, each with a `why`: the board game now in `POP_DROP_ITEMS`; `oewn:02128524-n` (the cat), `oewn:12548614-n` and `oewn:12549273-n` (the tree, two WordNet entries loaded as one thing), `oewn:11623913-n` (the cycad "kaffir bread", whose only other name is Latin).
   - `drop_listed_names`: items whose LDNOOBW-listed names go and real names stay: today's `RIVERS_DROP_LISTED_ALIASES`, `ANIMALS_DROP_LISTED_NAMES` and `POP_DROP_LISTED_NAMES`, moved from fetch.
   - `rename`: an item's new shown name, which must be one of its names left after the drop: `wikidata:Q137505841` → "makrut lime".
3. **At load** (`loadSet`, before `import_source`): every alias holding a word on Plor's list goes, from every item in every set; the `drop_listed_names` items also lose their LDNOOBW-listed names; the `drop` items go. An item left with no names goes (the bare noun `10248534-n` and the Nuristani `09709027-n`). An item whose shown name went, with names left and no `rename` or `drop`, stops the load, naming its ID and the names left (not the word). The load prints each set's count of dropped aliases and items.
4. **Fetch** no longer drops anything: the loops in the animals and rivers fetches and `dropListed` go. The current snapshots were fetched with those drops, so loading them gives the same rows; a future fetch keeps the names and the load drops them.

Existing local bases keep their rows until `npx supabase db reset` and `npm run base -- load all` (loading only adds rows). plor.app's answer database is empty, so nothing there changes; the misses hold reaches plor.app with the code's deploy.

## Acceptance criteria
- [ ] `npm test`: `isListed` holds "kaffir lime", "cape kafferboom", "kafirs" and "caffer cat"; it doesn't hold "syncerus caffer", "cossypha caffra", "kaffiyeh" or "kaffrine".
- [ ] A test loads a fixture item whose shown name is listed, with no decision, and the load stops naming its ID; with a `rename` it loads under the new name; a `rename` to a name the item doesn't have stops the load.
- [ ] On the Mac, after `db reset` and `load all`: no alias in `private.thing_alias` holds a word on Plor's list (query and its output); "makrut lime" is a member of `fruit` and "kaffir lime" isn't an alias; alastrim is in `disease` without the alias; the cat, the tree, the cycad, `10248534-n` and `09709027-n` aren't loaded; the 12 Latin names and great millet's other names still are.
- [ ] `load all` prints the same counts as before for every set the word list doesn't touch (rivers, animals, pop groups among them), showing the drops moved from fetch to load change nothing in today's snapshots.
- [ ] `misses.db.test.ts`: a miss holding a word on Plor's list, typed by enough players to pass 13b's threshold, is held, not accepted.
- [ ] `npm run test:db`, `npx supabase test db`, `npm run draft -- check-bank` (0 problems) and `npm run draft -- simulate` (as many days draft as before) pass.

## Out of scope
- Searching the base for other slurs LDNOOBW misses. The list is ready for them; finding them is its own task.
- Re-fetching any set. plor.app's answer database (empty).

## Numbers
None. The list's words are the slur's spellings found in the base on 2026-10-27 (above), each approved with the list (round 1 and round 2). 13b's miss threshold (3 players and 1%) is unchanged.

## Plan
1. `plor-listed.ts` and `isListed` over both lists, with unit tests. Expected: LDNOOBW's existing tests still pass; disproved if a whole-word match catches "kaffiyeh".
2. `data/listed.json`, its parser and its checks, beside `parseSameness`.
3. The load step in `loadSet`; remove the fetch-time drops.
4. On the Mac: `db reset` (the M14 worktree shares the stack: say so first), `load all`, then the criteria's queries. Expected: the only changed counts are in `oewn-nouns`, `oewn-animals`, `wikidata-fruit` and `wikidata-places` (Zulu people). Any other changed count disproves "the move changes nothing".
5. The suites, `check-bank`, `simulate`; the reviewer; one PR.

## Removes
- `RIVERS_DROP_LISTED_ALIASES`, `ANIMALS_DROP_LISTED_NAMES`, `POP_DROP_ITEMS`, `POP_DROP_LISTED_NAMES`, `dropListed` and the fetch loops that apply them (their IDs move to `data/listed.json`).
- ROADMAP's "for the human first" item in "From the 13e-8 review", and the handoff's waiting slur item.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
