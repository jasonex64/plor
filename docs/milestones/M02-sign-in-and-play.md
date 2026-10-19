# M02 — Sign-in and playable game

**Status:** in progress. Decisions D1–D4 and Numbers were set by a human on 2026-10-18. PR 2a (sign-in and profile) is built and tested locally; it is reviewed, and it waits on the human setup below. The human approved the riff_app RLS policies and the new SOURCES rows on 2026-10-18. PR 2b (game loop) is next.

## Goal
A signed-in player can play today's Offbeat puzzle end to end on staging, with every answer checked by the server, and the human can run an internal playtest that measures how the questions really play.

## Who uses it / what breaks without it
- Used by: playtesters now; every later milestone builds on runs (share, friends board, comments and points all read `run` and `run_event`).
- Breaks without it: nothing can be played, and the open design questions (catch rates, host bank coverage, the niche-answer escape) stay guesses. **This is the playtest checkpoint** in ROADMAP: confirm the game is fun before any social features.

## Source
- `docs/milestones/M00-data-design.md` rev 4: §2 network messages, §3 identity, §4 content, §5 runs and run events, §7 append-only, §8 day boundary.
- `docs/DECISIONS.md`: Game 1 rules, answer model, database access, app database role, error handling, logging.
- Supabase Auth with Next.js SSR (`@supabase/ssr`), plus the D1 docs (magic link, email sending and rate limits, Google sign-in, redirect URLs), all pinned in SOURCES.md at supabase/supabase `7425d49`. *(Rows added 2026-10-18 for D1, and the Next.js row extended with the Proxy and auth-with-Cache-Components pages; approved by the human the same day.)*
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

**Where 2a stands:** the first criterion is shown on `/api/profile`, the first route that needs a signed-in player; `POST /run/start` gets the same check and test in 2b, when it exists.

## Human setup for 2a
Only the human can do these. Secrets go only into the Supabase dashboard, Vercel and the password manager, never into chat or files. Do them in this order; steps 1-8 come before PR 2a is merged.
1. **Pick an email sender (decision).** *Decided by the human, 2026-10-18: **Resend** over SMTP, on the domain `plor.app`, bought in Vercel; the domain is verified in Resend. Resend's free plan allows 100 emails a day and 3,000 a month (resend.com/pricing, read 2026-10-18).* Supabase's built-in sender mails only the project's team members, at most 2 emails per hour, so friends can't get sign-in links (Supabase SMTP docs). Choose a provider from Supabase's list (Resend, AWS SES, Postmark, SendGrid, ZeptoMail, Brevo). Most need a domain you own, for SPF and DKIM. Create the account and verify the domain, then in Supabase go to **Authentication → Emails → SMTP Settings**, turn on custom SMTP, and fill in the host, port, user and password from the provider. Use sender name `Plor` (the platform name) and a `no-reply@` address on your domain. Supabase then allows 30 emails per hour to start with (its default, adjustable under Rate Limits), which is plenty for a few friends.
2. **Email templates.** In **Authentication → Emails → Templates**, set both **Confirm signup** and **Magic link** to the HTML in `supabase/templates/sign_in_link.html`, with the subjects in `supabase/config.toml` ("Welcome to Plor: your sign-in link" and "Your Plor sign-in link"). A new address gets "Confirm signup" until its first link is used, and "Magic link" after that (observed locally), so both need the change.
3. **Production domain** *(human, 2026-10-18: the game runs at `plor.app`)*. First, in Vercel **Settings → Deployment Protection**, check which scope is set. Under **Standard Protection**, production domains are not protected (Vercel deployment-protection docs), so `plor.app` would be public as soon as it is attached. Until 2a is deployed and checked, the scope must be **All Deployments**. Then, in **Settings → Domains**, add `plor.app`, accept the suggested `www.plor.app`, and set it to redirect to `plor.app`.
4. **URLs.** In Supabase **Authentication → URL Configuration**, set **Site URL** to `https://plor.app` and add the redirect URL `https://plor.app/auth/callback`. Use exact paths, as the docs recommend for production, never a wildcard.
5. **Google client.** In the Google Cloud console, open **Google Auth Platform**. Under **Branding**, set the app name `Plor` (sign-in covers every game on the platform) and a support email. Under **Audience**, pick External; while the app is in "Testing", only the Google accounts you add as test users can sign in, so add yourself and each playtester. Under **Data Access**, add the `openid` scope. Under **Clients**, create a **Web application** client: authorized JavaScript origin `https://plor.app`, and the authorized redirect URI copied from Supabase's **Authentication → Sign In / Providers → Google** page (it ends in `/auth/v1/callback`). Paste the client ID and secret into that Supabase page and enable Google.
6. **Check two settings and tell Claude what they say.** (a) **Project Settings → Data API → Exposed schemas** must not include `private`. (b) **Authentication → Sign In / Providers → Email → Confirm email**: on or off? (The local stack is set to on, to match the hosted default.)
7. **Vercel env vars** (Production and Preview): `SUPABASE_URL` = `https://<project-ref>.supabase.co`, and `SUPABASE_PUBLISHABLE_KEY` = the publishable key from **Project Settings → API Keys** (it starts with `sb_publishable_`; the app refuses any other kind). The app won't boot without both.
8. **Database.** From the repo, run `npx supabase db push`, then `npx supabase test db --linked`, and paste the output (it has no secrets).
9. **After merge.** Production deploys while still behind Vercel Authentication. On `https://plor.app`, sign in once by email and once with Google, pick a username, and tell Claude the result. Only then make production public (D3): set the Deployment Protection scope to **Standard Protection**, which protects everything except production domains, so previews stay protected.

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
| SSR guide: browser and server clients, env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Server client only, env vars `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Every auth call runs in a route handler, so nothing in the browser needs the values, and `NEXT_PUBLIC_` would inline them into the bundle. |
| SSR guide's server client: `setAll` wrapped in try/catch with the error ignored (for Server Components) | No try/catch; only route handlers create the client | Route handlers can write cookies, so a failed write is a real error (CLAUDE.md: fail loudly). No Server Component reads the session. |
| SSR guide's proxy: redirects signed-out users to `/login` | Refresh only; logs a warning if `getClaims()` errors | The Next.js proxy docs say proxy is not for authorization. Each route checks the session and fails with 401 (or 500). |
| SSR guide: apply the `setAll` cache headers to the response | The proxy applies them; `handle()` sets the same three headers on every route response | Route handlers can't see the headers `setAll` gets, and Next.js sends route responses with no Cache-Control at all (observed). Every route response belongs to one request. |
| Google guide's callback: redirect to `origin` or `https://${x-forwarded-host}` plus `next` | Relative `Location: /` (or `/?error=<code>`); no `next` parameter | `request.url` says `localhost` whatever the Host header is (observed on `next start`; the first browser run lost its session this way). A relative Location needs no host. There is one landing page, so `next` has no caller. |
| Google guide: `redirectTo` is an absolute callback URL | Built from the request's `Origin` header | Same `request.url` problem. Supabase only redirects to allow-listed URLs, so a forged Origin can't send a code elsewhere. |
| Magic-link guide: `verifyOtp` with whatever `type` arrives | Only `type=email` is accepted | It's the only type our template sends. |
| Magic-link guide: change the Magic Link template | Both "Confirm signup" and "Magic link" templates, one HTML file | A new address gets "Confirm signup" until its first link is used (observed locally with `enable_confirmations = true`). |
| M00 data design: "RLS is enabled with no policies" | RLS on, with `select` and `insert` policies for `riff_app` only | With no policy, RLS blocks riff_app too (observed). Approved by the human, 2026-10-18 (DECISIONS.md: Row-level security in `private`). |
| M00 data design §3: `username citext unique` | citext, plus a check constraint on `username::text` | citext's regex match ignores case, so the format check must cast to text (tested). |

