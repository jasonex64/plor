# M14 14a-2a — Today

**Status:** draft for the human's approval (2026-10-25), from the guided answers below. 14a-2b (Offbeat's game screen) follows in its own PR.

## Goal
Today shows each game as a full-width banner (Play before, the score after), one leaderboard card, and a feed that names who commented without showing their words until the player has played; and from any tab, a player who left a question in play sees its seconds running out and can go back.

## Who uses it / what breaks without it
- **Used by:** every player, every day: Today is the first page they see.
- **Breaks without it:** Today is still 14a-1's moved sections: Offbeat's card with the game inline, two leaderboards on different tabs, and a feed whose locked state lists names in a sentence. The decided layout (L22, L25, L38, L40, L41, L42) isn't there, and a player who leaves a question in play (L18) can time out with nothing telling them.

## What the human decided (guided questions, 2026-10-25)
| Subject | Answer |
|---|---|
| Splitting 14a-2 | "Two PRs (Recommended)": 14a-2a Today, 14a-2b the game screen (it carries L34's security change) |
| The game screen's address | "/offbeat (Recommended)" (built in 14a-2b; 14a-2a's Play links to it) |
| The banner until 14c's art | "A plain colour block" |
| Its colour | "Offbeat's own colour (Recommended)": the ridge's navy, #2F3D5C, with white text, the same in every theme |
| How many commenters are named | "3", then "and N more" |
| The clock back to a question (L18) | "Above the tab bar, every page": "Question 2 · 9s left · Back"; at zero, "Time's up on question 2" with a link to the result |
| The banner after playing | "Score, how it ended, Result (Recommended)", with the time to the next day |
| Best score (for 14a-2b) | "Points plus the final bonus (Recommended)" |

Earlier decisions this builds: L22 (a full-width stylized banner per game, swiped on phones with the next one peeking and dots, from two games), L25 (Play centred on the banner and opening the game screen; Yesterday dated), L38 (desktop: games side by side, no carousel), L39 is 14a-3's, L40 (who commented, blurred filler, never the real text), L41 (one leaderboard card with a Yesterday / This week switch and a group picker; the feed full width), L42 (the right column from 1200px).

## Source
- Next.js 16.4.2 bundled docs (SOURCES.md): CSS Modules (`01-getting-started/11-css.md`), `<Link>` and navigation (`01-getting-started/04-linking-and-navigating.md`).
- WCAG 2.2 (SOURCES.md): 1.4.3 (the banner's white on navy), 1.4.1 (the switch and picker's current choice not by colour alone), 4.1.2 (the switch as a radio group), 2.2.1 (the question's timer, which the clock bar shows).
- The approved mockups (rounds 5 to 7) and the M14 ticket's decisions, quoted there.
- The feed's existing preview (`src/comments/feed.ts`, M11 11b, G3): before the viewer's run is over, friends who commented by name, others only as a count, and no comment text at all. 14a-2a draws it; it doesn't change what the server sends.

## Acceptance criteria
1. **The banner before playing.** Today shows Offbeat's banner: the name and "Don't match the Wind · 7 questions" in white on #2F3D5C, with Play centred at the bottom, which opens `/offbeat` (14a-2b; until it ships, Play starts the run on Today as now). With one game there are no dots and no swipe. Checked in `e2e/today.e2e.ts`.
2. **The banner after playing.** Once the run is over, the banner shows the points with the bonus so far, how the run ended ("caught on question 5", "time's up on question 3", "survived all 7") and a Result link, plus the time to the next day. Checked in `e2e/today.e2e.ts`.
3. **One leaderboard card.** A "Leaderboard" card with a Yesterday / This week switch (a radio group) and a group picker (Friends and each group), dated "Fri 23 Oct · Offbeat" for Yesterday. Each choice loads the existing route: `/api/leaderboard/yesterday[?group=]`, `/api/leaderboard`, `/api/groups/leaderboard?id=`. Checked in `e2e/today.e2e.ts` with a group.
4. **The locked feed.** Before the player's run is over, the feed shows the friends who commented (at most 3 by name, then "and N more", counting the others too), blurred filler beside each, and "Finish today's Offbeat to read N comments" as a link to Play. The page's text and accessibility tree hold no comment body (the server doesn't send one). Checked in `e2e/today.e2e.ts`.
5. **Desktop.** From 1200px, Friends today and the leaderboard card sit in a right column, and the banner and the feed in the centre; between 768px and 1199px they stack in the centre under the banner. No sideways scroll at 320px. Checked in `e2e/today.e2e.ts` at 1440, 1024 and 320.
6. **The clock bar.** With a question in play, every other tab shows, above the tab bar (at the top of the content from 768px), "Question N · Ss left" counting down from the run state's `msLeft`, and "Back", which opens Today. At zero it reads "Time's up on question N", with a link to the result. Checked in `e2e/shell.e2e.ts`.
7. **Colours and contrast.** The banner's colour is a named slot in `globals.css`, the same in every theme, and `src/app/colors.test.ts` checks white on it at 4.5:1 or more. `npm test` passes.
8. `npm run lint`, `npx tsc --noEmit -p .`, `npm run build`, `npm run test:e2e` and CI pass, and the moved sections' existing e2e assertions stay.

## Out of scope
- Offbeat's game screen (`/offbeat`): rules, stats, yesterday's answers, its comments (14a-2b).
- The pixel art and the result in the game's world (14c); the sprout (14b-2); themes (14b-1); Me and settings (14a-3).
- A second game's banner, the swipe and the dots: they come with game 2 (M16); L22's behaviour for two or more games is built then.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 3 names, then "and N more" | The locked feed | The human, 2026-10-25 |
| #2F3D5C, white text | The banner | The human, 2026-10-25 ("Offbeat's own colour"), the mockups' ridge colour; white on it is 10.8:1 (computed) |
| 1200px; 768px | The right column; the stacked middle band | L42 |
| 320px | Reflow | WCAG 2.2 1.4.10 |
| The banner's heights (230px phone, 240px desktop) and the card's spacing | Layout | The approved mockups (rounds 5 to 7) |

## Plan
1. Tests first: `e2e/today.e2e.ts` and the clock bar's case in `shell.e2e.ts` fail.
2. The banner, played and unplayed, from the run state the game already loads.
3. The leaderboard card, reusing the existing routes. The Friends tab keeps its live board and its leaderboard. On desktop, Today's right column shows the live board too (round 5); Today then listens to the board's channel once, through the board, rather than twice.
4. The feed's locked look, from the existing preview.
5. The clock bar: `Home` reads the run state once per page (GET `/api/run`) when the player isn't on Today, and counts down from `msLeft`.
6. Desktop columns; CSS Modules per component, slots only.
7. The reviewer, the fixes, the evidence, the PR.

**Hypothesis for step 5:** GET `/api/run` already returns the question in play and `msLeft`, so the bar needs no new route. What would disprove it: a run state that has no question while a question is in play (for example during the reveal), which would hide the bar when it should show.

## Removes
- Offbeat's card's inline Start on Today (the banner's Play replaces it; 14a-2b moves the game to `/offbeat`; until then Play starts the run in place).
- The feed's locked sentence ("Sam, Lee and 3 others commented · 7 reactions"), replaced by the names, the filler and the link.
- The separate Yesterday section and the weekly leaderboard's place on Today: one card holds both.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
