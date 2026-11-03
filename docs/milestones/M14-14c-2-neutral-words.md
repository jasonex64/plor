# M14 14c-2 — Neutral words: the host again, no Wind

**Status:** approved (human, 2026-11-02: "Approve, build it", to "Build 14c-2 (neutral words) as drafted?"), built, reviewed (three blocking items fixed), in review (PR #154). It was drafted from three rounds of guided questions (2026-11-02, Pacific). It replaces the earlier 14c-2 draft, "The game's world", which the human set aside: "we're starting over".

## Goal
The game speaks in plain words again, those it had before 14c-1, and nothing in the code or the forward-looking docs names the Wind or the climb. The human can then design the game from scratch in another session without being steered.

## Who uses it / what breaks without it
- **Used by:**
  - every player, on the game's screens and the share line;
  - the admin, on the puzzle pages;
  - the next design session, which reads the code and the docs.
- **Breaks without it:**
  - **The game describes a world that's been dropped:** "Don't match the Wind", "tipped over at stop 3", "Yesterday on the ridge".
  - **The next design session would start from it.** That's what the human wants to avoid: "delete everything related to the wind, and any flavor and any sort of mention of how the game will be designed. revert back to \"host\" and neutral wording, then i will go ahead and start another instance and start designing from scratch".

## What the human decided (2026-11-02, on the Windows PC, quoted)
Round 1:

1. The 2026-10-29 answers: "we're starting over. just delete everything related to the wind, and any flavor and any sort of mention of how the game will be designed. revert back to \"host\" and neutral wording, then i will go ahead and start another instance and start designing from scratch".
2. The name: "A plain working name" (refined in round 2, answer 6).
3. The words: "The pre-14c-1 words (Recommended)" ("\"question 3\", \"Safe!\", \"caught on question 3 by 'cat'\", \"time's up on question 4\", \"survived\", \"You survived all 7!\", \"the host said\", \"Yesterday's answers\", and How to play in those words. Known, tested wording; one tier, no escalation.").
4. The docs: "Forward-looking docs only (Recommended)" ("Delete 14c-2's draft and the world notes in M14's ticket, ROADMAP and HANDOFF; merged tickets like 14c-1 keep their history with a one-line note that it was reverted. Nothing the next design reads points at the Wind; git history stays honest.").
5. Who: "This session, own PR (Recommended)".

Round 2:

6. The name: "we dont need to change it as long as calude isnt influenced by it when desingin from scratch". So "Updraft" and `/updraft` stay, as a working name the docs say carries no theme.
7. Stolen letters: "No one takes them (Recommended)" ("\"Letters taken: E\", \"Next question: E is taken\", \"One of those letters is taken. Try another answer.\" Fully neutral; nothing to rename when your design names a character.").
8. The reach: "All current code and pages (Recommended)" ("Player screens, admin pages, comments and tests in src/ and e2e/. Applied migrations and the content bank's history stay untouched.").
9. The banner: "Keep the navy, plain comment (Recommended)".

Round 3:

10. The share line: "Exactly as before 14c-1 (Recommended)" ("🟩 for each question got past, ⬜ for the rest.").
11. The two claude.ai pages ("Updraft Pixel Fonts", "Updraft Play Screen"): "Unlink, keep them (Recommended)". The repo stops pointing at them; deleting them stays the human's to do.

## Source
- **The words before 14c-1:** the code at `a504b56^1`, the commit before 14c-1's merge. Its words table (`docs/milestones/M14-14c-1-name-and-words.md`, "The words", column "Today") lists them. This is the source for every reverted line, How to play and the home page's introduction included.
- **The share line:** M05 S1 as built before 14c-1 (`src/game/share.ts` at `a504b56^1`): 🟩 per question survived, ⬜ for the rest, then `n/7`.
- **The stolen letters' words:** answer 7.
- **Kept, not changed:**
  - the name record (`src/platform/game.ts`, 14b-4): "Updraft", `/updraft`, ID `offbeat` (answer 6);
  - the game's mechanics (M04): 7 questions, 20 seconds, stolen letters on 2, 4, 5 and 7, the rarity bonus.

## Acceptance criteria
- [ ] **No Wind or climb in the code:** in `src/` and `e2e/`, a case-insensitive search for each of these finds nothing:
  - `wind` (not `window`), `ridge`, `stop` as the game's unit (`stop N`, `stops`, "Stop in play"; not `stopPropagation` and the like);
  - `climb`, `steady`, `holding on`, `still standing`;
  - `tipped`, `tumbled`, `sent flying`, `dozed`, `stalled`, `frozen`;
  - `whisper`, `snatch`, `💨`, `❄️`.

  Applied migrations and `content/` are left as they are (answer 8). The command and its output go in Evidence.
- [ ] **The pre-14c-1 words (answer 3):** each line in 14c-1's words table reads as its "Today" column again: the reveal, the result, timeouts, Me, the game's card, the calendar, the board, yesterday's card, the API error messages. The tier function (`src/game/words.ts`) is gone.
- [ ] **How to play and the home page's introduction:** the pre-14c-1 text, with the stolen letters in answer 7's words.
- [ ] **Stolen letters (answer 7):**
  - the answer box's line reads "Letters taken: E";
  - the reveal reads "Next question: E is taken";
  - the refusal reads "One of those letters is taken. Try another answer.";
  - the admin's puzzle page gives the reason without the Wind.
- [ ] **The share line (answer 10):** `Updraft · Nov 2`, then 🟩 for each question survived and ⬜ for the rest, then `3/7`.
- [ ] **Unchanged (answers 6 and 9):** the name, the address, the navy banner, the mechanics. Only the navy's comment changes.
- [ ] **Docs (answers 4 and 11):**
  - deleted: the old 14c-2 draft (`docs/milestones/M14-14c-2-the-game-world.md`), and the world notes in `docs/milestones/M14-look-and-feel.md`, ROADMAP's Product section and M14 row, HANDOFF, DECISIONS.md's standing rows and DESIGN.md;
  - 14c-1's ticket gets a one-line note that its words were reverted here;
  - the two claude.ai pages' links are gone;
  - HANDOFF says "Updraft" is a working name that carries no theme for the design.
- [ ] **Checks:**
  - the unit and e2e tests these touch pass, updated to the plain words;
  - types and lint clean;
  - the `reviewer` agent has reviewed the diff.

## Out of scope
- **The game's new design:** the human's next session, from scratch.
- **The name and the address:** kept (answer 6).
- **Merged tickets' history:** kept, with 14c-1's one-line note (answer 4).
- **Applied migrations and the content bank:** answer 8.
- **The two claude.ai pages:** the human deletes them if they want (answer 11).

## Numbers
None. The revert removes the tier bands (stops 1–2, 3–5, 6–7, 14c-1's) and adds no value.

## Plan
1. **Red first:**
   - `src/game/share.test.ts` expects the pre-14c-1 line;
   - the e2e checks that read the words (`offbeat`, `today`, `player-screens`, `me`, `live-board`, `shell`, `settings`, `groups`, `approve-and-play` and those added since) expect the plain words.
   - **Expected:** each fails on today's climb words. **What would prove it wrong:** a check that passes, meaning it doesn't read the words.
2. **The code:** take each line back to its `a504b56^1` text. Words added after 14c-1 (14b-*) take the same plain words:
   - "Stop in play" becomes "Question in play";
   - "Yesterday on the ridge" becomes "Yesterday's answers";
   - "the Wind's answers" becomes "the host's answers".

   `src/game/words.ts` goes; its callers use the plain lines.
3. **Stolen letters:** answer 7's three lines.
4. **Comments and tests:** "the Wind" becomes "the host" where it means the host's answers, and "a stolen letter" or "a taken letter" where it means the mechanic.
5. **Docs:** answers 4 and 11.
6. **Then:** the whole e2e suite, the `reviewer` agent, and the PR.

## Removes
- `src/game/words.ts` and `words.test.ts` (the tiers).
- The climb's words everywhere in `src/` and `e2e/`.
- The share's 🟪, 💨 and ❄️.
- The old 14c-2 draft ticket.
- The world notes in the forward-looking docs.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The words at `a504b56^1` | Those words, line for line, where they don't name the Wind | — |
| `a504b56^1` already named the Wind in places, from M13 13c-3 and 14a: the banner's "Don't match the Wind", the rules line's "Give an answer the Wind didn't think of", How to play's ridge and Wind, yesterday's card's "The Wind:" and "Finish it to see the Wind's answers", the admin page's "the Wind steals" | "Don't match the host", "Give an answer the host didn't pick" (the home page's own words), "The host:", "the host's answers". How to play keeps each paragraph's rule, told with the host: "The host has already picked a few answers to every question. Say one of them and your run ends."; "7 questions, one run. You get 20 seconds for each."; "If the host didn't pick it, you're safe"; "On questions 2, 4, 5 and 7 a letter is taken"; "Each question is worth more than the last: 25 points for the first, 350 for the last. Run out of time and the run ends too." | Answer 1 ("revert back to \"host\" and neutral wording") and criterion 1 win where the old text names the Wind |
| `a504b56^1`'s "full climbs" (Me, 14a-3a) and "Start climbing" (How to play, 14a-2c) | "full runs" (the API field `fullClimbs` is `fullRuns`, the query's `full_climbs` is `full_runs`) and "Start playing" | The same: criterion 1 names `climb`. No caller outside the app reads the field |
| The answer box's line "Letters taken: E" (answer 7) | "Letters taken" as the label above the struck letter tiles, as the question card lays them out since 14b-8b | The card shows the letters as tiles under a label, so the colon has no line to sit on; the words are answer 7's |
| The reveal's "Next question: E is taken" (answer 7) | "Next question: E is taken." | A sentence in its own paragraph, as the reveal's other lines |
| The admin's reason "without the Wind" (criterion 4 gives no words) | "“cherry” has the C taken at this question: pick another host answer." and "Dashed ones have a letter taken by then" | Answer 7's "taken", in the admin page's sentence |
| The blocked-key note ("The Wind took E") had no answer of its own | "E is taken. Try a word without it." | Answer 7's "taken" |
| Comments naming 14c's coming look ("until 14c's pixel world", "until 14c's art", "the game's own look comes with 14c", "the ridge's navy") | Removed; the navy's comment says "a navy with white text" (answer 9) | Answer 1: "any sort of mention of how the game will be designed" |
| Answer 4: the world notes out of the forward-looking docs | Out of HANDOFF, ROADMAP (the Product section, the M04 and M14 rows), the M14 ticket, DECISIONS.md's two standing rows and DESIGN.md. Kept: DECISIONS.md's Log rows of 2026-10-21 and 2026-10-25 (dated history), and the M14 ticket's L26, which quotes the streak's candidates ("a ridge flag") | Answer 4 keeps history; L26 records the streak's decision, not the game's |
| The 14b-* words made after 14c-1 | "Question in play", "Yesterday's answers", "the host's answers"; an e2e comment's "Bear, first stop." is "Bear, first question." | The plan's step 2 |

