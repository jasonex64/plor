# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets. Older notes are in git (`git log -p docs/HANDOFF.md`); this file was cut down on 2026-11-11 (audit W10).

**Updated last:** 2026-11-12, on `m17-profiles-and-friend-requests` (checkout `C:/Users/jason/RIFF-m17`), by the session that built 17a and opened its PR (#193). Before it the same day: a planning session on `m18-guest-play` (no code), and the overnight session that built 18e.

## The goal, settled (don't re-ask)
Closed beta with a plain look, guest play, both games, and profiles with friend requests (M17) before the beta. Clean-up is blockers plus cheap tidying. Nothing goes to plor.app until M14, M16 and M17 are done.

## Settled on 2026-11-12 (the planning session's answers, still true)
- **PRs #191 (18e) and #190 (17a's design) are merged.** Where the notes below say "open" of them, read "merged".
- **plor.app stays as it is** (live on `main`, hosted database not updated): "Leave it as is".
- **The order stands:** "Keep the full order".
- **No new features before the beta** (break alerts and a feedback button were offered): "jk i dont want the new features everything else is fine".
- The docs tidy the planning session listed is done (PR #192, merged): #191 marked merged, game 2 named in the M16 Status, 14c-6 marked dropped, the long-answer must-fix ticked.

## The tracks
1. **M18, guest play** (this branch). 18a (#182), 18b (#183), 18c (#186) and 18d (#189) are merged. **18e is built and its PR, #191, is open:** the front page's sign-in is a small link to `/?sign-in`, where the form shows; a guest's result has Share (game 1) and the blurred peek with "Make an account" (both games); the group invite page offers a guest link; Insights says its counts include guests. The `reviewer` found nothing blocking in two passes. **Whether it was merged: read the PR.** The night's rule was merge only with every CI check green; a merge publishes those changes to plor.app (no migration in it). **Two criteria are still open, both the human's:** the privacy page's words (a draft is in the ticket, "Privacy page draft"; the page is unchanged) and the force-interaction-key e2e (answer 37: it needs a port, a second server and a CI change). A third stays unticked for a decision: the repeated bot-check token is proven with a stubbed reply only. The overnight decisions are answers 33 to 37 in the ticket. **Not verified:** the peek's look in a browser (before a CSS fix the blur sat over the words; the e2e now proves the link takes a click, nobody has looked at it); the full local `npm run test:db`; the full e2e with the final sign-in helper (CI's run is the evidence).
2. **M17** (`m17-profiles-and-friend-requests`, checkout `C:/Users/jason/RIFF-m17`). **17a is built and its PR, #193, is open, not merged.** The human approved its security design on 2026-11-12 ("Yes, build as proposed": the ticket's answer 30; DECISIONS.md's log). It adds friend requests and blocks: one migration (`20261112235831_friend_requests_and_blocks.sql`), `src/friends/requests.ts` with eight routes, the block check `blockedSql`, and the screens (requests on the Friends page, the tab's count, Block, Settings' blocked list). **Do not merge it by itself:** plor.app's database has no such tables, so every signed-in page there would show an error (the PR's first section). Merge it with the database update, or with 17b and 17c. **Not verified:** nobody has looked at the new screens in a browser; the full e2e ran on CI only (read the PR's checks), locally just `e2e/friend-requests.e2e.ts`. The words on the screens are Claude's, listed in the ticket for the human. **Next in M17:** 17b (search, the profile page, the 30-day hold, and the search counter that sends must also count against, D1), then 17c (invite links out, the privacy page). 17b needs its guiding questions first: the profile's path, and nothing says what a search or a profile looks like.
3. **16f** (`m16-game-2`, checkout `C:/Users/jason/RIFF-m16`). Answers 1 to 24 are in the M16 ticket on `main`. **Not approved to build.** Still to ask (the ticket's "Not yet asked"): Fragments' card colour, the cards' order, a blurred item's words, reactions, replies, how many items load at a time (a number), dates between days. The mock-up files are in no repo; mock-up B is described in answer 16.

## Waits on the human
- **18e:** approve or change the privacy text; the force-interaction e2e's port and server; the repeated-token stub; look at the peek in a browser; answers 33 to 37 are open to change.
- **17a:** read PR #193; when to merge it (with the hosted database's update, not before); the words on its screens (the ticket, "Words on the 17a screens"); a look at the screens in a browser.
- **plor.app is live on the newest `main`: every merge to `main` is published.** **Before any merge to `main`, say what it does to plor.app.** The hosted database still waits on the human's `db push` (DECISIONS.md, Database migrations), so a guest pressing Start on plor.app is *unverified*, as is the bot check with the real keys. To go back: `vercel rollback` to `dpl_EeS3jdJHMYi4yrN8Q1qBozEg9ViK` (the version before 18c).
- 16f's remaining questions (above); then the plor.app load's one must-fix (`docs/audits/2026-11-11-backlog-sort.md`).
- Whether the dictionary licence's AU section applies; the Privacy page naming the dictionary (audit W2).
- The public repo shows the answer lists and the upcoming day, and this file's history names private email addresses (ROADMAP, Next revision, For the human).
- `C:/Users/jason/RIFF-m15` (`m15-launch-readiness`) is far behind `main` with uncommitted edits and a half-built 15d: undecided, untouched.
- GitHub reports one moderate vulnerability in a dependency (Dependabot alert 2): not looked at.

## Local state (this Windows PC), still true
- **The local database has 17a's migration** (applied from `RIFF-m17`). From a checkout without it, `npx supabase test db` fails `plor_app_role.test.sql` (its grant list lacks the new grants): that is this migration, not that checkout's code.
- `RIFF-m17` now has its own `node_modules` (`npm ci`) and a copy of `.env.local`. `npx supabase migration new` waits for input in a non-interactive shell: give it `< /dev/null`.
- One local Supabase stack in Docker Desktop and port 3000 are shared by every checkout: check `Get-NetTCPConnection -LocalPort 3000` before an e2e run, never run two e2e processes at once, and don't run `npm run test:db` beside `npm run test:e2e`.
- An e2e run cut short can leave today's fixture day in `private.puzzle`, which then fails the db tests ("today must be free") and most e2e: check for it before blaming the code, and ask the human before deleting rows. A leftover fixture day for **yesterday** fails the two "yesterday's run" tests in `src/game/runs.db.test.ts` the same way. To run part of the suite: `npm run test:db -- -t "<name>"`; a file path after `--` is ignored. Never interrupt a run.
- Run database tests only with `npm run test:db`, never a bare `vitest run`.
- Delete `.next/dev` before `npm run dev` or an e2e run after a build or a switch of commits; run `npx next typegen` before `npx tsc --noEmit -p .` on a fresh checkout.
- Local e2e is unreliable for `/play2`, and for `e2e/feel.e2e.ts:229` and `e2e/controls-and-state.e2e.ts:201` (about half of local runs fail, before 18e too; ROADMAP, Next revision): read CI's result.
- `.env.local` points only at the local stack. The dictionary snapshot is in `data/snapshots/dictionary/` in `RIFF-m16`, outside git.
- The Mac is idle since 2026-10-28.

**Left running:** nothing.

**Open pull requests:** #193 (17a, from `m17-profiles-and-friend-requests`). The M16 branch is behind `main`: merge `main` in before working on it.

**Next:** the human's word on #193. Then 17b's guiding questions and build on this branch (after #193 is merged or closed: one open PR per sub-ticket), then 17c. Beside it: 16f's remaining questions and its ticket for approval; M18's two open criteria (the human's).
