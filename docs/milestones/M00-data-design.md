# M00 — Hard-to-reverse design (draft, revision 4)

**Status:** Q1–Q5 answered by a human on 2026-10-17. Review 2's blocking findings are fixed in this revision. **Approved by a human on 2026-10-17.** Once approved, each section's decision is copied into the "Hard to reverse" table in DECISIONS.md.
Sources: Supabase docs (keys and RLS, Realtime) and PostgreSQL 17 (`ddl-priv`), as pinned in SOURCES.md.

## Principles used throughout
- **Route handlers are the only way in to game data.** Every game table, view and function lives in the **`private` schema**, which the Data API doesn't expose. Route handlers connect as the least-privileged `plor_app` role (DECISIONS.md: App database role) and contain the single gating function. As a backstop, RLS is enabled with no policies *(amended in M02, human-approved 2026-10-18: no policies for `anon` or `authenticated`, and policies for `plor_app` only, because with none RLS locks out plor_app too; DECISIONS.md: Row-level security in `private`)*, and grants to `anon` and `authenticated` are revoked. pgTAP tests prove that those two roles can't reach any `private` object, including views. Views run as their owner and skip RLS, so a view left in `public` would leak data; that's why views live in `private` too. *(fixes review 2, BLOCKING 1)*
- **The database enforces invariants.** Uniqueness, append-only rules and foreign keys live in Postgres, so a bug in app code fails at the database with a constraint error instead of corrupting data.
- **The database clock decides what "today" is.** One SQL function, `private.today()` (section 8), is the only definition of "today". The run start, the answer insert, the status view and `content:publish` all call it. TypeScript never computes the date. The date is **pinned when a run starts**, and the client never sends a date or a timezone. *(fixes review 2, BLOCKING 2)*

## 1. Persisted data and migrations
- The schema changes only through Supabase CLI migrations. A migration that has been applied is never edited; a fix is a new migration.
- Tests run against a fresh local database (`supabase db reset`, then pgTAP), and CI does the same. Constraints, grants and RLS get pgTAP tests. Application logic is tested in TypeScript.

## 2. Network messages
- **HTTP API:** each request sends an `x-protocol: <int>` header. A mismatch gets `409 client_outdated`, and the client reloads loudly. The version is bumped only for breaking API changes, not on every deploy.
- **Realtime payloads:** `{ v: <int>, type, ... }`. If `v` is unknown, the client logs an error and refetches the board over HTTP.
- **Questions are served one at a time.** The response to an answer includes the next question.

## 3. Player identity
- **You must sign in before playing.** A human decided this on 2026-10-17 (Q2). There are no anonymous users, no guest runs and no account linking.
- **ID:** the Supabase `auth.users.id` (UUID).
- **Profile:** `private.profile(user_id uuid pk → auth.users on delete cascade, username citext unique not null, created_at)`. It's created at first sign-in, before the first run.
- **Sign-in method:** magic link and/or OAuth providers, decided in M02 against the Supabase SSR auth docs.
- **Sign-up abuse controls:** Supabase Auth's default rate limits, decided by a human on 2026-10-17 (Q5: "try default for now"). Revisit with beta data.
- **Accepted residual risk:** someone can create a second account to scout host answers. Requiring sign-in raises the cost of that but doesn't remove it.

## 4. Puzzle content format
- **Authoring:** JSON files at `content/<game_id>/<YYYY-MM-DD>.json` with `"format": 1`, checked by a single TypeScript validator (M01) that the server code also imports.
- **Storage:** `private.puzzle(game_id text, puzzle_date date, content jsonb, pk(game_id, puzzle_date))`, with a check that the content names its own game and date. *(Trimmed in M02: `format` lives in `content`, and nothing read `content_hash` or `published_at`.)*
- **Publishing:** `npm run content:publish` validates the files and upserts them. **It refuses to change a puzzle whose `puzzle_date <= private.today()`**, checked in the same transaction as the upsert.
- **Matching** is a pure TypeScript function: `(content, question_idx, entry_id) → matched | invalid_entry`, with unit tests.

## 5. Runs and run events
```
private.run(
  user_id uuid → auth.users on delete cascade,
  game_id text, puzzle_date date,
  started_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date)
)

private.run_event(
  user_id uuid, game_id text, puzzle_date date,
  question_idx smallint, entry_id text not null, matched boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date, question_idx),
  foreign key (user_id, game_id, puzzle_date) → run on delete cascade
)
```
- **Starting a run** (`POST /run/start`) inserts `run` with `puzzle_date = private.today()`. The primary key gives **one run per user per day**, and the run's date is pinned from that moment.
- **The day ends the run, and the database enforces it.** A `BEFORE INSERT` trigger on `run_event` raises `day_over` unless `run.puzzle_date = private.today()`. The check happens at insert time inside the answer transaction, so an answer can't slip in after midnight between a check and the write. The route handler maps the error to `409 day_over`.
- **Run status** is a view, `private.run_status`, over `run`, `run_event` and `private.puzzle` (for the question count). It has four states:
  - **in_progress** (on question k)
  - **died** (a matched event)
  - **survived** (every question answered without a match)
  - **abandoned** (`puzzle_date < private.today()` and neither died nor survived)

  The live board (M06) reads this view.
