# M16 16b — Game 2's run model and content format

**Status:** planned. Design proposed 2026-11-06 for the human's approval; no code. Both parts are "Hard to reverse" (DECISIONS.md), so they're decided and reviewed before the first code that depends on them. The platform/game split (S13) follows once this is approved.

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

**What they settle:** one accepted word per round and no stored rejected words; a server-enforced 0.5 s lockout after each rejected try; Next between rounds; exactly 7 rounds; one bonus letter per day; `game_id` `substrings`; days are judged against whatever dictionary is loaded.

## Proposed design (Claude, for approval)

### Content format
- `content/substrings/<YYYY-MM-DD>.json`, stored on approval in `private.puzzle`, which is already keyed by `game_id` and checks the file's own `game_id` and `date` against its key.
- Fields: `format: 1`, `game_id: "substrings"`, `date`, `rounds` (exactly 7 strings of lower-case letters, the day's substrings in order), `bonus_letter` (one lower-case letter). Approval adds `approved_at`, as for game 1.
- Format numbers count per game, so game 2 starts at 1 and the validator picks its checks by `game_id` (Claude's reading of the audit's open decision, "format numbers per game and approval dispatch"). Checked by hand-written TypeScript, with no schema library, as for format 3.
- Not in the format: S18's bands. They're the picker's rule (16c), not something a day stores.

### Run model
- **`private.run`, unchanged:** one per player per game per day, its date pinned at the start.
- **`private.question_open`, reused:** Next on rounds 2 to 7 writes its row, and round 1 starts with the run, as in game 1. One way to open a round, not two.
- **New `private.round_word`:** (user, game, date, `round_idx` 0–6, `word`, `created_at`), append-only. Its primary key on (user, game, date, `round_idx`) allows one accepted word per round. A unique key on (user, game, date, `word`) enforces S10: no word twice in a run. Sending the same word again returns the stored result, and a different word for a round that already has one gets `409 already_answered`, as §5 does for game 1.
- **New `private.round_reject`:** (user, game, date, `round_idx`, `rejected_at`), append-only, with **no word** (answer 2). It exists only for the lockout: a try within 0.5 s of the round's latest rejection is refused as `locked` and not judged.
- **New `private.dictionary_word`:** one row per word, loaded from 16a's snapshot. H4, its size in Postgres, gets measured here.
- **The judge is the database**, as in game 1. One function checks a try in order: the round is open and within its 20 seconds, not locked, punctuation dropped (S19), the word is in the dictionary, it contains the round's substring, and it hasn't been used earlier in the run. A pass writes `round_word`; a fail writes `round_reject` and gives the reason. The client never receives the word list.
- **How a run ends:** after round 7's word or round 7's timeout. A round that times out has no `round_word` row and scores nothing (S7). Leaving mid-round lets the clock run out; a reload resumes at the next Next, as in game 1.
- **Scoring is not stored here:** S15 is still open, and points are derived from `round_word` when 16e writes the ledger.

### What answer 11 means
A dictionary rebuild can change which words count on a day that's already approved, and can move a day's substring outside its S18 band. The human chose that over re-approving days (answer 11).

### Security change
Three new tables and `plor_app`'s grants on them (read and insert only, append-only as §7 says) change grants. Per CLAUDE.md, Security, that needs the human's approval and a DECISIONS.md Log entry before any migration is written.

## Acceptance criteria
For the design, before any code:
- [ ] The human approves the content format and the run model above, quoted here.
- [ ] The human approves the security change (the three tables and their grants), recorded in DECISIONS.md's Log.
- [ ] DECISIONS.md's "Puzzle content format" and "Run events" rows gain game 2's entries, and "Game 1" gets a game-2 sibling section with its ID, timer, lockout and S10.
- [ ] The `reviewer` agent has reviewed the design against this ticket and DECISIONS.md.

## Out of scope
- The platform/game split (S13): next, once this is approved, from a fresh boundary inventory (audit, M16).
- Scoring numbers (S15), the overall score (S17), the bands (S18), the shown name (S1).
- The picker (16c) and the play routes (16d).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 rounds | `rounds` length, `round_idx` 0–6 | human, 2026-10-22 (S5), fixed 2026-11-06: "Always 7" |
| 20 seconds per round | The round's deadline | human, 2026-10-22 (S6: "for now") |
| 0.5 s lockout after a rejected try | `locked` refusal | human, 2026-11-06: "0.5 seconds" |
| 1 bonus letter per day | `bonus_letter` | human, 2026-11-06: "One per day" (S16) |

## Plan
1. The human approves the design and the security change (above).
2. DECISIONS.md updated (acceptance criteria 3), then the `reviewer` agent.
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
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
