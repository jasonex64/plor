# M14 14c-9 — Game 2, plain

**Status:** planned (awaiting the human's approval; starts after 14c-8 merges)

## Goal
Game 2 plays in the app's own look, at game 1's level of finish, and the village is removed.

## Who uses it / what breaks without it
- Used by: every player of game 2; the closed beta's friends.
- Breaks without it: a phone downloads the village's 48 files (about 10.8 MB) and a 3D library to play a word game (14c-7's page; measured 2026-11-10 by the review session, not re-checked), the village's e2e keep failing on CI (ROADMAP, Next revision; M16 16g-3), and 16f waits.

## The human's answers (2026-11-10, guided questions, the planning session)
Answers 1 to 3 and 5 of `M14-14c-8-plain-game-1.md` apply. For game 2:
6. What the plain game keeps: "also add an how-to-play, just like the first one(and any other discrepancies u think we should add. both games should have similar level of polish),Running score all game,Timer bar,Full-screen play with a close button".
7. **Claude's reading of "any other discrepancies", to confirm at approval.** So both games match:
   - (a) game 2 gets a How to play pop-up, in 14c-8's component, with its own steps;
   - (b) both games show the countdown the same way: the seconds number with the draining bar (so 14c-8's game 1 gains the bar here);
   - (c) both use 14c-8's play frame and ×;
   - (d) game 2's result sentence is a status message for screen readers, as game 1's is;
   - (e) no recap is added to game 2: its result cards already list "Your rounds".

## Source
- `docs/DESIGN.md`: the app's look.
- The round at `7c94697^` (`src/app/substrings.tsx`, M16 16d): the plain round, its sentences ("You played X: N points, and B for the bonus letter", "Time's up.") and its result cards.
- `docs/milestones/M16-game-2-substrings.md` and `M16-16d-playing-it.md`: the rules and the round's words. How to play's steps come from these rules; their wording is the human's to approve (Plan, step 2).
- `src/brew/brew.tsx` at this ticket's start: the top bar's round and score, the timer bar, the letters-used panel, the `aria-label` "Your word".
- 14c-8: the play frame, the How to play pop-up. SOURCES.md: HTML `<dialog>`, APG Carousel, WCAG 2.2 (4.1.3 for the status message; 1.4.1, the bar never the only sign of time, the number stays).

## Acceptance criteria
- [ ] `/play2` shows game 2 in the app's look, named "Game 2": round N of 7, the running score, the letters and bonus letter, the seconds number with its bar, the letters-used panel, the word box, Try.
- [ ] After a word or a time-up the result sentence shows at once and Next is focused at once; no step waits on an animation.
- [ ] Start is enabled as soon as the page is; nothing reads "Loading the village".
- [ ] The play frame and × behave as game 1's; How to play opens as game 1's does, with game 2's steps.
- [ ] Game 1 shows the same number-and-bar countdown.
- [ ] No rule or scoring change: `npm test`, `npm run test:db`, `npx supabase test db` pass with no test of game 2's rules changed.
- [ ] `git grep -il "brew\|village\|three" -- src e2e package.json` prints nothing (but for words unrelated to the village, listed in the Evidence); `public/brew/` is gone; `three` is out of `package.json`; `npm run build` and `npm run check:client-bundle` pass.
- [ ] `npm run test:e2e` passes twice in a row locally and on CI's first run, with game 2's e2e rewritten for the plain round.
- [ ] `docs/DESIGN.md` describes the plain round.

## Out of scope
- The shared Today, streak, feed, Me and Share (16f). Any rule change. Any art.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 rounds, the round's seconds, the points | play | unchanged (`M16-game-2-substrings.md`, Numbers) |
| About 10.8 MB in 48 files; three.js about 779 KB (about 200 KB gzip) | what the removal saves | the review session's measuring after `npm run build`, 2026-11-10; re-measured in this ticket's Evidence |

## Plan
1. Bring back `7c94697^`'s round on today's API, inside 14c-8's play frame. Expected: no change needed in game 2's server code; if one is, stop and report.
2. Add the top bar's score, the timer bar (moved to one shared component, used by game 1 too), the How to play steps (drafted from the rules, shown to the human before the PR).
3. Delete the village (Removes); rename the record to "Game 2".
4. Rewrite game 2's e2e; update DESIGN.md; re-measure the build.
5. The `reviewer` agent, then the PR.

## Removes
- `src/brew/` (the scene, the village, the CSS), `public/brew/` (48 files), the `three` dependency, the model credits that go with them.
- `e2e/brew.e2e.ts`'s village tests (the ones failing on CI) and `M16-16g-3`'s open question of how to fix them.
- The village's words ("Toss it in", "Casting the spell…", "Loading the village…") and its Reduce motion branch.
- ROADMAP's Next revision items that only concern the village's drawing (sorted in this PR, listed in the Evidence).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
