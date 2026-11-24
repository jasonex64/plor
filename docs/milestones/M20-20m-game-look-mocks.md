# M20 — 20m, a style per game, as four private mocks

**Status:** approved 2026-11-23 ("Approve 20m"); the four mocks are being built by a design agent on Fable. Nothing is in the app.

## Goal
Four private mock pages, two per game, each showing one game's play screen in its own style, so the human can pick a style per game (or parts of several) on a phone.

## Who uses it / what breaks without it
- **Used by:** the human, to choose; then the ticket that builds the chosen style into each game.
- **Breaks without it:** "each game kind of looks exactly the same with no personality" (the human, 2026-11-23). M20 gave each game a colour and nothing else, and the last two attempts at a game's own look were built into the app before being judged on a phone, then removed whole (M14 14c-7).

## Source
- The human's answers 65 to 72 (the M20 ticket, 2026-11-23).
- `docs/research/reports/Game look directions for Plor.md`: "Route 2: A printed card per game" (a finish on the frame, a closed list of what a game may own, static grain, text on a solid panel), "Plor's own history asks for a calm frame and a harder-hitting word" (the five failure modes; what survived every cut), "Two limits apply to every route" (sound, the phone keyboard).
- HANDOFF, 2026-11-23, "Offbeat is to be replaced": the one-clock format's answers, quoted there.
- `docs/DESIGN.md`: the game screens as built (what the shared skeleton is today).
- SOURCES.md has no entry for any of the four styles' techniques (risograph, split-flap, cut paper, marker). The mocks are pictures to choose from, not app code; a technique the chosen style needs gets its SOURCES entry in the ticket that builds it.

## The design, proposed by Claude from the answers

