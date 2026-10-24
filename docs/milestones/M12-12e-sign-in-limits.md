# M12 12e — Sign-in code limits

**Status:** done (2026-10-24): merged in PR #62 on green CI, with the human's approval of its security change (2026-10-24: "Yes, merge it"). L5 is accepted for the closed beta, a CAPTCHA decided before launch (human, 2026-10-24). Auth's hosted limits are set in the Supabase dashboard (N5, N6; human, 2026-10-24: "supabase limits are updated").

## Goal
No one can guess another player's sign-in code, or use up sign-in for everyone, however many requests they send. *(As built, guessing and code checks are closed, and so is one address flooding sign-in. Using up the code emails from many addresses is accepted for the closed beta: L5.)*

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

  **Claude's suggestion:** (a), and raise Auth's limits. **Answer: (a)** (human, 2026-10-23: "12e L1: (a), our own limits in Postgres with no secret key").
- **L2 — what a refused request gets.** 429 `too_many_attempts`, and the form says to wait, or to ask for a new code. Each refusal is logged through the one logger with its kind and a hash of the key (never the email itself), so a flood shows in the Vercel logs (CLAUDE.md: retries and limits are logged and counted). **Answer: as suggested** (human, 2026-10-23: "12e numbers: use Claude's suggested values for all six, and L2–L4 as suggested").
- **L3 — session refreshes.** The proxy refreshes sessions from the server too, so 150 per 5 minutes is shared by every signed-in player. Raising that limit in the hosted Auth settings (a number) is part of this ticket. Whether the beta's size comes near it is for the M15 load test. **Answer: part of 12e, with N6** (human, 2026-10-23: "12e numbers: use Claude's suggested values for all six, and L2–L4 as suggested").
- **L5 — the code emails can still be used up (review, 2026-10-24; for the human).** Auth sends at most 30 emails an hour for the whole project with custom SMTP (SOURCES.md, Supabase email sending, "custom SMTP starts at 30 per hour"), and Resend's free plan 100 a day. N1 lets each IP send 5 an hour, so about six addresses can use up the hour for everyone, and one address can use up Resend's day in 20 hours. With IPv6 one person may hold many addresses (whether Vercel serves IPv6 is *unverified*). Options:
  - (a) Accept it for the closed beta, in writing, and revisit before launch (M15).
  - (b) Count IPv6 by its /64 prefix. It narrows the gap but doesn't close it; the prefix length is a human number.
  - (c) A CAPTCHA on sending a code. Supabase Auth supports one, but it's a new third party and a new source, which is a ticket of its own.
  - (d) Raise the caps: Auth's hourly email limit in the dashboard and a paid Resend plan. That costs money and only moves the line.

  **Claude's suggestion:** (a) for the beta, with (c) decided before launch. **Answer: (a)** (human, 2026-10-24: "(a) Accept for beta", chosen from Claude's options: accept it in writing for the closed beta and decide a CAPTCHA (c) before launch, M15).
- **L4 — where it goes.** Claude suggests 12e, before 12d: it closes a security hole that is now readable in a public repo, and 12d is three game fixes. Or after 12d, as M12's last sub-ticket. **Answer: before 12d** (human, 2026-10-23: "12e numbers: use Claude's suggested values for all six, and L2–L4 as suggested").

## Numbers
| # | Value | Used for | Origin |
|---|---|---|---|
| N1 | Code emails per player IP: **5 per hour** | Sending (L1 a) | human, 2026-10-23: "12e numbers: use Claude's suggested values for all six, and L2–L4 as suggested". Claude's reason: Resend's free plan sends 100 a day (SOURCES.md), and 5 covers a household on one connection or a few mistyped addresses |
| N2 | Code emails per email address: **5 per hour** | Sending (L1 a) | Same answer. Auth's own 1 per 60 s per address stays underneath |
| N3 | Code checks per player IP: **30 per 5 minutes** | Checking (L1 a) | Same answer. Auth's default per-IP verification limit (SOURCES.md, `/rate-limits`), applied to each player |
| N4 | Wrong codes per email address before a new code is needed: **5** | Checking (L1 a) | Same answer. With N2, at most 25 guesses an hour at a 1-in-a-million code |
| N5 | Auth's hosted limits on sign-ins and on verifications: **300 per 5 minutes each** | L1 a (the dashboard's Rate Limits page) | Same answer: 10× the defaults of 30; M15's load test sets the real size |
| N6 | Auth's hosted limit on token refreshes: **1,500 per 5 minutes** | L3 (the same page) | Same answer: 10× the default of 150 |

