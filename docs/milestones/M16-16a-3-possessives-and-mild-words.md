# M16 16a-3 — Possessives out, ordinary and mild words back

**Status:** done: approved ("Approve, build it", 2026-11-06), built, fetched on the Windows PC and reviewed, in PR #159, which merges on green CI at the human's "Merge when green".

## Goal
Finish game 2's word list: take possessives out, keep contractions, and bring back the ordinary and mild words the offensive filter caught.

## Who uses it / what breaks without it
- Used by: every game 2 player, and 16c's picker, which counts the list's words.
- Breaks without it: a player typing `finger`, `throat`, `shrimp` or `came` is told it isn't a word, and `sss` looks like a good round through `boss's`.

## Source
- `docs/milestones/M16-game-2-substrings.md`, S18, S20, S21 and "Measuring common words".
- `docs/milestones/M16-16a-the-dictionary.md`: the filters and the drop list. Its answer on losing words was given before anyone had read what was lost.
- `docs/SOURCES.md`: LDNOOBW, and the SCOWL table, read as in 16a.
- `src/game/plor-listed.ts`: game 1's list, which doesn't change.

## The human's answers (2026-11-06)
1. Possessives: "Not accepted at all".
2. Contractions: "also we can keep contractions".
3. `smut`, blocked by LDNOOBW: "Allow mild words back", to an option that said it needs "a hand-kept exceptions list that someone has to judge, word by word".
4. This ticket and both word lists: "Approve, build it".
5. `something's`, `everyone's` and 11 like them, which can be a contraction or a possessive: "Keep all 13 (Recommended)".

## What Claude measured (2026-11-06)
- **Contractions can be told from possessives.** *Hypothesis:* the table marks them differently. *Disproved by:* `he's` as an ordinary noun form. *Result:* contractions are lemmas with their own tag (`he's <s>`, `don't <s>`), and possessives are forms after a lemma (`boss <n_v>: …, boss's`). Held.
- **What the filter blocks, of the 173,630 ENABLE and Moby words of 3 letters or more:** 668 words: 169 on LDNOOBW or Plor's list, 209 on the drop file, and 290 caught only by sharing a SCOWL group with one of those. *Hypothesis:* most are slurs or their forms, with a smaller group of ordinary words. Held, but the ordinary group holds very common words, such as `came` and `finger`. Words only SCOWL holds aren't in this count.

## Design (Claude, for approval)
- **Possessives:** `readLine` leaves out any form ending in `'s` or `s'`, unless the line's part of speech is `s`, the table's contraction tag, or `pn`, a pronoun (answer 5), so `boss's`, `tubas'` and `baker's` never become entries and `he's`, `it's` and `something's` stay. The first draft kept every lemma, which would have kept 28 possessive-shaped lemmas such as `baker's` and `master's`: found by measuring before the test was written. `back's` goes as a spelling, while `backs` stays, and typing "back's" still matches `backs` under the letters-only rule, shown as `backs`.
- **`data/dictionary-allow.json`,** beside the drop file: words game 2 keeps though a list or group would block them. An allowed key survives every offensive filter. An entry that matches nothing, or that isn't blocked, stops the build, as a drop does, so the file can't go stale. A word that isn't on it stays blocked, so `fingering` stays out while `finger` comes back.
- **Game 1 doesn't change:** LDNOOBW and `PLOR_LISTED` stay as they are for the answer base and misses. The allow file is read only by `scripts/dictionary.ts`.
- **Accepted words can be seen by others** once 16f shares them. Words in List 2 would then show on friends' screens, which is part of what the human approves.
- **The rule's examples change:** DECISIONS.md's `abbe's` and `chateaus` examples rested on possessive spellings and are rewritten. Step 2 now never decides a word that has an accented spelling (0 such spellings, Evidence), but it stays for `well-known` and `he's`.

## List 1: ordinary words caught by accident (Claude, for approval)
bareback, bastinado, bastinadoing, butt, butted, butting, butts, came, dicker, dickered, dickering, dickers, dickens, dike, diked, dikes, diking, domination, dominations, eunuch, eunuchs, escort, escorted, escorting, escorts, faecal, fecal, fig, figs, finger, fingered, fingers, fist, fisted, fists, hardcore, headshrinker, headshrinkers, nipple, nippled, nipples, pantyhose, peg, pegged, pegs, playboy, playboys, rim, rimmed, rims, sawbones, sawboneses, scat, scats, scatted, scatting, scissor, scissored, scissors, shrank, shrink, shrinking, shrinks, shrunk, shrunken, shrimp, shrimped, shrimps, snatch, snatched, snatches, snatching, snowball, snowballed, snowballs, swinger, swingers, throat, throated, throats, undress, undressed, undresses, undressing

## List 2: mild words (Claude, for approval)
arse, arses, bastard, bastards, bimbo, bimboes, bimbos, boob, boobs, bugger, buggered, buggering, buggers, bustier, bustiest, busty, crap, crapped, crapper, crappers, crapping, craps, erotic, erotics, fart, farted, farting, farts, grope, groped, gropes, groping, hooker, hookers, horniest, hornier, horny, hump, humped, humps, kinkier, kinkiest, kinky, nude, nuder, nudes, nudest, nudity, pantie, panties, panty, pissed, sex, sexed, sexes, sexier, sexiest, sexing, sexual, sexualities, sexuality, sexually, sexy, smut, smuts, smutted, smutting, suck, sucked, sucking, sucks, topless, tosser, tossers, voyeur, voyeurs

