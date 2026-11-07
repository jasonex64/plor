# M14 — 14c-5, Afterglow becomes a firework festival

**Status:** in progress, version 7 (round 8) published to the private page 2026-11-06; the human's look at it, the new broken-build tests, a fresh review, the Source diff and the human's phone test still to come (drafted 2026-11-05 from four rounds of guided questions; approved 2026-11-05: "Approve, start").

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

Round 5, the human's notes on the still comp
> its not bad but i was thinking of a type of style where the colors are closer to each other and more simple in terms of color: https://pin.it/1MMjoUoPF
> idk if u can see that link but the entire hue is very similar in color even though a windmill isnt red. maybe not to this degree of same-ness. also i think the escalation isnt quite doing it for me. maybe at first theres nothing lit, then more gets lit and its bright at the end

The link shows a windmill landscape in red-orange to peach, separated by lightness and distance. It's saved as `references/14c-5/8-windmill-palette.jpg` in the mocks folder, for palette only.

16. Colour range: "One family, wider (Recommended)".
17. Colour mood: "Plum dusk to amber (Recommended)". This replaces answer 5.
18. What lights the street: "Question number (Recommended)". Everyone sees the same dark start and bright palace; answers don't change it.
19. Detail: "id like to see a simple version as well as a detailed". The comp shows both, and the one not chosen is deleted.
20. The comp, version 2: "lets see the detailed version thru for mow". Detailed goes forward and motion starts. Because that's "for now", Simple is deleted from the code but stays recoverable at commit 62fc436 in the mocks folder.

Round 6, the human's notes after playing the build
> okay 1: the text boxes are both too square and also the border isnt playful enough (can be more firework themed.).
>
> 2: the word shooting up is weak. i change my mind about only the textbox rumbling: the whole entity should rumble as to prepare for takeoff, and then the path upward shoudlnt just be straight up with no wiggle or motion: also, there should be some sort of acceleration and deceleration. at the top as long as the player doesnt click “next” the firework effext should be built in a way that lingers endlessly. lastly when descending back to ground theres some lack of cohesion of the builidings (looks like a section got chopped off)
>
> also color for text should be diff for rarities as well as the animation slightly

21. Box shape: "Rounded pill".
22. Border: "Sparkler fuse (Recommended)". A twisted cord spitting sparks along its length, with a big burning head, still the timer.
23. Flight: "Rocket wobble (Recommended)". A swaying S-curve with a spark trail, truer and faster for better answers, speeding up off the ground and slowing to a hang at the top.
24. Linger: "Hanging glitter (Recommended)". The burst blooms once, then its shape stays as sparks that twinkle, fall and are replaced, until the button is pressed.
25. Colour count, measured at 23 to 43 per frame and up to 70 briefly as the lights come on: "color count is fine".
26. The early camera steps, where Q1 to Q2 moves as far as Q2 to Q3: "looks fine". The camera stays as approved; Q3 and Q6 are major through light, composition and walk time.

Round 7, the human's notes after playing version 5
> so it looks better, but the movement is still a bit lackluster. idk how hard it is to make it seem like its travelling more, and the words being diff colors when scoring different rarities. In addition, its a little bit choppy. lastly, there needs to be a good visual way to show that a letter is being taken, not just it appearing in the next question.

27. Travel: "Longer, faster climb (Recommended)". Many more floors at a much higher top speed, about a second longer.
28. Rarity colour: "only the background needed to be similar in palette. the text can be any color and more contrast is better for it". This narrows answers 16 and 25 to the background: street, sky, clouds and panels.
29. Choppy: "Slow camera moves tick". Measured first: this PC's screen runs at 360 Hz and the game draws about 72 frames a second on it, so frame rate is not the cause here.
30. Taken letter: "Lantern snuffed out".
31. Smoothness: "Glide between art pixels (Recommended)". The picture slides by single screen pixels while the art stays crisp and unscaled.
32. Text colours for common, uncommon and rare: "Sky blue, lime, gold", on the word, the tier name and the points.
33. Burst colour: "Burst matches the text (Recommended)".
34. Lantern's size: "Lowered to centre, with caption (Recommended)". A big lantern with the letter on it lowers to mid-screen, sputters dark and drops, with a short line such as "P is out", taking about 2 seconds. The new question's timer waits until it finishes.

### Round 8 (human, 2026-11-06, criticisms of version 6)
> i think the text borders need to be different per color as well, and since everything else is kinda yellow-y, having the highest tier rarity word also just be yellow feels a bit lackluster maybe switch the colors around. There doesnt' need to be a "finale" after the final submit, should smoothly transition to the results page.

