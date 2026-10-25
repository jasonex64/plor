# M13 13b — Learning from misses

**Status:** in progress (2026-10-24). The human answered three rounds of guided questions and approved the design, the LDNOOBW row for SOURCES.md and the security change (human, 2026-10-24: "I approve 13b's design, adding LDNOOBW to SOURCES.md, and its security change (new miss-review tables; plor_app may run the one miss function; admin-only audit functions). Measure the WordNet load first, then build 13b.").

## Goal
An answer players type that the database doesn't accept becomes an answer from the next day on, once enough players type it (D4), unless the facts reject it, and the human can audit and undo every addition.

## Who uses it / what breaks without it
- **Used by:**
  - every player: fair answers the sources missed stop being refused;
  - the human, who audits what was added, held or rejected, on the admin pages.
- **Breaks without it:**
  - **A fair answer stays refused forever.** "China" isn't an alias of the People's Republic of China (ROADMAP, For M13), so every player who types it hears "not in our list", day after day.
  - **Nothing learned carries over** (M13 ticket, "Who uses it"): misses are logged (`private.missed_answer`) and never read back into the base.

## What the human decided for 13b (guided questions, 2026-10-24)
Already decided in the M13 ticket: **X = 1%** of the players who answered the category's questions and **M = 3** players at least (D4); "Facts win": a miss the facts reject never auto-accepts; "an easy way for me to audit what's added and remove if needed".

| Question | The human's answer |
|---|---|
| Crude or joke words going live | "Hold listed words (Recommended)": a new word on a published offensive-word list waits for the human's OK; everything else goes live on its own |
| A miss that's another name for a known thing ("hippo") | "New answer, you link (Recommended)": it goes live as its own answer; the audit links it to the thing it names in one click |
| When an addition counts, with days approved ahead | "Yes, from the next day (Recommended)": a day's answers are fixed when the day starts, not when it was approved. A started day still never changes |
| A miss the facts reject ("spider" for an insect) | "Listed, you decide (Recommended)": listed in the audit with its count; the human dismisses it, or accepts it for that one category |
| How the facts check knows "Paris" isn't an animal | "Import all of WordNet (Recommended)": every Open English WordNet noun is loaded for the check |
| A miss one typo from a real answer ("cst": cat or cot) | "Audit only (Recommended)": a typo, never a new answer; it waits in the audit to be linked or dismissed |
| What a player sees when the facts reject a miss | "\"Not in our list\" (Recommended)": the same free retry as today |
| How the human finds out there's something to audit | "Count on admin page (Recommended)": the admin pages show "N to review" |
| Which offensive-word list | "LDNOOBW (Recommended)": the English list of *List of Dirty, Naughty, Obscene and Otherwise Bad Words*, CC BY 4.0, credited on the privacy page |
| The size of all of WordNet's nouns (164 MB) | "keep it all, raise a check to me as database grows if it's getting close to limit and ill consider buying it" |
| WordNet 2025 holds no place names (found while building) | "check how much storage it'd take if its not too much then yes import", then "100,000+ people (Recommended)": Wikidata's places of 100,000+ people |

