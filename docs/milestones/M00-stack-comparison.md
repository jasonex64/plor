# M00 — Stack comparison

**Status:** decided 2026-10-17: Stack A (DECISIONS.md Log)

> **Since this ticket (2026-10-21 docs audit):**
> - The "Still open after choosing A" items are decided in DECISIONS.md "Current" (route handlers, Vercel `iad1`, Vitest plus pgTAP, the `log` module, the `AppError` wrapper, Postgres 17).
> - SOURCES.md, not the "Proposed SOURCES.md entries" table below, is the pinned list; the anonymous-auth row was never added, since sign-in is required before play (DECISIONS.md Player identity).
> - "M07" in "How A meets R2" and its two UNVERIFIED Broadcast questions meant the live-board milestone; that is M07 (friends and live board) today too, and the design and questions still stand for it.
>
> Milestone numbers here are the ones in use when it was written; ROADMAP.md has today's.
Research was done on 2026-10-17 using official docs, release pages and pricing pages only. Anything marked **UNVERIFIED** could not be confirmed from those pages.

## Requirements that test the stack
| # | Requirement (from ROADMAP / DECISIONS) |
|---|---|
| R1 | The server checks answers, and host answers are never readable by clients |
| R2 | Live friends board, sent to friends only. A viewer gets status only until they finish, then details. Enforced in the payload. |
| R3 | One run per user per day. Ledger entries unique per (user, game, date). Retries are safe. |
| R4 | Leaderboard is a SUM over the ledger |
| R5 | ~~Play as a guest, then sign in and keep the result~~ **Superseded on 2026-10-17: sign-in is required before play, so this no longer affects the choice.** |
| R6 | Connection spike at the daily reset |
| R7 | Local development on Windows, with fast local tests |

## Options
- **A.** Next.js + Supabase (Postgres, Auth, Realtime)
- **B.** Next.js or Vite + Firebase (Auth, Firestore listeners, Cloud Functions)
- **C.** Vite PWA + Fastify + Postgres + SSE + Better Auth, on Fly.io or Render

## How each option fits
| | A: Supabase | B: Firebase | C: Self-hosted |
|---|---|---|---|
| **R1** | The secret key "bypasses every Row Level Security policy" and must never reach the browser. RLS must be on for every exposed table. A `security definer` function in an exposed schema is callable "with the creator's privileges". | "The server client libraries bypass all Cloud Firestore Security Rules." Host answers live in a collection with `allow read: if false`. | Ordinary server code. |
| **R2** | Private Broadcast topics. Authorization is checked "when the user connects", and the result is "cached for the duration of the connection". Postgres Changes runs "on a single thread", with guidance to switch to Broadcast above roughly 3,000 subscribers. | "security rules are not filters—queries are all or nothing." Status and details would need separate documents, queries must list friend IDs explicitly, and each rule check allows at most 10 `get()` calls. Each friend's update is billed as a read for every friend listening. | Gating is plain code. Fan-out has to be built: LISTEN is "not supported with pooled connections" on Neon, notifications aren't queued (so updates need a table plus replay), and HTTP/2 is required to avoid the browser's 6-connections-per-domain cap. |
| **R3** | Postgres unique constraints and transactions. | Deterministic document IDs plus create-only rules or transactions. There are no multi-column unique constraints. | Postgres. |
| **R4** | SQL `SUM`. | `sum()` exists, but "you can't use aggregation queries with real-time listeners", and it's billed per 1,000 index entries. | SQL `SUM`. |
| **R5** | Anonymous sign-in plus manual linking. Merging into an existing account is our code. CAPTCHA is recommended, and the default limit is 30 anonymous sign-ins per hour per IP. | Anonymous auth plus linking. Linking "will fail if the credentials are already linked", so we merge. | Better Auth's anonymous plugin with `onLinkAccount`. The anonymous user is deleted on link by default. |
| **R6** | Published limits. With the Pro spend cap on: 500 concurrent connections and 500 messages per second. With the cap removed: 10,000 connections and 2,500 messages per second. "All limits are configurable per project." | No listener cap found (**UNVERIFIED**). New collections should ramp from 500 ops/s, then +50% every 5 minutes, and date-keyed documents created at the reset are a hotspot risk. | Up to us. Fly's `soft_limit` defaults to 20 connections, and Fly's default idle timeout is **UNVERIFIED**. |
| **R7** | Docker Desktop, plus pgTAP tests via `supabase test db`. | JDK 11+ for the emulator, plus `@firebase/rules-unit-testing`. | Postgres via Docker or the Windows installer, plus Testcontainers. |
| **Cost (entry)** | Free: $0, but the project is "paused after 1 week of inactivity". Pro: from $25/month. | Spark has free daily quotas. Per-operation prices are **UNVERIFIED**, and export requires Blaze. | Neon Free can't turn off scale-to-zero, which drops LISTEN sessions. Fly Managed Postgres is $38/month. App hosting costs are **UNVERIFIED**. |
| **Exit path** | It's "a full Postgres database", and Supabase can be self-hosted with Docker (without managed backups or point-in-time recovery). | The Firestore data model and rules don't carry over to another database. | No lock-in. |