35. Colour order, common, uncommon, rare: "1: gold, lime, sky (Recommended)". This changes answer 32. Each tier sits further from the amber street than the one before; the fireworks follow, by answer 33.
36. "Borders": "by border i mean the little container that holds the text, not the text itself". Word box: "P: coloured cord", the same twisted cord in each rarity's colour. The prompt's fuse doesn't change.
37. Letter outline: "Dark own-colour (Recommended)", on the word, the tier name, the points and the recap's rows. The swatch showed step 1 of each ramp, which gives about 5 to 6:1 and fails the check's 7:1 floor, so it is step 0.
38. Ending: "Stay in the sky (Recommended)". This replaces answer 15. No finale; Q7's button leads to the results, which fade in over Q7's own burst.
39. Results text: "Add a run recap". Heading, flavour line, total and button, as the option described, with the run's answers listed. "Every ending (Recommended)": duds and time-outs list theirs too. "Answer and points (Recommended)": each row is the answer in its rarity colour with its points.
40. Names, after "do some research on actual firework shapes, both american and other countries and lets decide naming.": "Peony, Chrysanthemum, Kamuro". Today's bursts stay.

Research behind answer 40 (2026-11-06), from retail and trade glossaries that disagree with each other; one says outright that effect names are tradition, not a standard. Peony, chrysanthemum and willow are shared by American, Chinese and Japanese naming (botan, kiku, yanagi), and real willows are silver or gold. Kamuro is a dense, glittering, hanging burst named after a Japanese hairstyle, though one glossary defines it differently. Senrin, crossette, palm, horsetail and dahlia were offered or considered. These aren't entries in `docs/SOURCES.md`: the names are the human's choice, not a sourced fact.
- https://fireworks.com/safety/glossary
- https://www.liuyangfireworks.net/blog/fireworks-effects-types-encyclopedia.html
- https://blog.gaijinpot.com/four-types-of-japanese-fireworks/
- https://epicfireworks.com/blogs/news/the-art-and-science-of-the-kamuro-firework-effect
- https://www.mentalfloss.com/article/31097/names-10-fireworks-effects

## What this changes
| Was | Now | Why |
|---|---|---|
| 640×360 cropped to a 146-pixel slice on phones (14c-3, answers 8, 10) | One portrait design with finer art. Buildings stay at the edges and the middle widens with the screen | Answer 4 |
| Spec: no half pixels, art on the grid | The art is never scaled or resampled and its pixels stay whole, but the view, its layers and the word may sit on any screen pixel (answer 31). During the walk's zoom, pixels may shimmer | Answers 9, 31 |
| Spec: result card | No card. The result sits on screen in the sky, with a themed button | Brief 4, answer 8 |
| Spec: the word moves and nothing else does | The whole view climbs with the word | Brief 2 |
| The word changes size in its move (14c-4) | The lettering never changes shape or size. Its box may wiggle | Answer 2 |
| A mascot beside the prompt (spec) | No mascot | Brief 2 |
| Harbour, sun, keeper, launch tube | All gone | Brief 1, 2 |
| A shift at Q3 and Q6 only | A tiny step forward every question, and major shifts at Q3 and Q6 | Answer 1 |
| Sky marks | Sky lanterns | Answer 12 |
| Only the word's box wiggles (answer 2) | The whole word and box rumble before takeoff. The lettering still never stretches or scales | Round 6 |
| The lettering looks the same for every answer (answer 2) | Word, tier name and points are gold, lime or sky blue by rarity, each outlined in its own darkest shade | Round 6, answers 28, 35, 37 |
| Fireworks in the warm family | The firework follows its answer's text colour: burst, glitter, trail, takeoff blast, and the sparks round the word | Answer 33 |
| A taken letter just appears in the next question | A big lantern bearing the letter lowers to mid-screen, sputters dark and drops, with a caption, before the box and its timer | Answers 30, 34 |
| Square boxes, a plain cord | Rounded pills with a sparkler fuse. The launched word's cord takes its rarity's colour | Answers 21, 22, 36 |
| A palace firework show after Q7 | No show. Q7's results fade in over its own burst | Answers 38, 39 |
| An ending with the total only | Every ending lists the run's answers and points | Answer 39 |
| Rare is Golden Willow | Rare is Kamuro, in sky blue | Answers 35, 40 |
| A burst that fades | A burst that lingers until the button | Answer 24 |
| 63 colours across violet, green, teal, red and gold | One family of neighbouring hues, plum through rose to amber, in the background; rarity's text and fireworks stand apart from it | Round 5, answers 16, 17, 28, 33 |
| Dusk into golden night, with lanterns lit from Q1 | Nothing lit at Q1. Lights come on question by question, and the palace at Q7 is the brightest frame | Round 5, answers 17 and 18 |
| A stage is only a camera position | A stage is a camera position and a set of lit lights | Round 5 |

