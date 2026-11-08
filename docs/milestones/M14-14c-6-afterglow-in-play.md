# M14 — 14c-6, Afterglow becomes the game

**Status:** in progress: 14c-6a done (Evidence; PR #168, merging on green CI at the human's "Merge when green"); next 14c-6b, the game. (Drafted 2026-11-07 from four rounds of guided questions; approved 2026-11-07: "Approve, start 6a (Recommended)".)

## Goal
Play the real game, every day's run, as Afterglow, the firework festival approved on its private page in 14c-5, full screen, with the game named Afterglow.

## Who uses it / what breaks without it
- Used by: every player, from the first question to the ending list, and admins playing a draft day's test run.
- Breaks without it: the game's look is approved (14c-5, version 7.1), but players still get the plain cards at `/play` under a working name, "Game number 1", so the game has no identity at launch.

## Source
- `docs/milestones/M14-14c-5-firework-festival.md`, all of Design, Answers 1 to 44, and the built page, `C:/Users/jason/RIFF-mocks` commit `fcc11e4` (`themes/festival/game.js`, `street.js`, `check.mjs`, `mutants.mjs`). What players see is copied from there unchanged unless this ticket says otherwise.
- The human's spec, "Daily Game — UI Moodboard & Spec" (https://claude.ai/artifact/Fh9HjdcC57yr7mtv16pTAs), as 14c-5 left it.
- `docs/DECISIONS.md`, "Game 1: Don't Match the Host": 7 questions, 20 seconds each from Start or from Next, the database the judge; and the log rows of 2026-10-21 (the reveal waits for Next, which starts the next question's 20 s).
- WCAG 2.2 (SOURCES.md), 2.3.3 Animation from Interactions, as `src/app/globals.css` already cites it for reduced motion; 1.4.3 contrast and 2.5.8 target size for the way-out button.
- Next.js (SOURCES.md, App Router) and the bundled docs in `node_modules/next/dist/docs/` (AGENTS.md), for the route's rename. To read before building.
- Playwright (SOURCES.md), for the game's check moved into `e2e/`.
- MDN, `prefers-reduced-motion` (https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), for the calm version (answer 18). It covers the setting and its `reduce` value, not reading it from script.
- **Gap, for 14c-6c:** reading the setting from script needs `Window.matchMedia`, which neither that page nor SOURCES.md covers. Ask the human before 6c.

## Answers (human, 2026-11-07)
Round 1
1. Scope: "The run, then cards (Recommended)". Questions, climbs, bursts and the ending list are Afterglow; the share, facts and comments below stay as today's cards.
2. Source: "Move it into RIFF (Recommended)". The game's source and checks move into this public repo and run in CI. Replaces 14c-4's answer 14 ("Private folder") for the game; the mocks folder keeps the other themes.
3. Screen: "Full screen, with a way out". In a run the top and tab bars hide; a small button leads back to the app.
4. Rest of the app: "Only /play for now (Recommended)". Today, Me, Friends and Groups keep their look and themes.

Round 2
5. Way out: "Hidden while a fuse burns (Recommended)". The button shows only between questions and at the end.
6. Rarity: "The day's level (Recommended)". Common, uncommon or rare, as set when the day is approved, decides Peony, Chrysanthemum or Kamuro.
7. Result facts: "The host's answers". The sky result adds what the host said; the bonus estimate and the running total stay off it.
8. Motion: "Calm version (Recommended)". With Reduce motion on: no shaking or rumble, short fades in place of the climb and the walk, bursts still shown.

Round 3
9. Off-list text: "Box shakes, text stays (Recommended)". The word never charges; the box shakes, a line says it isn't in the list, and the text stays selected.
10. Desktop: "Whole window (Recommended)". The sidebar and clock bar hide in a run, as on a phone.
11. Test runs: "Yes, the same (Recommended)". Admins' test runs play in Afterglow, full screen.
12. Name: "Afterglow". The page title, tab, banner and share text say Afterglow.

Round 4
13. Address: "whatever method will work best when we do more games". **Claude's reading, for approval:** each game's address is its name, from its record in `src/platform/game.ts`: `/afterglow` now, and game 2 takes its look's name in M16 16g (Moonbrew). A name says which game a link opens, which `/play` and `/play2` don't once there are several. No redirect from `/play`: the closed beta (M15) hasn't started, so no player holds a `/play` link (*unverified* that nobody outside the human has one).
14. Share: "Keep 🟩 and ⬜". The share's squares don't change; only its name does.
15. Checks: "Short on PRs, full by hand (Recommended)". A few minutes of the most important lines in CI on every PR; the full check and the mutants run by hand before a game PR merges.
16. The wait: "Start charging at once (Recommended)". The word starts a plain rumble on Light it and takes its rarity when the reply lands; a dud or off-list reply turns it back.

Round 5
17. The ticket: "Approve, start 6a (Recommended)".
18. Source: "Yes, add MDN (Recommended)". MDN's `prefers-reduced-motion` page, read 2026-11-07 (last modified 2026-06-10).
19. The calm fade: "The walk's descent time". Each of the calm version's fades lasts as long as 14c-5's descent.

## What this changes
| Was | Now | Why |
|---|---|---|
| "Game number 1" at `/play` | Afterglow at `/afterglow` | Answers 12, 13 |
| Plain cards for the question, the Safe card and the result | Afterglow full screen from Start to the ending list, then today's cards | Answers 1, 3, 10 |
| The mock's made-up questions and tiers | The day's real questions; rarity from the answer's level | Answer 6 |
| The mock's result: tier, flavour, points | Also "The host said …" | Answer 7 |
| The mock's Walk on starts the next question at once | Next goes to the database when the next box appears, after the walk and any taken-letter lantern, so the walk never costs the player time | DECISIONS.md, Game 1, Timer |
| The mock's New show (play again) | Gone: one run a day. The ending list's button leaves full screen for the cards | DECISIONS.md, Game 1 |
| Every text is an answer in the mock | Off-list text shakes the box and stays | Answer 9 |
| Source in the private mocks folder | Source and checks in RIFF | Answer 2 |

Unchanged: the rules, the database as judge, the share's squares (answer 14), the rest of the app's look (answer 4), and everything 14c-5 approved about the look.

## Design (proposed)
**Before and after the run.** The day's banner, Start, the no-puzzle and signed-out cards, and the result, share, facts and comments after the run, are today's cards, at `/afterglow`. Start goes full screen into Q1.

**Full screen.** From Start to the ending list the shell's top bar, tab bar, sidebar and clock bar are hidden, on every screen size, and Afterglow fills the window. A small way-out button sits in a corner, shown only while no fuse burns: during the sky result, the walk, and the ending list. It goes to Today. Coming back to `/afterglow` mid-run picks up where the run is: a run waiting for Next shows that question's sky result again.

**A question.** The box, its fuse and the seconds come from the run's `msLeft`, so a reload shows the time the database has left. Taken letters work as today: the key does nothing and a line says the letter is taken.

**Light it.** The word steps forward and rumbles plainly at once. The reply decides:
- **Safe:** the word takes its rarity's colour (the answer's level: common Peony gold, uncommon Chrysanthemum lime, rare Kamuro sky blue), its charge runs on, and it climbs and bursts as in 14c-5. The sky result adds one line, "The host said …".
- **Caught:** the dud, as in 14c-5, and the run ends.
- **Off-list:** the word drops back into the box, which shakes; a line under it says it isn't in the list, and the text stays selected. The fuse never stopped.
- **Time's up** (the database refused a late answer, or the fuse ran out): the fuse-out ending, as in 14c-5.
- **Any other error** is shown, as today; nothing is retried.

**Between questions.** Walk on plays the descent and the walk; the next box appears after any taken-letter lantern, and only then is Next sent, which starts that question's 20 s. The box shows no time until the database answers.

**The end.** After Q7, or a dud or fuse out, the ending list fades in as in 14c-5. Its button, **Done** (proposed wording), leaves full screen and shows today's result cards.

**Reduce motion.** No shake, rumble or sway; the charge, climb and walk become one short fade each between still frames; bursts, glitter and the fuse still draw.

**Test runs.** The admin's test run uses the same screen, fed by its test runner.

**Screen readers.** The prompt, box, seconds, result, host's answers and ending list are real text in the page, as in the mock, and keep 14b-21's announcements.

**The code.** `game.js` and `street.js` become TypeScript modules under `src/afterglow/`: the street's art, the scene and its phases, the HUD as React components, driven by the run state from `useRun`. Their numbers move to `src/config/tunables.ts` with the origins 14c-5 gave them (DECISIONS.md, Config). The pre-draw's heavy steps are split so no slice passes 16.7 ms (14c-5 answer 42). The mock's test hooks (`__core`) stay, loaded only by the e2e build.

**The checks.** `check.mjs` becomes Playwright tests in `e2e/` (DECISIONS.md, Tests). A short set (tagged) runs in CI on every PR; the full set and the mutants run by hand through scripts in `scripts/` and the task runner.

## Acceptance criteria
- [x] `/afterglow` serves the game, its browser tab titled Afterglow; `/play` answers 404; the record says `{ id: "offbeat", name: "Afterglow", path: "/afterglow" }`, and the ID is unchanged.
- [ ] A whole day played in a browser against the local stack: a safe answer of each level shows its rarity's colour and "The host said …", an off-list text shakes and stays selected, a taken letter, a reload mid-question and mid-result, Next, Q7's ending list, Done, the cards.
- [ ] A dud and a fuse out each end the run with the ending list.
- [ ] No question loses time to the walk: the database's open time for question k+1 is after its box appears (e2e, from the run's events).
- [ ] The bars, sidebar and clock bar are hidden from Start to Done at 375×812 and 1440×900; the way-out button shows only while no fuse burns, and goes to Today.
- [ ] With Reduce motion on, no frame shakes and the climb and walk are fades (e2e with `reducedMotion: "reduce"`).
- [ ] An admin's test run plays in Afterglow.
- [ ] The share text says Afterglow, with 🟩 and ⬜.
- [ ] The short check runs in CI on the PR and passes; the full check passes by hand, its fps lines in real Chrome at 59 or more (14c-5 answer 41), and `pre-draw never stalls a frame` passes.
- [ ] The mutants carried from 14c-5 are each caught by the full check.
- [ ] `docs/DESIGN.md` describes `/afterglow` as built.

