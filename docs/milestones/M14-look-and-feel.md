# M14 — Look and feel

**Status:** in progress, alongside M13 (human, 2026-10-24: "while the other session works on database and answer generating can we do the layout stuff here"). 14a (structure and UX) and 14b (the visual system) are built; ROADMAP's M14 row lists the sub-tickets and PRs, and `docs/DESIGN.md` describes what shipped. 14c, the game's world, starts from guided questions (14b-7, answer 9: "Clear it too"). L7 is answered by M04's G5. L11 is still open (M04's G6 is open and moved to M13 answer lists).

## Goal
Give every screen a finished, phone-first look, once every screen works.

## Who uses it / what breaks without it
- Used by: every player, on every screen: the game's screens today and every screen the functional milestones M06–M12 add.
- Breaks without it: the game plays on M02's plain functional UI. Every screen the functional milestones add (M06–M12) stays plain until this milestone. The human first moved this milestone ahead of the social features (human, 2026-10-20: "Polish the game first"), then moved the whole look, pixel art included, after the MVP, which is the game mechanics only (human, 2026-10-20: "the pixel-art look moves after the MVP too"; M04), and on 2026-10-21 after everything functional (human).

## Source
No entry in `docs/SOURCES.md` covers visual design or accessibility yet, and only a human can add one (SOURCES.md, Rules). L10 asks for one. Until then, the work follows:
- `docs/DECISIONS.md`, Game 1 (7 questions, rising difficulty, sudden death, host answers shown only after the player answers) and Client platform (mobile-first web app).
- The Google sign-in branding guidelines (Google Identity docs) for the "Continue with Google" button: not in SOURCES.md, so they need to be added and read before the sign-in screen is restyled (L13).

