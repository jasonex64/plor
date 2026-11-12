# M14 — 14c-3, six pixel-art directions for the game

**Status:** done as a first look, eleven private claude.ai pages, no PR (drafted 2026-11-03, Pacific, from four rounds of guided questions and one approval; the human, away from home, asked for the directions as private claude.ai pages).

## Goal
Six animated, pixel-art directions for the game's identity, each a private claude.ai page, so the human can pick one (or parts of several) to build into the game screen.

## Who uses it / what breaks without it
- Used by: the human, choosing the game's identity (14c, M14 Plan step 1: "The game's own design starts from scratch in its own session, from guided questions").
- Breaks without it: 14c has no design to build. The game is "Game number 1" at `/play` with no theme (14c-2), and the human asked to see directions before anything is built.

## Source
- CLAUDE.md, "Ask before designing": the answers below are the source for this sub-ticket. No entry in SOURCES.md covers the game's look; the human's answers stand in for one.
- WCAG 2.2, 2.2.2 Pause, Stop, Hide (SOURCES.md): the human chose to break it on the game screen (answer 16, below).

## Answers (human, 2026-11-03)
Round 1
1. Scope: "Identity only". Name, world, look and voice change; the rules stay (7 questions, the host's picks, 20 s, stolen letters, points).
2. Feeling: "should be a good mix of all the points listed, leaning slightly towards daily ritual" (tense survival, playful and clever, calm daily ritual, social bragging).
3. Character or world: "Decide later".
4. Review: "make 5 different directions then we can explore. the only thing i know i want is pixel art to be the visual aspect".

Round 2
5. Where the pixel art lives: "Game screen fully" (its frame, buttons and cards; Me, Friends and admin keep their look).
6. Pixel font: "Vary per direction".
7. Themes: "Game sets the theme" (the game screen keeps its own palette whatever the player's theme).
8. How the art is made, the human's spec, quoted whole:

> for each design:
>
> background:
> there should be a simplistic yet fully animated and stylistic backdrop designed to serve as an endless looping visual background for the game as long as the player stays on that page.
>
> I want something that adds some depth to the theme of the design, but not something that overpowers the game's sprites and text itself. focus on smaller details for the backdrop:
>
> Design every animation to be mathematically seamless or continuously procedural.
>
> Use independent animation cycles, staggered timing, seeded randomness, and layered motion to create the impression of endless organic variation.
>
> each theme should have one or two shifts as the game progresses to create a genuine sense of escalation as the game progresses.
>
> for the game itself/text:
> the text window, game name, and terms should all resemble the overall theme. the The visual style must be authentic, razor-sharp pixel art, not a high-resolution illustration with a pixelation filter.
>
> Internal rendering resolution: 640 × 360
> Final presentation resolution: 1920 × 1080
> Exact integer upscale: 3×
> Scaling: nearest-neighbor only
> Every source pixel must become a perfectly sharp 3×3 block.
> Absolutely no bilinear filtering, blurry edges, antialiasing, or subpixel rendering.
> No smooth vector graphics mixed into the pixel-art scene.
> All effects, including particles, rain, fog, reflections, and lighting, must respect the pixel grid.
> Maintain consistent pixel density across every visual layer.
>
> Build this as a complete, self-contained, real-time animated experience.
>
> Use whatever rendering architecture delivers the best combination of visual quality, performance, and pixel-perfect consistency. HTML5 Canvas, WebGL, or a hybrid approach are all acceptable.
>
> Prioritize:
>
> Smooth, efficient rendering at 1080p.
> Deterministic, seamless animation.
> Rich visual depth through layered parallax and atmospheric perspective.
> Procedural particle systems for weather and environmental effects.
> Carefully controlled lighting, blending, and reflections.
> Stable performance over extremely long runtimes.
> A fixed camera with no unintended movement or jitter.
> Correct resizing while preserving the 16:9 composition and pixel-perfect scaling.
>
> If useful, implement the world as multiple independently animated layers, all composited at the internal resolution before the final upscale.
>
> since the game needs to be able to be viewed on mobile, a vertical slice of the middle should still feel like completed as well.

Round 3
9. Text: "Page text, pixel font (Recommended)": questions, answers and buttons stay real page text in a pixel font snapped to the pixel grid, over the canvas.
10. Scaling off 1920×1080: "Fill, crop the sides": the smallest whole-number scale that covers the screen; the overflow is cropped, centred.
11. Escalation trigger: "Fixed questions".
12. Motion: "Always animate": no pause control, and "reduce motion" doesn't still it. This breaks WCAG 2.2.2 and 14b-10b's motion rules by the human's choice; recorded in DECISIONS.md when a direction is built into the app.

Round 4
13. Shifts at: "3 and 6".
14. Frame rate: "Vary per direction" (proposed per direction below).
15. Themes: "Claude proposes 5".
16. Where: "Private claude.ai pages (Recommended)".

Approval
17. To the five proposals A–E: "5 concrerte 1 abstract": build A–E and add an abstract sixth, F.

Round 5 (after trying the six pages)
18. The answer moment and a tracker, for every direction: "when we type the answer for the question, right now the text box simply displays if we were caught. rather than that, i want it to focus on the word being typed and showing a score/based off the result (attatched examples as pics). additionally a creative way to keep track of points (this system uses a line, but we can do differently/better) that matches the theme." (The pictures were krillion.io's dive game.)
19. Five more directions: "generate 5 more prompts (ill give you two ideas, you do another 3). for the last 3 try to do some more experimental ones like fantasy settings. my two ideas are 'newsflash' - some host/journalist looking for a 'scoop' primarily greyscale with touches of color and one where its a sculptor in like renessaince era chiseling a block to get a finished result." Claude chose the three: Dragon's Hoard, Star Chart, Cauldron.
20. "the ones i dont go with we can save for inspo for other games."
21. After the reveal: "Themed continue button (Recommended)".
22. Caught: "Run-over card (Recommended)".

## The six directions
| | Direction | World | Shifts at Q3, Q6 | Frame rate (answer 14) | Font |
|---|---|---|---|---|---|
| A | Lighthouse Keeper | a setting and a quiet host, the keeper | rain and the beam; a storm | 30 fps | chunky serif pixel |
| B | Night Market | a host, a fox at a noodle stall | more lanterns, a crowd; heavy rain, flickering neon | sprites 12, drift 30 | rounded bold pixel |
| C | Deep Dive | a setting | the twilight zone; the abyss and a lure | 30 fps | thin, clean pixel |
| D | Window Seat | a setting with a companion, the cat | evening, the lamp; a thunderstorm | 12 fps | hand-lettered pixel |
| E | Late Show | a host at a quiz-show desk | warmer lights, the audience leans in; drumroll spotlights | 60 fps | bold all-caps pixel |
| F | Outlier (abstract) | colour-cycling tiles, one always out of step | warmer, tighter; the field pulses, the odd tile glows | 15 fps | narrow geometric pixel |

## Acceptance criteria
- [ ] Six private claude.ai pages, one per direction, each linked in this ticket.
- [ ] Each renders at 640×360 and upscales by a whole number with nearest-neighbour only, filling the screen and cropping the overflow, centred (answers 8, 10).
- [ ] Each backdrop animates endlessly, deterministic from a seed, and shifts at questions 3 and 6 (answers 8, 13); the page lets the viewer step questions 1–7 to see the shifts.
- [ ] Each mock game screen shows the game's name, a question, the answer field and themed words as page text in a pixel font on the pixel grid (answers 8, 9).
- [ ] At a 390px-wide portrait phone the centre slice reads as a complete scene (answer 8).

## Out of scope
- Building any direction into the app (a later sub-ticket, after the human picks).
- Rule changes (answer 1).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 640×360 internal, 3× to 1920×1080, nearest-neighbour | Every direction | Human, 2026-11-03 (answer 8) |
| Shifts at questions 3 and 6 | Escalation | Human, 2026-11-03 (answer 13) |
| 30, 12/30, 30, 12, 60, 15 fps | A–F frame rates | Proposed by Claude per direction under the human's "Vary per direction" (answer 14); A–E shown in the approved proposal (answer 17), F's 15 fps stated with it |
| 7 questions, 20 s | The mock's question count and clock | Existing rules (answer 1) |
| Points 25/50/75/100/150/250/350; rarity bonus up to 0.5 of the question's points, 0 at a 20% share; letters taken at Q2, Q4, Q5, Q7 and gone for the run | The mocks' scoring and letters | `src/config/tunables.ts` (POINTS_PER_QUESTION, RARITY_BONUS_FRACTION, RARITY_ZERO_SHARE, LETTER_SCHEDULE); M04 rule 4 |
| Rare below a 5% share; an unlisted answer counts as a 1% share; the sample questions, host picks and shares | The mocks' tiers and sample data | Proposed by Claude for the mocks only (`game-mock.js`); the game has no tier names yet |
| 2 s for a shift to sweep in; the game column at most 300 source px wide | The review pages only | Proposed by Claude for the mocks, for the human to judge on the pages; not carried into the app without the human's word |

## Plan
1. One shared rendering harness: an offscreen 640×360 canvas, drawn to a display canvas sized in device pixels at the smallest whole scale that covers the screen, `imageSmoothingEnabled = false`. Time is quantised to each direction's frame rate; every motion is a function of time and a seeded index, so nothing accumulates over long runs.
2. Six worlds on that harness, published one by one; each link goes to the human as it's ready.
3. The human picks; the next sub-ticket builds the choice into `/play`.

## Removes
Nothing: these are review pages outside the repo, and the game screen is unchanged until a direction is chosen.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
The six pages, private to the human (published 2026-11-03; their source files live in the session's scratchpad, not the repo):

| | Name | Link |
|---|---|---|
| A | Wide Berth | https://claude.ai/artifact/TWgQzhAj6fKvDMTySXuPiK |
| B | Off the Menu | https://claude.ai/artifact/6yJYfY4NgFMZqd7pBWokrY |
| C | Fathom | https://claude.ai/artifact/EVJHiV85N1fKbd2w5p7Vrs |
| D | Purrhaps | https://claude.ai/artifact/LuAMod1pX3fkxcJ7HgjJnW |
| E | Off the Board | https://claude.ai/artifact/G1uuFm9krjohTkt4Nha5Ue |
| F | Outlier | https://claude.ai/artifact/AHct29WGWzMuRdzueg649b |
| G | The Scoop (newsroom) | https://claude.ai/artifact/LzfXxwtRaxW2zJhTZ84QD9 |
| H | Marmo (sculptor) | https://claude.ai/artifact/ADNEdjnPPKG7zKKZ59VFej |
| I | Uncounted (dragon's hoard) | https://claude.ai/artifact/SeRqWdpqotxEmFpcMGHfb6 |
| J | Asterism (star chart) | https://claude.ai/artifact/A7HoTgBVbxmmqtWE5LrJJf |
| K | Moonbrew (cauldron) | https://claude.ai/artifact/ALkTxwAZd9SkBbijbSNCSN |

Round 5 (answers 18–22): A–F were republished at the same links (version 2) and G–K published, each with a playable run on the shared `game-mock.js`: the typed answer animates in the theme, a result card with the tier, share and points, a themed continue button, a run-over card when caught or out of time, a finale after Q7, and a themed tracker. Each builder ran a scripted run in Chrome at 1920×1080 and 390×844: no console errors. Known gap in the sample data: on Q3 and Q7 every host pick contains a taken letter, so those questions can't be caught. Each builder chose its own animation timings; they are mock values for review.

Each builder checked its page in Chrome at 1920×1080 and 390×844 (deviceScaleFactor 3) at Q1, Q3 and Q6: no console errors; draw time per frame 0.3–8.5 ms (E on the phone the slowest, cause not found). Known gaps, from the builders: palettes run 33–40 colours in four of the six (the brief said roughly 16–32); body pixel fonts sit near, not exactly on, the `--u` grid; on a phone the text window covers part of each scene's lower half.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
