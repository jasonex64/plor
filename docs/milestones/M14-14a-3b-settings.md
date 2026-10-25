# M14 14a-3b — Settings, and the friends list on the Friends tab

**Status:** in progress (2026-10-25), on `m14-look-and-feel`. Built from the human's answers without a separate draft approval, and merged on green CI (human, 2026-10-25: "Merge on green CI (Recommended)").

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
   - `src/app/api/profile/settings/route.db.test.ts` and `route.test.ts`;
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

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
