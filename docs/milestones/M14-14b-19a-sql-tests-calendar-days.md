# M14 14b-19a — SQL tests move time by Pacific calendar days

**Status:** approved (human, 2026-11-01: "Approve, build it", to "Build 14b-19a as drafted?"), in progress. It was drafted from one round of guided questions (2026-11-01, Pacific) after PR #149's `db` check failed on the day US daylight saving ended. It rides PR #149 as its own commit (answer 1).

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
- [ ] **`load_sync.test.sql`:** "a day passes" (`pass_a_day`) and "before today began" move times by Pacific calendar days.
- [ ] **`answer_search.test.sql`:** "added tomorrow" (`+ interval '1 day'`) and "removed in two days" do the same.
- [ ] **The other seven files are read, and each one left as is says why in this ticket:**
  - `account_deletion` and `test_misses`: only relative order, or a far-off date.
  - `misses`: the 2000 and 2099 days.
  - `database_gaps` and `subsets`: two or three days back, always before a day that began at most 25 hours ago.
  - `profile`: 30 days, as the code's own interval.
- [ ] **The proof:** before 08:00 UTC on 2026-11-02 (the 25-hour day), PR #149's `db` jobs pass with the change, where `main`'s re-run failed tests 18 to 21, 44 and 45 on the same day.
- [ ] **No code changes:** no migration, nothing under `src/`.

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
2. **The shift:** in each file, a `pg_temp` function shifts a time by whole Pacific days:
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
- The 24-hour shifts that meant a calendar day, in `load_sync.test.sql` and `answer_search.test.sql`.
- ROADMAP's For M13 `load_sync` item.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