Unchanged: the rules, the fixed HUD on its opaque panel, Handjet 400, 60 fps, a quiet centre behind the prompt, every change having a visible cause, idle motion, and art made by code only.

## Design (proposed)
**The street.** You stand on a lantern-lit stone street. Tall decorated buildings rise up both sides with curved tiled roofs, balconies, shop signs and food stalls at street level. Paper lanterns hang on strings across the street, and a small crowd stands far off, seen from behind. The middle stays calmer, so the prompt reads.

**The walk.** After every answer, as the view drifts down, you land a little further along. Q1 to Q2 and similar steps are tiny.
- **Q1:** plum dusk, and nothing is lit. No lantern, window or stall lamp is on. The palace is a small shape far ahead.
- **Q2:** the first few lights come on, far ahead. A very small change.
- **Q3:** a major shift. You pass under a big gate and the lanterns overhead come on. The picture starts to warm.
- **Q4 and Q5:** small steps, with a few more lights each.
- **Q6:** a major shift. Windows and stalls are lit, the crowd is out, the colour has reached amber, and the palace fills the end of the street.
- **Q7:** you arrive at the palace, the brightest frame of the walk.

**The prompt.** The question sits in a text box whose border is a fuse. It burns around the box in step with the 20 s clock, beside the seconds number. Near the end, the sparks grow and the box shakes.

**The climb.** The typed word comes to the front of the screen.
1. It charges up at street level: the whole word and box rumble and sparks gather. A better answer charges longer. The word's colour and its rumble, flight and burst differ a little by rarity.
2. It shoots up on a swaying path with a spark trail, speeding up off the ground and slowing to a hang at the top. The view rises with it, and the buildings' floors rush past, faster for a better answer.
3. Everything reaches open sky. The word bursts behind the lettering, with its shape from the rarity and its size from the points, and the burst keeps glittering until the button.
4. The result sits on screen, a sky lantern joins the others, and a themed button appears.
5. On the button, the view drifts down with falling embers and lands further along the street.

**Ends.**
- **Caught:** a dud. It charges, lifts a little, sputters and falls back in smoke.
- **Time's up:** the fuse runs out and the word never leaves the ground.
- **Results:** after Q7, the button reads See results. Q7's text fades out and the results fade in over the same glittering burst, with no walk down. Every ending lists the run's answers and points, in their rarity colours, with the total.

**Detail.** Light comes from real sources, with soft multi-colour glows instead of dots, and reflections that ripple instead of straight lines. Lanterns, roofs and side areas are drawn to the level of references 5 and 7, and sparks use the star shapes in reference 6.

