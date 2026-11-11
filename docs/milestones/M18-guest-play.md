# M18 — Guest play

**Status:** drafted 2026-11-11 from four rounds of the human's answers, waiting for approval. Built before M16's 16f and M17 (ROADMAP, Focus, "The plan to the beta"), for the closed beta. No code, and no migration, before the security change below is reviewed and recorded in DECISIONS.md.

## Goal
Anyone can play today's game 1 or game 2 from the front page without an account; they see their result once, and nothing about them is kept except their answers, with no one attached.

## Who uses it / what breaks without it
- Used by: friends invited to the closed beta who want to try the game before making an account; anyone who opens a group invite link and wants a look first.
- Breaks without it: the front page asks every visitor to sign in before they can see the game (read 2026-11-11: `src/app/home.tsx:247-258`, `Signed` shows only `SignIn` when signed out). An invited friend who won't make an account just to try it never plays, and never sees what an account adds.

## Source
- `docs/SOURCES.md`, rows added 2026-11-11 with the human's OK (answers 4 and 12): "Supabase anonymous sign-ins (M18)", "Supabase CAPTCHA protection (M18)", "Cloudflare Turnstile (M18)". Facts used, from those pages:
  - Supabase anonymous sign-in: users go in `auth.users` and use the `authenticated` role; an IP limit of 30 requests per hour; clean-up of them is "currently not available"; a guest who clears browsing data can't get back in. This is why this ticket does not use it (see Design, "Why not Supabase anonymous users").
  - Turnstile server-side validation: the server must call Siteverify (`https://challenges.cloudflare.com/turnstile/v0/siteverify`) with `secret` and `response`; a token lives 300 seconds and is checked once (`timeout-or-duplicate` on a repeat).
  - Turnstile widget and plans: Managed mode usually passes unseen and sometimes shows a checkbox; no stated privacy condition for Managed (Invisible has one); free plan has unlimited challenges.
  - Turnstile testing: dummy keys always pass, always fail or force a box, and work on localhost; Playwright is detected as a bot, so tests must use them.
