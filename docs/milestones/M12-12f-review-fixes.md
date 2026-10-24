# M12 12f — MVP review fixes

**Status:** in review (2026-10-23): built on `m12-account` and reviewed. Its PR waits for green CI and the human's approval to merge. Drafted from Claude's review of the MVP against its tickets. The human asked for it to be drafted and built (2026-10-23: "draft and execute").

## Goal
A player can find how to add a friend from the home page, a day with no puzzle doesn't leave the page stuck, and taps that delete other players' or your own data ask first.

## Who uses it / what breaks without it
- **Used by:** every signed-in player. The human is first, because plor.app has no approved day yet.
- **Breaks without it:**
  - **Adding a friend can't be found.** Since 12a (A1) the invite link is only on `/account`. The home page's empty board says "Add friends to see their runs here." and offers nothing (`src/app/board.tsx`). The human: "theres no way to add friends on site" (2026-10-23). Friends are the MVP's social core (ROADMAP, Product: "Friends: added by invite link").
  - **A day with no puzzle is a dead end.** `GET /api/run` answers 404 `no_puzzle_today`. The game card then shows only that error, with no streak, and it never moves to the new day at midnight: the reset timer needs `run.msToReset`, and no run arrives (`src/app/game.tsx`). That breaks M11 H6 ("every section of an open page moves to the new day at the reset"). plor.app has no approved day today, and 9 days in the drafted calendar are parked (ROADMAP, For M13).
  - **One tap deletes data with no confirmation.** These happen at once:
    - Leaving a group deletes your comments in it (M10 G6), and so does removing a member (`src/app/groups.tsx`).
    - Removing a friend ends the friendship both ways (M07 D4), and a new invite link is the only way back (`src/app/account.tsx`).

    Only Delete group asks first.
  - **Copy that's wrong since M12.**
    - Picking a username says "It can't be changed later" (`src/app/home.tsx`), but 12b (A2) allows a change every 30 days.
    - The account page's username box doesn't lower-case what's typed the way sign-up's does, so "Jason" is refused there but accepted at sign-up.
    - ROADMAP, Product, still says a username can't change.
  - **The feed's post box doesn't say where a comment goes.** It posts to the friends thread only (M11 H2 (a)). A player in groups but with no friends posts where nobody reads it.
  - **The privacy page leaves out groups.** It says who sees your name through friends and invite links, but not that members of your groups who aren't your friends see your name, weekly points and group comments (M10 G3).

## Source
- **Tickets, as the spec for each behaviour:**
  - M07 7b: the invite link, Make, Copy, Reset.
  - M07 D4: removing a friend.
  - M10 G3 and G6: what group members see; leaving and removal.
  - M11 H1, H2 and H6: the home layout, the feed's post box, the reset.
  - M12 A1 and A2: where account settings live; changing a username.
- **Web Share API (MDN, Navigator.share)** and **Clipboard writeText (MDN)**, as M05's Share uses them:
  - the share sheet with `text` and `url`, falling back to the clipboard where there's no sheet;
  - `AbortError` when the player cancels.
- **Next.js error handling** (bundled `01-app/01-getting-started/10-error-handling.md`): expected errors are handled as return values. A day with no puzzle is an expected state, so `GET /api/run` returns it as data, not an error.
- **Confirming before a destructive tap:** `window.confirm`, the pattern Delete group already uses (`src/app/groups.tsx`, M10 10b). No new source.

## Claude's design (approved: human, 2026-10-23, "draft and execute")
- **F1, invite from the home page.**
  - "Friends today" gets an "Invite friends" part below the board, always shown: Make my invite link, then the link with Share and Copy.
  - Share uses the phone's share sheet where there is one, like M05's Share. The empty board's text points at it.
  - Reset link stays on the account page only, so a stray tap on home can't break a link already sent.
  - The account page keeps the friends list and the link (A1 stands). Both places use one component.
- **F2, a day with no puzzle.**
  - `GET /api/run` answers `200 { run: null, msToReset, streak }` when no run is in progress and nothing is approved for today.
  - The game card shows the streak, "There's no puzzle today.", and the countdown to the reset. At the reset it moves to the new day like every other section (H6).
  - Protocol 6, because a protocol-5 page would wait on `run: null` forever.
  - `POST /api/run/start` still answers 404 `no_puzzle_today`.
