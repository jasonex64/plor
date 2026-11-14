# M19 — Pre-beta fixes

**Status:** in progress. Approved by the human (2026-11-13: "Approve M19"). 19a (PR #199) and 19b (PR #200) are merged; 19c (PR #201) is merged too; 19d (PR #202) is merged (the human's hosted `db push` follows it); 19e (PR #203) is merged; 19f's test is written, in its pull request, not merged: the board does lag, and which fix, if any, is the human's to choose (asked 2026-11-13).

## Goal
Close the player-facing bugs already recorded in ROADMAP's "Next revision" and the 2026-11-11 audit before the closed beta, each as a small step with a failing test first.

## Who uses it / what breaks without it
- **Used by:** every beta player; guests most of all (19d).
- **Breaks without it:** a guest can lose a result they never saw; a friend who joined today shows 0 points on yesterday's board; a stale page's Remove or reaction can reach the wrong player after a rename; a deleted account is told "delete failed"; rare clashes answer "something went wrong" instead of a clear message.

## The human's answers (2026-11-13, from Claude's guided questions)
| # | Asked | Answer |
|---|---|---|
| 1 | Fix the recorded player-facing bugs before the beta? | "Fix all ten first (Recommended)" |
| 2 | A guest presses Start in a second tab on a finished run | "Show the finished result" |
| 3 | A guest's last answer lands as the clock reaches zero | "Always the result" |
| 4 | Yesterday's board lists a friend who joined today | "Hide them for earlier days" |
| 5 | Username-named actions reaching the wrong player after a rename | "Fix before beta" |
| 6 | Account deleted but the sign-out step failed | "Say it's deleted" |
| 7 | `plor_app` can delete any comment with no record | "After the beta" (stays in Next revision; a security change) |
| 8 | The live board showing a timed-out friend as still playing | "Confirm first, then ask" |
| 9 | "Ship on your word" (M15 15d, approved 2026-10-26, half built in `RIFF-m15`) | "Drop it": `main` keeps publishing to plor.app on every merge |
| 10 | 19d: how long a guest's finished run is kept, now that it can't be erased at its first read | "Until the day resets (Recommended)": kept until midnight Pacific, when guest runs are already cleared (`private.purge_guest_days`); one play a day per device; the Privacy page's guest words change, drafted for the human's approval |
| 11 | 19b: two tabs replacing one reaction | "Clear 'try again' message (Recommended)": 409 `reaction_changed`, "That changed in another tab. Try again." |
| 12 | 19b: a member leaving while a reaction on their comment is replaced (the deadlock, reproduced) | "Clear 'try again' message (Recommended)": 409 `busy`, "Plor was busy. Try again."; no retry |
| 13 | 19b: the NUL character in the other text inputs (group names, display names, usernames, typed answers) | "Yes, in this step (Recommended)" |
| 14 | 19c: on your own first day, does Yesterday's friends board hide you too? | "Hide me too (Recommended)": one rule for everyone; a new player's list can be empty |
| 15 | 19c: Last week's friends board and a friend who joined this week | "Hide there too (Recommended)" |
| 16 | 19d: the Privacy page's guest words, drafted: "Your answers are added to the day's counts of how many people gave each answer, with nothing that says who gave them. Your run is kept until that day ends, so you can see your result again, and is then deleted, finished or not." (in place of "When your run ends we delete the run and keep only your answers, added to the day's counts … A run you leave unfinished is deleted after that day ends.") | "Approve as drafted". Told first: the clearing runs at the next guest's Start after midnight Pacific, not on a timer, and the guest cookie ends with the browser, so "one play a day" is per browser session |
| 17 | 19d: `private.end_guest_run` is left unused by the fix; remove it? | "Remove it now": a migration that drops it, and the human's hosted `db push` **after** 19d's merge, not before (the live code calls it until then) |
| 18 | 19c, after CI showed it: on a player's first day, Today's Leaderboard card opens on an empty Yesterday. Keep it, or always show your own row? | "keep it, merge, and next steps" |

## Source
- **Next.js** (SOURCES.md): route handlers, for the routes' replies.
- **PostgreSQL** (SOURCES.md): the error codes the app maps (23503, 22021, 23505, 40P01).
- **Supabase user management** (SOURCES.md, M12 A7): sign-out after a deletion (19a).
- **Supabase migrations** (SOURCES.md): only if 19d needs one.
- ROADMAP.md, Next revision, the items quoted under each sub-ticket; `docs/audits/2026-11-11-weekly-audit.md`, W8 and W9; M18's ticket, answer 9 and "A guest closes the tab before the result shows".
- Each item was re-read on `origin/main` (`07489ef`) on 2026-11-13 by a subagent, *by reading, not run*.

## Sub-tickets
One PR each, from `m19-pre-beta-fixes`, in this order (19b before 19e: they share files). Every merge publishes to plor.app; none but 19d can need a hosted `db push`.

**19a — three one-file fixes.**
- [x] `src/lib/api-client.ts:24` looks at the status before reading the reply as JSON (audit W8) → verify: a unit test giving it an HTML 502 gets the app's error, not a `SyntaxError`.
- [x] `/api/answers?index=` refuses an index outside the day's questions with a 400 (audit W9; `src/app/api/answers/route.ts:18-19`) → verify: a route test with an index past the integer range gets 400.
- [x] `POST /api/account/delete` answers ok when the deletion committed and `signOut` then failed; the failure is logged and counted (answer 6; `src/app/api/account/delete/route.ts:16-17`) → verify: a test with a failing `signOut` gets ok and one counted log line.

**19b — clear replies for rare clashes** (ROADMAP: "Concurrent or malformed requests that get a 500 instead of a 4xx").
- [x] Each of these answers a 4xx, with a test that fails first: Next from a second tab (`openNext`, OB002; both games); two tabs replacing one reaction (the unique index); a report racing its comment's deletion (23503); a group join racing the group's deletion (23503); a comment holding a NUL character (22021). Game 2's Next already mapped OB002 (`substring-runs.ts`), so only game 1 changed.
- [x] The sixth case (a member leaving while a reaction is replaced, 40P01) was reproduced and now answers 409 `busy` (answer 12). The leave was the request stopped in every run; the reaction side's mapping is *unverified*.
- [x] A NUL character is refused where text reaches the database, with each field's existing code (answer 13): comments, group names, display names, usernames (profile, friend requests, removals, reaction targets, the account-delete confirmation) and typed answers.

**19c — boards start at a player's join day** (answer 4).
- [x] A friends board for a day before a player joined doesn't list that player (`src/friends/leaderboard.ts:100-110`, where group boards already filter) → verify: a db test with a player made today reads yesterday's board without them.
- Joined is the account's day, `private.day_of(profile.created_at)`; no migration. The viewer too (answer 14), and Last week's friends board in every game (answer 15). Group boards keep M12 12d's D3: a later member stays listed with what they scored since.

**19d — a guest's result isn't lost** (answers 2 and 3; the design, answers 10, 16, 17).
- [x] A guest's Start on a run that is over returns that run's result, not a new run (`src/game/guest-runs.ts:77-96`).
- [x] A time-up read that lands after the answer that ended the run still shows the result, in both games (`guest-runs.ts:37-64`, `guest-substring-runs.ts`).
- **The design, settled (answers 10, 16, 17):** a finished guest run is no longer deleted at its first read; `private.purge_guest_days` clears it with the day's other guest runs. The Privacy page takes answer 16's words. One migration drops `private.end_guest_run`; the human's hosted `db push` follows the merge.
- Answer 3 changes M18's answer 9 ("sees their result once", "discard everything else about them after the run"): M18's ticket says keeping a result "would need a number from the human". The proposal must say what is kept, for how long (the human's number, or an end that needs none, such as the guest's next Start or the day's reset), whether it needs a migration and a hosted `db push`, and whether the Privacy page's guest words still hold.

**19e — actions name a player by ID, not username** (answer 5; ROADMAP: "can reach the wrong one from a stale page").
- [x] Removing a friend, removing a group member and reacting to a friend's run send the player's ID (`src/friends/friends.ts:30-34`, `src/groups/groups.ts:142-147`, `src/reactions/reactions.ts`, their routes and buttons) → verify: a db test renames A, gives A's old name to B, and the stale action reaches A or nobody, never B.

**19f — is the live board late?** (answer 8).
- [x] An e2e or db test shows whether a friend whose question time ran out stays "on question k" on an open board (`src/friends/board.ts:60-95`). Hypothesis: yes, until the next fetch, because nothing is written when time runs out (ROADMAP, M07 7c); disproved if the board changes with no fetch. Then ask the human, with the fixes' costs. No fix in this ticket.

## Out of scope
- `plor_app`'s comment-delete grant (answer 7): after the beta, as its own security proposal.
- "Ship on your word" (answer 9). `RIFF-m15`'s uncommitted 15d edits are left untouched; deleting them needs the human's word.
- Every other Next revision item.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| The highest answer index | 19a's 400 | `QUESTIONS_PER_DAY` (`src/config/tunables.ts:4`), the constant the puzzle check already enforces for every day (`src/content/puzzle.ts:180`); no new number, and no read of the puzzle |
| How long a guest's finished result is kept | 19d | Until the day's reset, the existing `private.next_reset` (answer 10); no new number |
| The 4xx status of each 19b case | 19b | The status each file's error map already gives its nearest case; the two with none were asked (answers 11 and 12), both 409 like the file's other clashes |

## Plan
19a → 19b → 19c → 19d's proposal (asked while 19c builds) → 19d → 19e → 19f. Within a sub-ticket, fixes in separate files go to parallel builders (`sonnet`); the `reviewer` (`sonnet`) reads each PR. Beside M19: 16f's remaining questions (a design task, different files).

## Removes
To be listed per PR. 19e: the username parameters of the three actions (`removeFriend`, `removeMember`, a run reaction's target) and `GROUP_ID` in `src/groups/groups.ts` (one shared `UUID` now).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 19a, as drafted: the index bound is "read from the puzzle; no constant" | The route compares with `QUESTIONS_PER_DAY` | Every approved day has exactly that many questions, and the route serves game 1 only; a read would add a query for the same number |
| M18, answer 9 and DECISIONS' Guest play: a guest "sees their result once"; a run's rows go when it ends; a retried final answer gets 409 `run_over` | A finished guest run stays until `private.purge_guest_days` clears its day; a retried final answer gets the stored result, as a player's does; `private.end_guest_run` is dropped | Answers 2, 3, 10, 16, 17: a result read once could be lost unseen. DECISIONS.md's row and Log (2026-11-13) record it |
| CLAUDE.md, Fail loudly: recovery is "logged and counted" | The failed sign-out is one `log.error` line, "account deleted, sign-out failed" | The project counts by log lines (DECISIONS.md, the Turnstile entry); there is no other counter |

## Evidence
**19a** (2026-11-13, commit `9dbde61`).
- Each test failed first: the api client, "expected SyntaxError: Unexpected token '<' … to be an instance of ApiError"; the delete route, "expected { status: 500, …(1) } to deeply equal { status: 200, body: { ok: true } }"; the answers route, "expected 500 to be 400" for index 99999999999 (index 7 alone answered 403 before, 400 now).
- After: `npx vitest run src/lib/api-client.test.ts src/app/api/account/delete/route.test.ts`: "Tests  3 passed (3)". `npm run test:db -- -t "refuses a player whose run is still going"`: "Tests  1 passed". `npm run test:db -- src/app/api/account/delete -t "POST /api/account/delete"`: "Tests  4 passed". `npm test`: "Test Files  66 passed (66)", "Tests  749 passed (749)". `npx tsc --noEmit -p .`: exit 0.
- **Not run:** the full `npm run test:db` and the e2e (CI's run is the evidence); nobody has seen the three messages in a browser.
**19b** (2026-11-13, commit `2d9525b` and the one after it).
- Each test failed first with a 500 (the builder's runs): OB002 from `openNext`; 23505 on `reaction_one_per_comment`; 23503 on `comment_report_comment_id_fkey` and on `group_member_group_id_fkey`; 40P01 "deadlock detected"; 22021 "invalid byte sequence … 0x00" for each NUL case; the account-delete confirmation, "expected { status: 500, …(1) } to deeply equal { status: 400, …(1) }". The races hold a second connection's transaction and wait on `pg_stat_activity`; no sleeps.
- After: the whole `npm run test:db`: "Test Files  59 passed (59)", "Tests  432 passed (432)" (before the account-delete case, which then passed alone: "Tests  4 passed"). `npm test`: 749 passed. `npx tsc --noEmit -p .`: exit 0.
- **Not run:** the e2e (CI). **Not verified:** the two messages in a browser; the reaction side as the deadlock's victim.
**19c** (2026-11-13).
- Each test failed first (the builder's runs): yesterday's board, "expected [ 'yfmwfq746i', 'ynmwfq7s6t', …(2) ] to deeply equal [ 'yfmwfq7s6t', 'yvmwfq7s6t' ]" (N, made today, still listed); Last week's, "expected [ 'lfmwfq8e86', 'lcmwfq8e86' ] to deeply equal [ 'lcmwfq8e86' ]".
- After: the whole `npm run test:db`: "Test Files  59 passed (59)", "Tests  434 passed (434)". `npx tsc --noEmit -p .`: exit 0.
- The review's finding, the graph: `summary` moved from `race.tsx` to `race-layout.ts` to be tested; its two tests failed first with "TypeError: summary is not a function" (the old one, unexported, read `.points` of a viewer who isn't listed). After: `npx vitest run src/app/race-layout.test.ts`: "Tests  20 passed (20)"; `npm test`: "Tests  752 passed (752)".
- The older board tests and three e2e specs make their players today, so their sign-up day is set 14 days back (a fixture value: before last week's Monday); no expected value changed.
- CI's first e2e run (head `13f1abb`) failed three specs the builder hadn't touched: `alive.e2e.ts:150` and `calm.e2e.ts:71` ("element(s) not found": a row on Today's card, which opens on Yesterday) and `screen-readers.e2e.ts:65` ("Expected: 95, Received: 53": the page is shorter without the player's row). Their players' sign-up day is now set back as well; `npm run test:e2e -- e2e/alive.e2e.ts:150 e2e/calm.e2e.ts:71 e2e/screen-readers.e2e.ts:65`: "3 passed (1.3m)" on this PC. **What it showed: on a player's first day, Today's Leaderboard card opens on an empty Yesterday** (answer 14's "list can be empty", now the first thing a new player sees there; ROADMAP, For M19).
- **Not run locally:** the rest of the e2e (CI), the three specs the builder edited among them. **No test of its own:** game 2's and the Overall board's Last week (the same `onBoard` filter as game 1's). **No test:** `Standings` showing an empty Last week in Graph as the bare list, not the race (`src/app/leaderboard.tsx`; the project has no component tests). **Not verified:** the boards in a browser, and what an empty Yesterday or Last week list looks like for a new player with no older friends.
**19d** (2026-11-13).
- Six tests failed first (`npm run test:db -- -t "a finished guest"`: "Tests  6 failed | 2 passed"): game 1's Start and second read, "expected { date: '2026-11-13', …(10) } to match object { status: 'died', question: null }"; its retry and late Next, "expected 'not_started' to be 'died'"; game 2's Start, "expected { date: '2026-11-13', …(7) } to match object { status: 'finished', open: null }"; its second read, "expected [] to deeply equal [ { letters: 'xk', …(4) }, …(6) ]"; its try after the end, "expected 'not_started' to be 'finished'". The two that passed before are guards: re-reads add nothing to the tally, and the purge still clears a closed day's finished run.
- After: the whole `npm run test:db`: "Test Files  59 passed (59)", "Tests  441 passed (441)". `npx supabase test db`: "Files=39, Tests=791 … Result: PASS" (`guest_play`'s plan 126 → 115: `end_guest_run`'s cases out). `npm test`: "Tests  752 passed (752)". `npx tsc --noEmit -p .`: exit 0. The migration `20261114023236_drop_end_guest_run.sql` is applied to the local database (`npx supabase migration up`).
- What a guest gets after the end, as a player does: game 1, a retried last answer 200 with the stored result, Next 409 `run_over`; game 2, a try 200 `time_up` with the finished run, Next 409.
- Tests of the old rule were rewritten to the new one, and those of `end_guest_run` removed with it (the OB015 cases, the "another request ends it mid-read" race, pgTAP's eleven cases; its count of today's runs went six → nine as finished runs stay).
- **Not run:** the e2e (CI). **No test:** a finished game 2 run of a closed day being purged (game 1's case and pgTAP cover the same statement); the purge racing a read at midnight. **Not verified:** a returning guest's finished result in a browser; the hosted database (nothing is pushed).
**19e** (2026-11-13).
- Three db tests failed first (`npm run test:db -- -t "<describe name>"`): reacting and removing a friend by ID, "expected { status: 400, … } to deeply equal { status: 200, body: { ok: true } }"; removing a group member by ID, "Error: member_not_found". They fail because the old routes took no ID (the request's shape changed), so "failed first" is by interface. In each, B gives up their username, C in the same circle takes it, the action names B's ID: it reaches B, and C is untouched.
- The review's fix, test first: a stranger's profile carried the player's ID ("AssertionError: expected { …(6) } to deeply equal { username: '…', …(4) }", `+ "userId"`); now only a friend's or the player's own full profile does.
- After: the whole `npm run test:db`: "Test Files  59 passed (59)", "Tests  444 passed (444)". `npm test`: "Tests  752 passed (752)". `npx tsc --noEmit -p .`: exit 0. No migration.
- Who now receives a player's ID (recorded in DECISIONS.md's Log, 2026-11-13): the viewer's friends list and board (their friends'), a group's members (each other's), a friend's or own profile. Not a stranger's, a requester's or a blocked player's profile, nor the request lists.
- A new test helper, `src/test/usernames.ts` (`handNameOver`), moves the rename wait and the 30-day hold aside with SQL, as the players route test does.
- **Not run:** the e2e (CI). **Not verified:** the three buttons in a browser. **Still by username** (out of scope): accept, decline, cancel, block; the open board's live updates and reaction keys.
**19f** (2026-11-13). **The hypothesis held: the open board is late.**
- The test, in `src/app/api/board/route.db.test.ts`: "a friend whose time ran out changes on the board only at the next read: nothing is written or sent when time runs out". The viewer has finished; a friend is on question 1. The friend's run is aged past its question time (the test's clock, as `ageRun` in `src/game/runs.db.test.ts`); the friend's `private.run_event` rows and the `realtime.messages` naming them are counted before and after and do not change; a fresh board read then says `finished`, `timed_out`, question 1.
- `npm run test:db -- -t "the live board over HTTP"`: "8 passed"; the whole `npm run test:db`: "Tests  445 passed (445)"; `npx tsc --noEmit -p .`: exit 0. A characterization test: it passes on today's code, and a fix must change it.
- By reading: the board loads on mount, on the channel's join or reconnect, and on a nudge or a friend's "finished" message (`src/app/board.tsx:64-104`); no timer, focus or visibility refetch. The friend's own browser does read its state when its time runs out (`src/app/game.tsx:222`, `437`), a read that writes and sends nothing.
- **Not run:** an e2e of an open page (the db test and the reading stand for it). **Not built:** any fix (the ticket).

## Review
- Blocking findings and how each was fixed: 19f (the `reviewer`, 2026-11-13, one pass, by reading): none. 19e (the `reviewer`, 2026-11-13, one pass, by reading): `GET /api/players/[username]` gave any signed-in player the ID of any player they looked up, against DECISIONS 2026-11-12 (E7, a stranger sees names only); fixed, test first, by sending the ID only with the full profile; the fix was not re-reviewed. 19d (the `reviewer`, 2026-11-13, one pass, by reading): none in the code; the ticket, handoff and commit message it asked for are in this PR. 19c (the `reviewer`, 2026-11-13, one pass, by reading): one. The Graph of Last week would throw for a viewer who joined this week, as `summary` and `Standings` took the viewer to be listed; fixed in this PR (the graph is described without the viewer's points, and an empty week shows the list, not the race). The fix itself was not reviewed again. 19a: none (the `reviewer`, 2026-11-13, one pass). 19b: none (the `reviewer`, 2026-11-13, one pass, by reading); the account-delete NUL case it found was fixed in this PR under answer 13.
- Deferred to ROADMAP "Next revision": 19f: one item (For M19). 19e: two items (For M19). 19d: two items (For M19). 19c: two items (For M19). 19a: two missing boundary tests (For M19). 19b: three items (For M19).
