# M14 14b-1 — Themes and the About page

**Status:** in progress (2026-10-25), on `m14-look-and-feel`. Built from the human's answers without a separate draft approval, to be merged on green CI (human, 2026-10-25: "Merge on green CI (Recommended)").

## Goal
A player picks one of six themes in the settings sheet, saved on their account and shown from the first paint; and an About page says what Plor is, who makes it, its credits and its use of AI.

## Who uses it / what breaks without it
- **Used by:** every player who wants a theme other than their device's light or dark (L20, L21); every visitor who wants to know what Plor is or who makes it.
- **Breaks without it:**
  - Only Paper and Night exist, picked by the device, while the human chose presets "like monkeytype's" (L20) and named them (L21).
  - Moonlit's palette is borrowed and not yet credited, which the human asked for before it ships (L48: "lets just have a disclosure section and credit them").
  - Nothing tells a visitor who makes Plor or that AI helped build it (L48).

## What the human decided
Before (M14 ticket and HANDOFF.md):
- **L20:** preset themes, "not that many", no custom themes, every preset passing L10 (WCAG 2.2 AA); saved "On the account".
- **L21:** Follow the phone (Paper or Night), plus Sky, Moonlit and Ink. Moonlit is monkeytype's "rose pine moon" colours, renamed, with a visible divider added.
- **L47:** "no need for a selectred check thing just have it outlined": the chosen theme has a thick outline only, and screen readers hear it as selected.
- **L48:** credit each borrowed palette and say how AI is used.
- **The theme's storage:** a column on the account. **Security change, approved:** "Approve it (Recommended)" (human, 2026-10-24, in HANDOFF.md).
- **The page:** "An About page (Recommended)" at `/about`.

This ticket's guided questions (human, 2026-10-25):
- **The colours:** "Mock them up first"; then, after round 8 on the canvas "Plor shell layout": "Build as drawn (Recommended)".
- **No flash:** "Add it, copy in localStorage (Recommended)": Next.js's bundled guide "Preventing flash before hydration" was added to SOURCES.md; an inline script in `<head>` applies a copy of the theme kept in this browser, and the account stays the truth.
- **About's content:** "be way more broad but yes credits should be on". Then: "What Plor is", "Who makes it, contact", and "just dont be too specific when tlking aobut ai usage please just the bare minimum". "How a day works" and "Data sources moved here" weren't picked, so the data sources stay on the privacy page.
- **The maker:** "by jason". No contact address was given; About uses `privacy@plor.app`, the site's one address.
- **The AI line:** "\"Plor is built with help from AI.\" (Recommended)". It replaces the earlier "Code only" wording ("Code only, as worded (Recommended)", the same day).
- **The link:** "Settings and footers (Recommended)".

## Source
- **Next.js 16.4.2 bundled docs** (SOURCES.md, Next.js row):
  - `01-app/02-guides/preventing-flash-before-hydration.md`, "Themes": a script in `<head>` reads `localStorage` and sets `data-theme` on `<html>` before the browser paints; `suppressHydrationWarning` on `<html>`; "Re-applying attributes in development": React's Strict Mode remount clears it, so the component that owns the theme re-applies it in `useLayoutEffect`;
  - CSS (Global CSS for the slots) and layouts.
