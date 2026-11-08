# M16 — 16g-1, two low-poly 3D mocks for game 2's look

**Status:** in review (drafted and approved 2026-11-07, Pacific, from three rounds of guided questions: "Approve, build mocks"; revision 2, 2026-11-08, after the human tried the first two pages: more movement, a zoomed-out diorama, and two more worlds, Office Tower and Freight Line, from two more rounds; all four built, reviewed and published; waits on the human to try them and pick).

## Goal
Two playable, animated, low-poly 3D mocks of game 2's look, built from polyfork.dev's models, each a private claude.ai page, so the human can pick game 2's look before anything goes into `/play2`.

## Who uses it / what breaks without it
- Used by: the human, choosing game 2's look (M16 Plan step 6, "16g": "the game's look, as M14 14c did for game 1").
- Breaks without it: game 2 plays at `/play2` with plain screens and no look. Its chosen look was Moonbrew, a pixel-art cauldron (M16, Answers 2026-11-05, 2), which the human now replaces with a low-poly 3D look (answer 1 below). With no direction to try, 16g has nothing to build.

## Source
- CLAUDE.md, "Ask before designing": the answers below are the source for this sub-ticket. No entry in SOURCES.md covers the game's look; the human's answers stand in for one, as in M14 14c-3.
- **polyfork.dev's licensing page** (https://polyfork.dev/licensing, "Last updated November 2026", read 2026-11-07; added to SOURCES.md at the human's OK, answer 13). Followed: "Free models: CC BY 4.0, or ours" (the mock pages host copies of the mesh files under CC BY 4.0, with the credit line), and "The Polyfork licence: What you can do / What you cannot do" ("Your game can ship the models inside it; the files as standalone assets stay here"), which answer 12 picks for the shipped game. The repo https://github.com/lucas-martinic/polyfork-catalog is an index of that store (3,086 models, 47 kits), not a source of rules.
- **polyfork.dev's clips module**, `https://polyfork.dev/cdn/clips.mjs` (read 2026-11-07), for the clip format and its licence notes only: its Mixamo-baked clips (Idle, Walk, Run, Agree, Laughing and others) are served from polyfork's CDN alone and are "not ours to hand out as files"; the clips listed under "Quaternius UAL (CC0)" (Arms folded, Interact, Dance, Crouch and 23 more) are CC0. Not added to SOURCES.md: no code in the repo uses it yet; 16g-2 asks.
- The game's rules for the mocks' sample play: M16 ticket S5 (7 rounds), S6 (20 s), S7 (no elimination), and 16e's scoring (`src/config/tunables.ts:199-201`).

## Answers (human, 2026-11-07)
The human's ask: "can you take a look at this repo https://github.com/lucas-martinic/polyfork-catalog and see if we can possibly create one of the games with this art style for the theme (first one was pixel art), focusing on primarily some fun, basic animations to go with the gmae"

Round 1
1. Which game: "Game 2, replace Moonbrew". Game 2 gets a low-poly 3D look instead of pixel art; Moonbrew's pixel mock (M14 14c-3, K) is set aside, kept as inspiration (14c-3 answer 20).
2. World: "Claude proposes 3–5 worlds".
3. Animations that matter, quoted whole: "characters only if itll work well, not that high prio,The typed word comes alive,The scene escalates,Small idle life".
4. How to try it: "Private mock page (Recommended)".

