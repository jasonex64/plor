# M14 14b-20 — Comments and Undo

**Status:** approved (human, 2026-11-01: "Approve, build it", to "Build 14b-20 as drafted, with \"N too many\" past the limit?"), done (PR #150, merged on green CI at the human's "Merge when green", 2026-11-01). It was drafted from three rounds of guided questions (2026-11-01, Pacific) on the player-facing items left in ROADMAP For M14 after 14b-19. M14 waits for all four groups, one PR each, and this group goes first (answers 1, 2, 4 and 5); 14c-2 follows them.

## Goal
What a player writes or taps in the feed is never shown as sent and then lost:
- a comment that can't be posted is stopped at Post, with the reason;
- a held post goes out before signing out;
- a sent comment doesn't flicker or show twice;
- one row's reaction changes reach the server in the order they were made.

## Who uses it / what breaks without it
- **Used by:** every player who comments or reacts, every day.
- **Breaks without it** (ROADMAP For M14, from 14b-6b's review):
  - **A spaces-only comment, or one over 280 characters:** it shows as posted, then fails 5 s later, and the draft comes back with the error.
  - **Signing out with a post still in its 5-second Undo:** the post is sent after the session has ended and fails.
  - **A sent comment:** it can flicker, or show twice for a moment, when a reload or a Realtime nudge crosses its send.
  - **Two sends for one reaction row:** they can be in flight at once and reach the server out of order, leaving the wrong reaction (rare).

## What the human decided (2026-11-01, on the Windows PC, quoted)
Round 1:
1. M14 waits: "Yes, all of them" ("Two or three more PRs, then 14c-2.").
2. Groups: all four: "Screen readers, Comments and Undo, Settings and invites, Small jumps and finds".
3. Screen readers are checked by "You test on your phone" (for their own PR).
4. PR size: "One group per PR".

Round 2:

5. First: "Comments and Undo" ("Players post every day, so these bite most often; small and contained").
6. A bad comment: "Stop it at Post" ("Post does nothing and says why (\"Write something first\" / \"280 characters at most\"), with a live count near the limit. Nothing fails later.").
7. Signing out with a held post: "Send it first" ("Sign-out waits a moment, sends what's held, then signs out. Nothing the player did is lost.").
8. Safari's invite share (for the Settings and invites PR): "Make the link earlier".

Round 3:

9. The count: "From 20 left" ("Appears at 260 of 280 (\"20 left\"), red past the limit.").
10. If that send fails: "Stay signed in, say so" ("\"Your post didn't send. Try again, or sign out without it.\" Nothing lost silently; one more step for the player.").

## Source
- **The database rule:**
  - `private.comment`'s `comment_body_format`: `char_length(body) between 1 and 280 and body = btrim(body)` (`supabase/migrations/20261028140000_baseline.sql:635-637`).
  - `char_length` counts characters, so an emoji is one; `maxLength` was dropped in 14b-6b for counting it as two.
  - The browser counts the same way: by code points, `Array.from(text).length`.
- **WCAG 2.2:**
  - 3.3.1 Error Identification: the reason is said in text.
  - 4.1.3 Status Messages: the count and the reason are announced without moving focus.
- **14b-6b** (`docs/milestones/M14-14b-6-feel-and-polish.md`): the Undo hold (`src/lib/hold.ts`), the toast (`src/app/undo.tsx`), and P1, a held action is sent on leaving.

## Acceptance criteria
- [x] **A bad comment (answers 6 and 9):**
  - Post with a box of only spaces does nothing but say "Write something first".
  - Post with more than 280 characters (counted as the database counts them, an emoji as one) does nothing but say "280 characters at most".
  - Neither shows the comment, holds it, or sends anything.
- [x] **The count (answer 9):** from 20 characters left, a live "N left" under the box. Past the limit it reads in the danger colour, "N too many" (proposal). Under 260 nothing shows.
- [x] **Sign out (answers 7 and 10):**
  - With a post or reaction held for Undo, Sign out sends it first, waits for the answer, then signs out.
  - If the send fails, the player stays signed in and reads "Your post didn't send. Try again, or sign out without it.", with Try again and "Sign out without it".
- [x] **No flicker:**
  - A sent comment stays shown until a thread loaded after its send holds it. It never disappears and comes back.
  - It never shows twice when a Realtime nudge lands between the send and that load.
- [x] **Reactions in order:** two sends for one reaction row never run at once. The second waits for the first, so the server ends on the last state picked.
- [ ] **Checks:**
  - The e2e files these touch pass, and `src/lib/hold.test.ts` covers the ordering.
  - DESIGN.md describes the count and the stopped Post.
  - The `reviewer` agent has reviewed the diff.

## Out of scope
- **The other three groups,** each its own PR (answer 4): screen readers, including the Undo toast's focus and announcement; settings and invites; small jumps and finds.
- **The server's own checks:** they stay as they are, the boundary's validation.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 280 | The most characters | `COMMENT_MAX_LENGTH` (`src/config/tunables.ts:49`), the database's rule |
| 20 left (260 of 280) | When the count shows | Answer 9 |
| "Write something first", "280 characters at most" | The reasons | Answer 6 |
| "N left"; "N too many" past the limit | The count's words | "N left" from answer 9's wording; "N too many" a proposal, for approval with this ticket |
| "Your post didn't send. Try again, or sign out without it.", "Try again", "Sign out without it" | Sign-out's failure | Answer 10 |

## Plan
1. **Red first:** an e2e (`e2e/comments-and-undo.e2e.ts`) for the bad comment, the count and sign-out, and `hold.test.ts` cases for the ordering. The flicker gets an e2e that holds the reload after a send.
2. **Bad comment:** `comments.tsx`'s `post` checks the trimmed length by code points and shows the reason; the count sits under the box.
3. **Sign out:** the holder gains a send-now that reports whether the held action went. `SignOut` uses it before `/api/auth/sign-out`, and shows the failure's choice.
4. **Flicker:** a sent change is let go only once a thread loaded after it holds it, matched by the server's id, which the send's answer gives. A pending copy is hidden when the thread already holds its comment.
5. **Ordering:** the holder chains sends that share a key.
6. **Check:**
   - Run the touched e2e files and `hold.test.ts`.
   - Update DESIGN.md.
   - Run the `reviewer` agent.
   - Update ROADMAP and HANDOFF.

## Removes
- The post that shows and then fails.
- The send after sign-out.
- The flicker.
- The out-of-order reaction sends.
- The four ROADMAP For M14 items.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Plan 4: let a sent change go once a thread loaded after it holds it, matched by the server's id | `latestOnly`'s promise settles only once the newest load's answer is handled (`src/lib/latest.ts`) | The flicker's cause was there: a reload a newer one replaced settled at once, so the shown copy went before the newer thread landed. Fixed at the cause, for every caller, with no ids to match |
| A pending copy hidden when the thread already holds its comment (Plan 4) | Nothing new | `changed()` already skips a post the loaded thread holds (14b-8b) |
| The textarea's `required` | Removed | The stopped Post says both reasons itself (answer 6); the browser's own bubble for an empty box would be a second way |
| A failed send at sign-out (answer 10) | The held action stays held with no window until Try again, "Sign out without it" (`discard`), Undo or leaving the page; sends already under way are waited for, and one that failed is sent again on Try again; one sign-out runs at a time | The first build restarted the 5 s window, so the post could go or fail by itself while the player chose, and a second tap or a send under way let sign-out go first (review, blocking). "Sign out without it" puts a post's words back in the box, as any undo does, before the page signs out |
| Plan 1: a flicker e2e that holds the reload after a send | `latest.test.ts`'s case only | The cause is in `latestOnly`, whose order a unit test sets by hand; an e2e would have to cross a Realtime nudge with a reload, which it can't make happen reliably |

## Evidence
All on the Windows PC against the local stack, `next dev` on :3000, 2026-11-01 (Pacific).

- **Red first:**
  - `npx vitest run src/lib/hold.test.ts src/lib/latest.test.ts`: 4 failed (`holder.sendNow is not a function`, the row's second send started early, and the older load's promise settling before the newer answer), 10 passed.
  - `npx playwright test e2e/comments-and-undo.e2e.ts`: 4 failed, each on what it checks: "Write something first" not found, "20 left" not found, the sign-out order without `/api/comments`, and the failure's words not found.
- **Green:**
  - The two unit files: `14 passed`.
  - The e2e file: `4 passed (24.5s)`.
- **Unit tests:** `npm test` gave `Test Files 49 passed (49)`, `Tests 498 passed (498)`.
- **The full e2e suite:** `126 passed`, 2 failed under load.
  - `calm.e2e.ts`: three loading placeholders still up after 5 s.
  - `live-board.e2e.ts`: "Reactions on your run: ❤️ 1" not shown.
  - Both passed alone: `10 passed (2.5m)`.
- **Types and lint:** `tsc` and `eslint --max-warnings 0`, clean.
- **After the review's fixes:** `hold.test.ts` gives `15 passed`, and `comments-and-undo.e2e.ts` gives `4 passed (27.3s)`, its sign-out case slowing the post's answer by 1.5 s and tapping twice.
  - `npm test`: `Tests 504 passed (504)`.
  - The e2e files that use the holder (comments-and-undo, feel, reactions-menu, alive, live-board, settings, settings-sheet, account, groups, me): `41 passed (5.6m)`.

## Review
- **Reviewer** (`reviewer` agent, fresh context, 2026-11-01): two blocking findings, one flaw. `sendNow` answered true whenever nothing was held at that moment.
  - **The restarted window:** a failed post could fail again on its own while the player chose, then Try again signed out without it.
    - Fixed: no window while the player chooses.
    - `hold.test.ts`: "keeps a held action held with no window…".
  - **A second tap, or a send already under way:** sign-out went before the post's answer.
    - Fixed: `sendNow` waits for sends under way, sends again what failed, and answers a second call with the first's answer; `SignOut` runs one at a time.
    - `hold.test.ts`: "waits for a send already under way", "says a send under way failed…", "answers a second call…".
    - The e2e slows the post's answer and taps twice: `["post answered", "sign-out"]`.
- **Non-blocking, recorded in ROADMAP For M14:**
  - **Fixed here:** a page-leaving send no longer waits behind the row's earlier send (`hold.test.ts`: "sends at once when the page is left…"), and DESIGN.md's citations.
  - **Deferred:** the rest.