## Source
- SOURCES.md, Supabase email sending and Auth limits (`/rate-limits` at `07e69b9`): the per-IP token buckets, the defaults, "IP address forwarding" (`Sb-Forwarded-For`, a secret API key only, off by default).
- SOURCES.md, Supabase email sign-in: one code per address per 60 s; codes last 1 hour.
- SOURCES.md, Vercel functions package (`@vercel/functions` 3.10.1): `ipAddress()`, which reads `x-real-ip` (installed `headers.js`).
- SOURCES.md, Vercel request headers (added human, 2026-10-23: "OK: add the Vercel request headers row to SOURCES.md"): `x-forwarded-for` is "the public IP address of the client"; Vercel overwrites it and does "not forward external IPs", to "prevent IP spoofing"; `x-real-ip` is identical. Plor has no proxy in front of Vercel.
- DECISIONS.md: Sign-in, Logging, Error handling, Row-level security in `private`, App database role; the Log entry accepting the risk for the playtest (2026-10-20).
- `docs/milestones/M02-2f-cleanup.md`, Review, blocking finding 1 (the guessing risk).

## Acceptance criteria
- [x] **The database counts attempts** (pgTAP, `supabase/tests/auth_attempt.test.sql`): `private.auth_attempt (kind, key, at)` keeps only hashed keys. `private.take_auth_attempt(kind, key, limit, window)` runs with its owner's rights, an empty `search_path` and a per-key lock. It allows exactly `limit` attempts in `window` and refuses the next, without recording a refusal. It allows again once the oldest attempt is older than `window`, and clears that kind's expired rows as it goes. `private.clear_auth_attempts(kind, key)` empties one key. `plor_app` may execute both functions and gains nothing else (the grant list).
- [x] **Sending a code** (`POST /api/auth/email`; route db test): from one player IP, the first N1 (5) code requests in an hour reach Auth and the next gets 429 `too_many_attempts` without reaching it. To one address, the first N2 (5) do and the next gets the same 429. A refusal for one IP leaves another IP free. A sent code resets the address's code checks.
- [x] **Checking a code** (`POST /api/auth/email/verify`; route db test): from one player IP, N3 (30) checks in 5 minutes reach Auth and the next gets 429. For one address, after N4 (5) wrong codes the next check gets 429 even with the right code. A new code then signs in.
- [x] **The player's IP** is the first entry of `x-forwarded-for`, which Vercel sets and overwrites (SOURCES.md, Vercel request headers) and `next dev` fills in from the connection (Next.js 16.4.2 `base-server.js`). A request without it is a logged 500, not a shared key (route test).
- [x] **Each refusal is logged** at warn level with its kind and the first 8 characters of the hashed key, never the email or IP (route db test reads the log line).
- [x] **The form says what to do** (`too_many_attempts`: wait a while, or ask for a new code), and e2e sign-ins still pass, each player on its own forwarded IP.
- [x] **The privacy page** says sign-in keeps a scrambled form of your IP address and email for about an hour to stop abuse, and its date changes.
- [ ] **The hosted limits** (N5, N6) are set by the human in Supabase's dashboard after the merge (Evidence: the human's word, or a screenshot of the Rate Limits page).