## Acceptance criteria
- [x] A still comp of the street at all seven questions, wide and phone, is approved by the human before any motion is built, with one of the simple and detailed versions chosen.
- [ ] Nothing is lit at Q1, and each question's frame is brighter than the one before, with the biggest jumps at Q3 and Q6: a script reports the mean brightness of all seven.
- [ ] Every background colour sits in the plum to amber family, and rarity's three colour ramps appear only on that rarity's text and firework: a script lists each colour's hue, and each frame's colour count.
- [ ] Afterglow's page shows the festival at https://claude.ai/artifact/D6rt1tR2oi463Zf5WxJ8yk, with no harbour, keeper or tube.
- [ ] On a phone and on 1920×1080, the buildings hold the edges and the middle widens: screenshots at both, nothing stretched.
- [ ] Each question lands further along the street, and Q3 and Q6 are clearly major: screenshots at all seven.
- [ ] The lettering's shape and size don't change through the charge, climb and burst: a script compares it.
- [ ] The word's colour differs by rarity, and its rumble and flight differ a little: a script reports them for common, uncommon and rare.
- [ ] The climb accelerates and then decelerates, on a path that sways: a script reports speed and sideways motion through the climb.
- [ ] The burst lingers with visible change for as long as the button waits: a script compares frames over at least a minute.
- [ ] Coming down, the buildings join with no chopped-off section: frames through the descent at both sizes, checked by a person.
- [ ] A rare answer charges longer and climbs faster than a common one: a script reports both durations.
- [ ] The burst differs by rarity in shape and by points in size: frames at common and rare, Q1 and Q7.
- [ ] The fuse burns in step with the clock, and its sparks and shake grow near the end: a script reads its position at three times.
- [ ] A dud, a time-out and a full run each reach the results: frames of each. A full run goes from Q7's result to the results in the same sky, with no descent: a script reads the phases and the burst.
- [ ] There's no result card: the result is page text over the sky, and it fits on 390×844 and 1920×1080, the recap's seven rows included.
- [ ] The launched word's cord is drawn from its rarity's ramp, and the prompt's fuse is unchanged: a script reads the cord's colours.
- [ ] Every ending lists the run's answers, each row in its rarity's colour and outline with its points: a script reads the rows at a full run and a dud.
- [ ] Art is never scaled outside the walk, and its pixels stay whole: the drawing-call log shows it. The view, each layer and the word land on whole screen pixels and glide through the slow parts of the climb and landing: a script reports the steps between frames at both ends of each.
- [ ] The climb is longer and much faster: a script reports its seconds, floors and peak speed against version 5.
- [ ] Word, tier name and points use one colour per rarity, and the burst matches: a script reports them, with each text colour's contrast against its outline.
- [ ] Each newly taken letter gets its lantern, once, before the box and with the timer waiting, and its caption fits: frames at both sizes, for Q2, Q4, Q5 and Q7, and none at Q1, Q3 or Q6.
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
| 960×540 on 1920×1080 (2 device pixels per art pixel) | The desktop art size | Proposed by Claude for the human to judge on the comp |
| About 23 to 43 colours per frame, up to 70 briefly on arrival; hues from plum through red to amber, none outside | The tighter palette | Measured; human, 2026-11-05 (answer 25) |
| Desktop art pixel size, building width, charge times, climb speeds, burst sizes, drift time, step distances, when the fuse's sparks grow | The review page only | **Proposed by Claude for the human to judge on the page**; not carried into the app without the human's word |
| Each text's outline at step 0 of its rarity's ramp | 7:1 or better against its text | The existing check's floor; the swatch's step 1 gave about 5 to 6:1 (answer 37) |
| Cord in steps 0, 1 and 3 of its rarity's ramp | The word's box | Row P of the swatch the human chose (answer 36) |
| 0.5 s out, 0.5 s in | Q7's text fading to the results | **Proposed by Claude for the human to judge on the page** |
| "See results", "Show's over", "Seven shells up, and the street stayed to watch." | The button, heading and line at a full run's end | **Proposed by Claude for the human to judge on the page**; "Show's over" was the example in the question (answer 39) |

## Plan
1. Give Afterglow its own portrait, edge-anchored game file in `themes/festival/`, sharing the mock rules in `core/game-mock.js`. The four kept themes stay on the shared core, untouched.
2. Draw the street at Q1, Q6 and the palace as stills, wide and phone, and publish them as a comp for the human.
3. After approval, build the walk, the fuse, the climb, the bursts, the ends and the tracker. Publish to Afterglow's page.
4. Rewrite the checks for these rules, and prove them with broken builds.
5. Independent review. The human tries it on a phone.

Experiment, step 3. Expected: 60 fps holds on desktop, because the art layers can be pre-drawn. Reason for doubt: a full-screen smooth zoom at finer art costs far more than the last build. Disproved by: an average over 16.7 ms at either size. If so, stop and ask.

## Removes
- The comp's multi-hue palette, and the Simple version's code (recoverable at commit 62fc436 in the mocks folder).
- Afterglow's harbour, sun, keeper, launch tube and sky marks.
- The result card, on this theme.
- `wordMove`'s size change, on this theme.
- 14c-4's rule that foreground stills in the beat, on this theme.
- The fixed 640×360 buffer, on this theme.
- `themes/afterglow/`, the old harbour theme (recoverable from git in the mocks folder).
- Round 8: the finale, its shells, flash and constants, `glowFor`'s steps option, and the check lines and mutants that tested them.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
**The still comp, waiting for the human's approval and their choice of version:** https://claude.ai/artifact/PGtsJ3r3ktqTHp9fcaoYVw, version 2 (private, 2026-11-05; source `themes/festival/` in the mocks folder, brief `BRIEF-2.md`). `node themes/festival/shots.mjs` ended "all checks pass". Mean brightness, Rec. 601 luma over the whole frame, Q1 to Q7:

