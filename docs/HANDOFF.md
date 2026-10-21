# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-21, by the session that closed M05 and ran the docs audit.

## Where things stand
- **Milestone:** M06, Puzzle entry (`docs/ROADMAP.md`). No ticket yet.
- **Branch:** `m06-puzzle-entry`. Its first PR, #32, holds the docs audit (MVP redefined, puzzle entry inserted, milestones renumbered M07–M15, docs cleaned up). It is open, waiting for the human's answer below, then merge on green CI.
- **Merged today:** M05 Share (#30), the first reorder (#31).

## Waiting on the human
- **How database changes reach plor.app.** DECISIONS.md's Migrations row used to say CI applies them automatically; CI never did, and a human runs `npx supabase db push`. PR #32 rewrites the row to say so. The human asked for a plain explanation before answering (2026-10-21).
- **"What the MVP is"** in ROADMAP.md, Product, is Claude's summary marked "for the human to confirm". The human hasn't objected or confirmed it explicitly.

## Next step
After #32 merges: draft `docs/milestones/M06-puzzle-entry.md` for approval. The human has approved puzzles moving from files into the database and the admin page writing them (2026-10-21: "yes thats fine and admincan write changes thats fine"). The ticket still has to propose the exact grants and the DECISIONS.md changes (Puzzle content format, Content publishing role) for the human to check.

## Local state
- Nothing left running. Docker Desktop may still be open on the human's machine. The local Supabase stack is stopped, and its data is kept.
- The local database has a puzzle for 2026-10-21, loaded by hand by an earlier session. No content file covers any date before 2026-10-26.