## Out of scope
- Limits on game requests (`/api/run/answer`): the same ROADMAP item, but not sign-in; it stays with M15's load test.
- CAPTCHAs (Supabase supports them, but nothing here needs one if L1 holds).
- Revoking the legacy JWT secret (ROADMAP, For M15): a dashboard action, unrelated to codes.

## Plan
1. ~~The human answers L1–L4, gives the numbers, and adds Vercel's request headers page to SOURCES.md~~ (done, 2026-10-23).
2. **Hypothesis check** on the local stack: a wrong code doesn't use up the right one (M02 2f, hypothesis 3, observed then). Also check whether Auth limits wrong codes per address on its own. Expected: no per-address limit beyond the per-IP bucket. *Disproved if* the right code stops working after some number of wrong ones. Then that number is Auth's, and our per-address cap is recorded against it.
3. Tests first, then the migration, `take_auth_attempt`, the two routes and the form's message, on `m12-account`, with one PR.
4. The human raises Auth's hosted limits (L1 a, L3) after it merges.

## Removes
- The DECISIONS.md Log's playtest-only acceptance of the guessing risk: the 2026-10-24 entry replaces it (the Log keeps both).
- ROADMAP "Next revision", For M15: the email-code verify route's half of the rate-limit item.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| L1 (a): "`ipAddress()` from `@vercel/functions`" | `clientIp` reads `x-forwarded-for`'s first entry | `ipAddress()` reads `x-real-ip`, which `next dev` never sets, so local sign-in and the e2e suite would have no IP. Vercel's docs say the two headers are identical and both overwritten (SOURCES.md, Vercel request headers), and `next dev` fills `x-forwarded-for` from the connection (Next.js 16.4.2, `server/base-server.js:567`; observed: a request with no header was keyed by `::1`) |
| N1: "code emails per player IP"; N2: "code emails per email address" | N2 counts codes Auth actually sent: the address's count is taken first and given back when Auth refuses or the IP is over its limit. N1 counts every request that reached Auth, whatever Auth answered | **Review finding 2.** Counting before Auth answered let a double tap, or a send Auth refused, use up a player's count, and let someone who knows an address lock its owner out. N1 still counts refusals, because each one spends Auth's shared per-IP bucket. A request refused for its address never reaches Auth, so it doesn't count against the IP |
| N4: "wrong codes per address" | Every check per address is counted, before Auth says whether it's right | Auth's answer comes after the check, and counting first means a 6th guess never reaches Auth. A right code ends the sign-in, so in practice only wrong codes are ever counted toward the limit |
| Plan: keys hashed | SHA-256 without a salt | A salt is a new secret (CLAUDE.md, Security). An IPv4 hash can be reversed by trying all addresses, but the hash only lives about an hour and only in our database; the privacy page calls it scrambled, not anonymous |

## Evidence
**2026-10-24, on the Mac's local stack, migration `20261024000629_auth_attempts.sql` applied:**
- **Plan step 2, the hypothesis** (a scratch script, one throwaway user, 0 left afterwards): 25 wrong codes each got `403 otp_expired` (the same answer as an expired code), then the right code signed in. So Auth has no per-address cap up to 25, and N4 is the only one.
- **The database** (criterion 1): `npx supabase test db supabase/tests/auth_attempt.test.sql supabase/tests/plor_app_role.test.sql supabase/tests/private_schema.test.sql` → `Files=3, Tests=39`, `Result: PASS`. Its 15 checks: both functions' rights and `search_path`; `plor_app`'s execute only; a raw IP and an unknown kind refused; 3 of a limit of 3 allowed and the 4th refused and not recorded; another key apart; an attempt a window old no longer counting and cleared; another key's expired rows cleared; clearing one key only.
- **The routes** (criteria 2–5): `npx vitest run src/app/api/auth/email --reporter=verbose` → `Tests 7 passed (7)`:
  - N1: with 4 already counted, the 5th code from one IP was sent and the 6th refused (429, no email), and another IP still got one.
  - N2: with 4 counted for an address, the 5th was sent and the 6th, from another IP and in capitals, was refused (1 email).
  - L2: the refusal's log line has `kind: send_email` and the key's first 8 hex characters, and contains neither the address nor the IP.
  - No `x-forwarded-for`: 500.
  - N4: 5 wrong codes got 403, the right code then got 429, and a new code 1.1 s later signed in.
  - N3: with 29 checks counted for an IP, the 30th reached Auth (403) and the 31st got 429.
