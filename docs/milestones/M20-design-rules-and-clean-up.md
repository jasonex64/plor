# M20 — Design rules and clean-up

**Status:** planned. Settled with the human on 2026-11-16 (answers 1 to 12; "Approve the ticket only"); nothing is built. Building starts in a later session, with 20a.

## Goal
One written set of design rules and one kit of components that every later change builds from, and the shell and the main tabs cleaned up to follow them.

## Who uses it / what breaks without it
- **Used by:** every beta player (the screens they look at daily); every later session that adds or changes a screen (the human, 2026-11-16: "so that when you're creating these new things, you can just specifically reference the thing that we have designed").
- **Breaks without it:** each new screen invents its own button, heading and gap, as the audit below shows has already happened (about 12 button looks, about 15 heading looks, three card gaps); the misalignments the human listed stay in front of testers.

## The human's answers (2026-11-16, from Claude's guided questions)
| # | Asked | Answer |
|---|---|---|
| 1 | When do visible changes reach testers, with the beta starting 2026-11-17? | "Ship fixes during the beta" |
| 2 | Where do the design rules live? | "Also a live sample page": DESIGN.md as the rule book, the kit as the only place components are defined, and an admin-only page showing every component and state |
| 3 | Raised 3D buttons or the flat, faint-highlight style of the sidebar tabs? | "Let the research decide" |
| 4 | How is the work cut up? | "One milestone, sub-tickets" |
| 5 | Friends today: the status after each name | "If there's a way that we can have it instead of hasn't played yet, which is kind of long, maybe something shorter ... But either way, the name should be cut off if it's too long." Then, shown three sketches: "A: short words" ("Not yet" in the status chip, the status in its own column on the right) |

| 6 | Four recommendations: raised 3D only for a screen's one main action, flat with the tab-style hover elsewhere | "Accept all four" |
| 7 | On desktop keep Plor in the sidebar and make the page heading the page's name alone | "Accept all four" |
| 8 | Sketch two logo ideas first: the P with a piece taken and the tile with a bite | "Accept all four" |
| 9 | Shorten "on question 3" to "Question 3" | "Accept all four" |
| 10 | Add the research pages to SOURCES.md? | "Yes, add them" |
| 11 | The gap between cards, and how the raised button's edge fits | "16px gap; edge inside 44px": 16px between cards on every page; the raised button is a 40px face plus its 4px edge, 44px in all |
| 12 | Where M20 is built | "Approve the ticket only": the ticket is settled on 2026-11-16 and building starts in a later session, in whichever slot is free then |

Still to ask, each in its own sub-ticket: the heading and small-text sizes (20f), the sidebar's one left edge and the pill's and avatar's one height (20c), and 20e's four questions.