## Source
- **The M13 ticket:** D4 (the rule, X and M), "How it learns (D4)", "Facts win", "Technically correct".
- **13a** (`M13-13a-the-base.md`): the base's tables, `private.resolve_answer`, the typo rule (`src/game/matching.ts`), normalization (`src/content/puzzle.ts`), imports through `npm run base`.
- **Open English WordNet** (SOURCES.md, M13 D2): every noun synset and its hypernym ("kind of") links, for the facts check.
- **LDNOOBW** (SOURCES.md, added with the human's OK, 2026-10-24): https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words, file `en` (403 lines, last changed 2020-07-13 at commit `4638b97`), CC BY 4.0. Read 2026-10-24 through the GitHub API (license, size, last commit); its contents weren't reviewed.
- **PostgreSQL 17** and **Supabase roles and RLS** for the new tables, functions and grants.

## Claude's design (for the human to approve)
**1. Counting a miss.** The miss path (`src/game/runs.ts`) already logs every refused text. 13b adds, in the same request, a check of that text for the question's category:
- The text is normalized as aliases are (`normalize`), so "Jackalope" and "jackalope " count together.
- **Players who typed it:** distinct players who missed with that normalized text on any question of the category, on any day.
- **Players who answered the category:** distinct players who gave an answer or a miss on any question of the category, on any day.
- The text **reaches the threshold** when the first is at least 3 and at least 1% of the second (D4).

**2. What a text that reaches the threshold becomes.** The checks run in this order, and the first that fits decides:
1. **Near-typo:** one typo from a member of the category (the typo rule) → *audit only*, to be linked or dismissed.
2. **Rejected by the facts:** the text names a thing in the base that isn't in the category ("spider" for insect; "Paris" for animal, once all WordNet nouns are loaded) → *audit only*, to be accepted for that category or dismissed.
3. **On the LDNOOBW list** → *held* for the human's OK.
4. **Otherwise** → *accepted:* a new thing named by the text, a member of the category (under its root, and member_of its thing if it has one), with origin "players". It's in play from the next day that starts.

Each outcome is decided once per text and category, and logged in `private.base_log`.

**3. From the next day.** A format-3 day's answers are resolved as of **the start of its day** (the reset at midnight Pacific, M11 H6), or its approval if that came later, instead of its approval alone. A started day never changes; a day approved ahead picks up what was learned before it starts.
- This changes 13a's rule, so it gets a DECISIONS.md Log row and updates "Puzzle content format".
- Source imports between approval and the day's start reach the day too. They're reviewed snapshots the human asked for.

**4. Undo, link and accept, as of a moment.** Nothing is deleted, so started days keep what they had:
- **Undo** marks the player-added thing removed from now; days that start later don't accept it.
- **Link** ("same as hippopotamus") moves the text onto the known thing as an alias, from now, and removes the player-added thing.
- **Accept for this category** (a rejected miss) adds the thing to that category alone, from now, without changing its facts elsewhere.
- **Accept** (a held word) makes it a member, as in step 4 above.

**5. The audit page** (`/admin/audit`, admins only, OB007 otherwise):
- lists what was accepted, held, rejected and near-typo, each with its category, its count, and the actions above;
- the admin pages show "N to review": held, rejected and near-typo entries not yet decided.

**6. All WordNet nouns** come in as a new `npm run base` set (`oewn-nouns`), loaded after `oewn-animals`, merged by WordNet's own IDs, so a WordNet thing already loaded isn't doubled. **Wikidata's places of 100,000+ people** come in as `wikidata-places`, names only, since WordNet 2025 holds no place names (Evidence; human, 2026-10-24).

**7. Security change** (proposed here, recorded in DECISIONS.md when built):
- New tables in `private`, with RLS on and no grant for `plor_app`: the miss reviews (text, category, outcome, decision) and the per-category extras.
- A removed-from timestamp on things, aliases and facts.
- `plor_app` may execute one new function that counts a miss and acts on the threshold, running with its owner's rights and an empty `search_path`.
- The audit's read and actions run through admin-only functions, as `private.base_lookup` does.

## Acceptance criteria
- [x] **The threshold** (db tests): a text typed by 2 players isn't accepted; the 3rd player's miss accepts it when 3 is at least 1% of the category's players; with 301 players who answered the category, 3 aren't enough and the 4th makes it.
- [x] **From the next day** (db tests): an accepted text isn't accepted on today's day, is on tomorrow's (approved before the acceptance), and a started day never changes.
- [x] **Each outcome** (db tests): a near-typo, a fact-rejected text, a listed word and a new word each reach the threshold; only the new word becomes a member; each is logged.
- [x] **Audit actions** (db tests): undo, link, accept-for-category and accept each take effect from now: a day that started before keeps what it had, and a day that starts after shows the change.
- [x] **The audit page** (e2e): an admin sees an accepted and a held entry with their counts, undoes one and accepts the other; a non-admin gets 403. The admin pages show the "to review" count.
- [x] **All WordNet nouns** load (`npm run base -- load oewn-nouns`), and so do **Wikidata's places of 100,000+ people** (`wikidata-places`, added when WordNet turned out to hold no place names), and "Paris" typed for an animal by enough players is rejected, not accepted (on the real data in a rolled-back transaction; the rule itself is in `misses.test.sql`).
  - *Hypothesis:* about 82,000 noun synsets, WordNet 3.0's count (OEWN 2025's is *unverified*), most of them new to the base.
  - *Disproved* if the count is far off that. Either way the added size is measured and shown to the human before the rest is built.
