# M15 15g — The answer pool on the admin pages

**Status:** in review. Drafted 2026-11-15 from the human's request and answers below; **approved by the human (2026-11-15: "Approve 15g")**, asked as "Approve 15g, including the one new admin-only database function?", so the security part (one new admin-only function `plor_app` may run; CLAUDE.md, Security) is approved with it. Built and reviewed on its own branch, `m15g-answer-pool` (checkout `C:/Users/jason/RIFF-m15g`), in a pull request, not merged: **an exception to "one branch per milestone", the human's** (2026-11-15, asked "Build 15g on its own branch now, or wait for PR 222 to merge?" while another session kept `m15-launch-readiness` in use: "Own branch now"). It carries one migration, `20261116051619_answer_pool.sql`; the hosted `db push` is the human's after its merge.

## Goal
On `/admin/puzzles` and `/admin/bank`, clicking an Offbeat question shows its answer pool: how many answers count, a substring search over them, and the list a page at a time.

## Who uses it / what breaks without it
- **Used by:** the human, approving Offbeat days and reading the question bank (the human, 2026-11-15: "right now it shows the host answers. I also wish that there is a ability for me to look at the entire answer pool per question, or at least a way to search an answer to see if it's in the answer pool and see the total number of answers for each question. The same should also be true in the bank section for questions that haven't been used yet").
- **Breaks without it:** the page showed only a question's host answers and host bank (`src/admin/puzzles.ts:30-31`: "The category's members aren't listed: there can be tens of thousands"). The human can't see how big a question's pool is, whether an answer they thought of would count, or wrong members of a category, before a day is approved; a started day can't change. On `/admin/bank` a question shows its category's key and nothing about its answers (`src/app/admin/bank/bank.tsx:61`).

## Source
- `docs/milestones/M13-13a-the-base.md`: "Search and browse (Recommended)", the admin lookup this sits beside (its function, route, page and their tests are the pattern followed: `private.base_lookup`, `src/admin/base.ts`, `src/app/api/admin/base/`, `supabase/tests/answer_base.test.sql`).
- `supabase/migrations/20261028140000_baseline.sql`: `private.category_members` (lines 1377-1405: what a member is), `private.thing_alias` (272-285: aliases are stored normalized), `private.base_lookup` (1225-1257: the admin-only pattern: the function checks `private.admin`, raises OB007, and is the only thing `plor_app` is granted).
- The game's own rule for a typed answer, as built: `src/game/runs.ts:252-253`, `src/game/matching.ts:111-120` (read for answer 9; 15h changes it).
- DECISIONS.md, Log, 2026-10-21: a host answer's name must avoid every taken letter, the rule the panel's mark follows (answer 9).
- `src/admin/puzzles.ts:32-37, 59`: how the page marks a host-bank answer a stolen letter blocks today.
- No outside source covers the page's layout; it follows the admin pages as built (DESIGN.md).