## What the team found (2026-11-16; four Sonnet subagents, read from code and the web, **nothing measured in a browser**)
**The audit of `src/app`** (branch `process-parallel-sessions` at `8d76800`, which holds `main` to #226):
- **The sidebar tabs' hover, the treatment the human likes** (`shell.module.css:225-279`): the `--soft` fill and `--text` colour, the icon's outline swapped for its solid, over `--quick` 200ms with `--ease` (`globals.css:375-376`); the current tab is 700 with a 2px `--ink` border that is always there, so nothing shifts. Only the tabs do all of it: the sidebar's Settings and Admin entries have no hover; the kit's `.row` has the fill alone.
- **Buttons:** about 12 looks, 4 from the kit. The raised look is written three times (`globals.css:426-456`, `button-link.module.css:4-49`, `kit.module.css:216-232`) and five flat buttons each undo it (`shell.module.css:82-96`, `reactions.module.css:80-155`, `race.module.css:134-150`). It is on about 25 main actions and on 50 or so minor ones (Back, the footer, "Profile", sign-in).
- **The raised button beside a field:** both are 44px boxes; the button's `0 4px 0` shadow (`0 3px 0` for `.small`) hangs below, so it reads 47 to 48px against 44px. Four rows: `friends-list.tsx:83-89`, `groups.tsx:89-95`, `groups.tsx:204-210`, `substrings.tsx:229-235`.
- **Headings:** about 15 looks in five sizes (1.25, 1.5, 1.625, 1.875, 2.5rem); only the card's 1.5rem is a kit rule. Small grey text: four sizes (0.75, 0.8125, 0.875, 0.9375rem), none in the kit.
- **Gaps between cards:** 16px on Me, Today and Streak (`me.module.css:3-7`, `today.module.css:8`, `streak.module.css:5-9`); none on Friends, Groups or a group's page, whose cards are bare siblings in `main` (`home.tsx:715-720`, `groups.tsx:195-285`).
- **Sidebar to content:** one rule for every tab (`globals.css:245`, `:303-308`), so the difference the human sees is not a per-tab value. Two guesses, *unverified*: `main` is centred in the room left, so a scrollbar moves it; the right column's flag is set after a script check (`side-column.tsx:21`). A group's page, a profile and Streak start with a Back line that pushes the first card down by its default margins.
- **The sidebar's left edges:** wordmark and avatar 12px, tab icons 21px, the Settings icon 19px (`shell.module.css:202`, `:215`, `:230-231`, `:295`).
- **Friends today** (`board.tsx:176-188`): the chip sits inline after the name, so it starts where the name ends; a long name wraps, where the leaderboard's is cut with an ellipsis (`leaderboard.module.css:98-108`).
- **Names and avatars:** none opens a profile, in about ten places (`board.tsx:179-181`, `:248-253`; `leaderboard.tsx:273-277`; `comments.tsx:405-408`; `feed.tsx:397-400`; `friends-list.tsx:107-109`, `:127-128`, `:153-155`; `groups.tsx:217-219`). The one way in is the "Profile" button (`friends-list.tsx:155`).
- **"Plor" on desktop:** `shell.tsx:256` (the sidebar) and `shell-page.tsx:20` (the h1) together from 768px; once on phones.
- **Icons:** inline SVG, strokes of 2, 2.2, 2.4 and 2.5. The sidebar's avatar is 30px; the streak pill is 29px by its CSS and "looks 34px" by DESIGN.md:66: *unverified*.

**The research** (pages the subagents read; several design-system sites returned no text and are left out):
- Raised buttons: Josh Comeau's build moves the face with `transform` so the layout box never changes, and he would not use the style on minor controls. GitHub Primer: never more than one primary button in a group. Vercel Geist: the default button is the primary action, the secondary supports it. No first-party Duolingo spec was found.
- Hover: Lichess uses one shared 150ms transition and a brightness change. Primer: never more than one active item in a list.
- People in lists: Primer and Geist step avatar sizes and tie them to the text beside them. Nothing read covers fixed widths or whether the name and avatar are both links; those are the team's own suggestions.
- Spacing: Atlassian and Primer use one named scale on a 2/4/8px base, with three stack gaps.
- Logo marks: one bold glyph or object, one or two colours, often a solid container, a one-colour version (Wordle's square, Linear's chip, Notion, WordPress). web.dev: a maskable icon keeps its content inside a centred circle of 40% radius. Where apps show their name when signed in was **not read from any page**: general knowledge only.

## Source
- **WCAG 2.2** (SOURCES.md, M14 L10): 1.4.3 contrast, 1.4.1 use of colour, 2.5.8 target size, for every changed control.
- **MDN `prefers-reduced-motion`** (SOURCES.md, M14 14c-6): every hover and press transition added.
- **docs/DESIGN.md**: the values as built; this milestone rewrites it into rules.
- **Added to SOURCES.md with this ticket (answer 10), each read by a subagent on 2026-11-16 and to be re-read by the session that builds from it:** Josh Comeau's 3D button (the face moved by `transform`; 20b); GitHub Primer (button: one primary in a group; avatar sizes; action list: one active item; size primitives); Vercel Geist (button kinds; avatar beside text); Atlassian spacing (a named scale); web.dev maskable icons (the safe circle; 20g); Apple's app-icon guide (20g).

## Sub-tickets
One PR each, from `m20-design-rules-and-clean-up`, in this order. **Every merge publishes to plor.app** (answer 1); none needs a migration. Each sub-ticket gets its own questions first where it says so.

**20a — the rule book, the kit and the sample page.** No screen a player sees changes.
- DESIGN.md gains a "Rules" part: for each component (button: main, flat, danger; text link; field; card; row; chip; avatar; heading and text styles; icon), one "when to use" line and one table of states (rest, hover, pressed, focus, disabled), each value cited to the kit.
- **The hover rule**, from the sidebar tabs: anything pressable that isn't the main button shows the `--soft` fill and `--text` colour over `--quick` with `--ease`, removed under reduced motion; an icon with an outline and a solid form swaps them. Written once in the kit and used by the tabs.
- The kit gains what it lacks and the rule needs: a flat button, a text link, the heading and small-text styles. Nothing is added that 20b to 20f don't use.
- An admin-only page, `/admin/kit`, renders each kit component in each state, in the current theme.
- → verify: an e2e opens `/admin/kit` as an admin and finds each component named in DESIGN.md's Rules; a signed-in non-admin gets what the other admin pages give.

**20b — buttons** (answers 6 and 11).
- The raised look only on a screen's main action; every other button and button-drawn link becomes the flat kit button with the hover rule. The raised button no longer stands taller than a field beside it.
- → verify: `e2e/look.e2e.ts` gains a check that, in each of the four rows above, the button's and the field's painted tops and bottoms match; and that each of the main tabs has at most one raised button in view.

**20c — spacing and alignment.**
- Cards are 16px apart on Friends, Groups and a group's page, as on Me, Today and Streak; the gap is set once, on the page's frame, not per page.
- First, measured in a browser at 1280px and 1920px: the content's left edge on each tab, with and without a scrollbar, and the streak pill's and avatar's heights. **Expected:** the left edges differ only by scrollbar width or by the right column's late flag. **Disproved if** a tab's edge differs with both ruled out; then stop and re-plan.
- The sidebar's wordmark, avatar, tab icons and Settings icon share one left edge; the streak pill and the avatar share one height; a page's first card starts at the same place with or without a Back line. Each target value is asked for once measured.
- → verify: a look e2e reads the first card's left and top edge and the gap between the first two cards on Today, Friends, Groups, Me, a group's page and a profile, and fails if they differ.

**20d — Friends today's rows** (answer 5).
- The name is cut with an ellipsis on one line; the status chip sits in its own column at the row's right; "hasn't played yet" reads "Not yet". "on question 3" reads "Question 3" (answer 9); the other statuses keep their words.
- → verify: a component test with a 40-letter name finds one line and the chip inside the row; a look e2e finds every chip's right edge equal.

**20e — names and avatars open the profile.**
- In each place listed above, the name and the avatar link to `/u/<username>`, with the hover rule. Its own questions first: your own row; a row that already opens ("Where everyone ended"); the find-player list, where a press selects; whether the "Profile" button stays.
- → verify: an e2e presses a name on the board, the leaderboard, the feed and a group's members and lands on that profile.

**20f — one "Plor", and the headings** (answer 7).
- The name shows once on desktop. Headings and small text on the shell's pages use the kit's styles; which sizes stay is asked first, from the sizes already in use.
- → verify: an e2e at 1280px finds one visible "Plor" in the shell; a script lists font sizes in `src/app/**/*.module.css` outside the kit and the game screens and finds none.

**20g — the logo mark** (answer 8; a design session on Fable).
- Sketches of the chosen directions at 16, 32, 180 and 512px, light and dark; the human picks; the mark becomes the favicon, the app icons and sits by the sidebar's wordmark.
- → verify: the manifest's and the page's icon links answer 200 with the new files; the maskable icon's content sits inside web.dev's safe circle.

## Acceptance criteria
- [ ] DESIGN.md's Rules name every component on the main tabs, and `/admin/kit` shows each.
- [ ] No stylesheet outside the kit and `globals.css` declares a button's shadow, press or hover (a script that fails on a match).
- [ ] The raised look is on main actions only; no button stands taller than the field beside it.
- [ ] Cards are the same distance apart, and start at the same left and top edge, on Today, Friends, Groups, Me, a group's page and a profile.
- [ ] Friends today: one-line names, statuses in one column, "Not yet".
- [ ] A name or avatar opens its profile everywhere 20e's answers say.
- [ ] "Plor" shows once in the desktop shell.
- [ ] The logo mark is the favicon and app icon.
- [ ] WCAG 2.2 AA holds on every changed control: contrast, a 44px target, a visible focus ring.

## Out of scope
- The two games' screens beyond their buttons following 20b (their layout, banner, prompt and timers are M14 14c's).
- The admin pages' own layout, the sign-in screens' layout, the five themes' colours, new animations beyond the hover rule.
- A component library or icon package (none is needed: Build for today).
- Anything needing a migration.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 200ms, `cubic-bezier(0.2,0.8,0.2,1)` | the hover rule | as built: `--quick`, `--ease`, `globals.css:375-376`; the human, 2026-11-16, on the tabs: "I want that to be something that's like a design rule" |
| 44px | control height and target | as built, DESIGN.md "Corners, borders, shadows"; WCAG 2.2, 2.5.8 |
| 16px | the gap between cards, on every page | as built on Me, Today and Streak; the human, 2026-11-16, answer 11 |
| a 40px face and a 4px edge, 44px in all | the raised button (20b) | the human, 2026-11-16, answer 11; the 4px is `--shadow-button` as built |
| heading and small-text sizes | 20f | **asks**: chosen from the sizes in use |
| the sidebar's one left edge; the pill's and avatar's one height | 20c | **asks**: after measuring |
| the 40% safe circle | 20g | web.dev, maskable icons (SOURCES.md) |

## Plan
1. Done 2026-11-16: the human.s answers 1 to 12, quoted above.
2. `npm run slots -- take m20-design-rules-and-clean-up` in a free slot → verify: `npm run slots` shows the branch there. (Slot 3 is the free one and waits on the human's go-ahead, HANDOFF.md.)
3. 20a to 20g in order, each: questions where named, a failing check first, the build, the `reviewer` agent, the PR, a line on what the merge changes on plor.app.
4. One full e2e run at a time on this PC (CLAUDE.md, Slots).

## Removes
Expected, each in its own sub-ticket's commit: `button-link.module.css`'s copy of the button's values; the five flat buttons' resets of the raised look; per-page card gaps on Me, Today and Streak once the frame sets it; the one-off heading and small-text sizes 20f replaces; the h1's "Plor" (answer 7).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
