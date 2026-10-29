# M14 14b-6 — Feel and polish: the frame that stays, skeletons, instant feedback, numbers and headlines

**Status:** approved (human, 2026-10-27: "Approve, build 14b-6a (Recommended)"); 14b-6a, the frame and skeletons, done (PR #113; criterion 2 accepted as built (human, 2026-10-28: "Accept as built (Recommended)"), Source diff); 14b-6d, numbers and headlines, done (PR #124; one font, Baloo 2, for all text: answers 13–15); next 14b-6b. Drafted from three rounds of guided questions and an Impeccable critique of every page.

## Goal
Plor feels instant: the frame stays put between pages, every wait shows the shape of what's coming, comments and reactions land at once with an undo, detail pages slide in and out, numbers don't jitter, headlines wrap evenly, the question's clock reads as a clock, and the admin sees at a glance when tomorrow has no puzzle.

## Who uses it / what breaks without it
- **Used by:** every player on every page (the frame, skeletons, numbers, headlines), players who comment and react, players answering a question (the clock), and the admin (the warning).
- **Breaks without it** (seen in the critique, 2026-10-27, on the Mac's local stack):
  - Every page builds its own `<Home>` → `<Shell>` inside its own Suspense (`src/app/friends/page.tsx:11` and the rest; `src/app/layout.tsx` renders only `children`), so each tab switch removes the tab bar and shows "Plor Loading…", then a second "Loading…": about 216 ms locally, longer on a phone network.
  - About 36 places show bare "Loading…" text (23 player, 13 admin); there is no `loading.tsx` and no skeleton.
  - A comment appears only after a POST and two reloads (`src/app/comments.tsx:80-99`); a reaction disables every button while it waits and widens its chip when the count appears (`src/app/reactions.tsx:18`). Nothing can be undone.
  - The question's countdown is a plain sentence of body text (`src/app/game.tsx:263`), not tabular, under the banner, with stats, Yesterday and comments below it during play.
  - About 15 places render changing or lined-up numbers without tabular figures (the countdown, "Next puzzle in 7:50:34", points, ranks, reaction counts, times, admin badges, chart axes, dates); `text-wrap` is used nowhere.
  - "0 days approved ahead" sits in the admin rail at the same weight as everything else, and an empty tomorrow doesn't appear on Puzzles at all: the one thing that breaks the game at midnight Pacific.

## What the human decided (2026-10-27, on the Mac, quoted)
The request: "skeleton loaders for all pages (right now just see a loading text), optimistic updates, undo toasts for comments/reactions, prerendering, predictive backs, making sure all numbers are tabular, balanced headlines. also would like another round of impeccable skill critique on the main pages and all the other pages".

Round 1:
1. **Order:** "Critique first (Recommended)": the critique, then one ticket with its findings and these items, split into PRs.
2. **The critique:** "can u install it on this device as well", then "Yes, download it (Recommended)" (pbakaus/impeccable at `d34c87e`, v4.8.0, kept out of git) and "Yes, allow it (Recommended)" (its engine, checksum-verified, in `~/.impeccable/`).
3. **Undo:** "Hold, then send": the comment or reaction shows for the player at once and goes to the server when the toast ends; friends never see what was undone.
4. **Navigation:** "need to see visuals to decide", then (after phone mockups) "Decide after critique".

Round 2 (after the critique):
5. **First PR:** "Frame + skeletons (Recommended)".
6. **Scope:** "Your 7 + the P1s (Recommended)": the seven items plus the critique's P1s (the frame rebuild, the comments and reactions feel, the question clock, the admin warning); its P2s and minor notes go to ROADMAP "Next revision".
7. **Navigation:** "Tabs open instantly" and "Pages slide". Back-swipe reveal was not chosen.
8. **Admin warning:** "Tomorrow not approved".

Round 3:
9. **Sources:** all four added (below).
10. **Undo time:** "5 seconds".
11. **Where pages slide:** "Only into detail pages (Recommended)": tabs switch with no slide.
12. **Slide speed:** "Quick, 200 ms".

### 14b-6d's font (human, 2026-10-28, on the Windows PC, quoted)
The Plan's first hypothesis was disproved: DM Sans's file has no tabular figures (Evidence, 14b-6d), so `tabular-nums` couldn't steady body-text numbers.
13. **What to do:** "keep everything one font then".
14. **Which font:** "A new font, chosen now", from a comparison page of fonts whose Google files have tabular figures (measured, Evidence); then "baloo 2".
15. **When:** "In 14b-6d, now (Recommended)".

## Source
- **Next.js 16.4.2 bundled docs** (SOURCES.md, Next.js row):
  - `03-api-reference/03-file-conventions/loading.md`: `loading.js` wraps the page in Suspense inside the layout; "Shared layouts remain interactive while new route segments load"; the fallback is prefetched, "making navigation immediate unless prefetching hasn't completed".
  - `01-getting-started/04-linking-and-navigating.md`, "Prefetching" and "Dynamic routes without `loading.tsx`": `<Link>` prefetches routes in the viewport; a dynamic route is "partially prefetched if `loading.tsx` is present", so its layout and skeleton are ready before the tap.
  - `02-guides/view-transitions.md`, Step 3 "Add directional motion for navigation": `transitionTypes={['nav-forward']}` / `['nav-back']` on `<Link>`, a `<ViewTransition enter exit>` wrapper in each participating `page.tsx` (not the layout), a 60px slide offset, "Anchoring the header" (`viewTransitionName` and no animation on it), "Keeping the page interactive" (`::view-transition { pointer-events: none }`), "Respecting reduced motion" (durations to 0s). It also says browser back and swipe gestures carry no transition type, so they don't slide.
- **React `useOptimistic`** (SOURCES.md, new row): the optimistic state shows only while an Action is pending, the setter is called inside `startTransition` or an Action, and on error React renders the real `value` again.
- **MDN `text-wrap` and `font-variant-numeric`** (SOURCES.md, new row): `balance` for short blocks such as headings (Chromium balances 6 lines or fewer, Firefox 10), `pretty` for body copy; `tabular-nums` maps to OpenType `tnum` and needs the font to have it. Both Baseline widely available.
- **MDN View Transition API** (SOURCES.md, new row): `::view-transition-old/new`, same-document transitions in Chrome 111, Safari 18, Firefox 144 (MDN's compatibility data).
- **WCAG 2.2** (SOURCES.md): 2.2.1 Timing adjustable (the undo window is the player's own choice to act, not a limit on them), 2.3.3 Animation from interactions (reduced motion), 4.1.3 Status messages (the toast is a live region).
- **DECISIONS.md**, Styling (CSS Modules and CSS variables; `globals.css` holds base rules) and Config and tunables (`src/config/tunables.ts` holds the 5 s window with its origin).

## Design
1. **The frame stays (14b-6a).** The shell and the player's profile move into a layout that persists across routes: `<Home>`'s profile load, sign-in gate, `<Shell>`, the page's `<h1>` and `<Footer>` render once there, and each `page.tsx` renders only its own section. Signed out, the layout shows sign-in as today. Every route gets a `loading.tsx` with that page's skeleton, so the tab bar's links prefetch the skeleton and a tab switch shows it at once.
2. **Skeletons (14b-6a).** One `Skeleton` block component (a static block in a colour slot, sized like what it stands for; no shimmer, so no animation time is needed) replaces every "Loading…" (the ~36 places, admin pages included), each laid out like its loaded section so nothing jumps when data lands. The admin rail and the phone's Waiting strip reserve their space too.
3. **Comments and reactions land at once, with Undo (14b-6b).** Posting a comment, deleting your own comment, or adding/removing a reaction updates the screen at once (`useOptimistic`) and shows a toast "Comment posted · Undo" (a `role="status"` live region). The request goes to the server when the toast's 5 seconds end; Undo puts the screen back and sends nothing. A reaction's chip keeps its width whether or not it shows a count. If the send fails, the screen goes back and the toast says what failed (fail loudly).
4. **The question's clock (14b-6c).** The countdown becomes a large tabular number beside the prompt (the heading size already in `globals.css`, no new size), the banner shrinks to one line while a question is open, and the stats, Yesterday and comments panels show again only when the run ends. Kept plain until 14c's art.
5. **Numbers and headlines (14b-6d).** One font, Baloo 2, for all text (answers 13–15): Google's one variable Latin file for 400, 700 and 800 replaces the 800-only Baloo 2 file and DM Sans, so `--font-heading` and its 12 `font-family` declarations go, and `textarea` and `select` inherit the family too. `font-variant-numeric: tabular-nums` once on `body` in `globals.css`, replacing the 9 per-selector rules; `text-wrap: balance` on `h1, h2, h3` and `text-wrap: pretty` on paragraphs, once in `globals.css`.
6. **Detail pages slide (14b-6e).** Links from a tab into a detail page (`/updraft`, `/updraft/how-to-play`, `/streak`, `/groups/[id]`) carry `nav-forward`; each detail page's own back button carries `nav-back`. The content slides 60px with the 200 ms the human chose; the shell and tab bar are anchored and don't move; reduced motion makes it instant. Tab-to-tab switches don't slide. The browser's own back doesn't slide (source).
7. **Tomorrow's puzzle warning (14b-6f).** When tomorrow (Pacific) has no approved day, the admin rail's "days approved ahead" row moves to the top in the danger slot and reads "Tomorrow has no puzzle"; the phone's Waiting strip shows it first. The Puzzles day row shows tomorrow as an empty "Not drafted" slot when it has no day.

### Decided at approval (human, 2026-10-27)
- **P1. Leaving during the 5 s:** "Send it on leaving (Recommended)": sent at once when the player navigates away or closes the page (`fetch` with `keepalive`).
- **P2. Several reactions in a row:** "Last state wins (Recommended)": one toast, updated with each tap; only the final state is sent when the window ends.
- **P3. Fetching tabs ahead:** "Frame + skeletons (Recommended)": the frame stays and the tab's skeleton shows at once; no tab's data is fetched in the background.

## Acceptance criteria
Each is checked with a command or a test's output, recorded under Evidence.
1. **The frame stays.** An e2e test watches the tab bar with a MutationObserver while it switches Today → Friends → Groups → Me → Today, and the tab bar element is never removed. `rg -n "<Home view" src/app` finds nothing in any `page.tsx`.
2. **No "Loading…" text.** `rg -n "Loading…" src --glob '*.tsx'` finds no user-facing loading text (the skeletons' accessible names begin "Loading"); one `loading.tsx` for the `(shell)` group shows the page skeleton; an e2e test holds `/api/profile` on the first load, then each tab's own data (`/api/run` on Today, `/api/me`, `/api/groups`, `/api/friends`), and sees that tab's skeleton by its accessible name. *Reworded to what was built (human, 2026-10-28: "Accept as built (Recommended)"); the approved wording was: every route folder under `src/app` that renders a page has a `loading.tsx`; an e2e test slows `/api/profile` and sees the skeleton on each tab.*
3. **Optimistic with Undo.** e2e: a posted comment shows before its request is sent; Undo within 5 s removes it and no request is sent; after 5 s the request is sent once; a reaction's chip width is the same before and after its count appears; a failed send puts the screen back and shows the error. A unit test covers the hold-then-send timer (send, undo, leave-page send).
4. **The clock.** e2e on the game screen: the countdown has computed `font-variant-numeric: tabular-nums`, sits beside the prompt, and the stats, Yesterday and comments sections aren't in the page while a question is open.
5. **Numbers and headlines.** e2e reads computed styles: `body` has `tabular-nums`; `h1`, `h2`, `h3` have `text-wrap: balance`. The 9 per-selector `tabular-nums` rules are gone (`rg -n tabular-nums src/app` finds only `globals.css`). *Added with answers 13–15:* `e2e/shell.e2e.ts` finds one font family on the page, whose faces are the Baloo 2 variable file at 400, 700 and 800, each loading; `rg -n "font-heading|DMSans|DM Sans" src e2e` finds nothing.
6. **Slides.** e2e: a link into a detail page carries the forward type and the detail page's back button the back type (checked on the rendered `ViewTransition` classes), and under `prefers-reduced-motion: reduce` the transition's animation duration is 0s. Tab links carry no type.
7. **Tomorrow warning.** A db or e2e test: with no approved day for tomorrow, the admin rail's first row reads "Tomorrow has no puzzle" in the danger slot, and Puzzles shows the empty slot; with one, neither shows.
8. `npm run lint`, `npx tsc --noEmit -p .`, `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run build` and CI pass; a fresh Impeccable critique of the player pages runs after the last PR and its score is recorded here (no target score is set).

## Out of scope
- Back-swipe reveal (not chosen), and slides on browser back (the source says it can't).
- Fetching tabs' data in the background (P3).
- The critique's P2s and minor notes (ROADMAP "Next revision", For M14): the raw clipboard error (`messages.ts:92`), Reset link / Delete group beside safe buttons, signed-in Today repeating "Sign in to play", audit Dismiss with no confirm, admin pending labels and focus after a row goes, snake_case categories, "Gentle target" undefined, the empty Insights chart, streak tiles not lining up, list bullets on comments, the ISO date in the feed heading, `h1` "Plor" on every desktop page.
- The game's pixel world and result moment (14c).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 5 s | the undo window before a comment or reaction is sent | human, 2026-10-27: "5 seconds" |
| 200 ms | a detail page's slide | human, 2026-10-27: "Quick, 200 ms" |
| 60px | a slide's offset | Next.js view-transitions guide, Step 3 ("The 60px offset is enough to communicate direction") |
| tomorrow (Pacific) not approved | when the admin warning shows | human, 2026-10-27: "Tomorrow not approved"; tomorrow is the day after `private.today()` |
| 0s | slide duration under reduced motion | Next.js view-transitions guide, "Respecting reduced motion" |
| 1lh | a skeleton line's height | one line of the text it stands for (MDN `lh` unit is the element's line height; no new size) |
| 12px | a skeleton line's corners | the radius buttons and inputs already have (`src/app/globals.css`, `button`) |
| 400, 700, 800 | Baloo 2's weights (14b-6d) | the weights the pages already use: body 400 and 700, headings 800 (L4; 14b-5's Numbers), unchanged |

## Plan
One PR per sub-ticket, in this order:
1. **14b-6a, the frame and skeletons** (the human's first PR).
2. **14b-6d, numbers and headlines** (small, so it lands early).
3. **14b-6b, comments and reactions.**
4. **14b-6c, the question's clock.**
5. **14b-6e, slides.**
6. **14b-6f, tomorrow's warning.**

Hypotheses to check before building:
- **DM Sans has tabular figures.** Expect yes: the Me page's totals already use `tabular-nums` and line up. Check by measuring "1111" against "0000" in DM Sans with and without the rule; equal widths only with the rule proves it; equal widths either way means the font's digits are already fixed-width; different widths with the rule means the font lacks `tnum` and the human chooses what to do.
- **Moving the shell into a layout keeps Cache Components happy.** Expect the profile load to stay a client fetch inside a Suspense boundary in the layout. A build error about uncached data outside Suspense disproves it; then re-plan with the Next.js docs rather than guess.

## Removes
- The ~36 "Loading…" fallbacks and component branches.
- Each `page.tsx`'s copy of `<h1>Plor</h1>`, `<Suspense><Home view=…/></Suspense>` and `<Footer/>` (moved once into the layout), and `Home`'s `view` switch.
- The 9 per-selector `font-variant-numeric: tabular-nums` rules (one rule on `body` replaces them).
- DM Sans (`src/app/fonts/DMSans-latin.woff2`, `OFL-DMSans.txt`), the 800-only `Baloo2-800-latin.woff2` (one variable file replaces both fonts), the `--font-heading` variable and its 12 `font-family` declarations (14b-6d, answers 13–15).
- `reactions.tsx`'s disable-all-buttons-while-waiting and `comments.tsx`'s reload-after-post.
- The admin rail's plain "0 days approved ahead / None yet" row (replaced by the warning).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Ticket, design 1: "Every route gets a `loading.tsx` with that page's skeleton" (from Next.js, `loading.js`: a loading file per folder) | **14b-6a:** one `src/app/(shell)/loading.tsx` for every player page, showing the page skeleton | Every page's server part is static (`npm run build` lists them ○, the code routes ◐), and each page's sections fetch their own data on the client and show their own skeletons; a loading file per folder would be identical copies of the one |
| Ticket, design 2: "The admin rail and the phone's Waiting strip reserve their space too" | **14b-6a:** the rail shows its title and its four rows as lines until the counts land; the phone's Waiting strip shows one line while loading | When nothing is waiting the strip isn't shown at all, so the page moves up once after loading; keeping an empty strip on every visit would show a gap for nothing |
| Ticket, design 2: "One `Skeleton` block component (a static block … sized like what it stands for)" | **14b-6a:** `Skeleton` (the label for screen readers) and `Line` (one line of text); each section's skeleton is its real container and static heading with lines where the data goes | A free-standing block has no height of its own (the cards size to their content), so a block "the size of the section" would need invented heights; the real container is that size already |
| Criterion 2 (approved): `rg -n "Loading"` finds no user-facing loading text; a `loading.tsx` in every page's folder; an e2e slows `/api/profile` and sees the skeleton on each tab | **14b-6a:** `rg -n "Loading…"` finds only `skeleton.tsx`'s comment, and the skeletons' accessible names begin "Loading" ("Loading your stats"); one `loading.tsx` for the group (row above); the e2e holds `/api/profile` on the first load and then each tab's own data (`/api/run` on Today, `/api/me`, `/api/groups`, `/api/friends`) | The profile now loads once per visit, not on each tab (that is design 1), so slowing it shows the skeleton only on the first page; each tab's own data is what a tab switch waits for. Accepted as built (human, 2026-10-28: "Accept as built (Recommended)"); criterion 2 is reworded to match |
| Next.js, authentication with Cache Components: what reads the session streams behind Suspense while the rest is in the static shell | **14b-6a:** the frame always renders the page and reads no address-bar hooks itself; the parts that do (the shell, the clock bar, the feed's column, the invite remembered across Google) are behind their own Suspense, and the sign-in's error alert renders only on the client, inside `Signed`; `Signed` shows the skeleton until the profile loads | As the sources say (and `use-search-params.md`, Prerendering; `use-pathname.md`, Cache Components). A first version returned the skeleton instead of the page (the dev server: "Could not validate that a segment in your UI has instant navigation … Dropped segment"); the second still called `useSearchParams` in the frame, so the whole page rendered on the client and Today's introduction left the served HTML (found by the review: `.next/server/app/index.html` without scripts had no "Plor is a small site") |
| Ticket, design 5 (approved): `tabular-nums` once on `body`, over Baloo 2 headings and DM Sans text | **14b-6d:** one font, Baloo 2, for all text, then `tabular-nums` once on `body`; `textarea` and `select` inherit the family | DM Sans's file has no tabular figures (Evidence), so the rule couldn't steady body-text numbers; the human chose one font, Baloo 2 (answers 13–15). The comment box and the pickers used the system font, not DM Sans, so "one font for all text" brings them in; their sizes stay |

## Evidence
### 14b-6d (2026-10-28, the Windows PC's local stack)
- **Hypothesis (Plan): DM Sans has tabular figures. Disproved.** Measured in Chromium (Playwright) from the committed files at 40px: DM Sans "1111" 49.92px and "0000" 109.45px, the same with `tabular-nums` (a check that the face loaded: `document.fonts.check` true, and "Hamburgefonstiv" 316.20px against serif 279.22px and sans-serif 302.38px). Baloo 2 at 800: "1111" 62.89px plain, 96.97px with the rule, as wide as "0000" (96.97px). So the 5 old rules on DM Sans text did nothing; the human chose one font (answers 13–15).
- **Fonts with tabular figures in Google's files** (the CSS API at 400, 700 and 800, measured the same way, 2026-10-28): Inter, Figtree, Plus Jakarta Sans, Manrope, Rubik, Work Sans, Geist, Onest, Outfit, Schibsted Grotesk, Mona Sans, Sora, Red Hat Text, Atkinson Hyperlegible Next and Baloo 2 by `tnum`; Nunito and Hanken Grotesk fixed-width by default; none in DM Sans, Lexend, Albert Sans or Urbanist. Ten were shown to the human on a private comparison page, with today's pair first; the human chose "baloo 2".
- **The file:** `fonts.googleapis.com/css2?family=Baloo+2:wght@400;700;800` names one Latin file for all three weights, `baloo2/v23/wXKrE3kTposypRyd51jcAA.woff2`, 33,188 bytes, SHA-256 `26fb4610d4bc976d2584ca15e66c11465dbc1f267a10dca668fcb3080dfe59c1`; the 800-only request 14b-5 used names a different, static file (the one removed, `05dada34…aa6f4`). Fonts' payload: 55,592 bytes before (Baloo 2 800 and DM Sans), 33,188 after.
- **Criterion 5:** `rg -n tabular-nums src/app` finds only `src/app/globals.css:188`. `rg -n "font-heading|DMSans|DM Sans" src e2e` finds nothing. `e2e/feel.e2e.ts` "numbers are tabular, headings balanced and paragraphs pretty" reads Today's real `body`, `h1`, `h2`, `h3` and `p` signed in: `tabular-nums`, `balance` ×3, `pretty`: passed. `e2e/shell.e2e.ts` "a phone gets a bottom tab bar…" finds the heading and body in one family, whose faces are `400/700/800 Baloo2_latin`, each loading, and the heading drawn at 800: passed.
- **Weights unchanged:** the CSS asks for 400 (1 rule), 600 (1), 700 (39) and 800 (13); the file is declared at 400, 700 and 800 as Google's CSS declares it, so 600 still draws at 700, as with DM Sans's two faces. Each of the 11 removed `font-family: var(--font-heading)` declarations sat in a rule that sets `font-weight: 800` or on an `h2` (`game.module.css` `.title`), which `globals.css` sets to 800.
- `npx tsc --noEmit -p .` clean; `npx eslint src e2e scripts` clean; `npx playwright test e2e/shell.e2e.ts e2e/feel.e2e.ts` **13 passed** (2.2 min), the 320px reflow check among them; the full `npx playwright test` **65 passed** (7.2 min), every page's 320px and layout checks with the new font; `npm test` 43 files, **458 passed**; `npm run test:db` 42 files, **280 passed** (no SQL changed); `npm run build` "Compiled successfully", 73 of 73 pages generated.
- **Seen in the browser:** the production build (`next start`) at 390px, Today signed out and About: headings, body text, buttons and labels all in Baloo 2, nothing clipped or overflowing. Baloo 2's tall letters make paragraph lines look further apart than DM Sans did; no line height changed.

### 14b-6a (2026-10-27, the Mac's local stack)
- **Criterion 1, the frame stays:** `e2e/feel.e2e.ts` "the tab bar stays on screen across tab switches" watches the Main navigation with a MutationObserver through Friends, Groups, Me and Today: passed. `rg -n "<Home view" src/app` finds nothing (0 lines). Before this change the critique measured the tab bar removed for about 20 ms on each switch, with "Plor Loading…" shown.
- **Criterion 2, skeletons** (as reworded, 2026-10-28): `rg -n "Loading…" src --glob '*.tsx'` finds only `src/app/skeleton.tsx:1` (its comment). `e2e/feel.e2e.ts` "a section waiting for its data shows its skeleton, not Loading text" holds `/api/profile`, then `/api/me`, `/api/groups` and `/api/friends` on their tabs, then `/api/run` on a fresh load of Today, and sees "Loading Plor", "Loading your stats", "Loading your groups", "Loading your friends" and "Loading today's puzzle" each time, with no "Loading…" text: passed.
- **The served HTML (M02 2c), after the review:** `npm run build`, then `.next/server/app/index.html` with its scripts removed holds `<h1>Plor</h1>` and "Plor is a small site" (true, true; before the fix: false). `e2e/feel.e2e.ts` "the pages' static text is served without JavaScript" loads `/`, `/i/AAAAAAAAAA` and `/g/AAAAAAAAAA` with JavaScript off and finds the introduction and both invite lines: passed. `e2e/player-screens.e2e.ts` now sees the leaderboard card's "Loading scores" skeleton where it saw "Loading…".
- **Hypothesis (Plan): moving the shell into a layout keeps Cache Components happy.** Partly disproved at first: the dev server reported "Could not validate that a segment in your UI has instant navigation … Dropped segment: src/app/(shell)/page.tsx" while the frame returned a skeleton instead of the page. Re-planned from the authentication guide: the frame always renders the page and `Signed` waits for the profile; the report is gone.
- **Found by the full e2e run and fixed:** the friends feed's column showed on Today too (Today has its own feed): `feedBeside` now leaves out "/". The skeleton label "Loading the leaderboard" matched `getByLabel("Board")` beside the board picker: renamed "Loading scores". `live-board.e2e.ts` "the reset reloads the Friends tab" moved the clock before the tab's own `/api/run` answer (six requests, two answers before the jump, logged); it now waits for `networkidle` first, as the same file does elsewhere.
- **CI on PR #113 (`6d3d179`):** the pull-request run's e2e failed once (run 40615428990), the push run's passed on the same commit: `e2e/shell.e2e.ts` expected the bare `/admin` after the Me tab's Admin link, which redirects to `/admin/puzzles`, so it passed only when it looked before the redirect. It now expects `/admin/puzzles`, as `admin-area.e2e.ts` and `audit.e2e.ts` do; 3 local runs passed.
- `npx tsc --noEmit -p .` clean; `npx eslint src e2e scripts` clean (`npm run lint`'s 94 warnings are all in the untracked Impeccable skill under `.claude/skills/`, ROADMAP Housekeeping); `npm test` 43 files, **440 passed**; `npm run build` clean (the player pages ○ static, the code routes ◐); `npx playwright test` **64 passed** (2.1 min), after the review's fixes.

## Review
### 14b-6d (the `reviewer` agent, fresh context, on the uncommitted diff over `2b9d210`)
- Blocking findings and how each was fixed:
  1. **HANDOFF's item 00 and Updated line still said 14b-6d was next and PR #113 might be unmerged.** Fixed: both say 14b-6d is done in its PR and 14b-6b is next.
  2. **The Evidence didn't record the full runs** (`npm test`, `npm run build`, the full e2e, `npm run test:db`). Fixed: `test:db` was run (280 passed) and all four are recorded above.
- The reviewer's checks that passed: every removed `font-family` sat in a rule keeping `font-weight: 800` or on an `h2` (all four `.title` uses checked); no rule became empty; `font-family` is set only on `body` and `textarea, select`; the font file's size and SHA-256 match SOURCES.md; no stale DM Sans or `--font-heading` reference outside history.
- Deferred to ROADMAP "Next revision" (For M14): the h3 item reworded (h3 is Baloo 2 now, but at 700 against h1/h2's 800); `textarea` and `select` keep the browser's font size (13.33px in Chromium), under the 16px inputs get against iOS zoom. Not deferred: design 5's "12 declarations" and the Evidence's "11 removed" both hold (11 in modules, 1 in `globals.css`).

### 14b-6a (the `reviewer` agent, fresh context, on `3b7352c`)
- Blocking findings and how each was fixed:
  1. **Today's introduction and the invite lines had left the served HTML** (`Frame` called `useSearchParams`, so everything up to its Suspense rendered on the client; Google's brand check, M02 2c). Fixed: the frame reads no address-bar hooks; its address-reading parts are behind their own Suspense, the sign-in error renders inside `Signed`, and the code pages read `params` inside their own Suspense. Evidence above, with a new JavaScript-off e2e.
  2. **Criterion 2 had been reworded to match what was built**, without the human. Fixed: the approved wording is back; what was built and why is a Source diff row waiting for the human's word. The missing check of Today's own data is added.
- Deferred to ROADMAP "Next revision" (For M14): the profile loading once per visit (a stale streak pill past midnight); skeleton status regions that may announce nothing (unverified); `streakError` staying across pages; no e2e for the feed column on the admin, game and invite pages. The ROADMAP item that named `src/app/page.tsx` now names `src/app/(shell)/page.tsx`.
