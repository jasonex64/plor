# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-21, by the session that closed M06.

## Where things stand
- **M06, Puzzle entry, is done.** PR #33 merges on green CI (human, 2026-10-21: "just merge", which also OKs its CLAUDE.md "Puzzle drafting" exception). The human waived playing the end-to-end day.
- **The first drafted day, 2026-10-22,** is PR #34 (branch `content-2026-10-22`). It merges after #33. It is approved on the local database only.
- **New rule (human):** a host answer's name must avoid the stolen letters (DECISIONS.md Log). Drafted days were fixed to match, and 2026-11-05 is parked (M06 ticket, Evidence).

## Waiting on the human
- **M07** needs the display name's maximum length and allowed characters, and the per-place limit on the "where everyone ended" picture.
- **M12** needs to know whether usernames can change, and how often (Claude suggested once a month).
- Three drafted days repeat categories of 2026-10-22: car brand (11-06), state capitals (11-10) and tea (11-16). The human may want new questions for them.

## Next step
Draft the M07 ticket (friends and live board, with the display name) for the human's approval, on a new `m07-…` branch.

## Local state
- The local Supabase stack holds `jasonex64` as an admin and the approved 2026-10-22 day.
- To run it on another machine: `npm ci`, `npx supabase start`, `npx supabase migration up`, then `npm run dev`. Sign-in codes are in Mailpit at `http://127.0.0.1:54324`. A session adds an admin by inserting the user ID into `private.admin` locally.
