# M20 — Design rules and clean-up

**Status:** building. Settled with the human on 2026-11-16 (answers 1 to 12) and widened on 2026-11-17 (answers 13 to 28); approved to build on 2026-11-17: "yes, let's just get started on M20". 20a is merged (PR #258); 20d left M20 for the quick fix of inbox #250 (answer 22). The look and timings are picked (answers 34 to 36, 2026-11-17): Balanced, the pop at 300ms, the fade at 400ms. 20c is merged (#273, 2026-11-17, on green checks, the human's "merge 273 when green"; answers 42 to 44, below); next 20b (answer 40).

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

Still to ask, each in its own sub-ticket: the heading and small-text sizes (20f), 20e's four questions.

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
- Since 2026-11-17 evening: the hover rule on everything pressable, Settings and Admin included (answer 37); the round Close becomes a bare icon with the square fill (answer 38); the comment's game picker becomes a switch and the group picker a dropdown with the kit's arrow (answer 39).
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
- → verify: a component test renders a comment and a result for each game and finds the game colour on the results only.

**20i — the boards' switch** (#248; answer 27). Today, This week and Last week become one board with a switch, opening on Today every load.
- → verify: an e2e opens the Friends tab and a group's page, finds one board and the switch on Today, and reaches each period through it.

**20j — who reacted** (#249; answer 28). Hovering a reaction, or a long press on a phone, lists the names of everyone who reacted with it. First: check that a reaction is only possible between people who can see each other; if not, stop and ask.
- → verify: a db test reads the names for a reaction and finds the reactors and no one else; an e2e hovers a reaction and finds the names.

**20k — the chosen look on the moments** (answers 18 to 21, 24). The look the human picks on `/admin/kit`, with the timings picked there, goes onto the moments listed in 20a; the frame follows 20b to 20f. Picked (answers 34 to 36): Balanced, the pop at 300ms, the fade at 400ms.
- → verify: chosen when the look is: the moments' look e2e matches `/admin/kit`'s chosen version.

**Quick fixes from the same night (answer 22), each its own `fix-` branch off `main` and its own PR, not M20's:** #246 `fix-game-cards-match` (answer 25: Fragments' card gains the next-puzzle line, so both cards hold the same parts and match), #247 `fix-group-board-first` (answer 26), #250 `fix-friends-today-status` (answer 5, as 20d above).

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
