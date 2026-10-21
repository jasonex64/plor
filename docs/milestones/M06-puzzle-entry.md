# M06 — Puzzle entry

**Status:** planned (ticket drafted 2026-10-21, waiting for the human's approval and the decisions below)

## Goal
The human can type in a day's Offbeat puzzle on an admin page, save it, and have players play it that day, without editing files or running commands.

## Who uses it / what breaks without it
- **Used by:** the human, every day, to put in the next puzzles. Players use it indirectly: they get a puzzle every day.
- **Breaks without it:**
  - No real day can be played. Puzzles are JSON files loaded by `npm run content:publish`. No file covers any date before 2026-10-26, and the publish script refuses any set of dates with gaps; 7 days are parked.
  - Every later milestone needs a puzzle for today: friends' live board (M07), comments (M08), points (M09). Today a puzzle is loaded into the local database by hand.
  - The human asked for this (2026-10-21): "lets just make it so i can manually put in puzzle for each day for now. have a way to keep the data and analyze it, work on that in the future after we have the game out and some smaple data". The human chose "Admin page form" and "First, before friends".

## Source
- `docs/DECISIONS.md`, Puzzle content format (format 2), Answer model, Game 1, Content publishing role, Row-level security in `private`.
- `docs/milestones/M00-data-design.md` §4: one row per day in `private.puzzle`, frozen once its day starts (trigger OB004); §7: grants.
- `src/content/puzzle.ts`: the validator, the one set of content rules. The form uses the same checks, not a copy.
- `scripts/content-letters.ts` (`pickLetters`) and `scripts/content-plurals.ts` (`expectedPlural`): today's authoring steps, which the form runs on save.
- `docs/milestones/M03-puzzle-insights.md` D1: how admins are recognised (`private.admin`, 401 signed out, 403 not admin).
- `docs/SOURCES.md`:
  - Next.js (App Router), for the page and the route handler.
  - PostgreSQL 17, `CREATE FUNCTION`, "Writing SECURITY DEFINER Functions Safely", for decision P2 option (b).
  - Supabase database roles, for the grants.

## Already approved by the human (2026-10-21)
"yes thats fine and admincan write changes thats fine", in answer to two points:
- Puzzles move from files in the repo into the database.
- The admin page may write puzzles, which is a security change.

The exact grant design is decision P2 below, and it's recorded in DECISIONS.md when it's built.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| P1 | **Where puzzles live from now on.** **(a)** The database only: the form is the one way in. `content:publish`, the `plor_publisher` login and its policies, and the no-gaps rule are removed. The drafted files stay in the repo as material to paste from (P4). **(b)** Keep both the files with `content:publish` and the form. | (a), because DECISIONS.md allows one way to do each thing. The no-gaps rule only made sense for publishing a batch of files. | |
| P2 | **How the admin page gets write access** (a security change). **(a)** The app's login `plor_app` gets insert and update on `private.puzzle`, and the route checks that the user is an admin. **(b)** `plor_app` gets no write access to the table. It may only call one database function, `private.save_puzzle(user, date, content)`. The function itself checks the user is in `private.admin` and refuses a day that has started. It runs with the table owner's rights, with a fixed `search_path`, as the PostgreSQL docs advise. | (b). A bug in any other route then can't write puzzles, and the admin check lives in the database as well as in the route. | |
| P3 | **How answers are typed.** **(a)** One box per question, one answer per line, with a small mark-up (example below). **(b)** A row per answer with separate fields. A day has about 400 answers (the 2026-10-26 draft has 415), so this means a lot of clicking. | (a). The page shows a preview of how it was read (answers, plurals added, host answers, stolen letter) before saving. | |
| P4 | **The 29 drafted days** (21 in `content/`, 8 parked; their dates are only drafts). | Keep them in the repo, unscheduled. The form has a "paste a JSON file" box that fills it from one, so the human can start from a draft and edit. Nothing is put on the calendar unless the human saves it. | |

**P3 (a), the mark-up**, as Claude drafted it:
```
* Texas | TX          ← "*" = a host answer
+ California | CA     ← "+" = a common answer (host bank; the insights report uses it)
New York | NY, NYC    ← an answer, then its other spellings after "|"
```
- Each answer's ID is made from its name.
- Plurals are added automatically, as `content:plurals` does today, and shown in the preview. `name || plural` overrides a wrong plural.
- Match groups (rare) get an optional extra box per question.

**Default unless the human objects:** the stolen letters are picked automatically on save by today's picker (`pickLetters`, schedule A). They're shown in the preview, and the human can override each one. The validator still checks them.

## Acceptance criteria
- [ ] **The page.** `/admin/puzzles` lists the next days and shows which ones have a puzzle. A day can be opened to type a new puzzle or edit one that hasn't started. A day that has started opens read-only.
- [ ] **Who can use it.** Signed out gets 401 and a non-admin gets 403, on both the page's data and the save route (route tests).
- [ ] **Saving checks the same rules.** It parses the form, adds plurals, picks letters where none are set, and runs `src/content/puzzle.ts`'s checks. Any error is shown next to its question and nothing is saved. A valid puzzle is stored in `private.puzzle`. Unit tests cover the mark-up parser: host and common marks, alternative spellings, plural override, an empty line, a duplicate name.
- [ ] **A started day can't change.** Saving a day that has started is refused with a clear message (database test; the trigger raises OB004).
- [ ] **Write access is only what P2 allows.** pgTAP checks `plor_app`'s exact grants. With (b), `plor_app` can't insert or update `private.puzzle` directly, and the function refuses a non-admin.
- [ ] **Paste a JSON file.** Pasting a drafted file (P4) fills the form, and saving it under a different date works.
- [ ] **End to end, locally.** On the local stack, an admin types in a puzzle for today, saves it, and a second, non-admin account plays it to the result screen. Evidence: the saved row, and the run's rows.
- [ ] **Removes** (if P1 is (a)):
  - `scripts/content-publish.ts`, its tests and its `package.json` entry;
  - the `plor_publisher` login, its grants and its policies (a migration; a security change, covered by the approval above);
  - the no-gaps rule;
  - the DECISIONS.md rows that describe publishing from files.
- [ ] DECISIONS.md: the Puzzle content format row says where puzzles live, the Content publishing role row is replaced, and a Log entry is added.

## Out of scope
- Generating puzzles, AI drafting, and analysis beyond today's insights page: under ROADMAP Later.
- Bigger answer lists and difficulty tuning (M13).
- How the page looks (M14).
- Deleting a saved day: a future day can be overwritten, which covers mistakes.
- Applying the new migration to plor.app's database. That's done by hand when the human wants (DECISIONS.md, Database migrations).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 7 questions per day | The form's question boxes | `QUESTIONS_PER_DAY`, M01 (human, 2026-10-18) |
| Schedule A and the letter tiers | Picking and checking stolen letters | `LETTER_SCHEDULE`, `LETTER_TIERS`, M04 G8 (human, 2026-10-21) |
| How many upcoming days the list shows | `/admin/puzzles` | **Human number, needed before code** |

## Plan
1. The human answers P1 to P4 and the number above, and approves this ticket.
2. Move the authoring steps that save needs (plurals, letters, the checks) into `src/content/` so the route and any script share them. The mark-up parser comes with its unit tests first.
3. Add the migration for P2 and, with P1 (a), the removal of `plor_publisher`. pgTAP grant checks come with it.
4. Add the save route and the page. The route tests cover 401, 403, a refused started day, and a validation error.
5. Run the local end-to-end check, then the reviewer agent, then one PR that updates this Status line, the ROADMAP row and `docs/HANDOFF.md`.

*Hypothesis for step 5:* a puzzle saved for today through the form plays exactly like one loaded by `content:publish`, because both store the same format-2 JSON in the same table. If the game screen behaves differently, the saved JSON differs from a file's: compare the two rows.

## Removes
See the last acceptance criterion. Without P1 (a), nothing is removed. The reason would be that the human chose to keep two ways in.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