- [x] **Grants** (pgTAP): `plor_app` may execute the new miss function and nothing else new; the admin functions refuse non-admins.
- [x] **Credits:** the privacy page credits LDNOOBW under CC BY 4.0.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql`, `npm run test:e2e` and CI pass.

## Out of scope
- Rarity from the misses and additions (13c).
- An email digest of the audit (the human chose the admin count).
- The AI proposing links between nicknames and things (ROADMAP Later).
- Showing players why a miss was refused (the human chose "not in our list").

## Numbers
| Value | Used for | Origin |
|---|---|---|
| X = **1%** of the players who answered the category's questions | The threshold | Human, 2026-10-24 (M13 D4): "1%" |
| M = **3** distinct players at least | The threshold | Human, 2026-10-24 (M13 D4): "3 players" |
| One typo (`TYPO_MAX_EDITS`) | What counts as a near-typo | The typo rule (DECISIONS.md, Answer model); the human: "Audit only (Recommended)" |
| Midnight Pacific | When a day's answers are fixed | M11 H6 (the reset); the human: "Yes, from the next day (Recommended)" |
| About 82,000 noun synsets | Only the experiment's expectation, not a limit | WordNet 3.0's published count, from memory (*unverified*); measured in step 2: 71,864 |
| **100,000** people at least | Which Wikidata places the facts check knows (`BASE_PLACES_MIN_POPULATION`) | Human, 2026-10-24: "100,000+ people (Recommended)" |
| Node's heap at 4096 MB for `npm run base` | Loading the animal snapshot, now part of `npm run base -- load all` | The value 13a's animal load ran with (HANDOFF, "Local state"); a local script's memory, not a game number |

## Plan
1. The human approves this design, the LDNOOBW row for SOURCES.md and the security change.
2. Measure the WordNet noun load (the hypothesis above).
3. The schema and the miss function, with db tests and pgTAP; then the as-of change; then the audit page and its e2e.
4. Review, fixes, PR on `m13-answer-lists-and-content`.

## Removes
- 13a's "resolved as of approval" rule, replaced by "as of the day's start or approval, whichever is later" (`private.answers_as_of`).
- The direct `insert` grant on `private.missed_answer` for `plor_app`, and `logMiss`'s insert: a miss is logged only through `private.record_miss` (one way to log a miss).
- `private.base_lookup`'s own category walk, replaced by `private.in_category_now`.
- The hand-typed load sequence in HANDOFF, replaced by `npm run base -- load all` (CLAUDE.md: a procedure run twice becomes a script), and the "run the script directly" step for the animal load.
- The privacy page's "so we can add it", which no longer describes what happens to an unlisted answer.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Design 7: a removed-from timestamp on things, aliases and facts | On aliases and facts only | A thing with no live alias or fact can't be answered or caught, so a thing-level timestamp would have no reader (build for today) |
| Design 2.1: a near-typo is "one typo from a member (the typo rule)" | Within `TYPO_MAX_EDITS` of a member, **whatever the text's length** | The typo rule's 4-letter minimum is about *fixing* typos. Holding a short near-miss ("cst") for the audit is the safe side of the human's "Audit only": it never goes live by itself |
| Design 5: audit errors | A decision that doesn't fit raises OB012 (409 `audit_invalid`) | OB009 and OB010 were taken (groups, and OB009 again by 13a-2's approval); OB012 is the next free code. The reuse is in ROADMAP Next revision |
| (not in the design) | The privacy page says an unlisted answer can become an answer for everyone, without who typed it, and stays after an account is deleted; it credits LDNOOBW | What happens to typed text changed, so the page that says what's kept had to say so |
| Design 6: all of WordNet's nouns let the facts check know "Paris" | Also Wikidata's places of 100,000+ people (`wikidata-places`) | WordNet 2025 holds no place names; the human chose the import and its size after the measurement (Evidence) |
| (not in the design) | `npm run base -- load all` | The full load in order was typed by hand twice (13a-2's review fixes and 13b's reset), so it's a script now (CLAUDE.md) |

## Evidence
**The WordNet noun load (step 2, 2026-10-24, local stack):**
- `npm run base -- fetch oewn-nouns` → "71864 noun synsets, 71864 under 00001740-n", snapshot 2026-10-25 (UTC).
  - *The hypothesis was off:* 71,864 synsets, about 12% fewer than WordNet 3.0's 82,000. OEWN 2025 is smaller than the figure Claude remembered. Every one is under "entity".
- `npm run base -- load oewn-nouns` → `{"facts":70143,"things":67816,"aliases":226962}`.
- The base tables with their indexes went from **91 MB to 164 MB** (78,111 → 145,927 things; `pg_total_relation_size`).
- Every category kept its member count: animal 56,787, cheese 48, chemical_element 118, country 193, dog_breed 928, fruit 2,999, us_state 50, before and after. The load put nothing new under a category root.
- **The human's call on the size** (2026-10-24): "keep it all, raise a check to me as database grows if it's getting close to limit and ill consider buying it". The check is in ROADMAP, For M15: the hosted database doesn't hold the base yet.

**13b's build (2026-10-24, local stack):**
- `npm run test:sql` → `Result: PASS`, including `misses.test.sql` (27 tests):
  - the threshold: 2 players aren't enough, the 3rd makes "jackalope" an answer, named "Jackalope" as most players typed it, logged once; with 301 players answering, 3 aren't 1% and the 4th makes it (`(accepted,4,302)`);
  - each outcome: a near-typo, a rejected and a listed text make no thing;
  - from the next day: a day that had started doesn't accept "jackalope"; a day approved earlier that starts later does;
  - the audit: OB007 for a player; undo keeps the answer on a day that started before it and drops it from a later one; link (only to a member), accept, accept for one category, dismiss; OB012 for a decision that doesn't fit;
  - `plor_app_role.test.sql`: `plor_app` gains `record_miss` and the three audit functions, and loses `insert` on `private.missed_answer`;
  - `answer_engine.test.sql` moved to days that have started (2000-01-01 to 01-03), since a day that hasn't started now takes what's added before it starts.
- `npm run test:db` → 35 files, 231 tests passed, including:
  - `src/game/misses.db.test.ts`: three players miss through the answer route; nothing after two; at the third a new word is accepted, a word holding "2g1c" is held, and "horze" (a tie between horse and horde) is a near-typo; the new word is an answer on tomorrow's day, not today's;
  - `src/app/api/admin/audit/route.db.test.ts`: the list and the count for an admin, 400 for malformed decisions, undo and accept, 409 `audit_invalid`, 403 for a player, 401 signed out.
- `npm test` → 36 files, 206 tests passed, including `src/game/misses.test.ts` (whole-word held words: "big butt" held, "button" and "scunthorpe" not).
- `npx playwright test` → 14 passed, including `audit.e2e.ts`: `/admin` shows "Answer audit (N to review)"; an admin sees the added and the held text with "Typed by 3 of the …", undoes one and accepts the other, both listed under Decided; a player sees "This page is for admins only.".
- `npx tsc --noEmit -p .` clean; `npx eslint src e2e scripts` clean. (`npm run lint` over the whole checkout also reports 188 warnings in `.claude/skills/impeccable` and `.github/skills/impeccable`, untracked files the human added that aren't part of this change.)
- `npm run base -- load all` loaded every set in order after a `db reset` (oewn-nouns: `{"facts":70180,"things":67854,"aliases":227070}`, a few more than its first load, which came after oewn-cheese).
- The privacy page's credit and wording are in `src/app/privacy/page.tsx`; no test reads page copy (CLAUDE.md, "Don't test constants").
- **"Paris" for an animal, with the real data: accepted, not rejected** (a rolled-back transaction on the local stack: 3 players' `record_miss` for "paris" on an animal day → `paris|accepted|3|3`). *The design's premise is disproved:* the 2025 edition of Open English WordNet holds no place names. In its JSON release, `entries-*.json` has no "Paris", "France", "London" or "China", and `noun.location.json` has 875 synsets. A common noun like "Einstein" (a genius) is there. That also explains the count, 71,864 against WordNet 3.0's 82,115: WordNet 3.0 had about 7,700 instances, mostly named places and people (that figure from memory, *unverified*). Countries are in the base from Wikidata, so "France" is rejected; cities, people and brands aren't. **Stopped to ask the human** (CLAUDE.md, "Stop and ask when": a source doesn't hold what the design assumed).
- **Wikidata's places,** after the human's "check how much storage it'd take if its not too much then yes import":
  - Counts from Wikidata's query service, items with an English label: 6,308 with a population of 1,000,000+; 30,313 with 100,000+; about 114,000 with 10,000+ (116,505 with any label; the English count timed out).
    - *Claude's guess was off:* 4,000 to 5,000 at 100,000+, thinking of cities. The figure counts regions, provinces and counties too.
    - Counting by class (city, populated place) timed out every time.
  - The human chose "100,000+ people (Recommended)".
  - `npm run base -- fetch wikidata-places` → "FETCHED wikidata-places: 30313 items". The first attempt ended with a Node assertion on Windows (`!(handle->flags & UV_HANDLE_CLOSING)`, cause *unverified*); the second ran clean.
  - `npm run base -- load wikidata-places` → `{"facts":0,"things":30081,"aliases":89949}` (232 places were already countries or states).
  - The base went from **165 MB to 195 MB** (Claude estimated about 200). Every category kept its member count.
  - "Paris" for an animal, the same rolled-back check → `paris|rejected|3|3|Paris`.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
