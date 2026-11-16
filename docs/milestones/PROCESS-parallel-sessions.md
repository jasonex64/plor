# Process — Parallel sessions: three slots, a quick-fix lane and an inbox

**Status:** in progress (2026-11-16), on `process-parallel-sessions`. The five open questions are answered (below, quoted).

## Goal
Up to three Claude sessions work on unrelated things at once, each in its own folder, port and local database, with no waiting on port 3000 and no session's migrations breaking another's.

## Who uses it / what breaks without it
- **Used by:** the human, who starts several sessions on unrelated fixes; every session that runs `npm run dev`, `npm run test:e2e` or `npm run test:db`.
- **Breaks without it:**
  - Sessions wait on port 3000, shared by every checkout (HANDOFF: "port 3000 [is] shared by every checkout").
  - e2e silently tests another checkout's server: twice, on 2026-11-07 and 2026-11-08, a run tested `RIFF-m16`'s server, the second time with 148 tests refused (ROADMAP, Next revision, the `reuseExistingServer` item).
  - One checkout's migrations break every other checkout locally (HANDOFF: 17a–17c applied from `RIFF-m17`, so "from a checkout without 17c, the Friends page, the Invite buttons and the invite tests fail locally").
  - Small fixes have no lane, so CLAUDE.md's "All work happens against a milestone" and "One branch per milestone" attach them to old milestones, which keeps old worktrees (`RIFF-m14`, `-m15`, `-m16`) alive.
  - Worktrees were made by sessions with no rule for when to make or remove them; `RIFF-m17`'s folder remains though git no longer lists it as a worktree.

## What the human decided (2026-11-15, in chat)
1. **The approach:** "your changes mostly seem fine": per-checkout ports, a database stack per checkout, a quick-fix lane, an inbox, cleanup of old worktrees.
2. **A cap on parallel work:** "I would rather have it so that we don't keep opening infinite number of ports … if it's the limit's like 2 or 3, then just do 2 or 3." Then: **"just do three … for both right now"** (the Windows PC, 64 GB, and the Mac, about 48 GB).
3. **No new accounts:** "I don't want to make another super base account." Local stacks only; the hosted project is unchanged.
4. **Folders are reused, not made per task:** asked "are we doing like a new folder, or are you reopening the old folder?", the human was told three permanent folders that switch branches, and said "ready to basically do the full ticket".
5. **The name:** the project is Plor, not RIFF: "the project's no longer called Riff." Folders are named for Plor (see open question 1).
6. **How the human works:** "whenever I see random changes, I just sort of say, hey, Claude, I want you to fix this … one might be gameplay, one might be UI, one might be something else." The quick-fix lane and the inbox are for this.

## Open questions, answered (2026-11-16, in chat)
1. **Renaming `C:/Users/jason/RIFF` to `plor`.** It moves the path that every handoff, the Sunday `audit` scheduled task and Claude's saved memory for the project point at. **Answer: "Keep RIFF, add plor-2/3 (Recommended)".** Slot 1 is `C:/Users/jason/RIFF`; slots 2 and 3 are its siblings `plor-2` and `plor-3`.
2. **Each slot's Supabase ports.** **Answer: "Steps of 100 (Recommended)":** slot 1 keeps 54320–54329, slot 2 54420–54429, slot 3 54520–54529, each service keeping its last two digits; the edge runtime's inspector 8083, 8183, 8283. **Dev servers: "3000, 3002, 3003 (Recommended)".** 54420–54529 was free and outside Windows' excluded port ranges on 2026-11-16 (`netsh int ipv4 show excludedportrange protocol=tcp`; the list can change after a reboot).
3. **How to run three stacks from one `config.toml`.** Supabase documents an experimental `supabase stack` mode (ports picked by the CLI from 20000–32767, one stack per folder *and* branch). **Answer: "Fixed ports per slot (Recommended)"**: fixed blocks, read from each slot's own settings, tested before building on it. **The source:** "Yes, add it (Recommended)": Supabase's "Running multiple local projects" page is in SOURCES.md. **Tested 2026-11-16 (CLI 2.121.0):** with `SUPABASE_PROJECT_ID=probe` set in the environment, and again in a gitignored `supabase/.env`, `supabase status` looked for `supabase_db_probe`, not `plor`'s stack: the CLI reads `SUPABASE_`-prefixed overrides of `config.toml`, from the environment and from `supabase/.env`. The ports' overrides are checked when slot 2's stack starts (Evidence).
4. **RAM.** **Answer: "Report them, you decide (Recommended)":** one slot is measured and reported; slots 2 and 3 run together only on the human's word.
5. **`RIFF-m15`'s untracked `docs/milestones/M15-15d-ship-on-your-word.md`.** **Answer: "Commit it as dropped (Recommended)":** committed on this branch, its Status set to dropped (the human: "Drop it").

