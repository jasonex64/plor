# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that closed M06 and started M07.

## Where things stand
- **M06 is done and merged** (PR #33). The first drafted day, 2026-10-22, was PR #34, merged.
- **M07, Friends and live board** (branch `m07-friends-and-live-board`):
  - every decision (D1–D7) is answered;
  - plan step 1's two experiments passed;
  - 7a, the display name, is merged (PR #35);
  - 7b, invite links and friends, is built and in review, with the human's OK on its tables and grants (2026-10-22).
- **Next sub-ticket: 7c,** the live board. Playwright is installed with it (D7).

## Waiting on the human
- **M12:** whether usernames can change, and how often (Claude suggested once a month).
- **Before approving the later drafted days,** note:
  - three repeat 2026-10-22's categories: car brand (11-06), state capitals (11-10) and tea (11-16);
  - several had a host swapped under the host-name rule (M06 ticket, Evidence).
- **Superpowers:** the human asked about the plugin. Its install card was shown in chat; whether it was installed is unknown.

## Next step
Merge the 7b PR on green CI, then build 7c on the same branch, following the ticket's 7c design and the plan step 1 evidence.

## Local state
- The local Supabase stack is stopped, with its data kept. It has migrations up to `20261022070948_friends.sql` applied, `jasonex64` as an admin, and the approved 2026-10-22 day. No dev server is running.
- To run it on another machine: `npm ci`, `npx supabase start`, `npx supabase migration up`, then `npm run dev`. Sign-in codes are in Mailpit at `http://127.0.0.1:54324`. A session adds an admin by inserting the user ID into `private.admin` locally.
