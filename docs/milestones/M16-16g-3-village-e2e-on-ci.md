# M16 16g-3 — The village's e2e passes on CI

**Status:** in progress (drafted 2026-11-10 from two answers; approved: "Approve, start 16g-3 (Recommended)").

## Goal
Find out why game 2's village tests fail on CI most runs, from videos of the failed runs, and fix the cause, so `main`'s required `e2e` check is green again.

## Who uses it / what breaks without it
- Used by: every PR into `main`, this session's and `RIFF-m14`'s, whose required `e2e` check runs these tests; and whoever reads a failed CI run.
- Breaks without it: `main`'s `e2e` has failed in 5 of the last 6 runs since PR #173 (16g-2a), always in `brew.e2e.ts`'s three tests or `play2.e2e.ts`'s "a whole day", at a different step each time: a press or fill that never completes, a click whose navigation never comes. Every PR is blocked until it passes. Three guesses at the cause were disproved (16g-2's Evidence), and CI keeps nothing but a text snapshot of the last page, so a fourth guess would be blind.

## Answers (human, 2026-11-10)
After PR #175 (16g-2's closing docs, no code) failed `e2e` the same way:
1. How to go on: "Keep CI traces, then fix (Recommended)". CI keeps what a failed test did, then a ticket reads it and fixes the cause.
2. What CI keeps, after Claude corrected answer 1's option (a trace holds the CI stack's publishable key, and the repo is public; ROADMAP, "Waits on the human", 14c-2 answer 15): "Video only (Recommended)". Playwright records a video of each failed test and CI uploads it: what the page did, with no network data, so no key. If the videos don't show why, traces come back as a question.
3. The ticket: "Approve, start 16g-3 (Recommended)", PR #175 closed and its commits carried in this PR.
4. Green runs in a row that count as fixed: "3 in a row (Recommended)". Three full CI runs with no village failure and no retry needed.
5. After the videos (Evidence): "Measure CPU first (Recommended)". One more CI run logs the machine's CPU use every few seconds during the tests, to confirm or kill hypothesis 4 before the game or the tests change.
6. After the CPU (Evidence: one Chromium process at about 370% of 4 cores while a village is open): "Draw smaller on slow GPUs (Recommended)". Once the village finds a slow GPU it draws fewer pixels, stretched to fill; softer there only. Measured on CI again before keeping it.
7. How much smaller: "Half each way". A quarter of the pixels.