- **WCAG 2.2** (SOURCES.md): 1.4.3 (text 4.5:1), 1.4.11 (outlines and the calendar's shades 3:1), 1.4.1 and 4.1.2 (the chosen theme is outlined and announced as selected, not told by colour alone), 2.4.7 (focus visible on the tiles).
- **Round 8** ("Sky, Moonlit and Ink (14b-1)") and round 7's theme picker, on the canvas the human approved.
- **monkeytype's `rose_pine_moon`** (github.com/monkeytypegame/monkeytype, `frontend/src/ts/constants/themes.ts`, read 2026-10-25): bg #2a273f, main #9ccfd8, sub #c4a7e7, subAlt #211f32, text #e0def4, which Moonlit's background, accent, muted, card and text are. Read only to credit it (L21's licence check is in the M14 ticket).
- DECISIONS.md: Styling (the slots in `globals.css`, components use the slots); Row-level security in `private`; Database migrations.

## Acceptance criteria
1. **Six themes, every pairing checked.** `globals.css` holds Paper (the default), Night (under `prefers-color-scheme: dark` and as `data-theme="night"`), Sky, Moonlit and Ink, each with every slot. `src/app/colors.test.ts` runs every check it runs for Paper and Night on all five, and checks that the dark-mode block and Night's are the same. `npm test` passes.
2. **The picker.** The settings sheet has a Theme group: six tiles, Follow device, Paper, Night, Sky, Moonlit, Ink, three to a row, each drawn in its own theme's background and accent. The chosen one has a 3px outline in the text colour, the rest the 1.5px control outline; they're radio buttons, so the chosen one is announced as checked. Picking one restyles the page at once and saves it. Checked in `e2e/themes.e2e.ts`.
3. **Saved on the account.** A migration adds `theme` to `private.profile`: `not null default 'device'`, one of `device`, `paper`, `night`, `sky`, `moonlit`, `ink`. `plor_app` gets UPDATE on that column only. `POST /api/profile/settings` takes `theme` with the other settings, and refuses any other value (400 `settings_invalid`). `GET /api/profile` returns it. Checked by `settings/route.db.test.ts`, `src/lib/profile.db.test.ts` (as `plor_app`) and `plor_app_role.test.sql`.
4. **No flash.** With Ink chosen, a reload paints Ink's background before `GET /api/profile` answers. Follow device removes the attribute, so the device's light or dark decides. Signing out clears this browser's copy. Checked in `e2e/themes.e2e.ts`, holding `/api/profile` back.
5. **About.** `/about` says what Plor is, "Plor is made by Jason" with `privacy@plor.app`, credits Moonlit's palette (monkeytype's "rose pine moon", from Rosé Pine), points to the privacy page for the data sources, and says "Plor is built with help from AI." It's linked from the settings sheet and from every page's footer, beside Privacy policy. Checked in `e2e/themes.e2e.ts`.
6. **The privacy page** lists the theme among the settings and says this browser keeps a copy of it. Its date changes.
7. `npm run lint`, `npx tsc --noEmit -p .`, `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e`, `npm run build` and CI pass.

## Out of scope
- The game's own look (14c); the admin pages' look and the sprout (14b-2).
- How a day works on About; the data sources moving there (not picked).
- More themes, or custom ones (L20: "not that many", no custom themes).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Sky: bg #EEF3FA, surface #FFFFFF, text #14213D, muted #4A5A78, line #D5DEEC, accent #1F5FBF, on-accent #FFFFFF | Sky | The Themes board (L21) |
| Moonlit: bg #2A273F, surface #211F32, text #E0DEF4, muted #C4A7E7, accent #9CCFD8, on-accent #2A273F | Moonlit | The Themes board; monkeytype's `rose_pine_moon` (L21) |
| Ink: bg #000000, surface #111111, text #FFFFFF, muted #B5B5B5, line #2A2A2A, accent #FFD84D, on-accent #000000 | Ink | The Themes board (L21) |
| Outline: Sky #858C9B, Moonlit #737185, Ink #606060 | Controls | Round 8, "Build as drawn" (human, 2026-10-25): the text faded toward the card until 3:1 on both background and card |
| Moonlit's divider #3E3C50 | Lines | Round 8 (L21's "visible divider"), as visible on its card as Night's |
| Shades, the accent's alpha: Sky a7, c4, e2, ff; Moonlit 72, a1, d0, ff; Ink 65, 98, cc, ff | The calendar | Round 8, by 14a-3b's rule (the lightest reaching 3:1 on the card, then even steps) |
| Numbers on the shades: Sky #14213D, #000000, #FFFFFF, #FFFFFF; Moonlit #FFFFFF, #000000, #2A273F, #2A273F; Ink #FFFFFF, #000000, #000000, #000000 | The calendar | Round 8: the first of text, on-accent, white, black that reaches 4.5:1 |
| Soft: the accent at alpha 1A (Sky), 26 (Moonlit, Ink) | The current tab, avatar slots | Paper's and Night's alphas (14a-1) for a light or dark theme, round 8 |
| Safe, Caught and Delete: Paper's in Sky, Night's in Moonlit and Ink | Pills, Delete | Round 8 |
| Tiles: 3 to a row, 6px apart, 48px tall, 10px corners, 10px side padding, 13px bold; chosen 3px solid text colour, others 1.5px outline | The picker | Round 7's `.themes`, `.theme` and its ring (L47) |
| Six presets | The picker | L21 |
| localStorage key `plor.theme` | The copy | The project's key style (`plor.pendingInvite`, `src/app/home.tsx`) |

## Plan
1. Tests first, each seen failing: the five themes in `colors.test.ts`; `theme` in the settings db test, the profile db test and the role test; `e2e/themes.e2e.ts`.
2. The migration (`npx supabase migration new theme`), with the grant.
3. `theme` in `readSettings`, `setSettings` and the profile.
4. The slots: each theme a `[data-theme="…"]` block in `globals.css`, so a tile can wear its own theme.
5. The script in `layout.tsx`'s `<head>`; `Home` applies the profile's theme, keeps the copy and clears it on sign-out.
6. The picker in the sheet; `/about`; one `Footer` for every page.
7. The privacy page; DECISIONS.md Log (the security change); reviewer, evidence, PR.

**Hypothesis for step 5:** the inline script runs before the first paint, so with the profile request held back, the body's background is already Ink's. What would disprove it: Paper's background while `/api/profile` waits.

## Removes
- The footer copied into nine pages: one `Footer` (`src/app/footer.tsx`).
- `globals.css`'s Night block as the only way to get Night: it stays for the device's dark mode, and `[data-theme="night"]` is the same values, checked equal by the test.
- The earlier AI wording ("Code only") in the HANDOFF.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
