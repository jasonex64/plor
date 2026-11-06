# M16 16a-2 — The dictionary keeps proper spellings

**Status:** in progress. Approved 2026-11-06 ("yes"); the build change and its tests done; waiting on the fetch on the Windows PC.

## Goal
Make the dictionary build keep each word's proper spelling (`it's`, `well-known`, `café`) beside the stripped form it matches on, so game 2 can show the proper word (16b, answers 12–14).

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

## What Claude measured (2026-11-06)
The pinned files downloaded to the session's scratchpad, outside the repo, with their SHA-256 checked against `DICTIONARY_FILES`, not through `fetch`, so no manifest changed. Counts are of raw tokens in the files, not of parsed entries.
- **Hypothesis:** ENABLE and Moby are letters only, and only SCOWL carries apostrophes, hyphens and accents. **Would be disproved by:** a non-letter line in ENABLE, or none in SCOWL.
- **ENABLE:** 172,823 lines, none outside a to z. Held.
- **SCOWL:** about 14,000 tokens with an apostrophe (`'bout`, `abbé's`), about 9,300 with a hyphen (`a-quiver`) and about 480 with a non-ASCII letter (`abbé`, `aperçu`). Held.
- **Moby:** *unverified*. This session's network refuses gutenberg.org; the build reads it as Latin-1, so it may carry accents. Measured on the Windows PC, where the build runs.
- **The collision behind answer 2:** 429 accented SCOWL tokens have their stripped form in ENABLE.

## Design (Claude, for approval)
- **The build's output** becomes pairs, one per proper spelling: (`word_key`, `spelling`), where `word_key` is `normalize`'s form, as today, and `spelling` is the source's spelling, lower-case. ENABLE's and Moby's words give a pair whose spelling is their own text. SCOWL's forms give their spelling as the table writes it, after `bare` takes the marks off.
- **The set of keys doesn't change.** Every filter (size, misspellings, proper nouns, word parts, the offensive lists, the drop file, the 3-letter minimum) still works on the key, so the build keeps exactly today's 256,476 keys. A pair is kept only if its key is.
- **The shown spelling** (DECISIONS.md, Game 2, updated in this ticket's PR), worked out in the database from a key's spellings:
  1. If the typed text, lower-cased and trimmed, has no accents and one of the key's accented spellings equals it once its own accents are taken off, show that accented spelling (answer 2): "cafe" shows café, "abbes" shows abbés, and "abbe's" shows abbé's.
  2. Otherwise, show the typed text, lower-cased and trimmed, if it's one of the key's spellings.
  3. Otherwise, show the first spelling in code-point order.
  
  Step 1 compares with only the accents taken off, so the player's apostrophes and hyphens stand. The first wording, "the first accented spelling in code-point order", would have shown the possessive "abbé's" for a typed "abbes", as `'` sorts before `s`: found by the measurement below, and fixed here to keep answer 2's "Hyphens and apostrophes stay theirs if real".
- **The snapshot and manifest** change shape, which changes the manifest's checksum. Only the Windows PC fetches (HANDOFF; human, 2026-10-26). The human runs `npm run base -- fetch dictionary` there, and copies the snapshot by hand to any other machine.

## Acceptance criteria
- [ ] `buildDictionary` returns (key, spelling) pairs, checked by `scripts/dictionary.test.ts` on hand-made input: `it's` and `its` give two spellings for `its`; `well-known` gives `wellknown` → `well-known`; ENABLE's `cafe` and SCOWL's `café` give two spellings for `cafe`.
- [ ] The existing filter tests pass unchanged: a blocked or dropped key loses every spelling.
- [ ] A fetch on the Windows PC gives exactly 256,476 keys, the same as 16a's manifest, and reports the pair count. *Hypothesis:* the same keys, with more pairs than keys. *Disproved by:* any change in the key count.
- [ ] The three spelling steps above are in DECISIONS.md's Game 2 section.

## Out of scope
- The `dictionary_word` table and its load, and so H4 (the dictionary's size in Postgres): they belong to the ticket that builds the table (16b's deferred item, ROADMAP For M16).
- The word check that picks the spelling (16d).

## Numbers
None new. The 3-letter minimum and size 85 are 16a's (`src/config/tunables.ts`).

## Plan
1. The human approves this ticket.
2. Tests first, for the three hand-made cases, then the build change.
3. The human fetches on the Windows PC and copies the snapshot. Claude records the key and pair counts as Evidence.
4. The `reviewer` agent.

## Removes
`buildDictionary`'s keys-only output, replaced by pairs, with no second output kept beside it.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
**Tests:** `npx vitest run scripts/dictionary.test.ts`: 24 passed. Written first, they failed (18 failed, 6 passed) before the build change. The old assertions keep their expected keys, read through `keys(...)`, and three new tests cover the spellings.

**Old build against new, on ENABLE and SCOWL** (2026-11-06): the pinned files, SHA-256 checked, run through both `HEAD`'s `buildDictionary` and the new one, from a throwaway script in the session's scratchpad. Moby isn't in it (gutenberg.org refused), so 2 drop words only Moby holds were left out of both runs.
- *Hypothesis:* the same keys, with more pairs than keys, and no character outside the Basic Multilingual Plane. *Disproved by:* any key that differs, or a character past U+FFFF.
- *Result:* `old_keys: 255776, new_keys: 255776, same_keys_same_order: true, pairs: 272580, astral_spellings: 0, keys_with_several_spellings: 16287, accented: 460`. Held.
- It also found the `abbes` case behind step 1's rewording: `abbes` has `abbe's`, `abbes`, `abbé's` and `abbés`.

**Still to come:** the fetch on the Windows PC, with Moby, against 16a's 256,476 keys.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
