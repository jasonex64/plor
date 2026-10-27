# M13 13f-2 — Category polish

**Status:** planned, waiting for the human's approval (drafted 2026-10-27 from three rounds of guided questions)

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
- Places: **one "Oceania" (Recommended)**; **boroughs and territories out of US cities (Recommended)** (Manhattan, Queens, The Bronx; Pago Pago, Charlotte Amalie). Malabo, Amsterdam and Copenhagen: not chosen, left as they are.
- Flagged names no longer accepted: **"Saturday night special" (gun)**, **"abortionist" (doctor)**, **"mistress" (schoolmarm)**. "paddy wagon" (truck): not chosen, kept.

## The items (ROADMAP, For M13)
Changed in this ticket: the import review's three oddities (country codes, "ununnilium"; PGI kept); 13e-4a's Oceania and boroughs; 13e-2's cutlery, shelf and water links; 13e-7's toy, cosmetic, berry and nut; 13e-8's organ, god or goddess; 13e-9's letter; 13e-10's and 13e-11's flagged names.
Closed as accepted (round 1): 13e-3's generic members, gold's green gold, Pago Pago-like oddities not chosen, the river short name "rhine"; 13e-9's prompt-fit list; 13e-10's prompt-fit list and the shared answers (festival and holiday, virus and disease); 13e-4b's animal K and bird K, its less familiar host answers; 13e-8's bone holding tooth; 13e-11's overlaps, hat and clothing, weak host answers, the thin lists; 13e-10b's thin lists; 13e-2's host above a familiar answer and the Q7 lists; 13e-6's anime title forms and flower V; "wolf" out of animal W.
Closed as already done: 13e-8's "two answers of one question naming one thing" (check-bank refuses it since 13e-9).

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
- [ ] After `db reset` and `load all`: no country holds a two-letter code; "ununnilium" names one element; one continent answers "oceania"; the five places aren't US cities; spoon, fork and knife are kitchen utensils; none of the flagged names is accepted where the human said.
- [ ] Toy, cosmetic, berry, nut and organ defined, each 10+ members, with a bank question; their member lists read in the PR, with what was dropped.
- [ ] God or goddess and the Greek letter: built if a fitting source is found, otherwise reported with what was looked at.
- [ ] `check-bank` 0 problems; `simulate` 30 of 30; `npm test`, `test:db`, pgTAP, e2e pass.

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

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
