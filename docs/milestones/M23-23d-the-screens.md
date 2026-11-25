# M23 — 23d, the clock game's screens

**Status:** designed 2026-11-25 from answers 40 to 47 in `M23-offbeat-on-a-clock.md`; **approved 2026-11-25 (the human: "Approve 23d")**. 23d-1 is being built.

## Goal
A player can play a format 4 Offbeat day from start to result on a phone or a computer, signed in or as a guest, share the result, and see friends' runs on the live board.

## Who uses it / what breaks without it
- **Used by:** every player, once a format 4 day is approved (23e) and the switch is made (23f).
- **Breaks without it:** 23c's run has no screen: the clock game cannot be played, so the beta cannot restart.

## Source
- The human's answers 5 to 11, 27, 28, 32 and 33 (the game, the M23 ticket) and 40 to 47 (these screens).
- `docs/milestones/M23-23c-the-run-on-a-clock.md`: the state the server gives (`ClockState`), the routes, what a repeat and a miss return.
- `docs/DESIGN.md`: the game screens as built (the full-screen play skeleton, a game's card, the result's stacked rows, the live board), which this follows (answer 40: the app's own look).
- `node_modules/next/dist/docs/` for any Next.js code (AGENTS.md).

## Assumptions
1. The old seven-question screens stay as they are until 23f removes them: `/play` shows the clock game only on a format 4 day, by the day's format.
2. No sound, no new typeface, no new colour: the kit's pieces and Offbeat's banner colour (answer 40).
3. The three tiers are shown to players as "Common", "Uncommon" and "Rare", the words answers 10 and 11 use.

## Design

**Before the run:** today's one card (20n-4) with the rules in three lines (three questions, one clock that starts at 20 seconds, rarer answers add more time and points), Start and How to play.

**The play screen** (full screen, as today: Close and How to play at the top):
- the clock, counting down from the server's time left, as the kit's countdown bar with the seconds beside it;
- "Question 2 of 3" and the running points;
- the question;
- the input, in one fixed place with the phone keyboard open; Enter sends;
- **the last answer only** (answer 41), under the input: its name, its tier, the seconds it added and its points. In its place, when the last thing typed was not accepted: "Already said" for a repeat (answer 44), "Not on the list" for text that names nothing. A count of this question's answers sits beside it;
- Next (questions 1 and 2; no going back, said once in How to play), Finish on question 3 (answer 33);
- when the clock reaches zero, or on Finish, the result replaces it. A second tab shows the same run (answer 32); a lost connection carries on with the server's time (answer 28).

**The result:** one card (20n-4): the points, then per question a stacked row (20n-5's shape): the question, the count and points, the player's answers each with its tier, then **missed answers: three common, three uncommon, three rare** (answer 45), the same for every player that day, and a count of the rest ("and 452 more"). The nine are picked by the server from the question's levelled answers in an order fixed by the day and the question, so everyone sees the same ones; a player who gave one of them sees the next in that order.

**The share text** (answer 43, answer 46): the game's name and date, the points, then per question one line of squares, one per answer in the order given, coloured by tier, wrapping every 10, and the link. No answer's name.
```
Plor Offbeat, Nov 25: 340 points
1 🟩🟩🟦🟩🟪🟩🟦🟩
2 🟩🟦🟩🟩
3 🟩🟩🟩🟪🟦🟩🟩🟩🟦🟩
  🟩🟦
plor.app
```
Green common, blue uncommon, purple rare.

**The live board** (answer 47): a friend mid-run reads "Question 2 of 3 · 180 points", updating on each accepted answer and each Next; a finished one reads their points. The board's message gains the points (its version goes from 2 to 3); it still never carries an answer.

**Reduce motion:** every change is instant.

## Sub-parts, one PR each
- **23d-1:** the card before the run and the play screen, for a player and a guest, ending on the points and the answers given (the state 23c already gives).
- **23d-2:** the server's additions (the result's nine missed answers per question, fixed for the day; the board message's points, a migration), the full result, the share text, the live board's rows, How to play, DESIGN.md's result and board entries.
- Split changed 2026-11-25, before any code: the server's additions serve the result and the board only, so they go with them.
- **Found 2026-11-25, for 23d-2 and 23e:** a day holds only its common and uncommon answers (`levels`); every other member of the category is rare and no function `plor_app` may run lists a category's members for a player (`src/game/clock-state.ts`). So the three rare missed answers cannot be picked from the base at result time without a new grant. Planned instead, with no grant: the day itself carries an ordered handful of rare answers picked when it is drafted (23e), and the result shows the first three the player did not give. To be confirmed with the human when 23d-2 starts.

## Acceptance criteria
- [ ] On a format 4 day, a signed-in player and a guest each play a run from Start to the result at 390 × 844 and 1280 × 720 (`@visual` Playwright tests): an accepted answer shows its name, tier, seconds and points and moves the clock and the score; a repeat shows "Already said" and text off the list "Not on the list", neither moving anything; Next opens the next question and never the last; Finish shows only on question 3.
- [ ] With the phone keyboard's height taken off the screen, the input and the last answer are inside the visible area (measured in the test).
- [ ] A run whose clock reaches zero shows the result without a tap; reloading mid-run shows the same question, answers count and a clock within a second of the server's.
- [ ] The result lists every answer given with its tier, and per question three missed answers of each tier (fewer when fewer were missed) that are the same for two players, none of them one the player gave (db test for the pick; e2e for the screen).
- [ ] The share text matches the format above for a run with more than 10 answers on a question (unit test), and holds no answer's name.
- [ ] A friend's row on the live board reads the question and points mid-run and updates without a reload (e2e with two players); the board message holds no answer (unit test of the message).
- [ ] With Reduce motion on, nothing on these screens animates.
- [ ] A format 3 day still plays as before (the existing e2e tests pass).
- [ ] `npm run verify -- offbeat-run` passes, and the skill's sync commit moves if a covered file changed.

## Out of scope
- A style of its own for Offbeat (mocks A and B, M20 20m: the human judges them first; answer 40).
- Drafting and approving a format 4 day, tiers from play (23e). Boards and par from the switch, removing the old game and its screens (23f).
- Sound. A list of the answers given while playing (answer 41). The full list of missed answers (answer 42).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 3, 3, 3 | Missed answers shown per question, per tier | The human, 2026-11-25, answer 45: "3 each, same for everyone (Recommended)" |
| 10 | Squares per line in the share text | The human, 2026-11-25, answer 46: "Wrap every 10 (Recommended)" |
| 390 × 844, 1280 × 720 | The sizes the screens are tested at | CLAUDE.md, Testing (`@visual`) |
| 20 s; 3, 5, 8 s; 10, 25, 50 points | Shown in the rules and How to play | Answers 10 and 11, read from the server (`private.clock_start_ms`, `clock_added_ms`, `clock_points`), never typed into the screen's code |

## Plan
Written as checks once approved, per sub-part.

## Removes
Nothing: the old game's screens go in 23f.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
