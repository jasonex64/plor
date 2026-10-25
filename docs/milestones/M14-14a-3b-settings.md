# M14 14a-3b — Settings, and the friends list on the Friends tab

**Status:** in review (2026-10-25), in PR #85 from `m14-look-and-feel`, to be merged on green CI (human, 2026-10-25: "Merge on green CI (Recommended)"). Built from the human's answers without a separate draft approval.

## Goal
A gear opens the settings sheet (on phones) or side panel (from 768px): the account's controls, moved off Me, and the two switches, Skip the game screen (L39) and Numbers on the calendar (L46), saved on the account. With it, three answers that change 14a-3a's merged work: the friends list moves to the Friends tab, the rarest answers leave out caught ones, and the calendar's shades reach 3:1.

## Who uses it / what breaks without it
- **Used by:** every player who changes their name, signs out, deletes their account, manages friends, or wants either switch; and 14b-1, whose theme picker goes in this sheet.
- **Breaks without it:**
  - Me still ends with the account section, while L45 made Me "mainly show your individual stats" and L44 put the account in settings.
  - L39's and L46's switches don't exist, so Play always stops at the game screen and the calendar has no numbers.
  - The friends list sits on Me, where the human doesn't want it.
  - Paper's lightest shade is about 1.4:1 on the card, under WCAG 2.2 1.4.11's 3:1, and the calendar's text alternative says only a count.
  - A caught answer can show as a "rarest answer".
  - 14b-1's theme picker has no sheet to sit in.