## Scope
The look comes after every functional milestone (human, 2026-10-21), so the scope is the screens that exist today (`src/app/page.tsx`, `home.tsx`, `game.tsx`, `privacy/`) plus every screen M06–M12 add:
1. Sign-in (Google and email code; the privacy link; the intro that Google's brand check needs, M02 2c).
2. Pick a username.
3. Signed-in home and start.
4. Question (built in M04): the typed answer box with no list, the 20-second countdown, the stolen-letters line and the blocked-key message ("The Wind took X"), and the "isn't in our list" retry.
5. Reveal: the points and the next steal, with Next.
6. Caught: the run ends at a question.
7. Result: caught, time's up or survived; the reset countdown; the Share button (M05) and its placeholder symbols (ROADMAP Next revision).
8. Errors and loading.
9. The admin pages (insights, M03; puzzle entry, M06): "everything should look nice eventually" (human, 2026-10-21).
10. Every screen added by M07 friends and live board, M08 comments and reactions, M09 points and friends leaderboard, M10 groups, M11 home screen and M12 account.

## Decisions needed before any code
| # | Decision | Answer (origin) |
|---|---|---|
| L3 | Colours: Plor's shell | "Neutral + one accent", then themes (L20) (human, 2026-10-24) |
| L4 | Fonts | Baloo 2, one font for all text (14b-6d; human, 2026-10-28: "baloo 2") |
| L5 | Light, dark, or follow the phone's setting | "Both, with a toggle", folded into themes (L20): "Follow the phone" picks Paper or Night, and a named theme overrides it (human, 2026-10-24) |
| L7 | Safe answer: its own moment with a "Next" tap, or straight on to the next question | Answered by M04's G5 (a game-flow rule) |
| L9 | Smallest phone width to support (a human number) | **360px** (human, 2026-10-24) |
| L10 | Accessibility source: pin WCAG 2.2 in SOURCES.md (only a human adds a source). Contrast ratios and tap-target sizes come from it | "Yes, WCAG 2.2 AA" (human, 2026-10-24); pinned in SOURCES.md |
| L11 | Puzzles while building: preview with the `content-rehearsal` days locally, or put real days back on the calendar now. Each day published now is one fewer left for the beta (M15) | |
| L13 | Add the Google sign-in branding guidelines to SOURCES.md (only a human adds a source) | |
| L16 | What this pass covers | "14a + 14b visual system" now; 14c, the game's world, after (human, 2026-10-24) |
| L17 | How a player moves around | "bottom tab bar for the mobile but desktop should have a more desktop friendly layout (shouldn't be just mobile layout copy pasted and wider)". Tabs: "Today, Friends, Groups, Account". Desktop: "Sidebar + columns" (navigation left, the game in the middle, the friends board and feed on the right) (human, 2026-10-24) |
| L18 | Navigation during a run | "Navigation stays". Tapping another tab mid-question: "Just go, timer runs". Kept once Claude pointed out that a timeout ends the run: "Keep it, show the clock", so the bar to return shows the seconds left (human, 2026-10-24). Built in 14a-2 (human, 2026-10-25: "Yes, put L18's clock … in 14a-2") |
| L19 | The admin pages | "Yes, same pass" (human, 2026-10-24) |
| L20 | Themes | Preset themes like monkeytype's, "not that many", and no custom themes; every preset passes L10. The choice is saved "On the account" (a column, so a migration) (human, 2026-10-24) |
| L21 | Which presets | The human left it to Claude ("pick in your reply"): Follow the phone (Paper or Night), plus Sky, Moonlit and Ink (2026-10-24). Moonlit is monkeytype's "rose pine moon" colours, renamed, with a visible divider colour added. Colour values aren't copyrightable (37 CFR 202.1(a)), while monkeytype's code (GPL-3.0) and the names (keycap sets, editor themes) aren't used. The human asked for that check: "if it's okay then use some of those" |
| L22 | The game's entry on Today | "a large rectangle (takes up entire width) with the text of the game, and THAT is what is stylized. then u can like swipe left or right to navigate to the next game" (human, 2026-10-24; as M11 H1 asked). Claude's additions, accepted ("Yes, draw the next round with the game banners (peek and dots)"): the next banner peeks in with page dots; one game shows one banner and no dots until game 2 (M11 H8); desktop uses arrows and keys |
| L23 | The tab bar during a run | "Always the theme" (human, 2026-10-24) |
| L24 | The missing states to draw first | "Missing states": the result screen, Today after playing, empty friends and groups, how to play (human, 2026-10-24) |
| L25 | Today's banner and the game screen | "play button should be centered at the bottom of the tile", and Play opens "a seperate screen where THERE you can press 'how to play', it shouldn't be on the home feed". The game screen shows "Start and How to play", "Your stats for this game", "Yesterday's answers" and "This game's comments". Yesterday's board "should have date" (human, 2026-10-24) |
| L26 | The streak | "should have a little animation or emoji, perhaps increasing with numbers": "Plor's own symbol" (human, 2026-10-24). Candidates drawn: a sprout, a ridge flag, a kite; the human chose "Streak symbol: sprout." (2026-10-24). Stages (human, 2026-10-24): "1-5 days: sprout, 5-15 days: first stage, 15-30 days: next, 30+: last". The shared days start the next stage: "1–4 sprout, 5–14, 15–29, 30+" (human, 2026-10-24) |
| L27 | The feed with more than one game | "Feed should be shared between all games, so if you played another game and not offbeat u should be able to see the other games' comments but not offbeat's" (human, 2026-10-24). Today's feed is Offbeat's alone, so this is a functional change for M16, not M14 |
| L28 | The tab icons | "they can still be more neutral, just redraft them (the friends icon looks like microsoft teams...)" (human, 2026-10-24) |
| L29 | How to play | "reworded a bit, maybe a more friendly tone, maybe more thematic" (human, 2026-10-24); built in 14a-2b |
| L31 | Empty friends and the weekly board | The empty text "should be more generalized and friendly, because other games wont be 'getting caught' and people might only want to play one game". The weekly board switches between games (human, 2026-10-24). The overall view: "Decide at game 2" (M16) |
| L33 | How styles are written | "CSS Modules + CSS variables (Recommended)" (human, 2026-10-24); goes into DECISIONS.md with the first build PR, replacing `globals.css` as the only stylesheet |
| L34 | Yesterday's answers on the game screen | "Yes, once the day is closed": every signed-in player sees a closed day's host answers (human, 2026-10-24). A new data exposure, so a security change for the human's approval when built |
| L35 | "Your Offbeat" stats | "Streak for this game, Best score, Average questions survived, Last 7 days chart" (human, 2026-10-24) |
| L37 | Profile pictures | "another feature account should have is a profile picture" (human, 2026-10-24): "Pick from Plor's avatars" (no uploads), built in "Its own ticket after M14 (Recommended)", shown on "Account and sidebar, Boards, Comments, Group member lists". M14 leaves a round slot by every name in those places, holding the player's initial until avatars ship |
| L38 | Desktop Today's games | "All games side by side" (human, 2026-10-24): no carousel on desktop; swiping stays on phone |
| L39 | Play, then Start | "allow a toggle in settings" (human, 2026-10-24): an Account setting to go straight to question 1 from Play. Claude's default, from L25: off, so Play opens the game screen until a player turns it on |
| L40 | Comments you can't read yet | "Who commented, blurred text" (human, 2026-10-24). The blurred text is filler shapes, never the real comment, which isn't sent until the player has played (real blurred text would reach screen readers and find-in-page) |
| L41 | Today's boards and feed (desktop) | "One board, wide feed" (human, 2026-10-24): one leaderboard card with a Yesterday / This week switch and one group picker; the feed spans the centre |
| L42 | Breakpoints | The human asked Claude to choose ("suggest for me", 2026-10-24). **Below 768px:** the phone layout with the bottom tab bar. **768–1199px:** the sidebar and one centre column; Friends today and the leaderboard move into it under the games, and games sit side by side while two fit (two banners need about 500px). **1200px and up:** the right column. The design target stays 360px (L9), and nothing may break down to 320px (WCAG 2.2, 1.4.10 Reflow) |
| L43 | White space | Asked whether to leave room for later features (human, 2026-10-24). Claude's answer, per "Build for today": no empty columns held for future features. A page with nothing for a side column drops it and centres its content in a column at most 960px wide (Account); a column whose content grows in real use stays (the game screen's comments) |