- **F3, confirmations:** Leave group, Remove (a member), and Remove (a friend) ask with `window.confirm`, saying what is lost. Cancelling does nothing.
- **F4, the username copy:**
  - Sign-up says the username can be changed later on the account page.
  - The account page's box lower-cases what's typed, like sign-up's.
  - ROADMAP, Product, says it can change (12b).
- **F5, the feed's post box** is labelled "Comment to your friends". A group's page keeps "Comment".
- **F6, the privacy page** adds groups: what members who aren't your friends see (G3).

## Acceptance criteria
- [x] **F1.** A new player with no friends sees "Invite friends" on the home page, makes their link there, and a second player who opens it is added. The home page has no Reset link (e2e).
- [x] **F2.** With no approved puzzle today and no run in progress, `todaysState` returns null (db test). The home page shows the streak, "There's no puzzle today." and the countdown, not an error (checked against the local stack, output recorded).
- [x] **F3.** Removing a friend asks first, and cancelling keeps the friend while accepting removes them (e2e). Leave and Remove member ask first (code read; same pattern).
- [x] **F4.** Sign-up's text no longer says the username can't change. The account page's box lower-cases what's typed (e2e: typing upper case changes the username).
- [x] **F5, F6.** The feed's box is labelled "Comment to your friends" (e2e). The privacy page names groups.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db` and `npm run test:e2e` pass (local: done), and so does CI (pending on the PR).

## Out of scope
These go to ROADMAP "Next revision" or to the human:
- **Putting the player's invite link in the result's Share.** Share is the one thing players send out, and today it opens the site's front page (M05 S3). Making it a friend invite is a product decision for the human.
- **Content and admin on plor.app (the human):**
  - make an admin;
  - approve days;
  - give the parked days and the days with no draft (2026-10-23 to 10-25) puzzles.

  A day with no puzzle neither counts toward nor breaks the streak (`src/game/streak.ts`).
- **A friend whose time ran out shows as "started" until a refetch.** It's already in Next revision (Correctness), and the fix changes the game's writes.
- **Smaller items, filed to Next revision:**
  - Yesterday's board lists a player who joined today with 0 points.
  - "Earlier day" pages back with no limit.
  - Opening a group's link when already a member gives no link to the group.
  - On a day with no puzzle, the feed still says "Finish today's puzzle".
- **The intro's "Sign in to play" line staying after sign-in:** the intro is static HTML on purpose, for Google's brand verification (`src/app/page.tsx`, M02 2c).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Protocol 6 | F2's change to `GET /api/run` | `src/lib/protocol.ts`: bumped on breaking API changes (M00 data design §2) |

F4's copy names no number of days, so it needs none.

## Plan
1. F1: extract the invite part of `Friends` (`src/app/account.tsx`) into `src/app/invite-link.tsx` with Share added, and use it in the board and on the account page.
2. F2: `todaysState` returns null instead of throwing, and `startRun` throws `no_puzzle_today` on null. The route returns the no-puzzle state. `game.tsx` renders it and sets the reset timer. Bump the protocol.
3. F3–F6: confirmations, copy, label, privacy text.
4. Tests: a db test for F2, and e2e for F1, F3, F4 and F5. Update the e2e lines the new label and the home invite change.
5. **F2 check.** *Hypothesis:* with today's puzzle removed locally and no run on it, the home page shows the no-puzzle card with a countdown and no alert. It's disproved by an alert, "Loading…" that stays, or no countdown.

