# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets. Older notes are in git (`git log -p docs/HANDOFF.md`); this file was cut down on 2026-11-11 (audit W10).

**Updated last:** 2026-11-11, on `m18-guest-play` (checkout `C:/Users/jason/RIFF`), by the session that checked the direction with the human and started four tracks side by side.

## What the human settled today (quoted in DECISIONS.md's Log on `process-2026-11-11`)
- The plain look is the beta's; a richer look is its own work afterwards ("Yes, but plain is temporary").
- M17 stays before the beta. Clean-up before the beta is the blockers plus cheap tidying. Side tracks run beside the milestone in progress, each its own small PR.

## The tracks
1. **M18, guest play** (this branch): 18a (PR #182) and 18b (PR #183) are merged. **18c is in progress, in slices, with no PR until all of 18c is in.** Slice 1 is built and pushed (`8bcd0ae`): a typed answer over 40 characters is refused before matching, for signed-in play too, through `assertTypedLength` (`src/game/runs.ts`), which the guest route will call (human: "Add it to 18c (Recommended)", the ticket's answer 23). Its test went red then green; the `reviewer` agent hasn't seen it. `npm run test:db` then gave 51 files, 350 tests, all passing (2026-11-11, 19:00 Pacific). Slice 2 is built and pushed: `verifyTurnstile` (`src/lib/turnstile.ts`) and `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in `readServerEnv`, which now refuses to start without them, so **this branch's Vercel preview fails at runtime until the human sets both in Vercel**, and each checkout's `.env.local` needs Cloudflare's test pair once it has this code (this checkout's has it; `e2e.yml` writes it). Unit tests red then green; nothing was tried against the real Siteverify, and the test keys were read through a summarising fetch, so compare them once with Cloudflare's testing page. The ticket's open question for the human: the Siteverify call has no timeout (Cloudflare says to set one and gives no number) and checks no hostname. Next: slice 3, the guest routes for game 1 (start calls `verifyTurnstile` and `private.purge_guest_days`, answer calls `assertTypedLength`), then the screen's route prefix and the front-page button; 18d; 18e. Before 18c merges to anything deployed, the human makes the Cloudflare widget and sets the secret (the ticket, "What only the human can do").
2. **Docs tidy:** PR #184 (`process-2026-11-11`, checkout `C:/Users/jason/RIFF-process`), docs only, waiting for the human's word to merge. For the human to confirm: 14c-6's Status reads "superseded". After it merges: `git worktree remove C:/Users/jason/RIFF-process` and delete the branch.
3. **About credits, 16h** (`m16-game-2`, checkout `C:/Users/jason/RIFF-m16`, fast-forwarded to `main`): the M16 ticket's criterion on UKACD's and ESDB's notices. The licence file is `data/licences/english-speller-database-Copyright.txt`, downloaded at the human's "Yes, download it" from the commit SOURCES.md pins. Built in two commits and in review as a PR (`gh pr list`); `npm run build` shows `/about` prerendered with the notices in it; its two e2e assertions weren't run locally. For the human: whether the licence's AU section applies (the M16 ticket's Evidence, 16h). The Privacy page naming the dictionary needs the human's wording (audit W2).
4. **M17's design round** (no branch yet; cut `m17-…` from `main` after PR #184 merges, as it edits the M17 ticket's Status line). Answers so far, to be recorded in the ticket, quoted:
   - Profile address: "The username". An old link after a rename: "Hold the old name a while" (the length of time is a human number, not given yet).
   - Streak and totals: "Same as your Me page (Recommended)".
   - Blocking: "Also comments and reactions" (results on shared group boards still show); the blocked player isn't told: "Silent (Recommended)".
   - A new request: "A count on the Friends tab (Recommended)".
   - The numbers (human, 2026-11-11): a freed username is held "30 days (Recommended)", the same 30 as between username changes; searches, "60 an hour" for one player; pending requests, "No separate cap (Recommended)"; after a decline, "Right away; block stops it (Recommended)".
   - Still open: the search limit per address (the ticket's Numbers asks for per player and per address; only per player was asked), the OWASP pages as sources (SOURCES.md needs the human's OK), the privacy text, and then the ticket's approval. What a search found (2026-11-11, nothing added to SOURCES.md, which needs the human's OK): OWASP's Authentication Cheat Sheet, WSTG-IDNT-04 and REST Security Cheat Sheet ask for a limit and generic replies and give no number; GitHub's "Changing your GitHub username" releases an old name at once; other platforms' pages couldn't be opened (*unverified*). So all four are human numbers.

## Waits on the human
- PR #184's merge word; 14c-6's wording.
- M17's numbers, above.
- 16f's guided questions (not asked yet), then the plor.app load's (the one must-fix: plor.app can't be given the answer lists or game 2's dictionary; `docs/audits/2026-11-11-backlog-sort.md`).
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

**Next:** 18c's next slice (the bot check), built by a Sonnet subagent and reviewed; ask M17's numbers; 16f's guided questions.