Slurs, swearing and graphic words stay out. Nothing here comes from `data/dictionary-drop.json`. Words only SCOWL holds that the filter caught were read during the build: 225, of which 125 are on a list or the drop file. Of the other 100, none is an everyday word; six harmless ones are in ROADMAP for the human, and none was added.

## Acceptance criteria
- [x] `readLine` leaves out `boss's`, `tubas'` and `baker's` and keeps `he's` and `something's`, checked by `scripts/dictionary.test.ts` on hand-made lines.
- [x] An allowed key survives a list and a group, a word that isn't allowed in that group doesn't, and an allow entry that matches nothing or isn't blocked stops the build, checked by tests.
- [x] The Windows fetch shows the key change is exactly the possessive-only keys out and the approved lists in: every removed key held only spellings ending in `'s` or `s'` (one, `pj's`, is really a plural: ROADMAP), every added key is on a list. *Hypothesis:* no other key moves. *Disproved by:* any other key.
- [x] `finger`, `throat`, `came` and `smut` are in the snapshot, `fingering` isn't, and `he's` and `don't` are.
- [x] DECISIONS.md's Game 2 says what's accepted, with the examples rewritten.

## Out of scope
- The everyday mark and the floor: 16c, the mark's first caller.
- Game 1's lists.
- Any change to the 3-letter minimum or SCOWL size.

## Numbers
None new.

## Plan
1. The human approves this ticket and both lists.
2. Tests first, then `scripts/dictionary.ts` and the allow file.
3. Fetch on the Windows PC, compare the keys.
4. The `reviewer` agent, then a PR.

## Removes
2,116 possessive-only keys, every possessive spelling but the 26 contractions and pronoun forms ending in `'s`, and the `wordList` reader's two copies of a check (the drop file's reader is now the one reader). The filter's 160 lost words come back.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 16a's ticket: every word in a listed group is out, and "the human accepted losing a few innocent words" | 160 of them are back | The human's answers 3 and 4, once the words lost had been read |
| 16a's and 16a-2's tests keep a possessive (`tuba's`) | They leave it out | The human's answer 1 changed the rule, so that test's expectation changed with it. Its fixture for `it's` also said `<pn>`, where the table says `<s>` |

## Evidence
**Tests:** four written first, and they failed (`expected [ 'bakers', 'chemists', 'hes', 'dont' ] to deeply equal [ 'hes', 'dont' ]`; `expected [] to deeply equal [ 'finger', 'fingers' ]`), and a fifth for answer 5 (`expected [ 'something' ] to deeply equal [ 'something', 'somethings' ]`), then `npx vitest run scripts/dictionary.test.ts`: 30 passed. `npx eslint` on both files and `npx tsc --noEmit -p .` are clean.

**Where possessive shapes sit in the table.** *Hypothesis:* forms after a lemma are possessives, and contractions are lemmas. *Disproved by:* a contraction after a lemma. *Result:* 15,214 lower-case forms after lemmas: 13,736 under nouns, 1,465 under noun-verbs and 13 under pronouns. Those 13 disproved it: `something <pn>: -, -, -, something's` is a contraction in "something's wrong", found in review, so the human chose (answer 5). The tagless lemmas (`baker's`) changed the design too.

**The first fetch, on the Windows PC** (2026-11-06): `FETCHED dictionary: 259955 items, snapshot 2026-11-07`. *Hypothesis:* the only keys to move are possessive-only ones out and the 160 in. *Disproved by:* any other key. *Result:* `keys: 254468, prevKeys: 256433, removed: 2125, added: 160`, `removed not possessive-only: 0`, `added not on allow: 0`, `allow not added:` none, `strictly sorted true`. Held. `finger`, `throat`, `came`, `smut`, `hes` and `dont` are in; `fingering`, `bosss`, `citys` are out.

**The second fetch, with answer 5** (2026-11-06): `FETCHED dictionary: 259968 items, snapshot 2026-11-07`. *Hypothesis:* 13 more pairs and at most 13 more keys. *Disproved by:* anything else moving. *Result:* `pairs: 259968, keys: 254477`, `removed 0`, `added 9`, `pairs dropped on kept keys` none, `strictly sorted, no duplicates true`. Held. Against the list before this ticket: 2,116 keys out, 160 in. Spellings ending in a possessive shape: 26: `another's anybody's anyone's anything's everybody's everyone's everything's here's he's how's it's let's nobody's nothing's one's other's she's somebody's someone's something's that's there's what's when's where's who's`. The manifest's checksum is `c733819b…`.

**The spelling rule, run over this snapshot** (a throwaway script): `disagreements 0 of 32`, including `boss's` and `bosss` not words, `abbe's` abbés, `he's` he's, `hes` hes. Of the 426 keys with an accented spelling, none shows an unaccented one on its bare letters.

## Review
- Blocking findings and how each was fixed (the `reviewer` agent, 2026-11-06):
  1. "None a contraction" was false: 13 pronoun forms can be one, so `nothing's` stayed and `something's` went. The human's answer 5; a pronoun's forms stay.
  2. "13,680 forms" didn't reproduce: it's 15,214.
  3. "30 lemmas such as `x's`" was wrong: it's 28, and `x's` was never kept. "Possessive-only" holds by shape only, as `pj's` is a plural: said in the criterion, and in ROADMAP.
- Deferred to ROADMAP "Next revision": the items under "For M16" marked "Found in M16 16a-3 (review)".
