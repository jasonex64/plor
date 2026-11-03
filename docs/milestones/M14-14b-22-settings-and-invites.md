# M14 14b-22 — Settings and invites

**Status:** approved (human, 2026-11-02: "Approve, build it", to "Build 14b-22 as drafted?"), in review (PR #152). It was drafted from one round of guided questions (2026-11-02, Pacific), with 14b-20's answer 8 ("Make the link earlier"). It's the third of the four groups M14 waits for (14b-20, answers 1, 2 and 4).

## Goal
Inviting works on the first tap everywhere, and every invite button shares the same live link. The settings sheet never closes by itself, never flicks a switch back, and never loses a refused name. Your own invite link never says a friend invited you.

## Who uses it / what breaks without it
- **Used by:** every player who invites a friend or changes a setting.
- **Breaks without it** (ROADMAP For M14, from the reviews of 14b-2c-2, 14b-3 and 14b-18):
  - **Inviting:**
    - **Safari's first invite:** the link is made only after the first tap, so Safari can refuse the share sheet and the player sees "Something went wrong: NotAllowedError". This is unverified on an iPhone.
    - **Two invite buttons on one page** (Today's card and the friends list) each keep their own copy of the code, so a Reset in one leaves the other sharing a dead link.
  - **The settings sheet:**
    - **A touch that scrolls** on the dimmed page, then a keyboard click inside the sheet, closes it.
    - **Toggling a switch on, off, on** quickly shows it off for a moment before the last answer.
    - **A name change refused after the sheet closed** (the name is taken) is never shown.
  - **Your own invite link:** it says "A friend invited you…" until the page knows the link is yours.

## What the human decided (2026-11-02, on the Windows PC, quoted)
From 14b-20:
- Answer 8: "Make the link earlier" ("Your invite link is made when the Friends tab opens, so the tap shares at once. Always works; every player who opens Friends gets a link made.").

Round 1:

1. Where: "Wherever Invite shows" ("Made as soon as the Friends tab or Today's invite card appears. Safari works from both; every player who sees either gets a link made.").
2. A share sheet refused anyway: "The link to copy" ("The same \"Copy it from here\" field a refused clipboard shows (14b-18). One way for both refusals.").
3. A late refusal: "Show it when it lands" ("The refusal appears in the Undo toast's place: \"That username is taken.\" You see it wherever you are.").
4. Your own link: "Hide the line until known" ("Signed in, the line waits until the page knows whose link it is; signed-out friends still see it at once. No flash; a friend signed in sees it a moment later.").

## Source
- **Web Share API** (MDN, SOURCES.md): `navigator.share` needs a user activation; a call without one rejects with `NotAllowedError`.
- **Clipboard writeText** (MDN, SOURCES.md): a refusal is also `NotAllowedError`. That's 14b-18's fallback.
- **14b-3's invite button** (`docs/milestones/M14-14b-3-invite-button.md`): links are shared, never shown, made by `POST /api/friends/invite`.
- **14b-2c-2's settings sheet** (`docs/milestones/M14-14b-2c-review-items.md`): the dimmed-page close, `Preferences`, the account forms.
- **14b-18's own-link line** (`body[data-own-invite]`).

## Acceptance criteria
- [x] **The link made earlier (answer 1):**
  - On the Friends tab and with Today's invite card, a player without an invite link gets one made when the button appears.
  - The first tap shares at once, with no request in between.
- [x] **One code (answer 1):**
  - Every invite button on a page shares the same code.
  - After Reset on the Friends tab, Today's card shares the new link too.
- [x] **A refused share sheet (answer 2):**
  - When `navigator.share` rejects with `NotAllowedError`, the link (or the result's text) shows in the "Copy it from here" field.
  - This holds for every caller of `shareLink`, as 14b-18's clipboard refusal does.
- [x] **The sheet's close:**
  - A press on the dimmed page that becomes a scroll (`pointercancel`) doesn't arm the close.
  - A keyboard click inside the sheet never closes it.
- [x] **Switches:** toggling one switch on, off, on keeps it on throughout, and it ends on the last answer.
- [x] **A late refusal (answer 3):** a username or display-name save refused after the sheet closed shows its reason in the toast's place, with Close (the `alert` from 14b-21).
- [x] **Your own link (answer 4):**
  - Signed in, the "A friend invited you…" line shows only once the invite's preview says the link isn't yours. It never shows on your own.
  - Signed out, it's in the served HTML as before.
- [x] **Checks:**
  - The e2e files these touch pass.
  - DESIGN.md describes the link made early and the shared code.
  - The `reviewer` agent has reviewed the diff.

## Out of scope
- **Small jumps and finds:** the fourth group, its own PR.
- **A group's invite link:** it's made when the group is.

## Numbers
None: no values beyond the human's words and 14b-18's field.

| Value | Used for | Origin |
|---|---|---|
| "Copy it from here" | The refused share | 14b-18, answer 9; answer 2 here |

## Plan
1. **Red first:** an e2e (`e2e/settings-and-invites.e2e.ts`) for each criterion.
   - Safari's refusal is stood in for by an init script whose `navigator.share` rejects with `NotAllowedError` unless the tap is the first event: the browser boundary, as 14b-18 did for the clipboard.
   - The sheet's close uses a dispatched `pointerdown` and `pointercancel`.
   - The switch uses a held `/api/profile/settings`.
2. **The invite code:** one copy in the frame (or a shared hook) that the Friends tab and Today's card read. It's made (`POST /api/friends/invite`, `reset: false`) when either first shows without one. Reset updates it for both.
3. **`shareLink`:** a `NotAllowedError` from `navigator.share` also answers "refused".
4. **The sheet:**
   - `pointercancel` clears `pressedOutside`, and a click with `detail` 0 never counts as outside.
   - `Preferences` tracks pending saves by request, not by value.
   - The account forms' late refusals go to the toast's alert.
5. **Your own link:** signed in, the line is hidden until `AcceptInvite` knows whose link it is (a body flag, as 14b-18's).
6. **Check:**
   - Run the touched e2e files and the detector.
   - Update DESIGN.md.
   - Run the `reviewer` agent.
   - Update ROADMAP and HANDOFF.

## Removes
- The make-then-share on first tap.
- The two code copies.
- The raw `NotAllowedError` from a refused share sheet.
- The sheet's false close.
- The switch's flick.
- The lost late refusal.
- The own-link flash.
- The six ROADMAP For M14 items.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Plan 1: the share stand-in rejects unless the tap is the first event | It always rejects | The point is what the page does with a refusal; when Safari refuses is outside the page's control |
| One code for the page (Plan 2) | `InviteCodeProvider` in the frame, keyed to the signed-in player; a player signed in again asks again, and an answer for a player no longer signed in is dropped | The review found the first version stuck after signing out and in on the same tab |
| A late refusal in the toast (answer 3) | `useRefusal`: the form's own while it's shown, the toast's alert (`hold.fail`) once the sheet has closed | The review found the first version, which never marked the form shown again after the development server's second effect, sent every refusal to the toast |
| `account.e2e.ts` expected no Reset before the first share (14b-3) | Reset is there from the start | The link is now made when the button shows (answer 1), so there's a link to reset; the share and Reset checks after it are unchanged |

## Evidence
All on the Windows PC against the local stack, 2026-11-02 (Pacific).

- **Red first:** `npx playwright test e2e/settings-and-invites.e2e.ts` failed all 7 on the unchanged code:
  - no `POST /api/friends/invite` before the tap (`Received: 0`);
  - after a Reset, Today's card shared the old link (`Expected: ".../i/psNnd4krgE"`, `Received: ".../i/RKKLhCnOoD"`);
  - no "Copy it from here" on a refused sheet;
  - the sheet closed;
  - the switch went unchecked as the first save landed;
  - no alert for the late refusal;
  - the owner saw the line while the preview was held.
- **Green:** the file and `account.e2e.ts` gave `12 passed (49.0s)`, after the review's fixes.
- **Each review fix, checked:** with each undone in turn, its test failed (`1 failed` each):
  - the provider's release after a fetch, for sign-out and in on one tab;
  - `useRefusal`'s setup, for the in-form refusal;
  - `onPointerCancel`;
  - the `detail` check.
- **The full suite** (it ran across some of the review's edits): `140 passed`, 3 failed.
  - The shared-link test failed mid-edit; it passed after.
  - The Continue test's sign-in passed in the re-run (`9 passed` with the 14b-22 file).
  - `shell.e2e.ts`'s time-up is already in ROADMAP as intermittent.
- **Unit tests:** `npm test` gave `Tests 504 passed (504)`. `players.test.ts` passes with the file's `j`-names.
- **Types and lint:** `tsc` and `eslint --max-warnings 0`, clean.

## Review
- **Reviewer** (`reviewer` agent, fresh context): three blocking findings, all fixed with tests.
  - **The invite provider never asked again** for a player who signed out and in on the same tab. An answer for a former player could also replace the current one's.
  - **`useRefusal` sent every refusal to the toast** under the development server's Strict Mode.
  - **One test proved both of the sheet's guards at once.** It's now two tests.
- **Also confirmed by the reviewer:**
  - Every invite button is inside the provider.
  - One request per player.
  - `share.tsx`'s refusal path.
  - `Preferences`' counter.
  - The own-link line for signed-out visitors, friends and the owner.
  - `account.e2e.ts`'s change is a legitimate update.
- **Fixed here from the non-blocking list:**
  - The Close check on the late refusal.
  - The clipboard emptied before the last after-Reset share.
  - A misplaced comment.
- **Deferred to ROADMAP "Next revision":** the rest.
