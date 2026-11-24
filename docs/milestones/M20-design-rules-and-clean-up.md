# M20 — Design rules and clean-up

**Status:** building (20n-3 is built, 2026-11-24, in a PR; 20e's other lists are next). Settled with the human on 2026-11-16 (answers 1 to 12) and widened on 2026-11-17 (answers 13 to 28); approved to build on 2026-11-17: "yes, let's just get started on M20". 20a is merged (PR #258); 20d left M20 for the quick fix of inbox #250 (answer 22). The look and timings are picked (answers 34 to 36, 2026-11-17): Balanced, the pop at 300ms, the fade at 400ms. 20c is merged (#273, 2026-11-17, on green checks, the human's "merge 273 when green"; answers 42 to 44, below). 20b is merged (#277, 2026-11-17, on green checks, the human's "Merge when green"; answers 45 to 50, below). 20h is merged (#281, on green checks, the human's "Merge when green": the feed's results carry their game's 4px edge, the Balanced look's; a comment none); 20i is merged (#283, by GitHub's auto-merge on green checks, the human's "Yes, merge and go": one Period switch, Today / This week / Last week, Today on every load); 20j is merged (#286, on green checks, the human's "Merge when green": who reacted, answers 51 to 53, below). 20k is settled (answers 54 to 57) and split into 20k-1 to 20k-3; 20k-1 is merged (#288, on green checks, the human's "Yes, merge and go": every board's rows a hairline with their game's edge, your own the accent edge; every comment without a box). 20k-2 is merged (#289: the pop at 300ms everywhere, a comment arriving and a board's changed status fading in over 400ms; answers 58 and 59). 20k-3 is merged (#290: Today's cards and both games' result screens, a white card with the game's band, the score big and popping in; answers 54, 55 and 57), which ends 20k. Answer 39 (the pickers, left out of 20b) is merged (#291). 20f is merged (#292, on green checks, the human's "Merge when green"; answers 60 to 64: one "Plor" on a computer, the page's name its 30px heading; every module's text on the kit's scale). Left in M20: 20e (asks its questions first) and 20g (the logo, on Fable). Answer 49's colours for a flat button on a filled card went with the filled card.

## Goal
One written set of design rules and one kit of components that every later change builds from, and the shell and the main tabs cleaned up to follow them. Since 2026-11-17 also: the look stops reading as boring, by colour, size and motion on what comes from playing, with a calm frame around it (answers 14 to 21).

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

## The human's answers (2026-11-17, from Claude's guided questions)
The human opened the day with twelve items, each now an inbox issue (#243 to #254, the human's words in each), and: "I got a lot of comments saying that the website looked really boring [...] the most immediate thing that I want to be able to work on while the beta is going on is just the visuals." On the model: "we just need to make a one-time exception because I'm out of Fable".

| # | Asked | Answer |
|---|---|---|
| 13 | Where do the five new layout items go: the feed's comment that looks like a run out of time (#243), the two game cards' heights (#246), a group's board on top (#247), the boards as a toggle (#248), who reacted on hover (#249)? | "Add them to M20 (Recommended)" (#246 and #247 then became quick fixes, answer 22) |
| 14 | What does "more visually appealing" mean for M20, which ruled out new colours and animation? | "Add personality into M20": the rule book decides it, in 20a |
| 15 | What comes first? | "20a first, as planned (Recommended)" |
| 16 | How far does the Opus exception go? | "All of M20 except the logo": 20a to 20f (and the new sub-tickets) on Opus; 20g waits for Fable |
| 17 | What were testers reacting to? | "Too white and grey", "Everything looks the same", "Nothing moves or reacts" (not "Flat and small") |
| 18 | Which levers may M20 use? | "Colour, size and motion (Recommended)": each game's colour on its things, bigger and bolder scores and headings, small motions on moments; no art, no new font |
| 19 | Do the two games look different across the app? | "Yes, each game has its colour (Recommended)": Offbeat's and Fragments' colours on their cards, rows, feed items and chips; a comment carries no game colour, so it no longer looks like a result (#243) |
| 20 | How is the new look judged? | "Side by side on /admin/kit first (Recommended)" |
| 21 | Game or social platform? The human: "on one hand, it should be like a game. So there should be like quirky little elements to that. On the other end, I want it to be like a social platform, and most social platforms are pretty plain". Claude proposed **a calm frame, loud moments**: the frame (sidebar, headings, comments, member lists, settings, spacing) plain like a social app; what comes from playing (game cards, results, scores, board rows, the feed's results, rank changes, reactions) carries its game's colour, size and motion. With it: motion on finishing and results, boards and the feed, reactions; the game screens' own motion (the research's Route 1) after M20; the page and the five themes unchanged; your own row gains an accent edge; every timing picked by the human by eye on `/admin/kit` | "The frame can be plain, but people are saying it doesn't look right and it looks very boring. So still not sure what's going on there. Otherwise, yes, let's just get started on M20." |
| 22 | What is built overnight on 2026-11-17? | 20a, and three quick fixes on their own `fix-` branches: #246 (the cards' heights), #247 (a group's board first), #250 (Friends today's status column, answer 5: 20d leaves M20) |
| 23 | Find out what "doesn't look right" means? | "Yeah, just do both like impeccable as well as do research": an impeccable critique of every tab from screenshots, plus research, written below under "The look audit"; the human adds testers' words when they have them |
| 24 | How bold is 20a's proposed look? | "lets get 3 versions": `/admin/kit` shows the current look and three proposals, from restrained to bold |
| 25 | #246: how do the two cards match? | "you should just have the same content. Like the only thing that's really missing right now is the bottom part where it says next puzzle and ... and to be honest, it should be the same for both, right?": Fragments' card gains the next-puzzle line Offbeat's has |
| 26 | #247: a group page's order | "Board, comments, members (Recommended)" |
| 27 | #248: what the boards' switch opens on | "Today, every load (Recommended)" |
| 28 | #249: whose names show on a reaction | "Everyone's names (Recommended)": reactions are only between friends and group members, so the names are people the viewer can already see (*unverified*: to check against the code first); a long press on phones |
| 29 | *Claude's overnight decision, 2026-11-17 (the `goodnight` skill):* the hover rule is written once in the kit (`.hover`, rows, `.link`), so the tabs take it at every width; on a narrow window with a mouse, a bottom tab bar's tab now takes the soft fill too | Taken: one definition. Not taken: the tabs keep their own rule gated at 768px (a second way to write the same hover) |
| 30 | *Claude's overnight decision:* 20a does not add heading and small-text classes; `/admin/kit` shows the sizes in use, and the classes come in 20f with the sizes the human picks | Taken: no sizes chosen by Claude. Not taken: classes at today's sizes, which 20f would change again |
| 31 | *Claude's overnight decision:* the flat button is the kit's existing `.link`, given the hover rule | Taken: one flat kind. Not taken: a new `.flat` beside `.link` |
| 32 | *Claude's overnight decision:* `/admin/kit` shows each piece at rest and disabled, live under the pointer, the press and the keyboard, not frozen in each state | Taken: no test-only CSS in the kit. Not taken: forced-state classes for the sample page |
| 33 | *Claude's overnight decision:* the three looks use only values already in the app (the games' colours, the 4px button edge, sizes in use, `--line`); no game-colour tints, since nothing gives their strength in the dark themes | Taken: no invented numbers. Not taken: tints at `--soft`'s strength |

## The human's answers (2026-11-17, evening, after looking at `/admin/kit`)
| # | Asked | Answer |
|---|---|---|
| 34 | Which of the three looks (answer 24)? | "let's go for the balanced look. I think that one looks the best so far." |
| 35 | Which pop timing on the motion menu? | "I do kind of like the connections bounce. So let's keep it that.": the pop in from 90% at Connections' 300ms |
| 36 | Which fade timing? | "as for the fade in, I like the 400 ms as well": the fade in from 95% at Atlassian's xlong 400ms |
| 37 | The human: "we did the tabs like today, friends, groups, and me, like a little icon that changes when you hover over that [...] I want that to be kind of like an essential thing that's used in a lot of places [...] settings button doesn't have that." Where does the hover rule go? | "Everything pressable (Recommended)": every button, link, row and icon that can be pressed, except a screen's one raised main button, takes the soft fill; an icon with an outline and a solid form swaps them. Settings, Admin, Close and Back included (the look audit found the sidebar's Settings and Admin entries with no hover) |
| 38 | The human: "if everything is kind of square, I think the circle will stand out. I think so the close button doesn't need to be circle anymore." Which square? | "Bare icon, square fill on hover (Recommended)": the X alone, no border; the hover rule's fill is square |
| 39 | The human: "whenever there's like an arrow that you need to click, for example, switching between games, I think that arrow looks very jarring. It's not done in this style that matches the site. Like it kind of seems like a default thing." What replaces the browser's dropdowns? | "Switch for few, styled dropdown for many (Recommended)": the Offbeat / Fragments picker when posting a comment (`feed.tsx:298`, `comments.tsx:292`) becomes a switch like the leaderboard's; the leaderboard's group picker (`leaderboard.tsx:224`) stays a dropdown with the kit's own arrow and the field's border |
| 40 | The human: "Still haven't seen a fix for the streak badge next to the player thing on the top left of the screen. The fact that it's like different sizes and doesn't line up right looks quite ugly." When, and which way? | "20c next, badge matches avatar (Recommended)": 20c is built before 20b; the streak pill takes the avatar's height, on one centre line, measured first and the numbers shown to the human |
| 41 | #256 moved a group's Share, Reset, Leave and Delete into the Members card at the bottom: keep it? | "Move the groups reset into the members card at the bottom. I think that's fine." |

## 20c's measurements and answers (2026-11-17, evening)
Measured by a temporary Playwright script on slot 2's built app (`next start`, Chromium with its scrollbars shown, a fresh player with one group), at 1280 and 1920px wide, 900 and 400px tall, on Today, Friends, Groups, Me, a group's page, a profile and Streak. **The hypothesis held** (20c's "Expected"): the content's left edge is 296px on every tab at 1280px (the right column fills the room), and at 1920px it is 456px on a page that doesn't scroll and 448.5px on one that does, the scrollbar's 15px halved; nothing else moves it. Also measured: the cards on Friends and a group's page touch (0px apart; Me and a profile 16px); a group's page and a profile start their first card 60px lower than Friends and Me, under the "‹ Groups" Back line; in the sidebar the wordmark's letters and the avatar start at 28px, the tab icons at 37px and the Settings gear at 35px; the streak pill is 34px tall and the avatar 30px, already on one centre line (95px).

| # | Asked | Answer |
|---|---|---|
| 42 | The sidebar's one left edge: the wordmark's 28px or the tab icons' 37px? | "28px, the wordmark's line (Recommended)": the tab icons and the gear move left to sit under the "P" and the avatar |
| 43 | At 1920px the content moves 7.5px between a page that scrolls and one that doesn't: fix it? | "Always keep the scrollbar's room (Recommended)": CSS `scrollbar-gutter: stable`, with MDN's page added to SOURCES.md |
| 44 | The Back line pushes a detail page's first card 60px down: how does it line up? | "Back moves onto the heading's line (Recommended)": from 768px "‹ Groups" sits at the right end of the page's heading row; on phones in the top bar, in the wordmark's place; the first card starts at the same height on every page |

The pill's height is the avatar's 1.875rem (answer 40).

## 20b's answers (2026-11-17, night)
| # | Asked | Answer |
|---|---|---|
| 45 | A screen's main action today is sometimes the blue (accent) raised button, sometimes the white raised one: which? | "Always the blue raised one (Recommended)": every main action is `.primary`, raised; everything else is flat |
| 46 | Which screens does 20b change? | "Every screen (Recommended)": the tabs, a group's page, profiles, settings, sign-in, both game screens and the admin pages; a button is flat unless it is the main action |
| 47 | How is each screen's main action picked? | "I pick, you review in the PR (Recommended)": the action the screen is for, at most one raised button in view; every pick listed in the PR |
| 48 | The Settings gear has no solid version for the hover swap (answer 37) | "Draw a solid gear (Recommended)": a filled gear in the tab icons' style, swapped as the tabs' are |
| 49 | 20b's review: flat buttons on a game card (How to play, Result, the back card's Play) had dark text on the card's dark colour (WCAG 2.2 1.4.3). How do they look there? | "Like the card's chips (Recommended)": the card's white text and a see-through white edge, the chips' 50%, and the chips' 12% white fill under the pointer |
| 50 | 20b's review: the admin's Puzzles shows each game's day with its Approve, two raised buttons | "Allow both on admin pages (Recommended)": one raised button in view is the player screens' rule |

## 20k's answers (2026-11-18)
The Balanced sample on `/admin/kit` (`src/app/admin/kit/looks.tsx`, `looks.module.css`, `.balanced`) draws the moments; these settle what it leaves open for the real screens.

| # | Asked | Answer |
|---|---|---|
| 54 | Today's two game cards are filled with the game's colour; the sample draws a white card with a band in the game's colour across its top and a big score once played | "As the sample: white card, colour band (Recommended)" |
| 55 | Both games' result screens (the score mid-sentence in Offbeat's, in a table cell in Fragments', the two unlike: the look audit's 1 and 5): does 20k change them? | "Yes, both, the same way (Recommended)": the game-colour band and the big score at the top of each |
| 56 | The frame's one border level (the sample: board rows a hairline, a comment no box, a result its box and edge): where? | "Boards and comments everywhere (Recommended)": every board's rows (Friends today, a group's, the leaderboards) and every comment list (the feed, a group's comments, the game screen's thread) |
| 57 | Where the picked motions go (answers 35 and 36) | "As the menu said (Recommended)": the pop at 300ms on a reaction added, a new streak rank and the score when a card or result shows it; the fade at 400ms on a comment arriving (the feed, a group's page) and a friend's row changing on a board, comments moving from the pop to the fade |

| 58 | 20k-2: the pop also opens a reaction's ⋯ menu, which answer 57 didn't name: at 300ms too? | "Yes, one bounce everywhere (Recommended)": every pop at 300ms |
| 59 | 20k-2: on a board, fading the whole row would close a reaction menu open on it: what fades? | "The part that changed (Recommended)": the row's status chip, when it changes; nothing else on the row moves |

The score's pop (answer 57) comes with 20k-3, which makes the score its own big number.

**20k is three PRs, in order** (one per change, as each touches different screens): **20k-1** boards and comments (answer 56); **20k-2** the motion (answer 57); **20k-3** the game cards and the result screens (answers 54 and 55).

## 20f's answers (2026-11-18)
Measured first: about 100 `font-size` rules in the modules, at 19 sizes (11 to 48px), half of them on the admin pages.

| # | Asked | Answer |
|---|---|---|
| 60 | Which heading sizes stay? | "Three: 30, 24, 18 (Recommended)": 30px a page's name and the big numbers, 24px a card's heading, 18px a heading inside a card; 20, 26, 28, 32 and 40px move to the nearest |
| 61 | Which small-text sizes stay? | "Three: 14, 13, 12": 14px notes, labels and flat buttons, 13px the reactions line and dates, 12px chips and badges; 11 and 15px move to the nearest (15 to 14) |
| 62 | On a computer the page heading is the page's name alone (answer 7): how does it look? | "Biggest heading, in the text colour (Recommended)": 30px, `--text`, "Plor" read and not shown (the sidebar shows it) |
| 63 | Do the admin pages move to the scale too? | "Everything now": every module but the kit's and the game screens' (`offbeat`, `substrings`, `game`, `countdown-bar`), and `/admin/kit`'s looks, which draw the proposals as they were |
| 64 | *Claude's decision, 2026-11-18:* how the modules take the kit's sizes | Taken: the scale is seven custom properties the kit declares on the root (`--text-display` to `--text-label`), named by each module, held there by `src/app/font-sizes.test.ts`. Not taken: answer 30's classes, which would move about 60 elements' sizes from their own modules to a second class whose order against the module's own the CSS load decides (the kit's load-order notes). The same sizes either way |

## 20j's check and answers (2026-11-17, night)
**First, as 20j asks:** a reaction's count already includes only people the viewer can see: on a friend's run, the viewer and their friends (`src/reactions/reactions.ts`, `runReactions`, `seesAuthorSql`); on a comment, the viewer's friends on the friends thread or the group's members on a group's, never someone either has blocked (`commentReactions`, `seesCommentReactionSql`, `src/friends/circle.ts`). The names come from those same rows, so they show no one the viewer couldn't already see. Nothing to stop for.

| # | Asked | Answer |
|---|---|---|
| 51 | On a phone, a long press needs a hold time | "Long press, 500ms (Recommended)": Apple's default for UIKit's long press, "The default duration is 0.5 seconds." (SOURCES.md); a finger that starts scrolling cancels it, through the browser's own pointercancel, so no distance is picked |
| 52 | The names' order | "You first, then A to Z (Recommended)" |
| 53 | How the list shows | "A small box under the reaction (Recommended)": a kit piece, the chip's 1.5px ink border and small corners on the surface, 13px text (the reactions' size in the kit's looks), added to DESIGN.md's Rules and `/admin/kit` |

Still to ask, in its own sub-ticket: 20e's four questions.

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
- **Since 2026-11-17 (answers 14 to 24):** the Rules open with "a calm frame, loud moments" (answer 21): which parts are frame and which are moments, and the levers a moment may use (its game's colour, size, motion; answer 18). `/admin/kit` also shows the moments (Today's two game cards, a result card, a board with your own row, the feed's comment beside a result, a reaction) four ways: as built, and three proposals from restrained to bold (answer 24). Each motion is shown at each timing on the menu in Numbers, for the human to pick (answer 20). The proposals live only on `/admin/kit`: no player screen changes until the human picks (20k).
- **The look audit** (answer 23), before the proposals: screenshots of every tab at 375px and 1280px in the five themes, locally, read with the impeccable skill's critique, and research on what makes a social game's plain frame read as finished rather than boring; written under "The look audit" below, and the proposals answer what it finds.
- → verify: an e2e opens `/admin/kit` as an admin and finds each component named in DESIGN.md's Rules and the four looks; a signed-in non-admin gets what the other admin pages give.

**20b — buttons** (answers 6 and 11).
- The raised look only on a screen's main action; every other button and button-drawn link becomes the flat kit button with the hover rule. The raised button no longer stands taller than a field beside it.
- Since 2026-11-17 evening: the hover rule on everything pressable, Settings and Admin included (answer 37); the round Close becomes a bare icon with the square fill (answer 38); the comment's game picker becomes a switch and the group picker a dropdown with the kit's arrow (answer 39). **Answer 39 was not built in 20b's PR (#277)** (found on 20k-3's screenshots, 2026-11-18): the feed's and comments' Game picker and the leaderboard card's Friends / group picker still drew the browser's own arrow. Built after 20k in its own PR: the Game picker is the boards' `GameSwitch`; the group picker, and the admin's day picker, are the kit's Dropdown (`.select`).
- → verify: `e2e/look.e2e.ts` gains a check that, in each of the four rows above, the button's and the field's painted tops and bottoms match; and that each of the main tabs has at most one raised button in view.

**20c — spacing and alignment.**
- Cards are 16px apart on Friends, Groups and a group's page, as on Me, Today and Streak; the gap is set once, on the page's frame, not per page.
- First, measured in a browser at 1280px and 1920px: the content's left edge on each tab, with and without a scrollbar, and the streak pill's and avatar's heights. **Expected:** the left edges differ only by scrollbar width or by the right column's late flag. **Disproved if** a tab's edge differs with both ruled out; then stop and re-plan.
- The sidebar's wordmark, avatar, tab icons and Settings icon share one left edge; the streak pill and the avatar share one height; a page's first card starts at the same place with or without a Back line. Each target value is asked for once measured.
- → verify: a look e2e reads the first card's left and top edge and the gap between the first two cards on Today, Friends, Groups, Me, a group's page and a profile, and fails if they differ.

**20d — moved out (answer 22): built as the quick fix for inbox #250, branch `fix-friends-today-status`, as written below.**
**Friends today's rows** (answer 5).
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

**Added 2026-11-17 (answer 13), each after 20a, with its own questions where the look is still open:**

**20h — a comment no longer looks like a result** (#243; answer 19). A friend's result in the feed carries its game's colour; a comment carries none.
- → verify: a component test renders a comment and a result for each game and finds the game colour on the results only. *Built as an e2e (`feed.e2e.ts`): the repo has no component tests (DECISIONS.md, Test runner: Vitest for logic, Playwright for screens).*

**20i — the boards' switch** (#248; answer 27). Today, This week and Last week become one board with a switch, opening on Today every load.
- → verify: an e2e opens the Friends tab and a group's page, finds one board and the switch on Today, and reaches each period through it.

**20j — who reacted** (#249; answer 28). Hovering a reaction, or a long press on a phone, lists the names of everyone who reacted with it. First: check that a reaction is only possible between people who can see each other; if not, stop and ask.
- → verify: a db test reads the names for a reaction and finds the reactors and no one else; an e2e hovers a reaction and finds the names.

**20k — the chosen look on the moments** (answers 18 to 21, 24). The look the human picks on `/admin/kit`, with the timings picked there, goes onto the moments listed in 20a; the frame follows 20b to 20f. Picked (answers 34 to 36): Balanced, the pop at 300ms, the fade at 400ms.
- → verify: chosen when the look is: the moments' look e2e matches `/admin/kit`'s chosen version.

**Quick fixes from the same night (answer 22), each its own `fix-` branch off `main` and its own PR, not M20's:** #246 `fix-game-cards-match` (answer 25: Fragments' card gains the next-puzzle line, so both cards hold the same parts and match), #247 `fix-group-board-first` (answer 26), #250 `fix-friends-today-status` (answer 5, as 20d above).

## The human's answers (2026-11-23, a design session on Fable)
The human: "I want you to be the design agent of the website [...] focus on two components. One, like the overall website floor itself, the UI, the layout, make sure everything looks good there. And then a second agent, that one's going to run the actual individual game design, because I don't want it to look plain. I want it to each game to be stylized. [...] we tried things like pixel art. We tried stuff like low poly. I want you to suggest maybe some alternatives that don't fall under either [...] right now, each game kind of looks exactly the same with no personality."

| # | Asked | Answer |
|---|---|---|
| 65 | The pixel themes, the festival and the village were cut as "gone too far": how much of the play screen may a game's style own this time? | "A finish on the whole screen (Recommended)": each game its own background, ink colours, shapes, emblem and motion on the play screen, drawn in code; no scene and no characters. This replaces answer 18's "no art, no new font" inside a game's play screen only |
| 66 | Which styles, outside pixel art and low poly, are mocked? | All four offered: "Print shop", "Paper cut-out collage", "Game-show hardware", "Marker doodle" |
| 67 | One art style for both games, or each its own? | "Each its own style (Recommended)": the same layout and controls, a different style per game |
| 68 | What does the site design agent do first? | "Audit every screen, then fix (Recommended)": screenshots of every page at phone and desktop size, a list of what looks off against the rule book, shown to the human, then fixed in order |
| 69 | Offbeat is to become one run on a clock (HANDOFF, 2026-11-23): which Offbeat is styled? | "The new one-clock format (Recommended)": the mocks show that format; Offbeat's look is built into the app only once that milestone exists |
| 70 | Inside a game, do the colours follow the player's theme? | "The game's own colours (Recommended)": one fixed palette per game in every theme, as a drawing has (DECISIONS, Styling) |
| 71 | May a game use its own lettering for its big moments? | "Yes, one display face per game (Recommended)": the question, the chunk and the score; everything read or typed stays in Baloo 2. Building it into the app changes "one font" and needs its DECISIONS entry then; the mocks need none |
| 72 | How many mocks? | "My best two per game (Recommended)": Offbeat as game-show hardware and as print shop; Fragments as paper cut-out and as marker doodle; private pages that change nothing in the app |
| 73 | 20m's ticket, as drafted | "Approve 20m" |

**20l — the second look audit** (answer 68). The first audit (below) read the app as it was before 20b to 20k. This one reads it as built now.
- Screenshots of every player screen at 390 × 844 and 1280 × 720 (CLAUDE.md's two `@visual` sizes) in the five themes, from a fixture scene on slot 2's local stack; the capture is a kept script this time (it has now run twice: CLAUDE.md, "Repeated procedures are scripts").
- The design session reads them with the impeccable skill against DESIGN.md's Rules and writes a ranked list under "The second look audit" below; the human picks what is fixed; each fix is then its own sub-ticket or quick fix with its own check.
- → verify: the capture's run prints one file per screen, size and theme and exits non-zero if a screen fails to load; the local database holds no fixture rows afterwards.

**20m — a style per game, as four private mocks** (answers 65 to 67, 69 to 73): `M20-20m-game-look-mocks.md`. It builds nothing into the app; the look the human picks becomes its own ticket.

## The second look audit
*2026-11-23 (20l, answer 68).* `npm run look-audit` (with `LOOK_AUDIT_OUT` set) took 354 full-page pictures on slot 2's built app and local stack: 46 screens at 390 × 844 and 1280 × 720 in the five themes (signed-out screens in Paper and Night only: a signed-out page follows the device), 0 failed; the fixture rows were gone afterwards (the capture agent's check). The pictures are in the session's scratch folder, not the repo. The impeccable skill's critique ran as two subagents that did not see each other's output: a design review on Fable from the pictures, DESIGN.md and the code, and a mechanical scan on Sonnet. The lead session looked at `today--1280--paper` and `front--1280--paper` and read the code behind 1, 4 and 11. Not captured: Fragments' time-up and between-round states, Offbeat's caught screen, the Overall board's Average, an error state. The "This week" boards were empty (a Monday). Contrast figures are the reviewer's arithmetic from DESIGN.md's colours, not measured. Nielsen's ten heuristics: 24 of 40; five of eight cognitive-load checks fail (single focus, grouping, hierarchy, choices per decision, progressive disclosure).

**The mechanical scan:** the detector's two findings are both the "you" row's 4px inset edge (`kit.module.css:402`, `admin/kit/looks.module.css:110`), the look the human picked (answer 34): not acted on. On `/`, `/about` and `/?sign-in` at both sizes: no console error, no sideways scroll, lowest text contrast 7.84 to 1; "Play Offbeat without an account" and "Email me a sign-in code" measure 40px tall (the raised button's face, answer 11); About's links inside sentences are 25px tall.

Ranked, most damaging first; **P1** a broken layout or real confusion, **P2** an annoyance, **P3** polish; *left over (n)* is the first audit's number. Nothing here is decided: the human picks.
1. **P1, new.** The chosen game in the comment box's switch is grey on the ink fill, unreadable in every theme: `comments.module.css:14` (`.compose label`, muted) outranks `leaderboard.module.css:43` (`.on`), since the switch's choices are labels.
2. **P1, left over (7).** On a phone, Your friends breaks a name one or two letters a line beside Profile, Remove and Block (`friends-list.tsx:150-165`).
3. **P1, new.** A finished Today has no focal point after the score, the phone has no board, and places 1 to 3 on every board look like place 4 (inbox #268).
4. **P1, left over (6).** Desktop Today shows half a card and a carousel: the side-by-side layout needs a 768px row (`today-cards.tsx:103`) and at 1280px the row is 592px.
5. **P1, left over (9).** The signed-out front page is a plain document, headed "Today's game: Offbeat" with two games, five outlined buttons, hugging the left at 1280px.
6. **P1, left over (5).** Fragments' start and result screens lack what Offbeat's have (the band before a run, Back, the page's name, Today marked); on a phone its card and comments touch.
7. **P1, left over (4).** Safe and caught are still words; the recap is a sentence with Search answers wrapped into it.
8. **P1, new.** A game's start screen is the band over an empty strip, with the rules and Start outside the card.
9. **P2, new.** A chip, a count, a flat button and a row all share the white fill and ink outline, so everything looks pressable; Groups' list of groups is a flat button.
10. **P2, new.** A leaderboard opens with three stacked switches, a field, two notes and a button before any row; two different "Find a player" fields follow each other.
11. **P2, left over (7).** Today's Leaderboard period switch leaves an empty fourth cell (`leaderboard.tsx:231` passes no `--choices`).
12. **P2, new.** At 1280px the page's name sits under 95px of nothing and the three columns start at three heights; "Groups" heads a card headed "Groups"; a group's page is named "Groups", Streak "Me".
13. **P2, new.** Width is unmanaged on single-card pages: a 928px email field, 900px buttons on not-found, the invite and Offbeat's reveal.
14. **P2, new.** Me's calendar is 23 blank outlined cells with no dates; each game's card leads with a blank coloured square; "Fragments's", "1 days played".
15. **P2, new.** A group's page opens on the rename form and ends with five buttons on three ragged lines (their place in Members is answer 41: only the arrangement is in question).
16. **P2, new.** First-run empties: Friends today a bare heading, a feed with two "nothing yet" lines, a new player's game screen of dashes.
17. **P2, new.** On a phone "Friends (1)" wraps and drops the tab's label out of line.
18. **P2, new.** Friends today says each result twice, and the caught chip is three lines in the right column.
19. **P2, left over (7).** The feed's chip still wraps in the right column.
20. **P2, new.** Back sits in three places: the top bar, Offbeat's content, nowhere on Fragments (short of answer 44).
21. **P2, new.** With Fragments' card in front and unplayed, its Play is the flat button (*unverified* whether intended).
22. **P2, new.** The two cards' bands differ in height on a phone (Fragments' date wraps), and a card's height changes with its state.
23. **P2, new.** How to play is four paragraphs with no example; Previous looks live on step 1.
24. **P2, new.** Overall's scores ("2.9") carry no unit; four players on 0 are ranked 1 to 4.
25. **P3, new.** The × is a small glyph in its 44px target.
26. **P3, new.** Streak's phone grid has uneven columns.
27. **P3, new.** About's licence block is a second typeface; Privacy on a phone is one long list.
28. **P3, new.** The signed-out group invite names neither group nor inviter (*unverified* whether deliberate).
29. **P3, new.** The graph's grey lines are unnamed; "Ana 36 / You 35" collide.
30. **P3, new.** Offbeat's question card is the soft tint, Fragments' round card white (moot once a game's own look is built).

**Themes:** the game-colour edge on board and feed rows nearly vanishes in Night, Moonlit and Ink; Moonlit's muted text reads as links and its disabled Answer looks live; Ink's white 2px lines dominate (left over, 10). The first audit's 1, 2, 3, 8 and 11 are fixed; 13 can't be seen in stills; 12 could not be told from this fixture.

**The human's answers to the audit (2026-11-23):**

| # | Asked | Answer |
|---|---|---|
| 74 | Thirty findings, eight of them P1: how much is fixed in this pass? | "The top 8, in order (Recommended)": each its own small change with its own check, the one-rule fixes first; the rest wait for a second pass |
| 75 | Chips, counts, flat buttons and rows share the white fill and ink outline (finding 9): do chips and badges lose the outline? | "Show me on the sample page": the outlined and the soft-filled versions side by side on `/admin/kit` in the five themes; the human picks |
| 76 | May the site carry drawn character outside a game (answer 18 said no art): a small emblem per game on its card, on Me and on the signed-out front page? | "Yes, simple emblems now": a small vector emblem per game, drawn like the streak's flowers; likely redrawn once a game's own style is chosen (20m) |
| 77 | When both games are played, what is Today mainly for? | "Where I stand among friends": a strip under the cards says the player's place today and opens the board; the top three stand out; the feed follows |

**20n — the audit's top eight** (answer 74), one PR each, in this order; each that changes a look asks its own questions first:
- **20n-1:** findings 1 and 11, the two one-rule faults (the comment box's chosen game is readable; the period switch has no empty cell). → verify: an e2e reads the chosen choice's computed colour and background in the comment box and finds the board switch's pair; an e2e finds Today's period switch's three choices on one line at 1280px. Both fail first. **Built 2026-11-23:** `.compose label` became `.compose > label` (`comments.module.css:14`; specificity 0,1,1 had beaten `.on`'s 0,1,0); the Period strip passes `--choices: 3` (`leaderboard.tsx:231`). `feed.e2e.ts:287` failed first (colour `rgb(95, 95, 90)` and 13px where the board's switch has `rgb(250, 250, 248)` and 14px) and `today.e2e.ts:115` failed first (two rows, expected one); then 4 passed, the two new and the two existing composer tests (chromium, targeted). Lint, `npm test` (869 passed) and tsc clean. Reviewed (the `reviewer` agent, with 20l's script): nothing blocking; three items on the script in ROADMAP, For M20. **Merged as #296** (2026-11-23, on nine green checks, the human's "Merge when green"). Not asserted directly: the group page's composer (the same one rule). Not run locally: the full e2e suite; CI runs it.
- **20n-2:** finding 4, desktop Today's two cards side by side. The 768px row width is M16 16f's answers 42 and 43: the new number is asked first. **Answer 78** (the human, 2026-11-23, asked "How narrow may the row get before the cards stack?", with the 1280px window's 592px row and the options 560px, 480px, "Keep 768px, widen the page" and "Show me first"): "560px (Recommended)". It replaces 16f's 768px for the cards' row only; the app's 768px tablet width (`src/app/min-width.ts`) and "a tablet keeps the carousel" stand. → verify: an e2e at 1280 × 720 finds the two cards side by side with no arrows (fails first: the row is 592px), a tablet's still a carousel, and neither card's heading on more than two lines. **Built 2026-11-23:** `today-cards.tsx`'s `Carousel` reads `clientWidth >= 560`; `e2e/today-games.e2e.ts`'s side-by-side test, given a 1280 × 720 step, failed first at its "no arrows" line on the old rule and passes on the new. `npm run look-audit` (354 pictures, 0 failed) shows the two cards side by side at 1280px before, during and after the runs, each name on one line. Lint, `tsc` and `npm test` (869) pass. The full e2e: 215 passed and 6 failed, none in the cards' or boards' files; the five files that held them pass alone (27 of 27) once two stale fixture puzzles and five fixture players, left in slot 2's local database by a run that crossed midnight, were removed. The reviewer (sonnet, fresh context): one blocking item, the file's header still said 768px, fixed; three items in ROADMAP, For M20. The window widths in DESIGN.md are computed, not measured. **Merged as #299** (2026-11-24, on nine green checks, the human's "Merge when green").
- **20n-3:** finding 2, Your friends' rows on a phone (with 20e, which touches the same rows). **Answers 79 to 82** (the human, 2026-11-24; these are also 20e's four questions):
  - 79, "Where should those three go?" (Profile, Remove and Block on a friend's row): "Name opens profile, ⋯ menu (Recommended)": the avatar and name link to the profile; Remove and Block are in a ⋯ menu at the row's end, like the feed's.
  - 80, "should the separate \"Profile\" buttons stay anywhere?": "Remove them all (Recommended)".
  - 81, "When a name is your own ... what should pressing it do?": "Open the Me tab (Recommended)".
  - 82, rows that already open ("Where everyone ended", the find-a-player list): "Row keeps its job (Recommended)": there the name is not a profile link.
  - **20n-3's part** (this PR): Your friends' rows, answers 79 and 80. → verify: an e2e at 390 × 844 finds a friend's long name on one line as the link to their profile, with the ⋯ holding Remove and Block, and no "Profile" link on the page. **Built 2026-11-24:** `src/app/player-link.tsx` (the avatar and name as one link, one line, 44px) on Your friends' rows, with `ReactMenu` (`reactions.tsx`, its `reactions` now optional) holding Remove and Block; the Profile button is gone. `e2e/friend-requests.e2e.ts`'s new phone test failed first (no link named by the name) and passes; `account`, `calm`, `profile` and the file's first test open the ⋯ or press the name. Lint, `tsc` and `npm test` (870) pass. The full e2e: 220 passed, 2 failed on timeouts (`feel`, `play2`), and both files and `profile` pass alone (17 of 17). `npm run look-audit` (354 pictures) shows the rows at 390px, one line each. The reviewer (sonnet, fresh context): two blocking items in code and docs (`profile.e2e.ts` still looked for "<name>'s profile"; a DESIGN.md line still described the Profile button), fixed; the rest in ROADMAP, For M20. **Source diff:** answer 79 says the ⋯ is "like the feed's", so on a device that hovers it shows only while its row is hovered or has focus (inbox #270's rule); the human is told. **20e's part** (the next PR): answers 81 and 82 and the other lists. → verify: an e2e presses a name on the board, the leaderboard, the feed and a group's members and lands on that profile, and presses its own and lands on Me.
- **20n-4:** findings 6 and 8, one start and result header for both games, and the start screen's rules and Start inside the card.
- **20n-5:** finding 7, the recap's rows and the reveal's safe or caught colour.
- **20n-6:** finding 3 with answer 77 and inbox #268: the place strip on Today and the top three on a board; its look is asked first.
- **20n-7:** finding 5 with answer 76: the signed-out front page as the two game cards, and the two emblems (a design step on Fable, picked by the human as the flowers were).
- **Beside them, not a fix:** answer 75's two chip versions on `/admin/kit`.

**What works, to keep:** the play frames (one question, one field, one button); Streak's flowers, the only drawn things in the app; the hairline board rows with the "you" row.

## The look audit
*Filled in by the overnight session of 2026-11-17 (answer 23).* An Opus subagent built the branch at 20a's start, served it on port 3002 against slot 2's local stack with a fixture scene (the viewer played both games; one friend finished both, one partway, one not yet; a group with comments and reactions), and took 160 full-page screenshots: 16 screens, at 375px and 1280px, in the five themes. It critiqued them with the impeccable skill, in one context (no human to ask), and the local database was checked clean afterwards. The screenshots are outside the repo, in the session's scratch folder (`look-audit/shots/`). A second (Sonnet) subagent did the web research, kept in `docs/research/research_notes/2026-11-17 calm frame, loud moments.md`. Nothing here was measured on plor.app or on a real phone.

Ranked, most damaging first; each marks **frame** or **moment** (answer 21) and where M20 takes it:
1. **The score is the smallest thing on screen** (moment). The game cards' score is a 12px chip while the game's name is 40px (`game.tsx:512`, `:528-537`; `today-fragments.tsx:38`); the result card puts it mid-sentence (`game.tsx:766-772`); Fragments' total is a 1rem table cell (`substrings.tsx:272-321`). → the looks on `/admin/kit` make the score the main thing at three sizes; 20k.
2. **Everything is a box inside a box** (frame). Cards 2px, rows, chips, switches, avatars and badges 1.5px, all in ink (`kit.module.css`); on Friends and a group's page cards touch, so their borders double into a 4px line. → 20c (the 16px gap), and the Balanced and Bold looks drop rows to a hairline; the border levels are a question for the human with the looks.
3. **A comment, a result and a score look the same in the feed** (moment; `feed.tsx:348`, `:418`). Confirms #243. → 20h.
4. **Colour lives only on the two banners and the blue button** (moment). `--safe` and `--caught` are used only by Friends today's chips and yesterday's card; the recap and result say "(safe, +25 points)" as words (`game.tsx:442-449`, `:778-782`). → 20k; the safe and caught colours on answer rows are a new item for the human's pick.
5. **The two games' result screens don't match** (moment). Offbeat's has the banner and marks Today; Fragments' has neither (`substrings.tsx:106-108`). → new, for the human: not in M20's list.
6. **Desktop Today shows a half card** (moment). At 1280px with the right column, the cards' row is under 768px, so they stay a carousel with the plum card cut off (`today-cards.tsx:98-111`). → new, for the human; close to #246.
7. **Layouts that break** (frame): on phones, Your friends rows wrap a name one letter per line beside Profile, Remove and Block (`friends-list.tsx:152-165`); the feed's chip "Offbeat · Book Club · 3:54 AM" wraps in the right column; Today's leaderboard switch leaves an empty fourth cell (`leaderboard.tsx:32-44`); a status chip is a whole sentence, "started (you'll see how it's going once you finish)" (`board.tsx:219`). → the switch goes with 20i; the friends rows with 20e; the others new, for the human.
8. **Four button looks on one group page** (frame), with the group's settings above the board. → 20b; the settings' place goes with #247's order (answer 26).
9. **The signed-out front page is a plain document** (moment; the first impression): no banner, no game colour, headed "Today's game: Offbeat" though there are two (`(shell)/page.tsx:23-27`, `home.tsx:299-325`). → new, for the human.
10. **Moonlit nearly hides Offbeat's navy banner; Ink's white lines dominate** (`globals.css:35-40`). The themes are out of scope (answer 21) → for the human.
11. **"Plor" twice on desktop, the page's name in grey** → 20f.
12. **Two identities**: the sidebar avatar's letter comes from the username, the feed's from the display name (`shell.tsx:259`; `me.tsx:79-81`); *unverified* whether intended → for the human.
13. **Nothing moves on the moments**: count-ups only on Me and the streak pill (`shown.ts`) → the motion menu on `/admin/kit`; 20k.

The audit's three that would change the feel most: the score as the main thing, in its game's colour, counting up once; one border level for the frame; the games' colours out of the banners (safe and caught on answer rows, the game's colour on its rows, chips and feed items, both cards side by side on desktop).

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
- The admin pages' own layout, the sign-in screens' layout, the five themes' colours and the page's background (answer 21), new animations beyond the hover rule and the moments' motions (answer 21).
- The game screens' own motion, the research's Route 1 (answer 21: after M20).
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
| 28px | the sidebar's one left edge (20c) | as built: the wordmark's letters, the nav's 16px padding and `.word`'s 12px (`shell.module.css`); the human, answer 42 |
| 1.875rem (30px) | the streak pill's height, the avatar's (20c) | as built: `avatar.module.css` `.slot`; the human, answer 40 |
| 16px | the gap between cards on Friends, Groups and a group's page (20c) | answer 11, above |
| the 40% safe circle | 20g | web.dev, maskable icons (SOURCES.md) |
| the menu of motion timings shown on `/admin/kit`: a pop in from 90% at Wordle's 100ms, Plor's 200ms and Connections' 300ms; a fade in from 95% at Carbon's moderate-02 240ms, Material's medium1 250ms and Atlassian's xlong 400ms | 20a (shown only), 20k (the picked ones) | the pop's timings: `docs/research/reports/Game look directions for Plor.md`, "Try Route 1 first" ("a menu, not a recommendation"); the pop's 90% start: the app's pops as built (`kit.module.css` `.pop`, DESIGN.md Motion); the fade's timings and its 95% start (Atlassian's entrance): `docs/research/research_notes/2026-11-17 calm frame, loud moments.md`, "Motion menu", each with its page; **the human picks** (answer 20) |
| the three proposals' colour strengths and sizes | 20a (shown only) | the five themes' slots and the games' colours as built (DESIGN.md, "Colour slots and themes"); sizes from those in use; **the human picks** one version (answer 24) |

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
| 20a: the kit gains a flat button, a text link, the heading and small-text styles | The flat button is `.link` with the hover rule; the text link is the base `a`; no heading or small-text classes yet, `/admin/kit` shows the sizes in use | Answers 30 and 31 (overnight decisions): one way each; no sizes chosen before 20f asks |
| 20a: `/admin/kit` renders each component in each state | At rest and disabled; hover, press and focus live | Answer 32 (overnight decision) |
| Research report: timings "a menu, not a recommendation" | `/admin/kit` plays each motion at each menu timing; none is used on a player screen | The human picks (answer 20); 20k uses the picks |
| The report's menu also names Wordle's 600ms shake and BombParty's 500ms and 600ms | Not shown; a fade in from the research notes' design systems is shown instead | The shake is a refused word's motion, on the game screens, after M20 (answer 21); the feed and the boards need an entrance, which the notes' sources give |
| The ticket's Numbers listed the menu before the research notes existed | Numbers now list the fade's three timings and the 95% and 90% starts, each with its source | 20a's review: every number's origin in the ticket |

## Evidence
**20a (2026-11-17, overnight, slot 2):**
- After the review's fix: `e2e/kit.e2e.ts`, `alive`, `admin-area` and `groups` e2e: 13 passed.
- `npm run test:e2e -- e2e/kit.e2e.ts`: "an admin finds every piece of the Rules and the four looks on /admin/kit" and "a player who isn't an admin gets the refusal on /admin/kit": 2 passed. The first reads the pieces from DESIGN.md's Rules table, so a piece named there and missing from the page fails it.
- `npm run test:e2e -- e2e/admin-area.e2e.ts e2e/shell.e2e.ts e2e/look.e2e.ts e2e/kit.e2e.ts`: 23 passed (the two admin sub-tab lists gained "Kit"); `e2e/alive.e2e.ts` (the tabs' and rows' hover): 4 passed.
- `npm test`: 71 files, 822 tests passed. `npx tsc --noEmit -p .` and `npx eslint` on the changed files: clean.
- Screenshots of `/admin/kit` at 1280px and 375px in the five themes, and each look alone, in the session's scratch folder (`look-audit/kit-shots/`).
- Each Next.js build stops once with a "SecurityFatalError" saying this Next.js has a known vulnerability, and passes when run again; the upgrade it names is for the human (HANDOFF.md).

## Review
**20a** (the `reviewer` agent, Sonnet, fresh context, 2026-11-17):
- Blocking findings and how each was fixed: (1) the hover rule turned a danger flat button's and a danger row's text to `--text` under the pointer ("Reset link", "Delete group", the admin's warning rows): `e2e/kit.e2e.ts` gained a check, red first (expected `rgb(180, 35, 47)`, received `rgb(26, 26, 24)`), then the kit keeps the danger text (`kit.module.css:112-116`), green. (2) The motion menu's fade timings and its 95% and 90% starts had no origin in the ticket: added to Numbers with their sources, and the Source diff says why the shake isn't shown.
- Deferred to ROADMAP "Next revision": heading levels and the sample reactions' names on `/admin/kit`; DESIGN.md's two tables; no e2e of the flat button's hover; the audit's items for the human; the Next.js security notice.
