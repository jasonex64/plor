# M12 — Look and feel

**Status:** planned, after the MVP (human, 2026-10-20: "the pixel-art look moves after the MVP too"; the MVP is M13, the game mechanics). L7 is answered by M13's G5 and L11 by M13's G6. Draft ticket for the human's approval, 2026-10-20. It replaces the draft on `claude/m12-visual-design-70d269` (draft PR #12, closed in the roadmap reset of 2026-10-20). Only the human's own decisions and notes were carried over. The mockups stay readable at commit `cd03d0f` (GitHub keeps a closed PR's commits).

## Goal
Give Offbeat's existing screens a finished, phone-first look with code-drawn pixel art and small animations, so the game feels good before any social feature is built on top of it.

## Who uses it / what breaks without it
- Used by: every player, on every screen of the one game that exists today.
- Breaks without it: the game plays on M02's plain functional UI. Share (M05) and the live board (M06) would have no look to build on and would be redone later. The human first moved this milestone ahead of the social features (human, 2026-10-20: "Polish the game first"), then moved the whole look, pixel art included, after the MVP, which is the game mechanics only (human, 2026-10-20: "the pixel-art look moves after the MVP too"; M13).

## Source
No entry in `docs/SOURCES.md` covers visual design or accessibility yet, and only a human can add one (SOURCES.md, Rules). L10 asks for one. Until then, the work follows:
- `docs/DECISIONS.md`, Game 1 (7 questions, rising difficulty, sudden death, host answers shown only after the player answers) and Client platform (mobile-first web app).
- The Google sign-in branding guidelines (Google Identity docs) for the "Continue with Google" button: not in SOURCES.md, so they need to be added and read before the sign-in screen is restyled (L13).

## Scope
Only the screens that exist today (`src/app/page.tsx`, `home.tsx`, `game.tsx`, `privacy/`):
1. Sign-in (Google and email code; the privacy link; the intro that Google's brand check needs, M02 2c).
2. Pick a username.
3. Signed-in home and start.
4. Question: typing, "did you mean" and "Not in the list? Send" (the M02 answer model is unchanged; see Out of scope).
5. Safe reveal.
6. Caught: the Wind blows the player off the ridge.
7. Full-run result.
8. Errors, loading and the abandoned-run message.

## Carried over from the closed M12 draft (the human's decisions, 2026-10-20)
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
| L3 | Colours: the palette for Offbeat, and Plor's neutral shell | |
| L4 | Fonts: Young Serif headline and Source Serif 4 body, a pixel font for the sign, or the phone's system font | |
| L5 | Light, dark, or follow the phone's setting | |
| L6 | Words for the moments: safe, blown off, full run | |
| L7 | Safe answer: its own moment with a "Next" tap, or straight on to the next question | Answered by M13's G5 (a game-flow rule) |
| L8 | Pixel grid size, sprite sizes and animation timings (human numbers) | |
| L9 | Smallest phone width to support (a human number) | |
| L10 | Accessibility source: pin WCAG 2.2 in SOURCES.md (only a human adds a source). Contrast ratios and tap-target sizes come from it | |
| L11 | Puzzles while building: preview with the `content-rehearsal` days locally, or put real days back on the calendar now. Each day published now is one fewer left for the beta (M11) | |
| L12 | Where a caught player lands, and how soft it feels (the draft: into the clouds, unhurt; closed draft D17, unanswered) | |
| L13 | Add the Google sign-in branding guidelines to SOURCES.md (only a human adds a source) | |

## Acceptance criteria
Filled in once L1–L13 are answered. Each screen in Scope gets one criterion, checked with screenshots at the L9 width.
- [ ]

## Out of scope
- Free-text answers with no suggestions (closed draft D15; "semantic search"): this changes the answer model in DECISIONS.md. Later, by the human (2026-10-20).
- The friends' ridge and live board (M06), the share card (M05), and points during the run (M08).
- Navigation tabs, groups, settings, the front page, avatars and cosmetic frames: later, by the human (2026-10-20).
- PixelLab assets (D14 above).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Pixel grid, sprite sizes, timings | Art and animation | L8, open |
| Smallest phone width | Layout | L9, open |
| Contrast ratios, tap-target size | Accessibility | L10, open |

## Plan
1. The human answers L1–L13.
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
