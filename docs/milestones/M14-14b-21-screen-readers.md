# M14 14b-21 — Screen readers

**Status:** approved (human, 2026-11-01: "Approve, build it", to "Build 14b-21 as drafted, including the test-only network exposure?"), in review (PR not opened yet). It was drafted from two rounds of guided questions (2026-11-01, Pacific). It's the second of the four groups M14 waits for (14b-20, answers 1, 2 and 4), checked by the human with a screen reader on their phone (14b-20, answer 3).

## Goal
A screen-reader player is told once that a page is loading, hears a failed send at once, is never dropped at the top of the page after Undo, Delete, Report or the feed moving, and hears each reaction list and the countdown by name.

## Who uses it / what breaks without it
- **Used by:** players who use VoiceOver, TalkBack, Narrator or NVDA.
- **Breaks without it** (ROADMAP For M14, from the reviews of 14b-2c-1, 14b-6a, 14b-6b, 14b-6c and 14b-13):
  - **Loading:** each placeholder is a status region whose shapes are hidden, so readers may say nothing, or several things at once (Today has three).
  - **The Undo toast:**
    - After Undo or Close, focus falls to the page.
    - A second toast with the same words may not be announced.
    - A failed send is announced only politely.
  - **The countdown's name,** "Seconds left," is an `aria-label` on a paragraph, which some readers skip.
  - **A comment's reactions** read as a bare "😂 1, yours".
  - **After Delete or Report in a ⋯,** focus drops to the page.
  - **Crossing 1200px** moves the feed column and loses focus from its comment box (WCAG 2.2 2.4.3).

## What the human decided (2026-11-01, on the Windows PC, quoted)
Round 1:
1. Loading: "One \"Loading\" per page" ("A single \"Loading\" when a page opens, however many parts load. Says something's coming, without a chorus (Today has three at once).").
2. After Undo or Close: "Back where you were" ("To what you used before the toast: the comment box, or the ⋯ you reacted from. You carry on where you left off.").
3. A failed send: "At once, interrupting" ("Announced straight away, as an alert, even mid-sentence. You can't miss that your post didn't go.").
4. After Delete or Report: "The next comment's ⋯" ("Focus moves to the comment that took its place (or the one before, if it was last). You stay in the list.").

Round 2:

5. If that place is gone: "The page's main heading" ("\"Plor, Friends\": a known starting point on the page you're on.").
6. Reactions: "\"Reactions: 😂 1, ❤️ 2\"" ("Named first, then the counts, the same as the old chips' group.").
7. The phone test: "Phone on your Wi-Fi to the PC" ("I start the dev server so your phone can open it at the PC's address. Local data only, nothing published; live updates may not work on the phone.").

## Source
- **WCAG 2.2** (SOURCES.md):
  - 4.1.3 Status Messages: loading as a status, a failure as an alert.
  - 2.4.3 Focus Order: focus kept where the player was.
  - 1.3.1 Info and Relationships: the reactions' name.
- **WAI-ARIA 1.2** (SOURCES.md): the `status` and `alert` live regions; `timer`, whose name is better given in its text.
- **Next.js, `allowedDevOrigins`** (bundled `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md`): the dev server blocks dev requests from hosts other than the one it started on unless the config lists them.
- **14b-6b's toast** (`src/app/undo.tsx`), **14b-13's ⋯ menu** (`src/app/reactions.tsx`), **14b-2c-1's column** (`src/app/side-column.tsx`).

## Acceptance criteria
- [x] **Loading (answer 1):**
  - The page has one status region, in the frame, that says "Loading" while any placeholder is shown and goes quiet when none are.
  - The placeholders themselves aren't live regions.
  - Today's three placeholders give one "Loading".
- [x] **Undo and Close (answers 2 and 5):**
  - After either, focus returns to what had it when the action was made: the comment box's Post, or the ⋯ the reaction came from.
  - If that's no longer in the page, focus goes to the page's `h1`.
