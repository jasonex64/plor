# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that finished M08 and drafted the M09 ticket.

## Where things stand
- **M08, Comments and reactions, is done** (PRs #39, #40, #41 and #43; ticket `docs/milestones/M08-comments-and-reactions.md`). Its branch `m08-comments-and-reactions` is deleted, as CLAUDE.md says once a milestone is merged. The reviewers' deferred items are in ROADMAP "Next revision", From M08.
- **M09, Points and friends leaderboard:** the ticket is on branch `m09-points-and-leaderboard` (`docs/milestones/M09-points-and-leaderboard.md`), not yet in a PR, D1–D7 answered (2026-10-22); D1 changed a standing rule (every finished run counts, even one finished after midnight), and DECISIONS.md, the ROADMAP row and `M00-data-design.md` §6 say so. The human then added a **rarity bonus** (2026-10-22); the ticket proposes its design, including a Hard-to-reverse change to the ledger (written once the day closes), with D9–D11 and numbers N1–N5 open (D8 answered). DECISIONS.md and §6 aren't changed for the bonus until the human approves. No code yet.
- PR #42 (`m16-game-2`, "M16: draft game 2 ticket") is open from another session; this one didn't touch it.

## Waiting on the human
- **M09 rarity bonus** (ticket, Decisions D9–D11 and Numbers N1–N5; D8 is answered: answers after midnight earn no bonus, per answer): the ledger change, what closes a day (no scheduler exists; the human chooses), where the expected popularity comes from, and five numbers.
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
Once the human has answered D9–D11 and given N1–N5: record them in the M09 ticket, update DECISIONS.md (Points ledger; Game 1: Scoring) and `M00-data-design.md` §6 with the approved text, then build 9a on branch `m09-points-and-leaderboard`, tests first (ticket, Plan). ROADMAP "Next revision", From M08, has the deferred M08 items.

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261022095828_live_comments.sql` (M08's last);
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally (8b's checks didn't use that account);
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile (ROADMAP, From M08).
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
