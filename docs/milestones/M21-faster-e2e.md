# M21 — Faster e2e

**Status:** drafted 2026-11-16, waiting for the human's approval. Nothing is built.

## Goal
Make the e2e check, which every pull request waits on, take far less time, in three measured steps: run the tests on a built app, give the tests that don't test sign-in a quicker signed-in player, then split the suite across two CI machines.

## Who uses it / what breaks without it
- Used by: every session and the human, on every pull request and every merge to `main`.
- Breaks without it: each pull request waits about 25 minutes for e2e (19 to 30 minutes over the last 30 runs, none queued: it is the run itself, 2026-11-16). Local e2e runs on `next dev`, which players never get: two tests fail only on a built app (below), so the dev server can hide real faults.

## Source
- **Playwright** (SOURCES.md, Playwright): `https://playwright.dev/docs/test-webserver` (the `webServer` option, its `command`, `url`, `reuseExistingServer`, `timeout`).
- **Playwright sharding** (to add to SOURCES.md, the human's "Yes, add and read them", 2026-11-16): `https://playwright.dev/docs/test-sharding`, read 2026-11-16. Followed: `--shard=x/y`; without `fullyParallel`, "entire test files are assigned to shards"; uneven files can leave a shard with "significantly more tests"; the GitHub Actions example's `strategy` with `fail-fast: false` and a matrix.
- **Playwright authentication** (to add, same answer): `https://playwright.dev/docs/auth`, read 2026-11-16. Followed: a signed-in browser context from saved state (`browser.newContext({ storageState })`, one per role or player in a test); the warning that a state file "may contain sensitive cookies" and is never committed; state written under the project's output folder, "automatically cleaned up before every test run".
- **Next.js deploying** (SOURCES.md, Next.js; the bundled `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`, "Node.js server"): `npm run build` then `npm run start`, which "supports all Next.js features".
- **Supabase auth admin API** (*not yet in SOURCES.md: needs the human's OK*): `https://supabase.com/docs/reference/javascript/admin-api` ("Any method under the `supabase.auth.admin` namespace requires a `secret` key"; "should be called on a trusted server. Never expose your `secret` key in the browser"), `auth-admin-createuser`, `auth-admin-generatelink`, `auth-verifyotp`, read 2026-11-16. Gap: these pages don't document `generateLink`'s or `verifyOtp`'s return values, so 21b must confirm them from the installed `@supabase/supabase-js` types before building on them.

## Answers (the human, 2026-11-16)
Asked in two rounds after a measuring run (PR #237, below).

Round 1
1. Scope: "All three, in order (Recommended)": the built app, then the sign-in shortcut, then splitting across machines, each its own sub-ticket and pull request, measured before the next.
2. The two tests that fail only on the built app: "Investigate first, in this ticket (Recommended)": a real bug gets a failing test first and then the fix; a wrong test is fixed as its own change.
3. Local runs: "Both use the built app (Recommended)": one way to run e2e, locally and on CI.
4. `main`'s full run after each merge: "Keep it (Recommended)".

Round 2
5. The sign-in shortcut: "Made directly with the auth admin key": tests create players and their sessions with the local stack's admin key, skipping the app's sign-in code. A security change (CLAUDE.md, Security): a DECISIONS.md entry, local stack only.
6. Machines: "2".
7. Next.js: "Yes, merge the upgrade first (Recommended)": Dependabot's pull request to Next.js 16.4.5 goes before this ticket, after its checks and release notes are read and what it changes is told to the human. Today local e2e can't start: `next dev` 16.4.2 stops at a security-upgrade notice whenever Playwright starts it.
8. Sources: "Yes, add and read them (Recommended)".

## What was measured (PR #237, 2026-11-16, closed unmerged)
The whole suite twice at once on CI, once on `next dev` and once on `next build` + `next start`, with every sign-in timed as steps (`signInAndPick`, `e2e/players.ts`).

| | Dev server | Built app |
|---|---|---|
| Time in tests (sum) | 24.3 min | 13.2 min, plus about 1.4 min to build and start |
| Sign-ins | 208, 5.4 min, 1.6 s each | 210, 3.1 min, 0.9 s each |
| Of which, waiting for the emailed code | 0.29 s each | 0.12 s each |
| Of which, picking the username | 0.55 s each | 0.38 s each |
| Retried tests' time | 0.1 min | 0.2 min |
| Failed | none (1 flaky: `feel.e2e.ts:52`) | `boards.e2e.ts:223`, `play.e2e.ts:232` (1 flaky: `feel.e2e.ts:52`) |

## Plan
Each sub-ticket is its own pull request from `m21-faster-e2e`, merged before the next starts; each records the CI e2e job's time, from `gh run view <id> --json jobs` (the test step's start and end), in Evidence.

**Before 21a: Next.js 16.4.5** (answer 7; Dependabot's pull request, not this branch). Read its release notes and checks, tell the human what it changes on plor.app, merge on green and their word.
→ verify: `npx playwright test e2e/admin-area.e2e.ts` starts its server locally (it can't today).

**21a, the built app.**
1. Find why `boards.e2e.ts:223` and `play.e2e.ts:232` fail on a built app (answer 2). Hypothesis: a timing or caching difference the dev server hides; disproved if the app's own behaviour differs from what the test expects on a built app in a browser by hand.
   → verify: each one either has an app fix with a test that failed first, or a test fix in its own commit; both pass on a built app.
2. Playwright's `webServer` runs `npm run build && npm run start` everywhere, on the slot's port (answer 3), with the build's time allowed for by `timeout`.
   → verify: a local targeted run and CI's run both log `next build` and `next start`; CI's e2e passes.
3. Removes the ROADMAP Next revision item "Run e2e on a production build" and the `npm run dev` web server.

**21b, the sign-in shortcut** (answer 5).
1. A DECISIONS.md entry, the human's first: tests may hold the local stack's secret key, read at run time from `npx supabase status -o env`, never written to a file, never printed (masked on CI), refused unless the database is the local stack's.
2. A helper that makes a confirmed player with `auth.admin.createUser`, gets a session for them, saves the username, and returns a signed-in browser context (Playwright's `storageState`). How the session is made (`generateLink` then `verifyOtp`, or another documented way) is confirmed from the installed library's types first (Source, gap).
   → verify: a test using it reaches a signed-in page with the username shown, and the session is the same kind of cookie the real sign-in sets.
3. The five files that test sign-in itself keep the real flow: `account.e2e.ts`, `guest-play.e2e.ts`, `headings-invites.e2e.ts`, `look.e2e.ts`, `not-found.e2e.ts`. The other files move to the helper one at a time, each checked for anything it relied on the real sign-in doing (for example the sign-in limit count set by `forwardPlayerIp`).
   → verify: `grep -l "signInAndPick" e2e/*.e2e.ts` lists only those five; the full suite passes on CI.

**21c, two machines** (answer 6).
1. e2e runs as two jobs, `--shard=1/2` and `--shard=2/2`, `fail-fast: false`, split by file (Playwright's default without `fullyParallel`: several files rely on the test before them, so tests aren't spread one by one).
2. A last job named `e2e` needs both shards and fails if either fails, because the repository's ruleset requires a check named `e2e` (`.github/workflows/e2e.yml`'s header comment).
   → verify: a pull request shows `e2e` green only when both shards pass; a shard made to fail on a throwaway branch turns `e2e` red.
3. If the two shards' times differ widely (uneven files), report it to the human before moving files around.

## Acceptance criteria
- [ ] The Next.js upgrade is merged and local e2e starts its server (answer 7).
- [ ] `boards.e2e.ts:223` and `play.e2e.ts:232` pass on a built app, each with its cause recorded (answer 2).
- [ ] Local and CI e2e both run on `npm run build` + `npm run start`; nothing runs e2e on `next dev` (answer 3).
- [ ] Only the five sign-in files use the real sign-in; the admin key never appears in a file, a commit or CI's log (answer 5).
- [ ] e2e runs on two machines and the required `e2e` check passes only when both do (answer 6).
- [ ] `main` still runs the full suite after each merge (answer 4).
- [ ] Evidence records the e2e job's time before (the #237 table) and after each sub-ticket.

## Out of scope
- Running tests in parallel on one machine (`workers` stays 1: the tests share one database).
- Changing what any test checks, beyond the two built-app failures.
- Dropping or shortening `main`'s run after a merge (answer 4).
- The retry on CI (DECISIONS.md, 2026-11-06) stays as it is.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 2 machines | 21c's shards | The human, 2026-11-16 (answer 6) |
| The five sign-in files | 21b's real-sign-in files | `grep -l "Email me a sign-in code\|emailedCode" e2e/*.e2e.ts`, 2026-11-16 |
| The #237 times | Evidence's before | PR #237's two runs, 2026-11-16 |
| The web server's `timeout` for the build | 21a, step 2 | **Blank: for the human.** Playwright's default is too short for the build (#237's built run took about 1.4 min to build and start); no source gives Plor's value |

## Removes
- The `npm run dev` web server in `playwright.config.ts` (21a), and ROADMAP's Next revision item "Run e2e on a production build", which 21a does.
- The real sign-in in every e2e file but the five (21b); `signInAndPick` stays for those five.
- The single `e2e` job's test step, replaced by two shards and the joining `e2e` job (21c).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
