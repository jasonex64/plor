# M00 — Hard-to-reverse design (draft, revision 4)

*Updated 2026-10-21 to match the built schema (migrations up to 20261021084917); the decisions are unchanged and the earlier text is in git.*

**Status:** Q1–Q5 answered by a human on 2026-10-17. Review 2's blocking findings are fixed in this revision. **Approved by a human on 2026-10-17.** Once approved, each section's decision is copied into the "Hard to reverse" table in DECISIONS.md.
Sources: Supabase docs (keys and RLS, Realtime) and PostgreSQL 17 (`ddl-priv`), as pinned in SOURCES.md.

## Principles used throughout
- **Route handlers are the only way in to game data.** Every game table, view and function lives in the **`private` schema**, which the Data API doesn't expose. Route handlers connect as the least-privileged `plor_app` role (DECISIONS.md: App database role) and contain the single gating function. As a backstop, RLS is enabled with no policies *(amended in M02, human-approved 2026-10-18: no policies for `anon` or `authenticated`, and policies for `plor_app` only, because with none RLS locks out plor_app too; DECISIONS.md: Row-level security in `private`)*, and grants to `anon` and `authenticated` are revoked. pgTAP tests prove that those two roles can't reach any `private` object, including views. Views run as their owner and skip RLS, so a view left in `public` would leak data; that's why views live in `private` too. *(fixes review 2, BLOCKING 1)* The status view is also `security_invoker`, so a reader needs its own grants on the tables (`20261019074108_create_game_tables.sql`).
- **The database enforces invariants.** Uniqueness, append-only rules and foreign keys live in Postgres, so a bug in app code fails at the database with a constraint error instead of corrupting data.
- **The database clock decides what "today" is.** One SQL function, `private.today()` (section 8), is the only definition of "today". The run start, the lookup of today's puzzle, the countdown to the next reset (`private.next_reset()`) and `content:publish` all call it (`src/game/runs.ts`; `20261021084917_reveal_next_and_reset.sql`). TypeScript never computes the date. The date is **pinned when a run starts**, and the client never sends a date or a timezone. *(fixes review 2, BLOCKING 2)* Since 2026-10-21 the day no longer ends a run; each question's timer does (section 5).

## 1. Persisted data and migrations
- The schema changes only through Supabase CLI migrations. A migration that has been applied is never edited; a fix is a new migration.
- Tests run against a fresh local database (`supabase db reset`, then pgTAP), and CI does the same. Constraints, grants and RLS get pgTAP tests. Application logic is tested in TypeScript.

## 2. Network messages
- **HTTP API:** each request sends an `x-protocol: <int>` header. A mismatch gets `409 client_outdated`, and the client reloads loudly. The version is bumped only for breaking API changes, not on every deploy. It is 3 today (`src/lib/protocol.ts`: 2 for typed answers, 3 for the reveal and Next).
- **Realtime payloads:** `{ v: <int>, type, ... }`. If `v` is unknown, the client logs an error and refetches the board over HTTP. Built in M07 7c: `src/app/board.tsx`, payload `v` 1.
- **Questions are served one at a time.** The response to an answer is the run after it: that question's result and host answers (the reveal). The next question comes from `POST /api/run/next`, when the player taps Next (`src/game/runs.ts`, `openNext`; `src/app/api/run/next/route.ts`).

## 3. Player identity
- **You must sign in before playing.** A human decided this on 2026-10-17 (Q2). There are no anonymous users, no guest runs and no account linking.
- **ID:** the Supabase `auth.users.id` (UUID).
- **Profile:** `private.profile(user_id uuid pk → auth.users on delete cascade, username citext unique not null, created_at)`. It's created at first sign-in, before the first run; starting a run without one gets `409 no_profile` (`src/app/api/run/start/route.ts`).
- **Sign-in method:** a 6-digit code sent by email, and Google, both through Supabase Auth (decided in M02; the code replaced the magic link on 2026-10-20; DECISIONS.md: Sign-in).
- **Sign-up abuse controls:** Supabase Auth's default rate limits, decided by a human on 2026-10-17 (Q5: "try default for now"). Revisit with beta data.
- **Accepted residual risk:** someone can create a second account to scout host answers. Requiring sign-in raises the cost of that but doesn't remove it.

## 4. Puzzle content format
- **Authoring:** JSON files at `content/<game_id>/<YYYY-MM-DD>.json` with `"format": 2` (format 1 plus an optional `steals` letter per question), checked by a single TypeScript validator (`src/content/puzzle.ts`, M01) that the server code also imports.
- **Storage:** `private.puzzle(game_id text, puzzle_date date, content jsonb, pk(game_id, puzzle_date))`, with a check that the content names its own game and date. *(Trimmed in M02: `format` lives in `content`, and nothing read `content_hash` or `published_at`.)*
- **Publishing:** `npm run content:publish` validates the files and upserts them. **It refuses to change a puzzle whose `puzzle_date <= private.today()`**: a `BEFORE UPDATE` trigger raises `OB004 puzzle_started`, inside the same statement as the upsert (`20261019074108_create_game_tables.sql`).
- **Matching** is pure TypeScript with unit tests (`src/game/matching.ts`). The player types text, and the server alone turns it into an entry: `resolveTyped(question, typed, stolen) → entry_id | null`, where null means "not in our list" (a free retry, logged as a miss). Then `matchAnswer(question, entry_id) → matched | not_matched`.

