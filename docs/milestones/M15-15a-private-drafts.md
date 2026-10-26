# M15 15a — Puzzle drafts out of the public repo

**Status:** planned: P1–P5 answered (human, 2026-10-24, in guided questions). Moved from M13 (it was 13a) to M15 by P4 (b). Before building, the design and criteria are rewritten for format 3 (below); no code yet, and no new milestone starts while M13 and M14 are in progress (human, 2026-10-24: "Nothing new yet").

**Audit proposals (2026-10-26, not approved):** `docs/audits/2026-10-26-codebase-audit.md`, "M15": the question bank and drafting history have no private home in this design, the flow cites retired scripts, and drafting's pause is missing from DECISIONS.

**Since M13 (2026-10-24):** 13a-2 retired format 2 and its drafts. The tree holds one drafted day, the T1 day `content/offbeat/2026-10-24.json` (format 3), written by `npm run draft` (DECISIONS.md, Puzzle drafting). So the design below changes in three places when it's rewritten: `npm run draft` writes into the git-ignored folder; the upload checks a format-3 file with the format-3 validator; and the fixtures are M13's (`src/test/answer-fixture.ts`), not the old sample day.

## Goal
A drafted day's answers are never in the public repo: drafts live in the database, readable only by admins, until the human approves the day.

## Who uses it / what breaks without it
- **Used by:**
  - the human, who drafts each day with a Claude session and approves it on `/admin/puzzles` (M06);
  - every player, whose day is only a game if they can't read its host answers first.
- **Breaks without it:**
  - The repo went public on 2026-10-23 (DECISIONS.md Log). Today a drafted day is a JSON file in `content/offbeat`, committed by the drafting session (DECISIONS.md, "Puzzle drafting"). So anyone can read a day's host answers, and its whole host bank, before the day is played. The closed beta (M15) is the first time players who aren't the human play.
  - Every day drafted from now on is public the moment its PR opens. That includes the four replacement questions waiting on the human.
- **The human's words:** "draft a ticket to move puzzle drafts out of the public repo before the beta" (2026-10-23).

## Claude's design (for the human to approve)
- **Where drafts live (P1).** A new table, `private.puzzle_draft (game_id, puzzle_date, content jsonb, uploaded_by, uploaded_at)`, one row per day. Like `private.puzzle`, it's written only through a guarded function, `private.save_draft(user, content)`, which checks the caller is an admin, as `save_questions` and `approve_puzzle` do (M06). `plor_app` may execute it and read the table; nothing else. That is a security change, recorded in DECISIONS.md.
- **How a draft gets there.** The drafting session still writes `<date>.json`, but into a folder git ignores (`drafts/offbeat/`), and still runs `content:plurals`, `content:letters` and `content:validate` on it. The human then uploads the file on `/admin/puzzles`. The server checks it with the same validator (`checkPuzzleFile`) and saves it with `save_draft`. Claude never needs a hosted credential, and nothing reaches git.
- **What reads drafts.** `readDrafts()` reads the table instead of the folder, so the page, approval (`approve_puzzle`) and the insights report are unchanged. `next.config.ts` stops shipping `content/offbeat` to the admin routes.
- **Test fixtures.** Eight files read `content/offbeat/2026-10-26.json` as a sample day (`src/test/puzzles.ts`, `e2e/puzzle.ts`, and six tests), and `scripts/survey-score.ts` reads the survey's three days. The sample moves to one fixture under `src/test/` made from 2026-10-22, the day already played, so no unplayed day's answers stay in the tree. Whether every test passes on that day instead is *unverified* until it's built. The survey scorer already fails on a parked day (ROADMAP "Next revision") and stays as it is.
- **What happens to the repo's files (P2, P3).** The 21 drafted days, 9 parked days and 1 rehearsal day leave the tree, and the days still worth playing are uploaded through the new page. Their answers stay readable in git history forever, whatever this ticket does, so P2 decides what to do about that.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| P1 | **Where drafts live.** (a) **The database**, admin-only, uploaded on the admin page (above). (b) A second, private GitHub repo for content, pulled into each deployment: Vercel and CI would need a token for it (a new secret), and drafts would still be committed. (c) Encrypted files in this repo: the key would have to reach every drafting session (a secret in an agent's hands; CLAUDE.md, Security) | (a). No new secret; admins are already the only readers of approved days before they start; one copy instead of a file plus a row | **(a), the database, admin-only** (human, 2026-10-24: "Database, admin-only (Recommended)", after Claude listed each option's upsides and downsides). Storage plays no part: a draft is a few KB (Claude's measurement, 2026-10-24) |
| P2 | **The 31 days already public in history** (2026-10-26 to 11-22, the parked and rehearsal days). (a) Treat their answers as spoiled: before each is approved, the human picks host answers different from the committed ones where the host bank allows, or drops the day. (b) Accept: beta players are friends who won't go looking. (c) Draft them all again from new questions | (a) for days played in the beta, since the host answers are what a reader would learn; a wider host bank is M13's work anyway | **Moot, dropped** (human, 2026-10-24: "Moot: drop P2 (Recommended)"). The 31 days are format 2, which M13 13a-2 retired, so they can't be played; a question reused later gets new host answers through drafting |
| P3 | **Moving the drafts that are kept.** (a) The human uploads each file on the admin page (the same path as every future day; the page takes several files at once). (b) A one-off script the human runs with an admin database URL from their password manager | (a). One way in (CLAUDE.md, "One way to do each thing"), and no hosted credential on the machine | **The T1 day is deleted with 15a; nothing else is moved** (human, 2026-10-24: "Delete it with 15a (Recommended)"). It was M13's test day and its date is past by then; every future day goes through the upload |
| P4 | **Where this ticket goes.** (a) **13a**, the first sub-ticket of M13 (answer lists and content), right after M12, since M13 reworks the content pipeline and comes before the beta (M15). (b) A sub-ticket of M15. (c) Now, before 12d | (a). Nothing drafted lands in public between M12 and it if drafting pauses until then; until it ships, new days are drafted only when the human accepts them going public | **(b), M15's first sub-ticket** (human, 2026-10-23: "u can close and start the ticket", accepting Claude's revised order: plor.app needn't be playable before launch, so drafting the beta's days and moving drafts out come right before the beta, after M13 changes the content format and M14) |
| P5 | **Drafting until it ships.** (a) Pause drafting new days. (b) Keep drafting into the repo, accepting those days are public | (a). The four replacement questions (11-06, 11-10, 11-16) wait for this ticket | **(a), pause drafting new days until 15a ships** (human, 2026-10-24: "Pause drafting") |

