# Process — Mistakes become lint rules; visible changes come with screenshots and video

**Status:** planned (2026-11-17), ticket in PR #274 on `process-lint-rules`, not approved. Thirteen questions answered (below, quoted); nothing is built.

## Goal
A mistake an agent makes in code is caught by a lint rule every time, not by a sentence the next agent has to remember. Every change a player can see comes with screenshots and a video, taken by CI.

## Who uses it / what breaks without it
- **Used by:** every session that writes code (lint runs in CI on every PR: `.github/workflows/ci.yml`, `npm run lint`), and the human, who looks at the screenshots and video instead of trusting "it works".
- **Breaks without it:**
  - CLAUDE.md grows by one rule per mistake ("Add a rule here only after an agent has actually made that mistake"), and an agent follows a long file less closely. A sentence catches nothing on its own.
  - The human sees no proof of a visible change: Playwright keeps a video only for a test that fails on CI (`playwright.config.ts:26`), and locally keeps none. HANDOFF lists screens nobody has looked at (19a to 19e, 17a to 17c, the peek).

## What the human decided (2026-11-17, in chat)
The human asked: "if there's a mistake, instead of [adding rules to a document] I want you to turn the error into a lint rule ... and then also verify your own work through the video screenshots and tests instead."

**Round 1**
1. **A mistake that isn't in the code** (merging, the handoff, asking first): **"Code mistakes only"**: only code mistakes get lint rules; behaviour mistakes keep being written in CLAUDE.md.
2. **The rules already in CLAUDE.md:** **"Convert, then delete text"**: every rule that can be checked becomes a lint rule now, and its sentence is deleted from CLAUDE.md.
3. **When to prove work with media:** **"Every visible change"**: screenshots (phone and desktop) and a short video of it working.
4. **Where the media goes (the repo is public):** **"Both"**: sent to the human in the app, and on the PR.

**Round 2**
5. **Old code that breaks a new rule:** **"Fix it in the same PR"**: each lint rule's PR also fixes every old place it flags, so lint is fully green.
6. **"No invented numbers" as a lint rule:** **"Yes, except 0 and 1"**: every other number needs a source comment beside it.
7. **Rules too fuzzy for a linter** ("keep the diff surgical", "comments explain why", "build for today"): **"Drop them"**.
8. **How the media gets onto the public PR:** **"CI takes and uploads them"**: the e2e tests on CI take the screenshots and video and attach them to the PR's checks.

