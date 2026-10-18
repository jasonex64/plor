# M01 — Puzzle content format and validator

**Status:** in review

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
- [x] A puzzle file holds: version, game_id, date, and an ordered list of questions. Each question has an accepted bank of canonical entries (ID plus aliases), a host bank of entry IDs, host answer(s) and match groups.
- [x] The validator is a script run through the task runner. It exits non-zero and names the file, question and entry for each of these, and each has its own failing fixture:
  - [x] an alias that maps to more than one entry, or two aliases that collide after normalization (case, whitespace, punctuation, diacritics)
  - [x] a host bank entry that isn't in the accepted bank
  - [x] a host answer that isn't in the host bank
  - [x] a match group that references an entry that doesn't exist
  - [x] an entry with no plural alias where an inflection exists (the generated plurals are shown for human review, not trusted silently)
  - [x] a duplicate date, or a chain whose length differs from "questions per chain". *(Human, 2026-10-18: the path must match `content/<game_id>/<date>.json`, so two files can't claim one day. The duplicate-date check becomes a path-mismatch check with its own fixture.)*
  - [x] a question with no host answers *(human, 2026-10-18: the count varies by question, so the fixed-count check became "at least 1")*
- [x] A valid fixture passes.
- [x] 14 daily puzzles on consecutive dates, drafted by Claude and reviewed and approved by the host (human, 2026-10-18), pass the validator. Every day mixes concrete questions with a clear answer set (e.g. days of the month) and abstract ones (e.g. "something you'd bring to a potluck"). Each puzzle is one file holding the 7 questions for its date.
- [x] CI runs the validator over all puzzle files.

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
1. Record the schema in DECISIONS.md (done) and the questions-per-day number in `src/config/tunables.ts`.
2. Write fixtures under `scripts/fixtures/content/<case>/offbeat/2026-11-02.json` (next to the script tests, the repo's test layout): one valid, and one per rule that breaks only that rule.
3. Write the validator, `src/content/puzzle.ts` (the module M02's server will import), and `scripts/content-validate.ts`. It runs as `npm run content:validate [-- <root>]`, with `content/` as the default root. It prints one line per error naming the file, question and entry, and exits 1 on any error or if no puzzle files are found.
   Hypothesis: each failing fixture produces exactly its rule's error and nothing else, and the valid fixture passes. Any other result means the rule or the fixture is wrong.
4. Write `scripts/content-plurals.ts` (`npm run content:plurals [-- <root>]`, default `content/`). It adds each entry's expected plural (its `plural` override, otherwise `pluralize(name)`) to `aliases` when it's missing, and prints every plural it adds so the human reviews them in the diff.
5. Add `npm run content:validate` to CI.
6. Claude drafts 14 daily puzzles in `content/offbeat/` (2026-12-11 to 2026-12-24), one file per date, each holding 7 independent questions; the host reviews and approves them. They pass the validator locally and in CI.
7. Reviewer pass, then a PR.

## Removes
This is the first content code, so it removes no earlier code. Within the milestone, each design change removed the way it replaced: the narrowing-chain rule, the `HOST_ANSWERS_PER_QUESTION` and `HOST_ANSWERS_BY_QUESTION` settings, the `chain-length` and `host-answer-count` fixtures, kind-based match groups, and the blank puzzle skeletons. The `tsconfig.json` change (`allowImportingTsExtensions`, so Node can run scripts that import `src/`) adds an option. Its callers are `src/content/puzzle.ts` and both `scripts/content-*.ts`.

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
| Ticket and roadmap: a chain of questions that narrows each day | 7 independent questions per day, mixing concrete and abstract | Human, 2026-10-18 (DECISIONS.md: Game 1). Mixed days are less dry, and difficulty comes from the host's answers instead. |
| Ticket Numbers: 1 host answer per question, then 1–7 by position | The count varies by question; the validator requires at least 1 | Human, 2026-10-18: difficulty is the share of players caught, rising gently, with daily variance welcome. |
| Answer model: accepted bank holds "every valid answer"; groups cover kinds (eagle covers bald eagle) | Lists as complete as practical, one level of detail per question, no match groups in the drafts | Human, 2026-10-18. Abstract questions have no complete list; kind-based groups made the game harsher than intended (a Ferris wheel isn't a wheel). Niche answers are an intended escape. |
| SOURCES rule: anchor to a source | The 14 drafts' answer lists come from Claude's knowledge plus the host's review, not from named reference lists | Human chose "Claude drafts, I review" (2026-10-18). Naming a reference source per concrete question is in ROADMAP "Next revision"; M02's miss log grows the lists. |
| Answer model: one level of detail per question | Applied to "<kind> <answer>" names (DECISIONS.md wording: no "chocolate cake" next to "cake"). Differently named kinds stay as separate answers next to a generic (tuna next to fish, Monopoly next to board game, Mars next to planet), but a generic is never a host answer when its kinds are listed. | Keeps niche answers (an intended escape) without letting a player dodge a generic host answer by naming a kind. Proposed by Claude after review 2; confirmed by the human on 2026-10-18 ("yes keep them") and recorded in DECISIONS.md. |
| AC: generated plurals are shown for human review | 2,145 entries are marked "no plural" (plural = name) by category and skip the printed review | Proper and mass nouns have no useful plural. The category choice is recorded in Evidence. Countable words found in that set by review 2 were moved back to generated, reviewed plurals. |
| Plural check covers "an entry" | The plural of the entry's `name` only. Synonym aliases (e.g. "cougar") don't need their own plural. | Ticket wording. Players submit entry IDs from autocomplete, so aliases only help search. |

## Evidence
Run on branch `m01-puzzle-content` at 76cda42, 2026-10-18 (Windows, Node 24.11.0).

```text
$ npm run content:validate
CONTENT OK content: 14 file(s)                                  exit=0

$ npm run content:validate -- scripts/fixtures/content/<case>   (one line per fixture)
valid                            CONTENT OK scripts/fixtures/content/valid: 1 file(s)   exit=0
alias-normalized                 q3 entry "zebra": "  LÏON'S " collides with "lions" of entry "lion" (both normalize to "lions")   exit=1
alias-shared                     q2 entry "tiger": "lions" collides with "lions" of entry "lion" (both normalize to "lions")   exit=1
host-bank-unknown-entry          q1 entry "panda": in host_bank but not in the accepted bank   exit=1
host-answer-not-in-bank          q3 entry "giraffe": host answer is not in host_bank   exit=1
match-group-unknown-entry        q1 entry "golden-eagle": in match group "eagle" but not in the accepted bank   exit=1
match-group-key-not-host-answer  q1 entry "lion": match group key is not a host answer   exit=1
match-group-contains-key         q1 entry "eagle": listed in its own match group (a host answer always matches itself)   exit=1
plural-missing                   q1 entry "lion": no plural alias "lions" (run npm run content:plurals, or set "plural" to override)   exit=1
path-mismatch                    offbeat/2026-11-02.json: path must be offbeat/2026-11-03.json to match its game_id and date   exit=1
question-count                   offbeat/2026-11-02.json: has 6 questions, expected 7   exit=1
no-host-answers                  q2: has no host answers   exit=1
duplicate-entry-id               q2 entry "lion": ID used by more than one entry   exit=1
(each failing fixture printed exactly 1 error; every line starts with offbeat/2026-11-02.json)

$ npm test
 Test Files  6 passed (6)
      Tests  55 passed (55)

$ npm run lint                   exit=0, no output
$ npx tsc --noEmit -p .          exit=0, no output
$ npm run build                  ✓ Compiled successfully; ✓ Generating static pages (5/5); exit=0
$ npm run lockfile -- check      LOCKFILE CHECK OK (Linux, node:24)
```

- **Plurals reviewed:** `npm run content:plurals` added 1,143 plural aliases to the drafts, and Claude reviewed every printed one. 23 entries override the generated plural with a different form (e.g. Dobermen → Dobermans, gulves → gulfs, UFOS → UFOs, macchiatoes → macchiatos). A further 2,145 entries set `plural` equal to their name, which tells the validator they have no plural. These are proper nouns (countries, states, holidays, brands), mass nouns (cheddar, snow, sushi), phrases ("read a book"), and letters, numbers and cards. Claude chose them by category; they were never printed by `content:plurals`, so no human reviewed them one by one. Review 2 found countable words wrongly in that set (dragon, ace, samosa, latte, tornado…); those now get generated plurals.
- **Host approval:** the human approved the drafts on 2026-10-18 ("sure that works so far"), then asked for international answers, which were added in 76cda42 (3,203 → 3,876 accepted answers). After review 2, three host answers changed (fish → shark, board game → charades, planet → moon); see Review.
- **CI:** `.github/workflows/ci.yml` runs `npm run content:validate` after `npm test`. PR #4, run 39118599153 on 576de28 (pull_request): job `check` succeeded, with steps lint, test, content:validate and build all green, and the log shows `CONTENT OK content: 14 file(s)`. Job `secrets` (gitleaks) succeeded too. The later commits change docs only.

## Review
Reviewer run 1 (2026-10-18, on fa31fa9): 1 blocking finding, 8 non-blocking.
- Blocking findings and how each was fixed:
  - It wasn't defined whether a host answer matches itself. The validator accepted both `{"eagle": ["eagle"]}` and `{}`, so an M02 matcher written as "entry ∈ group" would let a player who picks the host answer survive. **Fixed:** the human decided on 2026-10-18 that a host answer always matches itself (DECISIONS.md: Answer model). The validator now rejects a host answer listed in its own group, and the `match-group-contains-key` fixture covers it. The matching function itself is M02 work (data design §4) and must follow this rule.
- Deferred to ROADMAP "Next revision": 8 items (files skipped by extension, no consecutive-date check, `p{Cf}` not stripped, one-way plural check, full-file reformat in `content:plurals`, the incomplete caller list in "Removes", mixed import styles, stale M00 remote branches).
Reviewer run 2 (2026-10-18, on 73f4542): 2 blocking findings, 8 non-blocking.
- Blocking findings and how each was fixed:
  - Plural check switched off for countable words, and the Evidence undercounted the overrides. **Fixed:** 116 countable words (card ranks, Chinese zodiac animals, coffee drinks, weather events, international dishes and fruits…) now get generated plurals, all printed and reviewed. Three wrong ones were overridden (affogatos, macchiatos, pains au chocolat). The Evidence now states the 2,145 "no plural" entries and how they were chosen.
  - Generic host answers could be escaped by naming a listed kind: ocean "fish" (tuna listed), indoor game "board game" (Monopoly listed), outer space "planet" (Mars listed). **Fixed:** host answers changed to shark, charades and moon, none of which has kinds listed. The remaining mixed levels (fish next to tuna, whale next to orca, bird next to eagle) stay, as the human confirmed on 2026-10-18 (Source diff; DECISIONS.md: Answer model).
- Deferred to ROADMAP "Next revision": 8 items (chain wording in an AC line, a superseded Log row, days that may lack a concrete question, untested validator branches, the Kaskaskia caveat, completeness gaps, UK plus constituent countries, dominant late host answers).
- The reviewer's unverified items: lockfile check and build were run (Evidence). CI is evidenced by the PR run.

Run 1 follow-up: the reviewer's two unverified items, now checked: `npm run lockfile -- check` printed LOCKFILE CHECK OK (Linux, node:24), and `npm run build` succeeded with `allowImportingTsExtensions` set.