- **Abandoned runs score zero** (Q4, decided by a human on 2026-10-17). They get no ledger row, so there's no closing job. The view already shows them as abandoned.
- **Retries are safe.** Resubmitting the same `entry_id` returns the stored result. A different `entry_id` for an index that's already answered gets `409 already_answered`.
- **Order is enforced** in one transaction: `question_idx` must equal the number of existing events, and no earlier event can be `matched`.

## 6. Points ledger (written from M08, when the leaderboard is built)
```
private.points_ledger(
  id bigint generated always as identity primary key,
  user_id uuid → auth.users on delete cascade,
  game_id text, puzzle_date date,
  points integer not null check (points >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, game_id, puzzle_date)
)
```
- **Formula** (Q3: the human asked for points that keep increasing and accepted Claude's proposal, 2026-10-17): surviving question *k* (1-based) earns *k* points. A run that survives *n* questions scores 1 + 2 + … + *n* = *n*(*n*+1)/2. There's no completion bonus, and abandoned runs score 0.
  *Example:* a player who dies on Q4 has survived Q1–Q3, so they score 1 + 2 + 3 = 6.
- **When it's written:** in the **same transaction** as the run's ending event (the death or the last survived answer). The unique constraint means a retry can never award points twice.
- **Backfill when M08 ships** *(fixes review 2, BLOCKING 3)*:
  1. **Deploy the write path first.** From then on, every run that ends writes its own ledger row.
  2. **Then run `npm run ledger:backfill`.** It reads `private.run_status` for runs that `died` or `survived`, skipping `in_progress` and `abandoned`. It scores them with **the same TypeScript scoring function** the write path uses, and inserts with `ON CONFLICT (user_id, game_id, puzzle_date) DO NOTHING`. That makes a rerun a no-op instead of a failure, and it overlaps safely with the live write path.
  3. **Evidence:** run it twice. The second run inserts 0 rows, and the ledger sum equals the recomputed score for every finished run.
- The leaderboard is `SUM(points)` over the ledger.

## 7. Append-only enforcement (`run`, `run_event`, `points_ledger`)
- `REVOKE ALL` on these tables from `anon`, `authenticated` and `service_role`, then `GRANT SELECT, INSERT` to `plor_app` only (plus `USAGE` on schema `private`). This removes UPDATE, DELETE and TRUNCATE (PG17 lists TRUNCATE as its own privilege). `plor_app` doesn't bypass RLS and is bound by grants. *(Changed 2026-10-17: was `service_role`, before the app role existed.)*
- pgTAP tests cover each role × {UPDATE, DELETE, TRUNCATE} and assert that each one is denied.
- **Account deletion (M11)** relies on `on delete cascade` from `auth.users`. It's **unverified** whether a referential cascade works once DELETE has been revoked. A pgTAP test in M02 checks this. If it fails, deletion goes through a single owner-privileged function in a non-exposed schema.

## 8. Day boundary
**Decided (Q1, by a human on 2026-10-17):** one **global** reset at **midnight Pacific time, following daylight saving** (`America/Los_Angeles`). That's 08:00 UTC in winter (PST) and 07:00 UTC in summer (PDT).
- **"Today"** = `private.today()`, which returns `(now() at time zone 'America/Los_Angeles')::date`. It's the only definition, and TypeScript calls it when it needs the date.
- **What can break:** the day after a DST change is 23 or 25 hours long. Unit tests cover the instants right before and after midnight on both 2027 transition dates (from the IANA tz database, not hand-calculated), plus an ordinary midnight.

## Review log
- **Review 1 (2026-10-17):** 5 blocking findings, all fixed in revision 2. Non-blocking findings were recorded in ROADMAP "Next revision".
- **Review 2 (2026-10-17):** 3 blocking design findings, fixed in revision 4:
  - views and tables move to `private` (a view in `public` would leak data)
  - a single SQL clock, `private.today()`, with a database-enforced `day_over` trigger and an explicit `in_progress` state
  - backfill ordering, `ON CONFLICT`, and a shared scoring function

  Review 2's 4th finding, leftover guest references in other docs, was already fixed in the same change. Non-blocking findings were recorded in ROADMAP "Next revision".
- **Revision 3 (2026-10-17):** applied Q1–Q5. **Removed:** anonymous users, guest linking, the guest-merge rule, the Turnstile requirement for anonymous sign-up, and the closing job for abandoned runs. **Moved:** the ledger write moved to M08, with a one-time backfill script.
