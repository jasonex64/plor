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
Still needed: a Vercel staging deploy, with `npm run status` UP and DOWN against its URL and the debug procedure followed once there, plus a CI run.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