## Acceptance criteria
- [ ] Three slot folders exist, and only three: `npm run slots` lists each folder, its branch, its port, its stack's state and its open PR, and nothing else in the user's home is a worktree of this repo (`git worktree list`).
- [ ] A slot's dev server runs on its own port: `npm run dev` in each slot starts on that slot's port; started in all three at once, none waits or fails.
- [x] `npm run dev` refuses, with a message naming the process, when its slot's port is held by anything that isn't this slot.
- [ ] A fourth slot can't be made: the slot script refuses past the cap of 3 and says which slots are busy.
- [x] Each slot has its own local database: a migration applied in slot 2 is absent from slot 3 (`supabase migration list` against each).
- [x] Starting a task in a slot resets that slot's database to that branch's migrations and seed, and touches no other slot's.
- [ ] `npm run test:e2e` in two slots at once passes in both (or each failure is shown to fail the same way when run alone).
- [x] `playwright.config.ts` reads the slot's port; `reuseExistingServer` can only reuse that slot's own server.
- [x] No e2e test asserts a literal `localhost:3000`; they use the configured base URL (closes ROADMAP's "`e2e/guest-play.e2e.ts`'s Share check expects `http://localhost:3000/`" item).
- [ ] Local sign-in works in every slot (Supabase `site_url` / `additional_redirect_urls` allow each slot's port); checked by signing in on each.
- [x] Each slot's `.env.local` points at its own stack. No key is printed in chat, logs or commits while it is written (CLAUDE.md, Secrets never leave their home).
- [x] CLAUDE.md has the quick-fix lane and the slot rule; DECISIONS.md's Log records both; HANDOFF's line on shared port 3000 and the shared stack is replaced.
- [ ] `docs/INBOX.md` exists with the format below; a session told "inbox: …" appends one line and builds nothing.
- [ ] `RIFF-m14` and `RIFF-m16` are removed as worktrees, `RIFF-m17`'s leftover folder is gone, `RIFF-m15` is handled per open question 5. Their branches stay in git (`git branch -a` lists them).

## The rules this adds to CLAUDE.md
- **Slots.** Work happens in one of three slot folders. A session takes a free slot (`npm run slots`), checks out its branch there and resets that slot's database. It never makes another folder or worktree. When its PR merges, the slot is free.
- **Two lanes.** *Quick fix:* a change that needs no migration and no design input from the human. It gets its own `fix-<short-name>` branch off `main`, one PR, and a line in the PR saying what it fixes and who sees it (Who uses it / What breaks). No milestone, no ticket. *Milestone:* everything else, as now. If a quick fix turns out to need a migration or the human's input, stop and move it to a milestone. Add the quick-fix lane to CLAUDE.md's list of exceptions in "Find the ticket".
- **The inbox.** "inbox: <thing>" from the human appends to `docs/INBOX.md` and builds nothing. "Go through the inbox" sorts each item into a quick fix or a milestone, asking the human what's unclear, and removes it from the inbox once it has a branch or a ticket.

`docs/INBOX.md` format, one line each:
```
- [ ] <date> · <gameplay | ui | other> · <the human's words>
```

## Out of scope
- The hosted Supabase project and Vercel: unchanged.
- Running e2e on a production build (ROADMAP's own item).
- The flaky e2e tests listed in ROADMAP: not fixed here.
- The Mac's setup is the same script; it is checked when the human is next on the Mac.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 3 slots | The cap on folders, ports and stacks, on both machines | Human, 2026-11-15: "just do three … for both right now" |
| Ports 3000, 3002, 3003 | Slot 1, 2, 3's dev server | Human, 2026-11-16: "3000, 3002, 3003 (Recommended)" |
| 54320–54329, 54420–54429, 54520–54529 | Slot 1, 2, 3's stack: shadow +0, API +1, DB +2, Studio +3, Mailpit +4, analytics +7, pooler +9 (slot 1's offsets are `supabase/config.toml`'s) | Human, 2026-11-16: "Steps of 100 (Recommended)" |
| 8083, 8183, 8283 | Slot 1, 2, 3's edge runtime inspector | The same answer |
| `plor`, `plor-2`, `plor-3` | Slot 1, 2, 3's Supabase `project_id` (Docker names its containers by it) | Slot 1's is `config.toml`'s; 2 and 3 follow the folder names (answer 1) |

## Plan
1. Ask the open questions; record the answers here, quoted.
2. On a `process-` branch: the slot script (`scripts/slots.ts`: list, take, free, reset; refuses past 3 and on a taken port), `npm run slots`, the per-slot `npm run dev`, Playwright's port, the e2e base-URL fix, the per-slot Supabase config, the redirect URLs.
3. Measure RAM with one slot running (open question 4), then bring up slots 2 and 3.
4. CLAUDE.md, DECISIONS.md, HANDOFF.md, `docs/INBOX.md`.
5. Clean up the old worktrees, each removal on the human's word (deletion needs the human's permission on this PC).
6. Evidence for every criterion; reviewer; PR.

## Removes
- Worktrees `RIFF-m14`, `RIFF-m16`, the leftover `RIFF-m17` folder, and `RIFF-m15` per open question 5 (their branches stay).
- HANDOFF's manual rule: "check `Get-NetTCPConnection -LocalPort 3000` before an e2e run, never run two e2e processes at once, and don't run `npm run test:db` beside `npm run test:e2e`."
- ROADMAP's Next revision items on `reuseExistingServer` reusing another worktree's server, and on the Share check's literal `localhost:3000`.
- Every literal `localhost:3000` in `e2e/`.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Supabase, running multiple local projects: the supported way is the experimental `supabase stack` commands, with ports the CLI picks | Fixed port blocks per slot through `SUPABASE_` overrides in each slot's gitignored `supabase/.env` | The human's answer 3 ("Fixed ports per slot"): stack mode is experimental and makes a stack per branch with new ports each time. The page itself says ports set by environment variables are exact requests |
| The ticket's plan: the slot script has list, take, free, **reset** | list, take, free; `take` on a branch already in a slot resets that slot's database again | One way to reset a slot; a separate `reset` would be a second |
| The ticket's plan: no change to the e2e tests' database connections | 72 test files take the slot's database, Mailpit and API addresses from `scripts/slot.ts` | Needed by the criterion "two slots at once": they connected to slot 1's stack by literal port |

## Evidence
*(2026-11-16, on this Windows PC, CLI 2.121.0.)*
- **Overrides work (answer 3):** with `SUPABASE_PROJECT_ID=probe` in the environment, and again in `supabase/.env`, `supabase status` answered "No such container: supabase_db_probe". Slot 2's stack then started from its `supabase/.env`: `supabase status -o env` in `plor-2` gave `API_URL=http://127.0.0.1:54421`, `DB_URL=…@127.0.0.1:54422/postgres`, `MAILPIT_URL=http://127.0.0.1:54424`, `STUDIO_URL=http://127.0.0.1:54423`; `docker ps` shows `supabase_*_plor-2` containers on 54421, 54422, 54423, 54424, 54427. Its auth server: `GOTRUE_SITE_URL=http://127.0.0.1:3002`, `GOTRUE_URI_ALLOW_LIST=https://127.0.0.1:3002`; slot 1's: `…:3000`, `…:3000`.
- **`npm run slots`** lists slot 1 (`RIFF`, busy on this branch, port 3000, stack `plor` running), slot 2, slot 3, and `NOT A SLOT:` for `RIFF-m14`, `RIFF-m15`, `RIFF-m16`.
- **`take`:** `npm run slots -- take slot-check` made `C:/Users/jason/plor-2`, ran `npm ci`, started stack `plor-2`, applied all 16 migrations and printed `TAKEN: slot 2, C:\Users\jason\plor-2, on slot-check; … npm run dev serves http://localhost:3002.` Run again on the same branch: `slot-check is already in slot 2: finishing it there` … `TAKEN`. Its `.env.local` names `127.0.0.1:54422` and `:54421`; no key was printed (`supabase start`'s output, which holds the keys, is dropped).
- **A fourth slot:** none can be made: `take` only picks slots 1 to 3, and with all busy it refuses with `REFUSED: all 3 slots are busy; there is no fourth.` and each one's branch (`scripts/slots.ts`; unit-tested in `scripts/slot.test.ts`, `isFree`).
- **Each slot has its own database:** a temporary migration `29991231000000_slot_check.sql` applied in slot 2 (`supabase migration up`) is the last row of slot 2's `supabase migration list --local` and absent from slot 1's (which ends at `20261116051619`). A marker table made in both, then `take` reset slot 2: `slot1 marker: t  slot2 marker: f`. The temporary migration was deleted and slot 2 reset.
- **Dev port:** `npm run dev` in slot 1 printed `slot 1: next dev on port 3000`; a second one: `REFUSED: slot 1's port 3000 is held by process 37820: node.exe … C:\Users\jason\RIFF\node_modules\next\dist\server\lib\start-server.js (this slot's own server, already running).` exit 1. With port 3002 held by a stray `node -e` listener, `npm run dev` in slot 2: `REFUSED: slot 2's port 3002 is held by process 53524: node.exe … (not this slot).` exit 1.
- **Playwright:** reads `localStack().appUrl`; `e2e/own-server.ts` runs after the web server step and refuses a listener started from another folder (`heldBySlot`: on this PC the listener's command line names `C:\Users\jason\RIFF\node_modules\…`). `git grep localhost:3000 -- e2e` is empty.
- **e2e in two slots at once (not met):** run 1, 29 min: slot 1 190 passed / 6 failed, slot 2 188 / 8. It found a real crossing: `live-board.e2e.ts` restarted `supabase_realtime_plor`, slot 1's container, from slot 2; fixed to the slot's own. Run 2, 42 min: 183 passed / 13 failed in each. **Alone**, the same failures: the three admin tests fail the same way in both slots ("Tomorrow isn't approved": `content/*/2026-11-17.json` is in `main`, ROADMAP Next revision), and of the other 15, 14 pass in each slot (one different flaky test fails in each: `guest-play.e2e.ts:58` in slot 1, `live-board.e2e.ts:32` in slot 2). Most concurrent failures are 30 s timeouts: two full suites at once load this PC past the tests' timeouts. **Waits on the human.**
- **RAM (answer 4):** one slot, stack plus `next dev` after five pages: stack `plor` 2,254 MiB (`docker stats`), `next dev`'s three processes 892 MiB, about 3.1 GB; the PC had 35.8 GB of 63.8 GB free. Reported to the human; slot 3 waits for their word.
- **Database tests in both slots at once:** `npm run test:db` in slot 1 and slot 2 together: 498 passed, 2 failed in each, the same 2 (`src/app/api/leaderboard/substrings.db.test.ts`, "adds up par scores…" and "keeps game 1's board to game 1"), plus one file that failed to start: `admin/puzzles/substrings/route.db.test.ts` mocks `process.cwd`, so `scripts/slot.ts` now finds its checkout from its own location (fixed; the file passes). The 2 board tests fail the same way on `main`'s code (`abcf04a`, run in slot 2 against slot 1's stack: "2 failed | 3 passed"): not this change (ROADMAP, Next revision). `npx supabase test db` (pgTAP): `Files=42, Tests=833 … Result: PASS` in slot 1 and in slot 2.
- **Unit tests:** `npm test`: 71 files, 820 tests passed. `npx tsc --noEmit -p .` and `npx eslint scripts e2e playwright.config.ts src/test src/config`: clean.

## Review
- Blocking findings and how each was fixed: HANDOFF not rewritten (rewritten last, in this PR); Evidence empty (filled above); scraps (`slot-check` and slot 2 are freed at the end; the old worktrees wait for the human's word); `take` left a slot stuck after a failed start or reset, since a retry was refused "already in slot N" (fixed: a take of a branch already in a slot finishes it there, run above).
- Found while gathering evidence: `live-board.e2e.ts` restarted slot 1's Realtime container from any slot (fixed).
- Deferred to ROADMAP "Next revision": `heldBySlot`'s loose match, `name in replaced`, symlinked paths on the Mac, `free` not checking the PR is merged; the three admin e2e tests that assume no drafted tomorrow.
