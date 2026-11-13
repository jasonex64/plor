# M19 — Pre-beta fixes

**Status:** planned (drafted 2026-11-13; **not approved to build**: it waits for the human's word on this ticket).

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
- [ ] `src/lib/api-client.ts:24` looks at the status before reading the reply as JSON (audit W8) → verify: a unit test giving it an HTML 502 gets the app's error, not a `SyntaxError`.
- [ ] `/api/answers?index=` refuses an index outside the day's questions with a 400 (audit W9; `src/app/api/answers/route.ts:18-19`) → verify: a route test with an index past the integer range gets 400.
- [ ] `POST /api/account/delete` answers ok when the deletion committed and `signOut` then failed; the failure is logged and counted (answer 6; `src/app/api/account/delete/route.ts:16-17`) → verify: a test with a failing `signOut` gets ok and one counted log line.

**19b — clear replies for rare clashes** (ROADMAP: "Concurrent or malformed requests that get a 500 instead of a 4xx").
- [ ] Each of these answers a 4xx, with a test that fails first: Next from a second tab (`openNext`, OB002; both games); two tabs replacing one reaction (the unique index); a report racing its comment's deletion (23503); a group join racing the group's deletion (23503); a comment holding a NUL character (22021).
- [ ] The sixth case (a member leaving while a reaction is replaced, 40P01) is *unverified*: reproduce it first; if it can't be reproduced, record that and leave it.

**19c — boards start at a player's join day** (answer 4).
- [ ] A friends board for a day before a player joined doesn't list that player (`src/friends/leaderboard.ts:100-110`, where group boards already filter) → verify: a db test with a player made today reads yesterday's board without them.

**19d — a guest's result isn't lost** (answers 2 and 3). **Design first: stop and ask before building.**
- [ ] A guest's Start on a run that is over returns that run's result, not a new run (`src/game/guest-runs.ts:77-96`).
- [ ] A time-up read that lands after the answer that ended the run still shows the result, in both games (`guest-runs.ts:37-64`, `guest-substring-runs.ts`).
- Answer 3 changes M18's answer 9 ("sees their result once", "discard everything else about them after the run"): M18's ticket says keeping a result "would need a number from the human". The proposal must say what is kept, for how long (the human's number, or an end that needs none, such as the guest's next Start or the day's reset), whether it needs a migration and a hosted `db push`, and whether the Privacy page's guest words still hold.

**19e — actions name a player by ID, not username** (answer 5; ROADMAP: "can reach the wrong one from a stale page").
- [ ] Removing a friend, removing a group member and reacting to a friend's run send the player's ID (`src/friends/friends.ts:30-34`, `src/groups/groups.ts:142-147`, `src/reactions/reactions.ts`, their routes and buttons) → verify: a db test renames A, gives A's old name to B, and the stale action reaches A or nobody, never B.

**19f — is the live board late?** (answer 8).
- [ ] An e2e or db test shows whether a friend whose question time ran out stays "on question k" on an open board (`src/friends/board.ts:60-95`). Hypothesis: yes, until the next fetch, because nothing is written when time runs out (ROADMAP, M07 7c); disproved if the board changes with no fetch. Then ask the human, with the fixes' costs. No fix in this ticket.

## Out of scope
- `plor_app`'s comment-delete grant (answer 7): after the beta, as its own security proposal.
- "Ship on your word" (answer 9). `RIFF-m15`'s uncommitted 15d edits are left untouched; deleting them needs the human's word.
- Every other Next revision item.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| The highest answer index | 19a's 400 | The day's own question count, read from the puzzle; no constant |
| How long a guest's finished result is kept | 19d | **Blank: stop and ask** (19d's proposal) |
| The 4xx status of each 19b case | 19b | The status each file's error map already gives its nearest case; a case with none is asked |

## Plan
19a → 19b → 19c → 19d's proposal (asked while 19c builds) → 19d → 19e → 19f. Within a sub-ticket, fixes in separate files go to parallel builders (`sonnet`); the `reviewer` (`sonnet`) reads each PR. Beside M19: 16f's remaining questions (a design task, different files).

## Removes
To be listed per PR. Expected: the username parameters of the three actions in 19e.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
