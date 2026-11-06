# M16 16b — Game 2's run model and content format

**Status:** done (PR #157, merged at the human's word, "merge", 2026-11-06). Design approved ("yes thats fine") with its security change ("Yes, approved"), reviewed by the `reviewer` agent, its four blocking findings fixed and re-checked; no code. The platform/game split (S13) is next, after 16a's build keeps proper spellings.

## Goal
Decide how a game-2 day is stored and how a player's run is recorded, so 16c (the picker) and 16d (play) have a fixed shape to build on.

## Who uses it / what breaks without it
- Used by: 16c's picker, which writes days in this format; 16d's routes and word check, which write runs in this model; later, scoring (S15) and the boards (16e), which read them.
- Breaks without it: nothing in game 2 can be stored. Today `run_event` holds only game 1's answer (`question_idx`, `entry_id`, `matched`) and format 3 holds only game 1's day (M16 ticket, "The platform/game boundary today").

## Source
- `docs/DECISIONS.md`, Hard to reverse: Persisted data, Puzzle content format, Run events, Day boundary; Game 1: Name and ID, Timer.
- `docs/milestones/M00-data-design.md` §5 (runs and events), §7 (append-only).
- `docs/milestones/M16-game-2-substrings.md`, Decisions S5–S7, S10, S16, S19.
- `docs/milestones/M16-16a-the-dictionary.md`: the dictionary, and H4 (its size in Postgres) moved here.
- The human's answers below. No SOURCES.md entry covers this game's rules; the human's answers are its source.

## The human's answers (2026-11-06)
Round 1:
1. A rejected word: "Keep trying (Recommended)". The player types again until a word is accepted or the 20 seconds run out.
2. What's kept: "Only accepted words".
3. Between rounds: "Tap Next (Recommended)". Each round's 20 seconds start on Next, as in game 1.
4. S16, the bonus letter: "One per day".

Round 2:
5. Game 1 keeps its missed answers (ROADMAP, Product), game 2 doesn't: "i mean that's because game 1's core loop is different conceptually. the database could have a real gap in an answer. for just a dictionary word list there probably won't be many".
6. A cap on tries: "just have a short lockout timer if it fails (user can still type during lockout just not submit)".
7. Rounds per day: "Always 7".

Round 3:
8. Who enforces the lockout: "Server enforces (Recommended)".
9. Its length: "should be small enougj to not feel like a mechanic of the game but long enough to prevent malicious intent", then "0.5 seconds" from Claude's reference points (0.5, 1, 2).
10. The game's permanent ID: "substrings (Recommended)".
11. A rebuilt dictionary and days already approved: "Always use the latest".

Round 4, after "yes thats fine" approved the design:
12. "if the word has hyphenation u can drop it when checking internallly but what is shown on screen should be the proper word".
13. A stripped form with several spellings (`its`, `it's`): "Theirs if it's real (Recommended)": the player's spelling if it's one of the dictionary's, else the dictionary's, the first alphabetically if there are several.
14. Accents: "Yes, same rule (Recommended)": typing "cafe" matches and shows "café".
15. The security change: "Yes, approved".

**What they settle:** one accepted word per round and no stored rejected words; a server-enforced 0.5 s lockout after each rejected try; Next between rounds; exactly 7 rounds; one bonus letter per day; `game_id` `substrings`; days are judged against whatever dictionary is loaded; matching drops case, accents and punctuation, and the screen shows the proper spelling.

## Proposed design (Claude, for approval)

### Content format
- `content/substrings/<YYYY-MM-DD>.json`, stored on approval in `private.puzzle`, which is already keyed by `game_id` and checks the file's own `game_id` and `date` against its key.
- Fields: `format: 1`, `game_id: "substrings"`, `date`, `rounds` (exactly 7 strings of lower-case letters, the day's substrings in order), `bonus_letter` (one lower-case letter). Approval adds `approved_at`, as for game 1.
- Format numbers count per game, so game 2 starts at 1 and the validator picks its checks by `game_id` (Claude's reading of the audit's open decision, "format numbers per game and approval dispatch"). Checked by hand-written TypeScript, with no schema library, as for format 3.
- Not in the format: S18's bands. They're the picker's rule (16c), not something a day stores.

### Run model
- **`private.run`, unchanged:** one per player per game per day, its date pinned at the start.
- **`private.question_open`, reused, with its own rule for game 2:** Next on rounds 2 to 7 writes its row, and round 1 starts with the run, as in game 1. One table to open a round, not two. Its trigger, `check_question_open`, counts game 1's `run_event` rows and reads `content -> 'questions'` (baseline migration), so as it stands it refuses every game-2 Next; it chooses its check by `game_id`, game 1's branch unchanged. **Game 2's rule:** round k+1 opens only once round k has a `round_word` row or its 20 seconds have passed, and never past round 7 (index 6), the bound game 1's check has as `answered >= questions`; a pgTAP test covers it. There's no skipping a running round: the human asked for Next between rounds, not a pass (answer 3), so none is added. (Review, 2026-11-06.)
- **New `private.round_word`:** (user, game, date, `round_idx` 0–6, `word_key`, `word`, `created_at`), append-only: `word_key` is `normalize`'s form and `word` the spelling shown (answers 12–14). Its primary key on (user, game, date, `round_idx`) allows one accepted word per round. A unique key on (user, game, date, `word_key`) enforces S10: no word twice in a run. Sending the same word again returns the stored result, and a different word for a round that already has one gets `409 already_answered`, as §5 does for game 1.
- **New `private.round_reject`:** (user, game, date, `round_idx`, `rejected_at`), append-only, with **no word** (answer 2). It exists only for the lockout: a try within 0.5 s of the round's latest rejection is refused as `locked` and not judged.
- **New `private.dictionary_word`:** (`word_key`, `spelling`), one row per proper spelling, keyed on both, loaded from 16a's snapshot. H4, its size in Postgres, gets measured here. **16a's build changes for this:** it keeps only `normalize`'s form today (`scripts/dictionary.ts`, `buildDictionary`), so it must also keep each source spelling (answer 12). Whether every source list carries apostrophes, hyphens and accents in its spellings is *unverified*: measured when the build changes.
- **The judge is the database**, as in game 1. One function takes the try as typed and its `normalize` form, both from the route: `normalize` is TypeScript, and game 1's SQL already takes the caller's normalized text, so there's one normalizer, not a second in SQL. The function first takes a row lock on the player's `run` row (`select … for update`), so tries in one run are judged one at a time and parallel requests can't all pass the lockout before any rejection is written (review, 2026-11-06; answers 8–9: "to prevent malicious intent"). Then, in order: a retry of the round's stored word returns it, and a different word for a filled round gets `409 already_answered`; the round is open and within its 20 seconds; not locked; case, accents and punctuation dropped (S19, answer 14); the stripped form is in the dictionary, it contains the round's substring, and it hasn't been used earlier in the run. A pass writes `round_word` with the spelling chosen by answer 13: the typed text lower-cased and trimmed, if it equals one of the form's `spelling` rows; otherwise the first of them in code-point order (SQL `collate "C"`, chosen in the database, so no second sort in TypeScript), so "It's" shows "it's" and the order never depends on a locale; a fail writes `round_reject` and gives the reason. The client never receives the word list.
- **How a run ends:** after round 7's word or round 7's timeout, shown by the run status view, `private.run_status`, which is built from `run_event` today and so gains game 2's branch from `round_word` and the round deadlines. A round that times out has no `round_word` row and scores nothing (S7). Leaving mid-round lets the clock run out; a reload resumes at the next Next, as in game 1.
- **Scoring is not stored here:** S15 is still open, and points are derived from `round_word` when 16e writes the ledger.

### What answer 11 means
A dictionary rebuild can change which words count on a day that's already approved, and can move a day's substring outside its S18 band. The human chose that over re-approving days (answer 11).

### Security change
Three new tables and `plor_app`'s grants: read and insert on `round_word` and `round_reject` (append-only, §7), read only on `dictionary_word`, which only the loader writes (narrower than the question put to the human). Approved, "Yes, approved", and recorded in DECISIONS.md's Log, 2026-11-06.

## Acceptance criteria
For the design, before any code:
- [x] The human approves the content format and the run model above, quoted here: "yes thats fine" (2026-11-06), with round 4's change.
- [x] The human approves the security change (the three tables and their grants), recorded in DECISIONS.md's Log: "Yes, approved" (2026-11-06).
- [x] DECISIONS.md's "Puzzle content format" and "Run events" rows gain game 2's entries, and "Game 1" gets a game-2 sibling section with its ID, timer, lockout, S10 and the spelling rule.
- [x] The `reviewer` agent has reviewed the design against this ticket and DECISIONS.md: four blocking findings, fixed (Review, below).

## Out of scope
- The platform/game split (S13): next, once this is approved, from a fresh boundary inventory (audit, M16).
- Scoring numbers (S15), the overall score (S17), the bands (S18), the shown name (S1).
- The picker (16c) and the play routes (16d).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| First alphabetically | The shown spelling when several fit | human, 2026-11-06: "Theirs if it's real (Recommended)" |
| 7 rounds | `rounds` length, `round_idx` 0–6 | human, 2026-10-22 (S5), fixed 2026-11-06: "Always 7" |
| 20 seconds per round | The round's deadline | human, 2026-10-22 (S6: "for now") |
| 0.5 s lockout after a rejected try | `locked` refusal | human, 2026-11-06: "0.5 seconds" |
| 1 bonus letter per day | `bonus_letter` | human, 2026-11-06: "One per day" (S16) |

## Plan
1. Done: the human approved the design and the security change.
2. Done: DECISIONS.md updated, reviewed, blocking findings fixed.
3. The split's guided questions, from a fresh grep of the boundary.

## Removes
Nothing: this is a design with no code, so there's nothing to delete yet.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| ROADMAP, Product: missed answers are kept so they can be analyzed later | Game 2 keeps no rejected words | The human, 2026-11-06, answer 5 |

## Evidence

## Review
- Blocking findings and how each was fixed (the `reviewer` agent, 2026-11-06):
  1. `question_open`'s trigger refuses every game-2 Next and the design gave no opening rule: game 2's rule stated (a word or the 20 seconds, no skipping), the trigger chooses its check by `game_id`, and `run_status` gains game 2's branch.
  2. Parallel tries could all pass the lockout: the judge takes a row lock on the `run` row first.
  3. The shown spelling left case, order and inputs open: lower-cased comparison, code-point order (`collate "C"`), and the judge takes the typed text and its `normalize` form from the route.
  4. Stale status lines: HANDOFF, ROADMAP and the M16 Status line brought up to date.
- Deferred to ROADMAP "Next revision": the six items under "For M16" marked "Found in M16 16b (review)".
