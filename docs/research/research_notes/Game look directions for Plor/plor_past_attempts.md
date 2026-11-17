# Plor's past visual-design attempts (from the repository)

Researched 2026-11-16, read only, from the checkout at `C:/Users/jason/RIFF` (branch `process-parallel-sessions`, which holds `main` to PR #226), plus one ticket read from the branch `m20-design-rules-and-clean-up` and two old file versions read from git history. All paths are relative to the repo root. "The owner" is "the human" in the tickets; every quoted phrase is copied from a ticket, with the owner's own spelling.

What I did not see: none of the private claude.ai mock pages, the owner's "Daily Game — UI Moodboard & Spec" doc, the reference images, or the running app. Every description of how a look *looked* is the tickets' own description, not mine.

Timeline in one view:

| Date | What | Outcome |
|---|---|---|
| 2026-10-20 to 24 | Original plan: code-drawn pixel art, "the ridge" and "the Wind" for game 1 | Cleared 2026-10-28/29 and 2026-11-02 ("we're starting over") |
| 2026-10-24 to 26 | Shell: neutral + one accent, five themes, Baloo 2, flower streak ranks | Kept, live today |
| 2026-10-27 to 30 | App look: mockups 1 to 3 (askmoonlit-inspired), "hard ink shadows", 14b-8 | Mockup 1 rejected; mockup 3 built, then softened |
| 2026-10-29 to 31 | "Calm at rest, alive on touch" (14b-10) | Kept, live today |
| 2026-11-03 | 11 pixel-art directions for game 1 (14c-3) | 5 shortlisted |
| 2026-11-05 | 5 themes rebuilt to the owner's spec (14c-4) | Afterglow chosen |
| 2026-11-05 to 07 | Afterglow redesigned as a firework festival, 7 versions (14c-5) | "mark it done and then move on, i might revisit it alter" |
| 2026-11-07 to 10 | Afterglow built into the app (14c-6) | Dropped |
| 2026-11-07 to 09 | Game 2: four low-poly 3D mocks, Midnight Brew built into `/play2` (16g-1, 16g-2, 16g-3) | Removed |
| 2026-11-10 | "It's gone too far" … "go plain for both" (14c-7) | Both worlds removed (14c-8, 14c-9, PRs #179, #181) |
| 2026-11-11 | "Yes, but plain is temporary" | A richer look is "its own work afterwards" |
| 2026-11-16 | M20, design rules and clean-up (shell only), settled, not built | Game screens out of its scope |

## 1. What directions were explored in M14 (look and feel)?

### Takeaway
M14 went through three layers: a neutral themed shell (kept), an app-wide "hard ink shadow" kit softened into "calm at rest, alive on touch" (kept), and a game-1 identity that was restarted three times (the Wind and the ridge; eleven pixel-art directions; Afterglow's firework festival) before the owner said "It's gone too far" and chose "go plain for both". The shell work survived every round; every game *world* was removed.

### Cited Findings

**0. The first plan: code-drawn pixel art, the ridge and the Wind (2026-10-20 to 11-02; cleared).**
- The old M14 goal read: "Give every Offbeat screen a finished, phone-first look with code-drawn pixel art and small animations". Concept D16: "Go with the trail along a cliff edge: friends fall off at the stop where they got caught."; third-person camera behind the character; "The host is the Wind (D19)"; "Every game shows progression … (e.g. in Krillion you sink lower with better answers)": the wind cloud gets angrier and the weather changes — `docs/milestones/M14-look-and-feel.md` at commit `a504b56` (git history).
- PixelLab was tried and set aside for resolution: "the resolution im looking for is probably a lot closer to the code-generated pixel art over the pixellab one, so let just keep going with that." (D14). The same old ticket lists "rejected directions (A, B, C, Round 2, PixelLab rounds)" from a closed M12 draft that were never carried into the repo — same file at `a504b56`.
- Plor vs the game (D5): "Plor's home stays neutral but close to the game … the game itself gets its own stylized look"; and (L3, 2026-10-24) "the actual game(s) will have pixel background and completely different theme than the other tabs (account, groups, friends)" — same file at `a504b56`.
- 14c-1 (done 2026-10-27, reverted 2026-11-02) renamed game 1 "Updraft" with themed words. The owner's reasons at the time: "Offbeat" gave "not hinting of the theme"; each game "Stands on its own" next to Plor — [M14-14c-1](docs/milestones/M14-14c-1-name-and-words.md).
- Cleared twice. 14b-7 answer 9, "Clear it too": the approved pixel world was cleared so "14c starts its guided questions from zero" — [M14-14b-7](docs/milestones/M14-14b-7-design-clear-out.md). Then 14c-2 (2026-11-02): "we're starting over. just delete everything related to the wind, and any flavor and any sort of mention of how the game will be designed. revert back to \"host\" and neutral wording, then i will go ahead and start another instance and start designing from scratch" — [M14-14c-2](docs/milestones/M14-14c-2-neutral-words.md). No reason beyond "starting over" is recorded. Memory note for sessions: the host takes letters; never say "the Wind".

**1. The shell: neutral plus themes (14a, 14b-1; kept).**
- Colours: "Neutral + one accent", then themes; light/dark "Both, with a toggle"; smallest phone 360px; "Yes, WCAG 2.2 AA"; navigation "bottom tab bar for the mobile but desktop should have a more desktop friendly layout (shouldn't be just mobile layout copy pasted and wider)"; tab icons "can still be more neutral, just redraft them (the friends icon looks like microsoft teams...)" — [M14-look-and-feel](docs/milestones/M14-look-and-feel.md), L3, L5, L9, L10, L17, L28.
- The game's entry on Today: "a large rectangle (takes up entire width) with the text of the game, and THAT is what is stylized. then u can like swipe left or right to navigate to the next game" (L22) — same file.

**2. Streak art: pixel flowers failed, vector flowers shipped (14b-2a, 2026-10-26).**
- The owner wanted to test pixel art here ("i believe in another sesssion i had notes on pixel art maybe this is the time to test it out"), using their own `pixelkit` lint. Result: "they all look pretty bad and not accurate, especially the sunflower, birds of paradise and sakura". PixelLab "snapped by pixelkit" was then tried: its 32×32 flowers were good, its 16×16s were not. Final: "vector flowers, but generate more of them and i pick from the flower designs i like"; picked "lotus, hibiscus, morning glory, sakura, daisy. each needs some work though" — [M14-14b-2a](docs/milestones/M14-14b-2a-streak-ranks.md).
- The ticket's stated cause: "Pixel art at the pill's size couldn't hold a flower"; "pixelkit checked every pixel attempt; nothing pixel shipped" — same file, Source diff.

**3. App look, mockups 1 to 3 and "the new look" (14b-8, 2026-10-27 to 30; built, then softened).**
- Inspiration, askmoonlit.com: "i just like the black shadow behind some of the boxes as well as the how the site feels very full" — [M14-14b-8](docs/milestones/M14-14b-8-the-new-look.md), answer 1.
- Mockup 1, "now rejected", took that site's toolkit "with its warm cream and coral palette, and Bricolage Grotesque" — `docs/HANDOFF.md` at commit `2b9d210^` (git history). The owner's follow-up shows what was wrong: "can we just try taking the hard ink shadows, and the tile fill colors remain true to the small # of colors on each pallete? and try the chips and badges" (14b-8 answer 2). So: keep the shadow device, drop the borrowed palette and font.
- Mockup 3 offered fonts (no pixel font), textures (paper grain, dot grid, halftone, stripes) and card shapes (retro OS windows, folder tabs, ticket edges). The owner took almost none of it: "only change is more square-like" (no texture); "Nearly square (5px)"; "Keep 2px border, 4px shadow" — 14b-8 answer 3 and old HANDOFF.
- Built as hard ink shadows and borders, nearly square corners, cards, bordered rows, chips and badges, in Baloo 2 and each theme's colours. An Impeccable critique scored the player pages 25/40, with a P1 "no visual hierarchy" — 14b-8 Status and [M14-14b-10](docs/milestones/M14-14b-10-calm-and-alive.md).
- After the critique the owner chose "Hierarchy: shadow = press" and "Rethink the kit too" — 14b-8 answers 15, 16.
- Font: "keep everything one font then"; "A new font, chosen now"; "baloo 2" (2026-10-28) — [M14-14b-6](docs/milestones/M14-14b-6-feel-and-polish.md), answers 13 to 15. Earlier, Young Serif for game text: "im not convinced that the young serif works there as much" — old M14 ticket, L4.

**4. "Calm at rest, alive on touch" (14b-10, 2026-10-29 to 31; kept, the look today).**
- The owner's notes on 14b-8 as built, quoted whole: "overall, prioritize simplistic complexity. profile pic being a circle right next to the streak icon being a rectangle is off; hovering over tabs on desktop should highlight them, and the icon should have a little animation change; not everything needs a shadow, remove unnecessary ones; emoji reactions should be from a ... menu on the top of each comment, not filling up the screen at all; leaderboards should have a graph view as well as a list view; buttons being different sizes (for example, renaming the group has a different button size from the actual textbox of the group's name); overall feels a little too plain" — [M14-14b-10](docs/milestones/M14-14b-10-calm-and-alive.md).
- Direction chosen: "Calm at rest, alive on touch (Recommended)"; life from "Motion, Colour, Type, Drawing"; shadows "Only what can be pressed (Recommended)"; controls "One height, 44px (Recommended)"; timings "200ms, count-up 600ms (Recommended)"; easing "Quick out, soft settle (Recommended)" — same file, answers 1 to 3, 7, 14, 26.
- The owner pulled back three motion or colour ideas inside this ticket: the "something new" highlight ("Drop it"); icon colour ("the icons should not be colored."); the icon hop ("rather than play a hop animation (goes from a to b to a) it should just be a transition to another state (a - b)") — answers 19, 29, 30.
- What the owner liked in icons: "i like that it goes negative, but there should be a bit of a different look to each icon as well (i.e the today tab's calender maybe opens, etc. focus on simplistic complexity)"; "i like the calendar, but friends i dont like the wink, something symetrical (think ^ ^) and then the groups should maybe rotational? and i just straight up dont like the me one" — answers 31, 32.

**5. Eleven pixel-art directions for game 1 (14c-3, 2026-11-03; mock pages only).**
- Brief: "make 5 different directions then we can explore. the only thing i know i want is pixel art to be the visual aspect". Feeling: "a good mix of all the points listed, leaning slightly towards daily ritual" (of tense survival, playful and clever, calm daily ritual, social bragging). Pixel art on the "Game screen fully"; "Game sets the theme" — [M14-14c-3](docs/milestones/M14-14c-3-pixel-directions.md), answers 2, 4, 5, 7.
- The owner's own art spec (answer 8, long, quoted in the ticket): "a simplistic yet fully animated and stylistic backdrop designed to serve as an endless looping visual background"; "adds some depth to the theme of the design, but not something that overpowers the game's sprites and text itself"; "authentic, razor-sharp pixel art, not a high-resolution illustration with a pixelation filter"; 640×360 internal, 3× nearest-neighbour; "each theme should have one or two shifts as the game progresses to create a genuine sense of escalation"; "a vertical slice of the middle should still feel like completed as well" (mobile).
- Motion: "Always animate": no pause, and reduce motion did not still it; the ticket records this as breaking WCAG 2.2.2 "by the human's choice" — answer 12.
- Built as code-drawn canvas pages: A Wide Berth (lighthouse), B Off the Menu (night market, fox), C Fathom (deep dive), D Purrhaps (window seat, cat), E Off the Board (late show), F Outlier (abstract tiles), then G The Scoop (newsroom, the owner's idea: "primarily greyscale with touches of color"), H Marmo (Renaissance sculptor, the owner's idea), I Uncounted (dragon's hoard), J Asterism (star chart), K Moonbrew (cauldron) — same file, tables and answer 19.
- Round 5 feedback after trying them: "when we type the answer for the question, right now the text box simply displays if we were caught. rather than that, i want it to focus on the word being typed and showing a score/based off the result … additionally a creative way to keep track of points … that matches the theme." (reference: krillion.io's dive game). "the ones i dont go with we can save for inspo for other games." — answers 18, 20.
- Builders' known gaps: palettes of 33 to 40 colours against a brief of roughly 16 to 32; pixel fonts near, not on, the grid; "on a phone the text window covers part of each scene's lower half" — same file, Evidence.

**6. Five themes rebuilt to the owner's spec (14c-4, 2026-11-05; Afterglow chosen).**
- Why the first versions failed, per the ticket: "the five mockups fail the human's own spec (several fonts, 12 to 15 fps, mascots behind the prompt, large result cards, colour changes with no visible cause)", i.e. "looks the human has already rejected" — [M14-14c-4](docs/milestones/M14-14c-4-five-themes-rebuilt.md).
- Owner on frame rate: "i just want it to be more fluid ( reaalized i dont like the 12 fps type and prefer smoother)" then "60 fps everything (Recommended)". Art: "code only u can use nodejs or typescript or anything i trust u" (no generated sprites) — answers 6, 7, 9.
- Pixel fonts: first sheet, "dont really like either"; put off by "Too heavy or blocky,Hard to read"; wanted "Clean and elegant". Favourites: "i like handjet, vt323, and galmuri9"; final "Handjet heavier" (weight 400) — same file, Evidence.
- Rules that came out of the spec: a fixed HUD on an opaque panel, a quiet centre column, mascot to one side, a compact result card, every escalation "caused by something visible … No bare palette fades", one font — same file, Design.
- Choice: "final direction will be afterglow, keep the rest for future endeavors"; and on the others, "if i like 2 or 3 then they can be spinoffs. also we can just iterate and develop more themes later" — Status and answer 1.

**7. Afterglow as a firework festival (14c-5, 2026-11-05 to 07; seven versions on a private page).**
- The owner immediately rejected the chosen theme's own content: "however there needs to be a lot of change." Wanted "a 'firework festival'" with "paper lanterns, palace-like structures, food stalls, lights"; "instead of being zoomed out like the current iteration of afterglow, we should feel like we are present and getting deeper and deeper in the festival itself"; "there is no need for a cannon or anything. simply the word should take up the forefront of the screen, and visually shoot upwards with different intensity depending on the word rarity"; "there is no need for a card that contains the score"; a fuse as timer; the old background "isn't cohesive enough … the reflection of the sun on the water is depected by straight lines only, and the ambient glow are just dots" — [M14-14c-5](docs/milestones/M14-14c-5-firework-festival.md), brief.
- Palette note (round 5): "its not bad but i was thinking of a type of style where the colors are closer to each other and more simple in terms of color … the entire hue is very similar in color"; "the escalation isnt quite doing it for me. maybe at first theres nothing lit, then more gets lit and its bright at the end". Result: one hue family, "Plum dusk to amber" — answers 16, 17.
- Legibility rule from the owner: "make sure that nothing about the text itself visually should chaange. the text BOX can wiggle and stuff but dont do things like compress the text/stretch it." Later: "only the background needed to be similar in palette. the text can be any color and more contrast is better for it" — answers 2, 28.
- Motion kept being judged too weak, and was raised each round: "the text boxes are both too square and also the border isnt playful enough"; "the word shooting up is weak … the whole entity should rumble as to prepare for takeoff"; then "it looks better, but the movement is still a bit lackluster … its a little bit choppy"; "there needs to be a good visual way to show that a letter is being taken" — rounds 6, 7.
- Then one cut: "There doesnt' need to be a 'finale' after the final submit, should smoothly transition to the results page." — round 8.
- Ended without enthusiasm: "mark it done and then move on, i might revisit it alter". The descent's building seam: "Accept it for now". A real-phone test was never done ("Waits on the human: a real-phone test") — Status, answers 41 to 44.

**8. Afterglow in the app (14c-6, 2026-11-07 to 10; dropped).**
- Built at `/afterglow`: full screen with a × way out, real days, rarity as Peony / Chrysanthemum / Kamuro, Handjet on its own layer, a "How to play" panel in pixel style. Reduce motion was designed ("Calm version (Recommended)": no shaking or rumble, 0.5 s crossfades, bursts still shown, idle motion held still) but never built — [M14-14c-6](docs/milestones/M14-14c-6-afterglow-in-play.md), answers 1 to 12, 83 to 91.
- The cost recorded in the ticket: 91 numbered answers; a look check of 222 lines; 93 deliberate-break "mutants" taking about 6.5 to 7 hours a run; a ~370 ms freeze traced to streets not being pre-drawn; the owner asked "why do i need these mutants again" — same file, answers 62, 67, 71 to 76; `docs/milestones/M14-14c-8-plain-game-1.md` ("the 93 mutants and their 5-hour run").
- Status: "dropped (human, 2026-11-12, asked whether the firework look, 14c-6, is officially dropped: 'Yes, dropped')".

**9. The stop (14c-7, 2026-11-10).**
- Asked "Is the firework festival and the 3D village still the app you pictured ('small, welcoming but neutral, phone-first')?": "It's gone too far". Which game: "Both". How far back: "Show me first". Then: "if pics dont look good then go plain". After six side-by-side pictures (each game as built, calm, plain): "go plain for both" — [M14-14c-7](docs/milestones/M14-14c-7-simpler-games.md), answers 1, 5, 6, 11, 12.
- The three options offered were: the calm (Reduce motion) version becomes the game; plain screens with no world; keep the look and cut the weight. The owner picked the plainest — same file, answer 6.

**10. Plain game 1 and 2 (14c-8, 14c-9; done 2026-11-11).**
- Removal: "Remove them (Recommended)" (code, art, checks; they stay in git history). Names: "use placeholder names that are simple" — [M14-14c-8](docs/milestones/M14-14c-8-plain-game-1.md), answers 2, 3.
- What the owner kept from the festival for game 1, all four offered: "Full-screen play with a close button", "How to play as a pop-up", "Answer recap before results", "Rarity label on safe answers" — answer 4.
- For game 2: "also add an how-to-play, just like the first one(and any other discrepancies u think we should add. both games should have similar level of polish),Running score all game,Timer bar,Full-screen play with a close button" — [M14-14c-9](docs/milestones/M14-14c-9-plain-game-2.md), answer 6.
- 14c-8's out of scope: "Any new visual idea: no art, no animation beyond what DESIGN.md already gives buttons and counts."

### Inferences
- (Mine.) The owner's taste, when shown a busy option and a restrained one, picked the restrained one almost every time: mockup 3's textures and window shapes → "only change is more square-like"; coloured hopping icons → uncoloured state change; 63 colours → one hue family; finale → cut; result card → cut; mascot → cut. The exception is *in-moment feedback motion* on the player's own word, which the owner repeatedly asked to be stronger.
- (Mine.) No direction was rejected for its theme. Themes were shelved "for future endeavors"/"inspo for other games"; what was rejected each time was execution (frame rate, fonts, cohesion, weak motion) or, finally, total weight.

### Gaps
- Why exactly "It's gone too far": the tickets record only those words and "Both". No sentence from the owner says whether it was busyness, slowness, load, the build effort, or the mismatch with the neutral shell. The side-by-side page (a private claude.ai artifact) was not read.
- The owner's "Daily Game — UI Moodboard & Spec" doc (rev 37) is outside the repo; I have only the ticket's summary of its rules.
- The closed M12 draft's "rejected directions (A, B, C, Round 2, PixelLab rounds)" are not in the repo.
- No real phone ever ran Afterglow or the village (both tickets say so), so there is no evidence of how either felt on the target device.

## 2. What happened in M16 16g (low-poly: Midnight Brew, Bug's-Eye Garden, and the removal)?

### Takeaway
Game 2 swapped its planned pixel look (Moonbrew) for low-poly 3D built from polyfork.dev models in three.js; four worlds were mocked, Midnight Brew (a witch's hill village) was picked, shaped over six versions and built into `/play2`, and it was removed three days later for weight and CI failures as part of "go plain for both". The theme was liked; the first mocks were criticised for too little movement, not too much.

### Cited Findings
- The ask: "can you take a look at this repo https://github.com/lucas-martinic/polyfork-catalog and see if we can possibly create one of the games with this art style for the theme (first one was pixel art), focusing on primarily some fun, basic animations to go with the gmae". "Game 2, replace Moonbrew" — [M16-16g-1](docs/milestones/M16-16g-1-low-poly-mocks.md), answer 1.
- Animation priorities: "characters only if itll work well, not that high prio,The typed word comes alive,The scene escalates,Small idle life". Camera "Reacts to play" but "Still while typing (Recommended)". The word comes alive "Only when you send it". Phone: "Scene on top, typing below" — answers 3, 7 to 10.
- Tools: polyfork.dev kits (Halloween Night, Dungeon & Crypt; Insect World), three.js 0.180.0, Baloo 2 for text ("so no new font is added"). Licence choice for the shipped game: "Bundle them, no credit" (the Polyfork licence) — same file, Source, answer 12, "Shared by both".
- Revision 2, after the first two pages: "i feel like its not the theming thats the problem, but that theres not enough of a movement dynamic. i believe we should zoom out a bit, have more details from a diorama/birds eye view of a large area and have more drastic movement as the game progresses. i.e, elevators moving up and going to different office floors?" Then: "try mix of jourey and the place transforming, dont incorporate both in one right now"; "Same size every round"; "consider what it looks like on phone and desktop (want to make sure it looks good for both)" — answers 14 to 16.
- Four worlds built: Bug's-Eye Garden (travels down an ant nest), Midnight Brew (a village that transforms a part each round), Office Tower (glass lift up a cut-away skyscraper), Freight Line (a train across a countryside diorama). Moon Base and Dragon's Hoard stayed ideas — same file, revision 2 table.
- The pick: "lets go with the midnight brew, but change a couple things: 1. the way that the letters fall into the cauldron should change if the word is exceptionally high scoring somehow, cauisng more impact. 2. i think the world needs to be more detailed 3. more movement passively in the world while player is waiting to put in the word, as well as possibly more characters like a cat". Impact: "Letters slam in,Eruption and shockwave,Camera slam". Detail: "More buildings,Denser props,Ground and edges,Small lights". Idle: "More animals,Moving things" — answers 20 to 24. The other three "stay as published pages, kept as inspiration".
- Revision 4: "looks fine but instead of puressing the button to cast the spell and go to the next question, the spell should be cast automatically and then the button takes u to next quesiton. also some more ambient lighting would be nice as the game progresses"; "if there's a finale, it should be very short no need to have a button to get there it should be automatica" — answers 25, 26.
- In the app (16g-2): "The run, then cards (Recommended)"; "Full screen, with a way out (Recommended)"; Reduce motion "A calm version (Recommended)", later made stricter by the owner: ambient life "Stopped", big words "One quiet moment", flicker and smoke "Hold them steady (Recommended)" — [M16-16g-2](docs/milestones/M16-16g-2-midnight-brew-in-play2.md), answers 1, 2, 5, 23 to 30.
- Weight, measured: the mock page under Lighthouse's mobile preset took 91 s for the scene to be ready (16.65 MB); in the app the models were 10.8 MB in 48 files (1.78 MB over the wire with Brotli, at which the owner said "Stop here"), plus a lazy three.js chunk of about 779 KB — 16g-2, "The measurement behind answer 11", answer 38; 14c-9, Evidence step 4b.
- Performance on a GPU-less machine: 5.3 fps in CI's software renderer; about 0.6 s per draw; two-thirds of that the moon's 2048×2048 shadow map. Fixes stacked up: draw less when slow, merge scenery, hold shadows, half-size drawing — 16g-2, answers 13 to 16; [M16-16g-3](docs/milestones/M16-16g-3-village-e2e-on-ci.md), answers 6, 7.
- CI: `main`'s e2e "failed in 5 of the last 6 runs since PR #173"; after the fixes the village's tests "still need retries"; the owner: "Merge #176 now, decide later". The question became moot when 14c-9 removed the village — 16g-3, Status, answer 8.
- Removal reasons as the ticket states them: "a phone downloads the village's 48 files (about 10.8 MB) and a 3D library to play a word game", the e2e keep failing on CI, and 16f waits. Removed: `src/brew/`, `public/brew/`, the `three` dependency, the model credits, the village's words ("Toss it in", "Casting the spell…", "Loading the village…") — 14c-9, "Who uses it" and Removes.
- What survived from the village into plain Fragments: the top bar's "Round N of 7" and running score, the timer bar (recoloured to app slots because "The village's colours have no app slot, and the tokens over the accent fill lack contrast"), the letters-used panel — 14c-9, Source and Source diff.

### Inferences
- (Mine.) The low-poly direction never got a verdict on its art. The owner said "looks fine" at version 5 or 6 and approved the build; the failure was delivery (download, software-GPU frame rate, flaky tests) and the overall "gone too far" call that covered both games at once.
- (Mine.) Both game worlds converged on the same shape independently: full screen, scene plus typing panel, escalation per round, the typed word as the hero, a short automatic end. That shape was the owner's steady preference; the rendering tech was the variable.
- (Mine.) Asset consistency was not the complaint for low-poly (one vendor's kits). It *was* a complaint for pixel art from PixelLab at small sizes (the 16×16 flowers) and for code-drawn backgrounds ("isn't cohesive enough").

### Gaps
- No owner quote explains why Moonbrew's pixel look was replaced with low-poly beyond the request to try the polyfork style.
- Whether the village ran acceptably on a real phone GPU is unverified in the tickets ("*unverified* on a phone"); the beta's testers were to be the first real phones, and it was removed before the beta.

## 3. For each direction: what it looked like, what the owner liked and disliked, and the stated reason for its fate

### Takeaway
A compact ledger. "Stated reason" is only what a ticket quotes or states; where the owner gave no reason I say so.

### Cited Findings

| Direction | Look and tools | Liked (quoted) | Disliked (quoted) | Fate and stated reason | Source |
|---|---|---|---|---|---|
| Ridge and the Wind | Code-drawn pixel art, third-person cliff trail, wind cloud host | "Go with the Wind."; code-drawn over PixelLab resolution | — | Cleared: "we're starting over" (no further reason) | old `M14-look-and-feel.md` at `a504b56`; [14c-2](docs/milestones/M14-14c-2-neutral-words.md) |
| Mockup 1 | askmoonlit toolkit, warm cream and coral, Bricolage Grotesque | "the black shadow behind some of the boxes … feels very full" | implied: borrowed palette and font (asked for fills "true to the small # of colors on each pallete") | "now rejected" | old `HANDOFF.md` at `2b9d210^`; [14b-8](docs/milestones/M14-14b-8-the-new-look.md) |
| Mockup 3 → 14b-8 | Hard ink shadows, 5px corners, cards, chips, Baloo 2, five themes | "only change is more square-like" | "not everything needs a shadow"; "overall feels a little too plain" | Kept, shadows cut to pressables only | [14b-8](docs/milestones/M14-14b-8-the-new-look.md), [14b-10](docs/milestones/M14-14b-10-calm-and-alive.md) |
| Calm at rest, alive on touch | Flat cards, 44px controls, tints, 200 ms hovers, count-ups, two-state icons | "simplistic complexity"; "i like that it goes negative" | "the icons should not be colored."; the hop; "i dont like the wink" | Kept; today's look | [14b-10](docs/milestones/M14-14b-10-calm-and-alive.md) |
| Pixel streak flowers | 11×11 and 16×16 pixelkit grids; PixelLab 32×32 and 16×16 | PixelLab's 32×32 | "they all look pretty bad and not accurate" | Replaced by vector flowers: pixel art "couldn't hold a flower" at pill size | [14b-2a](docs/milestones/M14-14b-2a-streak-ranks.md) |
| 11 pixel directions (A to K) | Canvas, 640×360 at 3×, endless seeded backdrops, shifts at Q3 and Q6, per-theme pixel fonts, 12 to 60 fps | The idea of pixel art; themes kept as "inspo for other games" | Plain caught/safe text box; "i dont like the 12 fps type and prefer smoother"; fonts "Too heavy or blocky,Hard to read" | 5 rebuilt, 6 shelved | [14c-3](docs/milestones/M14-14c-3-pixel-directions.md), [14c-4](docs/milestones/M14-14c-4-five-themes-rebuilt.md) |
| 5 rebuilt themes | Code-only art, 60 fps, Handjet 400, fixed HUD, quiet centre, compact card | "final direction will be afterglow" | Afterglow's own harbour: "there needs to be a lot of change"; "isn't cohesive enough" | Afterglow picked, the other four "for future endeavors" | [14c-4](docs/milestones/M14-14c-4-five-themes-rebuilt.md), [14c-5](docs/milestones/M14-14c-5-firework-festival.md) |
| Afterglow, firework festival | Portrait street walk, plum-to-amber single hue family, fuse timer, word rockets and bursts by rarity (gold, lime, sky), sky lanterns, snuffed lantern for a taken letter | "color count is fine"; "looks fine"; "it looks better" | "the movement is still a bit lackluster"; "a little bit choppy"; highest tier "just be yellow feels a bit lackluster"; no finale | "mark it done and then move on, i might revisit it alter"; then "It's gone too far"; "Yes, dropped" | [14c-5](docs/milestones/M14-14c-5-firework-festival.md), [14c-6](docs/milestones/M14-14c-6-afterglow-in-play.md), [14c-7](docs/milestones/M14-14c-7-simpler-games.md) |
| Bug's-Eye Garden, Office Tower, Freight Line | three.js dioramas from polyfork kits | Theming ("not the theming thats the problem") | "not enough of a movement dynamic" (first two mocks) | Not picked; "kept as inspiration" | [16g-1](docs/milestones/M16-16g-1-low-poly-mocks.md) |
| Midnight Brew | Low-poly witch's village on a round base, cauldron, letter blocks, tiers of impact, light building over 7 rounds | "lets go with the midnight brew"; "looks fine" | Wanted more detail, more idle movement, more impact; a button to cast was one too many | Built, then removed: "It's gone too far" / "go plain for both"; ticket adds 10.8 MB, a 3D library, failing e2e | [16g-1](docs/milestones/M16-16g-1-low-poly-mocks.md), [16g-2](docs/milestones/M16-16g-2-midnight-brew-in-play2.md), [14c-9](docs/milestones/M14-14c-9-plain-game-2.md) |
| Plain games | App kit only, play frame, countdown number plus bar | Chosen over "calm" and "as built" pictures | — | Live for the beta; "plain is temporary" | [14c-7](docs/milestones/M14-14c-7-simpler-games.md), `docs/DECISIONS.md` log 2026-11-11 |

- The exact phrases the brief asked about: "gone too far" is the owner's ("It's gone too far", 14c-7 answer 1). "welcoming but neutral" is in the *question* put to the owner ("small, welcoming but neutral, phone-first"), which the owner answered; it is not a phrase the tickets quote the owner originating. "Calm" is the owner's pick of a recommended option ("Calm at rest, alive on touch (Recommended)", "Calm version (Recommended)") — [14c-7](docs/milestones/M14-14c-7-simpler-games.md), [14b-10](docs/milestones/M14-14b-10-calm-and-alive.md).
- "Neutral" from the owner directly: "Neutral + one accent" (shell colours); icons "can still be more neutral"; "revert back to \"host\" and neutral wording" — [M14-look-and-feel](docs/milestones/M14-look-and-feel.md), [14c-2](docs/milestones/M14-14c-2-neutral-words.md).

### Inferences
- (Mine.) Many of the owner's "answers" are a click on Claude's "(Recommended)" option. The free-typed notes (the long quoted ones) are the more reliable signal of taste, and they are consistent: single hue family, legible untouched text, smooth 60 fps, the player's word as the star, escalation with a visible cause, less chrome (no card, no finale, no cast button).

### Gaps
- Mockup 2 and mockup 1 pages were deleted in 14b-7; only the old handoff's description survives.
- I found no owner comment on the five pixel themes other than Afterglow (Off the Menu, Uncounted, Marmo, Moonbrew) beyond their being kept.

## 4. The current plain look and the constraints any future look must respect

### Takeaway
Today both games (Offbeat at `/play`, Fragments at `/play2`) run inside a shared full-screen "play frame" drawn entirely from the app's kit: Baloo 2, five themes of colour slots, 2px ink borders, 5px corners, shadows only on pressables, one 200 ms easing, nothing moving under Reduce motion. Hard constraints on record: WCAG 2.2 AA, 360px design width (320px reflow floor), 44px targets, real page text, one font unless a decision says otherwise, and the server (not the scene) decides everything.

### Cited Findings
- Colour: nine slots per theme (Paper, Night, Sky, Moonlit, Ink), plus `--soft`, safe/caught pairs and four shades; components never use hex. Each game has only a banner colour of its own: Offbeat `#2f3d5c`, Fragments `#5a2f5e` — `docs/DESIGN.md`, "Colour slots and themes".
- Type: one font, Baloo 2 (400, 700, 800), tabular digits, sizes in rem — `docs/DESIGN.md`, "Type"; `docs/DECISIONS.md` log 2026-10-28 and 2026-11-10 ("Baloo 2 is the one font again, with no exception").
- Shape: `--r-card` 5px; "Only what can be pressed has a shadow" (`0 4px 0` in the ink); one control height, 44px — `docs/DESIGN.md`, "Corners, borders, shadows".
- Motion: "One easing and time: `--ease` `cubic-bezier(0.2, 0.8, 0.2, 1)` and `--quick` 200ms … Under reduced motion nothing moves; a state still changes, at once."; buttons lift 2px on hover; pops from 90%; two-state tab icons; detail pages slide 60px — `docs/DESIGN.md`, "Motion", "Spacing and layout".
- The play frame (both games): a layer over the whole window that hides the shell; top row with How to play and a round 44px ×; column 960px at most — `docs/DESIGN.md`, "The game screen's run".
- Game 1's screen: soft card with chips "Question N of 7" and "N points so far", prompt at 1.875rem, taken-letter tiles struck in the danger colour, a reveal card with "Rarity: Common / Uncommon / Rare", a recap card — same section.
- Countdown (both): a 4rem number with "seconds left" and a 22px round bar, accent on soft, "with no transition and no change at low time"; "the number stays the main sign of time (WCAG 2.2 1.4.1)" — `docs/DESIGN.md`, "The countdown".
- Game 2's screen: letters at 48px weight 800, countdown row, "Bonus letter X", letters-used panel, "Your word" box — `docs/DESIGN.md`, "Game 2's plain round".
- Layout numbers: smallest phone "360px"; nothing may break down to 320px; breakpoints 768px and 1200px; contrast 4.5:1 text, 3:1 outlines — [M14-look-and-feel](docs/milestones/M14-look-and-feel.md), L9, L42, Numbers.
- Styling rules: CSS Modules plus CSS variables; "drawn art keeps its own hex colours, the same in every theme" (so a game's art may have a fixed palette) — `docs/DECISIONS.md`, Styling row and log 2026-10-26.
- Game rules the look must serve, unchanged through every direction: 7 questions or rounds, 20 s each, one run a day; game 1 has taken letters at Q2, Q4, Q5, Q7 and sudden death; game 2 has no elimination and a bonus letter — [14c-3](docs/milestones/M14-14c-3-pixel-directions.md), Numbers; [16g-1](docs/milestones/M16-16g-1-low-poly-mocks.md), Numbers.
- Constraints the owner set during the game-look rounds (each quoted above in sections 1 and 2): phone gets its own composition, "Scene on top, typing below"; camera "Still while typing"; "a quiet centre behind the prompt"; text never stretched or squashed; "more contrast is better" for text; 60 fps; "The run, then cards" (results stay as the app's cards); "Full screen, with a way out"; no freeze "Everyone, any device (Recommended)"; the walk or animation "never costs the player time" — [14c-4](docs/milestones/M14-14c-4-five-themes-rebuilt.md), [14c-5](docs/milestones/M14-14c-5-firework-festival.md), [14c-6](docs/milestones/M14-14c-6-afterglow-in-play.md) answers 73 to 76 and "What this changes", [16g-1](docs/milestones/M16-16g-1-low-poly-mocks.md), [16g-2](docs/milestones/M16-16g-2-midnight-brew-in-play2.md).
- Reduce motion: the position changed. 2026-11-03: "Always animate" (breaking WCAG 2.2.2 by choice). 2026-11-07 onward: "Calm version (Recommended)" for both games, with idle life "Stopped" in the village. Today's rule is "nothing moves" — [14c-3](docs/milestones/M14-14c-3-pixel-directions.md) answer 12; [14c-6](docs/milestones/M14-14c-6-afterglow-in-play.md) answer 8; [16g-2](docs/milestones/M16-16g-2-midnight-brew-in-play2.md) answer 24; `docs/DESIGN.md`.
- Project rules that bind any new look: "Build for today"; "No invented numbers" (every timing or size needs the owner's word); no source in `docs/SOURCES.md` covers a game's look, so "the human's answers stand in for one"; "A design session … tell the human to switch the session's model to Fable" — `CLAUDE.md`; [14c-3](docs/milestones/M14-14c-3-pixel-directions.md), Source.
- M20 (settled 2026-11-16, not built, on branch `m20-design-rules-and-clean-up`): rules for the shell only. The owner likes the sidebar tabs' hover and wants it as "a design rule"; raised 3D buttons only for a screen's one main action; 16px between cards; a logo mark to sketch. Out of scope: "The two games' screens beyond their buttons … (their layout, banner, prompt and timers are M14 14c's)" and "new animations beyond the hover rule" — `docs/milestones/M20-design-rules-and-clean-up.md` (that branch only).

### Inferences
- (Mine.) "Scene on top, typing below" was the phone layout chosen for the low-poly worlds only; the pixel worlds put the prompt over the scene, and builders flagged that "the text window covers part of each scene's lower half". The split layout looks like the safer default, but the owner chose it once, for one tech.
- (Mine.) A future game look has to coexist with five player-chosen themes. The pixel worlds settled that with "Game sets the theme"; the plain games follow the player's theme. Which holds for a new look is undecided.
- (Mine.) Because a decision entry was needed to give Afterglow its own font and another to take it back, a new look that wants its own font or a 3D library is a recorded, reversible decision, not a blocker.

### Gaps
- I did not run the app; DESIGN.md is trusted as written (the 2026-11-16 M20 audit notes some of its values are unverified, e.g. the streak pill's height).
- No performance budget is written anywhere (no byte or load-time limit). The only numbers are 60 fps and a 16.7 ms frame for Afterglow, and the owner's "Stop here" at 1.78 MB compressed for the village.

## 5. Themes and customization features that exist

### Takeaway
Player-selectable themes exist and are live: five presets plus "Follow the phone", saved on the account. Custom themes were ruled out. Game looks were never player-selectable; the pixel plan was one look per game, with extra themes as possible "spinoffs".

### Cited Findings
- "preset themes like monkeytype's, 'not that many', and no custom themes; every preset passes L10"; saved "On the account" — [M14-look-and-feel](docs/milestones/M14-look-and-feel.md), L20.
- Presets: Follow the phone (Paper or Night), Sky, Moonlit, Ink. Moonlit is monkeytype's "rose pine moon" colours renamed, credited on About at the owner's wish: "i dont feel good about just stealing the color palettes so unelss its illegal lets just have a disclosure section and credit them. same with disclosing ai usage as well maybe" — same file, L21, L48; [M14-14b-1](docs/milestones/M14-14b-1-themes.md).
- AI disclosure wording the owner chose: "Plor is built with help from AI."; "just dont be too specific when tlking aobut ai usage please just the bare minimum" — [M14-14b-1](docs/milestones/M14-14b-1-themes.md).
- Status: done, PR #86 merged 2026-10-26; stored as `private.profile.theme` (device, paper, night, sky, moonlit, ink) with a `localStorage` copy to avoid a flash — [M14-14b-1](docs/milestones/M14-14b-1-themes.md); `docs/DECISIONS.md` log 2026-10-25.
- Other player settings touching the look: "Numbers on the calendar" switch; "Skip the game screen"; profile pictures are planned as "Pick from Plor's avatars" (no uploads), with a round initial slot until then; cosmetic frames "later" — [M14-look-and-feel](docs/milestones/M14-look-and-feel.md), L37, L39, L46, Out of scope.
- Game themes: "still chooisng one. if i like 2 or 3 then they can be spinoffs. also we can just iterate and develop more themes later" — [M14-14c-4](docs/milestones/M14-14c-4-five-themes-rebuilt.md), answer 1.
- Streak ranks are a small piece of personal identity already shipped: Seed, Daisy, Morning glory, Hibiscus, Lotus, Sakura (vector) — [M14-14b-2a](docs/milestones/M14-14b-2a-streak-ranks.md).

### Inferences
- (Mine.) The owner's new wish for each game to be "very personal and customized" has no earlier ticket behind it in the sense of per-player customization of a game's look. The nearest precedents are the themes, avatars (planned) and streak ranks, all on the shell side.

### Gaps
- Whether "personal and customized" means per-game identity (each game its own world) or per-player choice is not answered by anything in the repo. Earlier statements point to the first ("Stands on its own"; "the game itself gets its own stylized look").

## 6. DECISIONS, ROADMAP, audits, and the owner's plan for when visual work resumes

### Takeaway
The record says: plain is the beta's look, a richer look is separate work afterwards, and no new visual work happens until the app is live. The closed beta starts 2026-11-17. The shelved themes and mocks are explicitly kept as inspiration.

### Cited Findings
- "After that choice is built, no new visual work until the app is live." — `docs/ROADMAP.md`, Focus, "The plan to the beta", "The games' look".
- "the plain look is the beta's and a richer one is its own work afterwards ('Yes, but plain is temporary')" — `docs/DECISIONS.md`, log 2026-11-11.
- "The games go plain" and "The village goes": Afterglow's font, look check and mutants removed; three.js, `@types/three`, `public/brew/` and the polyfork models removed; earlier entries "superseded; they stay as history" — `docs/DECISIONS.md`, log 2026-11-10 and 2026-11-11.
- Earlier ordering statements: "all working features first … nothing visual comes until after things are functijnal" (2026-10-21); "Polish the game first" then "the pixel-art look moves after the MVP too" (2026-10-20) — `docs/ROADMAP.md`, Focus; [M14-look-and-feel](docs/milestones/M14-look-and-feel.md).
- A session memory note (an agent's summary, not a ticket) records the 2026-11-10 direction check as finding "the features on track but effort drifting into polish, with no stop line", and the owner's earlier answer "Freeze after Reduce motion" — `~/.claude/projects/C--Users-jason-RIFF/memory/ship-target-closed-beta.md`.
- Current state of the handoff: "Closed beta with a plain look, guest play, both games"; "no new features before the beta"; "The beta starts Tuesday 2026-11-17 with testers from day one" — `docs/HANDOFF.md`.
- Audit, 2026-11-11: "the bloat scan found no dead code outside the village"; e2e "17 failed, 13 passed" of the last 30 CI runs, mostly the village and Afterglow tests; "About 80 e2e checks pin CSS values" in `look.e2e.ts`, `calm.e2e.ts`, `alive.e2e.ts` (for the owner to keep or cut) — `docs/audits/2026-11-11-weekly-audit.md`, W3, W14, e2e paragraph.
- Deferred visual item still open: the share text's symbols are "Placeholders until the look is settled" — `docs/audits/2026-11-11-backlog-sort.md`, M14-L603; owner earlier: "Keep 🟩 and ⬜" ([14c-6](docs/milestones/M14-14c-6-afterglow-in-play.md), answer 14).
- What is kept for later: the six unpicked pixel directions and the four rebuilt themes; Bug's-Eye Garden, Office Tower, Freight Line pages; a new Afterglow character ("can work on another one later"); the festival and village code in git history; mock sources in a private folder outside the repo (`C:/Users/jason/RIFF-mocks`, per 14c-4) — tickets cited above.

### Inferences
- (Mine.) By the repo's own rule, a new game look is milestone work needing guided questions and a ticket, and by ROADMAP it is not due before the app is live. The beta starting 2026-11-17 is plausibly what "live" means, but no ticket defines the exact gate (closed beta vs public launch).
- (Mine.) Research and mock pages are consistent with the past pattern (every direction started as private pages, "Private page first (Recommended)"), and do not themselves break the freeze, which is about building into the app.

### Gaps
- No ticket yet records the owner's new request (personal and customized games, lots of motion, pixel art or low-poly "done better"). It exists only in this research task's brief.
- "Live" is not defined in ROADMAP's sentence.

## 7. Synthesis: the recurring pattern behind the rejections

### Takeaway
(All of this section is my reading, not the owner's words, except where quoted.) The rejections were never about theme and rarely about the art style as such. They follow a loop: the owner asks for restraint in the frame and more punch in the moment; each review round adds motion and detail on request; the sum becomes heavy to load, slow to build and test, and unlike the neutral shell; the owner then cuts everything at once. The parts that survived each cut were structural, not decorative.

### Cited Findings
(Each bullet restates quoted evidence from the sections above; sources as given there.)
- The escalation loop is visible in the owner's own notes. Afterglow: "the word shooting up is weak" → "still a bit lackluster" → then "It's gone too far". Midnight Brew: "not enough of a movement dynamic" → "more detailed … more movement passively" → then "Both" have gone too far — [14c-5](docs/milestones/M14-14c-5-firework-festival.md), [16g-1](docs/milestones/M16-16g-1-low-poly-mocks.md), [14c-7](docs/milestones/M14-14c-7-simpler-games.md).
- No real-device test preceded either build: "Waits on the human: a real-phone test"; "A real-phone check … the beta's testers will be the first real phones" — [14c-5](docs/milestones/M14-14c-5-firework-festival.md), [16g-2](docs/milestones/M16-16g-2-midnight-brew-in-play2.md).
- The owner judged the pictures of "as built", "calm" and "plain" side by side at phone size and chose plain over calm — [14c-7](docs/milestones/M14-14c-7-simpler-games.md).
- Survivors: full-screen play with ×, pop-up How to play, recap, rarity label, running score, timer bar; in the shell, shadows meaning "press", two-state icons, count-ups, pops — [14c-8](docs/milestones/M14-14c-8-plain-game-1.md), [14c-9](docs/milestones/M14-14c-9-plain-game-2.md), [14b-10](docs/milestones/M14-14b-10-calm-and-alive.md).

### Inferences
1. **Too much, cumulatively, rather than wrong.** Every individual addition was requested or approved. Nothing in the record shows the whole being checked against "small, welcoming but neutral, phone-first" until 14c-7. A future direction needs a stated ceiling (what the scene may never do) agreed before iteration, because iteration only ever added.
2. **Mocks reward spectacle; daily play does not.** Each mock was judged by watching one run on a desktop. The original feeling brief leaned "slightly towards daily ritual". Climbs, walks, casts and lantern ceremonies add seconds to every one of 7 questions, every day. The owner's cuts point this way (no finale, no result card, cast automatically, "very short" finale), and the kept features are all fast. I found no owner quote that says "too slow for daily play" in those words.
3. **Legibility was a steady rule, not the cause of rejection.** Text must not be distorted, wants high contrast, a quiet centre, fonts that are not "heavy or blocky". Pixel fonts cost a whole selection round and still ended as an exception to "one font". Any stylized look should assume Baloo 2 (or a font that passes the same test) for all reading text.
4. **Pixel art's specific failures:** (a) too small a canvas for the subject (flowers at 16×16); (b) low frame rates read as cheap ("i dont like the 12 fps type"); (c) code-drawn backgrounds lacked cohesion and detail until heavily reworked; (d) strict grid rules were loosened repeatedly for smoothness (text may glide, sub-pixel camera), which erodes the "razor-sharp" premise; (e) phone cropping of a 16:9 scene left 146 of 640 pixels, forcing a second portrait design. PixelLab output was good at 32×32 and poor at 16×16, and was passed over early for "code-generated" resolution. "Done better" would mean: portrait-first composition, enough resolution for the subject, 60 fps, one consistent hand for all assets, and a decided stance on grid purity.
5. **Low-poly's specific failures:** all delivery. 10.8 MB of models and a ~779 KB library for a word game; software-GPU frame rates; shadows as the main cost; tests that could not pass reliably. The art itself was accepted. "Done better" would mean a far smaller scene (the first, zoomed-in yard was lighter than the diorama the owner then asked for), baked lighting or no shadows, a stated download budget, and a real phone in the loop before building.
6. **Inconsistent AI assets were a minor factor, not the pattern.** It shows up once (PixelLab at small sizes) and indirectly in the insistence on "code only" art.
7. **Process cost was a real, if unspoken, factor.** Afterglow needed 91 answers, a 222-line look check and a mutant suite of hours; the village needed four performance workarounds and still failed CI. The agent's memory note calls it "effort drifting into polish, with no stop line". A future look that is cheap to verify (CSS and SVG motion on real page elements, as the shell's is) fits this project's rules far better than a canvas or WebGL scene that needs its own test rig.
8. **What "not neutral" seems to mean here.** The shell is deliberately neutral and themed by the player; each game was meant to "stand on its own". The worlds overrode the player's theme, font and screen. The plain games swing fully the other way (a banner colour each). The unexplored middle is a game identity expressed through the app's own materials: a signature colour and motif per game, bespoke motion on the word and the timer, small drawn art with its own fixed palette, escalation shown in the frame rather than in a world behind it.
9. **Stable preferences to carry forward** (each quoted earlier): one hue family for backgrounds; escalation from dark or quiet to bright by the last question, "caused by something visible"; the typed word is the hero and its reward scales with rarity or score; a distinct, visible moment for a taken letter; idle life that is small; the camera still while typing; nothing costs the player clock time; a calm version that still shows the reward.

### Gaps
- The owner has not said which of these readings is right. The single most useful question for a new round is what, specifically, made both games "gone too far" when seen side by side, since the tickets do not say.
- No player has given feedback on any look: every judgement so far is the owner's alone, before the beta.