Round 2 (Claude proposed four worlds from the catalog's kits: Midnight Brew, Dragon's Hoard, Freight Line, Bug's-Eye Garden)
5. Worlds to mock: "Midnight Brew,Bug's-Eye Garden".
6. Escalation: "At rounds 3 and 6".
7. Camera: "Reacts to play".
8. Phone, upright: "Scene on top, typing below".

Round 3
9. Camera while typing: "Still while typing (Recommended)". It moves on send and at an escalation.
10. When the word comes alive: "Only when you send it". The player types in a plain field; the sent word then flies into the scene.
11. Characters: "Try real animations". Use polyfork's animation clips; fall back to code-only motion if they're heavy or glitchy on a phone.
12. Models in the shipped game: "Bundle them, no credit" (the Polyfork license). The mock pages show a credit line either way.

Approval
13. To "Approve the 16g-1 ticket and add polyfork's licensing page as a source?": "Approve, build mocks".

## Revision 2 (human, 2026-11-08), after trying the first two pages
The human's feedback, quoted whole: "i feel like its not the theming thats the problem, but that theres not enough of a movement dynamic. i believe we should zoom out a bit, have more details from a diorama/birds eye view of a large area and have more drastic movement as the game progresses. i.e, elevators moving up and going to different office floors? etc. maybe suggest 3 more themes while fixing these two"

Round 4
14. The movement: "try mix of jourey and the place transforming, dont incorporate both in one right now". One world travels to a new spot each round; the other stays put and transforms; never both in one world.
15. Pacing: "Same size every round". Every round moves the world one equal step; this replaces answer 6's shifts at rounds 3 and 6.
16. The view: "use your judgement, consider what it looks like on phone and desktop (want to make sure it looks good for both)".
17. New themes: "Pitch, you pick, then build".

Round 5 (Claude pitched Office Tower, Freight Line and Moon Base)
18. Which way round: "Garden travels, Brew transforms (Recommended)".
19. New themes to build: "Office Tower (travels up),Freight Line (travels across)". Moon Base stays an idea.

**Claude's reading of answer 16, as built:** a tilted miniature: the camera high and far back with a narrow lens, so a whole area reads as a model on a table; no depth blur, as a blur pass costs frame rate on phones. On a phone a travelling world is framed tall around its current stop, and the transforming world on the busy middle of the diorama.

| | Bug's-Eye Garden | Midnight Brew | Office Tower | Freight Line |
|---|---|---|---|---|
| Movement (answers 14, 18, 19) | travels down: round 1 is the meadow above the nest; each sent word is hauled one chamber deeper (seed store, nursery, fungus garden, dew well, treasure hall, root hall) and the camera rides down with it; the finale reaches the queen's chamber | transforms: a wide view of a witch's hill village on a round diorama base; after each round the brew's magic changes one part: round 2 the lanterns, 3 the pumpkin patch, 4 the moon, fog and bats, 5 the graves, 6 the haunted house, 7 the trick-or-treaters; the finale a column of light and fireworks | travels up: a cut-away skyscraper; each word sends the glass elevator up a floor, ending at the rooftop | travels across: a long countryside diorama; each word couples a wagon and the train runs on to the next station |
| Kits | Insect World and the unkitted bugs | Halloween Night, Dungeon & Crypt | Office, Open Plan | Countryside Railway, Cozy Farm, Alpine and Snow |
| The sent word | letter blocks drop into the chamber and ants lift them onto their backs; on Continue they carry them down the tunnel, and the letters stay as a pile in the chamber they reach | letter blocks arc into the cauldron and splash, as in revision 1 | letter blocks hop into the glass lift; on Continue the lift rises a floor and the letters are delivered onto that floor as a pile | letter crates are loaded onto a newly coupled wagon; on Continue the train runs 140 m to the next station |
| A time-up | the chamber floor crumbles and the letters tumble away | the letters fizzle into smoke, the cat arches, the witch crouches | the lift doors slam on the letters and they crumple into paper | the crates fall onto the track and the arriving wagon bowls them away; it couples on empty |
| The finale | the last load reaches the queen's chamber | a column of light and fireworks, everyone dances | the lift reaches the roof and a helicopter lands | the train runs into the terminus's engine shed and fireworks start |

Built by Claude: Bug's-Eye Garden and Midnight Brew in this session; Office Tower and Freight Line by two subagents on the same harness, each checked by Claude before publishing. Office Tower's sky was first built going from day to night as the lift climbed; the review found that made it travel and transform at once (answer 14), so the sky is held at one late-afternoon look.

## The two worlds (Claude's proposal, for approval)
| | Midnight Brew | Bug's-Eye Garden |
|---|---|---|
| Kits | Halloween Night, Dungeon & Crypt | Insect World, plus the unkitted Ant queen, Honeybee and ladybird |
| Scene | A witch's yard at night: the Bubbling Tripod Cauldron in the middle, the Kid Witch beside it, a black cat on a headstone, pumpkins, a cemetery fence, lantern posts | Ground level in a meadow at ant size: the Ant Nest Entrance Mound in the middle, dandelions and a daisy, fallen leaves, a bottle cap, the Matchbox House, glowing mushrooms |
| Idle life (answer 3) | the brew bubbles and steams, lanterns flicker, the cat's tail sways and it blinks, fog drifts | grass sways, dandelion seeds drift, a dewdrop wobbles, a ladybird crawls, a bee passes |
| Word comes alive, on send (answer 10) | the word becomes chunky 3D letter blocks that arc into the cauldron one by one, each with a splash; a longer word makes a bigger splash and a taller plume; the bonus letter glows | the word becomes letter blocks that ants haul into the nest; a longer word brings more ants and a heavier load; the bonus letter glows like a dewdrop |
| A miss or time-up (no elimination, S7) | the letters fizzle into smoke and the cat flinches | a gust blows the letters away |
| Round 3 (answer 6) | the moon rises, the brew turns green and boils harder | golden late light, more bugs about |
| Round 6 | wind, lightning, and the cauldron foams over | rain: drops splash, puddles form, thunder |
| Score tracker | the brew's level and glow rise with the score | the nest's store, shown in a cutaway, grows with the score |
| After round 7 | the brew erupts in a column of light holding the score | the sun breaks through and the nest lights up |
| Character (answer 11) | the Kid Witch stirs, cheers, flinches, using polyfork's clips | ants, the ladybird and the bee play their own models' clips (Walk, Fly), moved along paths by code |

Shared by both:
- **Camera (answers 7, 9):** one held angle, still while the player types; on send it punches in on the cauldron or nest and shakes a little at the splash, then settles back; at rounds 3 and 6 it pulls back to show the shift.
- **Layout (answer 8):** the scene on top and the letters, field and score below, at every width.
- **Text:** Baloo 2, Plor's one font (HANDOFF, Fonts), so no new font is added.
- **Rendering:** three.js (WebGL), the library polyfork's README targets, pinned to the version its example uses, three@0.180.0, loaded from cdnjs or jsdelivr on the mock pages.
- **The model files on the mock pages:** copied onto each page, as a claude.ai page can fetch only its own files, with the credit line "Models by Polyfork, CC BY 4.0" (answer 12). As built, see Source diff.

## Acceptance criteria
- [x] Two private claude.ai pages, Midnight Brew and Bug's-Eye Garden, each linked in this ticket.
- [x] Each plays a sample run of 7 rounds with a 20 s clock: type a word, send it, see the word come alive, the points, and the tracker move (answers 3, 10).
- [x] Each scene escalates at rounds 3 and 6, and the page lets the viewer jump to rounds 1–7 to see the shifts (answer 6).
- [x] The camera holds still while typing and moves on send and at each shift (answers 7, 9).
- [x] At a 390×844 portrait phone the scene sits above the typing area, uncovered (answer 8).
- [x] Midnight Brew's Kid Witch plays real clips, or the ticket records why it fell back to code-only motion, with the measurement (answer 11). Real CC0 clips; Source diff says why not polyfork's CDN ones.
- [x] Each page shows the polyfork.dev credit line (answer 12).
- [x] Each page runs in Chrome at 1920×1080 and at 390×844 with no console errors, and its frame time and download size are recorded in Evidence. In claude.ai's own frame and on a real phone: *unverified* (Evidence).

## Out of scope
- Building either world into `/play2` (16g-2, after the human picks).
- Rule changes: the rounds, clock and scoring stay as M16 has them.
- Reduce motion: the mocks always animate. How the built game treats Reduce motion is for 16g-2's questions (Afterglow's answer is M14 14c-6c).
- Game 2's shown name (S1, still open).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 7 rounds, 20 s each, no elimination | The mocks' sample run | M16 S5, S6, S7 (human, 2026-10-22, 2026-11-06) |
| Shifts at rounds 3 and 6 | Escalation | Human, 2026-11-07 (answer 6) |
| Word points `{ at: 3, points: 20, growth: 1.25 }`, different letters `{ at: 18, points: 350, growth: 1.15 }`, bonus letter 120 | The mocks' scoring | `src/config/tunables.ts:199-201` (16e) |
| The sample substrings and accepted words | The mocks' sample run | Proposed by Claude for the mocks only, shaped by `SUBSTRING_ROUNDS` (`src/config/tunables.ts:176`); not game content |
| three@0.180.0 | The mocks' renderer | polyfork-catalog README's example (read 2026-11-07) |
| Animation timings, camera punch and shake sizes, particle counts, colours, the frame rate (the browser's own) | The mock pages only | Proposed by Claude for the human to judge on the pages; not carried into the app without the human's word |
| The tracker's full mark, a total of 2,000; the garden store's 24 seeds | The brew's level and the store's fill | Proposed by Claude for the mocks only (`FULL`, `STORE` in each page's `scene.js`); the game has no such mark yet |
| Sample sets RE, AN, ION, BLE, OCK, IGH, OUN and bonus letter P | The mocks' sample run | Proposed by Claude for the mocks only (`SAMPLE` in `harness.js`), shaped by `SUBSTRING_ROUNDS`; any letters holding the set are accepted, as the mock has no dictionary |
| Revision 2's layouts and timings: the colony's 10-unit chamber step and 2.8 s descent; the village's 3.6 s change per round; the tower's 3.4 m floors, 2.6 s ride and tracker mark of 1,500; the railway's 140 m between stations and 6.5 s run; each world's camera poses (fov 28–30) and Office Tower's fixed late-afternoon sky (`SKY_FIXED` 3.6) | The four mock pages only | Proposed by Claude and the two building subagents for the human to judge on the pages; not carried into the app without the human's word |

## Plan
1. The human approves this ticket and OKs polyfork.dev's licensing page as a source.
2. One shared harness: three.js scene, a held camera with the punch, shake and pull-back moves, the layout, and the sample run (field, clock, points, rounds 1–7 stepper), loaded by both pages.
3. Midnight Brew first, with the Kid Witch's clips tried early. **Hypothesis:** polyfork's characters share one Mixamo-named skeleton and `/cdn/clips.mjs` supplies clips for it (polyfork's llms.txt, read by the survey; clip names *unverified*), so the Kid Witch plays an idle and a cheer through a three.js AnimationMixer. **Disproved if** the clips don't load on the page, don't fit the Kid Witch's skeleton, or drop a 390px phone render visibly below the page's normal frame rate; then it falls back to code-only motion and the reason goes in Evidence.
4. Bug's-Eye Garden on the same harness.
5. Each page is published and its link sent to the human as it's ready; the human picks one, or parts of both, for 16g-2.

## Removes
Nothing in the repo's code: these are review pages outside it. It replaces M16 answer 2's Moonbrew as game 2's direction (answer 1): the M16 ticket's Plan step 6, "16g, Moonbrew", becomes game 2's look in the same commit, and its "Answers (human, 2026-11-05)" item 2 is marked replaced.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| This ticket: the model files go in each page's asset store | Each page carries its models as one `models.json`, a bundle of the same GLB files in base64, decoded and parsed in the page | claude.ai pages refuse to serve `.glb` ("one file is of a type artifacts don't serve") and the asset store takes no 3D type either; the bundle is the same bytes, about a third larger |
| Plan 3's hypothesis: the Kid Witch plays clips through polyfork's `/cdn/clips.mjs` | The page copies four CC0 clips (Arms folded for her idle, Interact for the toss, Dance for the cheer, Crouch for a miss) and binds them with the harness's own loader, written to the format `clips.mjs` reads | Disproved before running: a claude.ai page can't load scripts or fetch from polyfork.dev, and the Mixamo-baked clips (Idle, Laughing and the rest) may not be copied (clips.mjs's licence note). The CC0 clips may be copied, so 16g-2 can bundle them too |
| The table: Bug's-Eye Garden's ants and bugs move by code | Ants, the ladybird and the bee play their models' own clips (Walk, Fly), moved along paths by code | The models came with those clips inside |
| The table: the brew's colour on its surface | The cauldron model's own bubbling surface shows, with the page's brew disc and light tinting it | The model has its own animated brew (its `tick` clip); both kept |

## Evidence
**The pages**, private to the human (published 2026-11-07; their source lives in the session's scratchpad, not the repo, as in 14c-3):

| | Link | Files |
|---|---|---|
| Midnight Brew | https://claude.ai/artifact/CRVWtWk9NBgnWymHzkbhiP (version 3) | 17 models, 5.65 MB as `models.json` (4.1 MB of GLBs), 4 clips, 0.15 MB |
| Bug's-Eye Garden | https://claude.ai/artifact/133QHpaNVLBoNz88JaxGu4 (version 2) | 21 models, 9.60 MB as `models.json` (7.0 MB of GLBs; the ant, ladybird and bee are 1.7 MB each) |

Both load three@0.180.0's ES modules from jsDelivr (0.6 MB for `three.module.js`, plus GLTFLoader and SkeletonUtils).

**Checks.** The scratchpad holds the pages' source (`mocks/`, built by `python -I mocks/build.py` into `mocks/dist/`), a no-cache local server (`python -I serve.py mocks/dist 8766`), `shot.mjs` (Playwright driving Chrome: headless, the PC's RTX 3080 through ANGLE D3D11; it saves screenshots and prints console errors and warnings, page errors, sideways overflow and the page's own fps readout) and `check.sh`, which runs every scenario on both pages. After the review's fixes, `sh check.sh` gave (renderer and `"overflowX": false` lines left out, as every run had them):

```
== brew 1920 1080 1 idle { "scenario": "idle", "stats": "60 fps · 1.8 ms draw", "errors": [] }
== brew 390 844 3 idle { "scenario": "idle", "stats": "60 fps · 1.2 ms draw", "errors": [] }
== brew 1280 800 1 play prepare { "scenario": "play", "stats": "60 fps · 1.4 ms", "pipsDisabledDuringSend": true, "errors": [] }
== brew 390 844 3 play prepare { "scenario": "play", "stats": "58 fps · 1.3 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== brew 1280 800 1 jumps { "scenario": "jumps", "stats": "60 fps · 1.5 ms draw", "errors": [] }
== brew 1280 800 1 shift { "scenario": "shift", "stats": "60 fps · 1.3 ms draw", "errors": [] }
== brew 1280 800 1 miss { "scenario": "miss", "stats": "60 fps · 1.6 ms draw", "errors": [] }
== brew 1280 800 1 finale pounder { "scenario": "finale", "stats": "60 fps · 1.3 ms draw", "errors": [] }
== brew 1280 800 1 after pounder { "scenario": "after", "stats": "60 fps · 1.2 ms draw", "afterAgain": { "startShown": true, "finaleHidden": true, "total": "0" }, "errors": [] }
== garden 1920 1080 1 idle { "scenario": "idle", "stats": "60 fps · 2.1 ms draw", "errors": [] }
== garden 390 844 3 idle { "scenario": "idle", "stats": "60 fps · 2.1 ms draw", "errors": [] }
== garden 1280 800 1 play prepare { "scenario": "play", "stats": "60 fps · 2.0 ms", "pipsDisabledDuringSend": true, "errors": [] }
== garden 390 844 3 play prepare { "scenario": "play", "stats": "60 fps · 1.6 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== garden 1280 800 1 jumps { "scenario": "jumps", "stats": "60 fps · 2.9 ms draw", "errors": [] }
== garden 1280 800 1 shift { "scenario": "shift", "stats": "60 fps · 2.2 ms draw", "errors": [] }
== garden 1280 800 1 miss { "scenario": "miss", "stats": "60 fps · 3.3 ms draw", "errors": [] }
== garden 1280 800 1 finale pounder { "scenario": "finale", "stats": "60 fps · 5.9 ms draw", "errors": [] }
== garden 1280 800 1 after pounder { "scenario": "after", "stats": "60 fps · 3.6 ms draw", "afterAgain": { "startShown": true, "finaleHidden": true, "total": "0" }, "errors": [] }
```

What the screenshots showed (read after the runs):
- Midnight Brew: "prepare" in round 1 (letters pop up and arc into the pot one by one, the gold P splashes gold, the camera punches in and shakes, the witch tosses and cheers; +170 = 7 letters 50 + bonus P 120; the tracker lights A E P R); rounds 3 and 6 (green boil and the moon up; rain, wind, lightning and foam); a send then Continue into round 3 (the camera pulls back as it shifts); a time-up (grey letters fall and fizzle, the cat arches, the witch crouches; +0); the finale (a column of light); round 1 after a finished run with no column left.
- Bug's-Eye Garden: letters drop and bounce at the nest and ants come out one per letter and carry them in; golden light at round 3; rain, splashes, puddles, thunder and glowing mushrooms at round 6; a gust blows a missed word away; light shafts at the finale.
- At 390×844 both scenes sit above the panel, uncovered; the garden's soil cutaway reaches the panel.
- The page frame on claude.ai itself is *unverified*: the browser pane isn't signed in to claude.ai, so the human's first open is the first run there.
- A real phone is *unverified*: the 390×844 runs were the PC's GPU at a phone's size.

### Revision 2 (2026-11-08)
| | Link | Bundle |
|---|---|---|
| Bug's-Eye Garden (travels down) | https://claude.ai/artifact/133QHpaNVLBoNz88JaxGu4 (version 3) | 9.65 MB `models.json` |
| Midnight Brew (transforms) | https://claude.ai/artifact/CRVWtWk9NBgnWymHzkbhiP (version 4) | 9.31 MB `models.json`, 5 CC0 clips (Arms folded, Interact, Dance, Crouch, Jog) |
| Office Tower (travels up) | https://claude.ai/artifact/VcEq4hTKBfPcutzDoyuu9a (version 1) | 6.40 MB `models.json`, 10 CC0 clips |
| Freight Line (travels across) | https://claude.ai/artifact/8TcvDRPpQcTHUWzge6fVjD (version 1) | 9.82 MB `models.json`, 4 CC0 clips |

The harness now calls each world's `onAdvance(round)` after every Continue (one equal step, answer 15) instead of the round 3 and 6 levels, moves the camera between stops with `stage.travel`, and starts a round only once every camera move has ended (`stage.settled`, answer 9); `setPose` on a jump or Play again cuts any move still running. After the review's fixes, from the scratchpad, `sh check.sh` (all four worlds, served by `python -I serve.py mocks/dist 8773`) gave, with the renderer and `"overflowX": false` lines left out:

```
== brew 1920 1080 1 idle { "scenario": "idle", "stats": "59 fps · 1.8 ms draw", "errors": [] }
== brew 390 844 3 idle { "scenario": "idle", "stats": "58 fps · 1.0 ms draw", "errors": [] }
== brew 1280 800 1 play prepare { "scenario": "play", "stats": "60 fps · 1.8 ms", "pipsDisabledDuringSend": true, "errors": [] }
== brew 390 844 3 play prepare { "scenario": "play", "stats": "58 fps · 1.1 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== brew 1280 800 1 jumps { "scenario": "jumps", "stats": "60 fps · 1.2 ms draw", "errors": [] }
== brew 1280 800 1 shift { "scenario": "shift", "stats": "60 fps · 1.9 ms draw", "errors": [] }
== brew 1280 800 1 miss { "scenario": "miss", "stats": "60 fps · 1.4 ms", "errors": [] }
== brew 1280 800 1 finale pounder { "scenario": "finale", "stats": "60 fps · 1.6 ms", "errors": [] }
== brew 1280 800 1 after pounder { "scenario": "after", "stats": "60 fps · 1.6 ms draw", "afterAgain": { "startShown": true, "finaleHidden": true, "total": "0" }, "errors": [] }
== garden 1920 1080 1 idle { "scenario": "idle", "stats": "60 fps · 2.1 ms draw", "errors": [] }
== garden 390 844 3 idle { "scenario": "idle", "stats": "60 fps · 4.4 ms draw", "errors": [] }
== garden 1280 800 1 play prepare { "scenario": "play", "stats": "60 fps · 1.8 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== garden 390 844 3 play prepare { "scenario": "play", "stats": "60 fps · 1.9 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== garden 1280 800 1 jumps { "scenario": "jumps", "stats": "60 fps · 1.5 ms draw", "errors": [] }
== garden 1280 800 1 shift { "scenario": "shift", "stats": "60 fps · 1.7 ms draw", "errors": [] }
== garden 1280 800 1 miss { "scenario": "miss", "stats": "60 fps · 2.7 ms", "errors": [] }
== garden 1280 800 1 finale pounder { "scenario": "finale", "stats": "60 fps · 1.7 ms draw", "errors": [] }
== garden 1280 800 1 after pounder { "scenario": "after", "stats": "60 fps · 2.0 ms draw", "afterAgain": { "startShown": true, "finaleHidden": true, "total": "0" }, "errors": [] }
== office 1920 1080 1 idle { "scenario": "idle", "stats": "58 fps · 2.8 ms draw", "errors": [] }
== office 390 844 3 idle { "scenario": "idle", "stats": "59 fps · 5.2 ms draw", "errors": [] }
== office 1280 800 1 play prepare { "scenario": "play", "stats": "60 fps · 3.0 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== office 390 844 3 play prepare { "scenario": "play", "stats": "58 fps · 4.1 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== office 1280 800 1 jumps { "scenario": "jumps", "stats": "60 fps · 3.7 ms draw", "errors": [] }
== office 1280 800 1 shift { "scenario": "shift", "stats": "60 fps · 4.0 ms draw", "errors": [] }
== office 1280 800 1 miss { "scenario": "miss", "stats": "60 fps · 2.8 ms draw", "errors": [] }
== office 1280 800 1 finale pounder { "scenario": "finale", "stats": "60 fps · 2.9 ms", "errors": [] }
== office 1280 800 1 after pounder { "scenario": "after", "stats": "60 fps · 2.5 ms draw", "afterAgain": { "startShown": true, "finaleHidden": true, "total": "0" }, "errors": [] }
== freight 1920 1080 1 idle { "scenario": "idle", "stats": "59 fps · 1.2 ms draw", "errors": [] }
== freight 390 844 3 idle { "scenario": "idle", "stats": "59 fps · 1.4 ms draw", "errors": [] }
== freight 1280 800 1 play prepare { "scenario": "play", "stats": "60 fps · 1.2 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== freight 390 844 3 play prepare { "scenario": "play", "stats": "59 fps · 1.1 ms draw", "pipsDisabledDuringSend": true, "errors": [] }
== freight 1280 800 1 jumps { "scenario": "jumps", "stats": "60 fps · 1.1 ms draw", "errors": [] }
== freight 1280 800 1 shift { "scenario": "shift", "stats": "60 fps · 1.9 ms draw", "errors": [] }
== freight 1280 800 1 miss { "scenario": "miss", "stats": "60 fps · 1.1 ms", "errors": [] }
== freight 1280 800 1 finale pounder { "scenario": "finale", "stats": "60 fps · 2.4 ms draw", "errors": [] }
== freight 1280 800 1 after pounder { "scenario": "after", "stats": "60 fps · 1.0 ms draw", "afterAgain": { "startShown": true, "finaleHidden": true, "total": "0" }, "errors": [] }
```

The screenshots were read after the runs: the garden's ants carry the word down the tunnel with the camera riding along and leave it as a pile in the next chamber, the queen in the last; the brew's magic streaks to each part of the village in turn; Office Tower's lift and camera rise a floor together and the floor wakes; Freight Line's train runs to the next station with the camera following. Still *unverified*: claude.ai's own frame (the browser pane isn't signed in) and a real phone.

## Review
The `reviewer` agent, in a fresh context, 2026-11-07, on the ticket, the docs diff and the pages' source.
- Blocking findings and how each was fixed:
  1. Midnight Brew's Play again threw a ReferenceError: `onReset` held a stray copy of the rain block, which used an undefined `t`. Removed; the `after` check now clicks Play again.
  2. A round number could be tapped during a send, miss, shift or finale, and the animation's end then ran over the jumped-to round. The round numbers are disabled while anything animates; `pipsDisabledDuringSend` is checked.
  3. Jumping to a round after the finale kept the finale's light column (brew) or light shafts and sky (garden). `onJump` now clears the finale; the `after` check jumps to round 1 after a finished run.
  4. After a shift the field took focus about 0.5 s before the 3.4 s camera pull had settled, so the camera moved while typing (answer 9). Each shift now waits 3.5 s before the round starts.
  5. Evidence gave no command or output. The commands and their output are in Evidence now.
  6. The table promised puddles at round 6 in the garden, and none were built. Five puddles now grow with the rain.
  7. `docs/HANDOFF.md` didn't mention 16g-1. Rewritten in this commit.
- Deferred to ROADMAP "Next revision" (For M16): a word over 12 letters sharing an ant; the swallowed font-load failure; the rim values, ant and seed counts missing from Numbers; Source diff row 2's wording and the sample sets listed twice in Numbers; the single credit line; the camera re-framing when an Android keyboard resizes the page; whether polyfork's JSON re-bakes of the Quaternius clips stay CC0.
- Answered from what was read: the 38 models are the catalog's free low-poly GLBs from `https://polyfork.dev/cdn/<id>.glb` (polyfork's llms.txt: "every low poly model" is free, the HD editions are the paid part), so the pages host them under CC BY 4.0; none comes from a private kit (each is listed in the public catalog). The clips inside the cat, ant, ladybird and bee GLBs are part of those mesh files.

Revision 2: the `reviewer` agent, in a fresh context, 2026-11-08, on the four worlds, the harness and the ticket.
- Blocking findings and how each was fixed:
  1. Office Tower travelled and transformed at once: its sky, lights and city went from day to night as the lift climbed (answer 14), in unequal keyframe steps (answer 15). The sky now holds one late-afternoon look (`SKY_FIXED`, a mock value).
  2. Midnight Brew's `onAdvance` resolved on wall-clock time while its camera punch ran on stage time, 0.1 s apart, so a slow frame could start the round with the camera still moving (answer 9). The harness now waits for `stage.settled()` before every round, for all four worlds.
- Deferred to ROADMAP "Next revision" (For M16): the pumpkin kid's doubled clip speed; the garden's bigger first step and missing in-scene tracker; Brew's round-4 step changing more than the others; the phone cost of point lights, shadows, the per-frame sky recolour and 6–10 MB downloads; the unused marble, Office Tower's fixed-step tumble and phone framing, `build.py`'s stale clips, Brew's credit wording. `setPose` keeping moves after a jump, which the review listed as non-blocking, was fixed with blocking item 2, as it is the same rule.