## 5. Runs and run events
```
private.run(
  user_id uuid → auth.users on delete cascade,
  game_id text, puzzle_date date,
  started_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date),
  foreign key (game_id, puzzle_date) → puzzle
)

private.run_event(
  user_id uuid, game_id text, puzzle_date date,
  question_idx smallint, entry_id text not null, matched boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date, question_idx),
  foreign key (user_id, game_id, puzzle_date) → run on delete cascade
)

private.question_open(
  user_id uuid, game_id text, puzzle_date date,
  question_idx smallint check (question_idx > 0),
  opened_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date, question_idx),
  foreign key (user_id, game_id, puzzle_date) → run on delete cascade
)
```
- **Starting a run** (`POST /api/run/start`) inserts `run` with `puzzle_date = private.today()`. The primary key gives **one run per user per day**, and the run's date is pinned from that moment. The foreign key to `puzzle` means no run exists for an unpublished day (`404 no_puzzle_today`).
- **The timer ends the run, and the database enforces it.** Each question gets 20 seconds; `private.question_deadline` is the one place that number lives. Question 1 starts with the run (`started_at`); every later question starts when the player taps Next after the reveal, which inserts a `question_open` row. A `BEFORE INSERT` trigger on `run_event` raises `OB006 not_open` for a question not yet opened and `OB005 time_up` after its deadline, checked at the statement's own time inside the answer transaction (`20261021081057_question_timer.sql`, `20261021084917_reveal_next_and_reset.sql`). The day no longer ends a run: a run started before midnight can be finished after it (DECISIONS.md, Game 1: Timer). The `day_over` check was removed in `20261021081057`.
- **Run status** is a view, `private.run_status`, over `run`, `run_event`, `question_open` and `private.puzzle` (for the question count). It also gives the current question's `deadline`, which is null while the reveal waits for Next. It has four states:
  - **in_progress** (on question k, or at the reveal waiting for Next)
  - **died** (a matched event)
  - **survived** (every question answered without a match)
  - **timed_out** (the current question's deadline has passed)

  The live board (M07) reads this view.
- **No run is abandoned any more.** Q4's "abandoned runs score zero" (human, 2026-10-17) was replaced on 2026-10-21: every run ends with a catch, its last question, or a question's time running out, and a run left at a reveal stays in progress (DECISIONS.md, Game 1: Timer). There's still no closing job.
- **Retries are safe.** Resubmitting text that names the same entry returns the stored result. A different entry for an index that's already answered gets `409 already_answered`. Tapping Next twice returns the same run.
- **Order is enforced** in one transaction: `question_idx` must equal the number of existing events (`OB002 out_of_order`), and nothing is accepted after a matched event or the last question (`OB003 run_over`). The same rules apply to `question_open`.

## 6. Points ledger (written from M09, when the leaderboard is built; settled by the M09 ticket, 2026-10-22)
```
private.points_ledger(
  id bigint generated always as identity primary key,
  user_id uuid → auth.users on delete cascade,
  game_id text, puzzle_date date,
  points integer not null check (points >= 0),   -- the ladder plus the final rarity bonus
  bonus integer not null check (bonus between 0 and points),
  created_at timestamptz not null default now(),
  unique (user_id, game_id, puzzle_date)
)
```
*Not built yet.* This is the design for the points milestone (M09).
- **Rarity bonus** (human, 2026-10-22, M09; DECISIONS.md, Game 1: Scoring): each survived answer before the day's midnight also earns a bonus, bigger the rarer the answer was that day, capped below the points of the first question the run didn't survive. `points` holds the total, `bonus` the bonus part. The exact numbers are in the M09 ticket.
- **Formula** (human, 2026-10-21, M04 G1; DECISIONS.md, Game 1: Scoring): surviving questions 1 to 7 earns 25, 50, 75, 100, 150, 250 and 350 points (`POINTS_PER_QUESTION` in `src/config/tunables.ts`). A run's ladder points are the sum for the questions it survived (1000 for a perfect run), and the rarity bonus comes on top. It replaced *k* points for question *k* (Q3, accepted by a human on 2026-10-17).
  *Example:* a player who dies on Q4 has survived Q1–Q3, so they score 25 + 50 + 75 = 150.
- **Which runs count** (human, 2026-10-22, M09 D1 and D2):
  - every finished run, for the day it was played, even one finished after midnight (this replaced 2026-10-21's "doesn't count for the leaderboard");
  - a run that ran out of time scores the questions it survived, like a caught run;
  - a run left at a reveal counts once the player comes back and finishes it; one never finished counts nothing.
- **When it's written** (human, 2026-10-22, M09 D3, D9, D10): once the run is finished **and its day is closed**, since the final bonus needs the day's counts. A day closes at its midnight Pacific; there's no scheduler. One settling function writes a row for each such run that has none, inserting with `ON CONFLICT (user_id, game_id, puzzle_date) DO NOTHING`, so a retry or rerun never awards points twice. The leaderboard calls it for the players it shows just before it sums. The final bonus uses only answers recorded before the day's midnight, so when settling runs doesn't change the result.
- **Backfill** *(fixes review 2, BLOCKING 3)*: settling is the backfill. A run from before M09 gets its row, rarity bonus included, the first time a leaderboard shows its player, computed from its stored answers, so there's no separate `ledger:backfill` script (M09 D3).
  - **Evidence:** settle every player twice. The second time writes 0 rows, and the ledger sum equals the recomputed score for every finished run.
- The leaderboard is `SUM(points)` over the ledger.

## 7. Append-only enforcement (`run`, `run_event`, `points_ledger`)
- `REVOKE ALL` on these tables from `anon`, `authenticated` and `service_role`, then `GRANT SELECT, INSERT` to `plor_app` only (plus `USAGE` on schema `private`). This removes UPDATE, DELETE and TRUNCATE (PG17 lists TRUNCATE as its own privilege). `plor_app` doesn't bypass RLS and is bound by grants. *(Changed 2026-10-17: was `service_role`, before the app role existed.)* `question_open` follows the same rule; `missed_answer` gets INSERT, plus SELECT for the admin insights (`20261019074108_create_game_tables.sql`, `20261021084917_reveal_next_and_reset.sql`, `20261020061754_create_admin_and_insight_grants.sql`).
- pgTAP tests check that `anon`, `authenticated` and `service_role` hold no privilege on any `private` table or view (`supabase/tests/private_schema.test.sql`), that `plor_app` holds exactly its listed grants (`plor_app_role.test.sql`), and that `plor_app` can't update, delete or truncate the game tables (`game.test.sql`).
- **Account deletion (M12)** relies on `on delete cascade` from `auth.users`. This is **verified**: deleting the auth user removes the profile (`supabase/tests/profile.test.sql`) and the runs, answers and misses (`supabase/tests/game.test.sql`), even though nobody holds DELETE.

## 8. Day boundary
**Decided (Q1, by a human on 2026-10-17):** one **global** reset at **midnight Pacific time, following daylight saving** (`America/Los_Angeles`). That's 08:00 UTC in winter (PST) and 07:00 UTC in summer (PDT).
- **"Today"** = `private.today()`, which returns `private.day_of(statement_timestamp())`, that is `(statement_timestamp() at time zone 'America/Los_Angeles')::date`. It's the only definition, and TypeScript calls it when it needs the date. It uses the statement's time, not the transaction's (`now()`), so a publish transaction begun just before midnight can't change the new day's puzzle by its later statements. This narrows that window but doesn't close it: a change made just before midnight and committed just after still lands (`20261021044659_today_uses_statement_time.sql`).
- **What can break:** the day after a DST change is 23 or 25 hours long. `src/game/day.db.test.ts` finds the transitions from the IANA tz data (as Node's ICU ships it, not hand-calculated) between 2026-10-17 and 2026-11-08, which is one: 2026-11-01, when DST ends. It checks the millisecond before and the first millisecond of midnight on an ordinary day (2026-10-26), on 2026-11-01 and on 2026-11-02, and that 2026-11-01 lasts 25 hours. `supabase/tests/game.test.sql` repeats the four instants around midnight on 2026-11-01 and 2026-11-02 against the database. The spring change (a 23-hour day) isn't tested yet.

## Review log
- **Review 1 (2026-10-17):** 5 blocking findings, all fixed in revision 2. Non-blocking findings were recorded in ROADMAP "Next revision".
- **Review 2 (2026-10-17):** 3 blocking design findings, fixed in revision 4:
  - views and tables move to `private` (a view in `public` would leak data)
  - a single SQL clock, `private.today()`, with a database-enforced `day_over` trigger and an explicit `in_progress` state
  - backfill ordering, `ON CONFLICT`, and a shared scoring function

  Review 2's 4th finding, leftover guest references in other docs, was already fixed in the same change. Non-blocking findings were recorded in ROADMAP "Next revision".
- **Revision 3 (2026-10-17):** applied Q1–Q5. **Removed:** anonymous users, guest linking, the guest-merge rule, the Turnstile requirement for anonymous sign-up, and the closing job for abandoned runs. **Moved:** the ledger write moved to M08, with a one-time backfill script.
