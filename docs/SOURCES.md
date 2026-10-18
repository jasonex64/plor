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
| Next.js | https://nextjs.org/docs (App Router) | 16.4.2 (released 15 Oct, year unverified), accessed 2026-10-17 | Route handlers, server-only code and data security (`/app/guides/data-security`), PWA (`/app/guides/progressive-web-apps`) | — |
| Supabase client | https://github.com/supabase/supabase-js | 2.118.0 (2026-10-15) | Client API | — |
| Supabase CLI | https://supabase.com/docs/guides/local-development | 2.121.0 (2026-10-14) | Local stack, migrations, pgTAP tests (`supabase test db`) | — |
| Supabase Realtime | https://supabase.com/docs/guides/realtime (`/authorization`, `/broadcast`, `/limits`) | accessed 2026-10-17 | Live friends board: private topics, server broadcast, plan limits | — |
| Supabase keys and RLS | https://supabase.com/docs/guides/api/api-keys, https://supabase.com/docs/guides/database/postgres/row-level-security | accessed 2026-10-17 | Keeping secrets server-only, RLS on exposed tables | — |
| PostgreSQL | https://www.postgresql.org/docs/17/ | 17.x | Constraints, transactions, SQL | — |
| Supabase SSR auth | https://supabase.com/docs/guides/auth/server-side/nextjs | `@supabase/ssr` 0.12.7 (2026-09-08) | Cookie-based auth in the App Router | — |
| Vercel | https://vercel.com/docs (`/limits/fair-use-guidelines`, `/functions/configuring-functions/region`, `/logs/runtime`) | accessed 2026-10-17 | Hosting, regions, logs | — |
| Vitest | https://nextjs.org/docs/app/guides/testing/vitest | Vitest 5.0.5 (2026-10-15) | TypeScript unit tests | — |
| Supabase migrations | https://supabase.com/docs/guides/deployment/database-migrations | CLI 2.121.0 | Applying the schema to hosted projects | — |
| Supabase regions | https://supabase.com/docs/guides/platform/regions | accessed 2026-10-17 | Region choice (permanent) | — |
| Node.js | https://nodejs.org/en/about/previous-releases | v24.22.0 LTS (2026-10-14), npm 11.19.1 | Runtime | — |
| GitHub Actions: checkout | https://github.com/actions/checkout/releases | v7.0.1 (released 20 Jul, year unverified), accessed 2026-10-17. *Pending human approval.* | CI checkout step | — |
| GitHub Actions: setup-node | https://github.com/actions/setup-node (README, `docs/advanced-usage.md`) | v7, accessed 2026-10-17. *Pending human approval.* | CI Node setup: `node-version-file: package.json` reads `volta.node`, then `devEngines.runtime`, then `engines.node`; `cache: npm` | — |
