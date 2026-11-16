# M15 15h — A taken letter takes the answer, whatever name is typed

**Status:** planned. Drafted 2026-11-15 from the human's answers below; **approved by the human (2026-11-15: "Approve 15h")**, asked as "Approve 15h with the proposed line for players?", so the line under Design is confirmed. Not started: it waits for 15f-2's pull request (#220) to merge, and is built after 15g. Uncommitted in `C:/Users/jason/RIFF` on `main`, beside 15g's ticket, for the same reason (the M15 checkout holds another session's unfinished 15f-2).

## Goal
In Offbeat, an answer whose shown name holds a taken letter can't be given under any other name: with I taken, "nyc" no longer counts for New York City.

## Who uses it / what breaks without it
- **Used by:** every Offbeat player; the human, who reads a question's answer pool on the admin pages (15g) by this rule.
- **Breaks without it:** the game checks only the typed text for a taken letter (`src/game/runs.ts:252-253`), then accepts an exact alias (`src/game/matching.ts:115-116`), so a nickname, abbreviation or other name gets past the letter. The human expected otherwise (2026-11-15: "an alias, for example, NYC, wouldn't work for New York City if the letter I is taken"). Host answers already follow the name (DECISIONS, Log, 2026-10-21), so players and the host play by different rules, and 15g's panel would mark as blocked answers a player can still give.

## Source
- `docs/milestones/M04-game-mechanics.md`: G11 (a taken letter's key does nothing), G12 (a typo never lands on a name needing a taken letter), and the matching order in its rules (lines 45-55). *Its wording of who takes the letters is out of date; the app's copy is the source for words.*
- DECISIONS.md, Log, 2026-10-21: "the server refuses typed text with a stolen letter (400 `stolen_letter`)"; "A host answer's **name** must avoid every letter stolen at or before its question; an alias that avoids them no longer counts".
- SOURCES.md, the matching rules ("Exact: the normalized text is looked up by the alias index…", "One alias, several members"). *To read in full before building.*
- The app's copy as built: `src/app/game.tsx:719` ("{letter} is taken. Try a word without it."), `:724` ("isn't in our list. Try another answer."), `src/app/messages.ts:68`.

## Answers (human, 2026-11-15)
1. Whether the game should refuse an alias when the answer's name has a taken letter: "Yes, draft a ticket".
2. Which typed answers are refused: "Shown name must be clean": if the answer's shown name has a taken letter, nothing reaches it. Told the cost: with G taken, "aubergine" is refused because the entry is shown as "Eggplant".
3. What the player sees: "we not using the wind anymore ur hallucinating but yes say like the host took the letter or something equivalent".
4. The beta's 28 drafted days, checked under today's rule (at least 3 familiar answers typeable through any accepted name): "its fine for the beta so just leave the questions as they are".

## Design (proposed)
- **The rule, in one place:** `resolveTyped` (`src/game/matching.ts`) keeps only the candidates whose thing's shown name avoids every taken letter (`avoids`, `src/content/puzzle.ts`, the function the host rule uses). It serves a signed-in run, a guest's and an admin's test run alike. The typo step, which today checks the matched alias, checks the shown name too.
- **A name several things share** ("robin"): the ones with a clean shown name still count; the answer is refused only when none is clean.
- **Refused this way, the text is not a miss:** it isn't logged for learning from misses (it named a real answer), and the timer treats it as it treats "not in our list" today.
- **What the player sees,** in the app's present voice, confirmed with the ticket's approval: "That answer needs {LETTER}, which is taken. Try another answer."
- **The shown name** comes from `private.thing_names`, which `plor_app` may already run. No new grant; whether a migration is needed (a name column from `private.resolve_in`) or the route reads names beside the lookup is decided at build, the cheaper first.
- **Not changed:** the host rule; the 28 drafted days and their letters (answer 4); approval's and the draft tool's count of familiar answers, which still counts any accepted name (Open questions, 2).

## Open questions (for the human, before building)
1. **Answer 4 read two ways; answered.** (a) The rule changes now and the drafted days stay as they are, even where fewer than 3 familiar answers are left by name. (b) The game stays as it is for the beta, and this ticket is built after it. The human, 2026-11-15, asked "Should the rule change go in now with the 28 days left alone, or wait until after the beta?": "Now, keep the days". So (a).
2. **Approval's familiar-answer minimum** still counts an answer as typeable through any accepted name (`supabase/migrations/20261030054018_test_runs.sql:134-137`; `scripts/draft.ts:277-290`). Under this rule it should count by shown name, or a day can pass approval with fewer answers than it claims. Moving it may refuse days already drafted, which answer 4 says to leave: so it is out of this ticket and recorded for the first batch drafted after the beta's 28, unless the human says otherwise.
3. **How many answers this takes away** on the 28 drafted days is *not measured*. A read-only count on the local base (per question: familiar answers left by name) can be run before building if wanted.

## Acceptance criteria
- [ ] A test written first and failing on today's code: with a letter taken, typed text that is a clean alias of a thing whose shown name holds the letter resolves to nothing; the same text resolves with no letter taken (`npm run test:db -- -t "taken letter follows the name"`).
- [ ] A shared alias resolves to the thing with the clean name when one has it, and to nothing when none does (same suite).
- [ ] A typo never lands on a thing whose shown name holds a taken letter (the existing G12 unit test, extended).
- [ ] The answer route replies with the new refusal, not `notInList`, and no row is added to the miss log (`npm run test:db`, the run tests).
- [ ] The play screen shows the confirmed words under the box (e2e, CI's result); a guest's run and a test run behave the same (their db tests).
- [ ] DECISIONS.md's Log has the rule's row; DESIGN.md has the new line; `how-to-play.tsx` is unchanged ("Answer without it" still holds: read, not assumed, at build).

## Out of scope
- Redrafting or re-lettering any of the beta's 28 days (answer 4).
- Approval's and the draft tool's familiar-answer count (Open questions, 2).
- The "real names count on their own letters" rule (not chosen in answer 2).
- Fragments.

## Numbers
None. The rule adds no threshold.

## Plan
1. Open question 1 answered → verify: the answer is quoted here.
2. Read SOURCES.md's matching rules in full → verify: the sections are named under Source.
3. The failing tests → verify: `npm run test:db -- -t "taken letter follows the name"` fails for the stated reason.
4. The rule in `resolveTyped`, the route's reply, the client's line → verify: the same command passes; the G12 unit test passes; `npx tsc --noEmit -p .`.
5. DECISIONS, DESIGN, the e2e → verify: CI's e2e result.
6. The reviewer; ticket Status, ROADMAP row and handoff in the same PR.

**Before its merge, said to the human:** every merge to `main` is published, so the rule reaches plor.app's players with the merge, on whatever day is live.

## Removes
The alias-only check in the typo step (`src/game/matching.ts:118`) is replaced by the name check. Nothing else.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