| Size and version | Mean brightness | Colours per frame | Pre-draw | Frame |
|---|---|---|---|---|
| Wide detailed | 43.1 45.4 66.5 67.1 74.6 93.7 109.9 | 24 to 32 | 119-188 ms | 0.53-0.68 ms |
| Wide simple | 44.3 48.3 67.6 74.9 82.9 104.1 119.5 | 12 to 16 | 106-140 ms | 0.53-0.85 ms |
| Phone detailed | 44.7 47.5 62.0 63.4 70.3 99.4 109.0 | 24 to 32 | 56-76 ms | 0.19-0.21 ms |
| Phone simple | 47.4 51.9 63.2 70.2 79.0 109.5 119.2 | 12 to 16 | 56-66 ms | 0.18-0.20 ms |

Brightness rises at every step, the biggest jumps are at Q3 and Q6, and Q7 is highest, in all four. Wide detailed Q3 to Q4 is only +0.5, so that step is nearly flat. Hues run 300.0° through 0° to 48.3°, none outside plum to amber. No forbidden drawing calls, no console errors, no sideways scroll at 390 px, in headless Chromium. The smooth zoom isn't measured yet.

**The first still comp, replaced after the human's round 5 notes:** https://claude.ai/artifact/PGtsJ3r3ktqTHp9fcaoYVw (private, published 2026-11-05; source `themes/festival/` in the mocks folder). Four stages, wide at 960×540 and phone at 292×633: 63 colours, no forbidden drawing calls, no console errors, no sideways scroll at 390 px, in headless Chromium. Pre-draw 60 to 191 ms; a still frame 0.2 to 0.6 ms. The smooth zoom isn't measured yet.

Version 6, round 7, final state (page sha256 `cbe101b9b0ec7dd8…`, 2026-11-06), run by the main session, not the builder:
- `node themes/festival/check.mjs` (headless, nothing else running): 208 of 208, exit 0. At both sizes, 390×844 at DPR 3 included: frame interval 16.67 ms avg, 60.0 fps, worst 33.4 ms.
- `CHROME_CHANNEL=chrome node themes/festival/check.mjs _cr` (real Chrome, this PC): 206 of 208, exit 1, 60.0 fps at both sizes, worst interval 22.2 ms. **Two lines fail, twice, the same way**: `phone 60 fps with raster paid inside the frame` 23.04 ms avg against 16.7 (wide passes at 15.73), and `phone lettering never changes shape or size` (Q6 climb 0.5, 11736 px against 11738). The raster line forces `g.getImageData` every frame, which on a GPU canvas of 1172×2532 pays a readback real play doesn't. That reading is *unverified*. Neither line has been waved through, and no target was adjusted. Real phones are unmeasured.
- Climb, version 5 to 6: 2.7 / 2.3 / 1.9 s to 3.7 / 3.3 / 2.9 s, 6 to 30 floors, peak wide 1186 / 1396 / 1697 to 2095 / 2350 / 2669 art px/s, phone 1394 / 1639 / 1982 to 2459 / 2759 / 3134.
- Frame cap, simulated: 60 Hz 60.0 fps, 75 Hz 59.9, 90 Hz 59.9, 120 Hz 60.0, 144 Hz 60.0, 360 Hz 60.0, never half rate.
- Mutants: `node themes/festival/mutants.mjs`, 4 at a time (8 made the PC unusable): 75 of 77 caught. Of the 2 missed, "the glitter thins away" is caught run alone (a flow timeout under load). "the rumble off whole art pixels" exposed a real blind spot: the line compared neighbouring frames, and `placeWord`'s rounding to screen pixels left whole steps between two off-grid places. The line now measures each frame against the word's rest place: real page 0 of 20 frames off, mutant 20 of 20, both sizes. All 5 rumble mutants then pass. The other 72 ran on the check before that one line changed; the line can't affect them. The earlier claim that all five misses of the run before were check faults was the builder's, and it was wrong for this one.
- Stills read by the main session: lantern at Q2 phone and Q7 wide, bursts, seven stages, finale: they hold. Motion is judged only from stills and numbers; the glide can only be judged on a real screen.

