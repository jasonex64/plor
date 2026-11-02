# M14 14b-18 — Headings, signed-in Today, invites and words

**Status:** approved (human, 2026-10-31: "Approve, build it", to "Build 14b-18 as drafted, with the proposed page names and name style?"), done (PR #148, merged on green CI at the human's "Merge when green", 2026-10-31). It was drafted from five rounds of guided questions (2026-10-31) on ROADMAP For M14's open items. 14b-18 is the first of two player-screen PRs (answer 13); 14b-19, controls, layout jumps, lost taps and stale state, follows once this one is merged.

## Goal
On every page a player can see where they are, a signed-in player never sees the signed-out introduction, the invite links say the right thing and still work when copying is blocked, and the words, dates and back arrows read one way.

## Who uses it / what breaks without it
- Used by: every player. The desktop heading, signed-in Today and the back arrows show on every visit. The copy fallback and the invite wording matter to anyone inviting a friend.
- Breaks without it (ROADMAP For M14; Impeccable critique of 2026-10-27; reviews of 14b-6, 14b-8b, 14b-10a, 14b-13 and 14b-16):
  - Every desktop page's heading is "Plor", so a screen reader hears "Plor" on every page and nothing names the page.
  - A signed-in player sees the introduction, "Sign in to play" included, flash on each load of `/`, and in full on the pick-username screen.
  - A blocked clipboard shows "Something went wrong: NotAllowedError…" and the player can't invite anyone.
  - Your own invite link says "A friend invited you…".
  - The streak pill is a 28px target, under the 44px every other control has.
  - Back from How to play slides the wrong way.
  - The 404 has the feed beside it.
  - The feed heading shows "2026-10-26", comments have list bullets, two reactions read "😂 1❤️ 2", and back buttons use two different arrows.

## What the human decided (2026-10-31, on the Windows PC, quoted)
Round 1:
1. When M14 is done: "Player-visible items only" ("Fix what a player can see or hear (about 20 items); tests, admin and edge cases stay in Next revision. Quickest path to 14c-2, but known gaps stay.").
2. First: "Player screens" ("The streak pill, the page headings, back buttons, the feed's raw date, the comment box's text size, the clipboard error. The most visible gain.").
3. Badge and avatars: "Keep rem" ("Badge and avatars grow with the text size. They look the same at normal size; the letters stay inside at 200%."). This closes 14b-17's open question.
4. PR size: "One group per PR" (narrowed by answer 13).

Round 2:

5. Desktop heading: "Plor, page name below" ("Keep 'Plor' big and add the page name as a smaller heading. The brand stays loudest, at the cost of two headings stacked at the top.").
6. Signed-in Today: "Nothing, straight to the game" ("Today's game card is the first thing you see. Calmest, and the flash goes with it; returning players lose nothing they need.").
7. Streak pill: "Bigger tap area, same look" ("The pill looks the same but the tappable area around it is 44px. Nothing moves visually; taps near it still count.").
8. Back from How to play: "Slide backward there" ("From How to play, Back slides the way back goes. Matches the meaning; Back's slide then depends on where you are.").

Round 3:

9. Copy blocked: "Show the link to copy" ("Show the invite link in a box, already selected, with 'Copy it from here'. The player can still invite; a little more UI.").
10. Your own invite link: "Only 'your link'" ("Drop the friend-invited line and say 'This is your invite link. Send it to a friend.' No contradiction; one short new sentence.").
11. The 404's feed column: "Hide it on the 404" ("The 404 stands alone, like the admin pages. Focused on getting back; the feed is one tap away on Today.").
12. Small fixes: all four groups, "Words and dates, Text and controls, Layout jumps, Lost taps and stale state".

Round 4:

13. Split: "Two PRs" ("First: the headings, signed-in Today, invite, copy, 404 and words. Second: controls, layout jumps and lost taps.").
14. Back arrow: "‹ chevron" ("'‹ Updraft'. Lighter, like phone apps' back; smaller to see and tap.").
15. New colours and styles (14b-19): "Screenshots, you pick" ("I show 2 or 3 candidates for each on the real screens and you choose, as with 14b-15. No colour gets invented; one more look for you before building.").
16. Streak refresh (14b-19): "At the daily reset" ("Reload the profile at midnight Pacific, when the day turns (the board already listens for this).").

Round 5:

17. The page name: "Part of the Plor heading" ("'Plor' big with 'Friends' on a smaller line, both in one heading; screen readers hear 'Plor, Friends'. The cards' headings stay as they are; a small change.").
18. Phones: "Desktop only" ("Phones keep their top bar as it is; screen readers still hear the name there.").
19. Pages without a tab of their own: "The tab they're under" ("The streak shows 'Me', How to play shows 'Updraft', a group 'Friends'; the 404 and invites show none.").
20. h3 weight: "Leave 700".

**Three examples in answer 19 don't match the shell, for the human's call.** My question's examples were wrong:
- "Updraft" isn't a tab. The game screen and How to play sit under Today (`current()` in `src/app/shell.tsx` marks Today there).
- A group sits under Groups, not Friends.
- The streak page sits under no tab.

So I propose these names (Numbers):
- "Today" on the game screen and How to play.
- "Groups" on the groups pages.
- "Me" on `/streak`, the example you approved, though no tab is highlighted there.

## Source
- **WCAG 2.2** (SOURCES.md):
  - 2.4.6 Headings and Labels: the heading names the page.
  - 2.5.5 Target Size (Enhanced): 44px, as 14b-10's answer 7 set for every control.
  - 1.3.1 Info and Relationships: one `h1` with the page's name, card headings unchanged.
- **Clipboard writeText** (MDN, SOURCES.md): `writeText` rejects with `NotAllowedError` when the page isn't allowed to write. The fallback is the link shown to copy by hand (answer 9).
- **Web Share API** (MDN, SOURCES.md): unchanged. The share sheet stays first; only the clipboard path gets the fallback.
- **Next.js view transitions** (the bundled `node_modules/next/dist/docs/`, the guide 14b-6e cites): the `BACK` and `FORWARD` transition types the shell already uses.
- **M02 2c** (`docs/milestones/M02-*.md`; the comment in `src/app/(shell)/page.tsx`): the introduction stays in the served HTML for signed-out visitors, because Google's brand verification needs the home page to explain the app.
- **DESIGN.md:**
  - Type: `h1` and `h2` at 800, card headings at 1.5rem.
  - The shell: `.sr-only-on-phones`, the top bar's wordmark standing for the `h1`.
  - The kit's field and link.
  - `day-text.ts`'s date format ("Mon 26 Oct").

## Acceptance criteria
- [x] **Desktop heading:**
  - From 768px every shell page's `h1` reads "Plor", with the page's name on a smaller line inside the same heading (answers 5, 17).
  - The name follows the tab marked current (Numbers): none on an invite (`/i/…`, `/g/…`) or the 404.
  - The heading's accessible name is "Plor, <page>".
  - Below 768px the `h1` stays visually hidden (answer 18) but still holds the name.
  - Card headings are unchanged.
- [x] **Signed-in Today:**
  - A signed-in player never sees Today's introduction: not before the profile loads, not on the pick-username screen (answer 6).
  - Signed out, the served HTML still holds the introduction (M02 2c).
  - Checked by loading `/` signed in with the network slowed, and by reading the served HTML signed out.
- [x] **Streak pill:**
  - Its tappable area is at least 44px tall in the top bar and the sidebar (answer 7; 14b-10 answer 7), and its visible pill is unchanged.
  - The larger area doesn't cover the gear, the avatar or another control (`elementFromPoint` at the area's edges).