**Round 3**
9. **The number rule flags 1,788 numbers today** (1,272 in test files, 516 in app code in 99 files; measured 2026-11-17 with ESLint's `no-magic-numbers`, ignoring 0, 1 and array indexes): **"App code only, tests exempt"**.

**Round 4** (the ticket's open questions, same day)
10. **Q1, where a number lives.** DECISIONS.md, "Config and tunables", says "`src/config/tunables.ts` for every number, each with an origin comment"; answer 6 says a source comment beside the number.
  - **Answer:** **"Beside it, anywhere"**: a number may sit anywhere in app code if its line or the line above says where it came from; the DECISIONS row changes to match.
11. **Q2, the cost in CI time.** Every test at phone and desktop roughly doubles CI's e2e (14.1 min with the build, M21 21a; desktop only today, `playwright.config.ts:29`).
  - **Answer:** **"Visual tests only"**: tests tagged as visual run at phone and desktop; every other test keeps its one size and still saves a screenshot and a video.
12. **Q3, the phone size.**
  - **Answer:** **"390 × 844"**, the size the e2e tests already call phone (`e2e/boards.e2e.ts:21`, `e2e/admin-area.e2e.ts:99`).
13. **Q4, the sources; and "No defensive bloat".** May ESLint's custom rules page (https://eslint.org/docs/latest/extend/custom-rules), its `RuleTester` (https://eslint.org/docs/latest/integrate/nodejs-api#ruletester), `no-magic-numbers` (https://eslint.org/docs/latest/rules/no-magic-numbers) and Playwright's `screenshot` option (https://playwright.dev/docs/test-use-options) be added to SOURCES.md and read before building? Is "No defensive bloat" fuzzy and dropped?
  - **Answer:** **"Add them; keep bloat rule"**: the four pages go into SOURCES.md; "No defensive bloat" stays a sentence in CLAUDE.md.

## Source
- Playwright (SOURCES.md, M07 D7): the `video` option, https://playwright.dev/docs/test-use-options#video-modes; the GitHub Actions artifact upload already in `.github/workflows/e2e.yml`.
- ESLint: the three pages of answer 13, added to SOURCES.md and read in plan step 2, before any rule is written. Nothing is built from memory.

## The design
**The new rule in CLAUDE.md** replaces "Add a rule here only after an agent has actually made that mistake, or when the human asks for one":
- A mistake in code becomes a lint rule in `eslint-rules/`, with a test that shows the mistake failing (answer 1). No sentence is added.
- A mistake in what an agent does gets one line in CLAUDE.md, as now (answer 1).

**Rules converted now** (answer 2). Each sentence leaves CLAUDE.md in the PR that adds its rule, and that PR fixes every old place the rule flags (answer 5):

| Rule in CLAUDE.md today | The lint rule fails on | Flags today |
|---|---|---|
| Fail loudly | a `catch` that is empty, or only logs and carries on | to count: 86 `catch` blocks in `src/` to check |
| No invented numbers | a number other than 0 or 1 in app code without a source comment on its line or the line above (answers 6, 10); test files exempt (answer 9) | 516 in 99 files |
| Clean only your orphans | unused imports and variables, as an error | to count |
| Never cheat a check | `.skip`, `.only`, `.fixme` in a test | 0 |
| Least privilege | `service_role` or `SERVICE_ROLE` in app code | 0 |

**Dropped** (answer 7): "Keep the diff surgical", "Comments explain why, not what", "Build for today". The `audit` skill names some of these rules: it changes in the same PR.

**Stay as sentences** (answers 1 and 13): every behaviour rule (sessions, asking first, the ticket steps, no assumptions stated as facts, hypothesis before experiment, one way to do each thing, repeated procedures are scripts, leave no scraps, security, stop and ask, testing, done means, branches, slots), and "No defensive bloat".

**Proof for every visible change** (answers 3, 4, 8, 11, 12):
- CI's e2e keeps a screenshot and a video of every test, not only failed ones, and uploads them as the run's artifact.
- A test tagged as visual runs twice, at phone (390 × 844) and desktop size; every other test runs at its one size, as now. A test that checks something a player sees is tagged visual: the rule goes into CLAUDE.md's Testing section.
- The agent sends the same files to the human in the app.
- "Done means" gains: a visible change's evidence links the CI run's artifact.
- The repo is public: anyone signed in to GitHub can download the artifact (answer 4 accepts this).

## Acceptance criteria
- [ ] `npm run lint` passes on the branch, with every converted rule switched on as an error.
- [ ] Each rule's test shows one bad example failing and one good example passing: `npm test -- eslint-rules` passes, and fails if the rule is switched off.
- [ ] CLAUDE.md no longer holds the converted or dropped rules' sentences and holds the new rule: `grep -nE "Fail loudly|No invented numbers|Clean only your orphans|Never cheat a check|Keep the diff surgical|Comments explain why|Build for today" CLAUDE.md` prints nothing.
- [ ] A CI e2e run on the PR uploads a screenshot and a video of every test, and a visual test's at both sizes: the run's artifact list shows them.
- [ ] DECISIONS.md: the "Linting" row names the local rules; the "Config and tunables" row allows a sourced number beside its use (answer 10); a log entry.
- [ ] SOURCES.md has the ESLint row and the Playwright `screenshot` page (answer 13).

## Out of scope
- Automatic checks for behaviour mistakes (answer 1).
- Proof for changes no player sees (scripts, the database).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 0 and 1 | the numbers the rule allows without a source | the human, 2026-11-17, answer 6 |
| 390 × 844 | a visual test's phone size | the human, 2026-11-17, answer 12 (the size `e2e/boards.e2e.ts:21` already uses) |
| 1440 × 900 | a visual test's desktop size | the size `e2e/boards.e2e.ts:25` and `e2e/alive.e2e.ts:14` already use; **to confirm with the human** if a test needs it beyond what Desktop Chrome gives |

## Plan
1. ~~Ask the open questions~~: done, answers 10 to 13 → verify: `grep -c "^  - \*\*Answer:\*\*" docs/milestones/PROCESS-lint-rules.md` prints 4.
2. Add answer 13's pages to SOURCES.md, read them, and name the sections followed → verify: `grep -n "eslint.org" docs/SOURCES.md` prints the row.
3. One PR per rule, each from this branch: the rule, its test, the old code fixed, its sentence removed → verify: `npm run lint` and `npm test -- eslint-rules` pass; the test fails with the rule off.
4. Playwright keeps screenshots and video for every test; CI uploads them → verify: the PR's e2e run lists the files.
5. CLAUDE.md's new rule, the dropped rules, the `audit` skill, DECISIONS → verify: the `grep` in Acceptance criteria prints nothing.
6. The `reviewer` agent reviews the diff.

## Removes
The converted and dropped sentences in CLAUDE.md; the `video: process.env.CI ? "retain-on-failure" : "off"` setting it replaces. Nothing else yet: the rules' PRs list what each removes.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