## Evidence
All on the Windows PC's local stack, 2026-11-02 (Pacific).

**Criterion 1, the search** (with "reached the top" and "at the bottom," added after the review found two lines it missed):
```
grep -rniE "wind([^o]|$)|ridge|stops?|stop [0-9N]|climb|steady|holding on|still standing|tipped|tumbled|sent flying|dozed|stalled|frozen|whisper|snatch|💨|❄️|🟪|reached the top|at the bottom," src e2e | grep -vE "stopPropagation|ldnoobw"
```
19 lines, each the verb "stop" (an invite link that "stops working", a paragraph that "stops at 55ch", the clock bar that "stops short of" the column, Privacy's "to stop anyone guessing", bank.ts's quote of "Stop and ask") or the settings sheet's place "at the bottom" on phones. None is the game's unit or the world. `ldnoobw-en.ts` is the word blocklist, whose "snatch" isn't game wording.

**Red first:**
- `npx vitest run src/game/share.test.ts` with the pre-14c-1 test on 14c-1's code: 3 failed, 2 passed (`expected 'Updraft · Oct 21
💨⬜⬜⬜⬜⬜⬜ 0/7' to be 'Updraft · Oct 21
⬜⬜⬜⬜⬜⬜⬜ 0/7'`). The two that passed don't tell the symbols apart: the all-🟩 run (bonus 0 is 14c-1's 🟩 too) and the no-spoilers check.
- `npx playwright test e2e/today.e2e.ts e2e/offbeat.e2e.ts` with the plain-word tests on 14c-1's code: 4 failed, 4 passed, e.g. `Expected substring: "7 questions · 20 seconds each. Give an answer the host didn't pick. …" Received string: "…7 stops · 20 seconds each. Give an answer the Wind didn't think of. …"`.

**Green:**
- `npx vitest run src/game/share.test.ts`: 5 passed. `src/game/share.ts` and its test equal `a504b56^1`'s (`git diff a504b56^1 -- src/game/share.ts src/game/share.test.ts` is empty, the reviewer's check).
- `npx vitest run --exclude "**/*.db.test.ts"`: 48 files, 500 passed. `npx tsc --noEmit -p .` and `npx eslint src e2e`: clean.
- `npm run test:db`: 297 passed, 1 failed: `src/app/api/me/route.db.test.ts`, "gives P's 3 rarest answers…", `share` 0.857 for 1 on T-1 (2026-11-02).
- `npx playwright test` (the whole suite): 142 passed, 6 failed (19.8 min). Then:
  - `approve-and-play.e2e.ts:92` and `offbeat.e2e.ts:60` still expected "You reached the top!" and "at the bottom … at the top" (the review's two blocking items); fixed, both passed on the rerun (`npx playwright test e2e/approve-and-play.e2e.ts e2e/today.e2e.ts:102`: 3 passed, and `--last-failed`).
  - `today.e2e.ts:72` (the board's date chip) and `today.e2e.ts:102` (a 30 s timeout) passed on the rerun; both are known load flakes in ROADMAP.
  - `me.e2e.ts:109` ("20% gave this", got 17%) and `offbeat.e2e.ts:97` (yesterday's answer search) still fail locally.
- **The three failures on 2 Nov aren't this change's.** Hypothesis: the local stack's 2026-11-02 holds the phone test's leftover day (HANDOFF already says so), so yesterday isn't the tests' own. Checked: `private.puzzle` has a fixture day on 2026-11-02 that `offbeat.e2e.ts` didn't add, with one run by a gmail.com account and one answer; one extra answer makes 1 of 5 into 1 of 6 (17%) and the db test's 6 of 6 into 6 of 7 (0.857). None of these tests reads a word this change touched (`me/route.db.test.ts` only renames `fullClimbs`). Proof waits on CI's fresh database; the local day is the human's test account's, so it isn't deleted without their word.

## Review
The `reviewer` agent (medium effort), on the uncommitted diff.
- Blocking findings and how each was fixed:
  - `e2e/approve-and-play.e2e.ts` still expected "You reached the top!": now "You survived all 7!", as at `a504b56^1`.
  - `e2e/offbeat.e2e.ts` still expected How to play's "at the bottom … at the top": now "for the first … for the last". The Evidence search gained "reached the top" and "at the bottom,".
  - The Evidence was empty: filled in above.
- Also fixed, as climb wording this ticket's goal rules out or a slip of this change: `board.tsx`'s chip comment ("safe at the top"), `settings.e2e.ts`'s "Caught on the question 1", and the question card comment's width.
- Deferred to ROADMAP "Next revision": the share's placeholder symbols are open again for the game's design; DESIGN.md's `offbeat.tsx:214` citation, one line off since before this change.
