# M16 16a-2 — The dictionary keeps proper spellings

**Status:** done (PR #158, merged on green CI at the human's "Merge when green (Recommended)", 2026-11-06).

## Goal
Make the dictionary build keep each word's proper spelling (`it's`, `well-known`, `café`) beside the stripped form it matches on, so game 2 can show the proper word (16b, answers 12–14). The fetch this needed also found 43 entries that aren't words, and this ticket took them out (answer 3).

## Who uses it / what breaks without it
- Used by: 16d's word check, which picks the shown spelling, and through it every player who sees an accepted word on screen.
- Breaks without it: the build keeps only `normalize`'s form (`scripts/dictionary.ts`, `buildDictionary` returns `string[]`), so `it's`, `well-known` and `café` are lost before the database ever sees them. 16b's `dictionary_word (word_key, spelling)` has nothing to fill its `spelling` column with.

## Source
- `docs/milestones/M16-16b-run-model-and-format.md`, answers 12–14 and the run model's `dictionary_word`.
- `docs/DECISIONS.md`, Game 2, "Matching and showing".
- `docs/milestones/M16-16a-the-dictionary.md`: the build, its filters and the drop list, none of which change.
- `docs/SOURCES.md`: the four pinned files, unchanged.

## The human's answers (2026-11-06)
1. "yea", to starting this ticket's questions; "yes", approving the ticket.
2. Accents, after Claude found ENABLE has 429 unaccented copies of SCOWL's accented words ("cafe" beside "café"), so "theirs if it's real" would show "cafe": "Accent wins (Recommended)". If a word has an accented spelling, typing it without accents shows the accented one. Hyphens and apostrophes stay "theirs if real" ("its" stays its).
3. After the Windows fetch found 43 entries that aren't words (Evidence, below):
   - The 40 abbreviations (`adj`, `bldg`, `tsp`, `misc`): "Remove them (Recommended)", in "Same PR, #158 (Recommended)".
   - `.com`, `and/or` and `d/b/a`, first: "if possible, non alphabetic characters shouldn't really make a difference, lets say someone types app3le it should just be apple. similarly, someone typing well-known, wellknown, and well---known it should all be the same". Asked again whether those letters still score: "No, remove them (Recommended)".
   - Spaces: "Yes, ignore spaces too (Recommended)".
   - PR #158: "Merge when green (Recommended)".

## What Claude measured (2026-11-06)
The pinned files downloaded to the session's scratchpad, outside the repo, with their SHA-256 checked against `DICTIONARY_FILES`, not through `fetch`, so no manifest changed. Counts are of raw tokens in the files, not of parsed entries.
- **Hypothesis:** ENABLE and Moby are letters only, and only SCOWL carries apostrophes, hyphens and accents. **Would be disproved by:** a non-letter line in ENABLE, or none in SCOWL.
- **ENABLE:** 172,823 lines, none outside a to z. Held.
- **SCOWL:** about 14,000 tokens with an apostrophe (`'bout`, `abbé's`), about 9,300 with a hyphen (`a-quiver`) and about 480 with a non-ASCII letter (`abbé`, `aperçu`). Held.
- **Moby:** measured on the Windows PC: `crosswd.txt` has 113,809 lines and `crswd-d.txt` 4,160, none outside a to z, so neither gives a spelling beyond its key. Held.
- **The collision behind answer 2:** 429 accented SCOWL tokens have their stripped form in ENABLE.

## Design (Claude, for approval)
- **The build's output** becomes pairs, one per proper spelling: (`word_key`, `spelling`), where `word_key` is `normalize`'s form, as today, and `spelling` is the source's spelling, lower-case. ENABLE's and Moby's words give a pair whose spelling is their own text. SCOWL's forms give their spelling as the table writes it, after `bare` takes the marks off.
- **Keeping spellings doesn't change the set of keys.** Every filter (size, misspellings, proper nouns, word parts, the offensive lists, the drop file, the 3-letter minimum) still works on the key, and the first fetch kept exactly 16a's 256,476 keys. A pair is kept only if its key is.
- **Three fixes then take 43 keys out** (answer 3). `readLine` read a class only with a part of speech before its slash, so `</abbr?>` was never seen and `PROPER_CLASSES`' `abbr?` never fired: the part of speech may now be empty, which takes 40 abbreviations out. `.com`, on a line with no tag at all, goes on the drop list. `playable` now refuses a slash, as it does a space, which takes out `and/or`, `d/b/a` and `s/he`, the last a spelling of `she` that `she` itself keeps.
- **The shown spelling** (DECISIONS.md, Game 2, updated in this ticket's PR), worked out in the database from a key's spellings:
  The steps read the typed text lower-cased and trimmed, with everything but letters, apostrophes and hyphens taken out, so "caf3e" reads as cafe (answer 3; Claude's reading, review, 2026-11-06).
  1. If that text has no accents and one of the key's accented spellings equals it once its own accents are taken off, show that accented spelling, the first in code-point order if several fit (answer 2; review, 2026-11-06): "cafe" shows café, "abbes" shows abbés, and "abbe's" shows abbé's.
  2. Otherwise, show that text, if it's one of the key's spellings: "chateaus" stays chateaus.
  3. Otherwise, if that text has no accents and the key has an accented spelling, show the first of those in code-point order: "papier mache" shows papier-mâché, "ca-fe" shows café (Claude's reading of answers 2 and 3, as "should all be the same" has to hold for accents too; review, 2026-11-06).
  4. Otherwise, show the first spelling in code-point order.
  
  Step 1 compares with only the accents taken off, so the player's apostrophes and hyphens stand. The first wording, "the first accented spelling in code-point order", would have shown the possessive "abbé's" for a typed "abbes", as `'` sorts before `s`: found by the measurement below, and fixed here to keep answer 2's "Hyphens and apostrophes stay theirs if real".
- **The snapshot and manifest** change shape, which changes the manifest's checksum. Only the Windows PC fetches (HANDOFF; human, 2026-10-26). The human runs `npm run base -- fetch dictionary` there, and copies the snapshot by hand to any other machine.

## Acceptance criteria
- [x] `buildDictionary` returns (key, spelling) pairs, checked by `scripts/dictionary.test.ts` on hand-made input: `it's` and `its` give two spellings for `its`; `well-known` gives `wellknown` → `well-known`; ENABLE's `cafe` and SCOWL's `café` give two spellings for `cafe`.
- [x] The existing filter tests pass unchanged: a blocked or dropped key loses every spelling.
- [x] A fetch on the Windows PC gives exactly 256,476 keys, the same as 16a's manifest, and reports the pair count, before answer 3's fixes (Evidence, fetch 1). The manifest's `items` now counts pairs, not keys (it counted keys in 16a, when each key was one item), so the keys are counted from the snapshot, on that PC after the fetch:
  `node -e "const f=require('fs');const m=JSON.parse(f.readFileSync('data/manifests/dictionary.json','utf8'));const s=JSON.parse(f.readFileSync('data/snapshots/dictionary/'+m.snapshot+'.json','utf8'));console.log('pairs',s.length,'keys',new Set(s.map(e=>e.key)).size)"` *Hypothesis:* the same keys, with more pairs than keys. *Disproved by:* any change in the key count.
- [x] A fetch with answer 3's fixes gives 256,433 keys: fetch 1's, less the 40 abbreviations and the 3 drops, with none added (answer 3; Evidence, fetch 2).
- [x] A class with no part of speech is read, and a slashed form is left out, checked by `scripts/dictionary.test.ts`.
- [x] The four spelling steps above are in DECISIONS.md's Game 2 section, with answer 3's letters-only matching, and each example in them gives that result on the snapshot (Evidence, the rule).

## Out of scope
- The `dictionary_word` table and its load, and so H4 (the dictionary's size in Postgres): they belong to the ticket that builds the table (16b's deferred item, ROADMAP For M16).
- The word check that picks the spelling and drops everything but letters (16d). `normalize` doesn't change: game 1 matches through it, and it keeps digits.

## Numbers
None new. The 3-letter minimum and size 85 are 16a's (`src/config/tunables.ts`).

## Plan
1. The human approves this ticket.
2. Tests first, for the three hand-made cases, then the build change.
3. The human fetches on the Windows PC and copies the snapshot. Claude records the key and pair counts as Evidence.
4. The `reviewer` agent.

## Removes
`buildDictionary`'s keys-only output, replaced by pairs, with no second output kept beside it. 43 keys, 23 dotted spellings on words that stay (`apt.`, `sec.`), and `s/he`.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| This ticket: "the build keeps exactly today's 256,476 keys" | 256,433 keys | The human's answer 3. Keeping spellings alone did keep them (fetch 1) |
| 16b's and this ticket's three spelling steps | Four steps, reading a cleaned text | Answer 3 lets digits, symbols and spaces into a try, so the steps needed a text to read and accents had to win through them. Claude's reading, for the human to overrule |
| 16a's ticket: abbreviations left out | They are, since this ticket | `</abbr?>` wasn't read until now. 16a's own acceptance criteria didn't check for it |

## Evidence
**Tests:** `npx vitest run scripts/dictionary.test.ts`: 24 passed. Written first, they failed (18 failed, 6 passed) before the build change. The old assertions keep their expected keys, read through `keys(...)`, and three new tests cover the spellings.

**Old build against new, on ENABLE and SCOWL** (2026-11-06): the pinned files, SHA-256 checked, run through both `HEAD`'s `buildDictionary` and the new one, from a throwaway script in the session's scratchpad. Moby isn't in it (gutenberg.org refused), so 2 drop words only Moby holds were left out of both runs.
- *Hypothesis:* the same keys, with more pairs than keys, and no character outside the Basic Multilingual Plane. *Disproved by:* any key that differs, or a character past U+FFFF.
- *Result:* `old_keys: 255776, new_keys: 255776, same_keys_same_order: true, pairs: 272580, astral_spellings: 0, keys_with_several_spellings: 16287, accented: 460`. Held.
- It also found the `abbes` case behind step 1's rewording: `abbes` has `abbe's`, `abbes`, `abbé's` and `abbés`.

**Fetch 1, on the Windows PC, with Moby** (2026-11-06, all four files' SHA-256 checked by the fetch): `FETCHED dictionary: 273299 items, snapshot 2026-11-07`, and the ticket's command gave `pairs 273299 keys 256476`.
- *Hypothesis:* the same keys in the same order as 16a's snapshot, more pairs than keys, and spellings holding only letters, `'` and `-`, with nothing past U+FFFF. *Disproved by:* any differing key, or another character in a spelling.
- *Result:* `old_keys 256476 new_keys 256476 same_keys_same_order true`, `astral: 0, accented: 460, upper: 0, nonNfc: 0`. The keys held. **The spellings didn't:** 67 held a `.` or `/`.
- *Why:* all 67 are SCOWL's. 43 keys had no other spelling (`adj.`, `bldg.`, `tsp.`, `.com`), so they were never words; 24 sit beside a plain spelling (`apt.` by `apt`, `s/he` by `she`). 40 of the 43 came through `-adj. </abbr?>` lines, which the part-of-speech pattern didn't read; `.com`, `and/or` and `d/b/a` carry no tag.

**What the fix would do, measured before making it** (a scratch copy of the table with `</` rewritten so the unchanged parser read the class). *Hypothesis:* only SCOWL-only abbreviations go, and no real word. *Disproved by:* a real word removed. *Result:* `keys_removed: 40, keys_added: 0`, all abbreviations, and 23 spellings lost on kept keys. Held. The table's other classes with no part of speech (6,650 `upper?`, 23 `name?`, 4 `demonym`, 3 `upper`, 3 `trademark`) removed no key beyond these.

**Fetch 2, with the fix and the 3 drops** (2026-11-06): `FETCHED dictionary: 273233 items, snapshot 2026-11-07`.
- *Hypothesis:* 256,476 − 40 − 3 = 256,433 keys, none added. *Disproved by:* any other count, or another key removed.
- *Result:* `pairs: 273233, keys: 256433`, `removed 43: adj adv andor approx arr asst attn bldg com cont contd dba deg dep dept div doz enc encl esp est ext fwd gov govt incl int lbs masc mfg misc ono pct pkg pres recd std tbs tbsp tsp vol wkly yrs`, `added 0`, `strictly sorted, no duplicates true`. Held. One spelling stayed outside letters, `'` and `-`: `s/he`, beside `she`.

**Fetch 3, with a slash refused and `andor` and `dba` off the drop list, which would otherwise stop the build as matching nothing** (2026-11-06): `FETCHED dictionary: 273232 items, snapshot 2026-11-07`. *Hypothesis:* the same 256,433 keys, one pair fewer. *Disproved by:* any key changing, or another pair lost. *Result:* `pairs: 273232, keys: 256433`, `removed 0`, `added 0`, the one pair lost `s/he`, none left outside letters, `'` and `-`. Held. The manifest's checksum is `a14ddfb1…`.

**The rule, run over this snapshot** (a throwaway script, 16d builds the real one): 29 tries, each with its result written down first, `disagreements 0 of 29`: `app3le` apple; `wellknown`, `well---known` and `well known` well-known; `caf3e` and `ca-fe` café; `papier mache` and `papiermache` papier-mâché; `aide--memoire` aide-mémoire; `s-he` she; `chateaus` chateaus; `chateau's` château's; `c4fe`, `com`, `adj` and `123` not words. Of the 428 keys with an accented spelling, one shows no accent when only its letters are typed: `chateaus`, a real spelling, so it stands. Of those keys' 454 unaccented spellings, typing one never changes its punctuation (`unaccented spellings on those keys 454 whose punctuation changes 0`).

**Tests:** the two new tests each failed before their fix (`expected [ 'etcet', 'ono', 'lowname' ] to deeply equal []`; `expected [ 'she', 'andor' ] to deeply equal []`), then `npx vitest run scripts/dictionary.test.ts`: 26 passed. `npx eslint` on both files and `npx tsc --noEmit -p .` are clean (the worktree needed `npx next typegen` first).

## Review
- Blocking findings and how each was fixed (the `reviewer` agent, 2026-11-06):
  1. "merges, normalizes, removes duplicates and sorts" read the keys through a `Set`, so a duplicate pair would have passed: it asserts the full pairs again.
  2. Step 1 had no order when several accented spellings fit: the first in code-point order, in the ticket and DECISIONS.md.
  3. The fetch prints only the pair count, and the manifest's `items` changed meaning: acceptance criterion 3 says so and names the command that counts keys.
- Blocking findings from the second review (the `reviewer` agent, 2026-11-06, on the fetch's fix), each fixed:
  1. DECISIONS.md's example "c4fe shows café" was wrong: dropping the digit leaves `cfe`, not a word. It's "caf3e" now.
  2. "No typed text shows `s/he`" was false: "s-he" showed it, by step 3 as it then was. A slash is refused in the build, so that spelling is gone.
  3. The ticket's steps and DECISIONS.md's had drifted apart, with the cleaning unmarked: they match now, marked as Claude's reading, with a Source diff row.
  4. Accents didn't win through junk: "papier mache" showed papier-mache, and 13 keys showed no accent on their bare letters. A step for it is new, checked on all 428 keys.
- Blocking finding from the re-check (the same agent, 2026-11-06): that new step, then step 2, ran before "that text, if it's one of the key's spellings", so "chateaus" showed the possessive `château's`, against answer 2. The two steps swapped; the simulation's check was too weak to see it, and now judges every unaccented spelling's punctuation.
- Deferred to ROADMAP "Next revision": the items under "For M16" marked "Found in M16 16a-2 (review)".