- `docs/DECISIONS.md`: Player identity, Run events, Points ledger, Day boundary (Hard to reverse); App database role, Row-level security in `private`, and the Game 1 rules (Timer, Matching).
- `docs/milestones/M17-profiles-and-friend-requests.md`, answer 6 (friend invite links go; group links stay).
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` (read 2026-11-11): `cookies().set` takes `httpOnly`, `secure`, `sameSite` and `path`.
- *Unverified until read in 18a:* Supabase's page does not say whether the user ID survives sign-up. This design never needs it.

## Answers (human, 2026-11-11, four rounds of guided questions)
1. What guest play is for: "Guests can stay guests". Replaced by answer 9.
2. What a guest sees after a run: "Result plus a peek". Their result, and what an account unlocks shown blurred behind a sign-up prompt.
3. A guest who signs up or in the same day: "New account keeps it; old account's own run wins". Replaced by answer 9: nothing is kept, so signing up starts clean.
4. Add Supabase's anonymous sign-in guide as a source: "Yes, add and read it".
5. A long-time guest signing in to an existing account: "Account's history stands".
6. Does a guest have a name: "No name until sign-up".
7. Do guest answers count toward how many players gave an answer (rarity): "Yes, guests count".
8. Guarding against bots in the beta: "Invisible bot check now". Anyone can play as a guest from the front page.
9. When idle guests are removed. The human wrote: "is there a way we can only just keep track of the guests's answers for data keeping purposes (like what answers are rare) and then discard everything else about them after the run". Of four versions offered, chosen: "Answers only, nothing else (Recommended)". A guest plays, sees their result once, their answers join the rarity counts with no one attached; no guest streak, totals or history; signing up starts clean.
10. A group invite link opened with no account: "Ask to sign up first". The page may also offer to play today's game as a guest. The human also reminded: "i thought we were removinig the sign up links". M17 removes friend invite links (its answer 6); group links stay.
11. Where this lives: "Its own milestone, M18".
12. Add Supabase's CAPTCHA guide and Cloudflare's Turnstile docs as sources: "Yes, add both".
13. A guest replaying the same day: "Replay freely, all count". Every guest run's answers join the rarity counts; nothing is remembered.
14. A guest who then signs up or in the same day, can they play today's game for points: "Yes, allow it for the beta". Revisit before public launch.
15. What sits behind the peek's blur: "A drawn stand-in, blurred". Not real data; nothing is fetched.
16. How the bot check appears: "Mostly unseen, a box if suspicious". Turnstile's Managed mode.
17. How long an abandoned guest run's rows may sit (round 5): "Until that day's midnight (Recommended)". Cleared the next time any guest starts after the day ends; no new number.
18. A limit on guest starts per address, besides the bot check: "No, bot check only (Recommended)".
19. Keeping a guest's typed text that named no answer: "No, don't keep them (Recommended)".
20. Game 2's "better than X% of players" for a guest: "Show it". Read only; the guest's score isn't added to the players' scores.

## Design (proposed)
**What a guest can reach.** The front page, both game routes, a run, the result with a share button, and the peek. Not friends, groups, comments, reactions, the feed, boards, Me or settings. A guest has no name, no points ledger row, no streak.

**Why not Supabase anonymous users.** They would put a row in `auth.users` for every guest, which nothing cleans up (source: "currently not available"), share Auth's 30-per-hour-per-IP limit with real sign-ins (our server calls Auth, so every guest would count as Vercel's one address; compare `src/lib/auth-limits.ts:2-4`), and every account route would have to learn to refuse a guest. Answer 9 keeps nothing about a guest, so they need no account. Trade-off: we build our own small run store (below). If the human prefers Supabase's guests, this ticket is rewritten; nothing here is shared with it.

**How a guest run is stored: separate guest tables (recommended).** Read 2026-11-11, the run rules sit on tables keyed by `auth.users`: `private.run` has `user_id uuid not null references auth.users` in its primary key (baseline, line 163); `run_event` and `question_open` follow it; the order, time and "over" rules are triggers on those tables (`check_run_event`, `check_question_open`, baseline lines 962 and 997); `run_status` is a view over them; the live-board broadcast fires on every insert (baseline lines 2970-2978); `settleRuns`, `delete_account` and every board read assume a player. So:
- *A. Separate guest tables (recommended):* `private.guest_run` (token hash, game, date pinned by `private.today()` at start, `started_at`), `guest_run_event`, `guest_question_open`, and a `guest_round_word` for game 2 with the same shapes as game 2's tables. No foreign key to `auth.users`, no board broadcast, no ledger, no `delete_account` path. Trade-off: the order and clock rules (OB002, OB003, OB005, OB006, and game 2's lockout and round rules) must be written again for these tables. To stop the two copies drifting, 18b writes each rule as one function that both triggers call, and pgTAP runs the same cases on both. That edits the baseline's functions, so it is part of the security review.
- *B. A nullable owner in the existing tables:* one set of rules. Rejected: the owner is in the primary key, and every board, settle, comment and delete read would need a "not a guest" filter. One missed filter shows a guest as a player. That is the failure the lead's direction wants impossible.
- *C. The whole run held in a signed cookie, no guest table:* nothing to purge. Rejected: a guest can send an old cookie again to undo a death or answer a question twice, and one bot check could start unlimited runs. The server must hold the run to check it "exactly like a signed-in run".

**The token.** At start the database makes `gen_random_uuid()` (Postgres built-in; a random version 4 value, so no length is chosen by us: PostgreSQL 17 docs, *unverified* until quoted in 18a). The route sets it in a cookie with `httpOnly`, `secure`, `sameSite: "lax"`, `path: "/api/guest"` and no max-age (a session cookie), following the Next.js `cookies` page above. Only the cookie's hash is stored (as `private.auth_attempt` stores hashed keys, baseline line 116). Because the path is `/api/guest`, the browser doesn't send it to account routes; and account routes read only the Supabase session through `requireUserId` (`src/lib/auth.ts:36`), which stays untouched. A guest token is never an account's ID and no account route reads it. Guest routes never call `requireUserId` and read no Supabase session.

**Guest routes (new, separate):** `/api/guest/run`, `/start`, `/answer`, `/next` for game 1 and `/api/guest/substrings/...` for game 2, each wrapped by `handle` and `checkProtocol` like today's. The screens call fixed `/api/run...` paths today (`src/app/game.tsx:65, 92, 194, 210-212`; `src/app/home.tsx:555, 598`; `src/app/shell.tsx:344`), so 18c gives the game screen one prefix to pick the route family; *unverified* how much of `game.tsx` assumes a profile until 18c reads it.

**Same rules as a signed-in run.** The matching, stolen letters, host answers and 20-second clock are the same functions (`resolveTyped`, `stolenLetters`, `private.question_deadline`). One run per token and game; starting again while one is open returns it (as `startRun`, `src/game/runs.ts:194`). After a run ends, a new start needs a new bot check and a new run: replay freely (answer 13). Deviation from game 1's "resume yesterday's run" (`runs.ts:175`): a guest run left over midnight is not resumed; it is purged.

**What is kept: a tally with no run.** Rarity reads only counts per (category, entry) and per (day, question, entry), never a player: `pooledCounts` groups `private.run_event` by category and entry (`src/game/ledger.ts:59-85`), `dayCounts` by day, question and entry (`ledger.ts:90-105`). So each guest answer adds 1 to `private.guest_tally (game_id, puzzle_date, question_idx, entry_id, n)`, in the same transaction as its `guest_run_event` row, so a retry never counts twice. The tally holds no run, token, time or order. It is a counter rather than one row per answer, so row order and timestamps can't be used to rebuild a run. `pooledCounts` and `dayCounts` then add `guest_tally` to what they read, so answer 7 holds for the provisional bonus, the final bonus, and the "how many gave this answer" shares. Guest answers don't go through `settleRuns`: there is no ledger row to write. A guest answer given after the day's midnight is not counted, as `private.day_of(created_at) = puzzle_date` drops it for players today (`ledger.ts:66`).

**Game 2 has no rarity count.** Read 2026-11-11: `src/game/substring-runs.ts` and `substring-state.ts` read only the player's own `round_word` rows, and its standing is a percent among finished players' scores, not a count of words. So a guest's words leave nothing behind, and no `guest_round_word` row outlives the run. A guest sees game 2's percent among players, read only (answer 20).

**When a guest run ends, what is discarded.** The run rows (`guest_run`, events, opens, round words) are deleted when the run is over, in this order: (1) the answer or try that ends it (a catch, the last question or round) builds the result, returns it once, and deletes the run's rows in the same transaction; (2) a run whose clock ran out is found over on its next read (`timed_out`) and deleted the same way; (3) every guest start first deletes every guest run of a day that has closed (midnight Pacific, `private.next_reset`), because nothing is scheduled in this app (`ledger.ts:1-9`) and a reveal has no clock (`runs.ts:130`), so a run left at a reveal never ends by itself. This needs no new number. The cost: an abandoned run's rows, which link a hashed token to its answers, can sit up to the end of its day. They never join the tally with a link. The human accepted that (answer 17). The `plor_app` role has only select and insert on the run tables today (baseline line 2859); the guest tables need delete, a new grant.

**The bot check.** The guest start route reads a Turnstile token from the browser, posts it with the secret to Siteverify, and creates the run only on `success: true`. A failed check, a repeated token (`timeout-or-duplicate`), a missing token, or Siteverify being unreachable (network error, non-200, bad JSON) each stop with an error and create nothing: 400 `captcha_failed`, or 503 `captcha_unavailable` for unreachable, logged and counted (`log.warn`/`log.error`, as `authFailure` does, `auth.ts:47`). No silent pass. The widget is Managed mode (answer 16) on the guest start button; its script loads from `challenges.cloudflare.com`. No Content-Security-Policy was found in `next.config.ts`, `vercel.json` or `src` (grep 2026-11-11); if one appears later it must allow that host. Only the start is checked: the run token is the proof afterward. Keys: the site key is public and the secret key is a server-only variable in `src/config/env.ts`, which refuses to boot when either is missing; local and CI use Cloudflare's published test keys (values are in the Turnstile testing page, not secrets). The widget and routes are not split: the start route is born with its check, so no guest route is ever reachable unchecked.

**Answer length (audit W1).** `/api/run/answer` checks `text.trim() === ""` but no length before matching (`src/app/api/run/answer/route.ts:13-14`); the only 40-character rule is the table check `missed_answer_typed_length` (baseline line 488), reached after matching, and a hard-coded `> 40` in `reportTestMiss` (`runs.ts:419`). The guest answer route refuses text over 40 characters with 400 `text_invalid` before any matching. The signed-in route gets the same line as its own small ticket, not here; the two routes share no code path (the guest one calls its own function), so nothing here forces it. *Unverified:* JavaScript length counts UTF-16 units and Postgres `char_length` counts characters, so 18c compares them with an emoji case.

**Guest misses.** Text that names no entry is a free retry and not stored for a guest. Signed-in misses feed learning by distinct players (`private.record_miss`, `runs.ts:330`), which needs an identity; answer 9 keeps answers only. The human confirmed (answer 19).

**The peek and pages.** After a run the guest sees their result and a "Make an account to keep your streak, see your friends and play today's game for points" panel over a drawn stand-in, blurred, of a streak, a friends board and a calendar (answer 15; made of fixed shapes, no fetch). Signing up goes through the existing sign-in, and then starts clean (answers 3 and 9). A guest who signs up the same day may play today's game for points (answer 14); no rule stops it, so nothing is built for it, but 18e's e2e proves it. Group invite pages (`src/app/(shell)/g/[code]/page.tsx`) keep sign-up first, with a "play today's game as a guest" link that goes to the front page. The front page's text "Sign in to play" (`src/app/(shell)/page.tsx`) gains a guest button for signed-out visitors. The privacy page changes before launch (see acceptance).

## Security changes proposed (for DECISIONS.md, reviewed before any code)
1. Player identity (Hard to reverse): replace "No anonymous or guest users" and the "Changing in M15" text. New text: sign-in is required for everything except guest play, which uses no account; a guest is a keyless run held by a hashed random token, never an `auth.users` row.
2. New tables `guest_run`, `guest_run_event`, `guest_question_open`, `guest_round_word`, `guest_tally`, each with RLS and one `plor_app` policy per command, no policy for other roles (as Row-level security in `private`); pgTAP checks that none references `auth.users` and none has a broadcast trigger.
3. Grants: `plor_app` selects and inserts on the guest run tables and may delete from them (new: today it can't delete from the run tables); on `guest_tally` it may select, insert and update `n` only. The tally has no way to read a run.
4. The shared order and clock rules become functions called by both sets of triggers (edits to baseline functions).
5. Turnstile secret key: only in Vercel env vars and the human's password manager; `.env.local` and CI hold Cloudflare's published test keys only.
6. Guest routes read no Supabase session and set only the path-scoped guest cookie; no account route reads it (checked by test).
7. `readServerEnv` now needs the two Turnstile variables.

## Acceptance criteria
Each can be checked by a command or an e2e.
- [ ] DECISIONS.md holds the security changes above, reviewed by the `reviewer` agent, before the first migration is written (diff of `docs/DECISIONS.md` in 18a).
- [ ] A guest cookie sent to each account route (`/api/run`, `/api/run/start`, `/api/friends`, `/api/groups`, `/api/profile`, the comment, reaction and board routes) gets 401 `not_signed_in`; a script lists every route directory and a test calls each.
- [ ] After a guest run ends (caught, finished, timed out, or its day closed), no row in the guest tables carries its token hash, and `guest_tally` has no column that names a run, token, time or order (`information_schema` query in pgTAP; a db test plays a run and counts rows).
- [ ] After a closed day, the next guest start deletes every guest run of that day.
- [ ] Rarity includes guests: a db test gives 5 guest answers to one entry and sees `pooledCounts` and `dayCounts` change by exactly those 5, and the result's share use them (ANSWER_SHARE_MIN_PLAYERS applies to the sum).
- [ ] A retried guest answer for the same question counts once.
- [ ] Guests' order, clock and "over" rules match signed-in ones: the same pgTAP cases (late answer OB005, out of order OB002, after a catch OB003, before Next OB006) pass on both table sets; game 2's lockout and round rules likewise.
- [ ] A guest answer over 40 characters is refused with 400 `text_invalid` before matching (a test with a spy on `resolveTyped` that it isn't called).
- [ ] A failed bot check (always-fail test secret), a repeated token, a missing token, and Siteverify unreachable each return an error and create no `guest_run` row (db count before and after). Unreachable is tested by making the call to Cloudflare fail, the only stub, at the network edge.
- [ ] The e2e plays a whole guest run in game 1 and game 2 with the always-pass test keys, sees the result, the blurred stand-in and the share button, and finds no friends, groups, Me or settings; another e2e with the force-interaction key shows the box and starts after it is ticked.
- [ ] A guest who signs up the same day starts clean (no streak, no totals) and can play today's game for points (e2e).
- [ ] The group invite page for a signed-out visitor shows sign-in first and a guest link.
- [ ] `readServerEnv` refuses to boot without the Turnstile variables (extend `src/config/env.test.ts`).
- [ ] The privacy page (`src/app/privacy/page.tsx`) names what a guest leaves (their answers, with no one attached) and the Cloudflare check, reviewed by the human; the text is not written in this ticket.
- [ ] The Turnstile secret appears in no file, log or test output (`git grep` for the variable's value and a log check).

## Out of scope
- Any guest name, streak, totals, history, ledger row, friends, groups, comments, reactions or boards (answers 6, 9).
- Supabase anonymous sign-ins and their rate limit (above).
- Removing friend invite links (M17 17c).
- The signed-in `/api/run/answer` length fix (its own small ticket from audit W1).
- Real-data peeks (answer 15) and merging a guest's run into a new account (answer 9).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 40 characters | Longest typed answer, refused before matching | `missed_answer_typed_length` (baseline line 488); `runs.ts:419`; M02 ticket, Numbers. Not in `tunables.ts` today; 18c should import it from there or share one helper (*unverified* where the M02 number was set) |
| 20 seconds | A guest question's clock | `private.question_deadline`; DECISIONS.md, Game 1, Timer (reused) |
| 7 questions, 7 rounds | A run's length | `QUESTIONS_PER_DAY`; DECISIONS.md, Game 2 (reused) |
| 300 seconds | A Turnstile token's life | Cloudflare, server-side validation (a fact; we set nothing) |
| ANSWER_SHARE_MIN_PLAYERS (5) | Guests count toward it | `tunables.ts`, M11 H5 (reused) |
| No token length, no cookie lifetime | Token is `gen_random_uuid()`; cookie is a session cookie | No number chosen |

**Numbers still needed from the human:** none (answers 17 and 18 chose the options that need no number).

## Open questions for the human
Answers 17 to 20 settled four of the draft's five. One is left, for the approval:
1. **A guest closes the tab before the result shows.** Proposed: it is gone (answer 9: "sees their result once"). Keeping it a short while would need a number from the human and a longer link to the token.

## Plan
One PR per sub-ticket, each from `m18-guest-play`. Smallest safe order:
1. **18a, the decision (no code):** DECISIONS.md's Player identity row and the security changes above; the `reviewer` agent reviews them; the human approves. Also a short check, in the proxy and `getClaims`, that a request with no Supabase cookie raises no error (`src/proxy.ts:32` logs a warning on any error; *unverified*).
2. **18b, data:** migration, grants, RLS, shared rule functions, pgTAP; `pooledCounts` and `dayCounts` read `guest_tally`; db tests. Hypothesis: the rarity numbers move by exactly the guest answers; disproved if any existing test changes.
3. **18c, game 1 guest play with the bot check:** Turnstile verification, env, test keys, the guest routes, the game screen's route prefix, front-page button, answer length refusal. The bot check lands here, with the first guest route, so none is ever reachable without it. On a deployed site this PR must not be merged before the human has made the Cloudflare widget and set the secret (below).
4. **18d, game 2 guest play:** its routes and tables' use; same check.
5. **18e, the peek and pages:** result with share, the stand-in, the sign-up panel, the group invite link, the privacy page text, DESIGN.md, ROADMAP and HANDOFF.
Each PR updates this ticket's Status and the ROADMAP row (CLAUDE.md, "Done means").

**What only the human can do.** Before 18c is merged to anything deployed: create the Cloudflare account and a Managed widget with the site's hostnames, put the secret in Vercel env vars and the password manager, give the site key to Vercel. Before the beta: approve the privacy text. Until M14, M16 and M17 are done (ROADMAP, Focus: nothing goes to the hosted database or plor.app before then), nothing here touches the hosted database or plor.app.

## Removes
- DECISIONS.md, Player identity: the words "No anonymous or guest users" and "Changing in M15 ... until then this row stands". (The Log entries from 2026-10-17 and 2026-10-22 stay: they are history.)
- ROADMAP's three different mentions of guest or anonymous play: Focus (line 44, "guest play"), Design review item 3 (line 51, "Anonymous play (M15)"), and the M15 row's "anonymous play first" (line 84), each replaced by a pointer to this ticket.
- Code: nothing is removed, because this adds a capability and no existing path does what a guest needs. (18e may delete the "Sign in to play" wording the front page replaces.)

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
