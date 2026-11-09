# M16 — 16g-2, Midnight Brew becomes game 2's run

**Status:** in progress (drafted 2026-11-08, Pacific, from three rounds of guided questions; approved: "Approve, start 16g-2a"; 16g-2a under way).

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

## The measurement behind answer 11
`measure.mjs` (the 16g-1 session's scratchpad) loaded the version 6 page in headless Chrome under Lighthouse's mobile preset: 150 ms latency, 1.6 Mbps down, 750 Kbps up, a 4× CPU slowdown, a 412×823 screen at 1.75 (request-level throttling, which Lighthouse's docs call an approximation). The hypothesis, written first: 16.7 MB at 1.6 Mbps is about 84 s of transfer, so the scene would be ready after 85–95 s, and a result under 60 s would mean the throttling didn't apply. Result: `"shellMs": 6396, "sceneReadyMs": 91238, "transferredMB": 16.65, "idleStats": "59 fps · 12.7 ms draw", "worstFpsDuringHugeWord": 54, "jsHeapUsedMB": 47.9, "errors": []`. The GPU isn't slowed in this setup, so the frame rate is kinder than a phone's (*unverified* on a phone).
In the app the models are served as plain GLB files, not the page's base64 bundle, and the kids go (answer 9): village and props 4.37 MB, the witch 0.90 MB, the animals 5.04 MB, 10.3 MB in all. At 1.6 Mbps that is about 26 s for the first part and 52 s for all of it, by arithmetic that leaves out latency and parsing (*unverified* until 16g-2a measures it).

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
- [ ] `/play2` plays a whole real run in the village: the round's letters, the clock, tries, refusals with the fizzle, the 0.5 s lockout, time-ups, Next, and the results cards at the end (answers 1, 7).
- [ ] During a run the top and tab bars are hidden and a way-out button leads back to the app (answer 2).
- [ ] Each round's word comes alive in its tier, the next change casts by itself with the button waiting, and Next starts the next round's clock; after round 7 the finale plays by itself, then the cards (16g-1 answers 21, 22, 25, 26).
- [ ] No clip files ship; the witch moves by code; round 7 brings the parade (answers 6, 9).
- [ ] The run can start before the animals have loaded, and they appear when they arrive (answer 11).
- [ ] Under Reduce motion the camera never moves and nothing shakes (answer 5).
- [ ] On the Lighthouse profile, the time until the run can start and until everything has loaded are measured and recorded, before and after compression; the human decides on compression with those numbers (answers 10, 11).
- [ ] `e2e/brew.e2e.ts` plays a run start to finish with no console errors; game 2's existing e2e and unit tests pass; the camera is still whenever the box has focus (16g-1 answer 9).

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

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