## Answers (human, 2026-11-15, two rounds of guided questions)
1. What the pool is for (all four chosen): "Is the question fair", "Would my answer count", "Pick better host answers", "Spot bad data".
2. Stolen letters on a drafted day: "Both, blocked ones marked (Recommended)": every answer in the category, the blocked ones marked, and two counts, total and still typeable.
3. A pool of tens of thousands: "Count, search, list in pages (Recommended)".
4. What search matches: "should just be inclusive of the substring. if i type "fr" then anything with the "fr"sstring in it should show up".
5. Picking host answers from the pool: "View only, for good". (This narrows answer 1's third choice: the pool is for looking; a better host answer still comes from a redraft.)
6. Search scope: "Names and aliases (Recommended)": the row shows which alias matched.
7. Page size: "20".
8. When: "built now, not an issue if it gets finished after the deadline as players dont see this only i do". An exception to "no new features before the beta" (HANDOFF), for an admin-only page.

9. What "blocked" means in the panel (2026-11-15, in the human's words): "So if a player is playing it on the screen, an alias, for example, NYC, wouldn't work for New York City if the letter I is taken. But in the admin page, if I'm just trying to look up something, then it should allow me to find the entry New York City by typing NYC. And if one of the letters makes it a blocked or unable thing to type, it should just have it like dotted out or something to indicate that." So: the panel's search ignores stolen letters and finds a member by any alias; a member whose **shown name** holds a stolen letter is drawn dimmed and marked with the letter; the second count is the members whose name is free of the stolen letters.
   **The game as built differs from the first sentence** (read 2026-11-15, not run): a player's typed text is what is checked (`src/game/runs.ts:252-253`), then an exact alias wins (`src/game/matching.ts:115-116`), so "nyc" is accepted for New York City with I stolen. Only a host answer is held to its name (DECISIONS, Log, 2026-10-21: "A host answer's **name** must avoid every letter stolen… an alias that avoids them no longer counts"). Whether the game should change is the human's, and is not part of 15g.

## Design (as built)
- **One admin-only database function,** `private.category_pool(p_admin, p_key, p_search, p_offset, p_limit)`, in one new migration. Like `private.base_lookup` it checks the caller is in `private.admin` (OB007 otherwise), is `security definer`, revoked from every role, and granted to `plor_app` alone. It returns the category's member count (`private.category_members`, as approval counts them), the count with a live alias holding `p_search`, and one page of them by name, each with its ID, name and the alias that matched; every row when `p_limit` is null; null for a category that doesn't exist. **This is the security change approved with the ticket:** `plor_app` gains one more function it may run, read-only, admins only. No table grant, no new stored data, no index.
- **One route,** `GET /api/admin/pool?category=&taken=&q=&offset=` (`src/admin/pool.ts`): signed out 401, not an admin 403, a bad value 400, a category the base doesn't have 404 (`no_category`). **Changed from the proposal,** which had the route take a date and question and work out the taken letters itself: the page already holds each question's category and letters, so the route takes them. It reads no drafted day, so `next.config.ts` needs no entry for it, and the Bank page calls it the same way with no letters.
- **The taken-letter mark and count are made in TypeScript,** not SQL: a shown name's letters are judged as the game normalizes them (`avoids`, `src/content/puzzle.ts`), which SQL has no copy of. So the count of clean names reads every member's name once, with the pool's first page (`p_limit` null), and the page keeps it while the admin searches and pages.
- **One shared panel** (`src/app/admin/pool.tsx`). On `/admin/puzzles` each question has an "Answer pool" button under its category; on `/admin/bank` the question itself is the button. Either opens the panel in a row of its own under the question: the counts, a search box with a Search button (as the Database page searches), the answers by name, and "Show more (20 of 60)" while more remain. Opening a panel is what fetches.
- **Search:** the typed text is normalized as aliases are (`normalize`) and matched as a substring of any live alias of a member, past any taken letter (answer 9). A row found by another alias than its name says `also "<alias>"`.
- **Words the builder wrote, for the human to change:** "60 answers for any bag; 34 have no taken letter (U, D, R) in the name."; "Part of any name"; "Search"; "3 answers have "fr" in a name." / "No answer has "fr" in a name."; "(R is taken)"; "Show more (20 of 60)"; "That category isn't in the answer database."

## Assumptions and open questions
1. **Order of the list:** by shown name, capitals and small letters together. Nobody chose this; the human can ask for another. Names that start with a mark sort first ("'akepa" before "aardvark"): ROADMAP, Next revision.
2. **What "blocked" means: answered (answer 9).** The game checks the text the player typed, not the answer's shown name (`src/game/runs.ts:252-253`), so an answer whose name holds a taken letter still counts when typed as an alias without it; approval's own check counts a member as typeable when any live alias lacks the letters (`supabase/migrations/20261030054018_test_runs.sql:134-137`). The panel follows the shown name, as the human said; 15h makes the game agree.
3. **Speed: the hypothesis held.** Expected: counting and searching the largest pool's aliases without a new index answers in a few seconds locally. Measured on the local base (Evidence): under a second each. No index was added.
4. **The bank's category** is the base's category key (`content/bank.json`: "animal", "country", "fruit"; read 2026-11-15).

## Acceptance criteria
- [x] `private.category_pool` raises OB007 for a non-admin; `plor_app` can run it and nothing else new (pgTAP: `answer_pool.test.sql`; `plor_app_role.test.sql`'s grant list).
- [x] For a fixture category it returns the member count `category_members` gives (pgTAP). The count of clean names and each row's taken letter are the route's (`npm run test:db -- -t "admin pool"`), since they are made in TypeScript (Design).
- [x] A search for a substring returns every member with a live alias holding it, names the alias when it isn't the shown name, and none without it; removed aliases don't match (pgTAP; the route test for the alias shown).
- [x] 20 rows a page (`POOL_PAGE_SIZE`); the next page starts where the last ended, with no member twice or skipped (pgTAP, with pages of 3 over 4 members; the route test's `offset`).
- [x] `GET /api/admin/pool`: 401 signed out, 403 for a non-admin, 400 for a bad category, letter list or offset, 404 for a category the base doesn't have (`npm run test:db -- -t "admin pool"`).
- [ ] On `/admin/puzzles` an admin opens question 2 of the fixture draft, sees both counts, the taken answer marked, and searches by part of another name (`e2e/approve-and-play.e2e.ts`; passed locally, **CI's result is the evidence**). "Show more" has no e2e: a page is 20 and no fixture category holds more; it was seen by hand in the screenshot run (Evidence).
- [ ] On `/admin/bank` an admin opens a question's pool under its row (`e2e/bank.e2e.ts`; passed locally, **CI's result is the evidence**). The bank asks real categories, which CI's fixture base doesn't have, so there the test accepts the "isn't in the answer database" line; the count was seen locally (Evidence).
- [x] The largest category's first page and a two-letter search, timed on the local base (Evidence).
- [x] DESIGN.md describes the panel. *(The proposal's `next.config.ts` criterion is dropped with the route's change: it reads no content file.)*

## Out of scope
- Picking a host answer from the pool (answer 5).
- Changing the base from this panel; what players added is audited on `/admin/audit`.
- Fragments' days.
- An exact "would this count" check apart from the substring search (answer 4).
- The bank's snake_case category names (ROADMAP, Next revision).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 20 | Members a page | The human, 2026-11-15, answer 7 |

## Plan (as proposed; steps 3 and 4 changed with the route, see Design)
1. Read the sources marked "to read" and the game's stolen-letter rule → verify: open question 2 is answered in this ticket, or asked.
2. The migration and its pgTAP tests, tests first → verify: `npx supabase test db` (the new file fails before the function exists, passes after; `plor_app_role.test.sql` passes with the one new grant).
3. The route and its db test → verify: `npm run test:db -- -t "admin pool"`.
4. The panel on both pages, DESIGN.md → verify: `npx tsc --noEmit -p .`; the two e2e tests on CI.
5. Time the largest category (open question 3) → verify: the timing command's output in Evidence; the human's word if it is slow.
6. The reviewer; ticket Status, ROADMAP row, handoff, in the same PR.

After its merge the hosted `db push` is the human's; until then the panel on plor.app answers with an error, and nothing players see changes.

## Removes
Nothing. It adds a view beside what is there. (`src/admin/puzzles.ts:30-31`'s comment still holds: that view lists no members; the panel does.)

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The human: "look at the entire answer pool per question, or at least a way to search an answer… and see the total number of answers" | The count, a search, and the pool 20 at a time | Answers 3 and 7: a pool can hold 56,169 answers |
| The human: "clicking the question" (the Bank) | On the Bank the question is the button; on Puzzles a separate "Answer pool" button under the category | On Puzzles the question's cell already holds the prompt and category beside the host chips; a named button says what it opens |
| The ticket's proposal: the route takes a date and question | It takes the category and the taken letters | The page already holds both; no drafted file is read (Design) |
| The ticket's proposal: the function returns the typeable count and each row's blocking letter | The route makes both in TypeScript | SQL has no copy of the game's normalization (`normalize`), and a second one would be a second way |
| M13 13a's lookup matches an exact alias | A substring of any alias | Answer 4 |

## Evidence
- **pgTAP** (`npm run test:sql`, 2026-11-15, after `npx supabase migration up`): `Files=42, Tests=833 … Result: PASS`. Before the migration, `answer_pool.test.sql` alone: "You planned 15 tests but ran 1 … Result: FAIL" (no function).
- **The route** (`npm run test:db -- -t "admin pool"`): `Test Files 1 passed | 64 skipped (65)`, `Tests 6 passed | 501 skipped (507)`. Its first run failed one test, the test's own mistake (it took K, which "plain oak" holds); the letters were changed to Q and Z.
- **Unit tests** (`npm test`): `Test Files 70 passed (70)`, `Tests 814 passed (814)`. `npx tsc --noEmit -p .` and `npx eslint` on the changed folders: no output.
- **The largest category, timed** (psql on the local base, in a transaction rolled back; an admin made for it): animal, 56,169 members. First page: 766 ms. Search "fr" (5,153 matching): 722 ms; its second page: 674 ms. Every row (the first open on a question with taken letters): 982 ms. Country, "fr": 4 ms (5 of 193).
- **e2e, locally** (`npm run test:e2e -- e2e/approve-and-play.e2e.ts e2e/bank.e2e.ts`): the new pool test, the approve test and the bank test passed (3 of 4). **The file's last test, "a player survives all seven questions…", failed locally three times, twice with the new test and once without it** (`--grep-invert "answer pool"`), at sign-in or its first address check; not looked into further. CI's e2e decides.
- **By hand** (a throwaway Playwright script against the real local base, deleted after): Tue 17 Nov, question 5, "60 answers for any bag; 34 have no taken letter (U, D, R) in the name.", the taken names muted with the letter struck and "(R is taken)", "Show more (20 of 60)"; the Bank, "Name an animal", "56,169 answers for any animal." at 390px.
- **Not verified:** the panel on plor.app (it needs the merge and the human's `db push`); the largest pool's time on plor.app's database; a screen reader.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
