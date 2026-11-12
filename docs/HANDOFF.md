# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets. Older notes are in git (`git log -p docs/HANDOFF.md`); this file was cut down on 2026-11-11 (audit W10).

**Updated last:** 2026-11-11, on `m18-guest-play` (checkout `C:/Users/jason/RIFF`), by the session that built the rest of 18c, opened PR #186, merged it at the human's word, got M17 approved and asked 16f's first two rounds.

## The goal, settled (don't re-ask)
Closed beta with a plain look, guest play, both games, and profiles with friend requests (M17) before the beta. Clean-up is blockers plus cheap tidying. Nothing goes to plor.app until M14, M16 and M17 are done.

## The tracks
1. **M18, guest play** (this branch, level with `main` after the merge). 18a (#182), 18b (#183) and **18c (#186, merged 2026-11-11 on green checks, e2e included, at the human's "merge")** are done: a visitor can play game 1 without an account from the front page, behind Cloudflare's check. What 18c holds, its deviations and its review: the ticket's Answers 23 to 27, Source diff, Evidence "18c" and "18c review" (nothing blocking; the read race it found was fixed before the merge at the human's "Yes, fix it first"; six smaller findings are in ROADMAP, Next revision). Still not verified: Turnstile's box in a real browser when Cloudflare asks for interaction (CI uses the always-pass keys); the full local `npm run test:db` after 18c (CI's db check passed). **Next: 18d**, game 2's guest play (`/api/guest/substrings/...`, the same bot check, `/play2` signed out), then 18e (result once, blurred stand-in, guest share, Insights text, the front page's "Sign in to play" wording). The criterion "account routes refuse a guest cookie" has no home in the Plan: ask the human (ROADMAP, Next revision).
2. **M17** (`m17-profiles-and-friend-requests`, checkout `C:/Users/jason/RIFF-m17`; five commits ahead of its remote, **not pushed**, no PR). The ticket is rewritten around answers 1 to 29 and **approved to build, with its privacy text and proposed security changes** (human, 2026-11-11: "Approve M17"). The OWASP pages are in SOURCES.md on that branch. Nothing is built; it comes after guest play and 16f in ROADMAP's order.
3. **16f** (`m16-game-2`, checkout `C:/Users/jason/RIFF-m16`; two commits ahead of its remote, **not pushed**). Answers 1 to 8 are in the M16 ticket, "Answers for 16f": Today is a carousel, the unplayed game in front; started counts as a day played on Me; game 2's shown name is "Fragments"; the live board is one per game; a one-game day keeps the streak; groups and Share cover both games. **Owed before any build:** two or three mock-ups of the carousel ("Show me mock-ups first"), in a design session on Fable; then each game's comments and the mixed feed's details. 16f is not approved to build.

## Waits on the human
- **Before 18c reaches anything deployed:** the Cloudflare widget, and three values in Vercel: `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` (the real site names). Until then the branch's Vercel preview fails at runtime.
- M18's open questions 3 and 4 (the ticket): whether the front page's sign-in shrinks to a small control (as built, the form stays under "Play without an account"); the guest game's "Sign in" going to "/". The front page's intro still says "Sign in to play…" (`src/app/(shell)/page.tsx`); the ticket leaves that wording to 18e.
- 16f: the carousel mock-ups, then its remaining questions; then the plor.app load's (the one must-fix: plor.app can't be given the answer lists or game 2's dictionary; `docs/audits/2026-11-11-backlog-sort.md`).
- 14c-6's Status reading "superseded" (not confirmed); whether the dictionary licence's AU section applies; the Privacy page naming the dictionary (audit W2).
- The public repo shows the answer lists and the upcoming day, and this file's history names private email addresses (ROADMAP, Next revision, For the human).
- `C:/Users/jason/RIFF-m15` (`m15-launch-readiness`) is 721 commits behind `main` with uncommitted edits and a half-built 15d: undecided, untouched.
- GitHub reports one moderate vulnerability in a dependency (Dependabot alert 2): not looked at.

## Local state (this Windows PC), still true
- One local Supabase stack in Docker Desktop and port 3000 are shared by every checkout: check `Get-NetTCPConnection -LocalPort 3000` before an e2e run, never run two e2e processes at once, and don't run `npm run test:db` beside `npm run test:e2e`.
- An e2e run cut short can leave today's fixture day in `private.puzzle`, which then fails the db tests ("today must be free") and most e2e: check for it before blaming the code, and ask the human before deleting rows. A leftover fixture day for **yesterday** does it too: `ensurePuzzle` reuses it, its `approved_at` is older than the new fixture base, so the fixture's answers aren't recognised and the two "yesterday's run" tests in `src/game/runs.db.test.ts` fail (seen and cleared 2026-11-11, at the human's "Yes, delete and rerun"; a fixture day from 2026-10-25 with no runs is still there, harmless). To run part of the suite: `npm run test:db -- -t "<name>"`; a file path after `--` is ignored.
- Run database tests only with `npm run test:db`, never a bare `vitest run`.
- Delete `.next/dev` before `npm run dev` or an e2e run after a build or a switch of commits; run `npx next typegen` before `npx tsc --noEmit -p .` on a fresh checkout.
- Local e2e is unreliable for `/play2` (cause *unverified*; ROADMAP, Next revision): read CI's result.
- `.env.local` points only at the local stack. The dictionary snapshot is in `data/snapshots/dictionary/` in `RIFF-m16`, outside git.
- The Mac is idle since 2026-10-28.

**Left running:** nothing.

**Next:** 18d, slice by slice, test first, one PR when all of 18d is in, then the `reviewer`. Beside it: the 16f carousel mock-ups (a design session on Fable); push the M17 and M16 branches and open their docs PRs when the human says.
