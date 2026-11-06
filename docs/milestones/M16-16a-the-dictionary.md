# M16 — 16a, the dictionary

**Status:** in review in PR #155 (approved 2026-11-05: "Approve, start dictionary"). 256,476 words built, its database size to be measured in 16b.

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

## Answers (human, 2026-11-05)
1. Size: "About 239,000 words (Recommended)". That is SCOWL's size 85, with ENABLE and Moby's crossword list, and it brings UKACD's notice.
2. Offensive words: "Catch forms, Claude checks (Recommended)". Forms go automatically, and Claude reads the near-matches and flags anything doubtful.
3. Shortest word: "3 letters or more (Recommended)".
4. Punctuation (M16 S19): "Yes, ignore it (Recommended)". `it's` is `its`, and hyphenated words also count typed joined up.
5. Words with an ordinary meaning and a slur meaning, such as chink, dyke, retard, nonce, homo and niggardly: "Drop them all (Recommended)". **Claude's reading:** words like those. Everyday words whose slur sense is rare stay, so the word list isn't hollowed out: spade, slope, slant, nip, fairy, hoe, knob, prick, sod, shag, cripple, moron, imbecile, hunky and fruitcake, and queer, as an identity word (answer 6).
6. Adult words that aren't insults: "Keep identity and medical (Recommended)". Identity words (bisexual, asexual, queer) and medical words (vaginal, testicle) stay; explicit ones (erotica, pornographic, orgasmic) go.
7. The real count: "Keep 258,000 (Recommended)", told that the first measurement skipped lines of the table.
8. After the review, told the list was now 256,476 words and that criterion 4 had been reworded, as no check can prove no form remains: "Accept both (Recommended)".
9. `blackcock`, a bird name the joined-phrase check took out: "Leave it out (Recommended)".

## Design
- **`npm run base -- fetch dictionary`,** beside the answer base's sets (DECISIONS.md, Answer database imports), so there is one way to fetch outside data: pinned downloads checked against their SHA-256, a snapshot in `data/snapshots/`, a committed manifest. The parsing and merging are pure functions in `scripts/dictionary.ts`.
- **`normalize`** is the one normalization, and LDNOOBW and `PLOR_LISTED` are the one offensive list.
- **SCOWL's table is read as its README defines it.** Left out: size above 85, any capitalized lemma (proper nouns), abbreviations, prefixes, suffixes, multi-word parts, non-words, spellings marked `x` (misspellings), forms marked `!` ("nearly non-existent"), and a whole group whose lemma is marked `!`.
- **Forms come from SCOWL's groups,** not a guess at endings: if any word in a group is listed, or the group carries SCOWL's own offensive or vulgar note, every word in that group is out of the whole dictionary, ENABLE's and Moby's copies too. A word sharing a spelling with an offensive group goes with it: the human accepted losing a few innocent words.
- **`data/dictionary-drop.json`:** the words Claude took out after reading the near-matches and testing for slurs no list names. It isn't Plor's list because that list also drops names from the answer base at load, and game 1's data shouldn't change for game 2. A dropped word takes its SCOWL group with it, and a drop that matches nothing stops the build.
- **No database table yet:** 16b creates it, and H4 is measured there.

## Acceptance criteria
- [x] `npm run base -- fetch dictionary` writes the snapshot and manifest, and refuses a download whose checksum differs.
- [x] Every word is lowercase a to z, 3 letters or more, with no duplicates (`scripts/dictionary.test.ts`).
- [x] Two runs give the same checksum.
- [x] No listed word, no word SCOWL marks offensive or vulgar and no word in the drop file is in the list, and the form scans below were read. **This can't prove no offensive word remains:** see "What it can't prove". Reworded from "No listed word, form of one, or word SCOWL marks offensive or vulgar is in the list", which no check can prove (answer 8).
- [x] Claude has read the near-matches, and doubtful ones are put to the human.

## Out of scope
- Game 2's routes, the picker and the database's game tables (16b to 16d).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 85 | SCOWL size: how far down the list of rarer words to go | Human, 2026-11-05, answer 1 |
| 3 | Fewest letters in a word | Human, 2026-11-05, answer 3 |

## Plan
1. Measure with a throwaway script, against the hypothesis. Done.
2. Ask the human what the numbers leave open. Done.
3. The script and its tests. Done.
4. Check the real count. The measurement skipped about 47,000 SCOWL lines it couldn't read (a word at two sizes, or with spelling codes). **Expected:** 250,000 to 320,000 words, as those lines add mostly rare words. **Disproved by:** a count outside that range. Either way the human hears the real number, since they chose "about 239,000".
5. Read the near-matches. Independent review.