## Why one ticket
The split (14a-3a's ticket) left 14a-3b as the sheet. Answers 2 to 4 below each change a section the sheet already touches: the friends list leaves Me with the account section, and the calendar gets its numbers here. A separate sub-ticket would edit the same files in the same order, so they're one PR (CLAUDE.md: one PR per sub-ticket).

## What the human decided
Asked before (HANDOFF.md, M14, "Already decided for what's next"):
- **L44:** "we should have a settings tab that like pops out when u click it instead of some of the other stuff": a "Gear in the top bar (Recommended)" (and at the bottom of the desktop sidebar), opening a "Sheet on phone, side panel on desktop (Recommended)". It holds the theme (14b-1), the skip setting, username and display name, sign out and delete account.
- **L39:** "allow a toggle in settings": go straight to question 1 from Play. Off by default (L39, Claude's default from L25).
- **L46:** "the colormap of days surivved should also show numbers if u want (setting)": a "Numbers on the calendar" switch; each number passes 4.5:1 on its shade.
- **Storage and its security change:** the two settings are columns on the account; `plor_app` gets UPDATE on those columns only, and the route limits it to the player's own row, as for the display name. "Approve it (Recommended)" (human, 2026-10-25).
- **Round 7:** the sheet and side panel as drawn ("Round 7 looks good", human, 2026-10-24): "Closes with the ✕, a tap on the dimmed page, or Escape. Focus stays inside while it's open."

The human's answers of 2026-10-25, in chat on the Mac:
1. **The dialog's source:** "Add MDN <dialog> (Recommended)". Added to SOURCES.md.
2. **Friends:** "friends list should be in the friends tab", and the invite link with Reset goes with it: "Yes, with the list (Recommended)". Me keeps only the stats. The moved list gets its avatar slots (ROADMAP, For M14: "Me's friends list has no avatar slots").
3. **Rarest answers:** "Leave caught out (Recommended)": only answers that survived count. The tie-break, the later day then the earlier question: "Keep it (Recommended)".
4. **Calendar contrast:** "Meet 3:1 (Recommended)": every played day's shade reaches 3:1 against the surface (WCAG 2.2 1.4.11), and the text alternative names the days.
5. **Merging:** "Merge on green CI (Recommended)", one PR open at a time.
6. **Migrations:** "After today's merges (Recommended)": the human runs `npx supabase db push` once today's batch is on main.

This ticket's guided questions (human, 2026-10-25):
- **The shades:** "Use these (Recommended)": the accent at rising strength, from the lightest that reaches 3:1 on the card, in even steps to the full accent (Numbers).
- **The Friends tab's order:** "Below the boards (Recommended)": the live board, the leaderboard, then Your friends with the invite link. The board's own invite link (no Reset) leaves this tab, so the link shows once.
- **Skip and the timer:** "Add the 20 seconds (Recommended)": with Skip on, the banner's line says "20 seconds each" above Play, so the limit is known before it starts (WCAG 2.2 2.2.1).
- **Change and Set:** "Open the form in place (Recommended)": tapping Change or Set shows the form (box, Save, Cancel) in that row.

## Source
- **MDN `<dialog>`** (SOURCES.md): `showModal()` (the rest of the page inert, `aria-modal="true"`), Esc and its `cancel` event, `close()`, `autofocus` on the close button, `::backdrop`, no `tabindex` on the dialog. `closedby="any"` isn't in Safari, so the tap on the dimmed page is a click handler.
- **WCAG 2.2** (SOURCES.md):
  - 1.4.11 (non-text contrast): "a contrast ratio of at least 3:1 against adjacent color(s)" for "parts of graphics required to understand the content", the shades; and the switches' outlines;
  - 1.4.3: the numbers on the shades and the danger text, 4.5:1;
  - 1.1.1 and 1.4.1: the calendar's text alternative, so the shade isn't the only way to tell;
  - 2.2.1: the time limit stated before it runs;
  - 4.1.2: the switches' role and state.
- **Round 7's boards** 1 to 3 ("the Me tab and settings"), the approved mockup.
- **Next.js 16.4.2 bundled docs** (SOURCES.md): route handlers, CSS Modules.
- **Supabase CLI** (SOURCES.md): `supabase migration new`; **PostgreSQL 17** column grants.
- DECISIONS.md: Row-level security in `private` (the existing `plor_app` update policy covers the new columns); Database migrations; Styling.

## Acceptance criteria
1. **The gear opens the sheet.**
   - Below 768px, a top bar holds the wordmark and a Settings button (the gear, `aria-haspopup="dialog"`); from 768px, a Settings button sits at the bottom of the sidebar.
   - Either opens a modal `<dialog>` named "Settings" with `showModal()`: the page behind it is inert, and focus starts on "Close settings".
   - It closes with Close, with Escape, and with a click on the dimmed page, and not with a click inside it.
   - Below 768px it's a sheet at the bottom; from 768px a 440px panel at the right.

   Checked in `e2e/settings.e2e.ts` at 360×800 and 1440×900.
2. **What's in it.**
   - Username, with Change opening the username form in place (once every 30 days, as now);
   - Display name, "Not set" with Set, or the name with Change, opening the form in place (Save, Clear, Cancel);
   - the two switches;
   - Privacy policy;
   - Sign out;
   - Delete account, whose "Delete…" opens the confirm form (type your username) in place.

   Me holds only the stats, and on phones the Admin link. Checked in `e2e/settings.e2e.ts`, with `e2e/account.e2e.ts`'s cases moved into the sheet, not weakened.
3. **The settings are saved on the account.**
   - A migration adds `skip_game_screen` and `calendar_numbers` to `private.profile`, both `not null default false`.
   - `plor_app` gets UPDATE on those two columns only (`supabase/tests/plor_app_role.test.sql`).
   - `POST /api/profile/settings` sets either or both for the signed-in player and no one else, and refuses anything that isn't a boolean or names another setting (400 `settings_invalid`).
   - `GET /api/profile` returns them, with the display name and when the username may change.

   Checked by `src/app/api/profile/settings/route.db.test.ts` (as the signed-in player, and that another player's row is untouched) and its unit test for a signed-out request.
4. **Skip the game screen.** Off: Play opens the game screen. On: the banner's line ends "· 20 seconds each", and Play starts the run and opens the game screen with question 1 in play. Checked in `e2e/settings.e2e.ts`.
5. **Numbers on the calendar.** On: each played day shows its questions survived. Off: no numbers. Checked in `e2e/settings.e2e.ts`.
6. **The calendar's contrast and text alternative.**
   - Every shade is at least 3:1 against the surface, and the number colour on each is at least 4.5:1, in Paper and Night.
   - The text alternative names each played day and how many questions were survived on it.

   Checked by `src/app/colors.test.ts` and `e2e/me.e2e.ts`.
7. **Friends on the Friends tab.**
   - Below the live board and the leaderboard, "Your friends": each friend with an avatar slot and Remove (which asks first), then the invite link with Reset.
   - The board on this tab has no invite link of its own; Today's board (from 768px) keeps its link, without Reset.

   Checked in `e2e/account.e2e.ts`, moved to the Friends tab.
8. **The rarest answers leave out caught ones.** A caught answer is never listed, whatever its share; the tie-break stays. Checked by `src/app/api/me/route.db.test.ts`, with a caught answer rarer than any survived one.
9. **Danger colour.** Round 7's danger colour passes 4.5:1 on the background and the cards, in Paper and Night. Checked by `src/app/colors.test.ts`.
10. `npm run lint`, `npx tsc --noEmit -p .`, `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run build` and CI pass.

## Out of scope
- The theme picker in the sheet (14b-1).
- The top bar's streak, and the sidebar's avatar and streak (14b-2 and the avatars ticket, L37).
- The rest of the reviewers' For M14 items, other than the four this ticket closes.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Both settings off by default | Skip, Numbers | L39 (Claude's default from L25, in the ticket); L46's "if u want"; round 7 draws both off |
| Shades, the accent's alpha in hex: Paper a5, c3, e1, ff; Night 8a, b1, d8, ff | The calendar | The human, 2026-10-25: "Use these (Recommended)". Computed: the lowest alpha over the surface reaching 3:1 (Paper 3.03:1, Night 3.03:1), then even steps to ff |
| Numbers on the shades: Paper's text on shades 1–2 and on-accent on 3–4; Night's text on shade 1 and on-accent on 2–4 | The calendar | L46 (4.5:1 on each), computed with the shades above; the lowest is 4.54:1 (Night, shade 2) |
| Danger: Paper #B4232F, Night #FF8A8A | Delete account | Round 7's palettes (`danger`) |
| Sheet: top corners 22px; padding 10px 16px 20px; 12px gaps; the handle 40×5px, 3px corners, in the outline colour; shadow 0 -8px 24px rgba(0,0,0,0.18) | The sheet | Round 7 (`.sheet`, `.handle`) |
| Panel: 440px wide, 24px padding, 14px gaps, a 1px line on its left; shadow -12px 0 32px rgba(0,0,0,0.16) | The side panel | Round 7 (`.panel`) |
| Dimmed page: rgba(10, 10, 10, 0.45) | `::backdrop` | Round 7 (`.scrim`) |
| Headings: 24px (sheet), 26px (panel) | Settings | Round 7 |
| Close: 44px round, 1.5px outline, an 18px ✕ at stroke 2.4 | Close settings | Round 7 (`.x`) |
| Rows: 10px padding, a 1px line above, 15px text, 13px muted line under a switch's label | The fields and switches | Round 7 (`.field`, the switch labels) |
| Switch: 52×30px, 15px corners, 1.5px outline; a 21px knob 3px in | The two switches | Round 7 (`.switch`) |
| Secondary button: 48px tall, 12px corners, 1.5px outline, 16px bold; danger box 12px padding and corners, a 1.5px danger outline, its button 44px tall with 12px side padding | Sign out, Delete account | Round 7 (`.secondary`, `.danger`) |
| Top bar: 56px tall, padding 0 12px 0 16px, a 1px line under it, the wordmark 24px; the gear 44px round, its icon 22px at stroke 2 | The phone's top bar | Round 7 (`.top`, `.word`, `.gear`) |
| Sidebar's Settings: the sidebar tabs' sizes, 46px tall, 12px corners, 16px, the 48px icon pill | The desktop gear | 14a-1's sidebar tabs (its Numbers), where round 7's `.nav` draws it among them |
| The dev indicator top-left | Development only | `next.config.ts` `devIndicators`; top-right, 14a-1's spot, now holds the gear |
| Numbers on the calendar: 13px bold | The calendar | Round 7 (`.cal .d`) |
| 30 days between username changes | Change | `USERNAME_CHANGE_DAYS`, M12 A2 (unchanged) |

## Plan
1. Tests first, each seen failing:
   - `src/app/api/profile/settings/route.db.test.ts`, and the signed-out case in `src/app/api/profile/route.test.ts` with the other profile routes';
   - the caught answer in `src/app/api/me/route.db.test.ts`;
   - the shades, their numbers and the danger colour in `src/app/colors.test.ts`;
   - `e2e/settings.e2e.ts`, and the moved cases in `e2e/account.e2e.ts`, `e2e/me.e2e.ts` and `e2e/shell.e2e.ts`.
2. The migration (`npx supabase migration new settings`), with the grant; `plor_app_role.test.sql`.
3. `POST /api/profile/settings`; the settings, display name and username date on `GET /api/profile`; `GET /api/account` goes.
4. The sheet (`src/app/settings.tsx`, `settings.module.css`) as a `<dialog>`, opened from the shell's gear; the account's forms move into it from `account.tsx`.
5. The friends list to the Friends tab, with avatar slots; the board's invite link becomes optional.
6. Skip on Today's banner; Numbers and the new text alternative on Me's calendar; the new shades.
7. The rarest answers: `not matched`.
8. DECISIONS.md Log: the security change. Reviewer, evidence, PR.

**Hypothesis for step 4:** a click on `::backdrop` reaches the `<dialog>` element itself as the event's target, so a handler that closes on `event.target === dialog` closes on the dimmed page and not inside the sheet, as long as the sheet's content fills the dialog with no padding of its own. Not on MDN's page, so *unverified* until the e2e runs. What would disprove it: in Chromium, a click on the dimmed page not closing the dialog, or a click in the sheet's padding closing it.

## Removes
- Me's "Your account" section and `src/app/account.tsx`: its forms move into the sheet, its friends list to the Friends tab.
- `GET /api/account` (`src/app/api/account/route.ts`, its unit test): the sheet reads the profile `Home` already loads from `GET /api/profile`, and Me shows the points from `GET /api/me`. Its db test's points case moves to `src/game/all-time-points.db.test.ts`, checking `allTimePoints` itself at the same numbers; the tests that read the account through it read `GET /api/profile`. `POST /api/account/delete` stays.
- The board's invite link on the Friends tab (the list's link, with Reset, replaces it there).
- Caught answers from the rarest answers.
- Paper's and Night's old shades (33, 66, aa, ff and 33, 80, cc, ff) and the calendar's count-only text alternative.
- `HowToPlay`'s own start-and-go code: the banner's Play and Start climbing share one.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| MDN: `autofocus` on the close button when nothing needs more immediate interaction | No `autofocus`: Close is the dialog's first focusable element, where `showModal()` puts focus by default (MDN, Accessibility) | Same result, and React doesn't write `autofocus` to the DOM (it focuses on mount, when the dialog is still closed) |
| MDN: `closedby="any"` for light dismiss | A click handler that closes when the click's target is the dialog itself | `closedby` isn't in Safari or Safari on iOS (MDN's compatibility table); one way for every browser |
| Round 7 draws Change and Set as links | Buttons styled as links, 44px tall, with the field's name for screen readers ("Change username") | They open a form in place, not a page; WCAG 2.2 2.5.8 |
| Round 7 draws the switches off only | On: the track in the accent, the knob at the right in the on-accent colour | The on state isn't drawn; it mirrors the off one with the slots the buttons use |
| Round 7's switches are `role="switch"` spans | `<input type="checkbox" role="switch">` inside the row's label | A native control: the label's text names it, Space flips it, and the state is the checkbox's (WCAG 2.2 4.1.2) |
| Round 7's phone sheet has no Privacy policy link; the panel has one | Both have it | One sheet's markup for both widths; the page footer still has it too |
| Round 7's sidebar Settings: 12px gap and side padding, 600 weight | The sidebar tabs' own sizes (14a-1): the 48px icon pill, 8px gap, 6px padding, bold | It lines up with the tabs above it; the shell loads DM Sans at 400 and 700 only |
| Round 7's desktop gear is a sun-like icon | The phone's gear, in both places | One icon for one action |
| Round 7's top bar sits above the page's content | A fixed bar, 56px, with the page's own "Plor" heading hidden on phones but read | The bar is rendered beside `<main>` (as the tab bar is, 14a-1), so it's fixed; one wordmark is shown, and the page keeps its `h1` |
| — | The top bar's gear comes after the page's content in tab order | It's rendered into `<body>` after `<main>`, as the tab bar is (14a-1) |
| Round 7: "Delete…" with "You'll be asked to confirm" | "Delete…" opens M12 12c's typed-username form in the box, with Cancel | The confirm M12 A4 built, unchanged |
| The privacy page: "delete your account yourself on your account page" | "in Settings (the gear)" | It must say what the app does (M02 2c); Delete account moved |
| 14a-3a: the calendar's legend "Fewer … More survived" | Unchanged, now in the new shades | — |

## Evidence
Run on the Mac (`/Users/jason/code/plor/.claude/worktrees/m14-settings-900486`) against the shared local stack, with the M13 session's OK, 2026-10-25.
- **Tests seen failing first:**
  - `npx vitest run src/app/api/profile/route.test.ts` with the signed-out settings case and no route: `Test Files  1 failed (1)`, the import missing. With the route: `Tests  8 passed (8)`.
  - `npx vitest run src/app/api/me/route.db.test.ts --no-file-parallelism` with T-1's caught answer at 1 of 6 and the old query: `Tests  1 failed | 6 passed (7)`, the rarest list starting `"name": "apple"`, `"share": 0.16666666666666666`. With `and not matched`: `Tests  7 passed (7)`.
  - `npx vitest run src/app/colors.test.ts` with the new checks and the old slots: `declares every slot`, `danger on bg …` and `shade 1 … shade 4 …` failed in both themes. With the new slots: `Tests  42 passed (42)`.
- **Criterion 3:** `npx supabase migration up` → `{"applied":[".../20261025200806_settings.sql"],"message":"Migrations applied"}`; `npx supabase test db` → `Files=21, Tests=345`, `Result: PASS` (the role test lists the two new column grants). `npx vitest run src/app/api/profile/settings/route.db.test.ts --no-file-parallelism` → `Tests  8 passed (8)`: off for a new account, one then the other, only the signed-in player's row, and five refused bodies. `src/lib/profile.db.test.ts` → `Tests  13 passed (13)`, with `setSettings` run as `plor_app`, so its grant and the existing update policy cover the columns.
- **Criteria 1, 4 and 5:** `npx playwright test e2e/settings.e2e.ts` → `4 passed`:
  - at 360×800 the top bar is `{ x: 0, y: 0, width: 360, height: 56 }`, the dialog is `:modal`, focus starts on "Close settings", 30 Tabs never leave it, a point on the page hits the `DIALOG`, and Escape, Close and the dimmed page each close it;
  - at 1440×900 the panel is `{ x: 1000, y: 0, width: 440, height: 900 }`;
  - Skip: the line ends "· 20 seconds each" after a reload, and Play opens `/offbeat` with "Your answer" showing;
  - Numbers: today's cell is empty, then "0" in `rgb(26, 26, 24)`, still after a reload, then empty again.
- **The hypothesis for step 4 held:** a click in the sheet's top padding (mid-width) left it open, and one on the dimmed page closed it. As a check, the handler was replaced by a no-op: the phone test failed at `await expect(sheet).toBeHidden()` after the click on the dimmed page. Restored, it passed. The first run had clicked the sheet's rounded corner, which is outside the sheet and closed it, as it should; the test now clicks mid-width.
- **Seen on the way:** the gear's first clicks timed out under Next.js's dev indicator (`<nextjs-portal> … intercepts pointer events`), which 14a-1 had moved to the top right; `next.config.ts` now puts it top-left, on the wordmark.
- **Criteria 2, 6 and 7:** `e2e/account.e2e.ts` → `3 passed` (the sheet's username, display name and delete; the Friends tab's list, its link with Reset, the slot `data-initial="I"`, and Today's board at 1440px with the same link and no Reset); `e2e/me.e2e.ts` → `3 passed` (the text alternative "…: 1 of the N days so far: 25 October, 0 of 7 survived", the shade `rgba(36, 87, 214, 0.647)`); `e2e/shell.e2e.ts` → `7 passed` (Friends' sections now end with "Your friends", Me's are the stats alone, and the sidebar's Settings shows the focus ring).
- **Criterion 8:** the rarest-answers db case above.
- **Criterion 10:**
  - `npx tsc --noEmit -p .`: no output. `npm run lint`: no problems. `npm test`: `Test Files  39 passed (39)`, `Tests  269 passed (269)`.
  - `npm run test:db`: the first full run had `Tests  2 failed | 255 passed (257)`, both in `src/lib/profile.db.test.ts`, which expected the profile without `settings`. Updated, with the `plor_app` settings case added: `Test Files  40 passed (40)`, `Tests  258 passed (258)`.
  - `npm run test:e2e`: `36 passed`, `1 failed`: settings' phone test timed out in sign-in (`players.ts:40`, waiting for "Username"), before any of its own steps. It passed alone, and 21 of 21 in `npx playwright test e2e/settings.e2e.ts e2e/account.e2e.ts --repeat-each=3`, so it was first taken for a flake; CI's e2e job failed the same way on PR #85. The cause: its player was named "ga", which `groups.e2e.ts` also uses, and every file in a run shares `RUN`, so in a full run it signed into groups' player, who already has a username. Renamed "set", and the file now signs in one player for its four tests (serial) instead of four. Before the rename, a full run failed the same test again (`1 failed`, `33 passed`, the other three skipped as serial); after it, `npm run test:e2e` → `37 passed (1.1m)`.
  - `npm run build`: compiled, with `ƒ /api/profile/settings` and `○ /me`.
  - CI: PR #85.

## Review
The `reviewer` agent, in a fresh context, on `origin/main..b567957`. It read the migration, the grant, both routes, the dialog, the shell, the rarest-answers change and the shades, and found no blocking bug in the code; it re-ran tsc, lint and `npm test` (269), and, by the brief, no db or e2e run, which the Evidence above covers.
- Blocking findings and how each was fixed:
  - **The handoff was stale** (questions 1 and 2 answered, "M14 added none" migrations). Rewritten in this PR, with the migration and the human's `db push`.
  - **The privacy page:** its date didn't change with its text, and "Your account" didn't list the two settings. Both fixed (2026-10-25).
  - **Evidence, Review and Status were empty.** Filled in above; the Status and the ROADMAP row say "in review".
- Deferred to ROADMAP "Next revision" (For M14):
  - the backdrop close also fires for a drag that starts inside and ends on the dimmed page, and for a click on the panel's 1px border;
  - the forms' open state and drafts survive closing the sheet;
  - `--on-shade-*` repeat the text and on-accent hex values;
  - `onSettings` spreads the `me` captured at render;
  - the phone gear has no focus-ring check;
  - `account.e2e.ts`'s 1440px context isn't closed;
  - three comment lines past the wrapping width.