- [x] **Failed send (answer 3):**
  - A send's failure is in an `alert`, read at once.
  - A held action's words stay a `status`.
  - The same words twice ("Comment posted", then another) are announced both times.
- [x] **After Delete or Report (answer 4):** focus moves to the next comment's ⋯, or the one before if it was the last. With no comment left, it goes to the feed's heading (proposal).
- [x] **Reactions (answer 6):** a comment's or run's reactions are a group named "Reactions", read "Reactions: 😂 1, ❤️ 2". The run's line keeps its visible "Reactions on your run:".
- [x] **The countdown:**
  - Its name is in its text: the number shown, "seconds left" read with it.
  - At 320px the prompt and its number still fit; checked at 320px, as 14b-6c checked 390 and 1440.
- [x] **The column at 1200px:** crossing 1200px with the comment box focused keeps focus there, and the draft.
- [x] **Checks:**
  - The e2e files these touch pass, checking roles, names and focus through the accessibility tree.
  - The human tries the loading, Undo, failed send, Delete and reactions changes with VoiceOver or TalkBack on their phone, against this PC (answer 7), and says what they heard.
  - DESIGN.md describes the announcements and focus.
  - The `reviewer` agent has reviewed the diff.

## Security: the phone test (for the human's approval with this ticket)
Answer 7 means the dev server answers on the home network, not only on this PC: a network-exposure change (CLAUDE.md, Security), recorded in DECISIONS.md as test-only.
- **Only for the test:** `next dev -H 0.0.0.0`, and an `allowedDevOrigins` entry for the PC's network address in `next.config.ts`. Neither is committed.
- **Afterwards:** both are removed and the server stopped (scraps).
- **Windows Firewall** may ask to let Node take connections on the private network. That's the human's to allow or refuse; I don't change system settings.
- **What the phone reaches:**
  - The local stack's test data. Nothing is published.
  - Supabase stays on `127.0.0.1`, so the phone's browser can't reach Realtime: live updates won't work there (answer 7 expected this).
  - Sign-in runs on the server, and email codes land in the PC's Mailpit.
- **Cookies:** `@supabase/ssr` sets the session cookies without `Secure` (its defaults), so they should work over plain `http`. Unverified until the test.

## Out of scope
- **The other two groups:** settings and invites; small jumps and finds.
- **A full screen-reader audit** of every page: these are For M14's six items.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| "Loading" | The page's one loading status | Answer 1 |
| "Reactions" | The reactions' group name | Answer 6 |
| The feed's heading | Focus after deleting the last comment | Proposal: answer 4 named only the next or previous |
| 320px | The countdown's narrow check | The site's narrowest checked width (14b-3, criterion 7) |

## Plan
1. **Red first:** an e2e (`e2e/screen-readers.e2e.ts`) for each criterion through the accessibility tree and `document.activeElement`.
2. **Loading:** the placeholders register with a frame-level count, and the frame's one `status` says "Loading" while it's above zero.
3. **Toast:**
   - `hold` remembers `document.activeElement`.
   - Undo and Close put focus back there, or on the `h1`.
   - The error goes in an `alert`, and each toast is keyed so the same words announce again.
4. **Delete and Report:** the comment list moves focus to the neighbour's ⋯ once the comment has left.
5. **Reactions:** a `role="group"` named "Reactions" around the summary.
6. **Countdown:** the timer's text carries "seconds left" for readers.
7. **Column:** `SideColumn` remembers the focused element inside its box before moving it, and focuses it again after.
8. **Check:**
   - Run the e2e.
   - Then the phone test (Security above): start the server for the network, give the human the address and the steps, record what they heard, then remove the config and stop the server.
   - Update DESIGN.md.
   - Run the `reviewer` agent.
   - Update ROADMAP, DECISIONS (the test-only exposure) and HANDOFF.

