# M16 — 16a, the dictionary

**Status:** in progress (approved 2026-11-05: "Approve, start dictionary"). Measuring first; the design follows the human's answers to what the measurements leave open.

## Goal
One filtered word list that game 2 judges every typed word against and picks each day's substrings from, built by a script from pinned open sources.

## Who uses it / what breaks without it
- Used by: every game 2 player, through the server's word check (16d), and the daily picker (16c).
- Breaks without it: game 2 can't judge a word, and S18's difficulty bands can't be set, because they are counted in this list.

## Source
- ENABLE, Moby and the English Speller Database (SOURCES.md, added 2026-11-05).
- LDNOOBW and `src/game/plor-listed.ts`: the offensive words already kept out of the answer base.
- `normalize` in `src/content/puzzle.ts`: the one normalization for typed text.
- `docs/DECISIONS.md`, Answer database imports: snapshots outside git, committed manifests.
- M16 ticket: S2, S3, S18, S19 and answer 3.

## Hypothesis (written before the measurement)
| # | Expected | Why | Disproved by |
|---|---|---|---|
| H1 | ENABLE gives about 172,800 words | Its host's README says 172,823 lines | A count more than 1% away |
| H2 | ENABLE + Moby's crossword list + SCOWL gives 250,000 to 450,000 words | A community tool puts JKLM's list at 200,000+ (*unverified*), and these lists overlap heavily | A count outside that range at every SCOWL size |
| H3 | The word list is under 5 MB as plain text | 172,823 ENABLE words take 1.7 MB | Over 5 MB |
| H4 | The list and its lookup take under 60 MB in Postgres | A short text key per row, plus its index | Over 184 MB, what's left of the Free plan's 500 MB after the base's 316 MB |
| H5 | Plenty of substrings fit S3's bands: more than 500 words in the middle round, 100 to 200 in the last | Common letter pairs and triples appear in thousands of words | Too few two- or three-letter substrings in a band to last the beta |
| H6 | LDNOOBW and Plor's list remove under 1,000 words, and forms of those words survive | LDNOOBW is short and matches whole words, so plurals and compounds slip past it | No surviving forms |

## Acceptance criteria
Drafted after the design answers.

## Out of scope
- Game 2's routes, the picker and the database's game tables (16b to 16d).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| The SCOWL size | How far down the list of rarer words to go | Open: a human number, after the measurement |

## Plan
1. Measure with a throwaway script, against the hypothesis.
2. Ask the human what the numbers leave open.
3. Then write the design, the script and its tests.

## Removes
Nothing yet: nothing is built.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
**The measurement, 2026-11-05.** A throwaway script in the session's scratchpad, printing counts only, over the pinned files in SOURCES.md, with `normalize`, LDNOOBW and `PLOR_LISTED` from this branch. Words are a to z after `normalize`, 2 letters or more, with SCOWL's name, place, upper-case and abbreviation entries left out.

| SCOWL size | ENABLE + SCOWL | + Moby crossword | + Moby's big list |
|---|---|---|---|
| 60 | 177,570 | 178,429 | 379,457 |
| 70 | 179,754 | 180,601 | 381,067 |
| 80 | 194,742 | 195,541 | 388,742 |
| 85 | 238,650 | 239,410 | 409,782 |

| Hypothesis | Result |
|---|---|
| H1 | Held: 172,823 |
| H2 | **Disproved** for the crossword list: 174,571 to 239,410 at every size, because 117,065 of Moby's 117,969 crossword words are already in ENABLE, so it adds about 900. Moby's big list, `single.txt`, reaches the range but adds 170,172 words SCOWL and ENABLE don't have, and a sample of 24 was mostly obscure or archaic |
| H3 | Held: 2.44 MB at size 85 |
| H4 | **Not measured:** Docker was off |
| H5 | Held, at size 85: 333 two-letter and 897 three-letter substrings in 500 or more words; 43 two-letter and 735 three-letter in 100 to 200 words |
| H6 | Held: the lists remove 173 words at size 85, and up to 391 near-forms survive. That count is an upper limit, as a close prefix can be an innocent word |


## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
