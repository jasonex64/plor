# M13 13e — Growing the categories

**Status:** in progress (2026-10-24): the design is approved (human, 2026-10-24: "Approve, build 13e-1 (Recommended)"); 13e-1, the tooling, is done (PR #78, merged 2026-10-25 on green CI with the human's OK: "I approve 13e-1. Merge PR #78 once every CI check is green"); the batches (13e-2 onward) are next.

## Goal
At least 210 categories, each with a bank question, so the draft can fill a day every day without asking a category again within 30 days (13d: 7 a day × 30 days).

## Who uses it / what breaks without it
- **Used by:** the drafting session, which drafts each day from the bank (13d); every player, who meets the questions.
- **Breaks without it:** with 7 categories, a day can only be drafted once every 30 days. The draft stops and asks: "only 0 bank questions ask a category not used within 30 days; 7 more needed" (13d Evidence). The beta needs a day every day (M15).

## What the human decided for 13e (guided questions, 2026-10-24)
Already decided: "Keep it; grow categories (Recommended)" (13d); new categories need the human's OK (13a); the bank is a file Claude adds to in PRs (13d).

| Question | The human's answer |
|---|---|
| Where most new categories come from | "Mostly WordNet (Recommended)": a branch of WordNet's tree, already loaded, is a category with no new import |
| How categories are approved | "Batches with flags (Recommended)": 20–30 at a time, each with its size, 20 sample members and flags, in one PR the human merges or comments on |
| Which kinds matter | "Everyday things", "Places", "Pop culture", "Knowledge": all four |
| Combined traits ("African animal") | "Later, after the 200 (Recommended)": their own ticket |
| Places and pop culture, which need Wikidata | "Some, in 13e (Recommended)": a smaller set of reviewed Wikidata imports, each measured for size before it's kept |
| The smallest category | "10 members" |
| Who writes each category's bank question | "Claude, in the same batch (Recommended)" |

## Source
- **Open English WordNet** and **Wikidata** (SOURCES.md, M13 D2).
- **13a:** categories as recipes (`private.define_category`), `npm run base` and its review. **13c:** host counts (up to 3), 3 familiar answers. **13d:** the bank, its validator and the gap.

## Claude's design (for the human to approve)
**1. Categories as data.**
- `data/categories.json` lists every category: key, display name, source (`oewn` or `wikidata`), root (the source's ID) and an optional member_of.
- `npm run base -- load all` defines them after loading the sets. The `category` field moves out of each set in `scripts/base.ts`, so there is one way to define a category.
- The 7 existing categories move into the file unchanged.

**2. The checks.**
- `npm run base -- review <key>…` reviews several categories at once: the count, 20 samples and the flags it has now (two parents, one name on two members, no typeable name). It adds a flag for a category under 10 members.
- `content:validate` refuses a bank question whose category isn't in `data/categories.json`, and a host bank under 3 entries, since a question can land at Q7, where the host names 3.

**3. Batches.**
- Each batch is its own sub-ticket and PR: 13e-2, 13e-3 and so on. CLAUDE.md asks for one PR per sub-ticket.
- A batch holds 20–30 categories with their bank questions, the review output for each, and, for any Wikidata import, its measured size.
- Mostly WordNet branches, across everyday things, places, pop culture and knowledge. Places and pop culture come from Wikidata sets added to `scripts/base.ts`, as countries were.
- The human approves a batch by merging it.

**4. 13e-1, the tooling:** points 1 and 2, with the 7 categories moved. No new categories yet.

**13e is done** when the bank holds at least 210 questions over 210 categories and a day can be drafted for every one of the 30 days after T1. That last check is a trial run of `npm run draft` for each date, with the files deleted after: no content days until the human asks.

## Acceptance criteria
- [x] **13e-1:** `data/categories.json` defines the 7 categories; `npm run base -- load all` gives the same member counts as before (56,787, 193, 2,999, 928, 48, 118, 50); multi-key review prints each category with the under-10 flag; `content:validate` refuses an unknown category and a host bank under 3 (unit tests).
- [ ] **Each batch:** 20–30 categories, each of at least 10 members, reviewed in its PR, with a bank question each; any Wikidata import measured for size.
- [ ] **Done:** 210 or more categories and bank questions, and a trial draft succeeds for each of the 30 days after T1.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql`, `npm run test:e2e` and CI pass, for every PR.

## Out of scope
- Combined-trait categories (their own ticket, after the 200).
- Kept-list categories with no source ("something you'd bring to a potluck").
- Refreshing pop-culture lists as they go stale.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| **10** members at least | A category's smallest size | Human, 2026-10-24: "10 members" |
| **20–30** categories a batch | Batch size | Human, 2026-10-24: "Batches with flags (Recommended)" |
| **210** categories at least | Done | 7 questions a day × the 30-day gap (13d: "Keep it; grow categories (Recommended)") |
| **3** host bank entries at least | The validator | The most host answers a question can take (`HOST_ANSWERS_PER_QUESTION`, 13c) |

## Plan
1. ~~The human approves this design.~~ Approved (human, 2026-10-24: "Approve, build 13e-1 (Recommended)").
2. 13e-1, the tooling, in its PR.
3. Batches 13e-2 onward, each in its PR, until 210.

## Removes
- The `category` field of each set in `scripts/base.ts`: categories are defined in one place.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 13e-1 (this ticket, design 1 and 2) | `data/categories.json` (key, name, source, root, member_of), parsed by `src/content/categories.ts`; `load all` defines them in one transaction; `review <key>…`; the under-10 flag (`CATEGORY_MIN_MEMBERS`); `content:validate` checks the file, each bank category, and host banks of at least 3 (`max(HOST_ANSWERS_PER_QUESTION)`) | None. `load <set>` alone no longer defines a category: the ticket gives that to `load all` only (one way). The category key pattern, written in `puzzle.ts` and `bank.ts`, is now one constant (`CATEGORY_KEY`) |

## Evidence
**13e-1** (2026-10-25, Windows checkout, local stack):
- `npm run base -- load all` (20 s): `LOADED` for all 11 sets, then `DEFINED 7 categories from data/categories.json`. Member counts after, by `private.category_members`: animal 56,787, cheese 48, chemical_element 118, country 193, dog_breed 928, fruit 2,999, us_state 50, the same as before the change (read just before it).
- `npm run base -- review cheese us_state fixture_month`: `REVIEW cheese: 48 members`, `REVIEW us_state: 50 members`, `REVIEW fixture_month: 4 members` with `flag, fewer than 10 members: 4` (a db-test fixture category).
- A probe entry with root `Q0` in the file: `load all` failed with `define_category zz_probe: Q0 or <NULL> is not a wikidata thing`, and `private.category` held no `zz_probe` row (the transaction rolled back). The file was restored and reloaded (`DEFINED 7 categories`).
- Unit tests: `content:validate` refuses `category "no_such_category" is not in data/categories.json` and `"host_bank" lists 2 names, at least 3 needed` (`scripts/content-validate.test.ts`); the bank's own refusal (`src/content/bank.test.ts`); the file's shape and a key listed twice (`src/content/categories.test.ts`). `npm run content:validate`: `CONTENT OK content: 1 file(s)` (the real bank passes).
- `npm test` 219 passed (before the categories test was added; 220 with it), `npm run lint` 0 errors, `npx tsc --noEmit -p .` clean, `npm run test:db` 234 passed, `npm run test:sql` PASS (337 tests), `npm run test:e2e` 15 passed. CI: PR #78's runs 40171358426 (pull_request) and 40171355372 (push) on `ac0880f` passed every check (check, db, e2e, secrets, Vercel); merged as `53da1c4`.

## Review
**13e-1** (reviewer agent, fresh context, 2026-10-25):
- Blocking findings and how each was fixed: the empty Evidence and Source diff, the ROADMAP row and HANDOFF still saying "waiting for approval" (all filled in this PR); borderline, `parseCategories` had no test (`src/content/categories.test.ts` added).
- Deferred to ROADMAP "Next revision" (For M13): `load <set>` alone defines no category; `content:validate` reads the categories file from the working directory, not the root; error messages name bank questions by ID in one place and by position in another; a category dropped from the file stays in the database. A repeated host-bank assertion in two test files was left as is.
