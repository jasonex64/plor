# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that ran the design review on branch `design-review-2026-10-22`.

## Where things stand
- **M08, Comments and reactions, and M09, Points and friends leaderboard, are done** (tickets in `docs/milestones/`). Their branches are deleted.
- **Design review (docs only), on `design-review-2026-10-22`, PR open.** Claude reviewed Plor against other daily games and social apps, and the human decided: the host anticipates the dodge (M13), weekly leaderboards instead of all-time (M10), anonymous play first (M15), plus answer stats and a streak (M11). ROADMAP "Design review" has each decision with the human's words. The same PR cut "Next revision" from 129 entries to the ones someone will act on; the old list is in git at `c9d2733`.
- **No milestone branch is open for M10.**
- **M16, Game 2 (the substring game),** has a draft ticket in PR #42 from `m16-game-2`, docs only, after launch. The name (S1), the word list (S2) and S15–S19 wait on the human. Don't build on it before the MVP is done.

## Waiting on the human
- **Merging the design review PR** (merge only on all-green CI).
- **M12:** whether usernames can change, and how often (Claude suggested once a month).
- **Before plor.app gets M07 and M08** (`db push`, M15 or when the human wants):
  - turn "Allow public access" off in the hosted project's Realtime settings (M07 D5);
  - check that `[[:alpha:]]` behaves the same there for display names (M07 7a, *unverified*).
- **Before approving the later drafted days,** note:
  - three repeat 2026-10-22's categories: car brand (11-06), state capitals (11-10) and tea (11-16);
  - several had a host swapped under the host-name rule (M06 ticket, Evidence).
- ROADMAP "Next revision", For the human, has the rest.

## Next step
Once the design review PR is merged: draft the M10 (Groups) ticket from `docs/milestones/_TEMPLATE.md` on a new branch `m10-groups`. It must take in Design review 2 (weekly boards for friends and groups; how Sunday's points show once they settle after the Monday reset) and 4 (one shared thread per group per day; misses are out), and the "For M10" items in Next revision. Claude's draft decisions from the review, for the ticket: what a group is (name, creator, members, invite link of 16 random bytes as M07); what members who aren't friends see; G7 lifecycle (rename, reset link, remove, leave, delete, the creator leaving); the human numbers (members per group, groups per player, name length and characters); the security change for the new tables.

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261022105344_points_ledger.sql`;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally;
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile; a rerun passes.
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