## Source
- Playwright Test's `video` option (SOURCES.md, Playwright; `node_modules/playwright/types/test.d.ts`, `video`, 1.64.1): `'retain-on-failure'` records every run and keeps a video only for a run that failed, a failed run's kept even when its retry passes; the size defaults to the viewport scaled to fit 800x800. Checked here (Plan, step 1's experiment): it records only contexts Playwright Test makes (the `page` and `context` fixtures), not one a test opens with `browser.newContext()`.
- GitHub's `actions/upload-artifact` (to be added to SOURCES.md): https://github.com/actions/upload-artifact, `action.yml`, v7.0.2 (2026-10-07), commit `cf430e030ddbb5b0abf93d22962f4752f3646cd9`. `path` names the files; `retention-days` left out keeps the repository's default.
- The fix (answers 6, 7): three.js's `WebGLRenderer.setPixelRatio` (SOURCES.md, three.js; `node_modules/three/src/renderers/WebGLRenderer.js`, 0.180.0): it sets the ratio and calls `setSize(width, height, false)`, so the drawing buffer is `width × ratio` by `height × ratio` and the canvas's own CSS size is left alone.

## Design
- **The village tests use Playwright's own page.** `brew.e2e.ts`'s three tests and `play2.e2e.ts`'s village tests take the `page` fixture instead of opening their own context, so their videos are recorded; the Reduce motion test sets `reducedMotion` through `test.use`. Playwright closes the fixture's context, so the explicit closes from PR #174 go.
- **Video on CI only:** `video: process.env.CI ? "retain-on-failure" : "off"` in `playwright.config.ts`. Recording costs CPU for every test (the source: "Higher frame rates and sizes use more CPU for encoding"), which may itself shift CI's timing; local runs keep traces as now.
- **The upload:** a step in `.github/workflows/e2e.yml` after the tests, on failure only, uploading `test-results/**/*.webm` as one artifact. Nothing else from `test-results/` is uploaded (no trace, no network data). A DECISIONS.md entry records answer 2 as a secret-handling decision.

## Acceptance criteria
- [ ] A failed test on CI leaves its video as an artifact of the run, and the artifact holds `.webm` files only (the run's artifact list and its contents).
- [ ] The cause of the village's CI failures is found from the videos, stated with the evidence, and fixed.
- [ ] The village's tests then pass on CI in 3 runs in a row with no retry (answer 4).

## Out of scope
- Full or scrubbed traces (answer 2); the local reload problem on the Windows PC (ROADMAP, Next revision), unless the videos show it's the same cause; other files' occasional CI failures already in ROADMAP.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Video size: the viewport scaled to fit 800x800 (800x450 for Desktop Chrome's 1280x720) | The recorded videos | Playwright's default (Source) |
| How long CI keeps the artifact | Reading a failed run's videos | The repository's default retention (`upload-artifact`'s `retention-days` left out) |
| 3 green CI runs in a row, no village failure and no retry | The last criterion | Human, 2026-11-10, answer 4 |
| A slow GPU draws at 0.5 of the size each way (`SLOW_SCALE`) | The village on a slow GPU (`src/brew/scene.ts`) | Human, 2026-11-10, answer 7 |
| `top` every 5 s during the e2e run | Measuring the runner's CPU (temporary, removed after hypothesis 5's run) | Claude, within answer 5's "every few seconds"; 5 s matches the shortest wait that failed (`toHaveURL`'s 5 s) |

## Plan
One PR from `m16-game-2`. PR #175 (16g-2's closing docs) can't merge while `e2e` is red, so it is closed and its commits ride in this PR (CLAUDE.md: merge or close the open PR before the next sub-ticket).
1. **Videos:** the tests onto the `page` fixture, video on CI, the upload step, SOURCES.md and DECISIONS.md entries. Experiment, done 2026-11-10: expected that `retain-on-failure` keeps a video for a failing test whose page came from `browser.newContext()`; disproved (no `.webm`). With the `page` fixture it did, with and without `reducedMotion`, and a passing test kept none.
2. **Read:** push; the PR's own CI run uploads the failed tests' videos; Claude downloads and watches them (frames extracted), and writes down a hypothesis before any change, with what would disprove it.
3. **Fix:** the cause and its fix proposed to the human first if it changes the game's behaviour or a number; a change to tests alone follows CLAUDE.md, "Never cheat a check".
4. **Prove:** the agreed number of green runs in a row; the `reviewer` agent; ticket, ROADMAP and handoff.

## Removes
- The explicit `page.context().close()` lines and their comment from PR #174 (the fixture closes its context).
- The CPU sampler's two steps in `e2e.yml` (answer 5), once the measurement is read: removed after hypothesis 5's run.
- `e2e.yml`'s comment that CI keeps only a text snapshot because a trace holds the key (it keeps videos too now); ROADMAP's "Waits on the human" item on uploading traces (answered: videos, not traces).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
- **The videos** (PR #176, run 42789895831 at cc2fa35: `4 failed`, `167 passed (45.0m)`, the same four tests, each with its retry). The artifact `failed-test-videos` held 8 `.webm` files and nothing else. Frames were drawn from them in Playwright's own Chromium (no ffmpeg here) into contact sheets. What they show:
  - *The way out:* the click on × starts the navigation home, and Next's dev indicator reads "Rendering (cache disabled)" from 5.1 s to the video's end at 9.5 s: the home page's render outlasts `toHaveURL`'s 5 s while the village loads and draws.
  - *A run in the village (retry):* the village loads in about 16 s; Start, enabled then, takes effect only at about 30 s; round 1's tries (a refused word, its reason) run so slowly that the round's 20 s clock ends at about 53 s ("Time's up."), and the test waits out its 120 s pressing Enter in a box that is gone.
  - *play2's whole day:* the village loads in about 21 s; round 1's clock runs out the same way at about 53 s while the test is still on its tries; the 3D view is blank in three frames (26.4, 31.7, 47.6 s) and back after.
  - *Reduce motion:* about 130 s go on the stillness pictures before Start; two frames catch Playwright's capture under way, the page drawn small on grey; the test's 150 s end before round 1.
  - Hypothesis 4, from these: the page itself is far slower on CI's runner than here, likely because the village's software drawing shares the runner's CPU with the dev server and the browser. Each test then runs out a real limit: the round's 20 s, `toHaveURL`'s 5 s, or its own budget. Not yet shown: the runner's CPU load. Disproved by: a run where the CPU sits mostly idle while these steps lag.
- **The CPU** (answer 5; run 42798560916 at ad26418, `4 failed`, `1 flaky`, `166 passed (44.9m)`, the same four village tests): `top` every 5 s, 537 samples, lined up with the 12 village starts the browser logs (`THREE.WebGLRenderer: KHR_parallel_shader_compile extension not supported`, 10:35:01 to 11:00:40). From the first village at 10:35 to about 10:44 (the brew tests) the CPU is about 2% idle (`10:38:45 idle 2.1%  chrome-headless=371.9 ffmpeg-linux=7.2`); from 10:44 to 10:56, files with no village, 17-95% idle; from 10:56 to 11:01 (play2's village tests) about 2% idle again (`11:00:24 idle 2.1%  chrome-headless=369.3`); then idle again. Across 10:36-10:43, `chrome-headless` sums 29,020 %CPU in 103 samples, the next process 583; the video encoder about 6-8%. **Hypothesis 4 holds:** while a village is open, one Chromium process takes about 370% of the runner's 4 cores, which starves the dev server and the browser's own work.
- **Hypothesis 5** (the fix, answers 6 and 7): a slow GPU drawing at half the size each way leaves CI's CPU clearly idle part of the time while a village is open, where it sat at about 2%, and the four village tests pass. Disproved by: the CPU still near 2% idle with the village open, which would put the cost somewhere other than the pixels drawn (shader compiling, script, the vertices).
- **Hypothesis 5's run** (run 42805958719 at cee540a, sampler still on: `1 flaky`, `170 passed (35.7m)`, against 44.9-45.0 min before). Counting the samples where one `chrome-headless` process is above 150% (a village open): 49 samples (11:26:43-11:41:45) against 164 in run 42798560916; that process averages 231% against 337%; the CPU averages 13.7% idle against 2.9%, is under 5% idle in 7 of 49 samples against 151 of 164, and 20% or more idle in 11 against 1. **Hypothesis 5 holds on the CPU:** the village still takes most of the runner, but no longer all of it, and for about a third as long. The tests: two of `brew.e2e.ts`'s three and `play2.e2e.ts`'s whole day passed first time, but the third, "the way out leads back to Today", failed its first try the old way (`toHaveURL(/\/$/)`, 5000 ms, still on `/play2`) and passed its retry, so this run doesn't count toward answer 4's three. No video: the job passed, and the upload runs on failure only.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
