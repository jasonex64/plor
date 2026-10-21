# M02 2f — Cleanup of the code items in "Next revision"

**Status:** in review (Part A). Drafted by Claude on 2026-10-20 at the human's request ("fix the open next revision items"). **Approved by the human on 2026-10-20**, keeping the *low* items, with A3 (the 6-digit email code) added to Part A. Part A is on branch `m02-sign-in-and-play`. Nothing here needs a new number.

## Goal
Fix the open ROADMAP "Next revision" items that are code or tests and need no human decision, so the list holds only real decisions and future-milestone work.

## Who uses it / what breaks without it
- Used by: playtesters (part A), the human when publishing and reading insights, and every later session that runs the tests.
- Breaks without it: per item, in the tables below. Items that break nothing today are marked *low* and can be dropped instead of fixed if the human prefers (CLAUDE.md: "If the answer is 'nothing yet', don't build it").

## Source
- Each item's own text and citation in ROADMAP "Next revision" (copy it into the commit message).
- DECISIONS.md: errors, logging, tests, database access (for every item); Game 1 and the answer model (validator items).
- A1: Supabase JWT Signing Keys, "Choosing the right signing algorithm" (added to SOURCES.md with the human's approval, 2026-10-20), and `getClaims` in `@supabase/auth-js` 2.118.0 (`src/GoTrueClient.ts`; SOURCES.md "Supabase client").
- A2: `handleError` in `@supabase/auth-js` 2.118.0 (`src/lib/fetch.ts`): any 5xx from Auth, or a request that never got a response, becomes an `AuthRetryableFetchError` with no error code.
- A3: Supabase passwordless email, "With OTP" (steps 1 and 2), and email templates, "Email prefetching" option 1 and the `{{ .Token }}` variable (SOURCES.md "Supabase email sign-in", re-read at `e854b84` because `7425d49` no longer resolves on GitHub, checked 2026-10-20).

## Part A — before the playtest (2026-10-26)
| # | Item (ROADMAP wording, shortened) | What breaks without it | Plan |
|---|---|---|---|
| A1 | `currentUserId` rethrows any `getClaims()` error as a 500 | A playtester who signs out on another device may see a 500 instead of the sign-in form, if tokens are HS256 | The human reads the project's signing algorithm in the Supabase dashboard and reports only its name. If HS256: treat a revoked session as signed out, with a route test. If asymmetric: close the item with that evidence. **Result (human, 2026-10-20):** the current key is ECC P-256 (`ES256`); the legacy HS256 secret is listed as "previously used" since the rotation on 2026-10-17. `getClaims` asks the Auth server (`getUser`) only for an `HS*` token or one with no `kid`; an `ES256` token is checked locally against the JWKS. Tokens refreshed since 2026-10-17 are signed with the new key (JWT Signing Keys, "Getting started" step 5); whether an older HS256 token is still unexpired depends on the hosted JWT expiry, which is *unverified*, but the 2026-10-26 playtesters sign in after the rotation. The local stack's JWKS lists one EC `ES256` key too (checked 2026-10-20). No code change: closed |
| A2 | Supabase Auth failures show "Something went wrong (internal)" | A playtester can't tell a temporary outage on our side from their own mistake | `authFailure` maps an `AuthRetryableFetchError` to `503 auth_unavailable`, logging the cause at error level first (it stays loud). A message saying it's on our side and temporary; the text is approved by the human in the PR. Unit test the mapping |
| A3 | Mail scanners use up the one-time sign-in link (ROADMAP; added by the human, 2026-10-20) | A playtester on work or Outlook mail gets "link expired" before they open it | The email carries the 6-digit code (`{{ .Token }}`) instead of a link; the player types it into the sign-in form, and a new `POST /api/auth/email/verify` calls `verifyOtp({ email, token, type: "email" })`. One template for both "Confirm signup" and "Magic link", as today. `/auth/confirm` is deleted. The human pastes the new template into the hosted project right after the deploy (until then, emailed links point at a deleted route) |

### Acceptance criteria (Part A)
- [x] A1 closed in ROADMAP with the human's report and the `getClaims` reading above.
- [x] A2: a unit test shows an `AuthRetryableFetchError` becomes `503 auth_unavailable` and a 4xx Auth error keeps its own code; the human approves the message text in the PR.
- [x] A3, local stack (`npm run test:db`): a new address and a returning address each sign in with the code from the email (each template's subject checked); a used code and a wrong code are refused with a 4xx; no email contains a link to `/auth/confirm`.
- [ ] A3, staging: after the deploy and the template change, the human signs in on `plor.app` with an emailed code (human report).
- [x] `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run test:db` pass.

**A3 hypotheses, written before the first local run:**
1. `verifyOtp` with `type: "email"` accepts the code from the **Confirm signup** email too, as it accepted that template's token hash before, and the "Email prefetching" fix uses `type: 'email'` for a confirm-signup page. *Wrong if* the new address gets a 4xx and needs `type: "signup"`.
2. A used code and a wrong code both get `403 otp_expired`: the templates page quotes "Token has expired or is invalid" for a used link, and the used-link test got `otp_expired`. *Wrong if* either gets another status or code (then the message table needs that code).
3. A wrong guess doesn't use up the right code: the player can retype. *Wrong if* the right code fails after a wrong one.

All three held on the first run (Evidence).

**Hosted step for the human, right after the Part A deploy** (Supabase dashboard → Authentication → Emails → Templates; until then, emails carry a link to the deleted `/auth/confirm`):
1. **Confirm signup**: subject `Welcome to Plor: your sign-in code`; body: the contents of `supabase/templates/sign_in_code.html`.
2. **Magic link**: subject `Your Plor sign-in code`; the same body.
3. Sign in on `plor.app` with a new address and a returning one, and report whether each code worked.

## Part B — after the playtest, any order
| # | Item | What breaks without it | Plan |
|---|---|---|---|
| B1 | `startRun` maps any 23503 to `no_puzzle_today` | *Low*: a wrong 404 if the user foreign key ever fails | Check `err.constraint`; test both constraints |
| B2 | `/api/admin/insights` turns `2026-02-30` into a 500 | *Low*: admin-only noise in the logs | Validate the date at the boundary → 400; route test |
| B3 | Insights page has no day selector when today has no puzzle | The report is unreachable once content runs out (after 2026-11-22) | Day selector over finished days (M03 D5); test |
| B4 | "Did you mean" counts spaces as letters | Multi-word text gets suggestions under the "4+ letters" rule | Count letters only; unit test |
| B5 | Two `<footer>` elements in the signed-in view | *Low*: markup only | One footer; check served HTML with curl |
| B6 | Username error text repeats the 3–20 rule | The message and the database check can drift | One constant feeds both the message and the check's test |
| B7 | `askHidden` never resolves if stdin closes | *Low*: publish hangs instead of failing | Reject on `close`; unit test |
| B8 | `parseDatabaseUrl` message lists all three parts | *Low*: a misleading boot error | Name only the missing part; unit test |
| B9 | `content:validate` silently skips non-`.json` files | A mistyped file name drops a day while CONTENT OK prints | Report any other file under the root as an error; fixture |
| B10 | Plural check only goes singular → plural | An entry named in the plural passes without its singular | Check both directions; fixture |
| B11 | Validator branches with no fixture | A regression in those rules passes CI | One fixture per branch (group key not in the bank, duplicate IDs, a name that normalizes to empty) |
| B12 | No test that a refused day rolls back earlier days in the batch | A partial publish could go unnoticed | Test outside the outer rolled-back transaction |
| B13 | `runs.db.test.ts` fixtures live outside a transaction | A crashed run blocks a later local publish | Wrap in a transaction or clean up in `finally`; test |
| B14 | No test for an earlier "too few" question not flagging a later one | *Low*: a small branch | Add the test |
| B15 | `route.db.test.ts` says "known catch rates" | *Low*: wording | Rename the test |
| B16 | Test imports with and without `.ts` | Two ways to do one thing | Use `.ts` everywhere (runtime already does) |
| B17 | `content:plurals` reformats the whole file | Noisy diffs on hand-formatted files | Write only when something changed, keeping 2-space JSON |
| B18 | `withTransaction` rollback-failure branch has no test | *Low*: hard to trigger | Test with a client whose rollback throws |
| B19 | Bundle check scans only `.next/static` | A secret in prerendered HTML or RSC payloads wouldn't be caught | Also scan `.next/server/app`; prove it with a planted string |
| B20 | CI actions pinned to tags, not SHAs | A moved tag could change what CI runs | Pin each action to its commit SHA, with the tag in a comment |
| B21 | `private.today()` uses `now()` (transaction start) | A publish opened just before midnight could edit a day that just started | **Hypothesis first:** a transaction begun at 23:59:59.9 and committed after midnight passes the guard today and fails with `statement_timestamp()`. New migration plus a pgTAP test that shows it. This touches the only definition of "today", so the human approves the approach in the PR |

## Not in this ticket
**Human decisions or actions** (each stays open in ROADMAP until the human answers):
- *(Moved into Part A as A3 by the human, 2026-10-20: the 6-digit code.)*
- **Security, found in A1:** the legacy HS256 secret is still trusted as "previously used". JWT Signing Keys, "Rotate and revoke": "Once all regularly valid JWTs have expired (or sooner) revoke the previously used key". Revoking it is the human's call (a dashboard action; the same page says revoking the legacy secret requires disabling the legacy `anon` and `service_role` keys first).
- **Content, before each puzzle's day** (a puzzle can't change once its day starts): the 2d and 2e judgment calls, the 2e reviewer findings Claude kept (cheese kinds on 11-20 q3, piercings on 11-13 q5), the M01 host-rule cases, possibly dominant host answers (the M01 late questions and the 2e drafts), days with no concrete question, the Kaskaskia wording (2026-11-08), completeness gaps, the UK list.
- Numbers: `scripts/status` fetch timeout; `pg` connection timeout and app rate limits (M11); host bank size (after the playtest).
- Choices: one source for the Supabase CA (three uses today); local analytics on Windows (expose the Docker socket or disable `[analytics]`); strip zero-width characters in normalization or not; reference sources for concrete lists.
- Actions: upgrade local Node; local `plor_app` password (role change).
- Security changes: column-level grant on `missed_answer`; applying hosted Auth settings from the repo.

**Waiting on something else:** the ESLint upgrade (upstream support); the `DATABASE_URL`-missing boot behavior on Vercel (needs an investigation ticket); sign-out scope (only if players complain); the remote-reset caveat in `roles.sql` (no procedure resets the remote); the deletion procedure (write it at the first request); the local `profile.db.test.ts` login as `supabase_admin` with an observed default password (local only; a docs change would make it fail loudly).

**Future milestones:** realtime RLS (M06), reset countdown (M09/M12), points formula in the ticket (M08), home page copy (M09/M12), a hint when Enter matches no entry (M12 UX).

## Numbers
None. Items that need a number are listed above as human decisions.

## Plan
1. ~~The human approves this ticket and says whether to drop the *low* items.~~ Done 2026-10-20: approved, *low* items kept, A3 added.
2. Part A on the M02 branch, `m02-sign-in-and-play` (CLAUDE.md: one branch per milestone; none exists today, so create it), as its own PR: reviewer, merge before 2026-10-26.
3. Part B on the same branch after the playtest, as a second PR, one commit per item (`M02 2f: <item> (removes: <what>)`), each ticking its ROADMAP item.
4. Reviewer pass, PR, merge on the human's approval.

## Removes
Per item, as listed: the email sign-in link and its `/auth/confirm` route, tests and template (A3), the duplicated username rule (B6), the second test-import style (B16), the silent file skip (B9), the second `<footer>` (B5), the mutable action tags (B20).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| "With OTP" step 1: call `signInWithOtp` from the client library | Called from the route handler `/api/auth/email`, as before | DECISIONS.md Sign-in: every auth call runs in a route handler |
| "With OTP" step 2: `verifyOtp({ email, token, type: 'email' })`, which returns the session | `POST /api/auth/email/verify` makes that call; the session goes back as cookies, not in the body | Server-only auth; the browser never holds tokens outside cookies |
| Templates, "Email prefetching" option 1: a custom link in the email to a page where the player enters email and code | No link at all; the code form appears in the same tab after the email is sent | The player already has the form open; a link would add a page with no other caller (build for today) |
| JWT Signing Keys: revoke the previously used key once valid JWTs have expired | Not done | A dashboard security action for the human (ROADMAP Next revision) |

## Evidence
**Part A, 2026-10-20, local stack (`npx supabase start`, templates from `supabase/config.toml`).**

A3 and the sign-in flow, `npm run test:db -- --exclude ".claude/**" --reporter=verbose` (the exclude: see ROADMAP, the `.claude/worktrees` item):
```
 ✓ src/app/api/profile/route.db.test.ts > sign-in and profile > signs a new address in with the emailed code, which comes from the confirmation template 127ms
 ✓ src/app/api/profile/route.db.test.ts > sign-in and profile > refuses a code that was already used 5ms
 ✓ src/app/api/profile/route.db.test.ts > sign-in and profile > creates the profile on the first username pick 8ms
 ✓ src/app/api/profile/route.db.test.ts > sign-in and profile > rejects a username another player has, with 409 username_taken 81ms
 ✓ src/app/api/profile/route.db.test.ts > sign-in and profile > rejects a username outside the rules, with 400 username_invalid 23ms
 ✓ src/app/api/profile/route.db.test.ts > sign-in and profile > refuses a wrong code without using up the right one 34ms
 ✓ src/app/api/profile/route.db.test.ts > sign-in and profile > sends a returning player the magic-link template and keeps their one profile 40ms
 ✓ src/app/api/profile/route.db.test.ts > sign-in and profile > signs out by clearing the session cookies 9ms
 Test Files  8 passed (8)
      Tests  45 passed (45)
```
The first test checks the email has no `<a ` element; the used and wrong codes both get `403 otp_expired` (hypothesis 2). Every other db test signs in through the same code helper (`src/test/local-stack.ts`).

A2, in `npm test -- --exclude ".claude/**"` (`src/lib/auth.test.ts`: `AuthRetryableFetchError` → `503 auth_unavailable`, logged at error level; a 4xx keeps its code; anything else is unchanged):
```
 Test Files  18 passed (18)
      Tests  125 passed (125)
```

A1, the local stack: `curl -s http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`, printing only each key's type and algorithm:
```
[('EC', 'ES256')]
```
Hosted: the human's report (Part A table).

Build, types, lint: `npm run build` → `✓ Compiled successfully`, routes include `ƒ /api/auth/email/verify` and no `/auth/confirm`; `npx tsc --noEmit` → no output; `npm run lint` → no output.

The form in a browser (`npm run dev` on the local stack, a throwaway `@example.test` address, deleted afterwards): "Email me a sign-in code" → "Enter your code / We sent a sign-in code to …"; the Mailpit email had subject `Welcome to Plor: your sign-in code`, a 6-digit code and no `<a ` element; a wrong code showed "That code is wrong, expired or already used. Check the newest email, or reload to get a new code."; the right code went on to "Pick a username".

Staging: waiting for the deploy and the hosted step above.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
