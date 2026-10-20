# M02 — Sign-in and playable game

**Status:** in progress. 2a (PR #6) and 2b (PR #8) are merged and live on `plor.app`; the rename (PR #7) too. 2c (privacy page, answer-box fixes) is in review. Then the playtest runs 2026-10-26 to 2026-11-01, and its findings close the milestone.

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
| D5 | Google's sign-in screen shows the Supabase project address | **2c:** a simple privacy page, so the human can submit Google brand verification ("Plor" instead of the address). Not the paid Supabase custom domain | human, 2026-10-19 |

## Acceptance criteria
Each criterion must be checkable with a command or other observable result.

**2a: sign-in and profile**
- [x] A player can't start a run without being signed in (tested at the route level). *(Shown on `/api/profile`; `POST /run/start` repeats the test in 2b.)*
- [x] The first sign-in creates `private.profile` with a unique username under the rules in Numbers; a duplicate username fails loudly with an AppError (tested).
- [x] Sessions use `@supabase/ssr` cookies; no secret reaches the client bundle (checked in the build output).

**2b: game loop**
- [x] `content:publish` loads validated puzzles into `private.puzzle` and refuses to change a puzzle whose `puzzle_date <= private.today()` (tested against the local stack).
- [x] `private.today()` is the only definition of "today", with tests just before and after midnight on each `America/Los_Angeles` DST transition during development and the playtest, with the dates taken from the IANA tz database rather than worked out by hand (2026-11-01 is already logged in ROADMAP), plus an ordinary day.
- [x] Matching is a pure function `(question, entry_id) → matched | not_matched | invalid_entry`. A host answer always matches itself; match groups cover only the listed extra entries (unit tests for each rule).
- [x] `POST /run/start` pins `puzzle_date = private.today()`; one run per user per day (primary key; tested).
- [x] Answers are checked one at a time. The response gives the result, the host answer(s) for that question, and the next question. The payload never contains host answers or host-bank markers for questions not yet answered (payload-level test).
- [x] A different `entry_id` for an index that's already been answered → `409 already_answered`; the same one returns the stored result; an answer after the reset → `409 day_over`, raised by a database trigger. Two concurrent requests for the same index return the idempotent result or 409, never 500 (concurrency test; ROADMAP item).
- [x] Typed text that matches no entry gets "not in our list yet, try another" with no penalty, and is logged for human review under the limits in Numbers (tested).
- [x] The run status view gives in_progress / died / survived / abandoned (tested).
- [x] `plor_app` gets only the grants these routes need (pgTAP, extending `plor_app_role.test.sql`); nothing in `private` is reachable by `anon` or `authenticated` (test; ROADMAP item).
- [x] `npm run test:db` runs in CI against a started Supabase stack (ROADMAP item).
- [x] UI: autocomplete over the question's accepted bank that submits entry IDs; one question at a time; a result screen. It works on a phone-width screen.
- [x] On staging, a real signed-in run is played start to finish, with evidence (the human's run plus `run_event` rows queried as `plor_app`'s grants allow, or through an admin path).
- [ ] **The playtest runs** and its findings are recorded: the catch rate per question, the share of typed answers that fell in the host bank, the logged misses, and whether it's fun. Then a human decides on the open ROADMAP items about the host bank size and dominant host answers.

**2c: privacy page and Google branding** (D5, human 2026-10-19)
- [x] `https://plor.app/privacy` is public and linked from the sign-in screen and the signed-in footer. *(Text approved by the human on the PR #9 preview, 2026-10-19: "looks okay".)* Its text was approved by the human before merge, and it states only what the code and the services do (Evidence).
- [x] The page names a working contact, `privacy@plor.app`, forwarded to the human's inbox (a test email arrives). *(Human, 2026-10-19: ImprovMX forwarding, its two MX records and SPF TXT added in Vercel DNS, and a test email arrived.)*
- [x] Rehearsal fixes (human, 2026-10-19): Enter in the answer box picks an exactly named entry and never sends a miss (it had logged "passport" as not in the list), and "Did you mean" offers entries one typo away (`src/game/suggest.test.ts`; browser check in Evidence).
- [ ] The human submits Google brand verification with the home page, the privacy link and the verified domain `plor.app`, and records Google's answer. While it is pending, Google keeps showing the Supabase address. *(2026-10-19, human: app published from Testing to production (basic scopes only, so no data-access review), app name `Plor`, home page and privacy link set, `plor.app` verified in Search Console, branding submitted: "all done". Waiting for Google's answer; if it rejects the Supabase domain in the authorized-domain list, the fallback is the paid Supabase custom domain, after checking its price.)* *Google's first answer (2026-10-19): "Your home page is behind a login page", "does not explain the purpose of your app", and the app name "Plor" "does not match the app name on your home page" (the heading said Offbeat). Fix: the home page has a static introduction headed **Plor**, explaining the site and today's game, with the privacy link in the footer, all in the served HTML before any script runs. The human then chooses "I have fixed the issues".*

  Served HTML, local `next start` on commit `2e2a808`, 2026-10-19 (curl runs no JavaScript):
  ```text
  $ curl -s http://127.0.0.1:3000/ | grep -o '<h1>[^<]*</h1>\|Plor is a small site[^<]*\|Today&#x27;s game: Offbeat\|href="/privacy"'
  <h1>Plor</h1>
  Plor is a small site for daily word games. Everyone gets the same puzzle each day, and a new one starts at midnight Pacific time.
  Today&#x27;s game: Offbeat
  href="/privacy"
  ```

**Where 2b stands (2026-10-19):** everything above except the staging run and the playtest is built and tested (Evidence → 2b). The CI `db` job passed on GitHub.

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

## Rename to Plor (human, 2026-10-19; before 2b)
The repo, the app login and the services drop the "riff" names. Claude's part is the rename PR: the migration `20261019070813_rename_riff_app_to_plor_app.sql`, `supabase/roles.sql`, the tests, the package and local project name, and the docs. The local folder `C:\Users\jason\RIFF` keeps its name, because sessions and notes point at it. The human's steps, in this order (the site is down between steps 2 and 3):
1. **Vercel → Settings → Environment Variables → `DATABASE_URL`** (Production and Preview): change only the user name at the start, from `riff_app.<project-ref>` to `plor_app.<project-ref>`. The password stays the same.
2. From the repo: `npx.cmd supabase db push` (it applies the rename), then `npx.cmd supabase test db --linked`, which now also checks that no `riff_app` login is left.
3. Merge the rename PR. Its production deploy picks up the new `DATABASE_URL`. Claude then runs `npm run status -- https://plor.app`. If the login is refused, the password was MD5 and the rename cleared it: set it again with psql `\password plor_app`.
4. **Vercel → Settings → Domains:** make `plor.app` the primary domain, with `www.plor.app` redirecting to it. Today it's the other way round (D3 evidence).
5. **Service names:** GitHub repo `jasonex64/RIFF` → `plor` (Settings → General → Repository name); Vercel project `riff` → `plor` (Settings → General → Project Name); Supabase project `riff-staging` → `plor-staging` (Project Settings → General). Claude then updates the git remote and the docs that name them.


Done 2026-10-19: the human confirmed the old password with a read-only psql login as `riff_app` (verify-full; it wasn't in the password manager, which has it now), set `DATABASE_URL` to `plor_app.<ref>`, ran `db push` (rename) and `test db --linked` ("all passed", human report), and approved the merge of PR #7 (`ad938c6`). During the switch `/api/health` answered 500 (old deploy, old name); after the deploy:

```text
$ npm run status -- https://plor.app
UP https://plor.app (protocol 1)
```
Steps 4 and 5, done by the human on 2026-10-19 and checked by Claude the same day:

```text
https://plor.app/                       200
https://www.plor.app/                   308 -> https://plor.app/
https://www.plor.app/auth/callback      308 -> https://plor.app/auth/callback
https://riff-omega-dusky.vercel.app/    308 -> https://plor.app/   (Vercel's production alias, also redirected)
https://riff-sixfour.vercel.app/        302 -> vercel.com/sso-api  (protected)
$ gh repo view jasonex64/plor           -> plor https://github.com/jasonex64/plor   (git remote updated)
$ npx supabase projects list            -> plor-staging us-east-1
```
The Vercel project rename is the human's report; Vercel keeps the existing `riff-…vercel.app` aliases, and new previews take the new project name.
## Human setup for 2b
In this order; nothing is public until step 6 deploys the game.
1. ~~Approve the proposed RLS amendment~~ **Approved by the human, 2026-10-19** (DECISIONS.md: Row-level security in `private`).
2. `npx.cmd supabase db push --include-roles`: creates the `plor_publisher` login and applies `20261019074108_create_game_tables.sql`.
3. **Set `plor_publisher`'s password**: make a new letters-and-digits password in the password manager first, then run psql in Docker as `postgres` (the same `docker run … postgres:17 psql …` command used for the riff_app check, with user `postgres.<project-ref>` and port 5432), type `\password plor_publisher`, then `\q`.
4. `npx.cmd supabase test db --linked`: 74 tests, including the tz check on staging's own data.
5. `npm.cmd run content:publish -- postgresql://plor_publisher.<project-ref>@aws-0-us-east-1.pooler.supabase.com:6543/postgres`, then type the password when asked. Expected: `PUBLISHED 2026-10-26..2026-11-08 to …: 14 new, 0 updated, 0 unchanged`.
6. Merge PR 2b.
5b. **Rehearsal day** (human, 2026-10-19): `npm.cmd run content:publish -- <same URL> content-rehearsal` publishes `content-rehearsal/offbeat/2026-10-20.json`, which is the 2026-11-08 questions (outside the 7 playtest days) dated 2026-10-20. It stays in the database as a past day.
7. **Staging run** (acceptance criterion): play one run on `https://plor.app` on 2026-10-20 (the rehearsal day), then send Claude the result of the admin query Claude gives (Supabase SQL editor), which lists that run's `run_event` rows.

Done 2026-10-19: step 1 checked by Claude with `npx supabase migration list --linked` (all four migrations remote). Steps 2–5 were reported done by the human ("all done"; output not pasted, so the publish counts are unverified until the rehearsal run, which needs the 2026-10-20 puzzle). Step 6: PR #8 merged by Claude on the human's word (`42b8dc6`), after confirming that the migration was on staging and CI was green. About 40 s later `GET https://plor.app/api/run` answered 401 when signed out, and `npm run status -- https://plor.app` printed `UP https://plor.app (protocol 1)`.

2c merged in PR #9 (`668fe7b`, merged by the human, 2026-10-19). After the deploy: `GET https://plor.app/privacy` → 200 with the approved text, and `npm run status -- https://plor.app` → `UP https://plor.app (protocol 1)`.

## Human setup for 2c
1. **Forwarding for `privacy@plor.app`:** sign up at a forwarding service that Vercel's email guide names (ImprovMX or Forward Email), add `plor.app`, and forward `privacy@plor.app` to your own inbox. Then add the MX and TXT records it shows under Vercel → Domains → `plor.app`. Resend's sending records live on their own subdomain and don't collide (Vercel's guide). Send a test email to `privacy@plor.app`.
2. **Read and approve the privacy page** on the PR's preview, before merge.
3. **After merge, Google Auth Platform → Branding:** app name `Plor`, a logo, home page `https://plor.app`, privacy policy `https://plor.app/privacy`, and authorized domain `plor.app`. Google asks you to prove you own the domain, usually with a TXT record in Vercel DNS. Then submit for verification and tell Claude Google's answer.

## Out of scope
Share (M05), friends and the live board (M06), comments (M07), the points ledger and leaderboard (M08), account deletion and production hardening (M11), and the Offbeat visual theme beyond a plain functional UI.

## Numbers
Every value this milestone needs, and where it comes from. A blank origin means stop and ask.
| Value | Used for | Origin |
|---|---|---|
| Questions per day | Run length | 7 (human, 2026-10-18) |
| Username rules | Profile creation | 3–20 characters, `a-z 0-9 _`, unique ignoring case (human, 2026-10-18) |
| Maximum length of logged typed text | Not-in-list logging | 40 characters; longer input is rejected and **not** logged (human, 2026-10-18) |
| Rate limit on answer and not-in-list requests | Abuse control | Deferred to M11: none at app level in M02; sign-in plus Supabase Auth limits only (human, 2026-10-18) |
| Playtest size | Playtest | The human plus a few friends, 7 days (human, 2026-10-18) |
| "Did you mean" | Answer box suggestions | One typo forgiven (a letter missing, extra, wrong, or two neighbours swapped), only for text of 4+ letters (human, 2026-10-19); `src/config/tunables.ts` |
| Google sign-in data | Privacy page | Checked by the human in Supabase → Users, 2026-10-19: a Google user stores a name and an avatar URL (first reported blank, then corrected by the human) |
| Privacy page facts | 2c | Contact `privacy@plor.app`; minimum age 13 (not directed at children under 13); says now that answers may be used, without email or username, to improve puzzles, including with AI tools (all human, 2026-10-19) |
| Rehearsal day | The staging run before the playtest | 2026-10-20, using the 2026-11-08 questions, in `content-rehearsal/` (human, 2026-10-19); plus 2026-10-19 with the 2026-11-07 questions, so the human could rehearse the same day (human, 2026-10-19: "can i just do it now") |
| Playtest dates | Re-dating the puzzles (D2) | First day **2026-10-26** (human, 2026-10-19: "a week from now"), so 7 days run 2026-10-26 to 2026-11-01 Pacific. The 14 puzzles become 2026-10-26 to 2026-11-08. The last playtest day, 2026-11-01, is the day DST ends in `America/Los_Angeles`. |

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
| Ticket: `POST /run/start` | `POST /api/run/start`, plus `GET /api/run`, `POST /api/run/answer`, `POST /api/run/miss` | Every API route lives under `/api` (M00). Reading the run's state and logging a miss need their own routes. |
| M00 §4: `private.puzzle(…, format, content, content_hash, published_at)` | `(game_id, puzzle_date, content)`, plus a check that the content names its own game and date | The ticket's Removes: `format` is inside `content`, and nothing reads a hash or publish time. The check mirrors the path rule for files. |
| M00 §4: matching `(content, question_idx, entry_id) → matched \| invalid_entry` | `matchAnswer(question, entryId) → matched \| not_matched \| invalid_entry` | The ticket's newer signature. |
| M00 §5: order "enforced in one transaction" by the app | The `run_event` BEFORE INSERT trigger enforces order and "nothing after a match or the last question", next to `day_over` | "The database enforces invariants" (M00 principles): the app can't get it wrong, and concurrent requests meet at the primary key. The route reads the stored answer again on any conflict (never a 500). |
| M00 §5: the client never sends a date | `answer` uses the player's latest run; if its day has ended, the trigger raises `day_over` | That is how an answer after the reset reaches the trigger without the client naming a day. |
| M00 §8: tests on "both 2027 transition dates" | The DST changes found in the tz data between 2026-10-17 (M00) and 2026-11-08 (last puzzle): only 2026-11-01. Both ends of that 25-hour day, plus an ordinary day (2026-10-26) | The ticket's newer rule ("during development and the playtest"). The instants come from Node's ICU tz data by bisection, not by hand. |
| M00 §5: the status view | `security_invoker = true` | The view is in `private` and plor_app reads it with its own grants and RLS policies, never as the owner. |
| M00 §3: the profile is created "before the first run" | `POST /api/run/start` refuses with `409 no_profile` until a username exists | Enforces §3. |
| M00 §4: `content:publish` "validates the files and upserts them" | Also checks that the dates have no gaps, asks for the password instead of reading it from the URL, connects as `plor_publisher` to a remote database, and leaves unchanged days alone (so a started day can be republished unchanged) | ROADMAP item (consecutive dates); keeps the password out of shell history; DECISIONS.md: Content publishing role. |
| Ticket UI: "autocomplete … that submits entry IDs" | Suggestions are every entry where a word of its name or an alias starts with the typed text (authoring normalization), all shown, in a scrolling list. A picked answer needs a second tap ("Lock in …") | Sudden death makes a mis-tap end the run. Showing all matches avoids inventing a cut-off number. |
| SSR guide: browser and server clients, env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Server client only, env vars `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Every auth call runs in a route handler, so nothing in the browser needs the values, and `NEXT_PUBLIC_` would inline them into the bundle. |
| SSR guide's server client: `setAll` wrapped in try/catch with the error ignored (for Server Components) | No try/catch; only route handlers create the client | Route handlers can write cookies, so a failed write is a real error (CLAUDE.md: fail loudly). No Server Component reads the session. |
| SSR guide's proxy: redirects signed-out users to `/login` | Refresh only; logs a warning if `getClaims()` errors | The Next.js proxy docs say proxy is not for authorization. Each route checks the session and fails with 401 (or 500). |
| SSR guide: apply the `setAll` cache headers to the response | The proxy applies them; `handle()` sets the same three headers on every route response | Route handlers can't see the headers `setAll` gets, and Next.js sends route responses with no Cache-Control at all (observed). Every route response belongs to one request. |
| Google guide's callback: redirect to `origin` or `https://${x-forwarded-host}` plus `next` | Relative `Location: /` (or `/?error=<code>`); no `next` parameter | `request.url` says `localhost` whatever the Host header is (observed on `next start`; the first browser run lost its session this way). A relative Location needs no host. There is one landing page, so `next` has no caller. |
| Google guide: `redirectTo` is an absolute callback URL | Built from the request's `Origin` header | Same `request.url` problem. Supabase only redirects to allow-listed URLs, so a forged Origin can't send a code elsewhere. |
| Magic-link guide: `verifyOtp` with whatever `type` arrives | Only `type=email` is accepted | It's the only type our template sends. |
| Magic-link guide: change the Magic Link template | Both "Confirm signup" and "Magic link" templates, one HTML file | A new address gets "Confirm signup" until its first link is used (observed locally with `enable_confirmations = true`). |
| M00 data design: "RLS is enabled with no policies" | RLS on, with `select` and `insert` policies for `plor_app` only | With no policy, RLS blocks plor_app too (observed). Approved by the human, 2026-10-18 (DECISIONS.md: Row-level security in `private`). |
| M00 data design §3: `username citext unique` | citext, plus a check constraint on `username::text` | citext's regex match ignores case, so the format check must cast to text (tested). |

## Evidence
### 2a (sign-in and profile)
*The app login was `riff_app` until 2026-10-19, when it was renamed `plor_app` (DECISIONS.md Log); pasted output below keeps the names it printed.*
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
- **First sign-in creates the profile; a duplicate fails with an AppError:** `src/app/api/profile/route.db.test.ts` signs in through the real local Auth server and the emailed link, creates a profile, then a second user gets `409 username_taken`; bad formats get `400 username_invalid`; a second pick gets `409 profile_exists`. The rules are pinned in `supabase/tests/profile.test.sql` (3 and 20 characters pass, 2 and 21 fail, upper case and `-` fail). `src/lib/profile.db.test.ts` runs the same SQL **as plor_app** (grants, policies, foreign key, citext).
- **`@supabase/ssr` cookies, no secret in the client bundle:** sessions are the `sb-…` cookies written through `@supabase/ssr` (route.db.test.ts checks them, and that sign-out clears them). `npm run check:client-bundle` scans `.next/static` for key and URL patterns and for the actual server env values, and runs in CI after the build. It caught a planted `sb_secret_` file (exit 1) before that file was removed.
- **Data API roles reach nothing in `private`** (ROADMAP item, done now because `private` now exists): `supabase/tests/private_schema.test.sql` checks every table, view and function for `anon` and `authenticated`, and that RLS is on with plor_app-only policies. It reported `{"anon select private.profile"}` when a grant was added inside a rolled-back transaction. The dashboard's Exposed schemas setting is human setup step 6.

Browser run, local `next start` at phone width (375×812), 2026-10-18: the email was sent ("Check … for a sign-in link"), the link from Mailpit opened "Pick a username", an email typed as a username got the format message, `Browser_Check` was saved as `browser_check` ("Signed in as browser_check."), sign-out returned to the sign-in form, a second address signed in, and picking `browser_check` got "That username is taken. Try another." The server log showed no errors. The first attempt exposed the `localhost` redirect bug (Source diff), which was fixed before this run.

Hypotheses recorded on the way:
1. "plor_app can insert and read profiles with USAGE plus SELECT/INSERT, because type I/O, index upkeep and FK checks don't check its privileges." **Disproved:** RLS with no policy blocked it. Re-planned: plor_app-only policies (approved by the human, 2026-10-18).
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

Production after merge (human, 2026-10-18/19, on `https://plor.app`, still behind Vercel Authentication): email sign-in sent the link through Resend, the link opened "Pick a username", the username was saved, and Google sign-in returned to plor.app signed in ("everything works"). That covers the hosted sender, Google, and `Origin` on Vercel. Two setup mistakes were found on the way, both in the dashboard, not the code:
1. The SMTP host was typed as `smpt.resend.com`. Supabase's Auth log said `dial tcp: lookup smpt.resend.com ... no such host`, and the app showed "Something went wrong (internal)", because the route turns Supabase's 500 into a 500. Fixed to `smtp.resend.com`.
2. The template bodies were still Supabase's defaults (`{{ .ConfirmationURL }}`), and only the subjects had been changed. The link went through `/auth/v1/verify` and came back to `/` with a code the app doesn't use, so the player landed signed out with no error. Fixed by pasting `supabase/templates/sign_in_link.html` into both templates. The newest link now starts with `https://plor.app/auth/confirm?token_hash=`.

D3 (human, 2026-10-19): Deployment Protection set to Standard Protection. Checked from outside by Claude the same day:

```text
https://plor.app/                                          308 -> https://www.plor.app/
https://www.plor.app/                                      200
https://riff-sixfour.vercel.app/                           302 -> vercel.com/sso-api (protected)
https://riff-git-m02-sign-in-and-play-sixfour.vercel.app/  302 -> vercel.com/sso-api (protected preview)
$ npm run status -- https://plor.app
UP https://plor.app (protocol 1)
```

**Open:** the domain redirect runs the wrong way (`plor.app` → `www`, while setup step 3 asks for `www` → `plor.app`). Supabase allows only `https://plor.app/auth/callback`, and the Google route builds the return URL from the page's Origin, so Google sign-in started on `www` would not come back signed in (expected from the code; not yet tried). Fix: make `plor.app` the primary domain in Vercel.


### Staging run (rehearsal, 2026-10-19)
The human signed in on `https://plor.app` by email (after fixing Supabase's Site URL, which still said `riff-sixfour.vercel.app`; links had come back as `?code=` to the old address), and played the rehearsal puzzle published from `content-rehearsal/` (the 2026-11-07 questions dated 2026-10-19). The result screen, which the server builds from that run's stored `run_event` rows:

```text
You survived all 7!
You survived 7 of 7 questions. Come back tomorrow for a new puzzle.
1. Name something you'd pack for a vacation: you said passport, the host said toothbrush (safe)
2. Name a Halloween costume: you said robot, the host said vampire (safe)
3. Name an insect: you said cicada, the host said ladybug (safe)
4. Name something you'd find in a classroom: you said teacher, the host said whiteboard (safe)
5. Name a card game: you said Egyptian ratscrew, the host said Uno (safe)
6. Name a coffee drink: you said Vietnamese iced coffee, the host said cappuccino (safe)
7. Name a common pet: you said turtle, the host said dog (safe)
```
Findings from the rehearsal (human): answers that aren't on the list are "incredibly frustrating" (input to M03 and the playtest); Enter sent "passport" as a miss (fixed in 2c); typos should be forgiven (added in 2c).

Browser check of the 2c fixes, local `next start` at 375×812: Enter on "passport" showed "Lock in passport"; "passprt" showed "Did you mean: passport", and Enter on it sent nothing (0 rows in `missed_answer`); `/privacy` renders and the sign-in screen links to it. The test player and the local puzzle were deleted afterwards.

### 2b (game loop)
Run on branch `m02-sign-in-and-play` after the 2b review fixes, 2026-10-19 (Windows, Node 24.11.0), on a reset local stack.

```text
$ npm run test:sql
/Users/jason/RIFF/supabase/tests/game.test.sql ............ ok
/Users/jason/RIFF/supabase/tests/plor_app_role.test.sql ... ok
/Users/jason/RIFF/supabase/tests/private_schema.test.sql .. ok
/Users/jason/RIFF/supabase/tests/profile.test.sql ......... ok
Files=4, Tests=74
Result: PASS
$ npm run test:db
 Test Files  7 passed (7)
      Tests  40 passed (40)
$ npm test
 Test Files  13 passed (13)
      Tests  91 passed (91)
$ npm run lint                       # no findings
$ npm run content:validate
CONTENT OK content: 14 file(s)
$ npm run build                      # 13 routes plus the Proxy
$ npm run check:client-bundle
CLIENT BUNDLE OK: 13 files, 5 patterns, 3 env values (DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
$ npm run lockfile -- check
LOCKFILE CHECK OK (Linux, node:24)
CI (GitHub Actions run 39219369083, commit 94fb55e): jobs check, db and secrets all succeeded; db ran test:sql (PASS) and test:db (38 passed at that commit)
```

Criteria (2b), and where each is shown:
- **`content:publish`:** `scripts/content-publish.db.test.ts` (as `plor_publisher`: insert, unchanged, update a future day, republish a started day unchanged, and refuse to change a started day with "has started and can't change; nothing was published"). `scripts/content-publish.test.ts` covers date gaps. The CLI refuses a password in the URL, a missing URL, a remote login other than `plor_publisher`, and a non-interactive stdin (run by hand, each printed `PUBLISH FAILED: …`). The database itself refuses the change too (`game.test.sql`, OB004).
- **`private.today()`:** the only definition: the SQL for run start, the trigger, the view and publishing all call it, and TypeScript only reads it. `src/game/day.db.test.ts` derives from Node's ICU tz data that the window 2026-10-17..2026-11-08 has one change, 2026-11-01. It checks the millisecond before and the first millisecond of 2026-10-26 (ordinary), 2026-11-01 and 2026-11-02 against the database, and that the day is 25 h long. `game.test.sql` repeats the 2026-11-01 instants so staging's tz data is checked by `test db --linked`.
- **Matching:** `src/game/matching.test.ts` (a host answer itself, a host answer without a group, a group member, a host-bank non-answer, a niche answer, an unknown ID, and a group on a non-host entry that doesn't count).
- **One run per day, date pinned:** `game.test.sql` (second run → 23505; no puzzle → 23503). `runs.db.test.ts` shows starting twice returns the same run. The insert uses `private.today()` itself (2b review fix).
- **One answer at a time; nothing leaks:** `src/game/payload.test.ts` moves every host bank, host answer and match group to other entries, and every question payload stays byte-identical. It caught a deliberately leaky ordering (entries sorted host-bank first) before the code was restored. `runs.db.test.ts` checks the route's question is exactly that public view, and that host answers appear only for answered questions.
- **Retries, 409s, day_over, concurrency:** `runs.db.test.ts`: same entry → stored result; different → `409 already_answered`; skipping ahead → `409 out_of_order`; after a match → `409 run_over`; a run from yesterday → `409 day_over` from the trigger. Two concurrent identical answers both give 200 or 409, and two concurrent different answers give exactly one 200 and one 409 `already_answered`, never a 500. A retried answer from an ended day returns `abandoned`, not a blank state (2b review fix).
- **Not in our list:** `runs.db.test.ts`: a miss is logged trimmed and the run carries on at the same question; 41 characters → `400 text_invalid` with nothing stored; a miss for another question → `409 not_current_question`. `game.test.sql` pins the 1–40 character check.
- **Run status view:** `game.test.sql`: in_progress, died, survived, abandoned.
- **Grants:** `plor_app_role.test.sql` lists everything `plor_app` and `plor_publisher` hold in `private`, exactly. `private_schema.test.sql` checks that anon, authenticated and service_role hold nothing on any private table, view, sequence or function. `src/game/runs.plor-app.db.test.ts` plays a run as `plor_app` itself. The cascade from `auth.users` through runs, answers and misses is in `game.test.sql` (the §7 "unverified" item, now verified).
- **UI at phone width:** browser run on local `next start` at 375×812, 2026-10-19. Signed in by the emailed link, picked a username, then "Start today's puzzle" showed "Question 1 of 7 / Name an animal". Typing "axo" showed no suggestion and offered `Not in the list? Send "axo"`; sending "axolotl" showed `"axolotl" is not in our list yet. Try another answer.`, and the row was logged. Typing "aard" suggested aardvark; picking it showed "Lock in aardvark", and locking in showed "Safe! You said aardvark; the host said elephant." and "Question 2 of 7 / Name a US state". Answering Texas (the host answer) showed "Caught on question 2 / You survived 1 of 7 questions" with both questions listed, and a reload showed the same result. No server errors. The test user, the miss and the local puzzle were deleted afterwards.

Hypotheses recorded on the way:
1. "A plor_app insert into `missed_answer` needs no grant on its identity sequence." Confirmed by `runs.plor-app.db.test.ts`.
2. "`timezone(text, timestamptz)` is immutable in PG17." Confirmed (`provolatile = i`); `day_of` is still declared `stable`, because tz data can change.
3. "`supabase start` restored from a backup applies new migrations." **Disproved:** it restored the old schema without the new migration or role. `supabase db reset` applied both.
4. "The minimal stack (db, Auth, Kong, Mailpit) runs every database test." Confirmed locally, then in CI.
5. "Filtering lines containing key, secret, jwt, token or password hides the stack's keys in CI." **Disproved:** the "Publishable" row passed the filter. The step now drops stdout entirely.

## Review
**2a, review 1** (reviewer agent, fresh context, diff `5e8e83e..4c0c6c7`, 2026-10-18; after the history rewrite below, those commits are `2db4a4b` and `5231b3b`):
- Blocking findings and how each was fixed:
  - `profile.test.sql` asserted the whole table held one row, so it failed once `test:db` (or real staging users) had left profiles behind; the reviewer reproduced `have: 3 want: 1`. **Fixed:** the assertion counts only the test's own user IDs, and `route.db.test.ts` deletes the auth users it created (cascading to profiles). `test:sql` then passed with 2 leftover profiles present, and the user count was unchanged after `test:db`.
- Deferred to ROADMAP "Next revision": `getClaims()` errors become a 500 if tokens are HS256 (signing keys unverified); the bundle check skips `.next/server/app`; the private-schema sweep comment mentions sequences it doesn't check. The extended SOURCES Next.js row was included in the human's approval of the new rows. The username-rule drift was already logged.
- **History rewrite (human-approved, 2026-10-18):** CI's gitleaks scan flagged a made-up JWT-shaped string in `src/config/env.test.ts` (rule `generic-api-key`; it was a fabricated test value, `{"alg":"HS256"}.{}` with signature `x`, never a real key). The value became `legacy_anon_key`, the three commits after the ticket commit were rebuilt without it, and the branch was force-pushed. The final tree differs from the old head only on that line. No gitleaks config was changed.
**2b, review 1** (reviewer agent, fresh context, diff `45a2663..33a1110`, 2026-10-19):
- Blocking findings and how each was fixed:
  - No "Evidence → 2b" section. **Fixed:** the section above.
  - `startRun` inserted a date read by an earlier statement, so a start across midnight could create yesterday's run, and the UI had no `abandoned` state (a blank screen, also after a retried answer past midnight). **Fixed:** the insert uses `private.today()`, maps a missing puzzle to `404 no_puzzle_today`, then reads today's state again. `abandoned` is a status with its own message and a reload button, and `runs.db.test.ts` covers the retried-answer case.
  - `game.test.sql` inserted fixture puzzles without clearing real ones, so it would fail on staging once puzzles exist for those days. **Fixed:** it clears runs and puzzles for those days inside its rolled-back transaction. Reproduced the reviewer's failure case, then passed with real puzzles present, and they were untouched afterwards.
  - The `plor_publisher` RLS policies weren't in the DECISIONS.md RLS row. **Proposed** as an amendment in that row, pending the human's approval (security change).
- Deferred to ROADMAP "Next revision": the `now()` transaction clock in publish, the CA file in publish, `askHidden` on EOF, the `parseDatabaseUrl` message, no batch-rollback test, fixture cleanup in `runs.db.test.ts`, and the old CI log with the throwaway local key.

- The reviewer's unverified items: the signing algorithm (not checked, to avoid handling tokens); the browser run and the planted-leak check (written claims only); Origin on Vercel, Google and the hosted sender (human setup step 9); the lockfile check (run by the author: LOCKFILE CHECK OK).
