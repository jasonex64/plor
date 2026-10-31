# M14 14b-16 — A proper 404 page

**Status:** approved (human, 2026-10-31: "Approve, build it", to "Build 14b-16 as drafted, with the tab title \"Page not found\"?"), in review (PR #TBD). It was drafted from one round of guided questions (2026-10-31) on the Impeccable audit's 404 item.

## Goal
An address that isn't a page shows "Page not found" inside Plor's own shell, in the player's theme and font, with one button to Today, and still answers 404.

## Who uses it / what breaks without it
- Used by: anyone who follows a broken or old link (old `/offbeat` links since 14c-1) or mistypes an address.
- Breaks without it: Next.js's default page shows instead, with no shell, Plor's font or theme, no `main` landmark and no way home but the browser's back button (ROADMAP For M14; Impeccable audits of 2026-10-29 and 2026-10-31).

## What the human decided (2026-10-31, on the Windows PC, quoted)
1. Frame: "The full shell (Recommended)" ("The tab bar or sidebar, the wordmark and the footer, exactly as on every other page, signed in or out. You can go anywhere from it. The shell's markup is shared, not copied, so it stays one way.").
2. Words: "Plain (Recommended)" ("Heading 'Page not found', then 'There's nothing at this address.'").
3. Old `/offbeat` links: "No, the same page (Recommended)" ("Keeps 14c-1's decision: the old name appears nowhere.").
4. Button: "Today (Recommended)" ("One main button, 'Go to Today', the home of the app; the shell's tabs cover everywhere else.").

## Source
- **Next.js, `not-found.js`** (the bundled `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`, 16.4.2; SOURCES.md, Next.js): the root `app/not-found.js` handles every unmatched URL and renders inside the root layout; Next.js answers 404 before streaming starts and adds `<meta name="robots" content="noindex">`. Not the experimental `global-not-found.js`: Plor has one root layout, its listed reason to use it.
- **DESIGN.md**: the shell (Spacing and layout), the kit's card and main button (`kit.module.css` `.card`, `.primary`), the button link (`button-link.tsx`).
- **14c-1** (`docs/milestones/M14-14c-1-name-and-words.md`): `/offbeat` answers 404, no redirect, no fallback to the old name. Unchanged (answer 3).

## Acceptance criteria
- [x] An unknown address (`/nope`, and `/offbeat`) answers HTTP 404 and shows, inside the shell (tab bar below 768px, sidebar from 768px, the footer), one kit card: the heading "Page not found", "There's nothing at this address." and a main button link "Go to Today" to `/`.
- [x] Signed out it shows the same card, not the sign-in step, in the signed-out shell.
- [x] It's in the player's theme and Plor's font (checked in Paper and Night), its card's heading is the page's `h2` under the shell's `h1`, and it sits in the shell's `main`.
- [x] No tab is marked current.
- [x] The shell's markup is one component used by `(shell)/layout.tsx` and the 404 (answer 1), not a copy.
- [x] The browser tab reads "Page not found" (proposed; the other pages read "Plor" or "About Plor").
- [x] `e2e/offbeat.e2e.ts`'s "the old address /offbeat answers 404" still passes; Impeccable's detector finds nothing on the page at 390×844 and 1440×900.
- [x] DESIGN.md describes the page; the `reviewer` agent has reviewed the diff.

## Out of scope
- A redirect or note for `/offbeat` (answer 3).
- `notFound()` from a page: nothing calls it; a missing group or invite keeps its own message.
- The audit's other For M14 items.

## Numbers
None new: the kit's card and main button, the shell as it is.

| Value | Used for | Origin |
|---|---|---|
| "Page not found", "There's nothing at this address.", "Go to Today" | Copy | Answers 2 and 4 |
| "Page not found" | The browser tab's title | Claude's proposal, for the human's approval with this ticket |

## Plan
1. Red first: an e2e (`e2e/not-found.e2e.ts`) for the criteria: status 404, the shell, the card and its copy, the button's target, signed in and out, Paper and Night, no current tab. Expected: it fails on Next.js's default page (no shell, no "Page not found" heading).
2. Move `(shell)/layout.tsx`'s markup into one shell component, used by the layout and by `src/app/not-found.tsx`; `not-found.tsx` renders the card in it, with its title.
3. Run the new e2e, `offbeat.e2e.ts`, `shell.e2e.ts` and `look.e2e.ts`; the detector on `/nope` at both widths; a look at 390 and 1440 in Paper and Night.
4. DESIGN.md; the `reviewer` agent; the ROADMAP For M14 404 item, the ROADMAP row and HANDOFF in the PR.

## Removes
- Next.js's default 404 page, for Plor's own.
- The ROADMAP For M14 404 item.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Next.js `not-found.js`: a component with no props, its markup the page's | It draws the shared shell and tells its frame it's lost, so the shell marks no tab current | Answer 1 (the full shell); the shell otherwise marks a tab current from the address alone (the review) |

## Evidence
- **Red first** (2026-10-31): `npx playwright test e2e/not-found.e2e.ts` on Next.js's default page → `2 failed`: the title `Expected: "Page not found"`, `Received: "404: This page could not be found."`; and the signed-in case found no navigation link "Today".
- **Green:** after the build, the same → `2 passed (10.1s)`; then `npx playwright test e2e/not-found.e2e.ts e2e/offbeat.e2e.ts e2e/shell.e2e.ts e2e/look.e2e.ts` (with a throwaway screenshot spec, deleted after) → `23 passed (1.9m)`. `npx tsc --noEmit -p .` and `npx eslint` on the changed files: no output.
- **The review's case, red then green:** "unknown addresses under a tab's path mark no tab current" (`/friends/nope`, `/me/nope`, `/updraft/nope`, signed in at 390px) failed before the fix, `/friends/nope`, `Expected: 0`, `Received: 1` (an `aria-current`); after it, `npx playwright test e2e/not-found.e2e.ts e2e/shell.e2e.ts e2e/admin-area.e2e.ts` → `16 passed (1.8m)`.
- **Impeccable's detector** on `/nope`, signed out, over a DevTools port: `{"390":[],"1440":[]}`.
- **Screens** (the throwaway spec; images in the session's scratchpad, not committed): `/nope` at 390px and 1440px in Paper and Night: "Plor", one card with "Page not found", the line and the main button "Go to Today", then the footer's Privacy policy and About Plor, in Baloo 2 and the theme's colours.
- *Unverified:* the 404 status on a production build (`next start`); shown on the dev server only.

## Review
The `reviewer` agent, fresh context, 2026-10-31, on `d0912b1`.
- Blocking findings and how each was fixed:
  - An unknown address under a tab's path (`/friends/nope`, `/me/nope`, `/updraft/nope`, `/admin/nope`) marked that tab, or Admin, current, against the criterion. The 404 now passes `lost` through `Shell` and `Frame` to the navigation, which then marks nothing current; an e2e covers three such addresses on a phone.
  - The ROADMAP row, the For M14 404 item, HANDOFF and this ticket's last sections were not yet updated. Done in this PR.
- Deferred to ROADMAP "Next revision" (For M14): the friends feed beside the 404 from 1200px; two components named `Shell`; the e2e's one-card check; the production 404 status unverified.