- **The checks catch a missing limit:** with the per-address check taken out of the verify route, the N4 test failed (`Tests 1 failed | 2 passed`); restored.
- **Without a forwarded IP on `next dev`** (criterion 4): `curl -X POST localhost:3000/api/auth/email` with no `x-forwarded-for` → `{"ok":true} HTTP 200`, and the stored key's prefix `eff8e7ca` is the hash of `::1`. The row was deleted after.
- **Everything else:** `npm run lint` clean (after renaming the e2e helper `usePlayerIp`, which the React hooks rule took for a hook, to `forwardPlayerIp`); `npx tsc --noEmit -p .` clean; `npm test` → `Tests 236 passed (236)`; `npm run test:sql` → `Files=16, Tests=257`, `Result: PASS`; `npm run test:db` → `Test Files 29 passed (29)`, `Tests 198 passed (198)`; `npm run test:e2e` → `9 passed (20.2s)`, each player on its own forwarded IP.
- **After the review** (migration `20261024001501_auth_attempt_give_back.sql`):
  - `npx vitest run src/app/api/auth/email src/lib/auth-limits.db.test.ts --reporter=verbose` → `Tests 10 passed`. Added: a second tap within Auth's wait got Auth's own 429 (`over_email_send_rate_limit`), and the address held 1 count while the IP held 2. A request refused for its address left its IP at 0.
  - **Concurrency:** 20 connections took one key at once with a limit of 3, and exactly 3 were allowed and 3 rows stored. With the advisory lock taken out of the local function, the same test let 15, 20 and 20 through on three runs. With the lock restored, it passed.
- **Full suites after the review:** `npm run lint` and `npx tsc --noEmit -p .` clean; `npm test` → `Tests 236 passed (236)`; `npm run test:sql` → `Files=16, Tests=257`, `Result: PASS`; `npm run test:db` → `Test Files 30 passed (30)`, `Tests 201 passed (201)`; `npm run test:e2e` → `9 passed (17.7s)`.
- **Criterion 8 waits on the human:** in the Supabase dashboard, Authentication → Rate Limits, set sign-ups and sign-ins to 300 and token verifications to 300 per 5 minutes (N5), and token refreshes to 1,500 per 5 minutes (N6).

## Review
**12e** (reviewer, fresh context, 2026-10-24). The counting is sound: the hashed keys, the email key, the per-key lock and the grants all held. It tried case, whitespace and Unicode forms of an address against the local GoTrue v2.197.0: upper and lower case get the same answer, and the odd forms are refused with 422, so `emailKey` can't be dodged. It also checked that Vercel's header can't be spoofed.
- Blocking findings and how each was fixed:
  1. **The code emails can still be used up from a few addresses**, and the Goal claimed otherwise. Not fixable without the human: it's L5, accepted for the closed beta (human, 2026-10-24), and the Goal now says what's open.
  2. **N1 and N2 counted requests, not emails.** A double tap, or a send Auth refused, used up the address's count. Fixed with the give-back (Source diff), with two new route tests.
  3. **The per-key lock had no test.** Added `src/lib/auth-limits.db.test.ts`; without the lock it fails.
  4. **The Status line and the handoff were stale.** Both rewritten.
- Deferred to ROADMAP "Next revision", For M12:
  - other test files leave their sign-in counts behind;
  - N4's "25 guesses an hour" is really up to 30;
  - players behind one shared connection share N1;
  - the missing-IP test doesn't read its log line;
  - the privacy page's "next time anyone signs in" is approximate.