## Removes
- The placeholders' own live regions.
- The polite failure.
- Focus falling to the page after Undo, Close, Delete, Report and the column's move.
- The `aria-label` name on the countdown.
- The six ROADMAP For M14 items.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| A skeleton is a `status` region named by its label (14b-6a) | A silent `div` with the label in `data-loading`, the frame's one `status` saying "Loading" | Answer 1. The label stays for the page's code and the tests: six e2e files find placeholders by `data-loading` instead of the role, which only screen readers would hear |
| The countdown named "Seconds left" by `aria-label` (14b-6c) | "N seconds left" in the timer's text, the words hidden on screen where "seconds left" already shows under the number | A `timer`'s name comes from its author only, so the e2e find it by its text; four test lines read "20 seconds left" instead of "20" |
| A failed send in the toast's `status` | An `alert` beside it | Answer 3; `feel.e2e.ts` reads the failure from the `alert` |
| Plan 3: `hold` remembers `document.activeElement` | The last element focused outside the toast, from `focusin` | The same place in every case so far (Post, or the ⋯ a pick returns focus to), and it follows the player if they move before pressing Undo (review) |
| Delete and Report focus | A pending move tied to its day, dropped if the report fails or another day is shown first | The review found a failed Report left it stale, pulling focus to the heading on a later "Earlier day" |
| The column test on any page with the feed column | On the game screen | Only an `inPlace` column (the game screen's feed, Today's circle) moves into the page below 1200px; elsewhere it goes away, draft and all, which is how it's built (14b-2b-1) |

## Evidence
All on the Windows PC against the local stack, 2026-11-01 and 2026-11-02 (Pacific).

- **Red first:** `npx playwright test e2e/screen-readers.e2e.ts` failed all 7 on the unchanged code, each on what it checks:
  - no `[data-loading]` placeholders;
  - focus on `body` after Undo, and after Delete;
  - the first toast line still connected after the second;
  - no "Reactions" group;
  - no "seconds left" timer;
  - focus `null` after crossing 1200px.
- **Green:** the file gave `8 passed (1.7m)`, after the review added Report and Close.
- **The column fix, checked:** with its refocus line removed, the 1200px test failed (`Received: null`); restored, it passes.
- **The adapted e2e:** calm, controls-and-state, feel, player-screens, test-run, comments-and-undo and reactions-menu gave `46 passed` with the new file, then `6 passed` for those re-run after the test fixes.
- **The full suite:** `132 passed`, 3 failed.
  - `players.test.ts` caught a player-name clash with `reactions-menu.e2e.ts` and `alive.e2e.ts`; the new file now uses `q`-names, and `players.test.ts` passes.
  - Two failures under load: `calm.e2e.ts`'s row, and `shell.e2e.ts`'s time-up (already in ROADMAP as intermittent). Both passed alone (`9 passed`).
- **Unit tests:** `npm test` gave `Tests 504 passed (504)`, with the clash fixed.
- **Types and lint:** `tsc` and `eslint --max-warnings 0`, clean.
- **The phone test** (answer 7, DECISIONS.md 2026-11-01). The human's phone was on the home Wi-Fi, against `next dev -H 0.0.0.0` with `allowedDevOrigins: ["10.0.0.56"]`, neither committed. The human went through:
  - Loading: one "Loading";
  - the countdown's "seconds left";
  - the run, posting twice, Undo back to Post;
  - Delete to the next ⋯;
  - a failed send in airplane mode, read at once.
  - The human's word: "All as expected".
  - As expected, the live board couldn't connect from the phone: "board channel channel_error channel error: transport failure", because Supabase answers on `127.0.0.1` only.
  - Signing in over plain `http` worked: the session cookies aren't `Secure`.
  - Afterwards the server was stopped (`10.0.0.56:3000` answers nothing), `next.config.ts` restored and the launch file deleted.

## Review
- **Reviewer** (`reviewer` agent, fresh context): no fault in the main code.
  - **Every placeholder sits inside the frame's count.** It can't drift, StrictMode included.
  - **Blocking, all fixed:**
    - A failed Report left a stale focus move. It's now dropped on failure, and tied to its day.
    - Report and Close had no tests. Both now do.
    - The docs.
- **Deferred to ROADMAP "Next revision":** the rest, listed there under 14b-21.
