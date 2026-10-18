# M00 — Foundations

**Status:** in progress

**Progress (2026-10-17):** stack A chosen and its sources pinned. Tooling rows and data design revision 4 approved by a human. Repo initialized in the RIFF folder: the docs are committed on `main`, and the scaffold is on branch `m00-foundations`. Scaffold done: Next.js 16.4.2, Vitest, the status script with tests, `/api/health`, Supabase CLI config and the CI workflow. Lint, tests and build pass locally, and the status script has been checked up and down against a real running server.
**Toolchain (checked 2026-10-17):** Node v24.11.0, npm 11.6.1, Git 2.56.0 and Docker 29.8.2 are installed. **The Docker Desktop engine fails to start** ("Docker Desktop is unable to start"). The hypervisor is present, but WSL has no `docker-desktop` distro, which blocks `supabase start`.
**Done since:** `.env.local` set up by the human (`DATABASE_URL`, plus Supabase's CA added by Claude from the downloaded certificate, which was then deleted). The staging database is verified with TLS.
**Blocked on the human:**
- getting the Docker engine running
- `supabase login`, then creating or linking the hosted Supabase project (the region is permanent, so a human picks it)
- `vercel login`, then linking the project (the Pro plan; set the function region to match Supabase)
- a GitHub remote so CI can actually run

## Goal
Make the decisions every later milestone depends on, and prove the toolchain works end to end with a deploy to staging.

## Who uses it / what breaks without it
- Used by: every agent and every later milestone.
- Breaks without it: agents choose their own stack, logger and error style, so the code ends up with several ways of doing each thing. The hard-to-reverse formats (run events, ledger, content, identity) get decided by accident in M01–M02 and need migrations later.

## Source
None yet. Choosing and pinning sources is part of this milestone. Each stack choice gets a SOURCES.md entry (official docs, version pinned) **before** it's recorded in DECISIONS.md.

## Acceptance criteria
- [x] Every `TBD` row in DECISIONS.md "Current" is filled in, with a reason and a source. *(Approved on 2026-10-17. Exception: the exact regions are still for a human to pick.)*
- [x] Every row in DECISIONS.md "Hard to reverse" is filled in and has been reviewed by the `reviewer` agent and approved by a human. *(2 reviews, revision 4 approved on 2026-10-17)*
- [x] The "proposed" items in DECISIONS.md (client platform, sudden death, fixed sequence) are confirmed or replaced by a human.
- [ ] The repo has a single task runner entry point. `<runner> test` runs one real test and passes, and CI runs the same command. *(Local part done. CI is written but hasn't run, because there's no GitHub remote yet.)*
- [ ] A hello-world client and server are deployed to staging and reachable at a recorded URL.
- [ ] `scripts/status` checks the staging deployment, exits non-zero when it's down, and its output is pasted as evidence for both the up and down cases.
- [ ] The debug procedure in DECISIONS.md has been followed once against staging, and the output is in Evidence.

## Out of scope
Any game logic, content format implementation, accounts or UI beyond hello-world.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Daily reset time and timezone rule | Day boundary decision | Midnight `America/Los_Angeles`, following DST (human, 2026-10-17) |
| Rough expected concurrent players at reset (for launch) | Supabase plan and spend-cap choice (the realtime limits are in the stack comparison) | _human_ |

## Plan
1. The human picks the stack. A comparison and recommendation are in `M00-stack-comparison.md`. Once a stack is picked, pin its sources in SOURCES.md.
2. Fill in DECISIONS.md "Current".
3. Draft the hard-to-reverse designs, run them past the reviewer, and get human sign-off.
4. Scaffold the repo, task runner, one test and CI.
5. Deploy to staging, then write and run `scripts/status`.

## Removes
From the `create-next-app@16.4.2` scaffold: the demo page and its CSS module, five template SVGs, the Google fonts (Geist), the boilerplate README, and the template `.gitignore` (merged into ours). None of them had a caller.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The `create-next-app` defaults include an `AGENTS.md` that tells agents to read `node_modules/next/dist/docs/` | Kept the file, but didn't adopt it as a rule | Agent rules live only in CLAUDE.md. Whether the bundled docs become a pinned source is a human decision. |
| DECISIONS.md: `npm run status -- <env>` | `npm run status -- <base-url>` | No environment URLs exist yet, so a name-to-URL mapping would have no caller. Revisit when staging exists. |
| DECISIONS.md: env validation "throws at startup" | `register()` throws, but `next start` keeps listening and returns 500s | That's how Next.js handles a failing instrumentation hook. It's still loud. Logged in Next revision. |
| Supabase: `verify-full` recommended | `ssl: { ca }` from `DATABASE_CA_CERT`, any remote host | Follows the source. Local stack has no TLS, so no CA is needed there. |

## Evidence
Commands and their output, from 2026-10-17 on Windows 11 with Node v24.11.0:
```
$ npm run lint                      -> exit 0
$ npx vitest run                    -> Test Files 1 passed (1), Tests 5 passed (5), 283ms
$ npm run build                     -> exit 0
    / (Static), /api/health (Dynamic: connection() keeps health off the prerender path)
$ npx next start -p 3100 & npm run -s status -- http://127.0.0.1:3100
    UP http://127.0.0.1:3100 (protocol 1)                                        exit=0
$ (server stopped) npm run -s status -- http://127.0.0.1:3100
    DOWN http://127.0.0.1:3100: unreachable: http://127.0.0.1:3100/api/health (fetch failed)  exit=1
$ npm run -s status                 -> usage message, exit=2
```
Database access (2026-10-17, the local Supabase stack on Docker Desktop 29.8.2):
```
$ npm test                          -> Test Files 2 passed (2), Tests 13 passed (13)   (no database)
$ npm run test:db                   -> Test Files 1 passed (1), Tests 4 passed (4)     (local stack)
$ (mutation: ROLLBACK replaced with select 1) npm run test:db -> Tests 3 failed | 1 passed (4)
$ env -u DATABASE_URL npm run build -> exit 0, /api/health (Dynamic), no error logged during prerender
$ next start, DATABASE_URL=local stack           -> UP http://127.0.0.1:3101 (protocol 1)          exit=0
$ next start, DATABASE_URL=dead port 54399       -> DOWN ... HTTP 500                               exit=1
     log: {"level":"error","msg":"unhandled route error",...,"error":"Error: connect ECONNREFUSED 127.0.0.1:54399",...}
$ next start, DATABASE_URL unset                 -> boot log "Failed to prepare server ... DATABASE_URL is not set"; DOWN HTTP 500, exit=1
```
Staging database (2026-10-17, a local `next start` using `.env.local`, which points at `riff-staging` through the Supavisor transaction pooler `aws-0-us-east-1.pooler.supabase.com:6543`):
```
$ (.env.local loaded by @next/env) readServerEnv()   -> ok, CA present (23-line PEM survived multi-line quoting)
$ next start + npm run -s status -- http://127.0.0.1:3104  -> UP (protocol 1), exit=0
$ same, DATABASE_CA_CERT=<throwaway self-signed CA>       -> DOWN HTTP 500, exit=1
     log: "error":"Error: self-signed certificate in certificate chain"   <- proves verify-full is enforced
```
Least-privileged app role (2026-10-18):
```
$ npx supabase db push --include-roles      -> created riff_app (roles.sql), applied 20261018065320_restrict_public_defaults.sql on riff-staging
$ npm run test:sql (local)                  -> Tests=9, Result: PASS
$ (human) psql \password riff_app as postgres, verify-full with supabase/certs/prod-ca-2021.crt
$ (human) psql as riff_app.<ref> via the transaction pooler :6543, verify-full -> current_user = riff_app (1 row)
```
$ npx supabase test db --linked (after the approved fix: set local role postgres + search_path) -> Files=1, Tests=9, Result: PASS
```
Getting the staging run to work took 3 disproved hypotheses, each stopped and re-planned with the human: (1) search_path alone failed because there was no USAGE on `extensions`; (2) the role switch alone failed because of the search_path; (3) schema-qualified calls failed because pgTAP internals call `_set` unqualified. Diagnosed with a temporary notice-only query, since deleted.
```

Vercel staging deploy (2026-10-18). Preview `riff-git-m00-foundations-sixfour.vercel.app`, behind Vercel Authentication; env `DATABASE_URL` uses riff_app on :6543, plus `DATABASE_CA_CERT`; `vercel.json` pins nextjs and iad1:
```
$ (human, logged in to Vercel, in a browser) GET /api/health  -> {"ok":true,"protocol":1}
$ npm run -s status -- https://riff-git-m00-foundations-sixfour.vercel.app
    -> DOWN ... not JSON (302 to vercel.com/sso-api: Vercel Authentication blocks unauthenticated requests, as intended)
```
Before the env vars were set, the build failed with "No Output Directory named public": the Framework Preset had been auto-detected as Other from the docs-only `main`. Fixed by `vercel.json`.

Still needed: a Vercel staging deploy, with `npm run status` UP and DOWN against its URL and the debug procedure followed once there, plus a CI run.

## Review
**Review 3 (reviewer agent, full M00 diff, 2026-10-18).** Re-ran lint, test, build, test:db and test:sql locally: all passed.
- Blocking findings and how each was fixed:
  1. **TLS bypass through URL params.** pg's connection-string parser lets `?ssl=0`, `?ssl=true`, `?sslnegotiation` or `?host=` override TLS or the host. Reproduced with pg's own `Client`. **Fixed:** pg now gets explicit fields (`poolConfig`), any query param is rejected, and there are tests for each param plus a pg-parser test. A mutation check (reverting to a connectionString) fails 2 tests.
  2. **CI didn't scan every push**, contrary to DECISIONS.md. **Fixed:** `on: push` now covers all branches.
  3. **Acceptance criteria are still open** (CI run, staging status UP/DOWN through Vercel Authentication, the debug procedure on staging). These are human steps and decisions, not code. Still open.
  4. **No record that the exposed `postgres` master password was rotated.** **Done:** the human reported resetting it in the Supabase dashboard on 2026-10-18. It's stored only in their password manager, and nothing in the app uses it. (`.env.local` has pointed only at the local stack since 2026-10-17, which Claude checked by host.)
- **CI first run on PR #1 (2026-10-18), 2 failures, both fixed:**
  - `check`: `npm ci` EUSAGE, "Missing: @emnapi/runtime@1.11.3 / @emnapi/core@1.11.3 from lock file". Reproduced in a `node:24` container with the old lock (exit 1). The lock was rewritten in the container, after which `npm run lockfile -- check` gives exit 0. Windows `npm ci` leaves that lock unchanged.
  - `secrets`: gitleaks-action got 403 listing the PR's commits. Fixed with a read-only `permissions:` block.
- Deferred to ROADMAP "Next revision": the broken fences in this ticket, the untested rollback-failure branch, CI `permissions:` and SHA pinning, the template `seed.sql` setting, and the duplicate CA source.
