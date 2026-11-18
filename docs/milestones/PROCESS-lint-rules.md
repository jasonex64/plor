# Process — Mistakes become lint rules; visible changes come with screenshots and video

**Status:** in progress (approved 2026-11-17, the human: "Approve it"; ticket and sources merged in #274). Twenty-eight questions answered (below, quoted). Rules 1 to 3 merged (#275, #276, #278). **Rule 4, `local/no-skipped-tests`, in review** on `process-lint-rules` (its PR); rule 5 and the screenshots wait. The desktop size of a visual test is still to confirm (Numbers).

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

**Round 5** (while building rule 1, same day)
14. **A deliberate "do nothing" catch.** The draft rule flagged 3 empty catches, each deliberate with a comment saying why (`src/app/shown.ts`, `src/app/theme.ts`: browser storage blocked; `scripts/base.ts`: a password kept as typed). Padding them to pass would cheat the check.
  - **Answer:** **"Marker comment allows it"**: an empty catch passes only if a comment inside starts with `Expected:`; a bare `catch {}` or `/* ignore */` still fails, and `grep "Expected:"` lists every exception.

**Round 6** (starting rule 2, same day; measured first: of the 516 numbers in app code, 224 are HTTP status codes, 93 are the rank badges' drawing in `src/app/ranks.tsx`, many are units, and 86 have a comment on the line above)
15. **HTTP status codes.**
  - **Answer:** **"Named once, with source"**: one file names them (e.g. `STATUS.notFound`) citing the HTTP standard; routes use the names.
16. **Unit numbers.**
  - **Answer:** **"Fixed allow-list"**: the rule allows 60, 1000, 24, 360, 100, -1 and 2, as it allows 0 and 1 (the human accepted that an invented 60-second timeout slips through).
17. **What counts as a source comment.**
  - **Answer:** **"Must name a source"**: the comment holds a ticket answer, a `docs/` path, a URL, or "human, <date>"; the rule checks the pattern.
18. **Drawing coordinates.**
  - **Answer:** **"One comment per drawing"**: one source comment above a drawing function covers every number inside it.

**Round 7** (after three agents traced the 198 numbers left: most to a ticket; the rest below)
19. **Five values an agent set with no human answer or doc** (the bank's tie-break seed, the count-up's solving steps, the guest peek's pattern, the admin page's 5 shown host answers, a tie counting half):
  - **Answer:** **"Show me each first"**: asked one by one in round 8.
20. **Facts of a standard** (UUID layout, base64, a date string's 10 characters, the Bézier formula):
  - **Answer:** **"Yes, add and cite them"**. Two specs were read and cited (RFC 4122, RFC 4648). The ECMAScript page could not be read past its contents (twice), so the date is now taken by splitting at its "T", with no number left; CSS Easing defines the curve but not its formula (answer 28).
21. **Counts of something on the page** (three tables' column spans, a cursor's 3 parts):
  - **Answer:** **"Derive from the code"**: each table's columns are one list, and the wide cell spans its length; the cursor refuses an extra part by destructuring.
22. **Unit products** (3600, 86,400,000):
  - **Answer:** **"As products of units"**: `60 * 60` and `24 * 60 * 60 * 1000`.

**Round 8** (answer 19, one by one)
23. **A tie in "Better than X% of players"** (`src/game/percentile.ts`): **"Keep: a tie counts half"**.
24. **The admin page's host answers before "+N more"** (`src/app/admin/puzzles/puzzles.tsx`): **"Keep 5"**.
25. **The guest peek's drawn calendar** (four shades; DESIGN.md said three): **"Keep it; fix DESIGN.md"**.
26. **The draft's tie-break hash** (31 and 7, `src/content/bank.ts`): **"Keep 31 and 7"**.
27. **The count-up's solving steps** (`src/app/shown.ts`): **"Fewer steps (4)"**. Measured after: the curve moves by at most 0.000000003; on 5 of 400,000 sampled moments a count to 10,000 or more shows a number 1 off for that moment, at a rounding edge. Claude had predicted no frame would differ: that prediction was wrong, and the human is told.
28. **The Bézier formula's 3s and 6:** **"Cite Wikipedia's Bezier page"**.

## Source
- Playwright (SOURCES.md, M07 D7): the `video` option, https://playwright.dev/docs/test-use-options#video-modes; the GitHub Actions artifact upload already in `.github/workflows/e2e.yml`.
- Playwright (SOURCES.md, M07 D7): the `screenshot` option, https://playwright.dev/docs/test-use-options ("'off', 'on' and 'only-on-failure'").
- ESLint, writing rules (SOURCES.md, PROCESS-lint-rules): "Rule Structure", "Report Problems", "Accessing Comments" and "Runtime Rules" on the custom rules page; `RuleTester#run` and "Customizing describe and it"; `no-magic-numbers`' options. Read from the "latest" (v10) pages; the installed ESLint is 9.39.5, and the parts used were checked in its types.

## The design
**The new rule in CLAUDE.md** replaces "Add a rule here only after an agent has actually made that mistake, or when the human asks for one":
- A mistake in code becomes a lint rule in `eslint-rules/`, with a test that shows the mistake failing (answer 1). No sentence is added.
- A mistake in what an agent does gets one line in CLAUDE.md, as now (answer 1).

**Rules converted now** (answer 2). Each sentence leaves CLAUDE.md in the PR that adds its rule, and that PR fixes every old place the rule flags (answer 5):

| Rule in CLAUDE.md today | The lint rule fails on | Flags today |
|---|---|---|
| Fail loudly | a `catch` that is empty (unless its comment starts with `Expected:`, answer 14), or only logs and carries on | **built**: 3 in `src/`, `e2e/`, `scripts/`, all deliberate, now marked |
| No invented numbers | a number in app code without a comment naming its source (a ticket answer, a `docs/` path, a URL, "human, <date>"; answer 17) on its line, above it or above what encloses it (answers 10, 18); not 0, 1, 2, 24, 60, 100, 360, 1000 (answers 6, 16) or an array index; test files exempt (answer 9) | **built**: 516 at first; 236 HTTP statuses became `STATUS` names (answer 15), the rest sourced or derived (answers 19 to 28) |
| Clean only your orphans | unused imports and variables, as an error | **built**: 0 (ESLint's own `@typescript-eslint/no-unused-vars`, a warning before); the bullet keeps what lint can't see |
| Never cheat a check | `.skip`, `.only`, `.fixme` in a test (built with `.todo`, `.skipIf`, `.runIf`, `.fail` and `xit`/`fit`-style names, the other ways Vitest and Playwright switch a test off) | **built**: 0; the bullet keeps its weaken, delete and mock half |
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
- [ ] CLAUDE.md no longer holds the converted or dropped rules' sentences and holds the new rule: `grep -nE "Fail loudly|No invented numbers|Clean only your orphans|Keep the diff surgical|Comments explain why|Build for today" CLAUDE.md` prints nothing. ("Never cheat a check" left this list in rule 4: lint covers only its skip half, and its weaken, delete and mock half is behaviour, which stays a sentence by answer 1. "Fail loudly" and "Clean only your orphans" kept their behaviour halves under new names.)
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
2. ~~Add answer 13's pages to SOURCES.md, read them, and name the sections followed~~: done (Source, above) → verify: `grep -n "eslint.org" docs/SOURCES.md` prints the row.
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
**Rule 1, `local/fail-loudly`** (2026-11-17, slot 3):
- Hypothesis before running it: fewer than 10 of the 86 `catch` blocks are empty or log-only; more than 20 would prove the reading of the code wrong. Result: 3, all empty, all deliberate (answer 14).
- `npm test -- eslint-rules` → `Tests  10 passed (10)`. With the rule's `CatchClause` visitor renamed so it never runs → `Tests  5 failed | 5 passed (10)`: each bad example fails without the rule. Restored after.
- `npm run lint` → no findings, with `local/fail-loudly` on as an error.
- `npx tsc --noEmit` → no errors.
- CLAUDE.md: the header's "Add a rule here only after…" is the new rule; "Fail loudly" is now "Recovery needs a ticket" (its catch half is the lint rule; its "silent fallbacks" and "defaults that hide missing data" were fuzzy, answer 7, and stay on the reviewer's list, `.claude/agents/reviewer.md:23`).

**Rule 2, `local/no-invented-numbers`** (2026-11-17, slot 3):
- Measured first (ESLint's `no-magic-numbers` on app code): 516; then 198 left after the `STATUS` names. Three agents traced each to its ticket; every quote they gave was checked by grep in the ticket before it went into a comment. The leaderboard graph's unnamed offsets were checked in the approved mockup itself (`project/Card.dc.html` lines 197, 201, 217, 247, 256).
- `npm test -- eslint-rules` → `Tests  23 passed (23)`; with the rule's `Literal` visitor renamed → `Tests  5 failed | 18 passed (23)`. Restored after. The test caught one bug while building: the file's first comment counted as "above" every number in the file; the search now stops below the file.
- `npm run lint` → no findings with both rules on. `npx tsc --noEmit` → no errors. `npm test` → `Tests  845 passed (845)`.
- The cursor change (`src/comments/feed-page.ts`): the feed's db test gains a four-part cursor; `npx vitest run src/app/api/feed/items/route.db.test.ts` → `Tests  11 passed (11)`, and `1 failed | 10 passed` with the new guard removed.
- Hypothesis for answer 27 (8 to 4 steps): no frame shows a different whole number; disproved (5 of 400,000 sampled moments, 1 off), recorded in answer 27.
- No player-visible change except answer 27's.

**Rule 3, unused imports and variables** (2026-11-17, slot 3):
- Hypothesis: the check is already on as a warning and lint shows no warnings, so 0 places. `npx eslint --print-config` → `"@typescript-eslint/no-unused-vars": [1]`; `npm run lint` with it at error → exit 0. Held.
- It is ESLint's own rule, so no test file (CLAUDE.md, Testing: "Don't test … framework behaviour"). Shown on a throwaway `src/orphan-probe.ts` (an unused import, an unused variable) → `'readFileSync' is defined but never used` and `'unused' is assigned a value but never used`, both `error`; the probe deleted after.

**Rule 4, `local/no-skipped-tests`** (2026-11-17, slot 3):
- Hypothesis: no test is skipped, focused or marked to fail today. `grep` for every form in `src`, `e2e`, `scripts`, `eslint-rules` → nothing. Held.
- `npx vitest run eslint-rules` → `Tests  37 passed (37)`; with both visitors renamed → `Tests  10 failed | 4 passed (14)` for this rule. Restored after.
- `npm run lint` → exit 0. `npx tsc --noEmit` → no errors.

## Review
**Rule 1, `local/fail-loudly`** (the `reviewer` agent, 2026-11-17, fresh context):
- Blocking findings and how each was fixed: none.
- Deferred to ROADMAP "Next revision" (For PROCESS-lint-rules): the rule checks `try/catch` only, not a promise's `.catch(() => {})` (one in the app, deliberate, `src/lib/hold.ts:70`); it counts only `console.*` and `log.*` as logging; DECISIONS' "Error handling" row still says "fail loudly". The other converted sentences stay in CLAUDE.md until their own rules (expected, rule 1 of 5).

**Rule 2, `local/no-invented-numbers`** (the `reviewer` agent, 2026-11-17, fresh context):
- Blocking findings and how each was fixed: none that stand. It named HANDOFF.md and a ROADMAP row; CLAUDE.md says a `process-` branch leaves the handoff alone (its PR says where it stands), and process tickets have no ROADMAP row.
- Deferred to ROADMAP "Next revision" (For PROCESS-lint-rules): "answer N" passes without a ticket named; one comment above a function covers all of it; two comments to tidy; the values kept as built with no further origin.

**Rule 3, unused imports and variables** (the `reviewer` agent, 2026-11-17, fresh context):
- Blocking findings: none. It confirmed the error level on .ts, .tsx and .mjs files in src, e2e, scripts and eslint-rules.
- Non-blocking, nothing to defer: the rule has no committed test and the probe is described, not re-runnable; both follow from it being ESLint's own rule.

**Rule 4, `local/no-skipped-tests`** (the `reviewer` agent, 2026-11-17, fresh context):
- Blocking findings: none. It found no false positive on the repo (`test.describe.configure`, `test.use` pass) and judged the acceptance grep's edit justified by answer 1, not a weakening.
- Deferred to ROADMAP "Next revision" (For PROCESS-lint-rules): the forms it misses, none used here; three more test cases.