- [x] **Back from How to play:** the clock bar's Back on How to play navigates with the `BACK` transition type. Elsewhere it keeps `FORWARD` (answer 8).
- [x] **Blocked clipboard:**
  - When `navigator.clipboard.writeText` is refused, the invite link shows in a read-only field, selected, with "Copy it from here" (answer 9), and no raw error shows.
  - This holds for every caller of `shareLink`: the invite link, a group's invite and the result's Share (one way; Numbers, proposal).
- [x] **Your own invite:** your own `/i/<code>` shows no "A friend invited you…". It reads "This is your invite link. Send it to a friend." (answer 10). A friend's link still shows the line, signed in or out.
- [x] **404:** from 1200px a signed-in player sees no friends feed column beside the 404 (answer 11).
- [x] **Words and dates (answer 12):**
  - The feed heading shows a past day as `day-text.ts` does ("Friends' comments on Mon 26 Oct").
  - Comments show no list bullets.
  - Two reactions in a summary have a space between them ("😂 1 ❤️ 2").
  - Every back button uses "‹" (answer 14): the game screen's Today, the test run's Puzzles and the detail pages' `BackTo`.
- [x] The e2e files these touch pass; Impeccable's detector finds nothing new on Today, Friends, Me, the 404 and an invite at 390×844 and 1440×900; DESIGN.md describes the heading, the pill's area and the fallback; the `reviewer` agent has reviewed the diff.