The guest-to-account merge (R5) has to be written by us whichever stack we pick. It's also a product decision: if the account already has a run for today, which result wins?

## Recommendation: A (Next.js + Supabase)
1. **The data is relational.** Friendships, one run per day, a unique ledger and a SUM leaderboard are exactly what Postgres constraints handle. A broken rule fails at the database with a constraint error instead of relying on app code. That counts against B: its rules model works against R2, it can't do live aggregation for R4, and it bills every friend update as a read.
2. **There's much less to build than C.** Auth with anonymous linking, realtime fan-out and managed backups come with the platform. C's one real advantage is that gating is just code, and A gets the same benefit with the topic design below.
3. **C is A's way out.** If Supabase Realtime limits ever become a problem, we can replace only the realtime layer with our own SSE server on the same Postgres database, without moving any data.

### How A meets R2 (confirm in M07)
- Each viewer subscribes to one private topic, `board:<viewer_id>`. The policy only checks that the topic matches the user's own ID. That rule never changes, so connection-level policy caching causes no problems.
- When a player answers, server code builds a payload for each friend: **status only** if that friend hasn't finished, **details** if they have. All the gating lives in one server function that can be unit-tested.
- When a viewer finishes, the client fetches the full board through a normal server call that uses the same gating function.
- Postgres Changes is not used.
- **UNVERIFIED (check in M07):** whether Broadcast can send to many topics in one call, and whether a database-side `realtime.send()` is part of the surrounding transaction.

### Risks we accept with A
1. **Connection and message caps at the reset.** The Pro plan with the spend cap on allows 500 connections and 500 messages per second. Message volume is roughly answers per second × average number of friends. We need a human-set load target to know whether to remove the spend cap (that raises the limits to 10,000 connections and 2,500 messages per second).
2. **Keeping host answers secret depends on discipline.** RLS must be on for every exposed table, host answers must stay outside exposed schemas, no `security definer` functions can sit in exposed schemas, and every route handler must re-check auth. A test will assert that the `anon` and `authenticated` roles can't read host answers.
3. **Local development on Windows needs Docker Desktop.**
4. **The free tier pauses after a week of inactivity.** Staging can run on Free, with `scripts/status` flagging a paused project. Production runs on Pro.

### Still open after choosing A (separate DECISIONS rows)
- **Where server logic lives.** I recommend Next.js route handlers, so there's one language and one runtime, with constraints enforced in Postgres. The alternatives are Edge Functions, which run on Deno (a second runtime), and Postgres functions.
- **Next.js hosting.** Not researched yet. Vercel or another host needs its own pinned limits and pricing before we choose.
- **TypeScript test runner, logging and error handling.** Not researched yet. pgTAP covers database tests.
- **Postgres major version.** Supabase builds 15.19 and 17.11 are listed. Use 17 if it's offered when the project is created. The default for new projects is **UNVERIFIED**.

## Proposed SOURCES.md entries (added only after human approval)
| Topic | Source | Version / date | Authoritative for |
|---|---|---|---|
| Frontend + server routes | nextjs.org/docs (App Router) | 16.4.2, released 15 Oct (year **UNVERIFIED**), accessed 2026-10-17 | Route handlers, data security, the PWA guide |
| Supabase client | github.com/supabase/supabase-js | 2.118.0 (2026-10-15) | Client API |
| Supabase CLI | supabase.com/docs/guides/local-development | 2.121.0 (2026-10-14) | Local stack, pgTAP tests |
| Realtime | supabase.com/docs/guides/realtime (`/authorization`, `/broadcast`, `/limits`) | accessed 2026-10-17 | The live board |
| Auth | supabase.com/docs/guides/auth/auth-anonymous | accessed 2026-10-17 | Guest play and linking |
| Database | postgresql.org/docs/17 | 17.x | Constraints, transactions |