Version 7, round 8, final state (page sha256 `e8c915f6773ef5c3…`, mocks commit `6ef974e`, 2026-11-06), run by the main session on a PC in use:
- `node themes/festival/check.mjs` (headless): 222 lines pass, 2 fail, exit 1, on 224 lines. Both are `pre-draw never stalls a frame`: wide worst slice 26.2 ms, phone 17.3 ms.
- Baseline for those two: version 6, rebuilt from mocks commit `7740042`, run straight before it on the same PC: wide fails the same way (26.7 ms), phone passes (16.0 ms). So wide is not new today. Phone is close either way and not cleared: load is a likely reason, *unverified*. Version 6 passed both on a quiet PC. No target was moved.
- Two earlier runs of this build also failed `60 fps, whole run` at phone size (53.2 and 53.3 fps) and one failed `Q3 and Q6 are major` on wide (the scripted answer missed the sped-up clock, shown by a 0.9 s "walk", the ending's button delay). Neither failed on the last run, where whole-run fps was 58.9 wide and 56.0 phone. Discord, NZXT CAM and Opera were running.
- Round 8's own lines pass at both sizes. Phases `burst > result > leaving > over`, no descent. Burst still on screen behind the results (rare 625 px wide, 513 px phone, 0 off its ramp). Fade read at 0.50 out, 0.60 and 0.50 in. Seven recap rows with their colours and outlines. Results fit: text 260 to 810 of 1080, 203 to 611 of 844, under the HUD. Contrast on own outline 8.4, 10.1 and 10.4:1. Cords in their ramps. A dud's ending lists the run, its own row at 0.
- Check helper changed: `buttonUp` now reads the button's `hidden` and the section's, since the button keeps its room while hidden. An earlier run failed 11 lines on that helper, not on the game.
- Mutants, at the human's "Run them now": `node themes/festival/mutants.mjs`, 4 at a time, 2026-11-06 22:26 to 2026-11-07 01:32: 70 of 83 caught, 13 missed. 8 are new, 5 were rewritten and 2 removed for round 8. All 13 are caught after the fixes below, each re-run by name (12 of 13 in the first re-run, the last one alone). The 70 were not run again on the changed check; its changes only hold the run's stops and tighten three lines.
  - 11 of the 13 were the scripted run ending at Q4 or Q7 (`3 results` or `6 results`), so their own lines never ran. Cause: after Q3's and Q6's long descent the check set the stop for `arrive` after the thaw. On a slow frame that short phase had passed, and the game ran on through the next question's timer for the 25 s wait. It is the same failure as the `Q3 and Q6 are major` line above. Hypothesis written before the fix: stops set in one step with the thaw end the early endings. Result: no early ending in the re-run or the final check. Check change: `thawTo`, and the line now says what the run ended on.
  - "a word colour not the ramp's" was a real gap: a readable colour off the rarity's ramp would pass. `word, tier name and points share the rarity's colour` now requires the colour to be in its ramp.
  - "the recap only on a full run" was a real gap: the check read the rows but not whether they could be seen. Both recap lines now require the list on screen.
- Final check after those changes (mocks commit `0f8c018`, same page, 2026-11-07 02:26 to 02:38, an agent's run with no one known to be using the PC): **224 of 224 pass, exit 0**. `pre-draw never stalls a frame`: wide worst 14.0 ms, phone 9.9 ms, finished early 0 times. `60 fps, whole run`: 60.0 fps at both sizes. So the two pre-draw fails above, and the earlier fps fails, were load on the PC, not version 7. No target was moved.
- Stills read by the main session: `wide-results-end`, `phone-results-end`, `phone-q5-charge`: they hold. The fade and the feel of the ending can only be judged on a real screen.
- The live page was compared byte for byte with a rebuild of version 6 before publishing: identical inside the publisher's wrapper, so nothing of anyone else's was overwritten.

## Review
- Blocking findings and how each was fixed (first review, 2026-11-05: 10 blockers; a build with 11 defects passed every check line, so the checks must be rebuilt):
  - B1, skipping all seven crashed the page. The finale's code that crashed is gone in version 7, and the check passes (`skipping all seven reaches the results`); the fresh review confirms.
  - B2, play-again after a finale hid the result's answer line. The check passes in version 7 (`after a full run, a result keeps its answer line`); the fresh review confirms.
  - B3 and B4, the harbour theme and the Simple comp files remain. Auto mode refused their deletion; waits on the human. `drawStreet`'s dead code is open.
  - B5 to B9, check lines that claim more than they measure: burst on screen, walk zoom actually drawn, fuse against the seconds shown, the word during a time-out, colour on every phase, one font, Q1's tower. Open.
  - B10, no live script lists hues and per-frame colours; the canvas measured 23 to 70 colours per frame against "about 32". Open; the number is settled (answer 25).
- Deferred to ROADMAP "Next revision":
