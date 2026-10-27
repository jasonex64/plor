# M14 14b-6 — Feel and polish: the frame that stays, skeletons, instant feedback, numbers and headlines

**Status:** drafted for the human's approval (2026-10-27), from three rounds of guided questions and an Impeccable critique of every page.

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
5. **Numbers and headlines (14b-6d).** `font-variant-numeric: tabular-nums` once on `body` in `globals.css`, replacing the 9 per-selector rules; `text-wrap: balance` on `h1, h2, h3` and `text-wrap: pretty` on paragraphs, once in `globals.css`.
6. **Detail pages slide (14b-6e).** Links from a tab into a detail page (`/updraft`, `/updraft/how-to-play`, `/streak`, `/groups/[id]`) carry `nav-forward`; each detail page's own back button carries `nav-back`. The content slides 60px with the 200 ms the human chose; the shell and tab bar are anchored and don't move; reduced motion makes it instant. Tab-to-tab switches don't slide. The browser's own back doesn't slide (source).
7. **Tomorrow's puzzle warning (14b-6f).** When tomorrow (Pacific) has no approved day, the admin rail's "days approved ahead" row moves to the top in the danger slot and reads "Tomorrow has no puzzle"; the phone's Waiting strip shows it first. The Puzzles day row shows tomorrow as an empty "Not drafted" slot when it has no day.

### Proposed answers to check at approval
These came up while designing; each is the drafter's recommendation, not yet the human's:
- **P1. Leaving during the 5 s:** send it at once when the player navigates away or closes the page (`fetch` with `keepalive`), so nothing is lost; the alternative is to drop it.
- **P2. Several reactions in a row:** one toast per change, and only the last state is sent when the window ends.
- **P3. Fetching tabs ahead:** "Tabs open instantly" is the frame plus prefetched skeletons, not each tab's data fetched in the background (that would be more data on phones, and a cache nobody has asked for).

## Acceptance criteria
Each is checked with a command or a test's output, recorded under Evidence.
1. **The frame stays.** An e2e test watches the tab bar with a MutationObserver while it switches Today → Friends → Groups → Me → Today, and the tab bar element is never removed. `rg -n "<Home view" src/app` finds nothing in any `page.tsx`.
2. **No "Loading…" text.** `rg -n "Loading" src --glob '*.tsx'` finds no user-facing loading text; every route folder under `src/app` that renders a page has a `loading.tsx`; an e2e test slows `/api/profile` and sees the skeleton (by its accessible name) on each tab.
3. **Optimistic with Undo.** e2e: a posted comment shows before its request is sent; Undo within 5 s removes it and no request is sent; after 5 s the request is sent once; a reaction's chip width is the same before and after its count appears; a failed send puts the screen back and shows the error. A unit test covers the hold-then-send timer (send, undo, leave-page send).
4. **The clock.** e2e on the game screen: the countdown has computed `font-variant-numeric: tabular-nums`, sits beside the prompt, and the stats, Yesterday and comments sections aren't in the page while a question is open.
5. **Numbers and headlines.** e2e reads computed styles: `body` has `tabular-nums`; `h1`, `h2`, `h3` have `text-wrap: balance`. The 9 per-selector `tabular-nums` rules are gone (`rg -n tabular-nums src/app` finds only `globals.css`).
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
- `reactions.tsx`'s disable-all-buttons-while-waiting and `comments.tsx`'s reload-after-post.
- The admin rail's plain "0 days approved ahead / None yet" row (replaced by the warning).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
