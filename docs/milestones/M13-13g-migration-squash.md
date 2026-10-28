# M13 13g — The migration squash

**Status:** built, proven locally and reviewed twice (both reviews' blocking findings fixed), in review in PR #120; plor.app's rebuild follows the merge. Approved and in progress (the human, 2026-10-28: "ask all questions needed to do this right now, and then execute right away. u have permission to do everything").

## Goal
Fold `supabase/migrations`' 48 files into one baseline that builds exactly today's schema, then rebuild plor.app from it, closing M13.

## Who uses it / what breaks without it
- **Used by:** every reader of the SQL (one live copy of each function, by area), CI and every local stack (one file to apply), plor.app (rebuilt once, before players).
- **Breaks without it:** about 1,200 of 3,500 migration lines are function bodies a later file replaces (`approve_puzzle` six times); a reader must find the live copy, and each change re-copies 60 to 80 lines. `supabase/roles.sql` keeps two dead roles only so the old files run. Squashing gets harder once plor.app has players (the 2026-10-26 audit, DB-1).

## What the human decided
2026-10-26 (M13 ticket, "Decided later"): squash "When M13 ends"; rebuild plor.app's database once at a ship.

Round 1 (2026-10-28):
- plor.app's move to the baseline: **"Rebuild from scratch"** (not chosen: re-labelling its history and keeping the data).
- How the baseline is written: **"By hand, by area (Recommended)"**: sections by area, each function in its final form with its why-comments, proven identical to today's schema by a schema compare.
- Scope: **"Squash only (Recommended)"**: the repeated logic (membership, run progress, the reset time zone; the audit's DB-2 to DB-4) waits for its own tickets.
- The old roles: **"Drop them (Recommended)"**: the baseline creates `plor_app` directly; `riff_app` and `plor_publisher` leave `roles.sql` and the history test.

Round 2 (2026-10-28):
- When plor.app is rebuilt: **"Right after the merge (Recommended)"**.
- Who runs it: "ask all questions needed to do this right now, and then execute right away. u have permission to do everything".
- The proof: **"Schema compare + all suites (Recommended)"**.
- The rule after: **"Append-only again (Recommended)"**: a logged one-time exception; from the baseline on, applied migrations are never edited.

Round 3 (2026-10-28): a copy of plor.app's data before the wipe: **"No copy"**.

## Source
- Supabase CLI reference, `supabase db reset` (read 2026-10-28): "When running db reset with `--linked` … a SQL script is executed to identify and drop all user created entities in the remote database"; "any custom roles created through the dashboard or `supabase/roles.sql` will not be deleted by remote reset". Whether sign-ins (`auth` data) survive isn't stated: treated as lost.
- Supabase CLI reference, `supabase migration squash` (read 2026-10-28): it squashes local migrations into one file; "data manipulation statements … are omitted". The migrations' only data statements (`subset_values`' `update … fact_values`, `short_invite_codes`' two code updates) change existing rows and do nothing on a fresh database.
- DECISIONS.md: Database migrations (append-only; this squash is its logged exception), App database role.

## Design
1. **The baseline**, `supabase/migrations/<timestamp>_baseline.sql`: the final schema, from the CLI's dump of a stack built by the 48 files as raw material (so nothing is missed), sorted by hand into areas (roles and defaults; accounts and profiles; friends and groups; games, runs and the ledger; comments and reactions; the answer base and loading; categories, misses and the audit; puzzles and approval; realtime), each function's and table's why-comment carried over from the migration that last defined it.
2. **The 48 files go**; `roles.sql` creates `plor_app` only; the pgTAP history checks of `riff_app` and `plor_publisher` go.
3. **The proof:** a fresh local stack from the 48 files and one from the baseline; both schemas dumped (`pg_dump --schema-only` of the schemas the migrations touch) and compared, identical but for comment text; then every suite on the baseline.
4. **DECISIONS.md:** the Database migrations row gains the exception; a Log row records it.
5. **After the merge:** `supabase db reset --linked` rebuilds plor.app from the baseline; `migration list --linked` shows the one; `test db --linked` passes; the human signs out of plor.app (or clears its cookies), signs up again, and their account is made an admin (an insert into `private.admin` as `postgres`). Signing out first matters because `getClaims()` checks a token's signature without asking Auth (`src/lib/auth.ts`), so a browser still holding a valid token for the wiped account would look signed in while every write for it fails on the `auth.users` foreign key, until the token expires (13g review).

## Acceptance criteria
- [x] The schema compare: identical, with the command and its output.
- [x] Every suite passes on the baseline (pgTAP, `test:db`, `npm test`, e2e); `load all`, `check-bank` 0, `simulate` 30 of 30.
- [x] One migration file; `roles.sql`'s code and the tests name no old role (`roles.sql`'s comment tells the history); no code or test comment cites a squashed file.
- [ ] plor.app rebuilt: one migration listed, hosted tests pass.

## Out of scope
- Folding the repeated logic (DB-2 to DB-4), its own tickets.

## Numbers
None.

## Plan
1. Build the baseline and prove it locally; review; PR; merge on green CI.
2. Rebuild plor.app; check it; the human's admin row once they sign up.

## Removes
- The 48 migration files, the old roles in `roles.sql`, their history test, `plor_app_role.test.sql`'s rename checks.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Design 1: the final schema from the CLI's dump, sorted by hand | Generated from the 48 files' own statements (a script, removed after: each object's last definition with its comment, sorted by area), the CLI's dump only a check | The CLI's dump leaves out what the migrations set outside `private` and `public`: the realtime board policy, two database-level revokes and a default privilege; and its machine text drops every comment |
| Design 1: areas | Tables by area, then functions by area; the view, the table and view privileges (in the order the migrations gave them, as a "revoke all" after a grant undoes it), triggers and policies after them | A table's privileges can name the view, and a function's body can name a table; this order builds without forward references |
| Design 3: compare all but comment text | The snapshot covers `pg_dump --schema-only` of `private` and `public` (function bodies, comments inside them included) and the database, schema and default privileges, the realtime policies, the publication and the roles; only pg_dump's random `\restrict` token lines are left out | Comments outside function bodies aren't in a dump; inside them they matched too |
| Design 1: "each function's and table's why-comment carried over from the migration that last defined it" | Every definition's comment, first to last, separated by an empty comment line; file names of squashed migrations become "the … migration (git history, before the squash)"; 24 sentences rewritten or dropped, each listed in the generator and checked used: a migration's own mechanics ("No grant changes", "create or replace keeps the grants", "a collision fails the migration"), and what an earlier definition said that a later one made false (the first timer's start rule, the day ending a run, an approval still awaited, `scripts/content-publish.ts`, the renamed `M13-game-mechanics.md`); 19 comment lines run past 120 characters (the 48 files had 14), mostly where a file name was replaced, left so (style only) | The last definition's comment alone was often a delta ("As 13b's, …") or nothing: 58 of 219 comment blocks were lost and six functions had no comment (13g review, blocking 1); keeping them all brought back earlier text later definitions had overruled (second review, blocking). After the merge the file can't be edited, so this was the one chance |
| (no source) | Every code, script and test comment citing a migration file cites the baseline; DECISIONS.md's App database role row no longer says `roles.sql` first created `riff_app` | The files are gone; their history is in git (13g review, blocking 2 and non-blocking 1) |

## Evidence
On the Windows PC, 2026-10-28 (UTC).
- **The compare:** a stack built from the 48 files (as it stood, `migration list` 48) and a fresh one from the baseline (`npx supabase db reset --local`, `Applying migration 20261028140000_baseline.sql`), each snapshotted (`pg_dump --schema-only --no-owner --schema=private --schema=public`, plus the database, schema and default privileges, `pg_policies` on realtime, `pg_publication_tables`, the roles). Without the token lines: `4334` lines each, `diff` exit 0, sha256 `c9d06460b4c76426…` both. On the way: the first build failed on a constraint naming a later table, then on a policy of the dropped `puzzle_questions`; the first compare differed by two grants (`approve_puzzle`'s, shared in one statement with the dropped `save_questions`; `run_status`'s, moved out of order); each fixed in the generator before the compare above.
- **The CLI's dump** (`supabase migration squash --local`, its output kept aside, the 48 files restored by `git checkout`): 49 functions, as the database holds; it leaves out `board_own_topic_select` on `realtime.messages`, `revoke usage on schema public`, `revoke temporary on database` and the default privilege, which the baseline holds.
- **Suites on the baseline:** `npx supabase test db` 31 files, 508 PASS (17 → 15 in `plor_app_role.test.sql`, its two old-role checks gone); `npm run base -- load all` `DEFINED 231 categories`, `DATABASE 316 MB`, 91 s; `npm run test:db` 42 files, 280 passed; `npm test` 43 files, 458 passed; tsc clean.
- **After the two reviews' comment fixes** (every definition's comments kept, 24 sentences corrected; the generator asserts each correction was used; the second fix changed 35 lines, every one a `--` comment line): the baseline is 3,093 lines; `npx supabase db reset --local` from it, snapshotted again (after each fix, the same result): `diff` against the 48 files' snapshot exit 0, `grep -Ev '^.(un)?restrict ' <file> | sha256sum` `c9d06460b4c76426…` both, the same as the first compare. Then `npx supabase test db` 31 files, 508 PASS; `npm run base -- load all` `DEFINED 231 categories`, `RENAMED 2 things to the names the files give`, `DATABASE 317 MB`; `npm run test:db` 42 files, 280 passed; `npm test` 43 files, 458 passed; `tsc --noEmit` clean.
- **On the first baseline, the same schema:** `check-bank` `CHECKED 231 questions: 0 problems`; `simulate` `DRAFTED 30 of 30`, output identical to 13f-4a's; e2e `61 passed (4.5m)`.
