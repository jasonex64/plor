# M16 16a-3 — Possessives out, ordinary and mild words back

**Status:** draft, waiting on the human's approval of the two word lists below.

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

## What Claude measured (2026-11-06)
- **Contractions can be told from possessives.** *Hypothesis:* the table marks them differently. *Disproved by:* `he's` as an ordinary noun form. *Result:* contractions are lemmas with their own tag (`he's <s>`, `don't <s>`), and possessives are forms after a lemma (`boss <n_v>: …, boss's`). Held.
- **What the filter blocks, of the 173,630 ENABLE and Moby words of 3 letters or more:** 668 words: 169 on LDNOOBW or Plor's list, 209 on the drop file, and 290 caught only by sharing a SCOWL group with one of those. *Hypothesis:* most are slurs or their forms, with a smaller group of ordinary words. Held, but the ordinary group holds very common words, such as `came` and `finger`. Words only SCOWL holds aren't in this count.

## Design (Claude, for approval)
- **Possessives:** `readLine` leaves out a derived form ending in `'s` or `s'`, so `boss's` and `tubas'` never become entries. A lemma keeps its spelling, so contractions (`he's`, `it's`) stay. `back's` goes as a spelling, while `backs` stays, and typing "back's" still matches `backs` under the letters-only rule, shown as `backs`.
- **`data/dictionary-allow.json`,** beside the drop file: words game 2 keeps though a list or group would block them. An allowed key survives every offensive filter. An entry that matches nothing, or that isn't blocked, stops the build, as a drop does, so the file can't go stale. A word that isn't on it stays blocked, so `fingering` stays out while `finger` comes back.
- **Game 1 doesn't change:** LDNOOBW and `PLOR_LISTED` stay as they are for the answer base and misses. The allow file is read only by `scripts/dictionary.ts`.
- **Accepted words can be seen by others** once 16f shares them. Words in List 2 would then show on friends' screens, which is part of what the human approves.
- **The rule's examples change:** DECISIONS.md's `abbe's` and `chateaus` examples rest on possessive spellings and are rewritten.

## List 1: ordinary words caught by accident (Claude, for approval)
bareback, bastinado, bastinadoing, butt, butted, butting, butts, came, dicker, dickered, dickering, dickers, dickens, dike, diked, dikes, diking, domination, dominations, eunuch, eunuchs, escort, escorted, escorting, escorts, faecal, fecal, fig, figs, finger, fingered, fingers, fist, fisted, fists, hardcore, headshrinker, headshrinkers, nipple, nippled, nipples, pantyhose, peg, pegged, pegs, playboy, playboys, rim, rimmed, rims, sawbones, sawboneses, scat, scats, scatted, scatting, scissor, scissored, scissors, shrank, shrink, shrinking, shrinks, shrunk, shrunken, shrimp, shrimped, shrimps, snatch, snatched, snatches, snatching, snowball, snowballed, snowballs, swinger, swingers, throat, throated, throats, undress, undressed, undresses, undressing

## List 2: mild words (Claude, for approval)
arse, arses, bastard, bastards, bimbo, bimboes, bimbos, boob, boobs, bugger, buggered, buggering, buggers, bustier, bustiest, busty, crap, crapped, crapper, crappers, crapping, craps, erotic, erotics, fart, farted, farting, farts, grope, groped, gropes, groping, hooker, hookers, horniest, hornier, horny, hump, humped, humps, kinkier, kinkiest, kinky, nude, nuder, nudes, nudest, nudity, pantie, panties, panty, pissed, sex, sexed, sexes, sexier, sexiest, sexing, sexual, sexualities, sexuality, sexually, sexy, smut, smuts, smutted, smutting, suck, sucked, sucking, sucks, topless, tosser, tossers, voyeur, voyeurs

Slurs, swearing and graphic words stay out. Nothing here comes from `data/dictionary-drop.json`. Words only SCOWL holds that the filter caught are read during the build, and any Claude would add go to the human first.

## Acceptance criteria
- [ ] `readLine` leaves out `boss's` and `tubas'` and keeps `he's`, checked by `scripts/dictionary.test.ts` on hand-made lines.
- [ ] An allowed key survives a list and a group, a word that isn't allowed in that group doesn't, and an allow entry that matches nothing or isn't blocked stops the build, checked by tests.
- [ ] The Windows fetch shows the key change is exactly the possessive-only keys out and the approved lists in: every removed key is possessive-only, every added key is on a list. *Hypothesis:* no other key moves. *Disproved by:* any other key.
- [ ] `finger`, `throat`, `came` and `smut` are in the snapshot, `fingering` isn't, and `he's` and `don't` are.
- [ ] DECISIONS.md's Game 2 says what's accepted, with the examples rewritten.

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
Possessive-only keys, about 2,100 less the contractions; every `'s` and `s'` derived spelling; the "few innocent words" the filter took.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