## Evidence
### 2a (sign-in and profile)
Run on branch `m02-sign-in-and-play`, 2026-10-18 (Windows, Node 24.11.0), after review 1's fix, on a reset local stack in this order: `test:db` first, then `test:sql`. `test:sql` also passed earlier with leftover profiles in the table, and `test:db` now deletes the users it creates.

```text
$ npm run test:sql
/Users/jason/RIFF/supabase/tests/private_schema.test.sql .. ok
/Users/jason/RIFF/supabase/tests/profile.test.sql ......... ok
/Users/jason/RIFF/supabase/tests/riff_app_role.test.sql ... ok
Files=3, Tests=34
Result: PASS

$ npm test
 Test Files  9 passed (9)
      Tests  74 passed (74)

$ npm run test:db        # real local Supabase Auth + Mailpit + Postgres
 Test Files  3 passed (3)
      Tests  13 passed (13)

$ npm run lint           # no findings
$ npm run lockfile -- check
LOCKFILE CHECK OK (Linux, node:24)
$ npm run build          # 9 routes plus the Proxy
$ npm run check:client-bundle
CLIENT BUNDLE OK: 13 files, 5 patterns, 3 env values (DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
```

Acceptance criteria (2a):
- **Signed-out players are refused:** `src/app/api/profile/route.test.ts`, "refuses a signed-out player with 401 not_signed_in". (`POST /run/start` gets the same test in 2b.)
- **First sign-in creates the profile; a duplicate fails with an AppError:** `src/app/api/profile/route.db.test.ts` signs in through the real local Auth server and the emailed link, creates a profile, then a second user gets `409 username_taken`; bad formats get `400 username_invalid`; a second pick gets `409 profile_exists`. The rules are pinned in `supabase/tests/profile.test.sql` (3 and 20 characters pass, 2 and 21 fail, upper case and `-` fail). `src/lib/profile.db.test.ts` runs the same SQL **as riff_app** (grants, policies, foreign key, citext).
- **`@supabase/ssr` cookies, no secret in the client bundle:** sessions are the `sb-…` cookies written through `@supabase/ssr` (route.db.test.ts checks them, and that sign-out clears them). `npm run check:client-bundle` scans `.next/static` for key and URL patterns and for the actual server env values, and runs in CI after the build. It caught a planted `sb_secret_` file (exit 1) before that file was removed.
- **Data API roles reach nothing in `private`** (ROADMAP item, done now because `private` now exists): `supabase/tests/private_schema.test.sql` checks every table, view and function for `anon` and `authenticated`, and that RLS is on with riff_app-only policies. It reported `{"anon select private.profile"}` when a grant was added inside a rolled-back transaction. The dashboard's Exposed schemas setting is human setup step 6.

