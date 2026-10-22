# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-21, by the session that closed M06 and drafted M07.

## Where things stand
- **M06 is done and merged** (PR #33). The first drafted day, 2026-10-22, is PR #34 (branch `content-2026-10-22`), which merges on green CI.
- **M07, Friends and live board:** the ticket is drafted on branch `m07-friends-and-live-board` (`docs/milestones/M07-friends-and-live-board.md`). No code yet and no PR yet.

## Waiting on the human
- **M07 D1–D7** in the ticket: display name rules, named friends per place, invite code length, removing friends, and two security changes (a Realtime-only browser client; sending board updates with `realtime.send()`). Also the two-client test tool (Playwright).
- **M12:** whether usernames can change, and how often (Claude suggested once a month).
- **Repeated categories:** three drafted days repeat 2026-10-22's: car brand (11-06), state capitals (11-10) and tea (11-16). Several drafted days also had a host swapped by the host-name rule (M06 ticket, Evidence). Both are worth a look when approving them.

## Next step
Once D1–D7 are answered, record them in the ticket and run M07's plan step 1: the two experiments on the local stack. Then build 7a.

## Local state
- The local Supabase stack is stopped (data kept). It holds `jasonex64` as an admin and the approved 2026-10-22 day. No dev server is running.
- To run it on another machine: `npm ci`, `npx supabase start`, `npx supabase migration up`, then `npm run dev`. Sign-in codes are in Mailpit at `http://127.0.0.1:54324`. A session adds an admin by inserting the user ID into `private.admin` locally.
