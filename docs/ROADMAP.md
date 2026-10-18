# Roadmap

At the start of each session, agents report the current milestone, its status and what comes next.

## Product
This is a daily game platform. Players play the day's game, watch friends' runs live (including where each friend "died"), comment and react on the day's game, and earn cumulative points for a friends leaderboard. It's built to hold more than one game later, but it ships with one.

**Game 1: Don't Match the Host.** A fixed chain of questions narrows each day (e.g. Animal → Mammal → African mammal → Big cat). The player names an answer and must avoid the host's secret answer. Matching ends the run, and the score is the number of questions survived. See DECISIONS.md for the answer model.

## Milestones
Status: `planned` → `in progress` → `in review` → `done`

| # | Milestone | Scope | Status | Ticket |
|---|---|---|---|---|
| M00 | Foundations | Stack and tooling decisions, the hard-to-reverse designs, CI, `scripts/status`, staging deploy | done | `docs/milestones/M00-foundations.md` |
| M01 | Puzzle content and validator | Content file format, a validator that enforces the answer model, 7 days of real puzzles | planned | `docs/milestones/M01-puzzle-content.md` |
| M02 | Sign-in and playable game | Sign-in required before playing; profile; runs pinned to the Pacific-midnight day; server-checked answers stored as run events; autocomplete that sends entry IDs; sudden death; result screen. **This is the playtest checkpoint**: confirm the narrowing creates tension and check the obscure-answer escape risk before building any social features. | planned | — |
| M03 | Share | Spoiler-free share text whose link opens today's game | planned | — |
| M04 | Friends and live board | Invite link, mutual friends, a live board (status for everyone, plus where each friend died once you've finished), friends-only delivery, reconnect logged and counted | planned | — |
| M05 | Comments and reactions | On the day's game, friends-only, visible after you've played, delete your own, report others | planned | — |
| M06 | Points and friends leaderboard | Ledger written when a run ends (k points per survived question k), a one-time backfill from earlier runs, an all-time leaderboard equal to the ledger sum | planned | — |
| M07 | Launch readiness and closed beta | Load test of the reset-time spike, including live connections; alerts, backups, privacy policy and terms, account deletion; closed beta | planned | — |
| — | **MVP line** | | | |

Tickets for M02 and later get written when their milestone comes up, so they don't go stale.
After the MVP, order the work by beta data: streaks, answer stats ("12% picked lion"), reminders, admin UI for content, global leaderboard, game #2 (pull the platform/game boundary out at that point), native app wrapper, public comment moderation.

## Next revision (deferred)
These are non-blocking items found during work or review. Record each one here **before** acting on it. Items get pulled into a milestone on purpose; nobody fixes them on the side.

<!-- - [ ] <item> — found in M## (implementation | review) — <why it can wait> -->
- [ ] `private.puzzle`: `format` is stored both as a column and inside `content`; `content_hash` and `published_at` have no reader. Drop them or name a caller. Found in M00 (review). Cheap to fix before the M01 schema exists.
- [ ] Add a foreign key from `run (game_id, puzzle_date)` to `private.puzzle`, so a run can't exist for an unpublished day. Found in M00 (review). The route handler already gates this.
- [ ] A primary-key conflict between two concurrent answer requests must return the same idempotent result or 409 as the sequential path, never a 500, with a concurrency test. Found in M00 (review). This is M02 implementation work.
- [ ] Design the `realtime.messages` RLS policy that limits `board:<viewer_id>` to its owner. Found in M00 (review). This is M04 work, with no game-table changes.
- [ ] Verify that the `private` schema isn't exposed through the Data API by default (Supabase "Securing your API" docs), and add a test that fails if it ever is. Found in M00 (review). This is now load-bearing, because every game object lives in `private`. Do it in M02 with the first migration.
- [ ] Add the 2026-11-01 DST transition to the `private.today()` tests (it falls during M01–M02 development). Found in M00 (review 2). The design already requires DST tests.
- [ ] Show players a countdown to the reset: the server returns the next reset instant, computed in SQL alongside `private.today()`. A run started just before the reset is abandoned and scores 0 (Q4). Found in M00 (review 2). UX only, since abandoning can never beat dying.
- [ ] Verify that Supabase Postgres has current IANA tzdata for `America/Los_Angeles`. Found in M00 (review 2). The DST tests will catch it in M02.
- [ ] Record the points formula (k per survived question k, human-accepted on 2026-10-17) in the M06 ticket's Numbers table when that ticket is written. Found in M00 (review 2). The origin is already in DECISIONS.md.
- [ ] `eslint@9` (from the template's `^9` range) prints "no longer supported". Move to a supported ESLint once `eslint-config-next` supports it. Found in M00 (implementation). Lint works today.
- [ ] `scripts/status.ts` has no explicit fetch timeout, so a hung server waits for undici's default. A timeout value is a human number. Found in M00 (implementation). An unreachable server already fails fast.
- [ ] Local `supabase_vector` (the analytics log collector) restart-loops on Windows. The Supabase docs say analytics on Windows needs the Docker daemon socket exposed on `tcp://localhost:2375`. Either do that or disable `[analytics]` in `supabase/config.toml`. Found in M00 (implementation). We don't use local analytics.
- [ ] `pg` defaults to `connectionTimeoutMillis: 0` (no timeout), so a hung pooler would hang `/api/health` and every route. Pick a value in the M07 load test (a human number). Found in M00 (implementation). The defaults were human-approved until M07.
- [ ] When `DATABASE_URL` is missing, `next start` logs "Failed to prepare server" but keeps listening and returns 500 on every request instead of exiting. Check how Vercel behaves with a failing instrumentation hook. Found in M00 (verification). It's still loud: a boot error plus DOWN.
- [ ] Run `npm run test:db` in CI (start the Supabase stack in the job) once migrations exist in M02. Found in M00 (implementation). Today it only covers the transaction helper, which is tested locally.
- [ ] The M00 ticket's Evidence section has broken code fences, and an old "Still needed" line contradicts the deploy evidence. Found in M00 (review 3). Docs only.
- [ ] `withTransaction`'s rollback-failure branch (destroying the client) has no test. Found in M00 (review 3). Hard to trigger locally, and the logic is small.
- [ ] The CI actions are pinned to mutable tags (`@v7`, `@v3`) instead of commit SHAs. *(`permissions:` was done 2026-10-18.)* Found in M00 (review 3). Harden before adding secrets to CI.
- [ ] `supabase/config.toml` has seeding enabled with `./seed.sql`, which doesn't exist (a template default). Found in M00 (review 3). Disable it, or add the file when M01 seeds puzzles.
- [ ] The Supabase CA exists twice: `supabase/certs/prod-ca-2021.crt` (psql) and the `DATABASE_CA_CERT` env var (app). Consider one source. Found in M00 (review 3).
- [ ] Local Node is v24.11.0 with npm 11.6.1, while CI uses Node 24.2x with npm 11.19.1. Upgrade local Node to the current 24 LTS (a human install). Found in M00 (CI on PR #1). `npm run lockfile` already guards against the drift.
- [ ] The production domain `riff-sixfour.vercel.app` is behind Vercel Authentication, like the previews. It must be public before the M07 closed beta, which also lets `npm run status` check production without a bypass token. Found in M00 (status check after merge). Previews should stay protected.
- [x] The `DATABASE_CA_CERT` error said "check .env.local", which misleads on Vercel. Reworded on 2026-10-18 after a Production value with extra text at the start failed at boot. Found in M00 (staging check).
