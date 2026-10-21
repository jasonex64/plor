# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-21, by the session that built M06.

## Where things stand
- **Milestone:** M06, Puzzle entry. Built and tested on branch `m06-puzzle-entry`; its PR is open, not merged. The reviewer's blocking findings are fixed (see the ticket's Review).
- **Open criterion:** the end-to-end check (the human writes questions, a session drafts them, the human approves and plays). It can't use today: today's local puzzle has runs, and a started day can't change.

## Waiting on the human
- **OK the CLAUDE.md change in this PR:** "Find the ticket" now says drafting a day's puzzle is the one exception, and follows DECISIONS.md, "Puzzle drafting". The human asked for the drafting workflow but hasn't approved this wording.
- **Merge the PR,** or say to merge it on green CI.
- **For the end-to-end check:**
  1. Say which local account should be admin; a session adds it to `private.admin` locally.
  2. On `http://localhost:3000/admin/puzzles`, write 7 questions for 2026-10-22 or later, and press "Copy for Claude".
  3. Paste the text to a session, which drafts the day (DECISIONS.md, Puzzle drafting).
  4. Approve the day on the page, then play it on its date.
- **Later:** M07 needs the display name's length and characters. M12 needs to know whether usernames can change, and how often (Claude suggested once a month).

## Next step
Finish M06's end-to-end check, close M06, then draft the M07 ticket (friends and live board, with the display name).

## Local state
- On the machine M06 was built on: the local Supabase stack is stopped (data kept), with migration `20261021232903_puzzle_entry.sql` applied. Docker Desktop may still be open. No dev server is running. No admin rows exist yet. Today's (2026-10-21) hand-loaded puzzle has 2 runs.
- **On any other machine** (the human plans to continue at home):
  1. `git fetch` and `git checkout m06-puzzle-entry`, or `main` once PR #33 is merged.
  2. `npm ci` and `npx supabase start`. Then `npx supabase migration up`, which keeps existing local data; a fresh stack applies every migration anyway.
  3. `npm run dev`, sign in at `http://localhost:3000` with an email code (read it in Mailpit at `http://127.0.0.1:54324`), and pick a username.
  4. Make that account an admin. A session does this: insert its user ID into `private.admin` on the local database.
