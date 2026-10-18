# M02 — Sign-in and playable game

**Status:** planned. Decisions D1–D4 and Numbers were set by a human on 2026-10-18; the ticket is ready to implement.

## Goal
A signed-in player can play today's Offbeat puzzle end to end on staging, with every answer checked by the server, and the human can run an internal playtest that measures how the questions really play.

## Who uses it / what breaks without it
- Used by: playtesters now; every later milestone builds on runs (share, friends board, comments and points all read `run` and `run_event`).
- Breaks without it: nothing can be played, and the open design questions (catch rates, host bank coverage, the niche-answer escape) stay guesses. **This is the playtest checkpoint** in ROADMAP: confirm the game is fun before any social features.

## Source
- `docs/milestones/M00-data-design.md` rev 4: §2 network messages, §3 identity, §4 content, §5 runs and run events, §7 append-only, §8 day boundary.
- `docs/DECISIONS.md`: Game 1 rules, answer model, database access, app database role, error handling, logging.
- Supabase Auth with Next.js SSR (`@supabase/ssr`), pinned in SOURCES.md. **The sign-in method's own docs are added once the human picks a method (D1).**
- Next.js App Router docs bundled at `node_modules/next/dist/docs/` (route handlers, `connection()`).

## Decisions needed before any code
| # | Decision | Options | Status |
|---|---|---|---|
| D1 | Sign-in method | **Both: email magic link and Google** | human, 2026-10-18 |
| D2 | Puzzle dates for the playtest | **Re-date the 14 puzzles** (renamed files, content unchanged) so the first lands on the playtest's first day | human, 2026-10-18 |
| D3 | How playtesters reach the site | **Make production public**; previews stay behind Vercel Authentication. The human switches it in the Vercel dashboard once 2a (sign-in) is deployed, so nothing playable is public before sign-in exists | human, 2026-10-18 (security change) |
| D4 | Delivery | **One ticket, two PRs**: 2a sign-in and profile, then 2b game loop and playtest. Each PR is reviewed and merged on its own | human, 2026-10-18 |

## Acceptance criteria
Each criterion must be checkable with a command or other observable result.

**2a: sign-in and profile**
- [ ] A player can't start a run without being signed in (tested at the route level).
- [ ] The first sign-in creates `private.profile` with a unique username under the rules in Numbers; a duplicate username fails loudly with an AppError (tested).
- [ ] Sessions use `@supabase/ssr` cookies; no secret reaches the client bundle (checked in the build output).

**2b: game loop**
- [ ] `content:publish` loads validated puzzles into `private.puzzle` and refuses to change a puzzle whose `puzzle_date <= private.today()` (tested against the local stack).
- [ ] `private.today()` is the only definition of "today", with tests just before and after midnight on each `America/Los_Angeles` DST transition during development and the playtest, with the dates taken from the IANA tz database rather than worked out by hand (2026-11-01 is already logged in ROADMAP), plus an ordinary day.
- [ ] Matching is a pure function `(question, entry_id) → matched | not_matched | invalid_entry`. A host answer always matches itself; match groups cover only the listed extra entries (unit tests for each rule).
- [ ] `POST /run/start` pins `puzzle_date = private.today()`; one run per user per day (primary key; tested).
- [ ] Answers are checked one at a time. The response gives the result, the host answer(s) for that question, and the next question. The payload never contains host answers or host-bank markers for questions not yet answered (payload-level test).
- [ ] A different `entry_id` for an index that's already been answered → `409 already_answered`; the same one returns the stored result; an answer after the reset → `409 day_over`, raised by a database trigger. Two concurrent requests for the same index return the idempotent result or 409, never 500 (concurrency test; ROADMAP item).
- [ ] Typed text that matches no entry gets "not in our list yet, try another" with no penalty, and is logged for human review under the limits in Numbers (tested).
- [ ] The run status view gives in_progress / died / survived / abandoned (tested).
- [ ] `riff_app` gets only the grants these routes need (pgTAP, extending `riff_app_role.test.sql`); nothing in `private` is reachable by `anon` or `authenticated` (test; ROADMAP item).
- [ ] `npm run test:db` runs in CI against a started Supabase stack (ROADMAP item).
- [ ] UI: autocomplete over the question's accepted bank that submits entry IDs; one question at a time; a result screen. It works on a phone-width screen.
- [ ] On staging, a real signed-in run is played start to finish, with evidence (the human's run plus `run_event` rows queried as `riff_app`'s grants allow, or through an admin path).
- [ ] **The playtest runs** and its findings are recorded: the catch rate per question, the share of typed answers that fell in the host bank, the logged misses, and whether it's fun. Then a human decides on the open ROADMAP items about the host bank size and dominant host answers.

## Out of scope
Share (M03), friends and the live board (M04), comments (M05), the points ledger and leaderboard (M06), account deletion and production hardening (M07), and the Offbeat visual theme beyond a plain functional UI.

## Numbers
Every value this milestone needs, and where it comes from. A blank origin means stop and ask.
| Value | Used for | Origin |
|---|---|---|
| Questions per day | Run length | 7 (human, 2026-10-18) |
| Username rules | Profile creation | 3–20 characters, `a-z 0-9 _`, unique ignoring case (human, 2026-10-18) |
| Maximum length of logged typed text | Not-in-list logging | 40 characters; longer input is rejected and **not** logged (human, 2026-10-18) |
| Rate limit on answer and not-in-list requests | Abuse control | Deferred to M07: none at app level in M02; sign-in plus Supabase Auth limits only (human, 2026-10-18) |
| Playtest size | Playtest | The human plus a few friends, 7 days (human, 2026-10-18) |

## Plan
1. Pin sources for magic link (Supabase email OTP and its sending limits) and Google OAuth with `@supabase/ssr`. The human sets up the Google OAuth client and any email provider.
2. 2a: auth with `@supabase/ssr`, a profile migration and grants, and sign-in pages.
3. 2b: migrations (`private.puzzle`, `today()`, `run`, `run_event`, the status view, the misses log, grants), then `content:publish`, matching, route handlers, the UI, and test:db in CI.
4. Deploy, play on staging, playtest, record the findings.

## Removes
- `private.puzzle` columns with no reader (ROADMAP: `format` stored twice, `content_hash`, `published_at`), unless a caller appears.
- The template `seed.sql` setting in `supabase/config.toml` (ROADMAP), since `content:publish` replaces seeding.
- The placeholder home page (`src/app/page.tsx`), replaced by the game.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
