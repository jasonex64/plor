# M14 14c-2 — The game's world: a flame, a shield, the Wind

**Status:** drafted from seven rounds of guided questions and two font comparisons (human, 2026-10-29), not yet approved; the still-open items are below. Its pages on claude.ai, private to the human: "Updraft Pixel Fonts" (https://claude.ai/artifact/4Cr39TFe2EyZnFtu4yajbv), the font comparison, and "Updraft Play Screen" (https://claude.ai/artifact/7oPWx3eHkdetpqDRfyjxet), a first sketch of the play page in three states at phone and desktop sizes, drawn from answers 1 to 25; its colours and drawings aren't decided.

## Goal
Updraft's run plays on its own full-screen page, `/play/updraft`, in a pixel-art world of its own: a small climber carries a flame up the sky, each answer painted on a shield that the Wind tests.

## Who uses it / what breaks without it
- Used by: every player, every day, for the run itself.
- Breaks without it: the game is a card inside Plor's pages, between the feed and the friends column, with nothing of its own world. 14c's world was cleared by 14b-7 (answer 9: "Clear it too") and has had no direction since.

## What the human decided (2026-10-29, on the Windows PC, quoted)
**The brief, as given:** "what i want is for it to go to a new page (for example plor.app/play/updraft) and also it should span most of the screen, overtakin git. the right tab with feed and friends shouldn't be visible, and the left tab should only be visible with a button to show it".

**Round 1, the big picture:**
1. What moves to the full-screen page: "The run and its result (Recommended)" ("/updraft stays the game's home: how to play, your stats, comments, Start. Start opens /play/updraft full screen for the questions, reveals and the result; leaving goes back to /updraft").
2. Phones: "Hide both, menu button (Recommended)" ("The game takes the whole phone screen; one small button opens the tabs and settings, as the button does on desktop").
3. The world: "Pixel-art world" ("A retro game scene … The direction 14b-7 cleared, offered again from zero").
4. Plor's look inside the game: "Fully its own look" ("The game has its own colours, type and controls, ignoring Plor's themes; only the menu button is Plor's").

**Round 2:**
5. Colours: "Changes as you climb" ("One palette that shifts with height: warm low ground, then pale sky, then dusk near the top").
6. The game's text: "Pixel font for everything" ("All game text in a pixel font, the answer box too").
7. How the art is made: "Drawn in code (Recommended)" ("each sprite and scene pixel by pixel as code (SVG or canvas), from a fixed palette: exact, versioned in git, no outside service").
8. The scene: "i think we should base the theming around how what the answer will be in the overall "world", in this case something the wind is blowing".

**Round 3:**
9. What the Wind blows: "maybe you should shield yourself with the word that u create and then the wind tests it (or if not shielding yourslef, shielding osmething)".
10. Which pixel font: "we can explore can't decide rn" (Pixelify Sans, Press Start 2P and VT323 were offered).
11. Colour steps: "Smooth blend" ("The sky colour blends continuously from bottom to top as you climb … text contrast has to hold at every point in between").

**Round 4, the shield:**
12. What it shields: "A small flame" ("if the Wind knew your word, the flame goes out").
13. The shield: "Letters painted on a shield" ("A pixel shield … held up with your word painted across it; it holds, or cracks and flies off").
14. Rarity: "Yes, by tier" ("A rarer answer's shield looks sturdier … using the share line's tiers … based on the estimate, which can change by the day's end").
15. Tipped over: "Shield scatters, you're blown off (Recommended)".

**Round 5, who and how:**
16. Who carries the flame: "A small climber with a lantern (Recommended)" ("One pixel character, the same for every player").
17. The Wind: "face, but it should be a cloud mascot".
18. The flame when tipped over: "Blown out, a wisp of smoke (Recommended)" ("then the result … the flame relights tomorrow").
19. A stolen letter: "Blown off the shield (Recommended)" ("the gust tears that letter off the shield's paint and it flutters up into the sky, where it hangs for the rest of the climb").

**The font, from a side-by-side page (claude.ai "Updraft Pixel Fonts", two rounds):**
20. The human liked VT323 in round 1, but: "i like vt323 but it is the same font as krillion...". Round 2 set VT323 beside six fonts with a similar tall, old-computer feel (Jersey 15, Micro 5, Handjet, Workbench, Sixtyfour, Bytesized). The pick: "handjet".
21. Then "i also quite liked the silkscreen one", asked how the two fit: "Handjet only (Recommended)" ("One game font, as answer 6 said … questions, the answer box, the timer and the big moments all in Handjet").

**Round 6, the screen:**
22. Phone layout: "Scene fills it, controls on the ground (Recommended)" ("the question sits in the sky above the climber, and the answer box and Answer sit on the ground strip at the bottom, above the keyboard").
23. Desktop: "Full width, climb in the middle (Recommended)" ("The sky spans the whole window; the climber's column sits in the centre, the Wind's cloud drifts in from the side, the controls sit centred at the bottom").
24. Pixel scale: "Medium, 4px (Recommended)" ("One art pixel is 4×4 screen pixels … A 24-pixel climber is 96px tall").
25. Time and stop: "Number + altitude marks (Recommended)" ("A big Handjet countdown in a corner, and seven marks up the side of the screen showing which stop you're on").

## Design (as decided so far)
- **Pages:** `/updraft` keeps how to play, stats, comments and Start. Start opens `/play/updraft`, full screen, for the questions, the reveals and the result (answer 1).
- **What's hidden on `/play/updraft`:** the right column, the sidebar, the top bar and the tab bar, on every size. One menu button opens them (brief; answer 2). The menu button is the only part in Plor's look (answer 4).
- **The world:** pixel art drawn in code from a fixed palette (answers 3, 7), its own colours and type, outside Plor's themes (answer 4). The sky blends smoothly from low ground to the top as you climb (answers 5, 11). All text is in one pixel font, Handjet (answers 6, 10, 20).
- **A stop:**
  - A small climber carries a flame in a lantern (answer 16).
  - Your answer is painted across a pixel shield the climber holds up (answers 12, 13). A rarer answer's shield looks sturdier, by the share line's tiers (answer 14).
  - The Wind, a cloud mascot with a face, puffs a gust at it (answer 17).
- **Held:** the climber goes up a stop.
- **The Wind knew the word:** the shield scatters, the climber is blown off, and the flame goes out in a wisp of smoke; then the result (answers 15, 18).
- **A stolen letter:** before its stop, the gust tears it off the shield's paint and it hangs in the sky for the rest of the climb (answer 19).

## Still open (next rounds, before approval)
- Handjet is picked (answer 20). Before it's added, three checks:
  - its licence file in Google's download is OFL;
  - its digits are fixed-width (the 14b-6d check); if they aren't, the timer needs a fix, a question for the human;
  - a DECISIONS.md entry for a second font, the game's only, since Plor has one font today.
  It's committed in `src/app/fonts/` as Baloo 2 is (14b-5).
- The pixel scale, the sky's colours at the bottom and top, and the shield's look per tier. These are numbers and drawings for the human.
- The climber, the lantern, the cloud mascot and the shield, drawn and shown to the human before anything ships.
- Motion: how long each gust, climb, scatter and smoke lasts. Under reduced motion, each moment is a still frame.
- How the tier shows on the shield while rarity is still an estimate (answer 14 accepts the estimate).
- Where `/play/updraft` sits in the game's name record (`src/platform/game.ts`, 14b-4): the address scheme for later games.

## Floor (not open)
- **Contrast:** text contrast holds at every point of the sky blend (answer 11's own trade-off). This is WCAG 2.2 AA, as the rest of Plor is.
- **Reduced motion:** nothing moves.
- **Screen readers:** they get the same events as text.
