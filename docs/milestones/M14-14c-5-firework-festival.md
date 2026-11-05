# M14 — 14c-5, Afterglow becomes a firework festival

**Status:** in progress (drafted 2026-11-05 from four rounds of guided questions; approved 2026-11-05: "Approve, start").

## Goal
Redesign Afterglow on its private page as a walk through a firework festival, where each answer charges up and rockets the view into the sky, so the human can approve the game's look before it goes into `/play`.

## Who uses it / what breaks without it
- Used by: the human, finishing the game's identity; then every player, once the next sub-ticket builds it into `/play`.
- Breaks without it: Afterglow is the chosen theme (2026-11-05), but the human has rejected its zoomed-out harbour, its cannon and its flat background, so `/play` has no approved design to build.

## Source
- This ticket's answers, and the human's reference images, saved in `C:/Users/jason/RIFF-mocks/references/14c-5/` (private). They guide subject, palette and detail only: no art is copied from them.
- The human's spec, "Daily Game — UI Moodboard & Spec" (https://claude.ai/artifact/Fh9HjdcC57yr7mtv16pTAs), where this ticket doesn't change it (table below).
- 14c-4: Handjet at weight 400, 60 fps, and art made by code only all stand.
- CLAUDE.md, "Ask before designing".

## The human's brief, quoted
> final direction will be afterglow, keep the rest for future endeavors. however there needs to be a lot of change.
>
> 1. i want the background/theme to be more of a "firework festival". i've attatched various images that fit the theme and palette i am looking for (1-3). main thematic elements to keep mind of (dont need to use all at once) are like paper lanterns, palace-like structures, food stalls, lights, etc.
> 2. we are going to remove the character lighting the firework from the current iteration (can work on another one later). the composition of the game flow should be as follows: instead of being zoomed out like the current iteration of afterglow, we should feel like we are present and getting deeper and deeper in the festival itself. the screen should look like the main central area is just going to be pathway in the middle of the festival, and to the left and right feature these decorated, tall buildings (look at references 1 and 3). when the player types the word in the prompt, the aspect of it shooting into the sky and being a "firework" should be more abstract, there is no need for a cannon or anything. simply the word should take up the forefront of the screen, and visually shoot upwards with different intensity depending on the word rarity, and then it will burst differently depending on the score. As the word shoots up, we should visually transition the screen from being at ground level to move with the word (we feel like we are at the sky at the end of the ascent. prentend like the side buildings are infinitely tall and as we scale them, the floors zoom past us.
> 3. background shifts should shift the perspective of the screen as if we are walking forward along this corridor (should be a smooth transition). at the third transition, we should approach an end point (maybe a central building, maybe a shrine, or the waterfront).
> 4. there is no need for a card that contains the score for each round, the text can simply be on screen.
> 5. the countdown timer for the text prompt should feel visual in more than 1 way. the way i was thinking of is the border of the text box is made of a fuse that slowly burns down at the same time as the timer. towards the end of time, the sparks can grow larger and we see some visual shaking, if the player runs out of time the word never makes it off the ground.
> 6. image 4 depicts the current background. thematic elements aside, i feel like it isn't cohesive enough. for example, the reflection of the sun on the water is depected by straight lines only, and the ambient glow are just dots. please make it feel slightly more detailed than that. image 5 shows a small depction of the type of detail i'd expect. included a detail of sparkles that look nice.
> 7. for the last reference, only focus on the level of detail in the lanterns and the surrounding side area

## Answers (human, 2026-11-05)
Round 1
1. Pace: "step every question, and then the major background shifts at q3 and q6. until then, the changes can be very very minor as long as it feels like we're moving forward".
2. The climb: "all reach the sky, better answers kind of "charge up" at the bottom more and fly faster like a windup. also make sure that nothing about the text itself visually should chaange. the text BOX can wiggle and stuff but dont do things like compress the text/stretch it."
3. Coming down: "Drift down with embers (Recommended)".
4. Screens: "is it possible on desktop to just stretch the middle area more and do option 2?" Option 2 was one tall portrait design for everyone. Claude answered yes: the buildings stay at the left and right edges, and the street and sky between them get wider on a bigger screen. Nothing is distorted.

Round 2
5. Time of day: "Dusk into golden night (Recommended)".
6. End point: "Grand palace (Recommended)".
7. People: "Small crowd, far off (Recommended)".
8. After the burst: "Themed button".

Round 3
9. The walk: "Fully smooth zoom". This accepts that pixels shimmer while walking.
10. Timer: "Fuse plus seconds (Recommended)".
11. Burst: "Rarity shape, points size (Recommended)".
12. Tracker: "Sky lanterns (Recommended)".

Round 4
13. Build: "Private page first (Recommended)".
14. Caught: "Dud (Recommended)".
15. Finale: "Palace grand show".

## What this changes
| Was | Now | Why |
|---|---|---|
| 640×360 cropped to a 146-pixel slice on phones (14c-3, answers 8, 10) | One portrait design with finer art. Buildings stay at the edges and the middle widens with the screen | Answer 4 |
| Spec: no half pixels, art on the grid | Still true at rest and in the climb. During the walk's zoom, pixels may shimmer | Answer 9 |
| Spec: result card | No card. The result sits on screen in the sky, with a themed button | Brief 4, answer 8 |
| Spec: the word moves and nothing else does | The whole view climbs with the word | Brief 2 |
| The word changes size in its move (14c-4) | The lettering never changes shape or size. Its box may wiggle | Answer 2 |
| A mascot beside the prompt (spec) | No mascot | Brief 2 |
| Harbour, sun, keeper, launch tube | All gone | Brief 1, 2 |
| A shift at Q3 and Q6 only | A tiny step forward every question, and major shifts at Q3 and Q6 | Answer 1 |
| Sky marks | Sky lanterns | Answer 12 |

Unchanged: the rules, the fixed HUD on its opaque panel, Handjet 400, 60 fps, a quiet centre behind the prompt, every change having a visible cause, idle motion, and art made by code only.

## Design (proposed)
**The street.** You stand on a lantern-lit stone street. Tall decorated buildings rise up both sides with curved tiled roofs, balconies, shop signs and food stalls at street level. Paper lanterns hang on strings across the street, and a small crowd stands far off, seen from behind. The middle stays calmer, so the prompt reads.

**The walk.** After every answer, as the view drifts down, you land a little further along. Q1 to Q2 and similar steps are tiny.
- **Q1 to Q2:** violet dusk, a calm street. The palace is a small shape far ahead.
- **Q3:** a major shift. You pass under a big gate, the sky deepens, and many more lanterns light up.
- **Q6:** a major shift. Golden night, a crowded festival, and the palace fills the end of the street.
- **Q7:** you arrive at the palace.

**The prompt.** The question sits in a text box whose border is a fuse. It burns around the box in step with the 20 s clock, beside the seconds number. Near the end, the sparks grow and the box shakes.

**The climb.** The typed word comes to the front of the screen.
1. It charges up at street level: the box wiggles and sparks gather. A better answer charges longer.
2. It shoots up. The view rises with it, and the buildings' floors rush past, faster for a better answer.
3. Everything reaches open sky. The word bursts behind the lettering, with its shape from the rarity and its size from the points.
4. The result sits on screen, a sky lantern joins the others, and a themed button appears.
5. On the button, the view drifts down with falling embers and lands further along the street.

**Ends.**
- **Caught:** a dud. It charges, lifts a little, sputters and falls back in smoke.
- **Time's up:** the fuse runs out and the word never leaves the ground.
- **Finale:** after Q7, the palace erupts in one grand firework show, then the total appears.

**Detail.** Light comes from real sources, with soft multi-colour glows instead of dots, and reflections that ripple instead of straight lines. Lanterns, roofs and side areas are drawn to the level of references 5 and 7, and sparks use the star shapes in reference 6.

## Acceptance criteria
- [ ] A still comp of the street at Q1, Q6 and the palace, wide and phone, is approved by the human before any motion is built.
- [ ] Afterglow's page shows the festival at https://claude.ai/artifact/D6rt1tR2oi463Zf5WxJ8yk, with no harbour, keeper or tube.
- [ ] On a phone and on 1920×1080, the buildings hold the edges and the middle widens: screenshots at both, nothing stretched.
- [ ] Each question lands further along the street, and Q3 and Q6 are clearly major: screenshots at all seven.
- [ ] The lettering's shape and size don't change through the charge, climb and burst: a script compares it.
- [ ] A rare answer charges longer and climbs faster than a common one: a script reports both durations.
- [ ] The burst differs by rarity in shape and by points in size: frames at common and rare, Q1 and Q7.
- [ ] The fuse burns in step with the clock, and its sparks and shake grow near the end: a script reads its position at three times.
- [ ] A dud, a time-out and the finale each play through: frames of each.
- [ ] There's no result card: the result is page text over the sky, and it fits on 390×844 and 1920×1080.
- [ ] Art sits on the grid at rest and in the climb: the drawing-call log shows nothing off grid. Scaling is allowed only in the walk.
- [ ] 60 fps in desktop Chrome at both sizes, under 16.7 ms on average, and the human checks a real phone.
- [ ] No console errors, one font, and the checks are proved with broken builds.

## Out of scope
- Building it into `/play` (the next sub-ticket).
- The other four themes: kept for other games.
- A new character ("can work on another one later").
- Sound.
- Rule changes.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 60 fps, 16.7 ms, Handjet 400, 20 s, 7 questions, the points | Unchanged | 14c-4 and the game's rules |
| Q3 and Q6 | The major shifts | Human, 2026-11-05 (answer 1) |
| About 292 art pixels across on a 390-wide phone | The art's detail | The figure in the question the human answered (answer 4); to be judged on the comp |
| Desktop art pixel size, building width, charge times, climb speeds, burst sizes, drift time, step distances, when the fuse's sparks grow | The review page only | **Proposed by Claude for the human to judge on the page**; not carried into the app without the human's word |

## Plan
1. Add portrait, edge-anchored layout to the mocks folder's core, for Afterglow only.
2. Draw the street at Q1, Q6 and the palace as stills, wide and phone, and publish them as a comp for the human.
3. After approval, build the walk, the fuse, the climb, the bursts, the ends and the tracker. Publish to Afterglow's page.
4. Rewrite the checks for these rules, and prove them with broken builds.
5. Independent review. The human tries it on a phone.

Experiment, step 3. Expected: 60 fps holds on desktop, because the art layers can be pre-drawn. Reason for doubt: a full-screen smooth zoom at finer art costs far more than the last build. Disproved by: an average over 16.7 ms at either size. If so, stop and ask.

## Removes
- Afterglow's harbour, sun, keeper, launch tube and sky marks.
- The result card, on this theme.
- `wordMove`'s size change, on this theme.
- 14c-4's rule that foreground stills in the beat, on this theme.
- The fixed 640×360 buffer, on this theme.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
