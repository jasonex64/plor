# M15 15d — Ship on your word

**Status:** dropped (the human, 2026-11-13: "Drop it"; `main` keeps publishing on every merge). Kept as a record on `process-parallel-sessions` (the human, 2026-11-16: "Commit it as dropped (Recommended)"); its half-built code went with `RIFF-m15`'s discarded edits ("Discard them"). Earlier: in progress (2026-10-26). Approved by the human (2026-10-26: "Approved as drafted: commit the IDs, add the vercel logs page to SOURCES.md, and build 15d on the M15 branch"). Built ahead of the rest of M15 (S8), while M14 carries on in parallel (S9).

## Goal
When the human says "ship it", a Claude session runs one command that pushes the pending migrations to the hosted database, deploys `origin/main` to plor.app and checks its health; plor.app never deploys on its own.

## Who uses it / what breaks without it
- **Used by:** the human, who says when; Claude sessions, which run `npm run ship` and read plor.app's logs with `npx vercel logs`.
- **Breaks without it:**
  - **Code ahead of its schema.** Every merge to `main` deploys its code on Vercel at once, while the database waits for the human's `db push` (HANDOFF.md, 2026-10-24, "the hosted database is behind again"). A merged migration's code runs on plor.app against a schema that doesn't have it.
  - **The human at a terminal.** `db push` needs the human, the database password and a clean checkout of `main` (HANDOFF.md: "never a checkout with another session's uncommitted migrations").
  - **No logs without the dashboard.** No Vercel CLI is installed, so a session can't read plor.app's runtime logs.

## Source
- **Supabase migrations** (SOURCES.md): `supabase login`, `supabase link`, `supabase db push`.
- **Supabase CLI** (SOURCES.md), 2.121.0: `npx supabase db push --help` lists `--linked`, `--dry-run` and `--password`. The password's environment variable `SUPABASE_DB_PASSWORD` is read from the CLI's own executable (`node_modules/@supabase/cli-windows-x64/bin/supabase-go.exe` holds `env:"db.password,default=SUPABASE_DB_PASSWORD"`; `supabase.exe` holds "setting the env var correctly: SUPABASE_DB_PASSWORD"), not from a docs page: *unverified* until the first ship.
- **Vercel CLI deploy** (SOURCES.md, added 2026-10-26): `vercel deploy --prod` deploys to the production domains; stdout is the deployment URL; a non-zero exit is an error.
- **Vercel CLI project linking** (SOURCES.md, added 2026-10-26): `.vercel/project.json` holds the `orgId` and `projectId`.
- **Vercel Git configuration** (SOURCES.md, added 2026-10-26): `git.deploymentEnabled` with `{ "main": false }` stops commits to `main` deploying; unspecified branches stay `true`.
- **Vercel CLI logs** (SOURCES.md, added 2026-10-26): `vercel logs --environment production --since 1h`.
- **DECISIONS.md:** Task runner (npm scripts), Dependency lockfile (`npm run lockfile`), Database migrations (changed by this ticket).

## Decisions (human, 2026-10-26, from Claude's guided questions)
| # | Decision | Answer |
|---|---|---|
| S1 | What to automate | Hosted DB migrations, deploys to plor.app, checking prod and logs ("Hosted DB migrations, Deploys to plor.app, Checking prod/logs"); not new-worktree setup |
| S2 | Hosted secrets | **Loosened** ("Loosen it"): beyond Vercel and the password manager, the human's CLI logins on this PC and a Windows user variable for the database password ("Windows user variable"). No GitHub secrets and no `vercel env pull` (no preference given; neither is needed when nothing ships from CI) |
| S3 | Who runs it | **Claude, on the human's word** ("Just tell me") |
| S4 | When migrations run | **When the human says** ("When you say"), not on merge |
| S5 | Order | **Migrate, then deploy** ("Migrate, then deploy") |
| S6 | Deploys | **Ship on your word** ("Ship on your word"): `main`'s auto-deploy off |
| S7 | PR previews | **Kept** ("Keep previews") |
| S8 | Timing and place | **Now** ("Now, before M14 continues"), **as M15 15d** ("M15, as 15d") |
| S9 | The M14 session | **Keeps running** ("Keep it running") |
| S10 | First ship | **Ship once as proof** ("Ship once as proof"): pushes every pending migration and `main` to plor.app before launch |
| S11 | Vercel CLI version | **65.2.0** ("65.2.0 (latest)") |
| S12 | IDs | **Committed** ("commit the IDs"): the Supabase project ref and the Vercel org and project IDs aren't secrets |

