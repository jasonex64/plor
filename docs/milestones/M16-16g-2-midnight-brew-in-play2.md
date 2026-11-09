# M16 — 16g-2, Midnight Brew becomes game 2's run

**Status:** in progress (drafted 2026-11-08, Pacific, from three rounds of guided questions; approved: "Approve, start 16g-2a"; 16g-2a built and reviewed, in review as PR #173 after 16g-1's PR #171 merged; 16g-2b and 16g-2c next).

## Goal
Play game 2's real run at `/play2` in Midnight Brew, the low-poly witch's village approved in 16g-1 (version 6), full screen, with the end of the run kept as today's cards.

## Who uses it / what breaks without it
- Used by: every player of game 2, from the first round to the results.
- Breaks without it: game 2's look is chosen (16g-1, answers 20–29) but players still get the plain kit screen (`src/app/substrings.tsx`, 16d-2), so game 2 has no identity at the beta, where both games ship (M16, Answers 2026-11-05, 1).

## Source
- `docs/milestones/M16-16g-1-low-poly-mocks.md`, Revisions 3 and 4 and answers 20–29, and the built page, https://claude.ai/artifact/CRVWtWk9NBgnWymHzkbhiP version 6 (its source in the 16g-1 session's scratchpad, `mocks/brew/scene.js`, `mocks/shared/harness.js`). What players see is copied from there unless this ticket says otherwise.
- `docs/DECISIONS.md`, "Game 2: the substring game": 7 rounds, 20 s each, no elimination, a try matched on its letters alone, the scoring; and M16 16d's answers (the next letters stay hidden until Next starts the clock, answer 5; the 0.5 s lockout, 16b answer 6).
- polyfork.dev licensing (SOURCES.md): the models ship inside the game under the Polyfork licence, with no credit (16g-1 answer 12).
- MDN `prefers-reduced-motion` (on `main`'s SOURCES.md since M14 14c-6), for the calm version (answer 5).
- Next.js (SOURCES.md, App Router) and the bundled docs in `node_modules/next/dist/docs/` (AGENTS.md), for the client component and static files. To read before building.
- Playwright (SOURCES.md), for `e2e/brew.e2e.ts`.
- **Sources added at the human's OK** (answer 12; SOURCES.md, Rules):
  - three.js, https://threejs.org/docs/ (WebGLRenderer, GLTFLoader, SkeletonUtils, AnimationMixer, InstancedMesh) and its MIT licence, version 0.180.0, the version the mock and polyfork's README use. The one new dependency (answer 3).
  - Lighthouse's throttling docs, https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md ("The mobile network throttling preset", "Calibrating the CPU slowdown") and `core/config/constants.js` (`MOTOGPOWER_EMULATION_METRICS`), at commit `ea58ed1`, read 2026-11-08: the phone profile for the measurements (answer 9).
  - MDN `Window.matchMedia()`, https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia: reading Reduce motion from script, the gap 14c-6 found for its calm version.
- **Later, for 16g-2c:** a mesh compression tool and its docs (glTF-Transform or meshoptimizer's gltfpack), asked for when 16g-2c starts.

## Answers (human, 2026-11-08)
Round 8
1. Scope: "The run, then cards (Recommended)". The 7 rounds play in the village; the end (score, standing, words) stays as today's cards.
2. Screen: "Full screen, with a way out (Recommended)". In a run the top and tab bars hide; the village on top, the typing panel below; a small button leads back to the app, as Afterglow.
3. Code: "Move the mock in, adapt it (Recommended)". The mock's scene comes into the repo as plain three.js in one client component, driven by the real run.
4. Download: "Measure first, then decide".

Round 9
5. Reduce motion: "A calm version (Recommended)". Same village and rounds, no camera punches, slams or shake, gentler eruptions, slower idle life.
6. Character clips: "No character clips". The witch moves by code only. **Claude's reading:** the animals' moves are clips inside their own model files, so they stay; the CC0 clip files don't ship.
7. A refused try: "A small fizzle (Recommended)". A puff of grey smoke from the cauldron and the reason under the box; the camera doesn't move.
8. Measuring: "Emulated phone (Recommended)".

Round 10
9. Round 7's change: "A jack-o'-lantern parade". Glowing pumpkins hop round the path, moved by code, instead of the trick-or-treaters (whose walk needed the clips).
10. The phone profile: "Lighthouse's mobile defaults (Recommended)".
11. The download, after the measurement below: "Stage it, then compress (Recommended)". The village and the witch load first so the run can start; the animals stream in after; then mesh compression is tried, measured, and kept only at the human's word.

Approval
12. To "Approve the 16g-2 ticket, its three new sources, and carrying the mock's values?": "Approve, start 16g-2a". The three sources are added to SOURCES.md, the mock's values in Numbers carry into the app, and `main` is merged into `m16-game-2` first.

During 16g-2a
13. A slow GPU, asked after CI's software renderer drew the village at about 2 to 5 frames a second (a measured 5.3 fps, `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))`, against 60 on this PC's GPU): "Draw less when frames are slow (Recommended)". When frames are slow the village draws less often and its moments keep real-world time; Claude proposes the thresholds for the human's OK (Numbers).

14. A village too heavy for a machine with no GPU, asked after each software draw blocked the page for about 0.6 s (558 draw calls and about 182,000 triangles a frame; render() itself 6 ms of the main thread's time) and two hypotheses had failed (the pixel count, then compiling shaders in the background): "Merge the scenery (Recommended)". The props that never move are joined into a few meshes, with no change to the look.

After the review
17. The test browser's `--enable-unsafe-swiftshader` (software WebGL for CI's GPU-less runners, a security flag): "Approve the flag (Recommended)". Playwright's Chromium only; no player's browser is affected (DECISIONS.md, log).
18. The slow-GPU numbers (Numbers): "OK the numbers (Recommended)".
19. After the review's fixes, the browser tests failed again: the page stayed busy for 4 to 8 s after Start in software drawing, so the round showed late. Two hypotheses failed first: the review's median sample (the log showed ten gaps of about 600 ms, so the slow mode did switch on), then Start waiting for the village to set its pace (kept, as it frees the page from about 8 s after Start, but the round still showed 4 to 8 s late). Asked: "Profile first (Recommended)". The hypothesis, written before the profile: if the animals' second stage is the cause, the main thread's time in the 10 s after Start is mostly three.js compiling and linking shader programs, called from that stage's `compileAsync` (this software WebGL has no `KHR_parallel_shader_compile`). Compiling under a quarter of that time, or the animals in before the click, would disprove it.

    Result: **disproved.** A CPU profile of the 10 s after Start (`e2e/zz-start.e2e.ts`, a throwaway; Chrome DevTools Protocol `Profiler`, 1 ms samples) had the animals in at 5.5 s and the click at 7.0 s. Of 10.9 s the main thread was idle 6.6 s and in the browser's own native work 4.1 s (software WebGL's pipeline); our JavaScript and three.js's together took about 0.2 s. So no code of ours holds the page after Start. With Start waiting for the pace, `brew.e2e.ts` and `play2.e2e.ts` then passed together twice (8 of 8, 2.3 min each). The reading that fits every run: before that change, Start enabled while the ten deciding frames, about 6 s in software, still held the page, and the runs that passed had clicked after them. A clean timing of that window wasn't taken (*unverified*).

On PR #173's CI
20. CI's `e2e` failed twice on game 2 (retry included). Its software draws ran longer than a frame's 0.25 s cap, so the village's clock fell behind real time, and a word's moment and the cast took over 15 s. Asked what a frame may carry: "Up to 1 s (Recommended)". The cap still stops a jump when a hidden tab comes back.
21. `play2.e2e.ts`'s lockout test needs its third try at the server within 0.5 s of the one before, and Playwright's fill, enabled check and Enter each waited for slow frames: "Submit in one step (Recommended)". The test types and submits in one call in the page, as it already did for its double Enter, and keeps all three checks (the box usable, "Too quick", the box cleared).

## Merging the scenery (answer 14)
The hypothesis, written before the change: SwiftShader's cost per frame is mostly per draw call (state, uniforms and a shader run set up for each call, twice for a shadow caster), not per triangle, since a smaller canvas didn't help. Joining every prop that never moves (the island, rocks, roots, paths, buildings, fences, graves, tufts, mushrooms and the rest), grouped by material, should take the draw calls from 558 to under 200 and a software draw from about 600 ms to under 250 ms. A draw that stays above 400 ms would disprove it: the cost would then be in triangles or lights.

Result: **disproved.** The join took the draw calls from 558 to 268 (`renderer.info.render`: `"calls":268,"triangles":185929`), and a software draw still blocked the page for a median 618 ms (long tasks, `e2e/zz-debug-arc.e2e.ts`, a throwaway). Then, rather than a fourth guess, one run switched the draw's parts off in turn on the same page (`e2e/zz-attrib.e2e.ts`, a throwaway; median long task over 12 s each, a 1280×520 canvas):

| Variant | Median draw |
|---|---|
| As built | 618 ms |
| The shadow map not redrawn each frame | 196 ms |
| No shadows at all | 155 ms |
| No shadows, the point lights off | 65 ms |

So about two-thirds of a software draw is the shadow pass: the moon's 2048×2048 shadow map is redrawn every frame, about 4.2 million pixels against the canvas's 0.67 million, which is why a smaller canvas didn't help. The lights are most of the rest.

After that result:
15. What a slow GPU does about shadows: "Draw shadows once (Recommended)". Once answer 13's check finds a slow GPU, the shadow map is drawn once more and then held; a GPU keeps live shadows. On a slow machine moving things' shadows stay put and the letter blocks cast none.
16. Keeping the join: "Keep it (Recommended)". Fewer draw calls is less work a frame for a phone's CPU (*unverified*), with no change to the look.

The hypothesis for answer 15, written before the change: with the shadows held, a software draw should fall to about 200 ms (the frozen-map variant above), and with no draws before the village shows (the stage drew its off-page canvas while the village loaded), Start should come sooner. `brew.e2e.ts` and `play2.e2e.ts` should then pass in software rendering. A draw still above 400 ms, or the way-out test still failing, would disprove it.

Result: **held**, after a correction. A first reading seemed to disprove it: long tasks stayed near 590 ms. But that run had set the shadows back to live and forced GPU syncs with its own probes. Rerunning the switch-off run on the new code also showed its "As built" row was polluted: those long tasks were left over from loading, reported late. With the shadows held and with them live it measured 202 and 214 ms. So the table's first row overstates a draw, and the held shadows' gain is in the first frames, before the slow GPU is found (*unverified* beyond that). A clean timeline (`e2e/zz-timeline.e2e.ts`, a throwaway: long tasks in 5 s windows, nothing else run on the page) twice gave Start at 4.6 and 4.9 s after `/play2` opened, the animals in before Start (4.1, 4.4 s), then a median 190–210 ms a draw, the page busy about 2 s of every 5. With a console listener attached the numbers were the same.

## The measurement behind answer 11
`measure.mjs` (the 16g-1 session's scratchpad) loaded the version 6 page in headless Chrome under Lighthouse's mobile preset: 150 ms latency, 1.6 Mbps down, 750 Kbps up, a 4× CPU slowdown, a 412×823 screen at 1.75 (request-level throttling, which Lighthouse's docs call an approximation). The hypothesis, written first: 16.7 MB at 1.6 Mbps is about 84 s of transfer, so the scene would be ready after 85–95 s, and a result under 60 s would mean the throttling didn't apply. Result: `"shellMs": 6396, "sceneReadyMs": 91238, "transferredMB": 16.65, "idleStats": "59 fps · 12.7 ms draw", "worstFpsDuringHugeWord": 54, "jsHeapUsedMB": 47.9, "errors": []`. The GPU isn't slowed in this setup, so the frame rate is kinder than a phone's (*unverified* on a phone).
In the app the models are served as plain GLB files, not the page's base64 bundle, and the kids go (answer 9): village and props 4.37 MB, the witch 0.90 MB, the animals 5.04 MB, 10.3 MB in all. At 1.6 Mbps that is about 26 s for the first part and 52 s for all of it, by arithmetic that leaves out latency and parsing (*unverified* until 16g-2a measures it).

16g-2a's measurement, the hypothesis written first: on a production build under the same profile (`zz-measure.e2e.ts`, a throwaway: Chrome DevTools Protocol network throttling and a 4× CPU slowdown on a signed-in page, the cache off), Start comes 30–40 s after `/play2` opens (about 5.3 MB of models plus the page's code at 1.6 Mbps), and the animals are in at 55–70 s (10.3 MB). Start under 20 s would mean the throttling didn't apply; Start over 60 s would mean something other than the transfer dominates. This PC's headless Chromium draws in software, as CI's does, so the draw is slower than a phone's GPU would make it.

## Design
- **Where it lives** (as Afterglow, `src/afterglow/`): `src/brew/brew.tsx` (the client component: the canvas, the panel, the way out), `src/brew/scene.ts` (the stage, the camera rig, particles, letter blocks, the tiers), `src/brew/village.ts` (the village, its seven states, idle life, light), `src/brew/brew.module.css`; the models in `public/brew/` as GLB files. `/play2`'s page shows it during a run and today's cards at the end.
- **The run drives the scene:** the scene never decides anything. `SubstringsScreen`'s run state (16d-2) feeds it: a round's letters, the clock, an accepted word with its points, a refused try, a time-up, the end. After an accepted word or a time-up the result card shows with its button waiting while the next part of the village changes (16g-1 answer 25), then Next calls the server, which starts the next round's clock (16d answer 5). After round 7 the short finale plays by itself and the results cards follow (16g-1 answer 26).
- **The word moment:** the tiers by letters, good 6, great 8, huge 10, the bonus letter adding a level (16g-1 answers 21, 22).
- **No character clips** (answer 6): the witch's toss, cheer and flinch become small code-driven moves (a lean, a hop, a crouch) on her rest pose; round 7's trick-or-treaters become a jack-o'-lantern parade (answer 9).
- **Loading in stages** (answer 11): the village, the cauldron and the witch first; the run can start once they're in; the animals and the hearse arrive after and fade in.
- **A refused try** (answer 7): a grey fizzle from the cauldron; the reason stays under the box, as today.
- **Reduce motion** (answer 5): read with `matchMedia('(prefers-reduced-motion: reduce)')`; the calm version keeps every state change and drops camera moves, shake and slams.
- **Not carried from the mock:** the round-number jumps, the fps readout, the sample sets, the "no dictionary" note and the mock's own scoring (the server scores).

## Acceptance criteria
- [x] `/play2` plays a whole real run in the village: the round's letters, the clock, tries, refusals with the fizzle, the 0.5 s lockout, time-ups, Next, and the results cards at the end (answers 1, 7).
- [x] During a run the top and tab bars are hidden and a way-out button leads back to the app (answer 2).
- [x] Each round's word comes alive in its tier, the next change casts by itself with the button waiting, and Next starts the next round's clock; after round 7 the finale plays by itself, then the cards (16g-1 answers 21, 22, 25, 26).
- [x] No clip files ship; the witch moves by code; round 7 brings the parade (answers 6, 9).
- [x] The run can start before the animals have loaded, and they appear when they arrive (answer 11).
- [ ] Under Reduce motion the camera never moves and nothing shakes (answer 5). *(16g-2b.)*
- [ ] On the Lighthouse profile, the time until the run can start and until everything has loaded are measured and recorded, before and after compression; the human decides on compression with those numbers (answers 10, 11). *(16g-2a: before compression measured, Evidence; after, 16g-2c.)*
- [x] `e2e/brew.e2e.ts` plays a run start to finish with no console errors; game 2's existing e2e and unit tests pass; the camera is still whenever the box has focus (16g-1 answer 9).

## Out of scope
- Game 2's shown name (S1, still open) and the shared screens (16f).
- The results cards' look (answer 1).
- A real-phone check (answer 8 chose an emulated phone); the beta's testers will be the first real phones.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 7 rounds, 20 s, the 0.5 s lockout, the scoring | The run | DECISIONS.md, Game 2; M16 16b, 16e |
| Tiers at 6, 8 and 10 letters, the bonus letter adding a level | The word moment | 16g-1 answer 21 |
| 150 ms, 1.6 Mbps down, 750 Kbps up, 4× CPU, 412×823 at 1.75 | The measurements | Lighthouse throttling docs and constants (SOURCES.md, answer 12) |
| Village and witch first, animals after | Loading in stages | Answer 11 |
| A frame keeps real time up to 1 s (the mock's cap was 0.05 s; first 0.25 s, raised at answer 20 after CI); the first 10 drawn frames after the village shows decide; a median frame over 100 ms (under 10 a second) means a slow GPU, a median so that one stall can't decide it (the review), which draws at most every 500 ms | A slow GPU (answer 13; `src/brew/scene.ts`, `MAX_DT`, `SLOW_SAMPLE`, `SLOW_MS`, `SLOW_DRAW_MS`) | Proposed by Claude, **approved by the human** (answer 18). On a slow GPU the shadows are also held once drawn (answer 15; no number). Tuned by measurement: 20 frames and 250 ms left `play2.e2e.ts`'s lockout check failing in software rendering, 10 frames and 500 ms passed it (Evidence) |
| The mock's layout, camera poses, timings (the cast's 2.8 s hold, the 1.4 s finale), light levels, particle counts and the tracker's 2,000 mark | The scene | 16g-1 version 6, proposed by Claude and judged by the human on the page; carried into the app with this ticket's approval (answer 12) |

## Plan
One PR each, from `m16-game-2`, after `main` (Afterglow) is merged into it:
1. **16g-2a, the village plays the run:** three.js 0.180.0 added through `npm run lockfile -- update` (DECISIONS.md, Dependency lockfile) with a DECISIONS entry; the models into `public/brew/`; `src/brew/` ported from the mock and wired to the real run; full screen with the way out; staged loading; no clips, the parade; the fizzle; `e2e/brew.e2e.ts`; the measurement on the Lighthouse profile, first numbers in Evidence.
2. **16g-2b, the calm version** under Reduce motion, with its e2e.
3. **16g-2c, compression:** try mesh compression on the models with a build-time tool (its source asked for then), measure again, and keep it only at the human's word.

## Removes
- `src/app/substrings.tsx`'s plain round and between-rounds views and their styles in `substrings.module.css` (the results views stay, answer 1).
- The M16 ticket's last mentions of Moonbrew as game 2's look.
- Nothing from the mock is copied that the run doesn't use (the review controls listed under Design).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The mock's clock bar runs over a round's 20 seconds | The bar runs from the time left when the round showed, so a resumed round's bar starts full | The run doesn't carry a round's whole length, and the 20 seconds have one home, the database (DECISIONS.md, Config and tunables); adding it to the run is a server change outside this ticket |
| The mock's panel buttons ("Toss it in", "Stir again" and so on) | "Toss it in", then "Casting the spell…" and "Next question" (16g-1 version 6's words); Start keeps game 2's "Start" | The real run's Start and Next are the server's calls (16d); the words follow version 6 |
| The mock's harness ran every animation on a frame time capped at 0.05 s | Frames keep real time up to 1 s, and a slow GPU draws less often | Answer 13: on CI's software renderer the 0.05 s cap stretched a spell to over 20 s |
| Design: "the scene never decides anything" | The village can fail (a model that won't load, an error in a frame), and the run goes on without it, the error shown | DECISIONS.md, Error handling: the error is shown and logged; the panel and the server don't need the village |
| — | The scene's host carries `data-camera` ("still" or "moving") and `data-extras` ("in") | So `e2e/brew.e2e.ts` can check answer 9 (the camera still at the box) and the measurement can time the second stage |
| The mock placed each prop as its own mesh | Props that never move are joined into one mesh per look once the village is built (558 draw calls a frame to 268) | Answers 14 and 16; the look is the same |
| The mock redrew the moon's shadows every frame | A slow GPU draws them once more and then holds them; a GPU keeps them live | Answer 15 |
| The mock's Start was there from the first frame | Start waits until the village has set its pace (the ten frames that decide a slow GPU) | Answer 19's runs: in software drawing those frames hold the page for about 6 s, and a round started then showed too late for the tests and a player |
| The mock drew from its first frame | Nothing is drawn until the village shows | Its canvas is off the page until then, and on a slow GPU those draws held up the load (Start came at 55 s, then 17 s, then 5–6 s once they stopped) |
| — | Playwright launches Chromium with `--enable-unsafe-swiftshader` | CI's runners have no GPU; without software WebGL the village can't draw there (*unverified* on CI until it runs); the human approved the flag (answer 17) |

## Evidence
All on the Windows PC, 2026-11-08, against the local stack; this PC's headless Chromium draws WebGL in software (SwiftShader), as CI's runners do.
- `npx tsc --noEmit -p .` and `npx eslint .`: no output (clean).
- `npm test`: `Test Files  56 passed (56)`, `Tests  640 passed (640)`.
- `npx playwright test brew play2`, after the review's fixes and Start waiting for the pace, twice: `8 passed (2.3m)`, `8 passed (2.3m)`. They cover a whole run in the village (full screen, a refused try with the camera still, a word's moment and the cast while "Casting the spell…" waits, a time-up that still casts, a reload mid-run, round 7's huge word, the finale by itself, the cards, no console errors) and the way out, plus game 2's six existing run tests.
- `npx playwright test live-board look offbeat shell` (the other files that failed once in a full run while `src/` was being edited under it): `30 passed (4.4m)`.
- The phone profile (answer 10) on a production build (`npm run build`, `next start`): `{"startEnabledMs":12398,"startMB":1.64,"extrasInMs":15558,"allMB":2.32,"errors":[]}`. The hypothesis (Start at 30–40 s) was wrong for a found reason: `next start` gzips the models (`curl -H "Accept-Encoding: gzip"`: the house 266,328 bytes sent as 43,886; the witch 939,536 as 100,509; the wolf 905,580 as 223,793), so 2.3 MB of the 10.8 MB travels. Whether Vercel compresses `.glb` too is *unverified*; 16g-2c measures again.
- A software draw once the village is in: a median 190–210 ms, the page busy about 2 s in every 5 (the timeline under answer 15).
- A full `npx playwright test` earlier in 16g-2a: `158 passed`, 7 failed, but `src/` was edited while it ran, so the dev server recompiled under it; every failed file was run again on the final code above and passed. A last full run wasn't taken: it would have crossed Plor's midnight (it takes about 40 min), which the fixtures' day depends on. CI runs it on the PR.
- `npm run test:db` on this PC: `Tests  84 failed | 259 passed (343)`, run 12 minutes before Plor's midnight and with the known leftover day 2026-11-01 still in the local database (`expected [ { puzzle_date: '2026-11-01' }, …(1) ] to deeply equal []`; HANDOFF). 16g-2a changes no server or database code; CI's fresh stack is the check.

## Review
The `reviewer` agent, 2026-11-08, in a fresh context, on the uncommitted 16g-2a diff.
- Blocking findings and how each was fixed:
  - **A fault while a moment plays froze the panel:** `stop()` cleared the scene's waits without ending them, so a village stopped mid-moment (a model of the second stage failing to load) left "Casting the spell…" disabled for good. Fixed: `stop()` now ends every wait on the scene (`scene.ts`, `stage.stop`), and the panel goes on without the village; a frame-loop error still reaches the waits as itself.
  - **The previous round's word carried over:** an accepted word left the box's text in `typed`, so a next round that ran out with nothing typed dropped that word as grey letters. Fixed: each round starts it empty (`brew.tsx`).
  - **One stall could make a real GPU "slow" for good:** the sample was a mean of 10, so a single long frame (the first draw's uploads, a hidden tab) could tip it. Fixed: the median of the 10 (answer 18 OKs the numbers with it).
  - **`--enable-unsafe-swiftshader` had no human OK:** asked; approved (answer 17) and logged in DECISIONS.md.
  - **ROADMAP and HANDOFF were stale:** both updated in this change.
- A follow-up review of the fixes and the pace wait, 2026-11-08: no blocking findings; its notes (wording on the sample's size, stale comments on `dead`, a fault during `show()` logged twice) are in ROADMAP, Next revision.
- Deferred to ROADMAP "Next revision": an animal failing to load stops the whole village; two paths can end one round; a village left while loading still builds, and stopping doesn't free its WebGL context; `joinStill`'s key covers only what today's models vary in; a doubled GET, `tierOf` untested, an unexplained 15 s wait; no check that a real GPU stays out of the slow mode.