## Removes
Nothing: this is the first dictionary. It adds no second fetch path, normalizer or game-wide offensive list: it runs through `npm run base -- fetch`, `normalize` and `isListed`'s lists. The drop file is the one new list, for the reason in Design.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The README's grammar has one size per line | A word at two sizes takes the smaller | The file itself has lines like `70 [moby] 85 [ukacd]`: the word is in the list from size 70 |
| POS classes "can't be used to reliably filter out proper nouns" | Capitalized lemmas go, as well as those classes | The README says so itself |
| SCOWL's note marks "only the worst offenders" | The note, Plor's lists and a drop file | The README says so itself |

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
| H4 | **Not measured, moved to 16b:** Docker was off, and 16b creates the table |
| H5 | Held, at size 85: 333 two-letter and 897 three-letter substrings in 500 or more words; 43 two-letter and 735 three-letter in 100 to 200 words |
| H6 | Held: the lists remove 173 words at size 85, and up to 391 near-forms survive. That count is an upper limit, as a close prefix can be an innocent word |

**The build, 2026-11-05.** Pacific; the snapshot's date is UTC. `npm run base -- fetch dictionary` took 11 s after the fix below.

Plan step 4's expectation **held**: the first full build gave 258,305 words, inside 250,000 to 320,000, where the throwaway script's 239,410 had skipped about 47,000 table lines. At that size, 969 three-letter substrings sit in 500 or more words, and 732 in 100 to 200.

- **Speed:** the first build ran over 300 s, as `isListed` walks both lists per call; `isListedWord` looks one word up in a set.
- **SCOWL's own notes:** 75 lines carry `offensive` or `vulgar` notes, all taken out with their groups.
- **The read:** 2,396 words holding a listed word were read, and most are innocent (`assess`, `therapist`, `basement`). A probe for slurs and vulgar words no list names found more, so the drop list isn't only forms of listed words.
- **What it can't prove:** nobody has read all 256,476 words, so an unlisted offensive word may remain. A word found later goes in the drop file, followed by a fetch.
**The review's blockers, fixed.** The reviewer's first pass found criterion 4 ticked but false, and all four findings held up when checked:
1. A leading `!` marks the whole group (README, "Database structure"; libscowl's `group_rank`), where Claude had read it as the lemma alone. About 1,450 words left the list. The count the human approved at "Keep 258,000" included them.
2. A listed phrase hyphenated in the table reached the check joined up, so a slur got through. `isListedWord` now holds phrases joined up, which also takes `goddamn` and its spellings and the bird name `blackcock` and its plural (answer 9).
3. `all` didn't hold `!` forms though its comment said so. They stay out, as they'd block innocent words such as `spiced`, so the comment changed, and the words are caught by the group mark or the drop file.
4. Forms in another group or a plain list survived, so a form scan was added: 168 words looked like forms of a listed or dropped word, Claude read them, and 18 went in the drop file. The rest are mostly lookalikes (`butter`, `spices`, `rapier`). A few kept ones are judgement calls, and answer 5's rule was applied: mild or rare offence stays.

The same pass's own check found another bug: a drop held only by ENABLE or Moby stayed in, as the last filter looked only at listed words. `buildDictionary` now checks the drop list there too, with a test.

**The final list:** 256,476 words, 2.65 MB as plain text, manifest SHA-256 `58af970abfaadcc8`…, the same over two runs. The snapshot's own checks: 0 words outside a to z or under 3 letters, 0 duplicates, sorted, 0 listed words, 0 of the 313 drops, and every sample innocent word kept. 967 three-letter substrings sit in 500 or more words, and 736 in 100 to 200. `vitest run scripts src/game/misses.test.ts`, without the database tests: 6 files, 131 tests passed.
**CI failures on PR #155.** Three different jobs failed on one commit, none in code this PR changed. Reruns would only have moved the failure, so each was traced and fixed, each as a cause that would recur at random.

| Failure | Cause | Fix | Expected in CI | Disproved by |
|---|---|---|---|---|
| `db` and `e2e`: "address already in use" on 54322, 54324, before any test | Those ports sit in Linux's outgoing range, so an image pull can hold one. **Inferred:** the range is printed by the fix, and no failing run was caught holding the port | Reserve 54320 to 54329, the ports in `supabase/config.toml`, before the stack starts | The step prints a range holding 54320 to 54329 | The same error after this |
| `alive.e2e.ts:209`: the pop was false | `useGrown` adds the class in an effect, a render after the count shows, and the test read once. **Read from the code** | Poll for the same class, which stays once added. The assertion is unchanged and fails if it never pops | Passes | Fails: the pop never came |
| `test-run.e2e.ts:60`: not visible in 5 s | The dev server compiles a route on first request, and this test is the first to reach `/admin/test`. **Inferred** from the log and test order | `e2e/warm-routes.ts` asks for every route once before the tests. No limit grew | The run's log shows routes taking seconds, `/admin/test/warm` among them | Every route under about a second: compiling isn't the cause |

ROADMAP's "Clicks that don't navigate under load" may share the third cause (*unverified*), so it stays open until runs show otherwise.

## Review
- Blocking findings and how each was fixed: the first pass's four, in Evidence, "The review's blockers, fixed", all closed on the recheck. The recheck's two were ticket text: criterion 4's rewording, put to the human (answer 8), and a wrong claim about `oldsquaw`, corrected (answer 9).
- Deferred to ROADMAP "Next revision": five items under "For M16", one of them for the human.
