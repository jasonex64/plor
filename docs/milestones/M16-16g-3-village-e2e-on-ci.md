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

## Source
- Playwright Test's `video` option (SOURCES.md, Playwright; `node_modules/playwright/types/test.d.ts`, `video`, 1.64.1): `'retain-on-failure'` records every run and keeps a video only for a run that failed, a failed run's kept even when its retry passes; the size defaults to the viewport scaled to fit 800x800. Checked here (Plan, step 1's experiment): it records only contexts Playwright Test makes (the `page` and `context` fixtures), not one a test opens with `browser.newContext()`.
- GitHub's `actions/upload-artifact` (to be added to SOURCES.md): https://github.com/actions/upload-artifact, `action.yml`, v7.0.2 (2026-10-07), commit `cf430e030ddbb5b0abf93d22962f4752f3646cd9`. `path` names the files; `retention-days` left out keeps the repository's default.
- The fix itself: its source is named once the videos show the cause (Plan, step 3).

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

## Plan
One PR from `m16-game-2`. PR #175 (16g-2's closing docs) can't merge while `e2e` is red, so it is closed and its commits ride in this PR (CLAUDE.md: merge or close the open PR before the next sub-ticket).
1. **Videos:** the tests onto the `page` fixture, video on CI, the upload step, SOURCES.md and DECISIONS.md entries. Experiment, done 2026-11-10: expected that `retain-on-failure` keeps a video for a failing test whose page came from `browser.newContext()`; disproved (no `.webm`). With the `page` fixture it did, with and without `reducedMotion`, and a passing test kept none.
2. **Read:** push; the PR's own CI run uploads the failed tests' videos; Claude downloads and watches them (frames extracted), and writes down a hypothesis before any change, with what would disprove it.
3. **Fix:** the cause and its fix proposed to the human first if it changes the game's behaviour or a number; a change to tests alone follows CLAUDE.md, "Never cheat a check".
4. **Prove:** the agreed number of green runs in a row; the `reviewer` agent; ticket, ROADMAP and handoff.

## Removes
- The explicit `page.context().close()` lines and their comment from PR #174 (the fixture closes its context).
- `e2e.yml`'s comment that CI keeps only a text snapshot because a trace holds the key (it keeps videos too now); ROADMAP's "Waits on the human" item on uploading traces (answered: videos, not traces).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
