# M13 13e-10 — New areas and jobs

**Status:** in review (approved by the human, 2026-10-27: "I approve 13e-10's design as drafted. Build it."; the batch PR'd with simulate at 21 of 30, human: "PR the batch now (Recommended)"; the letter blocks are the next sub-ticket)

## Goal
Make the simulator check what 13e's Done needs, 30 days drafted in a row, then add a batch of 20–30 categories from areas no category covers yet, plus narrow kinds of jobs, toward that goal (170 categories before this batch).

## Who uses it / what breaks without it
- **Used by:** the drafting session and every player, as 13e-7 to 13e-9; the stop check is used by every later batch.
- **Breaks without it:** at 170 categories a day can't be drafted every day (7 a day × the 30-day gap needs 210 at least). And nothing checks consecutive days today: `npm run draft -- simulate` drafts 40 days spaced 3 apart, so a bank that fails some day of a real month can pass it.

## What the human decided (2026-10-27)
Round 1, the long-term picture:
- When growth stops: **"When 30 days in a row draft (Recommended)"**: batches continue until a trial draft of 30 straight days succeeds, which may take a little more than 210; each extra batch is its own PR.
- The mix: **"New areas first (Recommended)"**: mostly things no category covers yet; narrower slices of old ones only when new areas run thin.
- People: **"Jobs only, closely reviewed (Recommended)"**: professions and their kinds, every member reviewed for slurs and insults; thief, servant and other people-by-behaviour branches stay out.
- Approval: **"You merge each (Recommended)"**: each batch's PR waits for the human's merge, flags listed (13e's rule; the overnight "merge on green" rule doesn't apply).

Round 2, the collisions:
- Card games: **"Within tabletop game (Recommended)"**: WordNet's card game is its own category, `within` tabletop_game, so a day never asks both.
- The check: **"Simulate does 30 in a row (Recommended)"**: `npm run draft -- simulate` drafts 30 consecutive days, replacing the 40 days spaced 3 apart.
- Jobs: **"Narrow kinds (Recommended)"**: one category per kind (doctor, farmer, lawyer…), each small enough to review every member; no broad "Name a job".

Unchanged from 13e and the overnight rules: 20–30 categories a batch, 10 members at least, 6 familiar host answers each naming one member, a category inside an old one is kept as `within`, alcohol allowed, and a weak list (under 6 host answers, or blocking the simulator) is left out and listed in the PR.

## Source
- **SOURCES.md, Open English WordNet (M13, D2):** each category a WordNet branch already loaded by `oewn-nouns`.
- **13d:** the 30-day gap (`REPEAT_GAP_DAYS`) and 7 questions a day (`QUESTIONS_PER_DAY`), which make 210 the least that can work. The gap is per category; a family only keeps two categories off one day (`src/content/bank.ts`, `gapProblems`, `pickQuestions`), so a `within` category adds a full slot.

## Design
1. **The simulator** (`scripts/draft.ts`, `simulate`) drafts 30 consecutive days from its start date instead of 40 days spaced 3 apart, with the same output lines and the same `DRAFTED n of 30` total. 13e's Done check becomes this run passing 30 of 30.
2. **The batch: 20–30 categories with bank questions.** Measured on the Mac's base (2026-10-27; members with a typeable name):
   - new areas: book (`06422547-n`, 86), academic degree (`06710094-n`, 63), ceremony (`01029321-n`, 60), exercise (`00625978-n`, 59), engine (`03292644-n`, 49), party (`08273889-n`, 37), grain (`07818393-n`, 24), cloud (`11459786-n`, 19);
   - card game (`00489236-n`, 50), `within` tabletop_game;
   - jobs: kinds of doctor (`10040615-n`, 55), farmer (`10098586-n`, 26), lawyer (`10269647-n`, 19);
   - the rest scouted the same way from new areas (WordNet roots no category covers, each prompt checked against its members), then narrower slices of old ones only if new areas run thin.
3. **Each list reviewed** with `npm run base -- review`: LDNOOBW's and Plor's flags, two parents, shared names; for the jobs, every member read for slurs and insults, which are dropped by ID in `data/listed.json` (13e-9b) or the category left out.
4. **One PR**, which the human merges. Later batches follow this ticket's rules, each its own sub-ticket, until simulate drafts 30 of 30.

## Built (2026-10-27, the Mac)
- **The simulator** drafts 30 consecutive days, and each drafted day joins the past days the next is drafted against. The old simulator drafted each date against the days on disk only, so it never tested the gap between its own days: at 170 categories every day would have drafted, whatever the gap.
- **check-bank** (its own commit, since the check was missing a rule): a letter subset's host answer must *show* a name starting with the letter, as the draft requires. It found `animal_w`'s `#dd9c…`, renamed "Grey Wolf" by 13e-5b's Wikidata names, which broke every day that picked it; swapped for "wasp".
- **26 categories with bank questions** (196 in all): academic degree, body of water, book, card game, ceremony, cloud (`within` weather), doctor, engine, exercise, farmer, festival, grain, greeting card, landform, lawyer, meal, branch of medicine, party (`07462241-n`, the social party), playing card (`03970276-n`, not the wider "card" that holds baseball and punched cards), race, school, sculpture, simple machine, story, teacher, virus.
- **Card game** is Wikidata's card game (`Q142714`), `within` tabletop_game. WordNet's isn't in tabletop_game's tree, so `load all`'s check refuses it, and 47 of its 50 names already answer tabletop_game (human, 2026-10-27, asked mid-build: "From Wikidata's branch (Recommended)"). Poker and solitaire aren't in Wikidata's branch: listed for the human.
- **Book** gets three links in `data/links.json` (novel `06379324-n`, comic book, coloring book under book `06422547-n`): WordNet files "novel" under another sense of book, and it's what players type first.
- **The jobs' members all read** (doctor 55, farmer 26, lawyer 19, teacher 31). "quack" (`10516787-n`) is a `drop` row in `data/listed.json`; a typed "quack" stays rejected, as the duck's sound is another thing in the base. "ambulance chaser" goes on Plor's list (`src/game/plor-listed.ts`), which now holds slurs and insults: dropping its item alone left nothing in the base with that name, so players' misses could have made it an answer again (review; human, 2026-10-27: "Add it to Plor's list (Recommended)"). The list empties the item at load, and a miss holding it is held. Listed for the human, kept: "abortionist" (a plain description in WordNet, used as a slur by some), "schoolmarm" (old-fashioned), "horse doctor" (a vet, and slang).
- **Left out:** spice (its 11 members miss pepper, cumin and paprika, what players type first), tent (no 6 familiar answers), container (shares members with bag and kitchen utensil), game (shares with sport), musical composition (shares with music genre), dish (shares with soup, stew and salad), poem (shares with verse form), toy (left for the human in 13e-7), nurse and cook (too few members), engineer (members don't fit the prompt: programmer, hacker).
- **The review's LDNOOBW flags** are all real names, kept under the overnight rule ("keep real names"): Master of Science's "sm", "sex manual", the weightlifting "snatch", "nude sculpture", the pulley's "snatch block" and "bollocks".
- **Eight bank answers swapped** that named two things (check-bank): almanac, yearbook, rotary engine, steeplechase, seminary, waterwheel, fable, parable.

## Acceptance criteria
- [x] `npm run draft -- simulate` drafts 30 consecutive days and prints `DRAFTED n of 30`; before the new categories, at 170, it stops short (hypothesis: by about day 24, 170 ÷ 7; a full 30 would mean the run isn't testing what it should).
- [x] 20–30 new categories in `data/categories.json`, each with 10+ members and a bank question; card game marked `within` tabletop_game; `npm run content:validate` OK and `npm run draft -- check-bank` 0 problems.
- [x] Each job category's members all read (the review output in the PR), with every slur or insult dropped or the category left out.
- [x] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass; the PR lists the categories left out and anything unclear.

## Out of scope
- Broad people categories and people-by-behaviour branches (thief, servant).
- Combined traits (13e: after the 200). Content days, staging, plor.app.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 30 consecutive days | The stop check and the simulator's run | Human, 2026-10-27: "When 30 days in a row draft (Recommended)", "Simulate does 30 in a row (Recommended)" |
| 20–30 a batch | Batch size | 13e: "Batches with flags (Recommended)" |
| 10 members | The smallest category | 13e: the human, "10 members" |
| 6 host answers | A question's host bank | The human, 2026-10-27: "Drop it from the batch" (overnight rules) |

## Plan
1. The human approves this ticket.
2. Simulate as 30 consecutive days; run it at 170 to see it stop (the hypothesis above).
3. Build the batch: scout, define, write the bank questions, review, simulate after.
4. The suites, the `reviewer` agent, one PR for the human to merge.

## Removes
- The simulator's 40-days-spaced-3-apart schedule (replaced by 30 in a row, one way).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The ticket: card game from WordNet, `within` tabletop_game | Wikidata's card game | `within` needs the root in tabletop_game's tree; the human chose Wikidata's branch mid-build |
| The ticket: simulate drafts 30 consecutive days | It also carries each drafted day forward as a past day | Without that, the gap between simulated days is never tested, and 30 in a row means nothing |
| The ticket: check-bank 0 problems | check-bank gains the shown-name rule for letter subsets | It passed a host answer the draft refuses (Grey Wolf); fixed in its own commit |
| Design 2: ceremony `01029321-n` | `07465442-n` (wedding, funeral, coronation) | `01029321-n` is religious rites (mass, vigil, penance): the prompt didn't fit |
| Design 2: party `08273889-n` | `07462241-n` (birthday party, luau, slumber party) | `08273889-n` is the political party (Whig Party, Green Party) |
| Design 2: cloud `11459786-n` | `09270316-n` (cumulus, cirrus), `within` weather | `11459786-n` is fog, smoke and nebulas |
| Design 2: jobs doctor, farmer, lawyer | And teacher (`10713754-n`, 31) | Scouted the same way ("the rest scouted the same way"); math, music and art teacher fit |
| Design 3: insults dropped by ID in `data/listed.json` | "ambulance chaser" on Plor's list instead | A dropped item's name could come back through misses; the human's answer above |

## Evidence
All on the Mac, 2026-10-27, after `npx supabase db reset --local` (the M14 session told first) and `npm run base -- load all`.
- **The load:** `oewn-nouns … listed words: 9 names and 8 items dropped` (13e-9b's 6 and the two insults); `LINKED data/links.json: {"added":114,"links":114}`; `DEFINED 196 categories`; both `within` checks pass; exit 0.
- **check-bank:** `CHECKED 196 questions: 0 problems`, after 8 answers were swapped. The new rule's test (`scripts/draft.db.test.ts`, "refuses a host answer whose shown name doesn't start with the letter") fails on the old `bankProblems` and passes on the new one. Run on the real bank, it found only `name-an-animal-w: host answer "#dd9cfddb-…" shows as "Grey Wolf"`.
- **The review** (`npm run base -- review` on the 26): every category has 10 or more members (festival is the smallest, at 11); the LDNOOBW flags are the real names above; the rest are WordNet's usual doubles (two "academy"s, "bank" ×3), and the bank avoids them.
- **simulate, hypothesis 1** (at 170, before the batch: "stops at about day 24"): disproved. `DRAFTED 21 of 30`; the failures were 6 days of the Grey Wolf (check-bank's gap) and 3 letter blocks, not too few categories.
- **simulate, hypothesis 2** (at 196: "fails only near day 29, out of categories"): disproved. `DRAFTED 21 of 30; subset questions 48 of 147`; all 9 failures are `no letters fit schedule A … the block is at "<question>" or after it`, from day 2 (beer, alloy, sculpture, aircraft ×2, tooth, lawyer, meal, sport F / tower). The draft picks a day's 7 questions before its letters and doesn't swap a question when no letters fit; it already tries every letter schedule A allows (8 × 7 × 5 × 4 orders). After two disproved hypotheses this was re-planned with the human (CLAUDE.md), not patched further.
- **Suites:** `npm test` 43 files, 424 passed; `npm run lint` and `npx tsc --noEmit -p .` clean; `npm run test:db` 40 files, 270 passed; `npx supabase test db` Files=28, Tests=435, PASS; `npm run test:e2e` 61 passed.

## Review
The `reviewer` agent, 2026-10-27, in a fresh context (it walked every new WordNet root in the snapshot and diffed each against the old categories; nothing against the database).
- Blocking findings and how each was fixed: "ambulance chaser" could come back through misses (put on Plor's list, the human's answer); three roots changed from Design 2 with no Source diff row, and teacher unnamed (rows added); ROADMAP and the handoff still said 13e-10 waited for approval (updated in this PR).
- Deferred to ROADMAP "Next revision" (From the 13e-10 review): slang aliases of kept members (psychiatrist's "shrink" and "headshrinker", surgeon's "sawbones", schoolmarm's bare "mistress"), which `drop_listed_names` can't take; greeting card's host "postcard"; simple machine's members wider than its prompt (wheels, plough parts, "spare", "block"); named races, "plot" in story, "vector" in virus, suits in playing card; festival and holiday sharing Mardi Gras on one day; virus and disease sharing herpes names; "wolf" out of animal_w's host bank; check-bank and the draft repeating the shown-name rule; ROADMAP's simulate item now 30, not 40.
- Next (human, 2026-10-27, after the review): the letter blocks at Q7 get their own sub-ticket, **"Draft swaps the blocker (Recommended)"**: when no letters fit, the draft swaps the blocking question for the next eligible one and retries.
