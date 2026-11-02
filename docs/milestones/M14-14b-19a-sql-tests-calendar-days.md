# M14 14b-19a — SQL tests move time by Pacific calendar days

**Status:** approved (human, 2026-11-01: "Approve, build it", to "Build 14b-19a as drafted?"), in review (PR #149). It was drafted from one round of guided questions (2026-11-01, Pacific) after PR #149's `db` check failed on the day US daylight saving ended. It rides PR #149 as its own commit (answer 1).

## Goal
Every SQL test that moves a time "a day" back or forward moves it by a Pacific calendar day, as the database counts days, so the tests pass on 23- and 25-hour days too.

## Who uses it / what breaks without it
- **Used by:** every PR's `db` check, and `npx supabase test db`.
- **Breaks without it:** on each clock-change day, `load_sync.test.sql` fails tests 18 to 21, 44 and 45, and no PR can merge on green.
  - Seen 2026-11-01: PR #149's `db` jobs failed, and so did `main`'s run 41280608477, re-run at 04:36 UTC on 2026-11-02 against `main`'s own code.
  - The tests shift times by `interval '1 day'` (24 hours), while `private.today()` and the cutoffs count Pacific calendar days. On a 25-hour day a 24-hour shift can stay inside the same Pacific day.

## What the human decided (2026-11-01, on the Windows PC, quoted)
1. Where: "In PR #149, own ticket" ("A small ticket (14b-19a) and its own commit on the M14 branch, riding PR #149. Fastest, and its CI run doubles as the proof, but the PR carries two tickets.").
2. Scope: "Every SQL test (Recommended)" ("Fix load_sync, then read the other 8 SQL tests that move times by days and fix any that cross Pacific midnight the same way. Nothing left to fail on the March change; a bit more reading.").
3. The fix: "A Pacific calendar day (Recommended)" ("Shift by one day on the Pacific calendar (8:36 pm Nov 1 → 8:36 pm Oct 31), as the code counts days. Right on every day, 23-, 24- or 25-hour.").
4. Proof: "CI tonight (Recommended)" ("Push before 08:00 UTC, while today is still 25 hours: main's re-run is the red, the fixed run the green.").

## Source
- **PostgreSQL 17, Date/Time Functions and Operators** (SOURCES.md, PostgreSQL), `AT TIME ZONE`:
  - `timestamptz AT TIME ZONE zone` gives that zone's local time;
  - `timestamp AT TIME ZONE zone` reads a local time back as a `timestamptz`;
  - `timestamp - interval '1 day'` moves the calendar, not 24 hours.
- **The code under test:**
  - `private.today()` and `private.next_reset()` (`supabase/migrations/20261028140000_baseline.sql:900-912`);
  - the load's cutoffs, `(private.today() - 1)::timestamp at time zone 'America/Los_Angeles'` (`:1897`) and `(private.today() + 1)…` (`:1938`).
  - All count Pacific calendar days. The code is unchanged.

## Acceptance criteria
- [x] **`load_sync.test.sql`:** "a day passes" (`pass_a_day`) and "before today began" move times by Pacific calendar days.
- [x] **`answer_search.test.sql`:** "added tomorrow" (`+ interval '1 day'`) and "removed in two days" do the same. *Amended on reading the file closely (Source diff): it stays as it is, because both shifts only need to land after `now()`.*
- [x] **The other seven files are read, and each one left as is says why in this ticket:**
  - `account_deletion` and `test_misses`: only relative order, or a far-off date.
  - `misses`: the 2000 and 2099 days.
  - `database_gaps` and `subsets`: two or three days back, always before a day that began at most 25 hours ago.
  - `profile`: 30 days, as the code's own interval.
- [x] **The proof:** before 08:00 UTC on 2026-11-02 (the 25-hour day), PR #149's `db` jobs pass with the change, where `main`'s re-run failed tests 18 to 21, 44 and 45 on the same day.
- [x] **No code changes:** no migration, nothing under `src/`.

## Out of scope
- **The code's day arithmetic:** it already counts Pacific calendar days (Source).
- **Freezing the database clock in tests:** PostgreSQL has no supported way to fake `now()`.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| `America/Los_Angeles` | The tests' calendar | The code's own zone (`private.today()`, baseline `:900-912`) |
| 08:00 UTC, 2026-11-02 | The proof's deadline | Midnight Pacific (PST, UTC−8) ending the 25-hour day |

## Plan
1. **Hypothesis:** shifting by a Pacific calendar day makes tests 18 to 21, 44 and 45 pass on today's 25-hour day. Disproved if PR #149's `db` jobs still fail them before 08:00 UTC; then I stop and ask.
2. **The shift:** in each file that needs it (`load_sync.test.sql` alone, Source diff), a `pg_temp` function shifts a time by whole Pacific days:
   ```sql
   ((t at time zone 'America/Los_Angeles') + make_interval(days => n)) at time zone 'America/Los_Angeles'
   ```
   It replaces the `± interval 'N day(s)'` that mean "that day".
3. **Read the other files:** record why each stays.
4. **Check:**
   - Push and let CI run the `db` jobs; the local stack is down (Docker isn't running).
   - Fill in the Evidence, the ROADMAP item and HANDOFF.
   - Run the `reviewer` agent.

## Removes
- The 24-hour shifts that meant a calendar day, in `load_sync.test.sql`. Not `answer_search.test.sql`'s: none means one (Source diff).
- ROADMAP's For M13 `load_sync` item.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| `answer_search.test.sql`'s "added tomorrow" and "removed in two days" move by calendar days (criterion 2, as approved) | Left as they are; criterion 2 amended | The past day's answers are fixed at its `approved_at`, which is `now()` (`answer_search.test.sql:25`; `answers_as_of` is the later of `approved_at` and the day's start, baseline `:950-952`, and that day's 2000-03-01 start is long past). `added_at` a day on (`:45-46`) and `removed_at` two days on (`:76`) only need to land after `now()`, as any forward shift does on any day's length |
| A `pg_temp` function in each file that needs one (Plan 2) | One, `pg_temp.days_back` in `load_sync.test.sql` | It's the only file that needs it |

**Why each other file stays** (criterion 3):
- **`account_deletion`:** join times 3 and 2 days back plus hours only order the members; no day boundary is read.
- **`answer_search`:** above.
- **`database_gaps`:** its days are 2000-02-01 to 05 (`database_gaps.test.sql:24-28`) and it never reads `today()`. Each day's answers are as of its `approved_at`, two days back, so only the order of times against `now()` matters.
- **`misses` and `test_misses`:** the days are in 2000 and 2099, and `approved_at` one or two days back is only compared with times, not with a Pacific midnight near now.
- **`profile`:** 30 days minus or plus a second, from `statement_timestamp()`, as the code's own `interval '30 days'` (`baseline.sql:1104`), so the test and the rule count the same way.
- **`subsets`:** its days are in 2000 (`subsets.test.sql:126-128`, `:148-150`), as of `approved_at` two days back, over a base three days back (`:116-118`), so again only the order of times matters; its 2099 day resolves as of 2099.

## Evidence
- **The red:**
  - `main`'s CI run 41280608477 passed at 06:23 UTC on 2026-11-01, before the clocks went back at 09:00 UTC.
  - Its `db` job, re-run at 04:36 UTC on 2026-11-02 (still the 25-hour Pacific 2026-11-01), failed `load_sync.test.sql`: `Failed tests: 18-21, 44-45` (`Wstat: 0 Tests: 50 Failed: 6`).
  - PR #149's first `db` jobs failed the same six.
- **The green:** with aed014d, PR #149's run 41389754162 gave `load_sync.test.sql ......... ok`, `Result: PASS`, its `db` job finished at 04:43:28 UTC on 2026-11-02, the same 25-hour day. Every check on aed014d passed: `db`, `e2e`, `check`, `secrets`, Vercel, each in both runs.
- **The working, reasoned** (the reviewer's arithmetic, matching the log):
  - A row the load ended carries tonight's Pacific midnight.
  - Two 24-hour shifts left it an hour after the cutoff (the start of yesterday), so it wasn't erased.
  - Two calendar days put it on the cutoff, so it is.
  - Tests 44 and 45 are most likely knock-on failures of those rows staying; they pass with them erased.
- **Local runs:** none. Docker Desktop isn't running, so the local stack is down.

## Review
- **Reviewer** (`reviewer` agent, fresh context, 2026-11-01):
  - **The fix:** `pg_temp.days_back` is correct, worked through the 25-hour day, a normal day, the day after and next spring's 23-hour day.
  - **The other files:** none of the seven can fail on a 23- or 25-hour day.
  - **`shell.e2e.ts` (e32a0cd):** fixes a real race and isn't a weakened test.
  - **Blocking, all fixed here:**
    - Criterion 2, Plan 2 and Removes still said `answer_search.test.sql` would change. Amended, with the reason.
    - Two wrong reasons (`database_gaps`, `subsets`) and `answer_search`'s wording. Rewritten from the files.
    - This Evidence and Review, the ROADMAP row, the For M13 item, and HANDOFF.
- **Deferred to ROADMAP "Next revision":**
  - `load_sync.test.sql` says "two days ago" two ways.
  - The For M13 item's wording: it failed the day after the fall change too, and that's corrected in the item as closed.
