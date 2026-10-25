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

**6. All WordNet nouns** come in as a new `npm run base` set (`oewn-nouns`), loaded after `oewn-animals`, merged by WordNet's own IDs, so a WordNet thing already loaded isn't doubled.

**7. Security change** (proposed here, recorded in DECISIONS.md when built):
- New tables in `private`, with RLS on and no grant for `plor_app`: the miss reviews (text, category, outcome, decision) and the per-category extras.
- A removed-from timestamp on things, aliases and facts.
- `plor_app` may execute one new function that counts a miss and acts on the threshold, running with its owner's rights and an empty `search_path`.
- The audit's read and actions run through admin-only functions, as `private.base_lookup` does.

## Acceptance criteria
- [ ] **The threshold** (db tests): a text typed by 2 players isn't accepted; the 3rd player's miss accepts it when 3 is at least 1% of the category's players; with 301 players who answered the category, 3 aren't enough and the 4th makes it.
- [ ] **From the next day** (db tests): an accepted text isn't accepted on today's day, is on tomorrow's (approved before the acceptance), and a started day never changes.
- [ ] **Each outcome** (db tests): a near-typo, a fact-rejected text, a listed word and a new word each reach the threshold; only the new word becomes a member; each is logged.
- [ ] **Audit actions** (db tests): undo, link, accept-for-category and accept each take effect from now: a day that started before keeps what it had, and a day that starts after shows the change.
- [ ] **The audit page** (e2e): an admin sees an accepted and a held entry with their counts, undoes one and accepts the other; a non-admin gets 403. The admin pages show the "to review" count.
- [ ] **All WordNet nouns** load (`npm run base -- load oewn-nouns`), and "Paris" typed for an animal by enough players is rejected, not accepted (db test, on the fixture).
  - *Hypothesis:* about 82,000 noun synsets, WordNet 3.0's count (OEWN 2025's is *unverified*), most of them new to the base.
  - *Disproved* if the count is far off that. Either way the added size is measured and shown to the human before the rest is built.
- [ ] **Grants** (pgTAP): `plor_app` may execute the new miss function and nothing else new; the admin functions refuse non-admins.
- [ ] **Credits:** the privacy page credits LDNOOBW under CC BY 4.0.
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
| About 82,000 noun synsets | Only the experiment's expectation, not a limit | WordNet 3.0's published count, from memory (*unverified*); measured in step 2 |

## Plan
1. The human approves this design, the LDNOOBW row for SOURCES.md and the security change.
2. Measure the WordNet noun load (the hypothesis above).
3. The schema and the miss function, with db tests and pgTAP; then the as-of change; then the audit page and its e2e.
4. Review, fixes, PR on `m13-answer-lists-and-content`.

## Removes
- 13a's "resolved as of approval" rule, replaced by "as of the day's start or approval, whichever is later".
- The direct `insert` grant on `private.missed_answer` for `plor_app`, if the new function logs the miss as well (one way to log a miss).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
**The WordNet noun load (step 2, 2026-10-24, local stack):**
- `npm run base -- fetch oewn-nouns` → "71864 noun synsets, 71864 under 00001740-n", snapshot 2026-10-25 (UTC).
  - *The hypothesis was off:* 71,864 synsets, about 12% fewer than WordNet 3.0's 82,000. OEWN 2025 is smaller than the figure Claude remembered. Every one is under "entity".
- `npm run base -- load oewn-nouns` → `{"facts":70143,"things":67816,"aliases":226962}`.
- The base tables with their indexes went from **91 MB to 164 MB** (78,111 → 145,927 things; `pg_total_relation_size`).
- Every category kept its member count: animal 56,787, cheese 48, chemical_element 118, country 193, dog_breed 928, fruit 2,999, us_state 50, before and after. The load put nothing new under a category root.
- **The human's call on the size** (2026-10-24): "keep it all, raise a check to me as database grows if it's getting close to limit and ill consider buying it". The check is in ROADMAP, For M15: the hosted database doesn't hold the base yet.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
