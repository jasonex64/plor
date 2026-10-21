# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-21, by the session that closed M05, ran the docs audit and merged #32.

## Where things stand
- **Milestone:** M06, Puzzle entry. Ticket drafted (`docs/milestones/M06-puzzle-entry.md`), waiting for the human's approval.
- **Branch:** `m06-puzzle-entry`. Its first PR, #32, holds the docs audit (MVP redefined, puzzle entry inserted, milestones renumbered M07–M15, docs cleaned up). Merged on green CI (human, 2026-10-21: "manual is fine", summary "looks fine").
- **Merged today:** M05 Share (#30), the first reorder (#31).

## Waiting on the human
- M06: decisions P1–P4 and the number of upcoming days the list shows (ticket). For M07: the display name's length and characters. For M12: whether usernames can change, and how often. Claude explained the tradeoffs on 2026-10-21 and suggested a limit of once a month (a human number).

## Next step
Once the human approves the M06 ticket: build it in the order of its Plan, on `m06-puzzle-entry`.

## Local state
- Nothing left running. Docker Desktop may still be open on the human's machine. The local Supabase stack is stopped, and its data is kept.
- The local database has a puzzle for 2026-10-21, loaded by hand by an earlier session. No content file covers any date before 2026-10-26.