## Acceptance criteria
- [ ] `vercel` 65.2.0 is a dev dependency, and `npm run lockfile -- check` passes.
- [ ] `vercel.json` has `"git": { "deploymentEnabled": { "main": false } }`; after this PR merges, its merge commit gets no production deployment (`npx vercel ls`), and this PR got a preview (its Vercel check).
- [ ] `npm run ship` refuses unless every check on `origin/main`'s head has passed (`scripts/ship.test.ts`).
- [ ] **The first ship (S10):** `npm run ship` exits 0; `npx supabase migration list --linked` shows no migration missing on the remote; the production deployment is `origin/main`'s head; `npm run status -- https://plor.app` prints `UP`.
- [ ] `npx vercel logs --environment production --since 1h` prints plor.app's logs.
- [ ] DECISIONS.md's migrations row and CLAUDE.md's secrets rule say the new way, with a Log entry for the security change.

## Out of scope
- New-worktree setup (`.env.local`, `npm ci`): not chosen (S1).
- Migrations or deploys from CI, GitHub secrets, `vercel env pull` (S2, S4).
- Staging: plor.app is the only hosted environment.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| `65.2.0` | The Vercel CLI's pinned version | Human, 2026-10-26 (S11); the latest release, 2026-10-22 (`npm view vercel time`) |
| `https://plor.app` | The health check after deploying | DECISIONS.md, Next.js hosting (production domain) |

## Plan
1. Sources, decisions and rules first: SOURCES.md rows, DECISIONS.md's migrations row and a Log entry, CLAUDE.md's secrets rule, ROADMAP's M15 row.
2. `vercel@65.2.0` in `devDependencies`, then `npm run lockfile -- update`.
3. `vercel.json`: `git.deploymentEnabled` off for `main`.
4. `scripts/ship.ts` (`npm run ship`), each step stopping the ship on failure, none retried:
   1. `git fetch`; every check run on `origin/main`'s head is `completed` and `success` (`gh api`), and there is at least one.
   2. `SUPABASE_DB_PASSWORD` is set (its value is never printed).
   3. A temporary detached worktree of `origin/main`, with `.vercel/project.json` written from the committed IDs.
   4. `supabase link --project-ref <ref>`, `supabase db push --linked --dry-run` (printed), then `supabase db push --linked`.
   5. `vercel deploy --prod --cwd <worktree>`.
   6. `checkStatus("https://plor.app")` from `scripts/status.ts`.
   7. The temporary worktree is removed whatever happened.
   - *Hypothesis:* the first run pushes every migration after `20261026054153` that the hosted database lacks and deploys `main`.
   - *Disproved* if `db push` asks for a password with `SUPABASE_DB_PASSWORD` set (the variable name is wrong), or `vercel deploy` asks to link (the written `project.json` isn't enough).
5. The human's one-time setup: `npx vercel login`, `npx supabase login`, and `SUPABASE_DB_PASSWORD` as a Windows user variable. Then Claude reads the Vercel IDs from `npx vercel link` and commits them.
6. Review, PR, merge on green CI, then the first ship on the human's word.

## Removes
- **Vercel's auto-deploy of `main`** (`vercel.json`).
- **"The hosted database gets them when a human runs `npx supabase db push`"** in DECISIONS.md, and the HANDOFF's hosted-command instructions that go with it.
- **The old secrets wording** in CLAUDE.md ("live only in Vercel env vars and the human's password manager").

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
