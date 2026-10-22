# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that built M08 8b.

## Where things stand
- **M08, Comments and reactions,** is in progress on branch `m08-comments-and-reactions` (`docs/milestones/M08-comments-and-reactions.md`).
  - **8a, comments,** is merged (PR #39).
  - **8b, reactions** (on comments and on friends' runs; one per player per target; shown and allowed only once your run that day is over; past days read-only), is built, reviewed and in a PR waiting on the human. The reviewer's one blocking finding was this handoff; the rest is in ROADMAP "Next revision", From M08.
  - 8c (reports and the admin list) and 8d (live updates and the e2e test) are not started.

## Waiting on the human
- **8b, two readings to confirm before its PR merges** (ticket, Source diff, rows marked *for the human to confirm*):
  - a friend's run can get reactions while it's still being played (Claude added no "must have finished" rule);
  - you can react to your own comment.
- **8b's PR:** merge once CI is all green and the human says so.
- **M12:** whether usernames can change, and how often (Claude suggested once a month).
- **Before plor.app gets M07 and M08** (`db push`, M15 or when the human wants):
  - turn "Allow public access" off in the hosted project's Realtime settings (M07 D5);
  - check that `[[:alpha:]]` behaves the same there for display names (M07 7a, *unverified*).
- **The live board shows which question caught a friend** before you've finished, through "on question 3" then "finished", though never the answer. It's in the approved design; ROADMAP "Next revision" has it for the human.
- **Before approving the later drafted days,** note:
  - three repeat 2026-10-22's categories: car brand (11-06), state capitals (11-10) and tea (11-16);
  - several had a host swapped under the host-name rule (M06 ticket, Evidence).
- **Superpowers:** the human asked about the plugin. Its install card was shown in chat; whether it was installed is unknown.

## Next step
Once 8b is merged (and the two readings answered; change the code if the human says otherwise), build 8c on the same branch, tests first: `private.comment_report`, plor_app insert, and admin-only reads through the routes (D5, D8), with a DECISIONS.md Log row like 8a's and 8b's. A report hides the comment for the reporter at once; admins see open reports on the admin pages (401 signed out, 403 not admin, as in M03 D1) and can delete the comment.

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261022090540_reactions.sql`;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally (8b's checks didn't use that account);
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile (ROADMAP, From M08).
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
