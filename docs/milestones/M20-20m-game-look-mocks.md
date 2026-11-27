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

**Criterion 6, the human's judgement (2026-11-26):** "ok i like the marker doodle but i dont like any of the offbeat mocks, especially with the new game mechanics. also i want to see what we can do about the logo/wordmark as well". Fragments: D, marker doodle. Offbeat: neither A nor B; new mocks for the clock game as M23 built it follow, from guided questions. Nothing is built into the app from this pick yet.

## Round two: Offbeat again (2026-11-26)

The human's answers (2026-11-26, from Claude's guided questions; numbered on from the M20 ticket's):

- 117, "What was wrong with the two Offbeat mocks (game-show hardware and print shop)?": "Nothing to do with the game" and "Not hand-made like the doodle".
- 118, "... Which part of that should Offbeat's look be built around?": "Show me one of each (Recommended)": the rare find, the clock you feed, the odd one out.
- 119, "Fragments is now the marker doodle ... How should Offbeat sit beside it?": "Show me both": hand-made with another tool, and a different world.
- 120 is the logo's (the M20 ticket, 20g).

**The design, proposed by Claude from the answers.** 118 and 119 together would be six mocks; since 117 names "not hand-made" as a miss, three are hand-made, one per idea and each with its own tool, and one is the different world (Claude's reading; not asked). The same skeleton, ceiling, scripted round and criteria 1 to 5 as round one, on the clock game as M23 23d built it (`docs/milestones/M23-23d-the-screens.md`: the clock with its seconds, "Question 2 of 3", the running points, the question, the input, the last answer only with its tier, seconds and points, Next and Finish), with the game's numbers read from `src/config/tunables.ts`. Sources in `docs/research/mocks/20m-2/`.

| | Idea | Kind | The central object | The clock | An accepted answer |
|---|---|---|---|---|---|
| E | The rare find | Hand-made: a sticker album in ballpoint | The question as the album page's heading | A row of ballpoint tally marks struck off | A sticker stuck on the page: plain for Common, striped for Uncommon, a still foil star for Rare |
| F | The clock you feed | Hand-made: chalk on a board in Offbeat's blue | The clock, a chalk bar across the top of the board | That bar, rubbed away and chalked back on | Its seconds are chalked back onto the bar, a longer stroke for a rarer answer |
| G | The odd one out | Hand-made: index cards and paper tape | A straight row of taped cards | A strip of tape that is peeled back | Your card is taped on askew, as the emblem's is; the rarer, the further off the line |
| H | The clock you feed, with the tiers as three shapes | A different world: flat, sharp, in the emblem's blue, white and yellow | A ring clock | The ring, emptying and refilling | A circle, a diamond or a star drops into the ring and tops it up |

Nothing is built into the app from these.

**Built 2026-11-26**, each by its own design agent on Fable, each page read by the main session before it was published:

| | Page | Display face | Clock | Page + fonts transferred | Lowest contrast |
|---|---|---|---|---|---|
| E sticker album | https://claude.ai/artifact/KyeFQ9tm7knbqX1ZJ4qhz8 | Gochi Hand | 25 ballpoint tally marks, one struck off a second | 79.0 KB | 5.89 to 1 |
| F chalkboard | https://claude.ai/artifact/YE6DG3ov7Pu6s3FLPEwNvD | Gochi Hand | A chalk bar rubbed away, fed in yellow | 84.0 KB | 8.53 to 1 |
| G index cards | https://claude.ai/artifact/8qH7w8Z6cu5ZLQzZibPUBt | Permanent Marker | Paper tape on a 0 to 20 measure, peeled back | 94.2 KB | 6.10 to 1 |
| H flat shapes | https://claude.ai/artifact/VJEP8pbUeTorZvsWXRZbzg | Unbounded 800 | A ring that empties, the seconds inside | 75.5 KB | 10.81 to 1 |

**Criteria 1 to 5, as each agent reported them** (Playwright against the file on a local server, over 100 samples through each round, at 390 × 844 and 1280 × 720): no console error, no sideways scroll, the display face on the question and the score only, the contrast above, no running animation with Reduce motion on, no picture file or script library. The published links and a real phone were not measured: *unverified* there, as is F's frame rate with its chalk filters on a phone.

**What the mocks read and guessed:** the clock's numbers are not in `src/config/tunables.ts`; each agent read them from `supabase/migrations/20261124235832_clock_run.sql` (20 s; 3, 5 or 8 s, 5% less for each answer the run holds, never under 1 s; 10, 25 or 50 points). Guessed: each round's opening state, "low" at 5 s, a clock drawing that is full at 20 s (25 marks in E) though the clock can go higher, the sample questions and answers, each tally's layout. E and G show the tier before the name on the answer; the app's order is name, tier, seconds, points.

**Criterion 6, the human's judgement (2026-11-26):** "for the plor logo, i do like the peeking o, but rather than a circle i feel like he should kind of have a dollop point on the top like a whipped cream dollop. as for the games themselves, I kind of like the first mock-up with the sticker album and a ballpoint. The only thing is that I feel like as your run gets more and more deep, I feel like the background should change a little bit as like a way of saying like, oh, you're doing a really good job on your run, and build some sort of like escalation as you get more points." Offbeat: E, the sticker album, with a background that escalates as the run's points grow; a second version of E follows, from guided questions.

## Round three: the sticker album that escalates (2026-11-26)

- 123, "On the sticker album: as the points grow, what should change behind the play area to say the run is going well?": "Show me two of these". The human named no two; Claude's choice is the two hand-made ones, "The album fills up" and "The page gets fancier", and not "The cover changes colour" (not asked).
- 124, "How loud should the escalation be, and how often should it step up?": "Three or four clear steps (Recommended)": the look changes at set point totals, each step a noticeable moment, then holds still.

**The design, proposed by Claude from the answers.** Two copies of mock E, the same in everything but the escalation, each with four steps (the start and three more) at point totals that are guesses to tune. The scripted round is lengthened so it passes through every step, and the strip gains a control that holds any one step, so each can be judged still. The ceiling holds: a step may add still drawings and colour to the page and its margins, with one short flourish as it arrives (part of the "accepted" motion, larger as the third is); nothing loops or keeps moving, nothing covers the question, the input or the last answer, and with Reduce motion a step changes at once. Sources in `docs/research/mocks/20m-3/`.

| | Escalation | Step 1 | Step 2 | Step 3 |
|---|---|---|---|---|
| E1 | The album fills up | Your earlier answers stay as small stickers along the page's edges | The edges are crowded, stickers overlap | Every edge is full, with the rare ones' foil showing |
| E2 | The page gets fancier | Ballpoint doodles in the margins | A drawn, coloured border | A still gold-foil edge and corner stars |

**Built 2026-11-26**, each by its own design agent on Fable, each page read by the main session before it was published:

| | Page | Steps at (guesses) | Step 1 | Step 2 | Step 3 | Page + fonts |
|---|---|---|---|---|---|---|
| E1 | https://claude.ai/artifact/Ti6UrjzNLvUELHdGfB1Xkn | 300, 450, 600 points | every answer so far lands as a small sticker on the cover, down the sides and along the bottom | the stickers are pressed on again full size and askew, over one another and the page's edge | they all jump, the rare ones gain a star and a gleam, stickers go on the top edge and a foil rosette is stamped under the emblem | about 95 KB |
| E2 | https://claude.ai/artifact/8L9AXoiruWQPvZ8KuTRq46 | 100, 175, 250 points | blue doodles in the gaps of the page's top rows, pale doodles on the cover | a red-pen scalloped edge round the page, a drawn diamond lattice on the cover | a still gold-foil band round the page, a foil star on each corner, foil studs on the cover | 95.1 KB |

**As each agent reported** (Playwright against the file on a local server, at 390 × 844 and 1280 × 720, over 200 samples a round): no console error, no sideways scroll, Gochi Hand on the question and score only, lowest contrast 5.89 to 1, no decoration's box over the question, score, clock, input, last answer, count or Next (E1's smallest gap 1.6px mid-flourish; E2's cover lattice checked by screenshot only), no running animation with Reduce motion on. Unverified: the published links, a real phone, frame rate. In E2 a corner star's pop was toned down after the full-round check and only the held steps were re-checked.

**What they guessed, and limits to weigh:** every threshold. E1 opens deep in a run (16 answers, 275 points) because one sticker an answer shows little before that, and only about 23px of cover shows beside the page on a phone, so its stickers hang partly off the screen and the page is less crowded than the design asked; its top edge holds two stickers and the rosette, not a full row. E2's first step fits only the top 90px of the page, its cover doodles are about 7px, and its corner stars about 21px. Each strip is two rows now, so the play area is about 36px shorter than mock E's.

**Criterion 6, the human's judgement (2026-11-26):** "1. let's do parts of both and for 2. the outer blue part should be a circle, and the inner part can be slightly raised like this image" (with a picture of a round glowing creature whose top comes to a small soft point). So: one album that takes parts of E1 and E2; which parts, from guided questions.

## Round four: one album from both (2026-11-26)

- 125, "For the sticker album, which parts of each version should the combined one take?": "Fancier page, plus my stickers (Recommended)": E2's three steps on the page, and E1's small stickers for the player's answers collecting in the strip between the page and the keyboard.
- 126, "When should the album's first step arrive?": "Early, about 100 points (Recommended)".

**The design:** mock E3, a copy of E2 (steps at 100, 175 and 250 points, still guesses beyond "about 100") with one row added: each accepted answer leaves a small sticker of its kind in the band of cover between the page and the keyboard, from the run's first answer, in the order given; when the row is full it overlaps, as stickers do. E2's cover doodles and studs leave that band to the stickers. The same ceiling, protected elements and checks as round three. Source `docs/research/mocks/20m-3/e3-fancier-page-and-stickers.html`.

**Built 2026-11-26** by a design agent on Fable, its changes from E2 read line by line by the main session before it was published: https://claude.ai/artifact/VwYoxRnwT7NtePHfEb7gnP. The band between the page and the keys is 35px (20px in E2 on a phone, 18px on a desktop), taken from the answer slot's spare height (110.7 to 96.5px on a phone, 122.3 to 105.3px on a desktop); the keyboard is not smaller. Stickers are 36 to 39px wide and 17 to 19px tall; the row holds 8 on a phone before later ones go on top, and the round ends with 11. At step 3 the row's Rare stickers gain a 17px foil star. **As the agent measured** (Playwright, 390 × 844 and 1280 × 720, about 1,120 samples a round): no console error, no sideways scroll, Gochi Hand on the question and score only, no sticker's box over the page, the keys or any protected element (smallest gap 7.5px to the page, 2.4px to the keys, mid-landing), no running animation with Reduce motion on. Unverified: the contrast figure (its script gave 12.7 to 1 where E2's gave 5.89 for the same text), a real phone, frame rate, the published link, the star's pop frame by frame. **Differs from the brief:** a sticker arrives from 16px to its right inside the band, not from the answer slot, since that path would cross the count and Next; the answer slot is shorter than E2's, as above.

**Criterion 6:** waits for the human.

## Review
