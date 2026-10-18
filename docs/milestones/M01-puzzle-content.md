# M01 — Puzzle content format and validator

**Status:** in progress

## Goal
Define a versioned file format for daily puzzles and a validator script that rejects any puzzle breaking the answer model, then seed 14 real daily puzzles (7 independent questions per date).

## Who uses it / what breaks without it
- Used by: the host (us) when authoring puzzles, and the M02 server, which loads them.
- Breaks without it: a host answer outside the accepted bank, alias collisions or a missing plural would let players dodge the host (*cats* vs *cat*) or die unfairly. The server can't be trusted with content that hasn't been validated.

## Source
- DECISIONS.md: "Puzzle content format" (hard to reverse) and "Answer model".
- SOURCES.md: JSON (RFC 8259) for syntax; Unicode normalization (ECMA-262 `String.prototype.normalize`, UAX #15 NFKD, UAX #44 General_Category `M`/`P`); pluralize 8.0.0 for generated plurals. All three were chosen by a human on 2026-10-18.
- M00-data-design.md §4 (authoring path, `format: 1`, single TypeScript validator) and the Game 1 section of DECISIONS.md (`game_id` `offbeat`).

## Acceptance criteria
- [ ] A puzzle file holds: version, game_id, date, and an ordered list of questions. Each question has an accepted bank of canonical entries (ID plus aliases), a host bank of entry IDs, host answer(s) and match groups.
- [ ] The validator is a script run through the task runner. It exits non-zero and names the file, question and entry for each of these, and each has its own failing fixture:
  - [ ] an alias that maps to more than one entry, or two aliases that collide after normalization (case, whitespace, punctuation, diacritics)
  - [ ] a host bank entry that isn't in the accepted bank
  - [ ] a host answer that isn't in the host bank
  - [ ] a match group that references an entry that doesn't exist
  - [ ] an entry with no plural alias where an inflection exists (the generated plurals are shown for human review, not trusted silently)
  - [ ] a duplicate date, or a chain whose length differs from "questions per chain". *(Human, 2026-10-18: the path must match `content/<game_id>/<date>.json`, so two files can't claim one day. The duplicate-date check becomes a path-mismatch check with its own fixture.)*
  - [ ] a question with no host answers *(human, 2026-10-18: the count varies by question, so the fixed-count check became "at least 1")*
- [ ] A valid fixture passes.
- [ ] 14 daily puzzles on consecutive dates, drafted by Claude and reviewed and approved by the host (human, 2026-10-18), pass the validator. Every day mixes concrete questions with a clear answer set (e.g. days of the month) and abstract ones (e.g. "something you'd bring to a potluck"). Each puzzle is one file holding the 7 questions for its date.
- [ ] CI runs the validator over all puzzle files.

## Out of scope
Serving puzzles (M02), an admin UI, and automated AI puzzle generation (a later milestone; see ROADMAP). Claude drafting this milestone's 14 puzzles for human review is in scope (human, 2026-10-18).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Questions per day | Question count check | **7**, human, 2026-10-18 ("i think each daily chain should have 7", relayed by the parent session) |
| Host answers per question | Validator: at least 1 | **Varies by question**, human, 2026-10-18 ("Let the count vary"). Each question's host answers catch a gently rising share of players, estimated until the M02 playtest. Replaces "1 per question" and then "1–7 by position". |
| Daily puzzles to author in M01 | Acceptance criterion: real content before M02 | **14**, human, 2026-10-18 (replaces Claude-invented 7). One puzzle = the 7 questions for one date. |
| Host bank size per question | Validator: the host bank has at least as many entries as the host-answer count, and every host answer is in it. No warning. | **No fixed size yet**, human, 2026-10-18. Whether the bank holds the answers players actually give is measured in the M02 playtest (ROADMAP "Next revision"). |

## Plan
*Refreshed 2026-10-18 against the repo.* No migration creates `private.puzzle` or `private.today()` yet; the only migration is `restrict_public_defaults`. M01 is therefore file-only and needs no database. The `private.puzzle` column trim and the `seed.sql` line in `supabase/config.toml` stay in ROADMAP "Next revision" for M02, which writes the first puzzle migration.
1. Record the schema in DECISIONS.md (done) and the two numbers in `src/config/tunables.ts`.
2. Write fixtures under `scripts/fixtures/content/<case>/offbeat/2026-11-02.json` (next to the script tests, the repo's test layout): one valid, and one per rule that breaks only that rule.
3. Write the validator, `src/content/puzzle.ts` (the module M02's server will import), and `scripts/content-validate.ts`. It runs as `npm run content:validate [-- <root>]`, with `content/` as the default root. It prints one line per error naming the file, question and entry, and exits 1 on any error or if no puzzle files are found.
   Hypothesis: each failing fixture produces exactly its rule's error and nothing else, and the valid fixture passes. Any other result means the rule or the fixture is wrong.
4. Write `scripts/content-plurals.ts` (`npm run content:plurals [-- <root>]`, default `content/`). It adds each entry's expected plural (its `plural` override, otherwise `pluralize(name)`) to `aliases` when it's missing, and prints every plural it adds so the human reviews them in the diff.
5. Add `npm run content:validate` to CI.
6. The host writes 14 daily puzzles in `content/offbeat/`, one file per date, each holding 7 independent questions. They pass the validator locally and in CI.
7. Reviewer pass, then a PR.

## Removes
Nothing in code: this is the first content code. The `tsconfig.json` change (`allowImportingTsExtensions`, so Node can run scripts that import `src/`) adds an option. Its caller is `scripts/content-validate.ts`.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Ticket: a puzzle file holds a "version" | `format: 1` | DECISIONS.md and data design §4 name the field `format`, and they win over the ticket's wording. |
| Ticket: reject "a duplicate date" | Reject a file whose path isn't `<game_id>/<date>.json` | Human, 2026-10-18. A filesystem can't hold two files with one path, so a duplicate date can't happen once the path is checked. |
| Ticket: rules for aliases, banks, groups, plurals and counts | Those rules, plus: duplicate entry IDs, a match group keyed by an entry that isn't a host answer, a host answer listed in its own group (human, 2026-10-18), IDs listed twice in `host_bank` or `host_answers`, names that normalize to empty, and shape errors (missing or unknown fields, wrong types, `format` ≠ 1, `game_id` ≠ `offbeat`, impossible dates) | Matching by ID needs unique IDs. Keying groups by host answer is the approved format. The file is untrusted disk input (CLAUDE.md: validate at boundaries). |
| Data design §4: one validator the server also imports | `src/content/puzzle.ts`, imported by both scripts | As designed. The server import arrives in M02. |
| Approved normalization: lowercase, NFKD, strip marks and punctuation, collapse whitespace | Exactly that, in that order. Punctuation is removed, not replaced by a space, so "bald-eagle" normalizes to "baldeagle", not "bald eagle". | Lowercasing first makes U+0130 (İ) produce a combining mark that NFKD stripping then removes (tested). |
| Plural check covers "an entry" | The plural of the entry's `name` only. Synonym aliases (e.g. "cougar") don't need their own plural. | Ticket wording. Players submit entry IDs from autocomplete, so aliases only help search. |

## Evidence

## Review
Reviewer run 1 (2026-10-18, on fa31fa9): 1 blocking finding, 8 non-blocking.
- Blocking findings and how each was fixed:
  - It wasn't defined whether a host answer matches itself. The validator accepted both `{"eagle": ["eagle"]}` and `{}`, so an M02 matcher written as "entry ∈ group" would let a player who picks the host answer survive. **Fixed:** the human decided on 2026-10-18 that a host answer always matches itself (DECISIONS.md: Answer model). The validator now rejects a host answer listed in its own group, and the `match-group-contains-key` fixture covers it. The matching function itself is M02 work (data design §4) and must follow this rule.
- Deferred to ROADMAP "Next revision": 8 items (files skipped by extension, no consecutive-date check, `p{Cf}` not stripped, one-way plural check, full-file reformat in `content:plurals`, the incomplete caller list in "Removes", mixed import styles, stale M00 remote branches).
- The reviewer's two unverified items, now checked: `npm run lockfile -- check` printed LOCKFILE CHECK OK (Linux, node:24), and `npm run build` succeeded with `allowImportingTsExtensions` set.
