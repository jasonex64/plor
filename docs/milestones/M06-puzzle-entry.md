# M06 — Puzzle entry

**Status:** planned (ticket redrafted 2026-10-21 after the human's answers; waiting for the human's approval and Q1 below)

## Goal
The human writes only a day's 7 questions; a Claude session generates the answers and suggests the host's answers; the human reviews and approves the day on an admin page, and players get it that day.

## Who uses it / what breaks without it
- **Used by:**
  - the human, to put in each day's puzzle;
  - a Claude session, to generate the answers;
  - players, who get a puzzle every day.
- **Breaks without it:**
  - No real day can be played. Puzzles are JSON files loaded by `npm run content:publish`. No file covers any date before 2026-10-26, and the publish script refuses any set of dates with gaps; 7 days are parked.
  - Every later milestone needs a puzzle for today: friends' live board (M07), comments (M08), points (M09). Today a puzzle is loaded into the local database by hand.
- **The human's words (2026-10-21):**
  - "lets just make it so i can manually put in puzzle for each day for now"
  - then "all i do is type the questions. u should generwte answer bank based off the quesitons"
  - and, for who generates them: "just for the mvp, lets do “b”. im fine with more manual work until everytjing is finished". Option b was a Claude session, not the app calling an AI service.

## The human's answers (2026-10-21)
| What | Answer |
|---|---|
| Who generates the answer lists | A Claude session, for the MVP ("b"). The app makes no AI calls, and no API key is needed. Automatic generation in the app stays under ROADMAP Later. |
| Who picks the host's answers | "ai suggests": the session suggests them, and the human can change them on the review page. |
| Does each day need the human's OK before it goes live | "yes" |
| Puzzles move from files into the database, and the admin page may write them | "yes thats fine and admincan write changes thats fine" (a security change) |

## How a day is made (Claude's design, for the human to approve)
1. **The human writes the 7 questions** for a date. Where they're written is Q1 below.
2. **A Claude session drafts the day** following the drafting steps (the "Puzzle drafting" row added to DECISIONS.md):
   - it writes the accepted answers, aliases, a host bank and suggested host answers, rising gently in difficulty (DECISIONS.md, Game 1);
   - it runs `npm run content:plurals` and `npm run content:letters`, which add the plurals and pick the stolen letters;
   - it runs `npm run content:validate`;
   - it opens a PR with the file at `content/offbeat/<date>.json`. CI validates it again, and the PR keeps the record in git.
3. **The PR is merged** and the site redeploys. It merges on green CI, as now.
4. **The human opens `/admin/puzzles`.** The page lists every drafted day that isn't live yet. For each one it shows:
   - the 7 questions, the answer lists, the suggested host answers and the stolen letters;
   - the host answers, which the human can change by picking from that question's list;
   - an **Approve** button.
5. **Approve** checks the day with the same rules (`src/content/puzzle.ts`) and writes it to `private.puzzle` through one guarded database function (below). Players get it on its date.

**A Claude session needs no password and no database access.** Everything it makes goes through git, and only the human's approval reaches the database.

**Claude's defaults, which the human didn't object to (2026-10-21):**
- **One way in:** the review page's Approve is the only way puzzles reach the database. `content:publish`, its `plor_publisher` login and policies, and the no-gaps rule are removed.
- **A guarded door:** the app's login `plor_app` can't write `private.puzzle`. It may only call `private.approve_puzzle(user, content)`, which:
  - checks the user is in `private.admin`;
  - refuses a day that has started;
  - runs with the table owner's rights and a fixed `search_path`, as the PostgreSQL docs advise for such functions.
- **Stolen letters** are picked by the existing picker. Changing the host answers on the review page re-checks them.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| Q1 | **Where the human writes the questions.** **(a)** In a message to a Claude session ("Oct 25: Name a fruit, …"), which then drafts the day: nothing to build. **(b)** On the admin page, which saves them and gives a "copy for Claude" button to paste into a session: more to build, and the questions are kept in one place. | (a), because it's the least to build, and the questions are kept in git with the drafted file anyway. | |

