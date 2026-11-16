# M15 15h — A taken letter takes the answer, whatever name is typed

**Status:** done (PR #225, merged 2026-11-16 on nine green checks, by the human's "Merge when green"; merge commit `a8cc6c0`). Published with the merge: the rule is the game's on plor.app from that deployment on. Not verified: the line on plor.app. Drafted 2026-11-15 from the human's answers below; **approved by the human (2026-11-15: "Approve 15h")**, asked as "Approve 15h with the proposed line for players?", so the line under Design is confirmed; "Start 15h" the same night. Built and reviewed on `m15g-answer-pool` (the branch 15g was built on, the human's exception to "one branch per milestone"; deleted after this ticket's last pull request). No migration.

## Goal
In Offbeat, an answer whose shown name holds a taken letter can't be given under any other name: with I taken, "nyc" no longer counts for New York City.

## Who uses it / what breaks without it
- **Used by:** every Offbeat player; the human, who reads a question's answer pool on the admin pages (15g) by this rule.
- **Breaks without it:** the game checks only the typed text for a taken letter (`src/game/runs.ts:252-253`), then accepts an exact alias (`src/game/matching.ts:115-116`), so a nickname, abbreviation or other name gets past the letter. The human expected otherwise (2026-11-15: "an alias, for example, NYC, wouldn't work for New York City if the letter I is taken"). Host answers already follow the name (DECISIONS, Log, 2026-10-21), so players and the host play by different rules, and 15g's panel would mark as blocked answers a player can still give.

## Source
- `docs/milestones/M04-game-mechanics.md`: G11 (a taken letter's key does nothing), G12 (a typo never lands on a name needing a taken letter), and the matching order in its rules (lines 45-55). *Its wording of who takes the letters is out of date; the app's copy is the source for words.*
- DECISIONS.md, Log, 2026-10-21: "the server refuses typed text with a stolen letter (400 `stolen_letter`)"; "A host answer's **name** must avoid every letter stolen at or before its question; an alias that avoids them no longer counts".
- `docs/milestones/M13-13a-the-base.md`, "Resolving a typed answer" and "One alias, several members" (lines 111-122): exact first, then one typo, "an alias with a stolen letter doesn't count"; a shared alias is one answer. *(The draft of this ticket cited SOURCES.md for these rules; they are in the M13 13a ticket. SOURCES.md has no section on matching.)*
- The app's copy as built: `src/app/game.tsx:719` ("{letter} is taken. Try a word without it."), `:724` ("isn't in our list. Try another answer."), `src/app/messages.ts:68`.

## Answers (human, 2026-11-15)
1. Whether the game should refuse an alias when the answer's name has a taken letter: "Yes, draft a ticket".
2. Which typed answers are refused: "Shown name must be clean": if the answer's shown name has a taken letter, nothing reaches it. Told the cost: with G taken, "aubergine" is refused because the entry is shown as "Eggplant".
3. What the player sees: "we not using the wind anymore ur hallucinating but yes say like the host took the letter or something equivalent".
4. The beta's 28 drafted days, checked under today's rule (at least 3 familiar answers typeable through any accepted name): "its fine for the beta so just leave the questions as they are".

## Design (as built)
- **The rule, in one place:** `resolveTyped` (`src/game/matching.ts`) keeps only the candidates whose thing's shown name avoids every taken letter (`avoids`, `src/content/puzzle.ts`, the function the host rule uses). It serves a signed-in run, a guest's and an admin's test run alike. The typo step, which checked the matched alias, checks the shown name too.
- **Three outcomes:** an answer; null ("not in our list", a miss, as before); or `{ needs: <letter> }` when the text is exactly a name of answers that all need a taken letter. The letter is the first taken letter in the shown name of the answer it would have been.
- **A name several things share** ("robin"): the ones with a clean shown name still count; the text is refused only when none is clean.
- **Refused this way, the text is not a miss:** nothing is logged for learning from misses, a test run reports nothing to the audit, and the reply is a free retry on the same question, the clock running on, as "not in our list" is.
- **The reply** adds `needs` beside `notInList: true` (`POST /api/run/answer`, `/api/guest/run/answer`, `/api/admin/test`). **No protocol change:** a browser still running the page from before reads it as "isn't in our list", which is a retry too.
- **What the player sees** (confirmed with the ticket's approval): "That answer needs C, which is taken. Try another answer." (`src/app/game.tsx`, in the "isn't in our list" line's place).
- **The shown name** comes from `private.thing_names`, which `plor_app` may already run (`thingNames`, `src/game/payload.ts`), read only when a letter is taken and the text named something. No migration, no new grant.
- **Not changed:** the host rule; the 28 drafted days and their letters (answer 4); approval's and the draft tool's count of familiar answers, which still counts any accepted name (Open questions, 2).

## Open questions (for the human, before building)
1. **Answer 4 read two ways; answered.** (a) The rule changes now and the drafted days stay as they are, even where fewer than 3 familiar answers are left by name. (b) The game stays as it is for the beta, and this ticket is built after it. The human, 2026-11-15, asked "Should the rule change go in now with the 28 days left alone, or wait until after the beta?": "Now, keep the days". So (a).
2. **Approval's familiar-answer minimum** still counts an answer as typeable through any accepted name (`supabase/migrations/20261030054018_test_runs.sql:134-137`; `scripts/draft.ts:277-290`). Under this rule it should count by shown name, or a day can pass approval with fewer answers than it claims. Moving it may refuse days already drafted, which answer 4 says to leave: so it is out of this ticket and recorded for the first batch drafted after the beta's 28, unless the human says otherwise.
3. **How many answers this takes away** on the 28 drafted days is *not measured*; the human chose to leave the days as they are (answer 4).

## Acceptance criteria
- [x] A test written first and failing on today's code: with a letter taken, typed text that is a clean alias of a thing whose shown name holds the letter resolves to no answer; the same text resolves with no letter taken (`npm run test:db -- -t "taken letter follows the name"`; Evidence for the first run's failure).
- [x] A shared alias resolves to the thing with the clean name when one has it, and to no answer when none does (same tests).
- [x] A typo never lands on a thing whose shown name holds a taken letter (same tests; G12's existing db test still passes. The ticket said "unit test": G12's test is a database test, `src/game/matching.db.test.ts`).
- [x] The answer route replies with `needs`, not a plain "not in our list", and no row is added to the miss log (`src/game/runs.db.test.ts`: the miss count stays 1 after "Gaul").
- [x] A guest's run and a test run behave the same (`src/game/guest-runs.plor-app.db.test.ts`, as `plor_app`; `src/app/api/admin/test/route.db.test.ts`, which also shows nothing reported to the audit).
- [x] The play screen shows the confirmed words under the box (`e2e/approve-and-play.e2e.ts`; passed locally and on CI, #225's e2e: "195 passed", the one flaky test `feel.e2e.ts:51`, not this file).
- [x] DECISIONS.md's Log has the rule's row; DESIGN.md has the new line; `how-to-play.tsx` is unchanged ("On questions … a letter is taken. Answer without it." still holds: read at `src/app/how-to-play.tsx:25`).

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
The typo step's alias-only check stays and gains the name check after it, so nothing is removed there (the ticket expected to replace it: an alias with a taken letter still can't be the typed text's target, M13 13a). Nothing else.

## Source diff
| Source says | We built | Why different |
|---|---|---|
| M13 13a, "Resolving a typed answer": the candidates are the things with that alias in the category | Of those, only the things whose shown name avoids every taken letter | The human, 2026-11-15: "Shown name must be clean" |
| M13 13a: "an alias with a stolen letter doesn't count" (the typo step) | That, and the thing's shown name must avoid the letters too | The same rule, for a typo |
| M04 G11/13c-3: text that names nothing is "not in our list", logged as a miss | Text naming only answers a taken letter took says the letter and is no miss | It named a real answer; learning from misses would otherwise count it (Design) |
| The ticket: "the answer route replies with the new refusal, not `notInList`" | `notInList: true` with `needs` beside it | A page loaded before the change still shows a retry; no protocol bump |

## Evidence
- **Failing first** (`npm run test:db -- -t "taken letter follows the name"`, before the rule): the run could not start, Docker Desktop having been shut down on this PC ("failed to connect to the docker API"); it was started again and the local stack with it. **So the three tests' failure on the old code was not seen in output.** What stands in for it: on the old code `resolveTyped` took five arguments and returned the thing for "ursus maritimus" whatever letters were given (its only letter check was the typo step's), so each `{ needs }` and null expectation would have failed; read, not run.
- **After the rule:** `npm run test:db` (whole suite): `Test Files 65 passed (65)`, `Tests 511 passed (511)`. `npm test`: `Test Files 70 passed (70)`, `Tests 814 passed (814)`. `npx tsc --noEmit -p .` and `npx eslint` on the changed folders: no output.
- **e2e, locally** (`npm run test:e2e -- e2e/approve-and-play.e2e.ts`): `3 passed (52.2s)`, the player's run now typing "gaul" at question 4 and reading "That answer needs C, which is taken. Try another answer."
- **A fault of 15g's found and fixed here:** 15g's pool test signed in as "ap", the name the player test after it in the same file uses, so that test failed on its first try and passed only on CI's retry (#224's e2e: "2 flaky"); locally it failed outright (15g's Evidence called it unexplained). The pool test's player is now "apo".
- **The fixture** gained one name, "Gaul" on France (`src/test/answer-fixture.ts`), the only fixture answer with a clean second name under a shown name that holds a taken letter.
- **Not verified:** the line on plor.app; a phone; how many answers the rule takes from the 28 drafted days (answer 4).

## Review
- The `reviewer` agent (a fresh context, 2026-11-16) read the whole diff against this ticket and ran `npx tsc --noEmit -p .` (clean); it ran no db or e2e test.
- Blocking findings and how each was fixed: none. It checked the non-null reads (`private.thing_names` returns the ID it was given, so a merged thing still has its name), that nothing changes with no letter taken, and that `needs` reaches only the question in play.
- Deferred to ROADMAP "Next revision" (For M15), five. Two are consequences of the rule, for the human to know: **a name two things share can now dodge the host** (a name of a caught answer whose shown name holds a taken letter and of an uncaught one whose name is clean was caught before, and is now the clean one alone, safe); and **the shown name is read as it is now**, while aliases are read as of the day's approval, so renaming a thing in the base mid-day could change what a started day accepts. Three are small: DESIGN.md's new cite is `game.tsx:730-740` for lines 733-739; the DECISIONS row is dated 2026-11-16 beside answers of 2026-11-15 (the build ran past midnight UTC, not Pacific); a comment in `src/game/runs.db.test.ts` now sits above the "Gaul" block instead of the line it describes.