Browser run, local `next start` at phone width (375×812), 2026-10-18: the email was sent ("Check … for a sign-in link"), the link from Mailpit opened "Pick a username", an email typed as a username got the format message, `Browser_Check` was saved as `browser_check` ("Signed in as browser_check."), sign-out returned to the sign-in form, a second address signed in, and picking `browser_check` got "That username is taken. Try another." The server log showed no errors. The first attempt exposed the `localhost` redirect bug (Source diff), which was fixed before this run.

Hypotheses recorded on the way:
1. "riff_app can insert and read profiles with USAGE plus SELECT/INSERT, because type I/O, index upkeep and FK checks don't check its privileges." **Disproved:** RLS with no policy blocked it. Re-planned: riff_app-only policies (approved by the human, 2026-10-18).
2. "Dynamic route handlers send a no-store Cache-Control." **Disproved:** no Cache-Control at all. Fixed in `handle()`.
3. "`request.url` follows the Host header." **Disproved** (curl with `Host:` and with `x-forwarded-host:` both gave `localhost`). Fixed with relative redirects and `Origin`.
4. "A new address gets the confirmation template, a returning one the magic-link template." Confirmed by the subjects in route.db.test.ts.

Staging setup (human, 2026-10-18; steps 1-8 done before merge):
- Steps 1-5: Resend SMTP from `plor.app`, both templates, `plor.app` attached while the protection scope is All Deployments, Site URL `https://plor.app` with the exact redirect `https://plor.app/auth/callback`, and the Google client and provider enabled. Claude checked from outside that `plor.app`, `www.plor.app` and `riff-sixfour.vercel.app` all answer `302` to `vercel.com/sso-api` (still protected).
- Step 6: Exposed schemas lists `public` only, without `private`. Allow new users to sign up is on, and Confirm email is on, which matches local `enable_confirmations = true`.
- Step 7: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` added for Production and Preview (human report; the values were not shared).
- Step 8, run by the human from the repo on Windows PowerShell (`npx.cmd`, because the execution policy blocks `npx.ps1`):

```text
$ npx.cmd supabase db push
Applying migration 20261018105903_create_profile.sql...
Finished supabase db push.
$ npx.cmd supabase test db --linked
/Users/jason/RIFF/supabase/tests/private_schema.test.sql .. ok
/Users/jason/RIFF/supabase/tests/profile.test.sql ......... ok
/Users/jason/RIFF/supabase/tests/riff_app_role.test.sql ... ok
All tests successful.
Files=3, Tests=34
Result: PASS
```

Not yet verified: anything on staging (Google sign-in, the hosted email sender, `Origin` on Vercel). That is human setup step 9.


## Review
**2a, review 1** (reviewer agent, fresh context, diff `5e8e83e..4c0c6c7`, 2026-10-18; after the history rewrite below, those commits are `2db4a4b` and `5231b3b`):
- Blocking findings and how each was fixed:
  - `profile.test.sql` asserted the whole table held one row, so it failed once `test:db` (or real staging users) had left profiles behind; the reviewer reproduced `have: 3 want: 1`. **Fixed:** the assertion counts only the test's own user IDs, and `route.db.test.ts` deletes the auth users it created (cascading to profiles). `test:sql` then passed with 2 leftover profiles present, and the user count was unchanged after `test:db`.
- Deferred to ROADMAP "Next revision": `getClaims()` errors become a 500 if tokens are HS256 (signing keys unverified); the bundle check skips `.next/server/app`; the private-schema sweep comment mentions sequences it doesn't check. The extended SOURCES Next.js row was included in the human's approval of the new rows. The username-rule drift was already logged.
- **History rewrite (human-approved, 2026-10-18):** CI's gitleaks scan flagged a made-up JWT-shaped string in `src/config/env.test.ts` (rule `generic-api-key`; it was a fabricated test value, `{"alg":"HS256"}.{}` with signature `x`, never a real key). The value became `legacy_anon_key`, the three commits after the ticket commit were rebuilt without it, and the branch was force-pushed. The final tree differs from the old head only on that line. No gitleaks config was changed.
- The reviewer's unverified items: the signing algorithm (not checked, to avoid handling tokens); the browser run and the planted-leak check (written claims only); Origin on Vercel, Google and the hosted sender (human setup step 9); the lockfile check (run by the author: LOCKFILE CHECK OK).