**The skeleton, the same in all four mocks** (what survived every cut, the report's list): full-screen play with Close and How to play; the clock; the running score; the input in one fixed place inside the visible area with the phone keyboard open; the view still while the player types; nothing that costs the player clock time; a Reduce motion version in which every state changes at once.

**What a style may own, and nothing else** (the ceiling, agreed before any iteration; answer 65):
1. the play screen's background, with a still texture at most;
2. a fixed palette, built from the game's existing colour (answer 70);
3. one display face, on the question or chunk and the score only (answer 71);
4. a shape family (corners, edges, borders);
5. one emblem, made from the game's own object;
6. how the clock is drawn;
7. three motions: a letter typed, a word accepted (larger for a rarer or longer word), a word refused.

No scene, no character, no picture file, no 3D, no moving texture. Reading and typed text stays in Baloo 2 on a solid panel.

**The four mocks** (answer 72):

| | Game | Style | The central object | The clock | An accepted word |
|---|---|---|---|---|---|
| A | Offbeat, one-clock format | Game-show hardware | The question on a split-flap board | A flap counter with a row of bulbs that go out | Flaps into a row of the board with its rarity; the seconds it adds flap onto the clock |
| B | Offbeat, one-clock format | Print shop | The question as a two-ink poster headline, the second ink off-register | A printed ruler the ink recedes along | Stamped onto the sheet as a ticket stub, the rarity as a rubber stamp |
| C | Fragments | Paper cut-out collage | The chunk as cut scraps of unlike letters | A strip of paper tape that shortens | The typed scraps that hold the chunk lift; the word is taped onto the run's stack |
| D | Fragments | Marker doodle | The chunk boxed in marker on squared paper | A pencil line that is rubbed out | A highlighter stroke through the chunk, the points written beside it; a refused word is scribbled out |

Each mock plays one scripted round on its own and again on a tap: waiting, typing, an ordinary word accepted, a rare or long word accepted, a word refused, the clock running low, the round over. Each has a Reduce motion switch.

## Acceptance criteria
- [ ] Four private pages exist and their links are in this ticket; each opens at 390 × 844 and 1280 × 720 with no console error and no sideways scroll.
- [ ] In each, the display face is on the question or chunk and the score only; every other text is Baloo 2.
- [ ] Every reading text's contrast against its panel is at least 4.5 to 1 (WCAG 2.2, 1.4.3), measured from the page's computed colours.
- [ ] With the Reduce motion switch on, no element animates or transitions (read from the page's running animations).
- [ ] No mock loads a picture file or a script library; each page's transferred size is reported.
- [ ] The human has judged them on a phone and their words are recorded here.

## Out of scope
- Any change to the app, DESIGN.md or DECISIONS.md.
- Offbeat's new format itself (its own milestone); the mocks follow the answers in HANDOFF and guess nothing else: the result screen is a plain tally.
- Sound.
- Print shop on Fragments and the other pairings: a second round, if the human asks.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 390 × 844, 1280 × 720 | The two sizes checked | CLAUDE.md, Testing (`@visual`) |
| 4.5 to 1 | Reading text's contrast | WCAG 2.2, 1.4.3 |
| 20 s start; +3, +5, +8 s, each about 5% less an answer; 10, 25, 50 points | Offbeat's mock round | The human, 2026-11-23 (HANDOFF), "to tune" |
| Fragments' round length and points | Fragments' mock round | `src/game/substring-scoring.ts` and the game's constants, as built |
| 200 ms, the pop at 300 ms, the fade at 400 ms | The mocks' starting timings | DESIGN.md; answers 35 and 36 |
| Every other timing, size and colour in a mock | The mock only | The mock's choice, for the human to judge; none is a rule until a build ticket records it |

## Plan
1. One design agent on Fable builds the four pages, each one self-contained HTML file kept in `docs/research/mocks/20m/`, and publishes each as a private page → verify: the first criterion's check at both sizes.
2. The agent measures contrast and the Reduce motion state in a browser → verify: criteria 2 to 5, with the numbers.
3. The human judges on a phone; their words go here → then the build ticket's guided questions.

## Removes
Nothing: it adds four mock files under `docs/` and no app code.

---
## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
**The four pages** (built 2026-11-23 by a Fable subagent; private, the owner's until shared; sources in `docs/research/mocks/20m/`, which follow the Artifact tool's format and are judged from the links, not from disk):

| | Page | Display face | Clock | Page + fonts transferred |
|---|---|---|---|---|
| A Offbeat, game-show hardware | https://claude.ai/artifact/PiNDSTRveEJrcTMPF5oVcp | Barlow Condensed 700 | Two flap digits and 20 bulbs | 76.6 KB |
| B Offbeat, print shop | https://claude.ai/artifact/MTmc7heeiJ5YfhhaJckSPg | Bowlby One | A printed 0 to 20 ruler | 74.8 KB |
| C Fragments, paper cut-out | https://claude.ai/artifact/KK2KjoSfb52wbSqoEnBmB5 | Shrikhand | A paper tape that shortens | 71.0 KB |
| D Fragments, marker doodle | https://claude.ai/artifact/1tAFabYUfFMAA73YEAVFHH | Caveat Brush | A pencil line rubbed out | 122.1 KB |

**Criteria 1 to 5, as the subagent reported them** (a Playwright script against the files on a local server, 118 to 178 samples through each round, the same at 390 × 844 and 1280 × 720; the published links themselves were not measured: *unverified* there): no console error, failed request or sideways scroll; no text in the display face outside the question, chunk and score, and no third face; the lowest text contrast 6.13 (A), 5.53 (B), 6.17 (C), 5.73 (D), none on the texture; 0 running animations at any sample with Reduce motion on (36, 13, 23, 19 at most with it off); requests are the page, one Google Fonts stylesheet and font files only. The four faces' licences (SIL OFL) are from the subagent's memory: *unverified*, to check before any is built in. The lead session looked at one phone screenshot of each mock's rare or long word state.

**What the mocks guessed** (for the build ticket's questions, not decisions): Offbeat opens on question 2 of 3 with 9 s left; "about 5% less an answer" compounds per answer (the 4th, common, adds 2.6 s; the 5th, rare, 6.5 s); several answers a question before Next; the clock in whole seconds, "low" from 5 s; the refusal's wording; Uncommon is never shown. Fragments leaves out the bonus letter, the letters tracker and the cash-in, so its running score is word points only; mock C adds a line under the chunk the app doesn't have. The question changing on Next and the score changing are instant (no fourth motion).

**Criterion 6:** waits for the human.

## Review
