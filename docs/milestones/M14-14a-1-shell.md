# M14 14a-1 — The shell: colour slots, fonts and navigation

**Status:** in review: built, reviewed (blocking findings fixed), evidence below; PR #77, waiting for green CI and the human. Approved by the human with the split (2026-10-24: "I approve the split and 14a-1 as drafted, and OK adding the Next.js CSS, fonts and layouts pages to SOURCES.md. Build 14a-1.").

## Goal
Every page sits in one shell: the colour slots for Paper and Night, the three fonts, and navigation to four tabs (a bottom tab bar on phones, a sidebar on wider screens), with today's sections moved onto their tabs and not yet restyled.

## Who uses it / what breaks without it
- **Used by:** every player, on every page; and 14a-2, 14a-3, 14b-1 and 14b-2, which all draw inside this shell and its colour slots.
- **Breaks without it:**
  - Today, everything a player has is one long page (`SignedIn` in `src/app/home.tsx`: game, feed, live board, leaderboard, groups, account link) with no navigation, so the tabs the human chose (L17) don't exist.
  - The screens of 14a-2 and 14a-3 have no colour slots or fonts to use, so each would invent its own.

## The split (approved by the human, 2026-10-24)
One PR per sub-ticket, in this order, from `m14-look-and-feel`:
| Sub-ticket | What it holds | Needs from the human |
|---|---|---|
| **14a-1** (this file) | Colour slots (Paper and Night, following the device), fonts, the tab bar and sidebar, a page per tab with today's sections moved onto it, CSS Modules recorded in DECISIONS.md | This ticket's approval |
| **14a-2** | The bar back to a question left in play, with its seconds left (L18; the human, 2026-10-25: "Yes, put L18's clock … in 14a-2"); Today (game banners, side by side on desktop and swiped on phone, L22, L38), Offbeat's game screen (L25) with its rules line, stats (L35) and yesterday's answers (L34), the locked feed showing who commented (L40), the one leaderboard card (L41), the right column from 1200px (L42) | Approval of the security change for L34 (closed days' host answers to every signed-in player) |
| **14a-3** | Me (L45: totals, calendar with its numbers setting L46, a card per game, rarest answers), the settings sheet and side panel (L44), the skip setting (L39), How to play (L29), the empty states (L31), the avatar slots (L37) | A security change: players update their own settings columns (a migration and a grant) |
| **14b-1** | Themes: the five presets plus Follow the device (L20, L21, L47), saved on the account, loaded without a flash | A security change (the theme column), and each preset's full colour set |
| **14b-2** | The sprout streak (L26), the admin pages (L19), and the polish from the design reviews | — |
| **14c** | The game's own world: the pixel art, the result screen (L30), the Wind, motion | Its own guided questions (L1, L2, L6, L8, L12, L14, L15) |

## Source
- **Next.js 16.4.2, the bundled docs** (SOURCES.md, Next.js; AGENTS.md says to read these before writing Next.js code):
  - `01-app/01-getting-started/11-css.md`: CSS Modules ("locally scope CSS by generating unique class names"), Global CSS ("for *truly* global CSS"), and "Ordering and Merging" ("Import global styles … in the root", "check the build (`next build`) to verify the final CSS order").
  - `01-app/01-getting-started/13-fonts.md` and `03-api-reference/02-components/font.md`: `next/font/google` self-hosts Google fonts ("no requests are sent to Google by the browser"), `weight`, `subsets`, `display` (default `swap`) and the `variable` option for CSS variables.
  - `01-app/01-getting-started/03-layouts-and-pages.md` and `03-api-reference/04-functions/use-pathname.md`: the root layout, and `usePathname` for the active tab.
  - These pages were added to SOURCES.md's Next.js row with the human's OK (2026-10-24).
- **WCAG 2.2** (SOURCES.md): 1.4.3 (text 4.5:1), 1.4.11 (control outlines 3:1), 1.4.10 (reflow at 320 CSS px), 2.4.7 (focus visible), 2.5.8 (target size), 4.1.2 (the active tab exposed as `aria-current="page"`).
- **The M14 ticket's decisions**, quoted there: L3–L5, L9, L10, L16–L19, L23, L33, L42, L45, L47, and the approved outline colours.

## Acceptance criteria
1. **Tabs on phones.** At 360×800, every signed-in page shows a bottom tab bar with four links, Today, Friends, Groups and Me, and no sidebar. Each link opens its page (`/`, `/friends`, `/groups`, `/me`), and only the current one has `aria-current="page"`. Checked by a new `e2e/shell.e2e.ts`.
2. **Sidebar from 768px.** At 768×1024 and 1440×900, the same four links are in a left sidebar, with no tab bar. An Admin link shows only for an admin: in the sidebar, and on phones on the Me tab. This replaces M15 15c (human, 2026-10-24: "14a-1 does it, close 15c (Recommended)"). Checked in `e2e/shell.e2e.ts`.
3. **Reflow.** At 320px wide, no tab page scrolls sideways: `document.documentElement.scrollWidth <= innerWidth` on each. Checked in `e2e/shell.e2e.ts`.
4. **The sections on their tabs.**
   - `/`: the Offbeat card with Yesterday, and the feed.
   - `/friends`: the live board and the friends leaderboard.
   - `/groups`: the groups list and Create.
   - `/me`: the account page as it is today (username, display name, all-time points, sign out, delete account).
   - `/account` is gone (404). The existing e2e suites are moved to these pages with the same assertions, not weakened, and `npm run test:e2e` passes.
5. **During a run** (L18), a player can open another tab and come back to the question in play, and it's still in play if time remains. Checked in `e2e/shell.e2e.ts`.
6. **Paper and Night follow the device.** With Playwright's `colorScheme: 'light'` the page uses Paper's background (#FAFAF8). With `'dark'` it uses Night's (#121212). Checked in `e2e/shell.e2e.ts`.
7. **Contrast is tested.** A unit test reads the colour slots from `src/app/globals.css` and checks every pairing the screens use, in Paper and Night:
   - text, muted text and accent on the background and on cards, at 4.5:1 or more;
   - the button text on the accent, at 4.5:1 or more;
   - the control outline against the background and cards, at 3:1 or more.

   `npm test` passes.
8. **Fonts are self-hosted.** Baloo 2 and DM Sans load through `next/font/google`, and no page requests `fonts.googleapis.com` or `fonts.gstatic.com`. Checked in `e2e/shell.e2e.ts` from the page's requests.
9. **Focus is visible.** Every link and button in the tab bar and sidebar shows the focus ring (a 3px outline in the accent, offset 3px) when reached by keyboard. Checked in `e2e/shell.e2e.ts` by tabbing and reading the computed outline.
10. **One way to style.** DECISIONS.md has a Styling row: CSS Modules for components, CSS variables for the colour slots and fonts, and `globals.css` only for the slots, fonts and base element styles. `npm run lint`, `npx tsc --noEmit -p .`, `npm run build` and CI pass.

## Out of scope
- Restyling the sections themselves: they move onto their tabs as they are, and 14a-2 and 14a-3 lay them out.
- The settings gear and sheet, the streak in the top bar, avatars, and the right column. These come in 14a-2, 14a-3, 14b-2 and the avatars ticket (L37).
- Themes beyond Paper and Night (14b-1).
- The bar back to a question left in play, with its seconds left (L18, "Keep it, show the clock"): in 14a-2, which lays out Today and the game screen (the human, 2026-10-25: "Yes, put L18's clock (the bar back to a question left in play, with its seconds left) in 14a-2."). Until then a player who leaves mid-question can time out unwarned, as before 14a-1 on any page.
- The sign-in and pick-a-username screens: they keep their current content. M02 2c's intro text stays in the served HTML for signed-out visitors, which Google's brand check needs.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 768px: the tab bar below it, the sidebar from it | Navigation | L42 (Claude's pick at the human's request, 2026-10-24) |
| 360px design width; 320px reflow | Layout | L9 (human); WCAG 2.2 1.4.10 |
| Paper: bg #FAFAF8, surface #FFFFFF, text #1A1A18, muted #5F5F5A, line #E2E2DC, outline #8A8A84, accent #2457D6, on-accent #FFFFFF. Night: bg #121212, surface #1C1C1C, text #EDEDEA, muted #A3A39D, line #3A3A37, outline #6E6E6A, accent #7EA6FF, on-accent #121212 | Colour slots | L21 (presets), the mockups the human approved (2026-10-24, "Round 7 looks good"); outline colours approved by the human, 2026-10-24 |
| 4.5:1 text, 3:1 outlines | The contrast test | WCAG 2.2 1.4.3, 1.4.11 |
| Baloo 2 800; DM Sans 400 and 700 | Fonts | L4 (human); the weights the approved mockups use. Young Serif (400) comes with 14a-2, its first user |
| Tab bar 64px tall; sidebar 248px wide; targets 44px or more | Navigation | The approved mockups; WCAG 2.2 2.5.8 sets 24px as the minimum |
| Focus ring: 3px accent outline, 3px offset | Focus | The approved mockups (round 5) |
| The soft pill behind the current tab: the accent at alpha 1A (Paper) and 26 (Night) | The current tab | The approved mockups (rounds 2 to 7); its text and icon contrast is tested (criterion 7) |
| The shell's sizes: tab labels 12px, the wordmark 30px, the icon pill 48×28px with a 14px radius, sidebar rows 46px tall, sidebar padding 28px by 16px with 20px gaps; controls' 1.5px outline, 10px (inputs) and 12px (buttons) radii and their padding | The tab bar, the sidebar, inputs and buttons | The approved mockups (rounds 5 to 7, the human: "Round 7 looks good", 2026-10-24) |

## Plan
1. Record the Styling row in DECISIONS.md. Rewrite `globals.css` as the colour slots (Paper by default, Night under `prefers-color-scheme: dark`), the font variables and the base element styles. Its old phone-only rules go.
2. Load Baloo 2 and DM Sans with `next/font/google` in `src/app/layout.tsx`, as CSS variables.
3. Add the shell: a client component that reads `usePathname` for the active tab, rendered by `Home` once the player is signed in with a username (the root layout can't know who's signed in: pages learn it on the client), with `shell.module.css` for the tab bar (below 768px) and the sidebar. `GET /api/profile` also says whether the player is an admin, for the sidebar's Admin link; the admin routes still check on every request.
4. Move the sections: `/friends`, `/groups` and `/me` pages through `Home`'s views, as `/account` does today. `/account` moves to `/me`. `SignedIn` keeps the game card and the feed.
5. Write `e2e/shell.e2e.ts` and the contrast unit test, and move the existing e2e suites to the new pages.
6. **Hypothesis for step 5:** the moved suites pass unchanged except for their `goto` paths and the region they start from, because the sections keep their names and contents. What would disprove it: an assertion that depends on two sections sharing a page, such as `groups.e2e.ts` reading the Groups region and the Offbeat card from one `/` visit. That is a real change of behaviour, so the test is changed to visit both pages and the change is noted in Evidence. It isn't weakened.

## Removes
- `src/app/account/` (the page moves to `/me`).
- `globals.css`'s phone-only rules: `main` at 480px (now 960px, L43), and full-width buttons.
- The "Signed in as … Your account" section and the Groups and Board sections on the home page (they move to their tabs), and the home page's M11 H1 order of six sections (Today now has two).
- `Board`'s `onCommentsChanged` prop: the feed is on Today and the board on Friends, so Today listens to the board's channel itself, as a group's page does.
- `SignOut`'s export: only the Me tab uses it now.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Next.js recommends Tailwind for most styling, with CSS Modules for scoped CSS (`11-css.md`, "Recommendations") | CSS Modules and CSS variables only | The human chose "CSS Modules + CSS variables" (L33): no new dependency, and themes need CSS variables either way |
| This ticket's plan put the shell in the root layout | `Home` renders it once the player is signed in with a username, into `<body>` beside `<main>` | Who's signed in is known only on the client (`Home` reads `/api/profile`), signed-out pages have no tabs, and the navigation stays out of the main landmark |
| Criterion 8 named Young Serif among the fonts | Baloo 2 and DM Sans only | Nothing in 14a-1 uses Young Serif; it comes with 14a-2, its first user (Build for today) |

## Evidence
All runs on the Windows checkout's worktree `C:/Users/jason/RIFF-m14`, `m14-look-and-feel` merged with main after M13 13c, against the shared local stack (2026-10-25).

**Criteria 1–6, 8 and 9:** `npm run test:e2e -- --reporter=list` → `20 passed`, `1 failed`:
```
  ok  1 › e2e\account.e2e.ts:16:1 › the Me tab holds the account, and the navigation links to it (5.9s)
  ok  2 › e2e\account.e2e.ts:63:1 › a player deletes their account from the Me tab (2.7s)
  ok  3 › e2e\account.e2e.ts:85:1 › a player invites a friend from the Friends tab, and removing them asks first (6.9s)
  ok  4 › e2e\admin-base.e2e.ts:32:1 › an admin looks a thing up by an alias; a player can't (4.8s)
  x   5 › e2e\approve-and-play.e2e.ts:44:1 › an admin approves a drafted day on the admin page (7.1s)
  ok  6 › e2e\approve-and-play.e2e.ts:62:1 › a player survives all seven questions of a day, past the stolen letters (5.5s)
  ok  7 › e2e\audit.e2e.ts:37:1 › an admin undoes an added answer, accepts a held one and undoes that; a player can't (5.7s)
  ok  8 › e2e\groups.e2e.ts:25:1 › a group is made on the Groups tab and joined by its link (14.6s)
  ok  9 › e2e\groups.e2e.ts:125:1 › the reset reloads a group's page (2.5s)
  ok 10 › e2e\live-board.e2e.ts:44:1 › a friend's run shows up live, with no spoiler (12.4s)
  ok 11 › e2e\live-board.e2e.ts:186:1 › the reveal shows a safe answer's estimated rarity bonus (1.7s)
  ok 12 › e2e\live-board.e2e.ts:199:1 › a reconnect refetches the board (10.0s)
  ok 13 › e2e\live-board.e2e.ts:217:1 › the reset reloads every section of Today (2.3s)
  ok 14 › e2e\live-board.e2e.ts:231:1 › the reset reloads the Friends tab (2.0s)
  ok 15 › e2e\live-board.e2e.ts:248:1 › the reset leaves a question in play alone (2.6s)
  ok 16 › e2e\shell.e2e.ts:45:1 › a phone gets a bottom tab bar, and each tab holds its sections (3.5s)
  ok 17 › e2e\shell.e2e.ts:64:1 › from 768px the tabs are a sidebar, with Admin for admins only (11.2s)
  ok 18 › e2e\shell.e2e.ts:103:1 › no tab scrolls sideways at 320px (4.0s)
  ok 19 › e2e\shell.e2e.ts:113:1 › a question in play is still there after a visit to another tab (3.3s)
  ok 20 › e2e\shell.e2e.ts:123:1 › the colours follow the device: Paper when light, Night when dark (1.0s)
  ok 21 › e2e\shell.e2e.ts:136:1 › every tab shows the focus ring from the keyboard (4.5s)
```
The one failure isn't 14a-1's: the shared local database already holds M13 13d's migration (`20261025053147_question_bank.sql`), which drops `private.puzzle_questions`, while this branch's admin puzzles page still reads it, so the drafted day never lists. CI builds its database from this branch's own migrations; its e2e run is the clean check, and merging main once 13d is in brings the page's change.

Each shell test checks:
- **1:** the four links along the bottom at 360×800, each tab's URL, one `aria-current`, its visible sections (Today: Offbeat, Feed; Friends: Friends today, Friends leaderboard; Groups: Groups; Me: Your account), and `/account` → 404.
- **2:** the sidebar down the left edge at 768×1024 and 1440×900; Admin only for an admin, in the sidebar, and on phones on the Me tab.
- **3:** no sideways scroll on any tab at 320×640.
- **5:** a question still in play after a visit to Friends.
- **6:** the body's background in light and dark.
- **8:** no request to Google's font hosts during test 1.
- **9:** every link's ring at 360px and 1440px (with Admin): `3px solid`, the accent's colour, offset 3px.

**Criterion 2's admin flag:** `npx vitest run src/app/api/profile/route.db.test.ts` → `Test Files 1 passed (1)`, `Tests 12 passed (12)`, among them "says whether the player is an admin" (`admin: false`, then `true` once in `private.admin`).

**Criterion 4's moved suites:** the assertions moved with their sections, and none were dropped:
- `account.e2e.ts`: the home page's Account section is gone, so its link and Sign out became the navigation's Me link and Sign out on `/me`; `/account` became `/me`.
- `groups.e2e.ts`: the M11 order of six sections became Today's two.
- `live-board.e2e.ts`: the players move between Today (game, feed) and Friends (board, leaderboard); the reset test is split into Today's and the Friends tab's. The test no longer covers the board's own refetch when the player's run ends while it's open (the board and the game are on different pages now).
- `players.ts`, `openBoard` and `openLive`: signing in now waits for the username to save, and the channel waits leave the old page first. Both are races the moves exposed. With the second fixed, "the reset reloads the Friends tab" passed 6 of 6 with `--repeat-each=6` (it had failed 2 of 6).

**Criterion 7:** `npm test` → `Test Files 37 passed (37)`, `Tests 233 passed (233)`, `src/app/colors.test.ts` among them (24 checks). With `--edge` set to the line colour (#e2e2dc), it fails: `× the control outline on bg is at least 3:1`, `× the control outline on surface is at least 3:1`. The colour was then put back.

**Criterion 10:** `npm run lint` → no problems; `npx tsc --noEmit -p .` → no output; `npm run build` → `○ /friends`, `○ /groups`, `○ /me` among the routes, and no `/account`.

## Review
The `reviewer` agent reviewed 14a-1's diff in a fresh context (2026-10-25).
- **Blocking findings and how each was fixed:**
  1. The navigation sat inside `<main>`, so the Me tab's Admin check matched the sidebar's link too, and the tabs were inside the main landmark. Fixed: `Shell` renders into `<body>` beside `<main>` (`createPortal`).
  2. The base button rules hid the browser's disabled look. Fixed: a `button:disabled` rule (muted text, no pointer).
  3. The soft pill's alphas and the shell's sizes had no recorded origin. Fixed: two rows in Numbers (the approved mockups).
  4. L18's clock was neither built nor deferred. Fixed: Out of scope names it; the human put it in 14a-2 (2026-10-25).
  5. The focus test checked one link at one size and not the colour or offset. Fixed: it tabs through every link in the tab bar (360px) and the sidebar with Admin (1440px), checking width, style, colour and offset.
  6. DECISIONS.md's Styling row had no Log line. Fixed.
  7. ROADMAP's M14 row was stale and still said settings stay on the account page. Fixed.
  8. Evidence was empty. Filled below.
- **Found while fixing them:** Next.js's dev indicator covered the phone's Today tab in development and took its clicks (moved top-right in `next.config.ts`); `GameCard` gave `<Game>` and `<Yesterday>` the same key since M11 (made distinct); Next.js keeps a visited tab's page in the document, hidden, so the shell test reads only the visible page; `signInAndPick` raced the next navigation (it now waits for the username to save); the live-board test runs near the 30-second limit after its moves between tabs (`test.slow()`).
- **Deferred to ROADMAP "Next revision", For M14:** the Friends tab's reset when the same `msToReset` repeats; timeouts while away from Today; Today's channel without a reconnect e2e; `body:has(.nav)` styled from a module; stale "home page" and "account page" wording, the privacy page's included; reaction buttons and the 320px check; the admin pages without the shell.
