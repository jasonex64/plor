# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets. Older notes are in git (`git log -p docs/HANDOFF.md`); this file was cut down on 2026-11-11 (audit W10).

**Updated last:** 2026-11-13, on `m19-pre-beta-fixes` (checkout `C:/Users/jason/RIFF`), by the session that built 19c and settled 19d's design. **This file is the newest handoff**; the note below, "Since M17 closed", is this session's.

## The goal, settled (don't re-ask)
Closed beta with a plain look, guest play, both games, and profiles with friend requests before the beta. Clean-up is blockers plus cheap tidying. Still true from 2026-11-12: "Keep the full order"; no new features before the beta ("jk i dont want the new features everything else is fine").

## Since M17 closed (2026-11-13, a planning session on `m19-pre-beta-fixes`, checkout `C:/Users/jason/RIFF`; no code)
- **M19, pre-beta fixes, is approved ("Approve M19"):** `docs/milestones/M19-pre-beta-fixes.md` holds the human's seventeen answers, quoted. **19a (PR #199) and 19b (PR #200) are merged** and published to plor.app. **19c is built and in its pull request, not merged** (see "Open pull requests"): the friends boards leave out a player for a day or week that ended before their account was made, the viewer too; no migration. Its merge waits for the human's word and all-green checks; three e2e specs were edited and not run locally, so CI's e2e is their only evidence. **Next, after 19c's merge: 19d**, its design settled (answers 10, 16, 17): stop ending a finished guest run at its first read in both games (`src/game/guest-runs.ts:62`, `guest-substring-runs.ts:39`), so Start on a finished run returns its result; the Privacy page takes answer 16's words; one migration drops `private.end_guest_run`, and the human runs the hosted `db push` **after** the merge, never before. Then 19e (actions by player ID) and 19f (a test of the live board's lag, then ask). **Not verified:** nobody has looked at 19a's, 19b's or 19c's screens in a browser or on plor.app; the reaction side as the deadlock's victim (19b); an empty Yesterday or Last week list for a new player (19c).
- **"Ship on your word" (M15 15d) is dropped** ("Drop it"): `main` keeps publishing on every merge. `RIFF-m15`'s uncommitted edits are that half-built 15d (a `ship` script, `vercel.json`'s deploy switch, rule and DECISIONS edits); they are untouched, and deleting them needs the human's word.
- **The public repo stays public with the answers in it** ("Leave it").
- **The database plan:** Supabase's pricing page (read 2026-11-13) says Free pauses "after 1 week of inactivity", has 500 MB and no backups; Pro is "from $25/month", never pauses, daily backups kept 7 days. How full the hosted database is: *unverified* (the human's dashboard). The human chose "Check first, then decide"; the decision is still open.
- `m18-guest-play` in this checkout holds one unpushed commit (`1d1cedf`, an older handoff, superseded by this file).

