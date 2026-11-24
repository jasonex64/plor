# M23 23a — A researched list's format and its way into the database

**Status:** approved 2026-11-23 (the human: "Approve 23a"), from answers 17 to 24 in `M23-offbeat-on-a-clock.md`. **Built and reviewed, 2026-11-24**, on `m23-offbeat-on-a-clock`; in its PR, not merged. Local stack only: the hosted database has neither the migration nor the lists.

## Goal
An everyday question's answers come from one file in git that a person can read and edit, and the game judges against exactly that file.

## Who uses it / what breaks without it
- Used by: the research agents (23b) that write lists, the human who strikes borderline answers, every Offbeat player whose answer is judged.
- Breaks without it: 23b has nowhere to put a list, and the three pilot lists can't be played. Today "king" is refused as a bed and "tortilla" accepted as a cake.

## Source
- The human's answers 1, 2 and 17 to 24 (the M23 ticket), and the pilot.
- `docs/DECISIONS.md`: "Answer database imports" (line 41), "Answer model", "Accepted answers" (line 68), "Resolving typed text" (line 72). This sub-ticket changes the first two; the third is untouched.
- `docs/SOURCES.md` gains a row, by answer 18 ("Yes; no links kept"): *Web research by Claude's agents (M23)*, authoritative for the members, typed forms and starting tiers of an everyday question's list; pinned by the list file's commit, since no links are kept.
- How answers are stored and judged today: read by an Explore agent, 2026-11-23 (its report is summarised under Design). **Unverified by this session:** the bodies of `private.import_source` and `private.define_category`; step 1 of the plan reads them.

## Assumptions
1. A researched list replaces a category's membership **from the day it is loaded**; days already played keep the answers they were judged on (the base keeps each fact's dates, and judging reads the base "as of the day's start").
2. An answer on a researched list is its own entry in the database, not joined to the WordNet entry of the same name. So "sponge cake" on the cake list and WordNet's "sponge cake" are two entries until cross-question linking is built (out of M23's scope, the human: "later").
3. Big factual sets (animals, countries, video games) do not use this file: their researched nicknames go through `data/names.json`, the way names are already added to existing things. One way to do each thing.
4. Play taking over a tier (answers 21 and 22) is worked out when a day is drafted, so it is built in 23e. 23a only stores the researched tier.

## Design
**The file:** `content/lists/<category key>.json`, one per everyday question's category.

```json
{
  "format": 1,
  "category": "bed",
  "passes": 1,
  "borderline_seen": null,
  "answers": [
    { "name": "king bed", "aliases": ["king", "king size"], "tier": "common" },
    { "name": "Tempur-Pedic", "aliases": ["tempurpedic"], "tier": "rare", "brand": true },
    { "name": "flower bed", "aliases": [], "tier": "rare", "borderline": true }
  ]
}
```

- `tier` is common, uncommon or rare. The pilot's "first10" becomes common, listed first.
- `brand` and `borderline` are for the human's review only; the game treats such an answer like any other (answers 20 and 23). Striking an answer is deleting its line.
- `passes` (0, 1 or 2) and `borderline_seen` (a date or null) are what answer 15's "fully researched" is checked against in 23e.
- No links (answer 18). An old member judged out is simply not in the file.
- A validator (`npm run content:validate`) refuses: two answers in one file sharing a typed form after normalization, an empty name, an unknown tier, a category not in `data/categories.json`.

**Into the database, through the tree that already exists.** Membership today is "every thing under the category's root". A researched category gets a root of its own and each answer becomes a thing directly under it, so judging, typo matching, search, the admin's pool and the miss audit all work unchanged, with no second membership rule.
- `data/categories.json`: the category's entry changes from `"source": "oewn", "root": "<synset>"` to `"source": "research", "root": "<key>"`.
- `npm run base -- load research` reads every file in `content/lists/` and loads it through `private.import_source`, like any other set; `load all` includes it. Aliases are stored with origin `source` and the ref `research:<snapshot>`, as `import_source` stores every set's (corrected at step 1; the draft said `ai`).
- One migration: `'research'` joins the allowed values of `private.thing_source.source`. No grant, role or policy changes, so this is not a security change.
- The hosted database gets it the usual way, by the human's own `npm run base -- hosted load`, and not before the switch (23f).

**Tiers** stay where the game reads them today: in the day's `levels`, written when a day is drafted. The draft takes them from the list file (23e).

## Acceptance criteria
- [ ] The three pilot lists exist as `content/lists/bed.json`, `acid.json` and `cake.json` and pass the validator (`npm run content:validate`).
- [ ] After `npm run base -- load all` on the local stack, each of the three categories has exactly its file's answers as members (db test comparing `private.category_members` with the file).
- [ ] king, twin, citric, nitric, bundt and chocolate are accepted for their questions; tortilla, dog biscuit, lansoprazole and couch are refused (db test through `private.resolve_draft_answer`).
- [ ] A day approved before the load still judges by its old answers (db test: approve a day, load, resolve against that day).
- [ ] The validator refuses each bad file named above (unit tests, one per refusal).
- [ ] `plor_app`'s grants are unchanged (`supabase/tests/plor_app_role.test.sql` passes untouched).

