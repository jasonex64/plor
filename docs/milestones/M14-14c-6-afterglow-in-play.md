# M14 — 14c-6, Afterglow becomes the game

**Status:** in progress: 14c-6a done (Evidence; PR #168, merged on green CI at the human's "Merge when green"); 14c-6b approved (answers 20 to 29); 6b-1, the game plays, done (Evidence, Review; PR #169, merged on green CI at the human's "Merge when green"); 14c-6d, How to play, done (Evidence, Review; PR #170, merged on green CI at the human's "Merge when green"); 6b-2, the check, designed from answers 44 to 56 (Design, "The checks") and approved ("Approve, start 6b-2a (Recommended)"): 6b-2a in progress, then 6b-2b. (Drafted 2026-11-07 from four rounds of guided questions; approved 2026-11-07: "Approve, start 6a (Recommended)".)

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
- Playwright (SOURCES.md), for the game's check moved into `e2e/`. **For 6b-2, in SOURCES.md (answer 55):** test projects (https://playwright.dev/docs/test-projects), tags (https://playwright.dev/docs/test-annotations), soft assertions (https://playwright.dev/docs/test-assertions), modifying responses (https://playwright.dev/docs/network), and the Chrome channel (https://playwright.dev/docs/browsers), all for @playwright/test 1.64.1; and Next.js's environment variables guide (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`, read 2026-11-09), for `NODE_ENV` under `next dev` and `next build`.
- MDN, `prefers-reduced-motion` (https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), for the calm version (answer 18). It covers the setting and its `reduce` value, not reading it from script.
- **Gap, for 14c-6c:** reading the setting from script needs `Window.matchMedia`, which neither that page nor SOURCES.md covers. Ask the human before 6c. Since 2026-11-08 SOURCES.md has MDN `Window.matchMedia()` (added for M16 16g-2), which 6c can cite.
- MDN `<dialog>` (SOURCES.md), for How to play's panel (14c-6d), as the settings sheet uses it.
- WAI-ARIA APG Carousel pattern (SOURCES.md, added at answer 42), for How to play's chunks: "Terms", "WAI-ARIA Roles, States, and Properties", "Keyboard Interaction".

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

For 14c-6b (human, 2026-11-08)

Round 6
20. PR size: "Two PRs (Recommended)". 6b-1: the game plays a real day full screen, with browser tests for the rules (timing, off-list, reload, the way out). 6b-2: the full visual check, its CI short set and the mutants.
21. End button: "See results (Recommended)". The mock's own words; it replaces the proposed "Done".
22. Way out: "× icon (Recommended)". Screen readers hear "Back to Today".
23. Off-list: "Today's line (Recommended)". "\"wolfe\" isn't in our list. Try another answer."

Round 7
24. Score corner: "Keep it (Recommended)". As the approved mock: the question number and the points so far, real points from the database. The sky result itself still shows only the firework, its flavour and "The host said …" (answer 7).
25. Coming back: "The cards (Recommended)". A run that is over opens on today's result, share, facts and comments; the ending list is seen once, at the end of the run.
26. Test run: "Back to that admin page (Recommended)". A test run's × and See results return to the admin page it started from.

Round 8
27. Approval: "Approve, start 6b-1 (Recommended)".
28. Shake: "Same shake (Recommended)". Off-list text shakes the box as a refused taken letter does.

Round 9 (a collision found while building)
29. Q7's button: "Q7 says \"Walk on\" (Recommended)". After a safe Q7 the sky result's button is Walk on, as on Q1 to Q6, and the ending list fades in over the burst as in the mock; only the ending list's button says See results (answer 21), so a survivor doesn't tap See results twice.

For 14c-6d, How to play (human, 2026-11-08: "we also need a how to play button somewhere, maybe on the main game page. infomation should be displayed in concise chunks that have next arrows > to view the rest of it")

Round 10
30. Where: "Before Start, as now" and "On Today's game banner". The game screen keeps its How to play before Start, and Today's banner gets one, so a player with Skip the game screen on reaches it too.
31. Chunks: "‹ › with dots (Recommended)". One chunk at a time, › for next and ‹ for back, dots for how many and where, and a close on the last.
32. Look: "Afterglow's look (Recommended)". Pixel panels in Handjet, like the game.
33. Words: "Today's rules, cut short (Recommended)". The same facts as the current page, one idea per chunk, plain words, drafted by Claude for the human's OK.

Round 11
34. Opens as: "A panel over the page". It opens over Today or the game screen without leaving it, closed by ×, with no address of its own.
35. Backdrop: "Afterglow's plain dark". The game's background colour and the panel only, no street.
36. Last chunk: "Only a close". How to play never starts the run.
37. Order: "Before 6b-2 (Recommended)". Its own sub-ticket, 14c-6d, next.

Round 12
38. Chunk words: "Fewer, four chunks". The host and the run; time and typos; taken letters; points.
39. Old page: "404, no redirect (Recommended)". `/afterglow/how-to-play` goes, as `/play`, `/offbeat` and `/updraft` did.
40. On Today: "Under Play, smaller (Recommended)". A minor button under Play, before the run only.

Round 13
41. Approval: "Approve, start 6d (Recommended)".
42. Source: "Yes, add the APG Carousel (Recommended)". Read 2026-11-08; in SOURCES.md.
43. Words: "Use these four (Recommended)". The four chunks in Design, as drafted.

For 14c-6b-2, the check (human, 2026-11-09)

Round 14
44. Plays on: "A test page (Recommended)". A page only the check opens runs the real scene with scripted replies: no database, the clock can run fast, the mutants work. It skips the server, which 6b-1's tests already cover.
45. Hooks: "Only on the test page (Recommended)". The test page hands them to the scene, so players' pages never have them; one optional argument on the scene.
46. Mock lines: "Rewrite where it fits (Recommended)". Each line about a dropped feature (New show, the skip link) becomes the game's version where there is one, and is dropped where nothing replaces it, each listed with its reason.
47. CI set: "One run, phone size (Recommended)". One scripted run at 390×844: the font, the colours, the pixel grid, the fuse with the seconds, a burst per rarity, no console errors.

Round 15
48. Mutants: "A broken copy in the browser (Recommended)". The check takes the game's compiled code from the dev server and gives each mutant a broken copy, as the mock did; the files on disk are never touched; four at once. If a compiler update stops a break matching, the script stops loudly.
49. Test page: "404 in production (Recommended)". Served only by the dev server the tests use.
50. CI job: "Inside the e2e job (Recommended)". No setting to change; its minutes add to the e2e job's.
51. Which: "The carried ones (Recommended)". The mock's 83, each rewritten for the game's code; those for dropped features go with their lines.

Round 16
52. PRs: "Two PRs (Recommended)". 6b-2a: the test page, the hooks, the full check and its CI set. 6b-2b: the mutants, and any check fixes they force.
53. Frames: "Keep them (Recommended)". The full check saves its frames and strips to `test-results/` (not committed), as in 14c-5.

Round 17
54. Approval: "Approve, start 6b-2a (Recommended)".
55. Sources: "Yes, add them (Recommended)". The five Playwright pages and Next.js's environment variables guide, in SOURCES.md.
56. Off-list: "Yes, one line (Recommended)". 6b-2a adds one line beyond the mock's, checking off-list text shakes the box as a refused taken letter does (answer 28); it closes ROADMAP's item.

Round 18 (2026-11-09, from the CI set's first run: 40 of its 42 lines passed, the other two failing on the dev server's own badge and warning)
57. Dev badge: "Hide it in the check (Recommended)". Next's dev-tools badge, which only `next dev` draws, is hidden on the check's pages before it looks; the colour line had caught its white and greys.
58. CSS warning: "Pass over that one (Recommended)". The check ignores, by its text, the warning Next's dev build gives on every page (/about and /privacy too) for a preloaded stylesheet it doesn't use; any other warning or error still fails. The warning goes in ROADMAP for the app.

Round 19 (2026-11-09, from the full set's two runs in real Chrome: 217 and then 219 of 222 lines)
59. Pre-draw: "Split now, in 6b-2a (Recommended)". Answer 42 of 14c-5 put the split in the game's build and 6b-1 didn't do it: no step of the pre-draw longer than the slice's own budget (`PREDRAW_SLICE_MS`, 4 ms), the street's output checked byte for byte against today's.
60. Lettering: "Look into it first (Recommended)". Why real Chrome draws the phone's Q6 word 2 pixels differently at mid-climb (11,736 against 11,738, as the mock did in 14c-5), then a fix or what was found.

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

**Full screen.** From Start to the ending list the shell's top bar, tab bar, sidebar and clock bar are hidden, on every screen size, and Afterglow fills the window. A small way-out button, a × that screen readers hear as "Back to Today" (answer 22), sits in a corner, shown only while no fuse burns: during the sky result, the walk, and the ending list. It goes to Today. Coming back to `/afterglow` mid-run picks up where the run is: a run waiting for Next shows that question's sky result again. A run that is over opens on the cards (answer 25). The score corner shows the question number and the points so far, as in the mock (answer 24).

**A question.** The box, its fuse and the seconds come from the run's `msLeft`, so a reload shows the time the database has left. Taken letters work as today: the key does nothing and a line says the letter is taken.

**Light it.** The word steps forward and rumbles plainly at once. The reply decides:
- **Safe:** the word takes its rarity's colour (the answer's level: common Peony gold, uncommon Chrysanthemum lime, rare Kamuro sky blue), its charge runs on, and it climbs and bursts as in 14c-5. The sky result adds one line, "The host said …".
- **Caught:** the dud, as in 14c-5, and the run ends.
- **Off-list:** the word drops back into the box, which shakes; under it, today's line, "\"wolfe\" isn't in our list. Try another answer." (answer 23), and the text stays selected. The fuse never stopped.
- **Time's up** (the database refused a late answer, or the fuse ran out): the fuse-out ending, as in 14c-5.
- **Any other error** is shown, as today; nothing is retried.

**Between questions.** Walk on plays the descent and the walk; the next box appears after any taken-letter lantern, and only then is Next sent, which starts that question's 20 s. The box shows no time until the database answers.

**The end.** After Q7, or a dud or fuse out, the ending list fades in as in 14c-5. Its button, **See results** (answer 21), leaves full screen and shows today's result cards.

**Reduce motion.** No shake, rumble or sway; the charge, climb and walk become one short fade each between still frames; bursts, glitter and the fuse still draw.

**Test runs.** The admin's test run uses the same screen, fed by its test runner; its × and See results return to the admin page it started from (answer 26).

**Screen readers.** The prompt, box, seconds, result, host's answers and ending list are real text in the page, as in the mock, and keep 14b-21's announcements.

**The code.** `game.js` and `street.js` become TypeScript modules under `src/afterglow/`: the street's art, the scene and its phases, the HUD as React components, driven by the run state from `useRun`. Their numbers move to `src/config/tunables.ts` with the origins 14c-5 gave them (DECISIONS.md, Config). The pre-draw's heavy steps are split so no slice passes 16.7 ms (14c-5 answer 42). The mock's test hooks (`__core`) stay, loaded only by the e2e build. The mock's Preview bar (its "skip ›" button) was a review aid and goes, with play again.

**How to play (14c-6d).** One panel, opened by a How to play button before today's run has started: on the game screen under Start, where its link was ("as now") and on Today's banner under Play, smaller (answers 30, 40). It is a modal `<dialog>`, as the settings sheet is (MDN `<dialog>`, SOURCES.md): the page behind is inert, Escape or the × closes it, and focus goes back to the button that opened it (answer 34). It has Afterglow's look on Afterglow's plain dark: one pixel panel like the question box, at the box's width and type scale, in Handjet (answers 32, 35). Inside, four chunks, one at a time (answer 38), with ‹ and › and a dot for each, ‹ unavailable on the first, and on the last a Close where › was (answers 31, 36). Following the APG Carousel pattern (answer 42): each chunk is a group with `aria-roledescription="slide"` named "1 of 4" and so on, the chunks' wrapper is `aria-live="polite"` and `aria-atomic="false"` (nothing rotates by itself), and ‹ › are native buttons that don't move focus. The pattern names no buttons and says nothing about the ends, so these are *Claude's reading*, approved with the design (answer 41): the buttons are named Previous and Next; ‹ is unavailable on the first chunk; the dots only mark the place, hidden from screen readers since each chunk's name says it, not the pattern's slide picker. The words (answers 33, 38 and 43), each number from `tunables.ts`:
1. "The host has picked a few answers to each question. Say one and your run ends. 7 questions, one run a day."
2. "You get 20 seconds for each question. A typo, or not a real answer? Try again. The clock keeps going."
3. "On questions 2, 4, 5 and 7 a letter is taken. Answer without it."
4. "Not the host's? You're safe, and the rarer your answer, the bigger your bonus. Each question is worth more: 25 points for the first, 350 for the last. Run out of time and your run ends."

`/afterglow/how-to-play` answers 404, with no redirect (answer 39).

**The checks (6b-2, answers 44 to 53).** `check.mjs` at `fcc11e4` becomes Playwright tests in `e2e/` (DECISIONS.md, Test runner), in two PRs (answer 52):
- **The test page** (answers 44, 49), `/check/afterglow`, outside the shell: the real `Afterglow` scene fed by a scripted runner, the mock's own run (`RUN` in `check.mjs`: seven answers, common to rare, none using a taken letter), its dud, its off-list word and its time-out, 20 s a question (DECISIONS.md, Game 1). No database. Under `next dev` it serves; in every other build it calls `notFound()`, since Next sets `NODE_ENV` to `development` for `next dev` and to `production` for every other command (Next.js, environment variables guide).
- **The hooks** (answer 45): `startScene` takes one optional `probe`, which only the test page passes. Through it the scene reports what the carried lines read (its phase, question, placement, frame times) and takes the clock's speed and a freeze, as the mock's `__core` did. A player's page passes none, and an e2e checks `/afterglow` has none.
- **The lines** (answer 46): each of `check.mjs`'s named lines is a named check, a soft assertion so one failure doesn't hide the rest, carried as written. The ones about what the game dropped are rewritten to the game's version where it has one (play again becomes See results), or dropped with the reason in Source diff (the skip link, New show).
- **The short set** (answers 47, 50): one scripted run at the phone size, 390×844 at device pixel ratio 3 (the mock's), with that flow's lines, among them those answer 47 lists, runs in CI's `e2e` job with the rest of `npm run test:e2e`. Its time is measured and recorded against "a few minutes" (answer 15).
- **The full set:** both sizes, the fps run, the flights, the ends and the minute of glitter, by hand through `npm run check:afterglow`, in real Chrome (14c-5 answer 41), as its own Playwright project that `npm run test:e2e` leaves out. Its frames and strips go to `test-results/` (answer 53).
- **The mutants (6b-2b, answers 48, 51):** the 83 from `mutants.mjs` at `fcc11e4`, each rewritten for the game's compiled code, run by hand through `npm run check:afterglow-mutants`, four at a time. The check intercepts the dev server's response for the scene's code and serves a broken copy (Playwright, network: modify responses), so no file on disk changes; a break that no longer matches stops the script. 6b-2b's details are settled before it starts.

## Acceptance criteria
- [x] `/afterglow` serves the game, its browser tab titled Afterglow; `/play` answers 404; the record says `{ id: "offbeat", name: "Afterglow", path: "/afterglow" }`, and the ID is unchanged.
- [x] A whole day played in a browser against the local stack: a safe answer of each level shows its rarity's colour and "The host said …", an off-list text shakes and stays selected, a taken letter, a reload mid-question and mid-result, Next, Q7's ending list, See results, the cards.
- [x] A dud and a fuse out each end the run with the ending list.
- [x] No question loses time to the walk: Next goes to the database after the box appears, and its reply leaves more than 19 of the question's 20 seconds (e2e; the browser's and the database's clocks aren't compared, as they may differ).
- [x] The bars, sidebar and clock bar are hidden from Start to See results at 375×812 and 1440×900; the × shows only while no fuse burns, and goes to Today (a test run's, to its admin page).
- [x] A run that is over opens `/afterglow` on the cards, not the ending list.
- [ ] With Reduce motion on, no frame shakes and the climb and walk are fades (e2e with `reducedMotion: "reduce"`).
- [x] An admin's test run plays in Afterglow.
- [x] The share text says Afterglow, with 🟩 and ⬜.
- [x] 6b-2a: `/check/afterglow` plays the scripted run under `npm run dev`, and a production build (`next build`, `next start`) answers it 404.
- [x] 6b-2a: a player's `/afterglow` mid-run has no probe.
- [x] 6b-2a: every named line of `check.mjs` at `fcc11e4` is a named check in `e2e/`, or is in Source diff as rewritten or dropped, with its reason.
- [ ] 6b-2a: the short check runs in CI's `e2e` job on the PR and passes, its time recorded.
- [x] 6b-2a: the full check passes by hand in real Chrome, its fps lines at 59 or more (14c-5 answer 41) and `pre-draw never stalls a frame` among them, and leaves its frames and strips in `test-results/`.
- [ ] 6b-2b: the mutants carried from 14c-5 are each caught by the full check, with no file on disk changed; any not carried are in Source diff with their reason.
- [x] `docs/DESIGN.md` describes `/afterglow` as built.

14c-6d, How to play:
- [x] How to play opens the panel from the game screen under Start and from Today's banner under Play before the run, with Skip the game screen off and on; neither shows once the run has started.
- [x] The panel shows the four approved chunks one at a time: › and ‹ move through them, ‹ is unavailable on the first, the dots mark the place, and the last has Close where › was.
- [x] Close, the × and Escape each close it, focus goes back to the button that opened it, and the page behind can't be reached while it's open.
- [x] Screen readers hear a dialog named How to play, each chunk as a slide named "N of 4", announced politely as it changes, and the buttons as Previous, Next and Close.
- [x] It's in Handjet on Afterglow's dark at 375×812 and 1440×900, with no sideways scroll at 320px, and every button at least 24px each way (WCAG 2.2 2.5.8).
- [x] `/afterglow/how-to-play` answers 404.
- [x] `docs/DESIGN.md` describes the panel.

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
| The off-list shake's length and size | Answer 9 | Answer 28: the mock's shake for a refused taken letter (`refuse()` in `game.js` at `fcc11e4`: steps of 2, −2, 1 and 0 art pixels, 40 ms each), so every refused input shakes the same way (CLAUDE.md, "One way to do each thing") |
| The calm version's fade length | Answer 8 | The walk's descent time from 14c-5 (answer 19) |
| Every constant in `check.mjs` at `fcc11e4` (`EDGE_RUN` 40, `ARC`, `DOWN`, `FAST` 3, `LINGER_S` 62, `HITCH_LIMIT` 16.7 ms, `AGES`, `V5`, the scripted `RUN`) | The check (6b-2a) | Carried unchanged with the origin each has there (14c-5) |
| 1920×1080 at device pixel ratio 1, 390×844 at 3 | The check's two sizes; the short set uses the second (answer 47) | `SIZES` in `check.mjs` at `fcc11e4` |
| 4 mutants at once | 6b-2b | `mutants.mjs` at `fcc11e4` ("eight made the PC unusable"), answer 48 |
| 4 chunks | How to play | Answer 38 |
| The panel's width and type scale | How to play | The question box's: `AFTERGLOW.PROMPT_W` at the scene's type scale (14c-5), so the panel matches the box |
| 24 px | How to play's buttons, at least, each way | WCAG 2.2 2.5.8, as the game's × |
| The panel's padding, the chunks' margin and the dots' gap | How to play | The question box's own (`.window` in `afterglow.module.css`: its padding, and its gap between rows), from the mock's `page.html` at `fcc11e4` |
| The ‹ › and Close buttons' padding | How to play | The game's own buttons' (`.answer button`, the mock's) |
| The gaps in the title row and the button row; the ×'s padding | How to play | The HUD's gap (`.hud`, the mock's); the game's × (`.out`, 14c-6b-1) |

## Plan
Five PRs from `m14-look-and-feel`, each after bringing it up to date with `main`.
1. **14c-6a, the name.** The record and the route folder renamed to Afterglow at `/afterglow` (with How to play), which the share, the boards' game switch and every heading follow; the game page's browser tab says Afterglow (answer 12). Small and reviewable alone.
2. **14c-6b, the game,** in two PRs (answer 20):
   - **6b-1, the game plays.** The run state gains each answered question's tier, from one `tierOf` that replaces the three `levels[id] ?? "rare"` copies (scoring, matching, answers). It was planned for 6a, but nothing would read it there (CLAUDE.md, "Build for today"). The source moved and typed, full screen, the way out, Light it's wait, off-list, Next after the walk, reload, coming back to the cards, test runs and the pre-draw split, with browser tests for the rules, and DESIGN.md for the new screen (CLAUDE.md, Docs): every acceptance criterion but the two on the check and the mutants.
   - **6b-2, the check,** in two PRs (answer 52). Until 6b-2a merges the look is checked by the human's eye, not by machine.
     - **6b-2a:** the test page, the probe, `check.mjs`'s lines in `e2e/`, the short set in CI and the full set by `npm run check:afterglow`; the 6b-2a criteria.
     - **6b-2b:** the mutants by `npm run check:afterglow-mutants`, and any check fixes they force; the 6b-2b criterion.
3. **14c-6d, How to play** (answers 30 to 40), before 6b-2 (answer 37): the panel, its two buttons, the four chunks, the old page removed.
4. **14c-6c, the calm version** for Reduce motion.

## Removes
- `/play` and the name "Game number 1".
- In `src/app/game.tsx`: the `Question` and `Reveal` cards and the in-run countdown, replaced by Afterglow; with their CSS in `game.module.css` and `offbeat.module.css`.
- From the moved code: `MOCK_QS`, play again ("New show"), the page's own font loading and anything else only the private page needed.
- In RIFF-mocks, the human retires `themes/festival/` once the move is merged (an agent's delete there was refused before; not routed round).
- 14c-6d: the How to play page and its route (`src/app/(shell)/afterglow/how-to-play/`, `HowToPlay` in `src/app/offbeat.tsx` and its `.how` CSS in `offbeat.module.css`, its Start playing), the clock bar's slide back up from it (`src/app/shell.tsx`), and the tests and DESIGN.md lines about the page.
- 14c-6b-1 removed: `Question`, `Reveal`, the in-run `Countdown` and `QuestionSkeleton` in `src/app/game.tsx` and the question card's CSS in `game.module.css` (`offbeat.module.css` had none left); scoring's and matching's own `levels[id] ?? "rare"` and `answers.ts`'s own tier union, for `tierOf`; from the mock, its questions, play again, the Preview bar and the counters only its check read.
- 6b-2a removed: the mock's lines on the skip link and New show (Source diff); the game's buttons' inherited app shadow, lift and press; ROADMAP's "Nothing checks that off-list text shakes the box", closed by the added line (answer 56). Nothing in `e2e/afterglow.e2e.ts`: it plays the game against the server (the rules, reloads, Next's timing), and its one overlap with the look check, each rarity's colour, is in the full set only, so CI would lose it. `check.mjs` and `mutants.mjs` stay in RIFF-mocks until the human retires `themes/festival/`.

---
*Fill in the sections below at the end.*

## Source diff
14c-6b-1, against the mock (RIFF-mocks `themes/festival/` at `fcc11e4`) and this ticket's Design:

| Source says | We built | Why different |
|---|---|---|
| The mock judges answers itself, from made-up questions and shares | Every answer, Next and time-up goes to the server through the runner (`src/app/game.tsx`, `Run`); the scene waits on the reply | DECISIONS.md, Game 1: the database is the judge |
| The mock's charge knows the tier from the start | A `wait` phase first: the word steps forward with the plain ink and an unramped cord, rumbling as a common charge does at its start (amplitude 1, its first step rate), until the reply; then the tier's charge runs from where the word is | Answer 16. *Claude's reading* of "a plain rumble": a charge held at its start, so no new number |
| `Q_SECONDS = 20` in the mock | The fuse's length from `RunState.msQuestion`, which SQL measures from `private.question_deadline` | DECISIONS.md, Config: the 20 seconds live in SQL alone |
| The mock's next question opens at once after the walk | The box opens empty (`open` phase, its cord unlit), Next is sent then, and the prompt and seconds come with the reply. If Next fails, the box stays empty with the error over the scene and the ×'s way out; a reload shows the sky result again | DECISIONS.md, Game 1: Timer; Error handling (nothing retried) |
| The mock's sky result: "“answer”, N% of players" and "+points · +bonus rarity" | "“answer”", "The host said …", "+points" | Answer 7; a question's share isn't known while the run goes on (M11 H5) |
| The mock's HUD, ending total and recap count points plus bonus | Points only, from the server; the burst's size still uses points plus the provisional bonus, as the mock's did | Answers 7 and 24; the size is 14c-5's look (its answer 11) |
| Q7's button "See results", the ending's "New show" | Walk on on every question; the ending's See results leaves full screen for the cards | Answers 21, 29; one run a day (DECISIONS.md, Game 1) |
| The mock's Preview bar and its "skip ›" | Gone; the × sits where the bar was, at the foot on the left | Answers 5, 22; the place is *Claude's reading*, clear of the HUD and the box |
| A refused taken letter only shakes the box | It shakes and says "X is taken. Try a word without it." | Design: taken letters work as today |
| The mock's check hooks (`__core`, the phase log, frame counters, rate and freeze) | Not in 6b-1 | CLAUDE.md, Build for today: 6b-2 brings back what the check reads |
| "Their numbers move to `src/config/tunables.ts`" | `game.js`'s 131 named values are `AFTERGLOW` there, less `Q_SECONDS` and `AGAIN_S`, plus answer 28's shake; the numbers inside the drawing code (`street.ts` whole, and the drawing functions in `scene.ts`) stay with the art | *Claude's reading*: they are the drawing, as its colours are (DECISIONS.md, Styling), and moving hundreds of coordinates would hide the art in a list |
| The mock's `:root` variables and ids | On the game's layer, and `data-part` names | The page already has `#result`; the rest of the app keeps its theme |
| The mock writes "FONT FAILED" into the name if Handjet doesn't load | The page shows the error over the scene (`Io.fault`), and the scene goes on in the fallback | CLAUDE.md, Fail loudly; DECISIONS.md, Error handling: the client shows the error |
| 14b-11 answer 12: the test run's label and Restart stay in view the whole run | Over the scene, among its notices, during the run | Answers 11 and 26 put the test run full screen; *Claude's reading* keeps both |
| — | `RunState.next` also carries `stolen`, the letters taken at the next question | The "Damp fuses" line after a reload on the sky result |
| 14b-11 answer 6: after a test run the game screen's cards come back | A test run's See results goes back to `/admin/puzzles`, as its × does, and restarts it (a reopened test page would otherwise resume the old run's moves) | Answer 26 replaces it; the restart is *Claude's reading*, found when the e2e left and came back |
| Answer 22: the × is read "Back to Today" | A test run's × is read "Back to Puzzles", where it goes | Answer 26 sends it there |
| Design: "Coming back to `/afterglow` mid-run picks up where the run is" | A game screen Next.js kept hidden waits for the run to load again before the scene starts, and forgets that the run was played there | A run whose time ran out away from the page reopened on its stale question (found by `jumps-and-finds.e2e.ts`); answer 25 |
| `street.js` | `src/afterglow/street.ts`, five unused locals dropped (lint), output byte for byte the same in 36 sizes and stages (Evidence) | — |

14c-6d, against its Design and the APG Carousel pattern:

| Source says | We built | Why different |
|---|---|---|
| The approved words: "On questions 2, 4, 5 and 7" | The list is made with `Intl.ListFormat("en-GB")` | US English's list adds a comma before "and" ("2, 4, 5, and 7"), which the old page had too; found by the e2e |
| "the page behind is inert" | The page behind can't be reached; Tab past the panel's last button goes to the browser's own controls, as a modal `<dialog>` lets it, then back into the panel | MDN `<dialog>`: the rest of the document is inert, the browser's own controls aren't part of it |
| — | The panel's text is centred | The question's text in the game is centred (`.q`), and the dialog otherwise took whatever the page round its button did (Today's banner centres, the game screen doesn't) |
| APG: previous and next don't move focus | ‹ stays in its place, `aria-disabled` on the first chunk; › is one button that becomes Close, so focus stays on it | The pattern says nothing about the ends; *Claude's reading* (Design), approved with it (answer 41) |

14c-6b-2a, against `check.mjs` at `fcc11e4` (RIFF-mocks `themes/festival/`) and this ticket's Design:

| Source says | We built | Why different |
|---|---|---|
| The check reads `themes/dist/afterglow.test.html`, a page that judges its own made-up day | `/check/afterglow` (`src/app/check/afterglow/`): the real scene, its replies scripted from the mock's sample day and judge (`day.ts`), served by `next dev` only | Answers 44, 49 |
| `window.__core` and the mock's page-wide variables (`scene`, `camNow`, `fuse`, `drawWalk`, `g` and the rest) | The scene's optional probe (`Probe`, `Core` in `src/afterglow/scene.ts`): the test page sets `window.__core`; the check reads `__core.scene`, `__core.fuseBox` and so on, and swaps `__core.g`, `drawSky`, `drawTower`, `drawWalk` and `draw` as the mock swapped its globals | Answer 45 |
| The scene's counters (phase log, frame and pre-draw times, `camNow`, `skyNow`, `towerNow`, the fuse's and rumble's state) | Kept on every page, as the mock kept them; only the clock's speed and stop wait on the probe | The check reads the code players run, not a copy (CLAUDE.md, "Never cheat a check") |
| One script, `pass`/`FAIL` lines, an exit code; `CHROME_CHANNEL=chrome` for real Chrome | Playwright tests (`e2e/afterglow-look.e2e.ts`, helpers in `afterglow-look.ts`), each line a soft check under its name and printed as before; the project `afterglow-full` in the installed Chrome | DECISIONS.md, Test runner; answers 47, 50; Playwright, browsers |
| The whole check at both sizes | `npm run test:e2e` runs the phone size's scripted run alone (42 lines, among them the colour and font lines over the frames it looks at); `npm run check:afterglow` runs everything | Answers 15, 47 |
| No limit on the whole check, each wait its own | The look tests have no test timeout (`test.setTimeout(0)`); each wait keeps the mock's | The mock had none; no new number |
| The skip link: to Q2's lantern (layout), to Q7 (common and rare bursts), to Q2 (taken letters), to Q5 (idle) | Layout answers Q1 and walks on to Q2's lantern; the others open the page at the question (`?q=N`, the earlier ones answered with the scripted run) | Answer 46: the game has no skip link |
| New show: the fps run's raster part, the time-out then the dud then the taken letters on one page | A new page for each; "no console errors in the ends" is still one line, over the three pages | Answer 46: one run a day |
| "the skip link plays each lantern once", "skipping all seven reaches the results", "after a full run, a result keeps its answer line", "a new size after New show plays on" | Dropped | Answer 46: they test the skip link and New show, which the game doesn't have |
| "time-out: ends on the street with play again" | "time-out: ends on the street with See results" | Answer 21 |
| "the last result's button leads to the results": Q7's button says See results | Q7's says Walk on, and the ending's See results leaves for the cards | Answers 21, 29 |
| The recap's `+total` | `+points` | Answers 7, 24: points from the server; the bonus estimate only sizes the burst |
| The lantern between the arrival and the box: `arrive>letter>ask` | `arrive>letter>open` | DECISIONS.md, Game 1: Timer (the box opens empty, Next is sent, then "ask") |
| The dud's phases `ask > charge > dud > over` | `ask > wait > charge > dud > over` | Answer 16 |
| The flow reads the word's tier as soon as it is typed | Once the reply has landed | Answer 16: the word waits in plain ink until then |
| Two colour lines need the phases the whole check plays, play again's among them | No play again; the CI set needs only the phases its run plays | Answers 46, 47 |
| "one font": Handjet 400 by name | The family `next/font` gave Handjet, read from `--afterglow-font`, at 400 | `src/afterglow/font.ts`: next/font names the family |
| "memory bounded" counts play again's scene | No such scene | Answer 46 |
| Unlisted text is rare (the mock's `UNLISTED_SHARE`) | Listed: "sydney harbour bridge" at Q1 (.01) and "sonic" at Q7 (.3, as the mock's check set it); anything else is off-list | The game refuses text that names no answer (answer 9) |
| Every console warning fails its line, but the mock's one canvas note | Also passed over: Next's dev build's unused stylesheet preload, on every page; Next's dev-tools badge is hidden before the check looks | Answers 57, 58 |
| — | One line more: "off-list text shakes the box, in whole art pixels, as a taken letter does" | Answer 56 |
| `offGridBlocks` | Not carried | Defined in the mock and never called |
| `game-check.json`, `game-colours.json`, `themes/dist/game-shots/` | The lines in Playwright's report and output; `<size>-colours.json` and the frames and strips in each test's `test-results/…/shots/` | Answer 53 |
| — | The game's and How to play's buttons drop the app's hard shadow, lift and press (`afterglow.module.css`) | The colour line caught the ×'s shadow in the app's ink, `#1a1a18`, which isn't the game's; the mock's buttons are flat (14c-5) |
| — | Light it places the word at the box as the wait starts (`scene.ts`, `startWait`) | 6b-1 started the charge from where the wait left the word, which a reply landing before the wait's first frame left at the last word's place: the dud line caught Q1's word flying in from the top left. The mock had no wait (answer 16) |
| The mock's `#word` has `will-change: transform` | `.word` has none (`afterglow.module.css`) | On its own layer, real Chrome drew two of the moving word's anti-aliased edge pixels one unit off at some offsets (`181,241,60` for `182,242,60`), which "lettering never changes shape or size" counts as a change: 14c-5's open failure, answer 60. Painted with the UI's layer it was the same at every offset swept, Q6's climb from 0.40 to 0.64 |
| The street's steps (`street.js`): rows of the sky and the street above the frame 48 at a time, the floor 24, the street's items 4, a cloud, a building, the palace, a front and each lighting pass whole | A row, a tier, a piece, a floor or an item a step (`street.ts`) | Answer 59: no step over the slice's 4 ms budget (`PREDRAW_SLICE_MS`); the slowest measured in real Chrome here was 12.0 ms before, 3.9 ms after. Output the same byte for byte in 42 sizes, stages and cameras |

## Evidence
**14c-6a, the name and address** (2026-11-07, Windows PC, this worktree's own `next dev` on port 3000, local stack):
- `npm run lint`: clean. `npm test`: 634 passed.
- The 14 e2e files 6a touched (`npx playwright test e2e/alive.e2e.ts … e2e/play2.e2e.ts --reporter=line`): `2 failed`, `66 passed (15.3m)`. Hypothesis written before the run: all pass except database-state failures ("thing … has no name"); a failure tied to `/afterglow` would disprove it. No "has no name" error came back (the three stored puzzles' 33 host answers all have names, checked with `private.thing_names`), and `feel.e2e.ts:242`, which failed in the earlier runs, passed.
- The two failures, rerun alone (`npx playwright test e2e/play2.e2e.ts:51 e2e/shell.e2e.ts:355`): `2 passed (52.0s)`. Under the full run's load, `play2.e2e.ts:51`'s second try landed after the lockout ("You played aqkb: 25 points." where "Too quick. Try again in a moment." was expected), and `shell.e2e.ts:379`'s Create group was still "Loading" when its 5 s wait ran out. Neither touches the renamed route; both are in ROADMAP, For M14.
- `e2e/offbeat.e2e.ts` checks `/afterglow`'s tab title (`toHaveTitle(GAME.name)`) and that `/offbeat`, `/updraft` and `/play` answer 404.
- The earlier runs' 11 failures are not explained: some of them ran against `RIFF-m16`'s dev server, which held port 3000, and the "has no name" errors' cause is *unverified* (perhaps the base changing mid-run).

**14c-6b-1, the game plays** (2026-11-08, Windows PC, this worktree's own `next dev`, local stack):
- `street.ts` against the mock's `street.js` in Chromium, 36 sizes, stages and cameras, every canvas and number compared: `configs=36 canvases=756 pixelBytes=161343432 numbers=8562 otherLeaves=0 mismatches=0`; with one number changed on purpose the same harness reported `mismatches=305`, so it catches a difference.
- `npx vitest run src/game/runs.db.test.ts --no-file-parallelism`: 34 passed (the tier, `msQuestion` of exactly 20000, `next.stolen`); `src/app/api/admin/test/route.db.test.ts`: 13 passed.
- `npm run lint`: clean. `npx tsc --noEmit`: clean. `npm test`: 640 passed (`share.test.ts`: the share says Afterglow with 🟩 and ⬜, criterion 8).
- `e2e/afterglow.e2e.ts`: a whole day (Kamuro, Chrysanthemum and Peony in their colours with "The host said …", Q2's lantern, a taken letter, off-list text kept selected, a reload on the sky result and mid-question, Next sent after the box shows with more than 19 s left, a dud's ending list, See results, the cards), a fuse out, and full screen with the × at 375×812 and 1440×900, a finished run opening on the cards: 4 passed. Surviving all seven, Show's over and its seven answers: `approve-and-play.e2e.ts`, 2 passed (with afterglow.e2e.ts, `6 passed (3.5m)`). An admin's test run, its label and Restart over the scene, its × and See results back to the puzzles page: `test-run.e2e.ts`, `4 passed (46.7s)`.
- The whole suite (`npx playwright test --reporter=line`): `1 failed`, `162 passed (27.1m)`. The failure, `streak.e2e.ts:38`, looked for the top bar's pill just after Start, which Afterglow hides (answer 3); it now reads the pill back on Today: `streak.e2e.ts` and `text-size.e2e.ts`, `6 passed (16.3s)`.
- Screenshots at 390×844 and 1440×900 (the question, the wait, the sky result, a lantern, a taken letter, off-list text, a dud's ending list) looked as the mock does; they are in the session's scratchpad, not in the repo.
- Not checked: a real phone, real Chrome's frame rate and Reduce motion (6b-2's check and 6c).
- PR #169's first CI e2e run (run 42531148650 at 1ad2b21): `1 failed`, `2 flaky`, `160 passed (27.9m)`. The failure, `afterglow.e2e.ts`'s failed-Next test, found two alerts: the scene's error and Next.js's own route announcer, which in CI held "Plor, Today"; the test now looks in the game's region. `test-run.e2e.ts`'s first test ran past Playwright's 30 s on its first try, since 6b-1 has it play a second run; it's now `test.slow()`. The other flaky one was `play2.e2e.ts:51` (ROADMAP, For M14). Both fixed tests locally: `4 passed (58.7s)`.

**14c-6d, How to play** (2026-11-08, Windows PC, this worktree's own `next dev`, local stack):
- `npm run lint` and `npx tsc --noEmit`: clean. `npm test`: 640 passed.
- Handjet's file has the panel's glyphs: drawn in Chromium in Handjet-then-serif against serif alone, ‹ › • × · differ (present), ○ ● don't (absent, so not used), "A" differs (the control).
- First run (`npx playwright test e2e/how-to-play.e2e.ts e2e/offbeat.e2e.ts e2e/headings-invites.e2e.ts e2e/shell.e2e.ts --reporter=line`): `4 failed`, `23 passed (2.9m)`. The chunk read "2, 4, 5, and 7" (fixed, Source diff); the font check compared the family names with their quotes, which differ between the variable and the computed style (the test fixed); a click on ‹ at the first chunk waited for it to be enabled, which `aria-disabled` never is (pressed from the keyboard instead); Tab past the last button left the document for the browser's controls (the check now says the page behind is never reached).
- After the fixes: `npx playwright test e2e/how-to-play.e2e.ts e2e/offbeat.e2e.ts`: `10 passed (1.0m)` (the four chunks in turn and back, ‹ doing nothing on the first, Close, × and Escape with focus back, the carousel and slide names, before Start and on Today with Skip on and off, gone once the run starts, Handjet on the dark at 375×812, 1440×900 and 320px, buttons 24px or more; `/afterglow/how-to-play` answers 404).
- Screenshots at 390×844: Today's banner with How to play under Play, and the panel's first chunk; in the session's scratchpad, not the repo.
- PR #170's first CI e2e run (run 42539845158 at 29f4c4b): `1 failed`, `3 did not run`, `163 passed (33.4m)`. The failure, `settings.e2e.ts:55`, checked the page's first `<dialog>` was modal; since 6d that's How to play's, closed, on Today's banner. It now checks the settings sheet's own (the 3 that didn't run are that file's next tests, which stop at a failure). Missed before the PR because only the four edited e2e files were run, not the whole suite.
- The whole suite locally after the fix (port 3000 checked free, this worktree's server): `5 failed`, `162 passed (32.1m)`, `settings.e2e.ts` passing. Four of the five failed again alone (`live-board.e2e.ts:45`, `reactions-menu.e2e.ts:172`, `test-run.e2e.ts:130`, `today.e2e.ts:105`), none touching How to play; on `main` (15adce6, without 6d) `live-board` and `today` failed too, with other errors, and the other two passed. All four passed in CI's fresh stack on 6d's code (above), so they're taken as this PC's local stack (restarted by Docker, shared with game 2's session), cause *unverified*.
- After the merge, with port 3000 freed by the human (2026-11-09), the four again on this worktree's own server: `2 failed`, `16 passed (6.6m)`. `live-board.e2e.ts` and `test-run.e2e.ts:130` passed, so the shared server explains those two. The other two, `reactions-menu.e2e.ts:172` and `today.e2e.ts:105`, failed no check: each ran out of its 30 s (`Test timeout of 30000ms exceeded.`), its trace showing every step passing, Light it to See results taking 4.5 to 5.3 s, and the reduced-motion test playing twice. Both play Afterglow in full without `test.slow()`, as `test-run.e2e.ts` did before PR #169's fix; CI is faster on the same `npm run dev`. In ROADMAP, For M14.

**14c-6b-2a, the check** (2026-11-09, Windows PC, this worktree's own `next dev` on port 3000, local stack; real Chrome is the installed one):
- The test page: `?q=1` played Q1 to Q2 in headless Chromium, `ask > wait > charge > climb > burst > result`, "Peony", "The host said towel.", Walk on, then `descent > arrive > letter > open > ask` with "Damp fuses: P"; `?q=7` opened on Q7 with 6 results and 650 points; no console errors.
- A production build: `npx next build` (exit 0), `npx next start -p 3001`: `/check/afterglow 404` (with `noindex`), `/about 200`; the server stopped after.
- The CI set, `npx playwright test e2e/afterglow-look.e2e.ts --project=chromium`: first run 40 of 42 lines, the 2 failures Next's dev badge and dev stylesheet warning (answers 57, 58); then 42 of 42, `1 passed (2.5m)` to `(2.9m)` in three runs, against "a few minutes" (answer 15).
- The full set, `npm run check:afterglow` (real Chrome): run 1, 217 of 222 (the dud's word charging from the top left, fixed in `startWait`; the off-list line's own reading, fixed; the phone lettering, answer 60); run 2, 219 of 222 (`pre-draw never stalls a frame` 25.9 and 19.7 ms on a busy PC, answer 59; the lettering again, 11736 against 11738). After the split and the word's layer: **run 3, 222 of 222, `6 passed (14.6m)`**: `60 fps, whole run` 60.0 fps at both sizes (worst interval 19.4 ms wide, 22.2 ms phone); `pre-draw never stalls a frame` worst slice 7.3 ms wide, 5.5 ms phone, slowest step 4.0 ms (rounded, at the budget) and 2.8 ms; `lettering never changes shape or size` Q6 11738 px at every point; the two raster lines printed, not judged, in real Chrome (answer 41): 12.72 and 15.26 ms average. Frames and strips are in `test-results/afterglow-look.e2e.ts-*/shots/`.
- The street's split, against the committed `street.ts` in Chromium, every canvas, number, string and flag of `sceneSteps` in 42 sizes, stages and cameras: `configs=42 canvases=882 pixelBytes=1127700648 leaves=11430 mismatches=0 steps old=12418 new=667558`; with one dither number changed on purpose the same harness reported `mismatches=35`. Its slowest step per yield in real Chrome here, before and after: 12.0 ms (a cloud) to 3.9 ms.
- The lettering: Q6's climb swept from 0.40 to 0.64 in real Chrome; with the word on its own layer, 4 of 13 offsets lost 2 edge pixels (`181,241,60` and `182,241,60` for `182,242,60`); without it, 11738 px at all 13.
- A player's run has no probe: `e2e/afterglow.e2e.ts`'s whole day checks `"__core" in window` is false mid-question; with `how-to-play.e2e.ts`, `10 passed (2.4m)`.
- `npm run lint` and `npx tsc --noEmit`: clean. `npm test`: 640 passed.
- The whole e2e suite, `npm run test:e2e` (port 3000 this worktree's, checked): `2 failed`, `166 passed (25.3m)`. Both in `offbeat.e2e.ts` (:83 "polar bear" not found in yesterday's answers, :152 `"banana" isn't in our list`), failing again alone. Cause: this stack's yesterday, 2026-11-08, holds a fixture day left by an earlier run whose answer base was since removed, so the file takes it as its own and its answers aren't there (11-07 has another); neither test touches what 6b-2a changed. CI's fresh stack is the check (below).

## Review
14c-6b-1, by the `reviewer` agent in a fresh context (2026-11-08), on `git diff origin/main...HEAD` at 3de8c14:
- Blocking findings and how each was fixed:
  1. A failed Next left the box empty with the × hidden, and a failed time-up left the box refusing input: the player was held full screen with no way out. Fixed: either failure leaves its error over the scene and shows the × (`scene.ts`, `stranded`); `afterglow.e2e.ts` "a Next that fails says so and shows the way out".
  2. Two silent stalls: a Next reply with no question, and a time-up that found no run. Fixed: each is an error the page shows (`game.tsx`, `Run`'s `fault` and `Game`'s `timeUp`).
  3. A page shown again whose new load failed showed Afterglow's dark for good, hiding the error. Fixed: the error shows instead.
  4. Handjet failing to load was an unhandled rejection the player never saw. Fixed: `Io.fault`, shown over the scene.
  5. HANDOFF and the ROADMAP row were stale. Rewritten.
  6. DESIGN.md's new citations pointed at moved lines. Recomputed from the code, older ones in `game.tsx` too.
  7. `useRun`'s `load` was returned with no caller left. Removed, its comment fixed.
- Evidence after the fixes: `npx tsc --noEmit` and `npm run lint` clean; `npx playwright test e2e/afterglow.e2e.ts e2e/test-run.e2e.ts e2e/jumps-and-finds.e2e.ts --reporter=line`: `11 passed (4.0m)`.
- Deferred to ROADMAP "Next revision" (For M14): the full-screen test's top bar and `h1`, the off-list shake (6b-2), the weak reload-seconds check, a test run left by Back, the HUD's `aria-label` on a plain `div`, the new prompt not announced, the "Name a firework…" placeholder (for the human), and DECISIONS.md's Styling sentence order.

14c-6d, by the `reviewer` agent in a fresh context (2026-11-08), on `git diff 1ad2b21..HEAD` at 8db1e19:
- Blocking findings and how each was fixed:
  1. HANDOFF and 2. the ROADMAP row didn't match the ticket's Status. Rewritten.
  3. DESIGN.md's citations into `afterglow.module.css` and the font had moved. Recomputed from the files.
  4. The Design, criterion 1 and DESIGN.md said How to play sits above Start; it sits under it, where its link was, as answer 30's "as now" says. The docs fixed.
  5. The old page's `.how` CSS in `offbeat.module.css` was dead. Removed, and in Removes.
  6. Comments in `offbeat.tsx` and `to-play.ts` still described the old page. Fixed.
  7. The panel's spacings had no recorded origin. Each is the game's own (the box's padding and gap, the HUD's gap, the game's buttons and ×), now cited in the CSS and the Numbers table.
- Evidence after the fixes: lint and types clean, `npm test` 640 passed, `npx playwright test e2e/how-to-play.e2e.ts e2e/offbeat.e2e.ts e2e/headings-invites.e2e.ts e2e/shell.e2e.ts --reporter=line`: `27 passed (2.6m)`.
- Deferred to ROADMAP "Next revision" (For M14): the panel's `--u` at its default, the weak Tab check, Plan step 3's "30 to 40", `shell.e2e.ts`'s one-path loop, and 6d built while #169 was open.