## Out of scope
- 14b-19, the second PR (answer 13):
  - the comment box and pickers at 16px;
  - disabled and pressed styles, and dark-theme pink against danger (screenshots first, answer 15);
  - the Continue flash and the 10→9 re-wrap;
  - the board row's points and Privacy's lone last words;
  - the comment draft across Start and a tab tapped mid-slide;
  - the streak at the daily reset (answer 16);
  - Me after a time-up.
- Admin, test and data items in For M14 (answer 1): they stay in Next revision.
- The h3 weight (answer 20).
- Marking a tab current on `/streak`: the name only (answer 19).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 768px | Where the page name shows | The shell's sidebar breakpoint (DESIGN.md); answer 18 |
| Page names: Today (`/`, the game screen, How to play), Friends, Groups (`/groups`, a group), Me (`/me`, `/streak`), Admin (`/admin/*`); none on `/i/…`, `/g/…`, the 404 | The name under Plor | Answer 19 and `current()` in `shell.tsx`; "Today", "Groups" and `/streak`'s "Me" are proposals for approval (above) |
| 1.5rem, weight 800, `--muted` | The page name's line | Proposal for approval: the card heading's size (`kit.module.css` `.card > h2`), muted so "Plor" stays loudest (answer 5) |
| 44px | The streak pill's tappable height | Answer 7; 14b-10 answer 7 |
| "This is your invite link. Send it to a friend." | Your own invite | Answer 10 |
| "Copy it from here" | The blocked-clipboard fallback | Answer 9 |
| All three `shareLink` callers get the fallback | One way to share | Proposal for approval: `shareLink` is the one share path (DECISIONS.md "one way") |
| 1200px | Where the feed column shows | Unchanged (`feedBeside`, DESIGN.md) |
| ‹ | Back buttons | Answer 14 |