## Out of scope
- Researching more questions, the second pass, the borderline review (23b).
- Tiers from play (23e). The numbers are recorded in the M23 ticket, answers 21 and 22.
- Joining a researched answer to the same thing in another category.

## Numbers
None new.

## Plan
1. Read `private.import_source`, `private.define_category` and `loadSet` → verify: a note in this ticket's Evidence of what each requires of a new source (a manifest, a snapshot, a check on `source`), and the design corrected if one of them rules it out.
2. Write the validator's failing tests, then the validator → verify: `npx vitest run scripts/content-validate.test.ts`.
3. Convert the three pilot files to the format → verify: `npm run content:validate`.
4. Write the failing db tests (criteria 2 to 4) → verify: they fail for the stated reason.
5. The migration, the `research` set in `scripts/base.ts`, the three `categories.json` entries → verify: `npm run base -- load all`, then the db tests and `supabase test db` pass.
6. SOURCES.md row; DECISIONS.md "Answer database imports" and "Accepted answers" rewritten for researched categories → verify: the `reviewer` agent's report.

Hypothesis for step 5: a category whose root is a research thing needs no change to `resolve_in` or `category_members`. Wrong if either reads `thing_source` or assumes a WordNet root; then the design is re-planned, not patched.

## Removes
- The WordNet roots of bed, acid and cake in `data/categories.json`.
- `docs/research/research_notes/m23-pilot-*.json`, replaced by the three list files (their links are not kept, answer 18).

---
## Source diff
| Source says | We built | Why different |
|---|---|---|
| Plan 3: keep "other_readings" as borderline | Kept, as 45 rare borderline answers across the three files (bed 23, acid 8, cake 14), with these readings of the pilot's shape: "a / b" is one answer, "a" with alias "b"; a comma list ("bleach, soap, …") is one answer each; parentheses are dropped ("acid music (acid house…)" is "acid music"); bare "acid" (the prompt's own word, which the pilot's rules refuse) is not an alias of LSD; 7 entries whose typed form another answer already had were left out (the pilot's answers folding bed, infant bed and hanging bed, its brands Aerobed and Select Comfort, and the readings pound and LSD), their typed forms still accepted through the other answer. Accepted as the pilot gives them, and for the human to strike: water and box (for bed), pancake, hotcake, crab cake, brownie, cookie (for cake), bleach, soap (for acid) | The validator refuses one typed form on two answers; the pilot lists some readings as lists or with notes, which the format has no place for |
| "No second membership rule", no change to the checks `load all` runs | `checkWithin` is skipped when either category of a `within` pair is a researched one (bed within furniture, cookie within cake) | The check asks whether one root sits under the other in a source's tree; a research root sits in no other source's tree. The family (a day never asks both) still comes from `within` in the file |
| Validator: refuses empty name, unknown tier, unknown category, shared typed form | Also refuses a category that isn't the file's name (`lists/bed.json` saying "cake"), an alias with no letters or digits, unknown or ill-typed fields, `format`, `passes`, `borderline_seen` | One file, one category; a form with no letters can never be typed |
| Design: `load all` includes research | `hosted check` also prints the lists' answer count and `hosted load` reads the lists before writing | The hosted load runs `loadAll`, so the list must be read and counted like a set |

## Evidence
**Step 1, read by the main session, 2026-11-23** (`supabase/migrations/20261028140000_baseline.sql`, `…_test_runs.sql`):
- `private.import_source(p_source, p_snapshot, p_items)` (baseline 1521) takes any source name; the only gate on a new one is `thing_source`'s check (`'wikidata','col','oewn','usda'`), which the migration widens. It needs no manifest or snapshot file itself: `p_snapshot` is a label kept in `source_ref`. It writes aliases with origin `source`. In a full load, a name or fact the files no longer give is ended by `load_finish`, so deleting a line from a list removes the answer.
- `private.define_category(p_key, p_name, p_source, p_root, p_member_of)` (baseline 1309) resolves the root with `thing_by_ref(p_source, p_root)`: a `research` root works once the list's root item is loaded.
- `category_members` (baseline 1392) and `resolve_in` (test_runs 12) walk `kind_of` from the root and read no source. The hypothesis holds on reading; step 5's tests are what prove it.
- `resolve_in` judges by the root frozen in the approved day's question, so an old day keeps its old root (criterion 4).
- Found, not designed for: `category_extra` rows (answers an admin accepted for bed, acid or cake) still count beside the researched list. Left as it is; the conversion checks each is on the list or says which is not.

**Step 2** (`npx vitest run scripts/content-validate.test.ts`, failing first: 5 new cases failed because `lists/animal.json` was read as a puzzle; after: `Tests 26 passed (26)`).

