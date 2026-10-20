# M02 2f — Cleanup of the code items in "Next revision"

**Status:** planned. Drafted by Claude on 2026-10-20 at the human's request ("fix the open next revision items"); **waiting for the human's approval** before any code. Nothing here needs a new number.

## Goal
Fix the open ROADMAP "Next revision" items that are code or tests and need no human decision, so the list holds only real decisions and future-milestone work.

## Who uses it / what breaks without it
- Used by: playtesters (part A), the human when publishing and reading insights, and every later session that runs the tests.
- Breaks without it: per item, in the tables below. Items that break nothing today are marked *low* and can be dropped instead of fixed if the human prefers (CLAUDE.md: "If the answer is 'nothing yet', don't build it").

## Source
- Each item's own text and citation in ROADMAP "Next revision" (copy it into the commit message).
- DECISIONS.md: errors, logging, tests, database access (for every item); Game 1 and the answer model (validator items).
- Supabase Auth docs pinned in SOURCES.md for A1 and A2. SOURCES.md does **not** pin the JWT signing keys page (checked 2026-10-20), so A1 starts by asking the human to approve that page as a source.

## Part A — before the playtest (2026-10-26)
| # | Item (ROADMAP wording, shortened) | What breaks without it | Plan |
|---|---|---|---|
| A1 | `currentUserId` rethrows any `getClaims()` error as a 500 | A playtester who signs out on another device may see a 500 instead of the sign-in form, if tokens are HS256 | The human reads the project's signing algorithm in the Supabase dashboard and reports only its name. If HS256: treat a revoked session as signed out, with a route test. If asymmetric: close the item with that evidence |
| A2 | Supabase Auth failures show "Something went wrong (internal)" | A playtester can't tell a temporary outage on our side from their own mistake | Map Auth's upstream errors to a message saying it's on our side and temporary; the text is approved by the human in the PR. Test the mapping |

## Part B — after the playtest, any order
| # | Item | What breaks without it | Plan |
|---|---|---|---|
| B1 | `startRun` maps any 23503 to `no_puzzle_today` | *Low*: a wrong 404 if the user foreign key ever fails | Check `err.constraint`; test both constraints |
| B2 | `/api/admin/insights` turns `2026-02-30` into a 500 | *Low*: admin-only noise in the logs | Validate the date at the boundary → 400; route test |
| B3 | Insights page has no day selector when today has no puzzle | The report is unreachable once content runs out (after 2026-11-22) | Day selector over finished days (M03 D5); test |
| B4 | "Did you mean" counts spaces as letters | Multi-word text gets suggestions under the "4+ letters" rule | Count letters only; unit test |
| B5 | Two `<footer>` elements in the signed-in view | *Low*: markup only | One footer; check served HTML with curl |
| B6 | Username error text repeats the 3–20 rule | The message and the database check can drift | One constant feeds both the message and the check's test |
| B7 | `askHidden` never resolves if stdin closes | *Low*: publish hangs instead of failing | Reject on `close`; unit test |
| B8 | `parseDatabaseUrl` message lists all three parts | *Low*: a misleading boot error | Name only the missing part; unit test |
| B9 | `content:validate` silently skips non-`.json` files | A mistyped file name drops a day while CONTENT OK prints | Report any other file under the root as an error; fixture |
| B10 | Plural check only goes singular → plural | An entry named in the plural passes without its singular | Check both directions; fixture |
| B11 | Validator branches with no fixture | A regression in those rules passes CI | One fixture per branch (group key not in the bank, duplicate IDs, a name that normalizes to empty) |
| B12 | No test that a refused day rolls back earlier days in the batch | A partial publish could go unnoticed | Test outside the outer rolled-back transaction |
| B13 | `runs.db.test.ts` fixtures live outside a transaction | A crashed run blocks a later local publish | Wrap in a transaction or clean up in `finally`; test |
| B14 | No test for an earlier "too few" question not flagging a later one | *Low*: a small branch | Add the test |
| B15 | `route.db.test.ts` says "known catch rates" | *Low*: wording | Rename the test |
| B16 | Test imports with and without `.ts` | Two ways to do one thing | Use `.ts` everywhere (runtime already does) |
| B17 | `content:plurals` reformats the whole file | Noisy diffs on hand-formatted files | Write only when something changed, keeping 2-space JSON |
| B18 | `withTransaction` rollback-failure branch has no test | *Low*: hard to trigger | Test with a client whose rollback throws |
| B19 | Bundle check scans only `.next/static` | A secret in prerendered HTML or RSC payloads wouldn't be caught | Also scan `.next/server/app`; prove it with a planted string |
| B20 | CI actions pinned to tags, not SHAs | A moved tag could change what CI runs | Pin each action to its commit SHA, with the tag in a comment |
| B21 | `private.today()` uses `now()` (transaction start) | A publish opened just before midnight could edit a day that just started | **Hypothesis first:** a transaction begun at 23:59:59.9 and committed after midnight passes the guard today and fails with `statement_timestamp()`. New migration plus a pgTAP test that shows it. This touches the only definition of "today", so the human approves the approach in the PR |

## Not in this ticket
**Human decisions or actions** (each stays open in ROADMAP until the human answers):
- **Before the playtest:** mail scanners use up the one-time sign-in link (6-digit code instead, or a confirm page?); this matters for playtesters on work or Outlook mail.
- **Content, before each puzzle's day** (a puzzle can't change once its day starts): the 2d and 2e judgment calls, the 2e reviewer findings Claude kept (cheese kinds on 11-20 q3, piercings on 11-13 q5), the M01 host-rule cases, possibly dominant host answers (the M01 late questions and the 2e drafts), days with no concrete question, the Kaskaskia wording (2026-11-08), completeness gaps, the UK list.
- Numbers: `scripts/status` fetch timeout; `pg` connection timeout and app rate limits (M11); host bank size (after the playtest).
- Choices: one source for the Supabase CA (three uses today); local analytics on Windows (expose the Docker socket or disable `[analytics]`); strip zero-width characters in normalization or not; reference sources for concrete lists.
- Actions: upgrade local Node; local `plor_app` password (role change).
- Security changes: column-level grant on `missed_answer`; applying hosted Auth settings from the repo.

**Waiting on something else:** the ESLint upgrade (upstream support); the `DATABASE_URL`-missing boot behavior on Vercel (needs an investigation ticket); sign-out scope (only if players complain); the remote-reset caveat in `roles.sql` (no procedure resets the remote); the deletion procedure (write it at the first request); the local `profile.db.test.ts` login as `supabase_admin` with an observed default password (local only; a docs change would make it fail loudly).

**Future milestones:** realtime RLS (M06), reset countdown (M09/M12), points formula in the ticket (M08), home page copy (M09/M12), a hint when Enter matches no entry (M12 UX).

## Numbers
None. Items that need a number are listed above as human decisions.

## Plan
1. The human approves this ticket and says whether to drop the *low* items.
2. Part A on the M02 branch, `m02-sign-in-and-play` (CLAUDE.md: one branch per milestone; none exists today, so create it), as its own PR: reviewer, merge before 2026-10-26.
3. Part B on the same branch after the playtest, as a second PR, one commit per item (`M02 2f: <item> (removes: <what>)`), each ticking its ROADMAP item.
4. Reviewer pass, PR, merge on the human's approval.

## Removes
Per item, as listed: the duplicated username rule (B6), the second test-import style (B16), the silent file skip (B9), the second `<footer>` (B5), the mutable action tags (B20).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
