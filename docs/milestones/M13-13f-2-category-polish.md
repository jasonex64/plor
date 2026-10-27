# M13 13f-2 — Category polish

**Status:** in review (approved by the human, 2026-10-27: "I approve 13f-2's design as drafted. Build it."; built and reviewed on the Mac, 2026-10-27; PR #112)

## Goal
Close every For M13 item about what categories hold: bring back the left-out categories the human chose, cleaned; apply the data fixes decided in 13f's triage and here; close the rest as accepted.

## Who uses it / what breaks without it
- **Used by:** every player (the answers a category accepts), the drafting session (more categories, fewer swaps).
- **Breaks without it:** "us" and "bh" count as countries (and "bh" names two); "ununnilium" names two elements; Manhattan, Queens and The Bronx count as US cities of 1,000,000+; "oceania" names two continents; spoon, fork and knife aren't kitchen utensils; toy, cosmetic, berry, nut and organ stay out of the bank.

## What the human decided (2026-10-27)
From 13f's triage: country codes **"Remove the codes (Recommended)"**; "ununnilium" **"Keep it on element 110 only (Recommended)"**; regional fruit (PGI) **"Keep them (Recommended)"**.

Round 1:
- Members that don't fit their prompts (road's ski run, form of government's Weimar Republic, coffee's Postum, garden's pot farm, bed's couch, simple machine's ski jump, story's plot, virus's vector): **"Accept them"**.
- Answers shared by categories that can share a day (animal K and bird K, festival and holiday, virus and disease, hat and clothing, bone and tooth): **"Accept it"**.
- Weak lists (unfamiliar host answers, the lists swaps drop most, "wolf" out of animal W): **"Leave it to the swaps"**.
- The left-out categories: **"Yes, one by one (Recommended)"**.

Round 2:
- Toy and cosmetic: **"no sex toys and racist caricatures"**; confirmed in round 3 for cosmetic: **"Yes, without blackface (Recommended)"**.
- Berry and nut: **"Bring both back (Recommended)"** (shared answers with Wikidata's fruit are accepted, round 1).
- Organ and crime: **"Organ only"** (cleaned; crime stays out).
- God or goddess, and the Greek letter: **"Try again"**: look for a better root or source for each, and report.

Round 3:
- Links: **link cutlery (Recommended)**, **keep shelf in furniture**, **keep water in drinks**.
- Places: **"Two \"Oceania\"s (Recommended)"** (keep one continent); **"Boroughs as cities (Recommended)"** (Manhattan, Queens, The Bronx; Pago Pago, Charlotte Amalie out of US cities). Malabo, Amsterdam and Copenhagen: not chosen, left as they are.
- Flagged names no longer accepted: **"Saturday night special" (gun)**, **"abortionist" (doctor)**, **"mistress" (schoolmarm)**. "paddy wagon" (truck): not chosen, kept.

## The items (ROADMAP, For M13)
Changed in this ticket: the import review's three oddities (country codes, "ununnilium"; PGI kept); 13e-4a's Oceania and boroughs; 13e-2's cutlery, shelf and water links; 13e-7's toy, cosmetic, berry and nut; 13e-8's organ, god or goddess; 13e-9's letter; 13e-10's and 13e-11's flagged names.
Closed as accepted (round 1): 13e-3's generic members, gold's green gold, Pago Pago-like oddities not chosen, the river short name "rhine"; 13e-9's prompt-fit list; 13e-10's prompt-fit list and the shared answers (festival and holiday, virus and disease); 13e-4b's animal K and bird K, its less familiar host answers; 13e-8's bone holding tooth; 13e-11's overlaps, hat and clothing, weak host answers, the thin lists; 13e-10b's thin lists; 13e-2's host above a familiar answer and the Q7 lists; 13e-6's anime title forms and flower V; "wolf" out of animal W.
Closed as already done: 13e-8's "two answers of one question naming one thing" (check-bank refuses it since 13e-9).

## Decided during the build (2026-10-27)
- Country codes: **"Keep the common ones (Recommended)"**: every two- and three-letter code goes except us, uk, usa, uae, prc and drc, which players type as names ("can" for Canada, "car" for the Central African Republic and "sin" for Singapore are codes, too).

## Source
- SOURCES.md, Open English WordNet and Wikidata (M13, D2); the batch tickets above for each item.
- 13e-9b's `data/listed.json` and Plor's list; 13f-1's `data/names.json`; 13e-2's `data/links.json`.

## Design
1. **`data/names.json` gains `remove`**: `{ ref, name, why }`, a name taken off one item (schoolmarm's "mistress"), for a word other things rightly bear, which Plor's list would strip from all of them. The load refuses a name the item doesn't have. listed.json's drops stay for whole items; Plor's list for words no item should bear.
2. **Plor's list** gains "saturday night special(s)" and "abortionist(s)" (phrases no other thing bears; held when typed).
3. **The data fixes:** country codes off countries (`remove` rows, or `drop_listed_names`-style if the codes are a pattern: settled in the build, as the codes are many); "ununnilium" removed from the element it's wrongly on; one Oceania (the other's "oceania" removed); Manhattan, Queens, The Bronx, Pago Pago and Charlotte Amalie dropped from the US cities set (`data/listed.json` `drop`, if they're in no other set, else `remove`); a cutlery link under kitchen utensil.
4. **Five categories back**, each with every member read and the offensive entries dropped by ID (sex toys and the racist caricature from toy; blackface from cosmetic; crude slang from organ), and a bank question each with 6 familiar host answers: toy, cosmetic, berry, nut, organ (body organs). Berry and nut aren't `within` fruit (different sources; the shared answers are accepted).
5. **God or goddess and the Greek letter, tried again:** look for a root or a Wikidata set that holds Zeus, Thor and Athena, and one whose members are the Greek letters; report what's found in the PR. A new Wikidata set is fetched on the Mac and its snapshot copied to the Windows PC by the human, as the handoff says.

## Acceptance criteria
- [x] After `db reset` and `load all`: no country holds a two-letter code; "ununnilium" names one element; one continent answers "oceania"; the five places aren't US cities; spoon, fork and knife are kitchen utensils; none of the flagged names is accepted where the human said.
- [x] Toy, cosmetic, berry, nut and organ defined, each 10+ members, with a bank question; their member lists read in the PR, with what was dropped.
- [x] God or goddess and the Greek letter: built if a fitting source is found, otherwise reported with what was looked at.
- [x] `check-bank` 0 problems; `simulate` 30 of 30; `npm test`, `test:db`, pgTAP, e2e pass.

## Out of scope
- Per-category exclusions and "never the same day" overrides (the human: "Accept them", "Accept it").
- Strengthening weak lists (the human: "Leave it to the swaps").
- Crime; Malabo, Amsterdam, Copenhagen; "paddy wagon".

## Numbers
None new (6 host answers and 10 members are DECISIONS.md's and 13e's).

## Plan
1. The human approves this ticket.
2. names.json's `remove` with its test; Plor's list.
3. The data fixes; the five categories, read, cleaned, bank questions; god and letter tried.
4. Load, review, check-bank, simulate, suites, the `reviewer` agent, one PR for the human.

## Removes
- The closed ROADMAP items listed above.
- The five categories' "left out" status in 13e-7's and 13e-8's tickets.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Design 3: country codes off countries, by `remove` rows or a pattern | A load rule, `withoutCountryCodes`: a country's 2–3-letter aliases go, the human's six kept | About 470 codes; no country's name is three letters or fewer, so a rule is exact, and it runs wherever a country loads (the places set holds them too); the first pattern also took a plural "s", which removed "laos" (review), and is two or three letters only |
| Design 3: boroughs dropped by `drop` or `remove` | `drop_from_set` in listed.json for Manhattan (Q11299), Queens and The Bronx, dropped from wikidata-us-cities only; `drop` for the second Manhattan item, Pago Pago and Charlotte Amalie, in no other set | The three in wikidata-places stay places, so the facts check refuses them as cities and misses can't teach them back; the other three exist only as US cities (review: they were first `drop_from_set` rows with a wrong reason) |
| Design 3: cutlery linked | Also "knife" added to the table knife (`data/names.json`) | Only specific knives were members ("table knife", "butter knife"); the human's answer named "knife" (review) |
| Design 1: `remove` refuses a name the item lacks | Each add and remove row must do something in some set; `load all` stops on one that did nothing anywhere | An item loads from several sets with different names (Insular Oceania's "oceania" is in the places set only) |
| Design 4: organ (body organs) | Internal organ (`05306228-n`), with links for brain, pancreas, spleen, gallbladder, urinary bladder, appendix and esophagus | The body-organ branch holds muscles, glands, organelles and crude slang (cock, minge, cobblers); internal organ has none of them |
| Design 4: sex toys and the racist caricature dropped by ID | "golliwog(g)", "blackface", "sex toy" and "adult toy" on Plor's list; dildo, cock ring, goat eye and sex toy dropped by ID | Listed, a typed one is held, not learned back; the toys under "sex toy" bear no listed word |
| Design 5: god or goddess and the Greek letter built if a source is found | Not built; ROADMAP Later | WordNet has no Zeus, Thor or Athena, and the Wikidata items so named are other things; the Greek letters share WordNet's "letter" with the Latin ones |

## Evidence
On the Mac, 2026-10-27, after `db reset` and `load all`.
- **The load:** `oewn-nouns … listed words: 42 names and 21 items dropped`; `LINKED … 124`; `DEFINED 231`; `DATABASE 316 MB`. On the way it stopped twice by design, on a listed shown name with a clean name left ("sex toy", also "adult toy"; "golliwog", also "golliwogg"), each settled; then a dry run of the listed-word step over every snapshot found no stop left.
- **After the review's fixes, on the branch with main merged** (a fresh `db reset` and `load all`): `DEFINED 231`, `LINKED … 124`, `DATABASE 316 MB`; "laos" a country's name again (1); kitchen utensil holds spoon, fork and knife; the rest as below; check-bank 0 on 231; simulate 30 of 30; `npm test` 444, lint and tsc clean, `test:db` 270, pgTAP 435, e2e 61.
- **The fixes (queries):** country codes left on countries: `drc prc uae uk us usa`; "ununnilium" on `darmstadtium` only; one continent answers "oceania"; the five places as US cities: 0, The Bronx still a place: 1; spoon and fork in kitchen utensil: 2; flagged names left: 0; schoolmarm's "mistress": 0; internal organ holds brain and pancreas.
- **The five categories:** toy 51, cosmetic 23, berry 22, nut 30, internal organ 42 members; every member read (the lists in this ticket's build notes and the PR).
- **check-bank** `CHECKED 231 questions: 0 problems`; **simulate** `DRAFTED 30 of 30; subset questions 74 of 210`.
- **Suites:** `npm test` 43 files, 444 passed; lint and tsc clean; `npm run test:db` 40 files, 270 passed; `npx supabase test db` 435 PASS; `npm run test:e2e` 61 passed.

## Review
The `reviewer` agent, 2026-10-27, in a fresh context (it ran the load's steps over every snapshot and read-only queries; no writes).
- Blocking findings and how each was fixed: the code pattern's plural "s" removed Laos's name "laos" (now two or three letters only, with a Laos test); three `drop_from_set` rows named items no other set holds, with a false reason (now plain drops, with true reasons); "knife" didn't answer kitchen utensil though the criterion said it did ("knife" added to the table knife).
- Deferred to ROADMAP "Next revision" (From the 13f-2 review): `drop_from_set`'s set isn't checked against the sets, and nothing refuses a ref in both `drop` and `drop_from_set`; a single `load <set>` can't judge add and remove rows (only `load all` does); `import_source` only inserts, so these changes need a `db reset`; members that fit poorly, accepted (cosmetic's "pencil", toy's "trapeze", internal organ's ruminant organs and the slang "ticker", "tum"); Australia loses "oz"; `countryIds()` re-reads its snapshot each set.