## Out of scope
- The rest of the app's look (answer 4).
- New share symbols (answer 14).
- Game 2's address and look (M16 16g).
- A real-phone test of 14c-5's page, which stays with the human; this build gets its own.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 7 questions, 20 s each | The run | DECISIONS.md, Game 1 |
| Every timing, size and colour of the look | The game | 14c-5, its Numbers table and the constants in `game.js` at `fcc11e4`, most marked proposed there and carried unchanged |
| 59 fps in real Chrome | The full check's fps lines | 14c-5 answer 41 |
| 16.7 ms | A pre-draw slice | 14c-4 (60 fps), 14c-5 answer 42 |
| "A few minutes" | The short check's CI time | Answer 15 |
| The off-list shake's length and size | Answer 9 | **Proposed:** the fuse's end-of-time shake from 14c-5, reused |
| The calm version's fade length | Answer 8 | The walk's descent time from 14c-5 (answer 19) |

## Plan
Three PRs from `m14-look-and-feel`, after bringing it up to date with `main` (M16's PRs #155 to #165 have merged since).
1. **14c-6a, the name.** The record and the route folder renamed to Afterglow at `/afterglow` (with How to play), which the share, the boards' game switch and every heading follow; the game page's browser tab says Afterglow (answer 12). Small and reviewable alone.
2. **14c-6b, the game.** The run state gains each answered question's tier, from one `tierOf` that replaces the three `levels[id] ?? "rare"` copies (scoring, matching, answers). It was planned for 6a, but nothing would read it there (CLAUDE.md, "Build for today"). The source moved and typed, full screen, the way out, Light it's wait, off-list, Next after the walk, reload, test runs, the pre-draw split, and the check in `e2e/` with its CI subset and hand scripts.
3. **14c-6c, the calm version** for Reduce motion.

## Removes
- `/play` and the name "Game number 1".
- In `src/app/game.tsx`: the `Question` and `Reveal` cards and the in-run countdown, replaced by Afterglow; with their CSS in `game.module.css` and `offbeat.module.css`.
- From the moved code: `MOCK_QS`, play again ("New show"), the page's own font loading and anything else only the private page needed.
- In RIFF-mocks, the human retires `themes/festival/` once the move is merged (an agent's delete there was refused before; not routed round).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
**14c-6a, the name and address** (2026-11-07, Windows PC, this worktree's own `next dev` on port 3000, local stack):
- `npm run lint`: clean. `npm test`: 634 passed.
- The 14 e2e files 6a touched (`npx playwright test e2e/alive.e2e.ts … e2e/play2.e2e.ts --reporter=line`): `2 failed`, `66 passed (15.3m)`. Hypothesis written before the run: all pass except database-state failures ("thing … has no name"); a failure tied to `/afterglow` would disprove it. No "has no name" error came back (the three stored puzzles' 33 host answers all have names, checked with `private.thing_names`), and `feel.e2e.ts:242`, which failed in the earlier runs, passed.
- The two failures, rerun alone (`npx playwright test e2e/play2.e2e.ts:51 e2e/shell.e2e.ts:355`): `2 passed (52.0s)`. Under the full run's load, `play2.e2e.ts:51`'s second try landed after the lockout ("You played aqkb: 25 points." where "Too quick. Try again in a moment." was expected), and `shell.e2e.ts:379`'s Create group was still "Loading" when its 5 s wait ran out. Neither touches the renamed route; both are in ROADMAP, For M14.
- `e2e/offbeat.e2e.ts` checks `/afterglow`'s tab title (`toHaveTitle(GAME.name)`) and that `/offbeat`, `/updraft` and `/play` answer 404.
- The earlier runs' 11 failures are not explained: some of them ran against `RIFF-m16`'s dev server, which held port 3000, and the "has no name" errors' cause is *unverified* (perhaps the base changing mid-run).

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
