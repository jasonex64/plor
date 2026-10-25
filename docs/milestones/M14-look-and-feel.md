# M14 — Look and feel

**Status:** in progress, alongside M13 (human, 2026-10-24: "while the other session works on database and answer generating can we do the layout stuff here"). 14a (structure and UX) and 14b (the visual system) are in guided questions and mockup review: L3–L5, L9, L10 and L16–L41 below are answered. 14c (the art and the game's motion) comes after. The mockups are the private canvas "Plor shell layout" (https://claude.ai/artifact/9QkZKZZZsEpCJsDVv7VfGZ). Earlier: planned, after every functional milestone (human, 2026-10-21: "nothing visual comes until after things are functijnal"; before that, after the MVP, human, 2026-10-20). Numbered M07, then M13, before the renumbering of 2026-10-21. L7 is answered by M04's G5. L11 is still open (M04's G6 is open and moved to M13 answer lists). Draft ticket for the human's approval, 2026-10-20. It replaces the draft on `claude/m12-visual-design-70d269` (draft PR #12, closed in the roadmap reset of 2026-10-20). Only the human's own decisions and notes were carried over. The mockups stay readable at commit `cd03d0f` (GitHub keeps a closed PR's commits).

## Goal
Give every Offbeat screen a finished, phone-first look with code-drawn pixel art and small animations, once every screen works.

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
6. Caught: the Wind blows the player off the ridge.
7. Result: caught, time's up or survived; the reset countdown; the Share button (M05) and its placeholder symbols (ROADMAP Next revision).
8. Errors and loading.
9. The admin pages (insights, M03; puzzle entry, M06): "everything should look nice eventually" (human, 2026-10-21).
10. Every screen added by M07 friends and live board, M08 comments and reactions, M09 points and friends leaderboard, M10 groups, M11 home screen and M12 account.

## Carried over from the closed M12 draft (PR #12) (the human's decisions, 2026-10-20)
- **Concept (D16):** "Go with the trail along a cliff edge: friends fall off at the stop where they got caught."
- **Camera:** 3rd person, behind the player's character, with the path winding away up the ridge.
- **The host is the Wind (D19):** "Go with the Wind." Its name and look are still open (L2).
- **Every game shows progression** as the player survives or scores more (human, 2026-10-20; e.g. in Krillion you sink lower with better answers): for Offbeat, the wind cloud gets angrier each round and the weather changes.
- **Pixel art (D14):** code-drawn, at the resolution of the sketches, not PixelLab: "the resolution im looking for is probably a lot closer to the code-generated pixel art over the pixellab one, so let just keep going with that."
- **Round 5 and 6 notes:** the cloud area must not feel empty; signs stand planted on the stop's stone, not floating; contrast softer than the first sketches. On Round 6: "the concept looks good for now", "a good base".
- **Plor vs the game (D5):** Plor's home stays neutral but close to the game, sharing some of its pixel and animation style; the game itself gets its own stylized look.
- **References:** krillion.io (liked: the animations and minimal theming; wanted more illustration and detail, and a less thin font) and monkeytype (liked: the minimal layout, the gliding caret, the themes; concern: "the fact that there's only 2 or 3 prominent colors could be a problem").
- **The word is the centre:** the human wants to do something with the player's word, as Krillion does.

**Draft details, for the human to confirm** (the closed draft: "only the D16 choice itself is decided"): the 7 questions are 7 stops on a ridge that climb higher, showing the rising difficulty, and reaching the top after stop 7 is a full run; the player's word is painted on a sign planted at each stop; the host's answers are the words the Wind whispers, and on a match a gust catches the player's sign and blows the character off the ridge, while a different word lets the gust pass (Round 7). Where a caught player lands, and how soft it feels, is L12.
- **Liked in the Round 2 tiles:** the serif headline of tile 1 (Young Serif), with its body text (Source Serif 4) "alright", and "the overall feel" of tile 4 (blue, red and black; Bebas Neue capitals).
- **Reference mockups** (code-drawn, placeholder colours): `docs/design/m12/R7-third.dc.html` (Round 6) and `R8-wind.dc.html` (Round 7) at commit `cd03d0f`.

## Decisions needed before any code
| # | Decision | Answer (origin) |
|---|---|---|
| L1 | Player character: the draft's small mountain goat, or another | |
| L2 | The Wind's name and look | |
| L3 | Colours: the palette for Offbeat, and Plor's neutral shell | **Shell:** "Neutral + one accent", then themes (L20). **Offbeat** keeps its own look, which is 14c's: "the actual game(s) will have pixel background and completely different theme than the other tabs (account, groups, friends)" (human, 2026-10-24) |
| L4 | Fonts: Young Serif headline and Source Serif 4 body, a pixel font for the sign, or the phone's system font | Young Serif is for the game's text only ("that was only for text in the game ... im not convinced that the young serif works there as much"). The shell's shortlist was DM Sans, Baloo 2 and "monoleaning" (Space Grotesk with JetBrains Mono numbers). The human took Claude's pick, "we can go with your reccomendation and change later": **Baloo 2 headings, DM Sans body** (human, 2026-10-24) |
| L5 | Light, dark, or follow the phone's setting | "Both, with a toggle", folded into themes (L20): "Follow the phone" picks Paper or Night, and a named theme overrides it (human, 2026-10-24) |
| L6 | Words for the moments: safe, blown off, full run | |
| L7 | Safe answer: its own moment with a "Next" tap, or straight on to the next question | Answered by M04's G5 (a game-flow rule) |
| L8 | Pixel grid size, sprite sizes and animation timings (human numbers) | |
| L9 | Smallest phone width to support (a human number) | **360px** (human, 2026-10-24) |
| L10 | Accessibility source: pin WCAG 2.2 in SOURCES.md (only a human adds a source). Contrast ratios and tap-target sizes come from it | "Yes, WCAG 2.2 AA" (human, 2026-10-24); pinned in SOURCES.md |
| L11 | Puzzles while building: preview with the `content-rehearsal` days locally, or put real days back on the calendar now. Each day published now is one fewer left for the beta (M15) | |
| L12 | Where a caught player lands, and how soft it feels (the draft: into the clouds, unhurt; closed draft D17, unanswered) | |
| L13 | Add the Google sign-in branding guidelines to SOURCES.md (only a human adds a source) | |
| L14 | The look of the Wind stealing a letter (Q2, Q4, Q5, Q7). Added 2026-10-21 docs audit | |
| L15 | A time's-up moment: its words and look (L6 lists only safe, blown off and full run). Added 2026-10-21 docs audit | |
| L16 | What this pass covers | "14a + 14b visual system" now; the pixel art and the game's motion (14c) after (human, 2026-10-24) |
| L17 | How a player moves around | "bottom tab bar for the mobile but desktop should have a more desktop friendly layout (shouldn't be just mobile layout copy pasted and wider)". Tabs: "Today, Friends, Groups, Account". Desktop: "Sidebar + columns" (navigation left, the game in the middle, the friends board and feed on the right) (human, 2026-10-24) |
| L18 | Navigation during a run | "Navigation stays". Tapping another tab mid-question: "Just go, timer runs". Kept once Claude pointed out that a timeout ends the run: "Keep it, show the clock", so the bar to return shows the seconds left (human, 2026-10-24) |
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
| L29 | How to play | "reworded a bit, maybe a more friendly tone, maybe more thematic" (human, 2026-10-24); Claude's draft, told through the ridge and the Wind, is in the round 3 mockup |
| L30 | The result screen | "the results for each game should be tied to the thematics of the game itself" (human, 2026-10-24), so Offbeat's moves to 14c, carrying today's result content |
| L31 | Empty friends and the weekly board | The empty text "should be more generalized and friendly, because other games wont be 'getting caught' and people might only want to play one game". The weekly board switches between games (human, 2026-10-24). The overall view: "Decide at game 2" (M16) |
| L32 | The mockups' wording | Provisional: "some of the text still doensnt sound right but this is about layout so i might want more revisions later" (human, 2026-10-24) |
| L33 | How styles are written | "CSS Modules + CSS variables (Recommended)" (human, 2026-10-24); goes into DECISIONS.md with the first build PR, replacing `globals.css` as the only stylesheet |
| L34 | Yesterday's answers on the game screen | "Yes, once the day is closed": every signed-in player sees a closed day's host answers (human, 2026-10-24). A new data exposure, so a security change for the human's approval when built |
| L35 | "Your Offbeat" stats | "Streak for this game, Best score, Average questions survived, Last 7 days chart" (human, 2026-10-24) |
| L36 | Order of work | "can we do desktop layout first" (human, 2026-10-24): the desktop mockup catches up with rounds 2 and 3 before the build is split into sub-tickets |
| L37 | Profile pictures | "another feature account should have is a profile picture" (human, 2026-10-24): "Pick from Plor's avatars" (no uploads), built in "Its own ticket after M14 (Recommended)", shown on "Account and sidebar, Boards, Comments, Group member lists". M14 leaves a round slot by every name in those places, holding the player's initial until avatars ship |
| L38 | Desktop Today's games | "All games side by side" (human, 2026-10-24, after the desktop critique): no carousel on desktop; swiping stays on phone |
| L39 | Play, then Start | "allow a toggle in settings" (human, 2026-10-24): an Account setting to go straight to question 1 from Play. Claude's default, from L25: off, so Play opens the game screen until a player turns it on |
| L40 | Comments you can't read yet | "Who commented, blurred text" (human, 2026-10-24). The blurred text is filler shapes, never the real comment, which isn't sent until the player has played (critique, round 1: real blurred text leaks to screen readers and find-in-page) |
| L41 | Today's boards and feed (desktop) | "One board, wide feed" (human, 2026-10-24): one leaderboard card with a Yesterday / This week switch and one group picker; the feed spans the centre |
## Acceptance criteria
Filled in once L1–L15 are answered. Each screen in Scope gets one criterion, checked with screenshots at the L9 width.
- [ ]

## Out of scope
- Building the features themselves: free-text answers and points during the run were built in M04; the friends, comments, points, groups, home screen and account features are built in M07–M12. This milestone only gives their screens the look.
- Avatars and cosmetic frames: later, by the human (2026-10-20). Navigation tabs were too, until the human pulled them in (L17, 2026-10-24); the theme setting comes with the themes (L20). Groups and the home screen were too, until the human pulled them in as M10 and M11 (2026-10-21); their look belongs here.
- PixelLab assets (D14 above).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Pixel grid, sprite sizes, timings | Art and animation | L8, open |
| Smallest phone width: 360px | Layout | L9, human, 2026-10-24 |
| Contrast 4.5:1 for text; target size per 2.5.8 | Accessibility | L10: WCAG 2.2 AA (SOURCES.md) |
| How many presets: 5 | Themes | L21, picked by Claude when the human left it to Claude, 2026-10-24 |
| Sprout stages: 1–4, 5–14, 15–29, 30+ days | The streak symbol | L26, human, 2026-10-24 |

## Plan
1. The human answers L1–L15.
2. Draw the stops, the character, the Wind and the clouds as code (no image files from outside the repo).
3. Apply the look screen by screen, in the order of Scope, one PR each.

## Removes
- The closed draft's 28 decisions, platform wireframes and rejected directions (A, B, C, Round 2, PixelLab rounds). They are not carried into the repo.
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