## Source
- `docs/DECISIONS.md`, Puzzle content format (format 2), Answer model, Game 1, Content publishing role, Row-level security in `private`.
- `docs/milestones/M00-data-design.md` §4: one row per day, frozen once its day starts (trigger OB004); §7: grants.
- `src/content/puzzle.ts`: the validator, the one set of content rules.
- `scripts/content-letters.ts`, `scripts/content-plurals.ts`, `scripts/content-validate.ts`: today's drafting steps.
- `docs/milestones/M03-puzzle-insights.md` D1: how admins are recognised (401 signed out, 403 not admin).
- `docs/milestones/M01-puzzle-content.md`: how days were drafted so far ("the M01 way").
- `docs/SOURCES.md`:
  - Next.js (App Router), for the page, the route handlers, and including the content files in the deployment (`outputFileTracingIncludes`; *unverified* until read in the bundled docs);
  - PostgreSQL 17, `CREATE FUNCTION`, "Writing SECURITY DEFINER Functions Safely";
  - Supabase database roles.

## Acceptance criteria
- [ ] **Drafting steps are written down** in DECISIONS.md, as a "Puzzle drafting" row a session follows: where the questions come from, what to generate, the commands, and the PR.
- [ ] **The review page.** `/admin/puzzles` lists drafted days that aren't live yet, from the content files in the deployment. It shows each day's questions, answer lists, suggested host answers and stolen letters. The human can change a question's host answers, and Approve saves the day. Days already live are listed read-only.
- [ ] **Who can use it.** Signed out gets 401 and a non-admin gets 403, on the page's data and on Approve (route tests).
- [ ] **Approve checks the same rules.** Changed host answers are re-checked with `src/content/puzzle.ts`, including the stolen letters. An error is shown next to its question, and nothing is saved (unit and route tests).
- [ ] **A started day can't change.** Approving a day that has started is refused with a clear message (database test; OB004).
- [ ] **Write access is only the guarded door.** pgTAP checks `plor_app`'s exact grants: it can't insert or update `private.puzzle` directly, and `private.approve_puzzle` refuses a non-admin.
- [ ] **End to end, locally.** The human gives 7 questions, and a session drafts the day and opens the PR. On the local stack, the admin approves it on the page and a second, non-admin account plays it to the result screen. Evidence: the PR, the saved row, and the run's rows.
- [ ] **Removes:**
  - `scripts/content-publish.ts`, its tests and its `package.json` entry;
  - the `plor_publisher` login, its grants and its policies (a migration; a security change, covered by the approval above);
  - the no-gaps rule;
  - the DECISIONS.md rows on publishing from files. DECISIONS gets the new rows, plus a Log entry.

## Out of scope
- The app generating answers itself (an AI call, an API key): under ROADMAP Later.
- Bigger answer lists from a large source, and difficulty tuning (M13).
- How the page looks (M14).
- Deleting a live day. A future day can be re-approved with changes, which covers mistakes.
- Applying the new migration to plor.app's database. That's done by hand when the human wants (DECISIONS.md, Database migrations).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 7 questions per day | Drafting and checks | `QUESTIONS_PER_DAY`, M01 (human, 2026-10-18) |
| Schedule A and the letter tiers | Stolen letters | `LETTER_SCHEDULE`, `LETTER_TIERS`, M04 G8 (human, 2026-10-21) |

No other numbers are needed. The page lists every drafted day that isn't live, rather than a fixed number of days ahead.

## Plan
1. The human answers Q1 and approves this ticket.
2. Write the "Puzzle drafting" steps. Move what Approve needs (re-checking changed host answers) into `src/content/`, with unit tests first.
3. Add the migration: `private.approve_puzzle`, plor_app's execute grant, and the removal of `plor_publisher`. pgTAP grant checks come with it.
4. Add the routes and the review page. Route tests cover 401, 403, a started day, and a rule error.
5. Run the end-to-end check, then the reviewer agent, then the PR, which updates this Status line, the ROADMAP row and `docs/HANDOFF.md`.

**Hypotheses:**
- **Step 4:** a content file can be read by a route in the deployed app when it's listed in `outputFileTracingIncludes`. If the deployed route can't find the files, the review page has to get the days some other way. Stop and re-plan.
- **Step 5:** an approved day plays exactly like one loaded by `content:publish`, because both store the same format-2 JSON in the same table. A difference means the stored JSON differs: compare the rows.

## Removes
See the last acceptance criterion.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