## Plan
1. **Red first:** an e2e (`e2e/player-screens-2.e2e.ts`, name to fit the e2e folder) for each criterion. Expected: each fails on `main` as ROADMAP describes it. If a check passes on `main`, the item was already fixed, and I'll say so instead of building it.
2. **Heading:** `Shell` (`shell-page.tsx`) renders `<h1>Plor<span>, </span><span>{name}</span></h1>`, with the name from the path by the same rule as `current()`. The page name is read on the client (the Frame reads the address bar), so the name line fills in after hydration.
3. **Signed-in Today.** Hypothesis: a pre-paint script, beside `THEME_SCRIPT`, can mark `<html>` as signed in from the presence (never the value) of the Supabase auth cookie, so CSS hides `[data-signed-out]` before the first paint. Expected: no flash with the network slowed. Disproved if the cookie is `httpOnly` (`document.cookie` can't see it); then I stop and ask.
   - The pick-username screen hides the introduction the same way.
   - This reads no secret and changes no auth, roles or grants, so it isn't a security change. The reviewer checks that.
4. **Streak pill:** a 44px-tall pseudo-element on the link, centred on the pill.
5. **Back from How to play:** the ClockBar picks `BACK` there.
6. **Blocked clipboard:** `shareLink` reports a refused write to its caller, which shows the field.
7. **Your own invite:** the "A friend invited you…" line moves under the invite's client part, which leaves it out on your own link and keeps it for friends.
8. **404:** `feedBeside` is false when `lost`.
9. **Words:** the feed date through `dateText`, `list-style: none` on the comments list, the summary's gap, ‹ everywhere.
10. **Check:**
    - Run the new and touched e2e files.
    - Run the detector, and screenshot at 390 and 1440 in Paper and Night (the page name's line is a proposal, shown to the human before the PR).
    - Update DESIGN.md.
    - Run the `reviewer` agent.
    - Update ROADMAP (close the items, the row) and HANDOFF.

## Removes
- The signed-out introduction for signed-in players, and its flash.
- The raw clipboard error.
- The "A friend invited you…" line on your own link.
- The feed column on the 404.
- The "←" back arrows.
- The ISO date in the feed heading.
- `globals.css`'s `body[data-shell] [data-signed-out]` rule, which `html[data-signed-in]` replaces.
- `feel.e2e.ts`'s own slide recorder, moved to `e2e/slides.ts` for it and the new e2e.
- Not the comments' bullets: there were none (below).
- The ROADMAP For M14 items:
  - the `h1` and back buttons (the h3 half stays as decided);
  - the signed-in introduction and its flash;
  - the clipboard error;
  - your own invite link;
  - the feed column on the 404;
  - the feed date and bullets;
  - the reactions spacing;
  - the clock bar's slide;
  - the streak pill's 28px;
  - 14b-17's badge/avatar question (answer 3).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Comments show no list bullets (criterion; ROADMAP's 14b-6 item) | Nothing | Already so: the red run found `list-style-type: none` on a comment, from the kit's `.rows` (14b-8b). The item was stale |
| Two reactions have a space between them ("😂 1 ❤️ 2") | A comma read between them ("😂 1, ❤️ 1"), not shown | On screen they were already apart (each count has 8px padding); the run-together was in the text a screen reader reads, and a comma reads as two counts where a space doesn't |
| A read-only field (Plan 6) | A one-line input for a link, a textarea for the result's text and link | The first screenshot at 390px showed a narrow textarea breaking the link over two lines; it now has the comment box's layout, label above and full width (`share.module.css`) |
| Your own invite link shows no "A friend invited you…" | Hidden once the page knows the link is yours | The line is in the served HTML for signed-out friends; the owner is known only when the invite's preview loads, so the line shows on your own link until then (behind the skeleton). Deferred |
| The streak pill's visible size unchanged; ROADMAP said 28px | Unchanged, measured 34px at 390px | The audit's 28px is out of date (the pill's comment said 26px); the comment now says 34px |
| `<h1>Plor<span>, </span><span>{name}</span></h1>` (Plan 2) | The comma as text in a span of no size | A visually hidden (absolute) comma made Chrome read "Plor , Today" |

## Evidence
All on the Windows PC against the local stack, `next dev` on :3000, 2026-10-31.

- **Red first** (`npx playwright test e2e/headings-invites.e2e.ts`, before any change in `src/`): 7 failed, 1 passed.
  - The heading: `Expected: "Plor, Today"`.
  - The pick-username step: the introduction visible.
  - The pill: the ±21px probes miss.
  - Back from How to play: `nav-forward`.
  - The copy field: not found.
  - Your own invite: "Send it to a friend." not found.
  - Reactions: `"😂 1❤️ 1"`.
  - The 404 test passed only because it checked before the profile loaded. It now waits for the shell, and on the unchanged code (`git stash push -- src`) it failed: `Expected: 0, Received: 1` (the feed beside the 404). The pill test, re-run then, failed the same way.
  - Comments' bullets: `list-style-type: none` already on `main` (Source diff).
- **Green:** `npx playwright test e2e/headings-invites.e2e.ts` gave `8 passed (1.1m)`, after the review's fixes, on a clean stack.
- **The e2e files these touch:**
  - The command: `npx playwright test` over account, calm, feel, groups, headings-invites, live-board, look, me, not-found, offbeat, player-screens, shell, streak, text-size, themes, reactions-menu and friends.
  - Result: `74 passed`, 1 failed. `shell.e2e.ts`'s "every tab shows the focus ring from the keyboard" hit its 30 s timeout. Alone, `--repeat-each=2`, it gave `2 passed (27.8s)` (deferred to ROADMAP).
  - After the copy field's layout change: `headings-invites` with `feel`, `15 passed (2.6m)`.
- **Unit and database tests:**
  - `npm test`: `Test Files 49 passed (49)`, `Tests 494 passed (494)`.
  - `npm run test:db`: `Test Files 44 passed (44)`, `Tests 298 passed (298)`.
  - That was after deleting two fixture days that cut-short e2e runs had left on 2026-10-30 and 2026-10-31. A stray parallel `vitest run` of the database tests had broken them, and the reviewer's runs met them too; both were fixture days with no runs (ROADMAP's known recovery).
- **Types and lint:** `npx tsc --noEmit -p .` and `npx eslint src/app e2e --quiet`, both clean.
- **Impeccable's detector** (`impeccable detect --cdp 9334 --target localhost:3000 --json`, signed in after a run) found 0 findings on each of `/`, `/friends`, `/me`, `/streak`, `/nope` and the player's own `/i/<code>`, at 390×844 and at 1440×900.
- **Screenshots:**
  - At 1440: Friends, Me and Today, in Paper and in Night (Follow device, dark).
  - At 390: Friends with the copy field.
  - The page's name reads as a muted second line under "Plor" in both themes.
  - The first copy field was a narrow textarea that broke the link (Source diff); the second is a full-width field.
- **Signed-in mark:** the reviewer read the served HTML and found `/(?:^|; )sb-[^=]+-auth-token(?:\.\d+)?=/`, so `String.raw` keeps the backslashes. `@supabase/ssr`'s cookies are `httpOnly: false` (`node_modules/@supabase/ssr/dist/module/utils/constants.js:4`), as the Plan's hypothesis needed.

## Review
- **Reviewer** (`reviewer` agent, fresh context, 2026-10-31):
  - **Code:** no blocking defect.
  - **Blocking, all fixed here:** this Evidence, the ROADMAP row and HANDOFF were missing.
  - **Security:** it agreed the sign-in script isn't a security change. It tests `document.cookie` by name only, stores nothing, and sets only `html[data-signed-in]`.
- **Non-blocking:** recorded in ROADMAP For M14, then fixed here, since each was this sub-ticket's own text or test:
  - the stale comment in `(shell)/page.tsx`;
  - DESIGN.md's `shell.tsx:182-201` (now `:182-199`);
  - the pill test, which now probes the area's edges for any other control;
  - the reactions regex, which now expects the comma.
- **CI on PR #148:** both e2e jobs failed `alive.e2e.ts:208`, `expect(laugh).toBeVisible()`, element not found. The hidden ", " sat inside the second reaction's span, so its text no longer began "😂 1" and its first inner span was the comma, not the emoji. My local runs had left `alive.e2e.ts` out. Fixed: the comma sits between the reaction spans (`reactions.tsx`). Then all seven e2e files that touch reactions (alive, calm, feel, headings-invites, live-board, player-screens, reactions-menu) gave `40 passed (6.7m)`.
- **Deferred to ROADMAP "Next revision":**
  - the own-invite line before the preview loads;
  - the `shell.e2e.ts` focus-ring timeout under load.
