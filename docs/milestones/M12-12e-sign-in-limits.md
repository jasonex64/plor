# M12 12e — Sign-in code limits

**Status:** planned: draft sub-ticket for the human's approval, 2026-10-23 (human, 2026-10-23: "also work on fixing sign-in code check vulnerabilites"). L1–L4 and every number below wait on the human. No code before they're answered.

## Goal
No one can guess another player's sign-in code, or use up sign-in for everyone, however many requests they send.

## Who uses it / what breaks without it
- **Used by:** every player signing in by email code, and the human, whose closed beta (M15) is the first time strangers can reach sign-in.
- **Breaks without it** (open since M02 2f; the human accepted it for the playtest only, 2026-10-20; DECISIONS.md Log; ROADMAP "Next revision", For M15; more urgent since the repo went public, 2026-10-23):
  - **Everyone can be locked out.** Our routes call Supabase Auth from the server, so Auth's per-IP limits count Vercel's address, not each player's (SOURCES.md, Supabase email sending and Auth limits: `/rate-limits`, "IP address forwarding"). They are shared by every player:
    - code emails: 30 per 5 minutes;
    - code checks: 30 per 5 minutes;
    - session refreshes: 150 per 5 minutes.
    One person sending requests in a loop uses them up, and then nobody can sign in, or stay signed in.
  - **A code can be guessed.** A code is 6 digits and lasts an hour, and a wrong guess doesn't use it up (M02 2f, hypothesis 3). Whether Auth limits attempts per address is *unverified*. Today the shared limit is the only brake.
  - **The code emails can be used up.** Anyone can ask for codes to any address. Auth allows one per address per 60 seconds (SOURCES.md, email sign-in), but nothing stops one person asking for many addresses, and our mail sender has a daily quota (SOURCES.md, Resend: 100 a day on the free plan).

## Claude's design (for the human to approve)
- **L1 — how each player gets their own limit.**
  - (a) **Our own limits, before Auth is called.** A table, `private.auth_attempt (kind, key, at)`, and a guarded function, `private.take_auth_attempt(kind, key)`. The function records an attempt and refuses one over the limit, deleting rows older than their window as it goes. The two routes check it before calling Auth:
    - **Sending a code:** per player IP and per email address.
    - **Checking a code:** per player IP, plus wrong codes per email address. After the limit, that address needs a new code.

    The player's IP is the address Vercel reports for the request (`ipAddress()` from `@vercel/functions` 3.10.1, which reads Vercel's `x-real-ip` header; whether Vercel's header can be spoofed is *unverified* until its docs are added to SOURCES.md). Then Auth's own limits are raised in the hosted settings, so a shared bucket only runs out under a flood from many addresses. A new table and grants are a security change.
  - (b) **Forward each player's IP to Auth** with the `Sb-Forwarded-For` header, so Auth's own limits count each player. Supabase supports this only with a **secret API key** in the app, and IP forwarding switched on in the dashboard. A secret key can do anything (CLAUDE.md, Least privilege; M12 A7 turned it down for the same reason). It also limits nothing per email address, so guessing one player's code from many addresses stays open.
  - (c) **Vercel Firewall rate-limit rules** on `/api/auth/*`, set in the Vercel dashboard. They aren't in the repo or tests, and Vercel's firewall docs aren't in SOURCES.md.

  **Claude's suggestion:** (a), and raise Auth's limits.
- **L2 — what a refused request gets.** 429 `too_many_attempts`, and the form says to wait, or to ask for a new code. Each refusal is logged through the one logger with its kind and a hash of the key (never the email itself), so a flood shows in the Vercel logs (CLAUDE.md: retries and limits are logged and counted).
- **L3 — session refreshes.** The proxy refreshes sessions from the server too, so 150 per 5 minutes is shared by every signed-in player. Raising that limit in the hosted Auth settings (a number) is part of this ticket. Whether the beta's size comes near it is for the M15 load test.
- **L4 — where it goes.** Claude suggests 12e, before 12d: it closes a security hole that is now readable in a public repo, and 12d is three game fixes. Or after 12d, as M12's last sub-ticket.

## Numbers (all human numbers; none is picked here)
| Value | Used for | Origin |
|---|---|---|
| Code emails per player IP, and the window | Sending (L1 a) | *the human* |
| Code emails per email address, and the window | Sending (L1 a) | *the human* (Auth already allows 1 per 60 s per address) |
| Code checks per player IP, and the window | Checking (L1 a) | *the human* |
| Wrong codes per email address before a new code is needed | Checking (L1 a) | *the human* |
| Auth's hosted limits for sign-ins, verifications and token refreshes | L1 a, L3 (the dashboard's Rate Limits page) | *the human*; today the defaults: 30, 30 and 150 per 5 minutes |

## Source
- SOURCES.md, Supabase email sending and Auth limits (`/rate-limits` at `07e69b9`): the per-IP token buckets, the defaults, "IP address forwarding" (`Sb-Forwarded-For`, a secret API key only, off by default).
- SOURCES.md, Supabase email sign-in: one code per address per 60 s; codes last 1 hour.
- SOURCES.md, Vercel functions package (`@vercel/functions`): `ipAddress()` is in the package, but the row lists only `attachDatabasePool`. **Missing, for the human to add:** Vercel's request headers page (whether `x-forwarded-for` and `x-real-ip` are set by Vercel and can't be spoofed). L1 (a) waits on it.
- DECISIONS.md: Sign-in, Logging, Error handling, Row-level security in `private`, App database role; the Log entry accepting the risk for the playtest (2026-10-20).
- `docs/milestones/M02-2f-cleanup.md`, Review, blocking finding 1 (the guessing risk).

## Acceptance criteria
Written once L1–L4 and the numbers are answered. With L1 (a) they will cover:
- the table, function and grants (pgTAP);
- each limit refusing exactly one attempt past its number, and allowing again after its window (db tests at both edges, as M02 2f B6 does for lengths);
- a new code resetting the wrong-code count;
- the 429 and its log line (route db test);
- a flood from one address leaving another address able to sign in (route db test with two forwarded IPs).

## Out of scope
- Limits on game requests (`/api/run/answer`): the same ROADMAP item, but not sign-in; it stays with M15's load test.
- CAPTCHAs (Supabase supports them, but nothing here needs one if L1 holds).
- Revoking the legacy JWT secret (ROADMAP, For M15): a dashboard action, unrelated to codes.

## Plan
1. The human answers L1–L4, gives the numbers, and adds Vercel's request headers page to SOURCES.md.
2. **Hypothesis check** on the local stack: a wrong code doesn't use up the right one (M02 2f, hypothesis 3, observed then). Also check whether Auth limits wrong codes per address on its own. Expected: no per-address limit beyond the per-IP bucket. *Disproved if* the right code stops working after some number of wrong ones. Then that number is Auth's, and our per-address cap is recorded against it.
3. Tests first, then the migration, `take_auth_attempt`, the two routes and the form's message, on `m12-account`, with one PR.
4. The human raises Auth's hosted limits (L1 a, L3) after it merges.

## Removes
- The DECISIONS.md Log's playtest-only acceptance of the guessing risk, replaced by this sub-ticket's entry.
- ROADMAP "Next revision", For M15: the email-code verify route's half of the rate-limit item.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
