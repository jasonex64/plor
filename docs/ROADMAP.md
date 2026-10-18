# Roadmap

At the start of each session, agents report the current milestone, its status and what comes next.

## Product
This is a daily game platform. Players play the day's game, watch friends' runs live (including where each friend "died"), comment and react on the day's game, and earn cumulative points for a friends leaderboard. It's built to hold more than one game later, but it ships with one.

**Game 1: Don't Match the Host.** A fixed chain of questions narrows each day (e.g. Animal → Mammal → African mammal → Big cat). The player names an answer and must avoid the host's secret answer. Matching ends the run, and the score is the number of questions survived. See DECISIONS.md for the answer model.

## Milestones
Status: `planned` → `in progress` → `in review` → `done`

| # | Milestone | Scope | Status | Ticket |
|---|---|---|---|---|
| M00 | Foundations | Stack and tooling decisions, the hard-to-reverse designs, CI, `scripts/status`, staging deploy | in progress | `docs/milestones/M00-foundations.md` |
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