## Source
- DECISIONS.md: "Puzzle drafting" (steps 1–5, rewritten by this ticket), "Puzzle content format", "Row-level security in `private`", "App database role", Log (the repo went public, 2026-10-23).
- `docs/milestones/M06-puzzle-entry.md`: the admin page, `save_questions` and `approve_puzzle` (the guarded-function pattern this reuses).
- PostgreSQL 17 (SOURCES.md): `jsonb`, `SECURITY DEFINER` functions, grants.
- Next.js 16.4.2 (SOURCES.md, bundled docs): route handlers reading a request body; `outputFileTracingIncludes` in `next.config.ts`. Whether a route handler caps an uploaded body's size is *unverified*: plan step 1 reads it.
- No source covers what a public git history keeps. It keeps every committed file, which is how git works; P2 rests on that.

## Acceptance criteria
Written once P1–P5 are answered. They will cover: the table and function (pgTAP, grants list), the upload route (an admin's valid file saved, an invalid one refused with the validator's errors, a non-admin 403), `readDrafts` reading the table (db test), the fixtures moved (`git grep content/offbeat` finds nothing in `src`, `e2e` or `scripts`), and no drafted day left in the tree (`git ls-files content content-parked content-rehearsal` empty).

## Out of scope
- Rewriting git history to remove the old files. It can't make them private again: copies may exist anywhere the public repo was cloned or cached.
- Automatic drafting and approval (ROADMAP Later), and answer lists (M13).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Largest draft file the upload accepts | The upload route | *Ask the human after plan step 1, if Next.js has no cap of its own.* Today's largest drafted file is the measure to start from |

## Plan
1. Read what the bundled Next.js docs say about a route handler's request body size. Expected: no documented cap for route handlers (Server Actions have their own). If one exists and is below the largest draft, stop and ask.
2. Once P1–P5 are answered: write the criteria, then build on the M15 branch, tests first: the migration and pgTAP, then the upload route and `readDrafts`, then the page, then the fixtures, then removing the folders and rewriting DECISIONS.md "Puzzle drafting".
3. The human uploads the kept days on the hosted admin page after the next `db push` (P3).

## Removes
- `content/offbeat/`, `content-parked/`, `content-rehearsal/` from the tree (kept days move to the database).
- `next.config.ts`'s `outputFileTracingIncludes` for the admin puzzle routes.
- The file-reading half of `readDrafts`.
- CI's `content:validate` runs over the repo's content folders (the upload route validates instead; `content:validate` stays for the drafting session's local file).
- DECISIONS.md "Puzzle drafting": the `content-<date>` branch and PR per day.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