**Step 3** (`npm run content:validate` → `CONTENT OK content: 32 file(s)`). Converted by a throwaway script (not kept). Answers per file and tier:
| file | answers | common | uncommon | rare | borderline | brand |
|---|---|---|---|---|---|---|
| bed | 141 | 43 | 48 | 50 | 62 | 12 |
| acid | 185 | 32 | 32 | 121 | 35 | 0 |
| cake | 152 | 36 | 37 | 79 | 35 | 3 |
(bed's 12 brands are the pilot's `brands` list less Aerobed and Select Comfort, already typed forms of air mattress and Sleep Number; cake's 3 are Twinkie, Ding Dong, Ho Hos.) The pilot files are removed in the same commit.

**Step 4**, before the migration and the switch: `npx vitest run scripts/research.db.test.ts --no-file-parallelism` → `Tests 14 failed (14)`: the members of bed, acid and cake are WordNet's (24 of 141, 144 of 185, 104 of 152 as the file has them); king, twin, citric, nitric, bundt and chocolate are refused, tortilla, dog biscuit, lansoprazole and couch accepted; the approved-day test fails on `thing_source_source_check`.

**Step 5.** `npx supabase migration up --local` applied `20261124075116_research_source.sql`; `npm run base -- load all` → `LOADED lists (3 lists, lists): {"facts":478,"things":481,"aliases":1702,"numbers":0}` (3 roots + 141 + 185 + 152 answers), `DEFINED 231 categories`, `DATABASE 318 MB`.
- Criteria 2, 3, 4: `npx vitest run scripts/research.db.test.ts --no-file-parallelism` → `Tests 14 passed (14)`.
- Criterion 6: `npx supabase test db` → `plor_app_role.test.sql ....... ok`, `Result: PASS` (42 files, 833 tests), the file untouched.
- Unit tests: `npm test` → `Tests 877 passed (877)`. Type check `npx tsc --noEmit -p .`: no output. Lint of the changed files: `npx eslint <changed files>`: no output (`npm run lint` reports 138 errors, all in `.claude/skills/impeccable` and `.github/skills/impeccable`, not in this change).
- `npm run test:db` (whole suite, with the researched base loaded): 495 passed, 1 failed, 39 skipped; the failure and the skips were five files' 5 s test or 10 s hook limits timing out on the loaded machine (a signed-out 401, sign-in hooks); `npx vitest run src/app/api/admin/bank/route.db.test.ts src/app/api/admin/puzzles/substrings/route.db.test.ts --testTimeout=90000 --hookTimeout=90000` → `Tests 8 passed (8)`, and `matching.db.test.ts` and `friends/route.db.test.ts` pass on their own re-run.
- `npm run base -- review bed` → `REVIEW bed: 141 members`, every flag 0 but "things under the root with no English name: 1", not looked into.
- The hypothesis held: `resolve_in` and `category_members` needed no change.
- `private.category_extra` on the local stack: no rows at all, so none for bed, acid or cake outside the list. The hosted database was not read.

**Main session's check of the conversion, 2026-11-24.** The pilot's "other_readings" held two things: other meanings of the word (flower bed, crab cake), which answer 20 accepts as borderline, and plain non-answers (bleach, soap, cookie, brownie). The first conversion kept both, on the main session's wrong brief. 17 non-answers were struck by hand: bed 4 (bedrock, bed linen, box, water), acid 8 (acid music, acid rain, bleach, soap, baking soda, ammonia, antacid, acidic foods), cake 5 (cake donut, brownie, doughnut, cookie, cakewalk). The lists now hold bed 137, acid 177, cake 147. `npm run base -- load all` then printed `ENDING at 2026-11-25T08:00:00+00:00, as the files no longer give them: 34 names, 17 facts`: a struck answer leaves at the next midnight, as every removal from the base does, so a day being played never changes. `npx vitest run scripts/research.db.test.ts scripts/content-validate.test.ts scripts/base.test.ts --no-file-parallelism` passes after it. Pancake, hotcake and johnnycake stay as borderline (other meanings of "cake") though the pilot judged the old pancake members out: the human strikes them or not in 23b's review.

**CI's first run on the PR (2026-11-24) failed `db`:** the list db tests read a loaded base, and CI's stack has none (the builder's note that other tests do the same was wrong: none does). Fixed in the test, not the code: on a stack without the three categories it loads the three lists itself and takes them out after. Limit, stated in the test: on CI "refuses tortilla" only shows a name absent from the list isn't judged in; refusing the old WordNet members is proven on a loaded base (the local run above).

## Review
The `reviewer` agent, 2026-11-24, fresh context; it reran the four targeted test files (109 passed) and read the diff.
- Blocking findings and how each was fixed: all three were docs. (1) The ROADMAP row and both tickets' Status lines said nothing was built: rewritten. (2) The handoff still named the removed pilot files and an unapproved design: rewritten. (3) This section was empty: filled.
- Deferred to ROADMAP "Next revision", For M23: the cake bank question's `uncommon` names not on the list; a strike needs `load all`; `hosted load` reading lists without the category set; the hosted lines untested and needing the migration first; `review bed`'s "no English name" flag; `checkWithin` skipped for researched categories.
- Unverified by the reviewer: `npm run test:db`, `supabase test db` and lint were not rerun by it (the builder's Evidence, and CI on the PR).
