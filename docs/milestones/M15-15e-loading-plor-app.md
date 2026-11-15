# M15 15e — Loading plor.app's answer lists and dictionary

**Status:** in progress. Drafted 2026-11-14 from the human's answers below; **approved by the human (2026-11-14: "Approve 15e")**, the design included (a security change: CLAUDE.md, Security). 15e-1's code is merged (PR #213, merge commit `9c8606e`, 2026-11-14, on nine green checks, by the human's "Merge when green"); **its last two criteria are the human's run on plor.app: the first run loaded the dictionary and stopped at Supabase's statement time limit before any of the base (2026-11-15); the fix, on answer 10, is merged (PR #215, 2026-11-15, nine green checks); the human's second run is next.** 15e-2 is not drafted. Numbered 15e because an unbuilt, uncommitted 15d ticket ("Ship on your word", 2026-10-26) sits in the M15 checkout.

## Goal
The human can load the answer base and game 2's dictionary into plor.app's database from this PC, after seeing what the load would do, so both games can be played there.

## Who uses it / what breaks without it
- **Used by:** the human, who runs the load; every beta player, who needs the lists.
- **Breaks without it:** the loader refuses any database but this PC's (`scripts/base.ts:1072-1074`: "refusing <host>: 13a loads the local stack only"). On plor.app every Offbeat answer is refused and a day can't be approved (`private.approve_puzzle` builds its lists from the base), and Fragments calls every word "not a word" (`private.dictionary_word` is empty). The backlog sort's one must-fix before friends play (`docs/audits/2026-11-11-backlog-sort.md`, "Must fix before friends play").

## Source
- DECISIONS.md, Log, 2026-10-26, "the scripts connect like the app": loading the hosted base from the scripts is allowed and connects as `postgres`, an exception to the App database role row, made when M15 builds it (human: "Hosted too, guarded", "postgres, recorded").
- DECISIONS.md, Database TLS (2026-10-17): verify-full against Supabase's CA. The CA file is in the repo, `supabase/certs/prod-ca-2021.crt`.
- SOURCES.md, Rules: "Supabase Postgres connections" (pooler modes and ports; a session lock needs a session-mode connection, ROADMAP, For M15, "The load's gaps"), "node-postgres" (the `ssl` object), "Supabase database roles".
- SOURCES.md's Supabase pricing row: the free plan's 500 MB.
- CLAUDE.md, Security: secrets never leave their home; verify, don't disable.

## Answers (human, 2026-11-14, two rounds of guided questions)
1. Who runs the script: "Me, from this PC (Recommended)".
2. How the password reaches it: "Typed at a hidden prompt (Recommended)".
3. The space (the lists are about 380 MB of the free plan's 500 MB: 337 MB, M13 13e-11's Evidence, plus the dictionary's 42 MB, measured locally 2026-11-14): "Measure first, then decide (Recommended)". The same day: "if we CAN stay on free for now lets do that if possible".
4. How often the lists change during the beta: "About weekly, in batches (Recommended)".
5. The order: "First load now, updates second (Recommended)".
6. The safeguard: "Dry run, then type the name (Recommended)".
7. A load while someone is mid-game: "Warn me, I decide (Recommended)".
8. The raw downloads' durable copy: "Leave on this PC for the beta (Recommended)".
9. The old uncommitted work in the M15 checkout (a `ship` command, `git.deploymentEnabled` off, edits in 7 files): "Discard them". Done 2026-11-14; the untracked ticket `M15-15d-ship-on-your-word.md` was not named in the question and is still there, for the human.
10. The first hosted load stopped at Supabase's two-minute limit on one statement (2026-11-15). How the loader gets past it: "Lift the limit for the loader only (Recommended)" (the other options: a longer limit of the human's choosing; sending the lists in smaller pieces).
11. The Supabase connector (2026-11-14): "Full access"; list loads: "No, keep loads by hand" (DECISIONS, 2026-11-14; CLAUDE.md, Security).

## Assumptions (say if any is wrong)
- plor.app's database holds no answer base and no dictionary today (*unverified*: no agent can read it; the dry run shows it).
- The human can copy the database's session-mode connection string from Supabase's dashboard or their password manager.
- `load all` and `load dictionary` do on plor.app what they do locally once they can connect: the same SQL functions, already pushed with the migrations (the human: "database is pushed", "should be up to date"; *unverified*).
- 43 seconds locally (M13 13e-4) says nothing sure about the time over the network; the first hosted load measures it.

## The design, for approval
**What changes in security terms:** today no script can write to plor.app. After this, one can, only when all of these hold: the human starts it by hand with a new word on the command; the human pastes the connection string at a hidden prompt; the connection verifies Supabase's certificate; the human has read the dry run and typed the database's host name. The string is held in memory for that run only: never written to a file, the environment, the command line, a log or the output. Nothing is added to `.env.local`, Vercel, GitHub or any Claude session. No grant, role, policy or migration changes.

- `npm run base -- load all` and `load dictionary` stay local-only, as now. A new target word, `hosted`, is the only way to plor.app: `npm run base -- hosted check` and `npm run base -- hosted load`.
- Both ask for the connection string with input hidden. It is parsed by the app's own `readDatabaseUrl` (any query parameter refused). A local host is refused here, as a hosted one is refused by the local commands. TLS is verify-full with `supabase/certs/prod-ca-2021.crt`; a failed check stops the run.
- `hosted check` writes nothing. It prints: the host and database name; the database's size now; whether a base and a dictionary are there, with their counts; how many runs are in progress right now (answer 7); and what the load would bring (each set's items from its manifest, the dictionary's words). After a first load it is also the weekly look at the size (answer 3).
- `hosted load` runs the check, then asks the human to type the host name it showed. Anything else stops with nothing written. Then `load all`'s steps and the dictionary's, as locally, on one session-mode connection (the load's lock lives on the session); it ends by printing the new size.
- **15e-1 loads an empty database only.** If the check finds a base already there, `hosted load` refuses and says updates are 15e-2. So none of the known live-load gaps can be met in 15e-1.
- **15e-2, before the first weekly update** (its own questions first): loading over a base people are playing on. ROADMAP, For M15: merging loaded things on a live base; the four load gaps; a name given back after its midnight.

## Acceptance criteria and plan
**15e-1 — the guarded loader and the first load.** One pull request from `m15-launch-readiness`. Tests first.
- [x] `load all` and `load dictionary` still refuse a hosted host, and `hosted` refuses a local one → verify: unit tests of the target check, failing first. **Done:** `scripts/base.test.ts`, "localClient > refuses a database that isn't this machine" (there before; the guard is untouched); `scripts/hosted.test.ts`, `hostedTarget` (127.0.0.1, localhost, [::1] and port 6543 refused).
- [x] The connection string never leaves memory → verify: a unit test that the prompt echoes nothing and that no error or output of a failed run (bad string, refused host, failed TLS) contains the password or the whole string; gitleaks in CI. **Done:** `scripts/hosted.test.ts`, `readHidden` (echoes nothing; a non-terminal refused, no fallback) and `hostedFailure` (no message holds the string, the typed password or the decoded one, a real failed connection to `db.example.test` included). The reviewer read every path that prints.
- [x] A hosted connection without a verified certificate is impossible → verify: a unit test of the connection's config (the CA set, no way to turn checking off). **Done:** `scripts/hosted.test.ts`, `hostedConfig` (the fields and `ssl: { ca }`, one argument). The reviewer read pg 8.23.1: with `ca` alone the certificate and the host name are both checked, and no `PGSSL*` variable is read.
- [x] `hosted check` writes nothing → verify: a db test on the local stack (the check's code with the host rule stubbed at the boundary, not the SQL), comparing the base's tables before and after. **Done:** `scripts/base.db.test.ts`, "hosted check and load": the six base tables' and the dictionary's counts are the same after, its first statement is `begin read only`, and a DELETE inside is refused by the database ("cannot execute DELETE in a read-only transaction").
- [x] `hosted load` stops with nothing written unless the typed name matches, and refuses a database that already has a base → verify: db tests on the local stack, the same way. **Done:** the same describe (a wrong name writes nothing; with a base there the right name is refused and nothing is written) and `hostedRefusal`'s five cases in `scripts/hosted.test.ts`.
- [x] The README of the commands (the header of `scripts/base.ts`) says how to run a hosted load, and loses its stale "nothing loads it yet" line → verify: by reading. **Done:** `scripts/base.ts`, the header.
- [ ] **The human's run:** `hosted check` on plor.app, the size reported; the human decides free or Pro from the number (answer 3); then `hosted load`; then `hosted check` again shows the base and dictionary with the manifests' counts → evidence: the human's pasted output (it holds no secret by the criterion above).
- [ ] On plor.app afterwards: an Offbeat day can be approved and a Fragments try is judged against the dictionary → evidence: the human's word, or `scripts/status` plus a played day.

**15e-2 — updating a live base.** Drafted after 15e-1, from its own round of questions.

## Out of scope
- Drafting and approving the beta's days (M15, next).
- Backups, alerts, the size warning's level (a human number), the load test.
- A durable copy of the raw downloads (answer 8).
- An automatic or Claude-run load (answer 1).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 500 MB | The free plan's database | SOURCES.md, Supabase pricing (accessed 2026-10-24) |
| About 380 MB | The lists' size, for the question only | 337 MB (M13 13e-11, Evidence) + 42 MB (`private.dictionary_word`, measured locally 2026-11-14); the real number is what `hosted check` and the load report |
| 5000 | Dictionary rows per insert | Already in `scripts/base.ts` (`loadDictionary`); unchanged |
| 0 (no limit) | `statement_timeout` for the hosted load's own session | Human, 2026-11-15, answer 10; the limit it lifts, 120000 ms, was read from the hosted database (`pg_settings`) on 2026-11-15 |

One new number, answer 10's. No retry or size threshold is added; if the build needs one, it stops and asks.

## Plan
1. The target check and the hidden prompt, with their unit tests → verify: `npm test -- scripts/` fails first, then passes.
2. The verified connection → verify: its unit test.
3. `hosted check` → verify: its db test on the local stack.
4. `hosted load` with the typed name and the empty-only rule → verify: its db tests.
5. DECISIONS.md: the App database role row's exception written out as built; the header of `scripts/base.ts`.
6. The `reviewer`; then the human's run.

**Expected at the human's run, and what would prove it wrong:** the check shows no base and no dictionary, and a size well under 500 MB; after the load the size is near 380 MB more. Wrong if: a base is already there (the load refuses; ask the human what loaded it), or the size after the load leaves no room on free (the human's call, answer 3), or a load function is missing (a migration was not pushed).

## Removes
The stale header line in `scripts/base.ts` ("nothing loads it yet"). The local-only guard is not removed: it stays for the local commands.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The ticket: "No timeout, retry or size threshold is added" | The hosted load lifts `statement_timeout` for its own session | The first hosted load stopped at Supabase's two-minute limit; the human chose it (answer 10) |
| The ticket: "If the check finds a base already there, `hosted load` refuses" | As written, after a first build that did otherwise: it loaded each part only where empty and skipped a base already there, on the main session's own instruction to the builder | The reviewer's blocking finding: a base left part-loaded by a failed run would have been skipped and looked finished. Fixed before the first commit |
| The ticket: the base, then the dictionary ("`load all`'s steps and the dictionary's") | The dictionary first, then the base | The dictionary is replaced in one transaction, so a failed run can be run again while no base is there; a failure during the base leaves a base, which the next run refuses loudly |
| The ticket: `hosted load` "refuses a database that already has a base" | The refusal comes after the host name is typed | So a wrong name is always the first thing refused, and both refusals can be tested on the local stack; nothing is written either way |
| DECISIONS, 2026-10-26: the hosted load "connects as `postgres`" | The role is whatever the pasted string names; nothing checks it | The human pastes the string; no rule for it was asked for (ROADMAP, Next revision) |
| Answer 7: "Warn me, I decide" on games in progress | The count is every run `private.run_status` calls in progress, not today's alone | A run can be finished the next day (DECISIONS, Timer), and a run never finished reads in progress for good (ROADMAP, For M16), so the number can overstate |

## Evidence
**15e-1's code (2026-11-14).** No hosted database was touched: the builder and the reviewer had no credentials and made no connection but to the local stack and to `db.example.test` (a name that doesn't resolve).
- Failed first: `scripts/hosted.test.ts`, 12 of 16 ("TypeError: hostedTarget is not a function"; the four that passed need no new code); the db describe "hosted check and load", 4 of 4 (its imports were missing); after the review, `hostedRefusal`'s five cases ("TypeError: hostedRefusal is not a function").
- After: `npm test`: 68 files, 797 passed. `npm run test:db -- -t "hosted check and load"`: 4 passed; the whole `npm run test:db`, run before the review's fix: 63 files, 489 passed (CI runs it again). `npm run lint`: clean. `npx tsc --noEmit`: nothing in `scripts/`; this checkout lacks Next's generated types, so it reports `PageProps`, `LayoutProps` and `RouteContext` in `src/app`, untouched by this step (CI's check is the evidence).
- `npm run base -- hosted check < /dev/null` exits 1 with "this command asks for the connection string at a hidden prompt, which needs a real terminal…"; `hosted load` the same.
- No e2e: no screen changed.
- CI's `db` check failed once on the pull request: three of the four hosted db tests leaned on this PC's loaded base, and CI's database is empty ("expected … to match /BASE: there, \d+ things/"; "data/snapshots/dictionary/2026-11-07.json is missing"). The tests now load and remove the fixture base themselves; tests only. Then nine green checks.
- **Not verified, and only the human's run can:** a load into an empty database (the local stack is shared and was not wiped; it runs the `loadAll` and `loadDictionary` the local commands use); the certificate check against the real Supabase; the hidden prompt and the second, visible prompt in a real PowerShell window; how long the load takes over the network; the size on plor.app.
- **The first look at the hosted database (2026-11-14, by Claude through the Supabase connector, read-only; the human connected it and approved the rule, DECISIONS, 2026-11-14):** one project, `plor-staging`, in us-east-1. Size 18 MB; 0 things, 0 categories, 0 dictionary words; 0 runs in progress; 7 players; 0 puzzles. So the load meets an empty base, and about 380 MB more would bring it to about 400 MB of the free plan's 500 MB. **Migrations: 13 of the repo's 14 are applied; `20261114230701_fragments_live_board` (16f-6's) is not**, so the human's "should be up to date" did not hold for it, and Fragments' board on plor.app does not move live until it is pushed.
- **The human's first runs (2026-11-15, their PowerShell, `C:/Users/jason/RIFF`; from their screenshots and Claude's reads through the connector).** The hidden prompt worked in a real terminal. A transaction-mode string was refused: "hosted load failed: refusing port 6543, the transaction-mode pooler…", nothing written. With the session-mode string the check printed, the host name was typed (`aws-0-us-east-1.pooler.supabase.com`, the second prompt worked), and `LOADED dictionary: 259968 spellings`. Then: **"hosted load failed: canceling statement due to statement timeout (57014)"** during the base. After it: 259,968 dictionary words, 0 things, 0 categories, no load open, 98 MB (44 MB before the base began; the rest is the cancelled set's space, which Postgres reuses). The session's `statement_timeout` was 120000 ms. So nothing was part-loaded, and the loader would run again.
- **The fix (answer 10):** `liftStatementTimeout` sets `statement_timeout = 0` on the load's own connection, after the host name is typed and before the first write. Failed first: "TypeError: liftStatementTimeout is not a function"; then the hosted db describe 5 of 5 (it shows the session's limit is 0 and another connection's is unchanged), `scripts/hosted.test.ts` 20 passed, lint clean.


## Review
- Blocking findings and how each was fixed: 15e-1 (the `reviewer`, 2026-11-14, one pass, by reading, with the unit tests and pg's source): one. A base load that fails part-way was reported as done on the next run ("SKIPPED the base: it is already there"), against the ticket's own rule; `hostedLoad` now refuses any database with a base and says a part-loaded one is incomplete (`hostedRefusal`, five tests), and the DECISIONS row says the same. The statement-limit fix (the `reviewer`, 2026-11-15, by reading): none; the hosted database's other limits were then read through the connector (`idle_in_transaction_session_timeout`, `idle_session_timeout`, `lock_timeout` and `transaction_timeout` are all 0), the pooler's own limits *unverified*.
- Deferred to ROADMAP "Next revision": 15e-1: four items (For M15).
