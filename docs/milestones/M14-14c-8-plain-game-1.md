# M14 14c-8 — Game 1, plain

**Status:** in progress (approved by the human, 2026-11-10: "approve", to both tickets with the proposed names, rarity words and polish list)

## Goal
Game 1 plays in the app's own look, with the four additions the human kept from the festival, and the festival is removed.

## Who uses it / what breaks without it
- Used by: every player of game 1; the closed beta's friends (ROADMAP, Focus, "The plan to the beta").
- Breaks without it: the game keeps a look the human said has "gone too far" (14c-7, answers 1, 5 and 12), and 14c-9, 16f and the beta wait on it.

## The human's answers (2026-11-10, guided questions, the planning session)
1. The games' look, after 14c-7's six pictures: "go plain for both".
2. The festival's and village's code, art and the mutant check: "Remove them (Recommended)". They stay in git history.
3. The games' names: "use placeholder names that are simple". **"Game 1" at `/play`** and "Game 2" at `/play2`, Claude's proposal, approved with the ticket ("approve").
4. What the plain games keep: "Show me the differences first". From the list (a Sonnet subagent's reading of `8309555` against today, not run), the human kept all four offered for game 1: "Full-screen play with a close button", "How to play as a pop-up", "Answer recap before results", "Rarity label on safe answers".
5. Game 2 (14c-9): "also add an how-to-play, just like the first one(and any other discrepancies u think we should add. both games should have similar level of polish)". So what both games share is built once here, for 14c-9 to use.

### During the build (2026-11-10, the 14c-8 build session)
6. `src/game/runs.ts` and `runs.db.test.ts` name Afterglow in comments, against "prints nothing" and "no test of `src/game/` changed": "Reword the notes only (Recommended)". Only those comments change.
7. `RunState.msQuestion` and `next.stolen` were for Afterglow's fuse and box only, and have no caller once it goes: "Remove them now (Recommended)". `runs.db.test.ts` loses its `msQuestion: 20_000` expectation and the `stolen` part of one `next` expectation, and `share.test.ts` its `msQuestion` fixture line, as the fields are gone; no rule or score changes.

## Source
- `docs/DESIGN.md`: the app's look (colour slots, Baloo 2, cards, buttons, the 44px controls); nothing in the plain game takes a value from outside it.
- The game screen at `8309555` (`src/app/game.tsx`, 14c-2): the question card, the countdown number, the "Letters taken" tiles, "Safe!" with the bonus estimate and running total, the result cards.
- SOURCES.md, HTML `<dialog>` (14a-3b): the How to play pop-up. SOURCES.md, WAI-ARIA APG Carousel (14c-6d): its steps, as `src/afterglow/how-to-play.tsx` builds them today.
- SOURCES.md, WCAG 2.2: 2.4.3 and 2.4.11 for focus when the shell hides, 4.1.3 for the result's status message.
- `docs/milestones/M14-14c-2-neutral-words.md`: the neutral words ("Safe!", "Caught on question 3", "Time's up on question 4", "the host said").

## Acceptance criteria
- [ ] `/play` shows game 1 in the app's look: the question card of `8309555`, "Question N of 7", the running points, the countdown number, the "Letters taken" tiles, Answer. `/afterglow` answers 404.
- [ ] While a run is in play the shell's bars and sidebar are hidden and an × ("Back to Today") is shown; before and after a run they are back. Checked at 390×844 and 1440×900.
- [ ] How to play opens as a pop-up over the game and from Today, with the same four steps, Previous, Next, Close and Escape; its words name no festival.
- [ ] A safe answer shows "Safe!", the host's answer, the points, the bonus estimate, the running total, the next taken letter and the answer's rarity as a plain word (Numbers); Next is focused at once, with no wait.
- [ ] When a run ends (caught, time up or finished), a recap lists each answer with its points and the total, then "See results" opens the result cards of `8309555`.
- [ ] A screen reader hears each result and the recap's total (one status message each), and the "Past midnight" note shows during play as today.
- [ ] No rule or scoring change: `npm test`, `npm run test:db` and `npx supabase test db` pass with no test of `src/game/` changed.
- [ ] `git grep -il afterglow -- src e2e scripts package.json playwright.config.ts` prints nothing; `npm run build` passes; the client bundle check (`npm run check:client-bundle`) passes.
- [ ] `npm run test:e2e` passes twice in a row locally and on CI's first run, with the game's e2e rewritten for the plain screen.
- [ ] `docs/DESIGN.md` describes the plain game screen, each value cited.

## Out of scope
- Game 2 (14c-9). The shared Today, streak and feed (16f).
- Any new visual idea: no art, no animation beyond what DESIGN.md already gives buttons and counts.
- The run left at a reveal that never ends (its own ticket, from the must-fix list).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 questions, 20 seconds, the points and the taken letters | play | unchanged (DECISIONS.md, Game 1) |
| The three rarity words | the label on a safe answer | "Common", "Uncommon", "Rare": Claude's proposal for the code's three tiers (shown before as Peony, Chrysanthemum and Kamuro, `src/afterglow/scene.ts`), approved with the ticket (human, 2026-11-10: "approve") |
| 390×844, 1440×900 | the sizes checked | the 2026-10-29 Impeccable audit's sizes (HANDOFF.md) |

## Plan
1. Bring back `8309555`'s game screen under `/play`, on today's run API (which gained the tier, the full question time and every taken letter in `2c4c2e9`). Expected: the game's unit and db tests pass untouched; if a server shape the old screen read is gone, stop and report before changing `src/game/`.
2. Build once, for both games: the play frame (shell hidden, ×), the How to play pop-up (moved out of `src/afterglow/`), the recap.
3. Add the rarity word and the status messages.
4. Delete the festival (Removes), rename the game's record to "Game 1" at `/play`.
5. Rewrite the game's e2e for the plain screen; update DESIGN.md.
6. The `reviewer` agent, then the PR.

## Removes
- `src/afterglow/` (the scene, street, font, CSS), `src/app/(shell)/afterglow/`, `src/app/check/afterglow/`.
- `e2e/afterglow*.ts`, `scripts/afterglow-mutants.ts`, the `afterglow-full` Playwright project and `MUTANT_PORT`, `npm run check:afterglow` and `check:afterglow-mutants` (the 93 mutants and their 5-hour run, which ended 1 not caught by design).
- The festival's words ("Light it", "Damp fuses", "Dud", "Fuse out", "Show's over", "Walk on", the firework names).
- 14c-6c, Reduce motion, from the plan, unbuilt; ROADMAP's Next revision items that only concern Afterglow's drawing (sorted in this PR, listed in the Evidence).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
