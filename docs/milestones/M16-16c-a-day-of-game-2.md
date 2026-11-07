# M16 16c — A day of game 2

**Status:** done: approved ("Approve, build it", 2026-11-07). 16c-1, the mark, the format, CI and the picker, is done (PR #160, merged on green CI, 2026-11-07); 16c-2, approval, is in PR #161, which merges on green CI at the human's "Merge when green".

## Goal
Make a real day of game 2: a command drafts a week of days under the human's rules, CI checks them, and the human approves each on the admin page, so they're stored in `private.puzzle`.

## Who uses it / what breaks without it
- Used by: the human, who approves days (S11), and 16d, which plays a stored day.
- Breaks without it: 16d has no day to play. The first file under `content/substrings/` fails CI (audit, TOOL-11), and `approve_puzzle` refuses anything but format 3 for every game (FUT-6).

## Source
- `docs/DECISIONS.md`, Game 2; Puzzle approval; Puzzle drafting; Puzzle content format.
- `docs/milestones/M16-game-2-substrings.md`, S11, S16, S18, S20, S21, the split's answers.
- `docs/milestones/M16-16b-run-model-and-format.md`, "Content format": `format: 1`, `game_id`, `date`, `rounds`, `bonus_letter`, and the validator choosing its checks by `game_id`.
- `docs/SOURCES.md`, the four pinned word lists. Game 2's rules are the human's, not a source's.

## The human's answers (2026-11-06 and 2026-11-07)
1. How days are made: "A batch at a time (Recommended)". One command drafts several days in one PR.
2. The batch: "7 days (Recommended)".
3. The bonus letter: "Any letter at random", then, shown that it could land in the day's letters: "Avoid the day's letters (Recommended)".
4. Sets of letters within a day: "Avoid overlap (Recommended)". No set sits inside another that day.
5. Review: "Counts in the PR, approve on page (Recommended)".
6. Approving: "Each day on its own (Recommended)".
7. After the review (2026-11-07): `abo` and `nig`: "Refuse those two (Recommended)". British-only spellings as everyday words: "Yes, they count (Recommended)". Sample words in the PR: "4 words (Recommended)".
8. Before these, in the M16 ticket: letters 2, 2, 3, 3, 3, 3, 3; the steady climb; a 30-day repeat; a floor of 5 everyday words, an everyday word being SCOWL size 35 or less.

## What Claude measured (2026-11-07)
On the 254,477-word snapshot, in a throwaway script, with the rules below. The everyday mark there reads the table loosely, so this ticket's real mark may move these numbers a little.
- **Can every day be filled?** *Hypothesis:* yes, as the pools are 95 to 662. *Disproved by:* a day with no pick. *Result:* 3,650 simulated days, `stuck: 0`, and `minChoicesLeftAnyRound: 65`. Held. Pools for rounds 1 to 7: 126, 95, 283, 519, 505, 417, 662.
- **The bonus letter leans rare,** as the rule keeps out the day's letters: at least 9 letters to choose from, a median of 14. Over 3,650 days, `q` 278, `j` 259, `v` 226, `x` 221, down to `a` 42, `e` 38. So `q` or `j` is the bonus on about 1 day in 7, and few words can use them. It follows from answer 3, for the human to see before approving.
- **Five sets are refused as offensive:** `sm`, `ass`, `tit`, `cum`, `sex` (Claude's rule: a set of letters on the screen shouldn't spell a listed word, so the approval isn't the only guard).

## Design (Claude, for approval)
**The everyday mark.** `DictionaryEntry` gains `everyday`, set on a main spelling on a table line of size 35 or less, which the README calls "small". A main spelling has no variant level, or `.`, in at least one English, as each code speaks for one (`A Cv DV: color` is main in American, and `AV Bv: adaptor` nowhere), and no `-`, `@` or `~` mark; `*` only says a plural can match its singular. A key is everyday if any spelling is. It's read by the picker alone, and players never see it. The manifest's checksum changes with it, so the fetch runs on the Windows PC.

**The day's format,** `src/content/substrings.ts`, as 16b set it: `{ format: 1, game_id: "substrings", date, rounds, bonus_letter }`. The checks: exactly 7 rounds of lower-case letters, 2, 2, 3, 3, 3, 3, 3 long; no round inside another; one lower-case bonus letter that's in no round; the path matches `game_id` and `date`.

**CI.** `scripts/content-validate.ts` chooses its checks by each file's folder, and adds the 30-day repeat across `content/substrings/`. A file in a folder that's neither game fails game 1's checks, so a typo can't skip them.

**The picker,** `npm run substrings -- draft <first date>`, in `scripts/substrings.ts`.
- It reads the snapshot and the existing day files, with no database, and draws seven days in date order. Each draw gives every choice a SHA-256 of the date, round and choice, and takes the lowest, so a run can be repeated and a veto changes a draw only if the vetoed set had won. `seed` in `src/content/bank.ts` was the first plan, but its rolling sum moves by the same step from one date to the next, and a modulus reshuffles a round's every draw when one set goes.
- For each round, it takes the sets of that round's length in its band, drops any with fewer than 5 everyday words, on an offensive list or refused by name (`abo`, `nig`), used in the last 30 days, or overlapping that day's sets, and draws one. The bonus is drawn from the letters left.
- A day with no pick stops the run loudly.
- It writes `content/substrings/<date>.json` and prints a table for the PR: each round's set, word count, everyday count and 4 sample words.
- **A veto:** `--not <set>,…` redraws around sets the human turned down. **`--root <folder>`** writes elsewhere, so a trial leaves no day in `content/`.

**Approval.**
- `/admin/puzzles` lists both games' days. A game 2 day shows its 7 sets and bonus letter, with the same Approve button; the admin page isn't a player screen, so this stays clear of the `/play` build.
- `private.approve_puzzle` chooses by `game_id`, in a migration: game 1's branch doesn't change, and game 2's checks format 1 and stores the day with `approved_at`. **Security:** it's a `security definer` function, so the change goes to the human with this ticket. No grants change.
- `content/substrings/*.json` joins the routes' file traces in `next.config.ts`, as `content/offbeat` is.

**One name for the game.** `src/platform/game.ts` gains game 2's permanent ID. Its shown name and address wait for 16d, which is their first caller.

**PRs.** 16c-1: the mark, the format, CI and the picker. 16c-2: approval, which needs Docker running for its database tests.

**No days are committed.** Nothing here publishes a day (human, "App first, no publishing"): 16c's evidence is drafted into a scratch folder. The human asks for the first real batch when they want one.

## Acceptance criteria
16c-1:
- [x] `checkSubstringsFile` refuses each of: 6 rounds, a round of the wrong length, a capital, a round inside another, a bonus letter in a round, a wrong date, checked by tests.
- [x] `content:validate` passes a good day under `content/substrings/`, fails a bad one, fails a repeat within 30 days, and fails an unknown folder, checked by tests.
- [x] The picker refuses a set outside its band, one under the floor, one on an offensive list, a repeat and an overlap, each checked with a set just outside the rule on a hand-made word list.
- [x] The same date and word list give the same day, and `--not` changes only what it must.
- [x] A fetch on the Windows PC keeps 254,477 keys and 259,968 pairs, and reports how many are everyday, about 40,000.
- [x] A real 7-day draft into a scratch folder passes `content:validate`, and its table is in the Evidence.

16c-2:
- [x] `approve_puzzle` stores a good game 2 day, and refuses a bad format and a non-admin, by pgTAP; game 1's approval tests pass unchanged.
- [x] An admin sees a game 2 day on `/admin/puzzles` and approves it, by e2e.
- [x] Game 1's run, its unit, database and e2e tests pass unchanged: by CI's fresh stack on PR #161, whose required `db` and `e2e` checks hold the merge; this PC's `test:db` can't show it (Evidence).

## Out of scope
- `dictionary_word`, the run tables, the judge and play: 16d.
- Anyone playing a stored day: 16d.
- Any change to a day's stored shape beyond 16b's format.
- A script that makes days by itself (S11, later).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 days a batch | The picker | Human, 2026-11-07: "7 days (Recommended)" |
| 2, 2, 3, 3, 3, 3, 3 letters | The format, the picker | Human, 2026-11-06, S18 |
| Bands: 5,000+ / 2,000-5,000 / 1,000-2,000 / 500-1,000 / 300-500 / 200-300 / 100-200 | The picker | Human, 2026-11-06, S18. **Claude's reading, for the human:** the bands touch, so each holds its lower number and not its upper, and the last is 100 to 199 |
| 5 everyday words | The picker | Human, 2026-11-06, S21 |
| Everyday: a main spelling at SCOWL size 35 or less | The mark | Human, 2026-11-06, S21; what "main" means is the README's default list |
| 4 sample words | The PR's table | Human, 2026-11-07: "4 words (Recommended)" |
| 30 days before a set returns | The picker, CI | Human, 2026-11-06, S18 |
| 7 rounds, 1 bonus letter | The format | Human, 2026-11-06, S5, S16 |

## Plan
1. The human approves this ticket, with the migration's security note.
2. 16c-1, tests first, then a fetch on this PC, a review and a PR.
3. 16c-2, with Docker running, tests first, a review and a PR.

## Removes
- `approve_puzzle`'s refusal of every other game.
- `content-validate`'s treating every file as format 3.
- From 16b, `check_question_open` and `run_status` stay for 16d.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| This ticket's Removes: `readDrafts`'s one hard-coded folder | `readSubstringDrafts` beside it | The two read different formats, and game 2's folder can be missing, as no day is committed, where game 1's can't. A shared reader would hold only the loop |
| S21: "SCOWL size 35 or less" | Main spellings at that size only | The size alone made `clipt`, `thru` and `digged` everyday, and let `rhi`, the human's one miss, past the floor at 5 (review). The README's default list leaves such variants out |
| This ticket's first plan: draw with `seed` from `src/content/bank.ts` | A SHA-256 of date, round and choice, lowest wins | `seed` steps evenly from date to date, and the tests showed a modulus draw changes other days after a veto |

## Evidence
### 16c-2
**Tests:** written first. `npx supabase test db` failed on `puzzle_invalid: format 3 expected` until the migration. Then `Files=35, Tests=560`, `Result: PASS`, with `supabase/tests/puzzle_entry.test.sql`, game 1's approval tests, not edited. `npx vitest run src/app/api/admin/puzzles --no-file-parallelism`: 14 passed. `npx vitest run src/admin/substrings.test.ts`: 8 passed, including no `content/substrings/` folder at all, as `readDrafts`' way of reading would have thrown there and taken the whole admin page down. `npx playwright test e2e/substring-days.e2e.ts e2e/approve-and-play.e2e.ts`: game 2's day seen and approved in a real browser, and game 1's approve-and-play passes unchanged. `npx eslint` and `npx tsc --noEmit -p .` are clean. `npm run content:validate` still shows `content` holding 1 day, so the tests left nothing behind.

**`npm run test:db` here isn't evidence:** it fails on this PC in `offbeat` and `me`, with `expected [ { puzzle_date: '2026-11-01' } ] to deeply equal []`: the phone test's leftover days (HANDOFF), not this change. They weren't deleted, as that's the human's local data. CI's `db` job runs `test:sql` and `test:db` on a fresh stack, and is this ticket's evidence for Game 1's tests passing unchanged.

**Seen on screen,** a throwaway test's screenshots at 1280 and 390 wide: two drafted days as cards, seven chips each, and the admin home's "2 days to approve". They showed "No days yet" above game 2's days, now "No game 1 days yet".

### 16c-1
**Tests:** written first, and all failed (the modules didn't exist; `expected [ { key: 'apple', …(1) }, …(3) ] to deeply equal`). Two then caught real bugs in the first picker: a redraft counted the batch's own old days against it, and a veto reshuffled that round on every other day. Both are fixed, not the tests. `npx vitest run scripts/dictionary.test.ts scripts/content-validate.test.ts scripts/substrings.test.ts src/content/substrings.test.ts`: 92 passed at the first review's fixes, and the re-check's `=` lines added to one test. `npm test`: `Test Files 51 passed (51)`, `Tests 577 passed (577)`. `npx eslint` on `scripts`, `src/content`, `src/config` and `src/platform`, and `npx tsc --noEmit -p .`, are clean.

**The fetch, on the Windows PC** (2026-11-07): `FETCHED dictionary: 259968 items, snapshot 2026-11-07`. *Hypothesis:* the same keys and pairs, about 40,000 everyday. *Disproved by:* any key or pair moving. *Result:* `pairs: 259968, keys: 254477, everydayKeys: 40956, sameAsBefore: true`. Held.

**The fetch with the mark's fix** (2026-11-07). *Hypothesis:* `rhi` falls under the floor, and the everyday words fall by under 2%. *Disproved by:* `rhi` staying at 5, or a much larger fall. *Result:* `pairs: 259968, keys: 254477, sameWords: true, everydayKeys: 40098`, 858 fewer, or 2.1%, so a little over. `rhi` is at 4: `rhino rhinos rhinoceros rhinoceroses`. Six sets left the pools: `ogo`, `iru`, `pae`, `rah`, `rhi`, `ryn`. The first rule, that every code must be main, took `color` and `armor` too: found by reading real words after the count, and corrected. The manifest's checksum is `852a0264…`.

**A real week, into a scratch folder:** `npm run substrings -- draft 2026-12-01 --root <scratch>`: `DRAFTED 7 days, 2026-12-01 to 2026-12-07`, and `npm run content:validate -- <scratch>`, with `content/offbeat` and the bank copied in: `CONTENT OK`. `npm run content:validate` on the repo: `CONTENT OK content: 1 file(s)`, so no day was committed. One of the seven:

**2026-12-06**, bonus letter `x`

| Round | Letters | Words | Everyday | Samples |
|---|---|---|---|---|
| 1 | `nt` | 18126 | 2761 | ant, ants, aunt, bent |
| 2 | `mu` | 2889 | 356 | mud, mug, mum, much |
| 3 | `cen` | 1494 | 196 | cent, cents, scene, scent |
| 4 | `bin` | 694 | 111 | bin, bind, bins, binds |
| 5 | `agr` | 327 | 40 | agree, agreed, agrees, meagre |
| 6 | `ipt` | 262 | 41 | script, tiptoe, receipt, scripts |
| 7 | `vio` | 188 | 40 | viola, savior, violas, violet |

**A real year, in memory, with the real code:** 52 batches, `days: 364, invalid: 0, gapProblems: 0`. *Hypothesis:* it fills, as the throwaway simulation did. Held. Pools for rounds 1 to 7: 126, 95, 283, 518, 505, 416, 659.

## Review
- Blocking findings and how each was fixed (16c-2, the `reviewer` agent, 2026-11-07):
  1. A redrafted day read "Approved." above letters players wouldn't get: the card shows the approved day, the redraft beside it and says so, by e2e.
  2. The listing's branches had no test that could fail: `viewDays`, tested alone, and a route test for a started and a past day.
  3. The missing-folder test would have failed once the first batch was committed: it runs in an empty temporary folder.
  4. This ticket's Removes claimed a change not made: corrected, with a Source diff row.
  The fix's first shape imported server code into the page, and `npm run build` refused it: `src/admin/substring-sets.ts` holds what both share.
  The re-check (same agent, same day) found one more: the new 409 test wrote real files, so a committed batch would have broken CI's `db` job once its days reached today. The route's tests run in a temporary folder.
- Blocking findings and how each was fixed (16c-1, the `reviewer` agent, 2026-11-07):
  1. The mark covered rare variants, so `rhi` passed the floor: main spellings only, from the README, with a fetch.
  2. `add`'s merge had no test that could fail it: one for either order of a word's lines.
  3. The repeat's edge wasn't tested through `setsNear`: 29 and 30 days, either side.
  4. `setStats`'s any-spelling rule was untested: mixed marks, in either order.
  5. `SAMPLE_WORDS` had no origin: the human's answer, in tunables and Numbers.
  Also put to the human: `abo` and `nig`, and British spellings.
  The re-check (same agent, same day) found one more: the `=` level had no test, and 7 real keys rest on it. Fixed. It also confirmed "main in any code" against the README.
- Deferred to ROADMAP "Next revision": the items under "For M16" marked "Found in M16 16c-1 (review)".
