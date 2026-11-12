# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets. Older notes are in git (`git log -p docs/HANDOFF.md`); this file was cut down on 2026-11-11 (audit W10).

**Updated last:** 2026-11-11, on `m18-guest-play` (checkout `C:/Users/jason/RIFF`), by the session that built 18d, had it reviewed and merged it (PR #189) at the human's word, merged the M16 and M17 notes (PRs #187 and #188) at the human's "ok merge", and took 16f through mock-ups and answers 9 to 24.

## The goal, settled (don't re-ask)
Closed beta with a plain look, guest play, both games, and profiles with friend requests (M17) before the beta. Clean-up is blockers plus cheap tidying. Nothing goes to plor.app until M14, M16 and M17 are done.

## The tracks
1. **M18, guest play** (this branch). 18a (#182), 18b (#183) and 18c (#186) are merged. **18d (#189) is merged too** (2026-11-11, every check green, e2e included, at the human's "merge"): game 2's guest play, one front-page button per game, and the test that every account route refuses a guest cookie (`GET /api/profile` the one named exception). Its review found nothing blocking in the code; four smaller findings are in ROADMAP, Next revision. **Not verified:** anything in a browser, the full local `npm run test:db`. **Next, 18e:** result once, blurred stand-in, guest share, Insights text, the group invite link, the privacy text, and the front page's sign-in shrunk to a small link that opens the form (answer 32; about ten e2e specs expect the form).
2. **M17** (`m17-profiles-and-friend-requests`, checkout `C:/Users/jason/RIFF-m17`). **Its ticket is on `main` (PR #188, merged 2026-11-11 on green checks).** The branch and its checkout stay for the build. Approved to build (human, 2026-11-11: "Approve M17"). Nothing is built; it comes after guest play and 16f.
3. **16f** (`m16-game-2`, checkout `C:/Users/jason/RIFF-m16`). **Its answers are on `main` (PR #187, merged 2026-11-11 on green checks).** The branch and its checkout stay for the build. Answers 1 to 24 are in the M16 ticket, "Answers for 16f": the carousel is mock-up B ("a wide peek, arrows on top"); one endless feed under it, newest first, games mixed, comments as feed items; the leaderboard off Today on phones. **Not approved to build.** Still to ask (the ticket's "Not yet asked"): Fragments' card colour (show options), the cards' order, a blurred item's words, reactions, replies, how many items load at a time (a number), dates between days. The three mock-up files were shown in the session and are not in any repo; mock-up B is described in answer 16.

## Waits on the human
- **plor.app runs the version before 18c, by a rollback in Vercel**, and no new `main` merge is published until the human undoes it. The Cloudflare widget exists (2026-11-12, made at the human's word through Cloudflare's plugin, signed in as the human: "Plor guest play", Managed, hostname `plor.app`; `www.plor.app` only redirects there; the secret was never shown to the agent). To undo the rollback: three values in Vercel (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` with the real site names), then promote the newest `main` deployment. Only the human can: an agent must not handle the secret. Leave the rollback alone. **Before any merge to `main`, say what it does to plor.app**. Checked after each of this session's three merges: `/` and `/play` answered 200.
- M18's open question 4: where the guest game's "Sign in" goes (as built, "/").
- 16f's remaining questions (above); then the plor.app load's one must-fix (plor.app can't be given the answer lists or game 2's dictionary; `docs/audits/2026-11-11-backlog-sort.md`).
- 14c-6's Status reading "superseded" (not confirmed); whether the dictionary licence's AU section applies; the Privacy page naming the dictionary (audit W2).
- The public repo shows the answer lists and the upcoming day, and this file's history names private email addresses (ROADMAP, Next revision, For the human).
- `C:/Users/jason/RIFF-m15` (`m15-launch-readiness`) is far behind `main` with uncommitted edits and a half-built 15d: undecided, untouched.
- GitHub reports one moderate vulnerability in a dependency (Dependabot alert 2): not looked at.

## Local state (this Windows PC), still true
- One local Supabase stack in Docker Desktop and port 3000 are shared by every checkout: check `Get-NetTCPConnection -LocalPort 3000` before an e2e run, never run two e2e processes at once, and don't run `npm run test:db` beside `npm run test:e2e`.
- An e2e run cut short can leave today's fixture day in `private.puzzle`, which then fails the db tests ("today must be free") and most e2e: check for it before blaming the code, and ask the human before deleting rows. A leftover fixture day for **yesterday** fails the two "yesterday's run" tests in `src/game/runs.db.test.ts` the same way. To run part of the suite: `npm run test:db -- -t "<name>"`; a file path after `--` is ignored. Never interrupt a run.
- Run database tests only with `npm run test:db`, never a bare `vitest run`.
- Delete `.next/dev` before `npm run dev` or an e2e run after a build or a switch of commits; run `npx next typegen` before `npx tsc --noEmit -p .` on a fresh checkout.
- Local e2e is unreliable for `/play2` (cause *unverified*; ROADMAP, Next revision): read CI's result.
- `.env.local` points only at the local stack. The dictionary snapshot is in `data/snapshots/dictionary/` in `RIFF-m16`, outside git.
- The Mac is idle since 2026-10-28.

**Left running:** nothing.

**No pull request is open.** `main` is merged back into this branch (the M16 and M17 branches are behind `main` by these merges: merge `main` in before working on them).

**Next:** 18e, slice by slice, test first, one PR, then the `reviewer`. Beside it: 16f's remaining questions, then its ticket for approval.