## Acceptance criteria
| L44 | Settings | "we should have a settings tab that like pops out when u click it instead of some of the other stuff" (human, 2026-10-24): a "Gear in the top bar (Recommended)" (and at the bottom of the desktop sidebar), opening a "Sheet on phone, side panel on desktop (Recommended)". It holds the theme, the skip setting (L39), username and display name, sign out and delete account |
| L45 | The Account tab becomes "Me" | "account should mainly show your individual stats" and the tab is renamed "Me" (human, 2026-10-24). It shows "Totals across games, A card per game, Calendar of days played, Your rarest answers". It replaces L17's "Account" tab name |
| L46 | Numbers on the calendar | "the colormap of days surivved should also show numbers if u want (setting)" (human, 2026-10-24): a "Numbers on the calendar" switch in settings shows each played day's questions survived. Played days are shaded in four steps; the number colour on each shade passes 4.5:1 in Paper and Night (Night's steps differ from Paper's to keep that) |
| L47 | The chosen theme | "no need for a selectred check thing just have it outlined" (human, 2026-10-24): the chosen theme has a thick outline only. Screen readers still hear it as selected |
| L48 | Credits and AI disclosure | "i dont feel good about just stealing the color palettes so unelss its illegal lets just have a disclosure section and credit them. same with disclosing ai usage as well maybe" (human, 2026-10-24). Using the colour values isn't illegal (L21), so they're credited: a disclosure section credits each borrowed palette (Moonlit: monkeytype's "rose pine moon", from the Rosé Pine palette) and says how AI is used in Plor. Claude's proposal for the human: it grows the privacy page's "Data sources" section, and ships with 14b-1, when Moonlit does |
| L49 | The Admin link | M15 15c drafted an Admin link on the account page, which 14a-1's sidebar link overlapped. The human: "14a-1 does it, close 15c (Recommended)" (2026-10-24): one admin flag on `GET /api/profile`, the link in the sidebar and, on phones, on the Me tab |
Each sub-ticket carries its own criteria, in its file in `docs/milestones/`.

## Out of scope
- Building the features themselves: free-text answers and points during the run were built in M04; the friends, comments, points, groups, home screen and account features are built in M07–M12. This milestone only gives their screens the look.
- Avatars and cosmetic frames: later, by the human (2026-10-20). Navigation tabs were too, until the human pulled them in (L17, 2026-10-24); the theme setting comes with the themes (L20). Groups and the home screen were too, until the human pulled them in as M10 and M11 (2026-10-21); their look belongs here.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Smallest phone width: 360px | Layout | L9, human, 2026-10-24 |
| Contrast 4.5:1 for text; target size per 2.5.8 | Accessibility | L10: WCAG 2.2 AA (SOURCES.md) |
| How many presets: 5 | Themes | L21, picked by Claude when the human left it to Claude, 2026-10-24 |
| Sprout stages: 1–4, 5–14, 15–29, 30+ days | The streak symbol | L26, human, 2026-10-24 |
| Breakpoints: 768px (tab bar below, sidebar above), 1200px (right column from here up) | Layout | L42, picked by Claude when the human asked for a suggestion, 2026-10-24 |
| Control outline (`--edge`): #8A8A84 in Paper, #6E6E6A in Night, at least 3:1 against the background and cards (WCAG 2.2, 1.4.11) | Chips, secondary buttons, inputs, switches | Proposed by the design review, approved by the human, 2026-10-24: "Approve the control outline colours: #8A8A84 in Paper, #6E6E6A in Night." The other presets get their own edge colour when their full colour sets are written |
| Content column at most 960px when a page has no side column | Layout | L43, Claude, 2026-10-24 |
| Reflow floor: 320px | Layout | WCAG 2.2, 1.4.10 (SOURCES.md) |

## Plan
1. 14c, the game's world, and the fresh design round start from guided questions (CLAUDE.md, "Ask before designing").
2. One sub-ticket file and one PR at a time.

## Removes
- M02's plain styles in `src/app/globals.css`, as each screen gets its new look.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