## Removes
- The invite markup and its state in `Friends` (`src/app/account.tsx`), which move into the shared component.
- `todaysPuzzle`'s `no_puzzle_today` throw for `GET /api/run`: the 404 stays only on start.
- The false "It can't be changed later" copy, and the ROADMAP line that says the same.
- Game's own share-or-copy code, which moves to `src/app/share.ts`, shared with the invite link's Share (one way to share; reviewer's finding).
- In `live-board.e2e.ts`, the trip to the account page to make the invite link: the test now makes it on the home page (F1).
- `account.e2e.ts` keeps its check that the home page has no "Friends" region (the friends list), which still holds. The home page's "Invite friends" region is checked in addition.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| M12 A1 (a): friends and the invite link live on `/account`, not the home page | The invite link is also on the home page's "Friends today", without Reset; the friends list stays on `/account` | The human: "theres no way to add friends on site" (2026-10-23), and "draft and execute" for this fix. A1's reason (rare settings, the delete button away from the day) still holds for the rest |
| M05 S4 copies the share text and the link together where there's no share sheet | The invite's Share does the same through the shared helper. Its share text, "Add me as a friend on Plor", is Claude's copy | No source gives the invite's text. It's copy, not a number, so it's left for the human's copy pass (M14) |
| M11 H6: every section of an open page moves to the new day at the reset | It does on a day with no puzzle too. The no-puzzle card says "A new day starts in …", not "Next puzzle in …" | Tomorrow may have no puzzle either, so the card doesn't promise one |
| Next.js error handling: expected errors are handled as return values | `GET /api/run` returns `run: null` on a day with no puzzle. `POST /api/run/start` keeps its 404 | Start on a day with no puzzle can only come from a race at midnight, which stays an error |

## Evidence
- **F1, F3, F4, F5** (e2e). `npm run test:e2e` → `10 passed (1.1m)`, including:
  - `account.e2e.ts › a player invites a friend from the home page, and removing them asks first`: the link is made on the home page, with Share shown and no Reset; the second player is added; a dismissed Remove records its question and keeps the friend; an accepted one removes them.
  - `account.e2e.ts › the account page holds the account…`: the home page's "Invite friends"; the username typed as `AD<RUN>` saved as `ad<RUN>`.
  - `live-board.e2e.ts › a friend's run shows up live…`: the invite made on the home page, and the comment posted through "Comment to your friends".
- **F2, the server** (db test). `npx vitest run src/game/runs.db.test.ts src/game/shares.db.test.ts src/game/runs.plor-app.db.test.ts --no-file-parallelism` → `Test Files 3 passed (3)`, `Tests 38 passed (38)`, including "has no run state when nothing is approved for today and no run is in progress".
- **F2, the page** (a temporary Playwright script against the local stack, deleted after). Today's puzzle (2026-10-23, no runs on it) was removed, a new player signed in, and the puzzle was put back. The card read:
  ```
  Offbeat
  Streak: 0 days played in a row
  There's no puzzle today.
  A new day starts in 1:28:32
  ```
  - No `/api/` request failed. The page had one `role="alert"` element, empty and outside every app section: Next.js's route announcer, not an app error. The hypothesis held.
  - The reset itself on that card is the same `onDayOver` path that `live-board.e2e.ts › the reset reloads every section of the home page` checks with a run.
- **F6:** `src/app/privacy/page.tsx` has "Your groups", which matches M10 G3. The group preview route returns only the group's name.
- **Everything else:**
  - `npm test` → `Test Files 37 passed (37)`, `Tests 236 passed (236)`;
  - `npm run lint` clean;
  - `npx tsc --noEmit -p .` clean;
  - `npm run test:db` → `Test Files 30 passed (30)`, `Tests 206 passed (206)` (before the review fixes, which touch no database code).
  - `npm run test:sql` wasn't run: no SQL changed.
- **The first full e2e run failed 2 tests.**
  - `live-board.e2e.ts:39` failed on a race this change caused: it clicked "Your account" and then "Make my invite link", which the home page now has too. The test now makes the link on the home page.
  - `a reconnect refetches the board` timed out in the same run. It passed in the rerun. It's the flake already in Next revision (For M12).

## Review
The `reviewer` agent reviewed the diff in a fresh context, 2026-10-23.
- **Blocking findings and how each was fixed:**
  - *The "no Reset on home" check couldn't fail:* it ran before a link existed. Now it runs after the link is made on the home page, with Share visible.
  - *The "cancel keeps the friend" check didn't prove a confirm:* with no dialog, the reload could beat the remove. Now the test records the dialog's message, and an empty one fails.
  - *Stale protocol docs:* `M00-data-design.md` now says protocol 6, and HANDOFF.md is rewritten.
- **Fixed as well, though not blocking:** Share's code was a second copy of the result's Share; both now use `src/app/share.ts`. The invite's Share now runs through `run()`, so it clears an old note and sets busy.
- **Deferred to ROADMAP "Next revision":** none beyond the ones listed under Out of scope. These were closed, not parked:
  - **No route-level test of the `run: null` shape.** The route branch is two lines over the tested `todaysState`. The route uses the pool, not a transaction, so a test would have to delete the shared day's puzzle outside a transaction.
  - **`GET /api/friends` is called twice on the account page.** Wasted work only, on a rarely visited page.
