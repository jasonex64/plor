# Authoritative Sources

These are the only sources agents may treat as authoritative. Memory, blog posts and "common practice" don't count.

## Rules
- **Pin it.** Record a version, release or date accessed, because unpinned docs drift.
- **Video gets notes.** Agents can't watch video. For a video source, write notes with timestamps in `docs/sources/<topic>.md`. Agents anchor to those notes.
- **Read before, diff after.** Read the cited sections before building. After building, fill in the ticket's Source diff.
- **Gaps and conflicts go to a human.** If nothing here covers the task, or two sources disagree, stop and ask.
- Only a human can add or replace a source.

| Topic | Source (URL / title) | Version or date | Authoritative for | Notes file |
|---|---|---|---|---|
| Next.js | https://nextjs.org/docs (App Router) | 16.4.2 (released 15 Oct, year unverified), accessed 2026-10-17 | Route handlers, server-only code and data security (`/app/guides/data-security`), PWA (`/app/guides/progressive-web-apps`), Proxy (`/app/getting-started/proxy`, `/app/api-reference/file-conventions/proxy`) and authentication with Cache Components (`/app/guides/authentication-with-cache-components`), read from the bundled copy in `node_modules/next/dist/docs/` (M02) | — |
| Supabase client | https://github.com/supabase/supabase-js | 2.118.0 (2026-10-15) | Client API | — |
| Supabase CLI | https://supabase.com/docs/guides/local-development | 2.121.0 (2026-10-14) | Local stack, migrations, pgTAP tests (`supabase test db`) | — |
| Supabase Realtime | https://supabase.com/docs/guides/realtime (`/authorization`, `/broadcast`, `/limits`) | accessed 2026-10-17 | Live friends board: private topics, server broadcast, plan limits | — |
| Supabase keys and RLS | https://supabase.com/docs/guides/api/api-keys, https://supabase.com/docs/guides/database/postgres/row-level-security | accessed 2026-10-17 | Keeping secrets server-only, RLS on exposed tables | — |
| PostgreSQL | https://www.postgresql.org/docs/17/ | 17.x | Constraints, transactions, SQL | — |
| Supabase SSR auth | https://supabase.com/docs/guides/auth/server-side/nextjs and `/server-side/creating-a-client` (Next.js tab), with its code samples `examples/auth/nextjs/` (`lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `proxy.ts`) | `@supabase/ssr` 0.12.7 (2026-09-08), `@supabase/supabase-js` 2.118.0 (2026-10-15); docs source at github.com/supabase/supabase commit `7425d49` (master, read 2026-10-18) | Cookie-based auth in the App Router: the server client, the Proxy refresh, `getClaims()` over `getSession()`, cache headers in `setAll` | — |
| Supabase magic link (M02, D1) | https://supabase.com/docs/guides/auth/auth-email-passwordless ("With Magic Link", PKCE template), https://supabase.com/docs/guides/auth/auth-email-templates | docs source at github.com/supabase/supabase commit `7425d49` (master, read 2026-10-18) | `signInWithOtp`, the token-hash email template, `/auth/confirm` with `verifyOtp`, one request per 60 s per user, links expire after 1 hour, email prefetching | — |
| Supabase email sending and Auth limits (M02) | https://supabase.com/docs/guides/auth/auth-smtp, https://supabase.com/docs/guides/auth/rate-limits | docs source at github.com/supabase/supabase commit `7425d49` (master, read 2026-10-18) | Built-in sender: 2 emails per hour, team addresses only, not for production; custom SMTP starts at 30 per hour (adjustable); the other Auth rate limits | — |
| Supabase Google sign-in (M02, D1) | https://supabase.com/docs/guides/auth/social-login/auth-google (Web, server-side PKCE) | docs source at github.com/supabase/supabase commit `7425d49` (master, read 2026-10-18) | Google Auth Platform setup (branding, audience, `openid` scope, Web client, redirect URI), `signInWithOAuth` with `redirectTo`, the `/auth/callback` code exchange | — |
| Supabase redirect URLs (M02) | https://supabase.com/docs/guides/auth/redirect-urls | docs source at github.com/supabase/supabase commit `7425d49` (master, read 2026-10-18) | Site URL, the Redirect URLs allow list, wildcards (exact paths recommended in production) | — |
| Vercel | https://vercel.com/docs (`/limits/fair-use-guidelines`, `/functions/configuring-functions/region`, `/logs/runtime`) | accessed 2026-10-17 | Hosting, regions, logs | — |
| Vitest | https://nextjs.org/docs/app/guides/testing/vitest | Vitest 5.0.5 (2026-10-15) | TypeScript unit tests | — |
| Supabase migrations | https://supabase.com/docs/guides/deployment/database-migrations | CLI 2.121.0 | Applying the schema to hosted projects | — |
| Supabase regions | https://supabase.com/docs/guides/platform/regions | accessed 2026-10-17 | Region choice (permanent) | — |
| Node.js | https://nodejs.org/en/about/previous-releases | v24.22.0 LTS (2026-10-14), npm 11.19.1 | Runtime | — |
| GitHub Actions: checkout | https://github.com/actions/checkout/releases | v7.0.1 (released 20 Jul, year unverified), accessed 2026-10-17. | CI checkout step | — |
| GitHub Actions: setup-node | https://github.com/actions/setup-node (README, `docs/advanced-usage.md`) | v7, accessed 2026-10-17. | CI Node setup: `node-version-file: package.json` reads `volta.node`, then `devEngines.runtime`, then `engines.node`; `cache: npm` | — |
| Supabase Postgres connections | https://supabase.com/docs/guides/database/connecting-to-postgres | accessed 2026-10-17. | Pooler modes, ports, transaction-mode caveats, connection strings | — |
| node-postgres | https://node-postgres.com/features/transactions | `pg` 8.23.1 (2026-09-30). | Pool, transactions on a single client | — |
| Vercel functions package | https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package | `@vercel/functions` 3.10.1 (2026-10-13). | `attachDatabasePool` for Fluid compute | — |
| Supabase SSL | https://supabase.com/docs/guides/platform/ssl-enforcement | accessed 2026-10-17 | SSL enforcement (opt-in), CA download, `verify-full` recommendation | — |
| node-postgres Pool and SSL | https://node-postgres.com/apis/pool, https://node-postgres.com/features/ssl | `pg` 8.23.1 | Pool defaults (`max` 10, `idleTimeoutMillis` 10000, `connectionTimeoutMillis` 0), the `ssl` object, URL params replacing it | — |
| Supabase database roles | https://supabase.com/docs/guides/database/postgres/roles, https://supabase.com/docs/guides/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted-ddaa1c | accessed 2026-10-17 | Custom login roles, `[ROLE].[PROJECT-REF]` pooler username, PUBLIC grants to revoke and their caveats | — |
| PostgreSQL ALTER ROLE | https://www.postgresql.org/docs/17/sql-alterrole.html | 17 | Password handling: `\password` avoids sending cleartext | — |
| gitleaks | https://github.com/gitleaks/gitleaks | v8.30.1 (2026-03-21), MIT | Secret detection, pre-commit hook (`gitleaks git --pre-commit --redact --staged`) | — |
| gitleaks-action | https://github.com/gitleaks/gitleaks-action | v3.0.0 (2026-05-30) | CI secret scan; no license needed for personal accounts | — |
| Vercel project config | https://vercel.com/docs/project-configuration/vercel-json | accessed 2026-10-18 | `framework` and `regions` override the Project Settings; schema at openapi.vercel.sh/vercel.json | — |
| JSON | https://www.rfc-editor.org/rfc/rfc8259 (RFC 8259) | December 2017 | Puzzle content file syntax. The schema itself is DECISIONS.md "Puzzle content format", checked by hand-written TypeScript; no schema library (human, 2026-10-18) | — |
| Unicode normalization | https://tc39.es/ecma262/2026/#sec-string.prototype.normalize, https://www.unicode.org/reports/tr15/ (UAX #15, NFKD), https://www.unicode.org/reports/tr44/ (UAX #44, General_Category `M` and `P`) | ECMA-262 2026, UAX #15 for Unicode 18.0.0, accessed 2026-10-18. The runtime's own data applies: Node 24.11.0 ships Unicode 16.0 (`process.versions.unicode`) | Alias normalization when content is authored (human-approved format, 2026-10-18) | — |
| pluralize | https://github.com/blakeembrey/pluralize/tree/v8.0.0 | 8.0.0 (published 2019-05-25), MIT | Generated plural aliases, reviewed by a human in the diff, with per-entry overrides (human, 2026-10-18) | — |
