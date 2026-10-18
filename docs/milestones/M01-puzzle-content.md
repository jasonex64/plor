# M01 — Puzzle content format and validator

**Status:** planned

## Goal
Define a versioned file format for daily puzzles and a validator script that rejects any puzzle breaking the answer model, then seed 7 real days of puzzles.

## Who uses it / what breaks without it
- Used by: the host (us) when authoring puzzles, and the M02 server, which loads them.
- Breaks without it: a host answer outside the accepted bank, alias collisions or a missing plural would let players dodge the host (*cats* vs *cat*) or die unfairly. The server can't be trusted with content that hasn't been validated.

## Source
- DECISIONS.md: "Puzzle content format" (hard to reverse) and "Answer model".
- The schema and serialization source chosen in M00, as pinned in SOURCES.md.

## Acceptance criteria
- [ ] A puzzle file holds: version, game_id, date, and an ordered chain of questions. Each question has an accepted bank of canonical entries (ID plus aliases), a host bank of entry IDs, host answer(s) and match groups.
- [ ] The validator is a script run through the task runner. It exits non-zero and names the file, question and entry for each of these, and each has its own failing fixture:
  - [ ] an alias that maps to more than one entry, or two aliases that collide after normalization (case, whitespace, punctuation, diacritics)
  - [ ] a host bank entry that isn't in the accepted bank
  - [ ] a host answer that isn't in the host bank
  - [ ] a match group that references an entry that doesn't exist
  - [ ] an entry with no plural alias where an inflection exists (the generated plurals are shown for human review, not trusted silently)
  - [ ] a duplicate date, or a chain whose length differs from "questions per chain"
  - [ ] a host answer count that differs from "host answers per question"
- [ ] A valid fixture passes.
- [ ] 7 consecutive days of real puzzles, written by the host, pass the validator.
- [ ] CI runs the validator over all puzzle files.

## Out of scope
Serving puzzles (M02), an admin UI and AI-generated content.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Questions per chain | Chain length check | _human_ |
| Host answers per question | Host answer count check | _human_ |
| Host bank size guideline per question | Authoring guidance (a validator warning, if the human wants one) | _human_ |

## Plan
1. Draft the schema, following the M00 content format decision.
2. Write a failing fixture for each rule, then the validator. Hypothesis: every fixture fails with a specific message and the valid fixture passes. Any other result means the rule is wrong.
3. Add the deterministic plural and alias generation step, with output for the human to review.
4. The host writes 7 days of puzzles, and they're validated in CI.

## Removes
Nothing. This is the first content code.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