## The tracks
1. **M17 is done** (2026-11-13). 17a (PR #193), 17b (#195) and 17c (#197, merge commit `8c7e02d`) are merged on green checks. The human ran the hosted `db push` for each (17c's after its merge: "It is pushed"); *no agent has checked the hosted database*, since listing its migrations needs the password. plor.app after 17c's merge, checked by the planning session: up, an `/i/<code>` link answers 404, `/privacy` shows the new guest wording. The three migrations must never change now. **Not done:** nobody has yet tried friend requests, search or profiles by hand on plor.app, or looked at 17a's, 17b's or 17c's screens in a browser. The branch `m17-profiles-and-friend-requests` is still there: delete it once the PR that carries this handoff is merged.
2. **M18, guest play** (`m18-guest-play`, checkout `C:/Users/jason/RIFF`). 18a to 18e are merged (#182, #183, #186, #189, #191). Its privacy words were approved on 2026-11-13 and went onto the page with 17c. **One criterion is still open, the human's:** the force-interaction-key e2e (answer 37: it needs a port, a second server and a CI change). Another stays unticked for a decision: the repeated bot-check token is proven with a stubbed reply only. **Not verified:** the peek's look in a browser.
3. **16f is next: a design task, not a build** (`m16-game-2`, checkout `C:/Users/jason/RIFF-m16`; the branch is behind `main`, merge `main` in first). Answers 1 to 24 are in the M16 ticket on `main`. **Not approved to build.** Still to ask (the ticket's "Not yet asked"): Fragments' card colour, the cards' order, a blurred item's words, reactions, replies, how many items load at a time (a number), dates between days. The mock-up files are in no repo; mock-up B is described in answer 16.

## Waits on the human
- **M17:** try friend requests, search and profiles by hand on plor.app. One open question: **"Plor is better with friends" still shows on the Friends tab's board** for a player with no friends, above Find a player (answer 34 removed it from Today only; answer 35: "Yes, as built"). From 768px Today's "Friends today" card is a bare heading for a player with no friends (ROADMAP, For M17). The words on 17a's and 17b's screens (the ticket, "Words on the 17a screens", "Words on the 17b screens").
- **M18:** the force-interaction e2e's port and server; the repeated-token stub; a look at the peek in a browser; answers 33 to 37 are open to change.
- **16f's remaining questions** (above); then the plor.app load's one must-fix (`docs/audits/2026-11-11-backlog-sort.md`).
- **plor.app is live on the newest `main`: every merge to `main` is published.** **Before any merge to `main`, say what it does to plor.app.** The hosted database is changed only by the human's own `db push` (DECISIONS.md, Database migrations). A guest pressing Start on plor.app is *unverified*, as is the bot check with the real keys.
- Whether the dictionary licence's AU section applies; the Privacy page naming the dictionary (audit W2).
- The public repo shows the answer lists and the upcoming day, and this file's history names private email addresses (ROADMAP, Next revision, For the human).
- `C:/Users/jason/RIFF-m15` (`m15-launch-readiness`) is far behind `main` with uncommitted edits and a half-built 15d: undecided, untouched.
- GitHub reports one moderate vulnerability in a dependency (Dependabot alert 2): not looked at.

## Local state (this Windows PC), still true
- **The local database has 17a's, 17b's and 17c's migrations** (applied from `RIFF-m17`), so it has no `private.friend_invite`: from a checkout without 17c, the Friends page, the Invite buttons and the invite tests fail locally. From a checkout without them, `npx supabase test db` fails `plor_app_role.test.sql` (its grant list lacks the new grants) and `profile.test.sql` (an old username is now held, not free at once): that is these migrations, not that checkout's code. A sign-up or rename from another checkout's tests meets the hold trigger too.
- `RIFF-m17` now has its own `node_modules` (`npm ci`) and a copy of `.env.local`. `npx supabase migration new` waits for input in a non-interactive shell: give it `< /dev/null`.
- One local Supabase stack in Docker Desktop and port 3000 are shared by every checkout: check `Get-NetTCPConnection -LocalPort 3000` before an e2e run, never run two e2e processes at once, and don't run `npm run test:db` beside `npm run test:e2e`.
- An e2e run cut short can leave today's fixture day in `private.puzzle`, which then fails the db tests ("today must be free") and most e2e: check for it before blaming the code, and ask the human before deleting rows. A leftover fixture day for **yesterday** fails the two "yesterday's run" tests in `src/game/runs.db.test.ts` the same way. To run part of the suite: `npm run test:db -- -t "<name>"`; a file path after `--` is ignored. Never interrupt a run.
- Run database tests only with `npm run test:db`, never a bare `vitest run`.
- Delete `.next/dev` before `npm run dev` or an e2e run after a build or a switch of commits; run `npx next typegen` before `npx tsc --noEmit -p .` on a fresh checkout.
- Local e2e is unreliable for `/play2`, and for `e2e/feel.e2e.ts:229` and `e2e/controls-and-state.e2e.ts:200` (about half of local runs fail, before 18e too; ROADMAP, Next revision): read CI's result.
- `.env.local` points only at the local stack. The dictionary snapshot is in `data/snapshots/dictionary/` in `RIFF-m16`, outside git.
- The Mac is idle since 2026-10-28.

**Left running:** nothing.

**Open pull requests:** none (2026-11-13, after #200's merge).

**Next:** the human's word to merge 19c's PR (say first what it does to plor.app: friends boards stop listing players for days before they joined; no database change), then M19 19d on `m19-pre-beta-fixes`. Beside it: 16f's remaining questions, asked in rounds (CLAUDE.md, "Ask before designing"), then its ticket for approval; the human's hand test of M17 on plor.app; M18's open criteria; the database plan (the human chose "Check first, then decide").
