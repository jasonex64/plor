# M13 13e-6 — Pop culture

**Status:** in review (2026-10-27): built and reviewed on the Windows PC, the review's lists decided in chat, in PR #102. Before: the pop-culture answers recorded in 13e-4 (2026-10-26) and three rounds of guided questions (below); **approved** (human, 2026-10-27: "Approve 13e-6's design, its SOURCES.md rows and the genre and publisher facts. Build it."); the SOURCES.md row added ("Wikidata pop culture (M13 13e-6)"); the combined board-and-card root read: Q3244175 tabletop game, the parent of both.

## Goal
Five Wikidata sets of pop culture (video games, board and card games, animated films and anime, pop and K-pop groups, superheroes) with their categories, genre subsets and bank questions, loaded and reviewed like the sets before them.

## Who uses it / what breaks without it
- **Used by:** every player, who gets questions about games, films, music and heroes, not only nature, places and things; the drafting session, which needs 210+ categories (82 today) to fill a day without repeating one within 30 days (13d).
- **Breaks without it:** the bank has no pop culture at all; the human's four kinds (13e-4: films and TV, music, games, characters) stay unanswered; 13e-5's series and title rules have nothing to run on.

## What the human decided
**Recorded in 13e-4 (2026-10-26):** all four kinds of pop culture; anything Wikidata has; titles count with an English Wikipedia article; about 5 sets, one of each kind (board games, video games, films, bands, superheroes); sets too big become narrower categories; titles that are ordinary words ("Up") are kept and asked narrowly; mixed wording; films "animated feature films, anime as well in general", anime "series and films"; video games "Nintendo, plus genres overall"; bands "younger leaning and kpop included. dont need too many". **Recorded in 13e-5:** a single-medium series is a thing its entries are kind of (if that takes more than one extra link, or touches other categories, stop and ask); cross-media franchises skipped; titles very lenient (a leading "the", subtitle parts, numbers both ways); a short title two members share goes to the one with more sitelinks.

**Guided questions, 2026-10-27:**
| Question | The human's answer |
|---|---|
| "Younger leaning" bands | "Pop and K-pop, any year": groups whose genre is pop or K-pop |
| What makes a Nintendo game | "Published by Nintendo (Recommended)" |
| Which superheroes | "English Wikipedia article (Recommended)" |
| Narrower video-game questions | "By genre" |
| Anime | "Two categories (Recommended)": animated films (anime films included) and anime (series and films) |
| Card games | "Board and card games": one category |
| Superhero subsets | "None for now" |
| How much of the 30,650 video games | "Only well-known games" |
| The cut-off | "10+ languages (Recommended)": Wikipedia articles in at least 10 languages |
| Space | "Go ahead, measure each (Recommended)": each set measured as it loads; stop and ask if the total passes 400 MB |
| Approval | "Approve 13e-6's design, its SOURCES.md rows and the genre and publisher facts. Build it." |
| Which genre questions (after the load showed ~100 genres with 10+ games) | All eleven offered: racing, platform, shooter (first-person, third-person, shooter, shoot 'em up, tactical pooled), fighting (with 3D fighting and beat 'em up), role-playing (with action, tactical and MMO RPGs), puzzle, sports (with football and wrestling), horror (survival and psychological), strategy (real-time, turn-based, grand strategy, real-time and turn-based tactics), simulation (life, city-building, construction and business sims), music or rhythm |
| 611 of 964 series share a name with one of their own entries ("Minecraft") | "Keep only distinct names (Recommended)" |
| A genre tagged by sub-genre (Super Smash Bros. a "platform fighter", One Direction "teen pop") | "Yes, count sub-genres (Recommended)" |
| Sports held all 343 racing games (Wikidata files racing under sports) | "Leave racing out (Recommended)" |
| ~60 names on the LDNOOBW list | "Drop slurs and crude nicknames (Recommended)": a board game titled with a racial slur left out; seven crude or slur nicknames dropped as names; real titles and band names kept |
| 35 bank answers naming two or more different things (remakes, heroes sharing a mantle) | "Mark all reviewed (Recommended)" |
| Superboy and Superman (Earth-One), P460 | "Keep apart (Recommended)" |
| The simulator at 37 of 40 ("Name a monkey" and the V flower, both thin, now landing at question 7) | "Strengthen the two (Recommended)" |

## Reading Wikidata (2026-10-27, first pass)
Counts of items with an English Wikipedia article, by query shape (*unverified* as the final shapes; each set's query is settled with its SOURCES.md row before code):
| Set | Shape | Items |
|---|---|---|
| Video games | P31 Q7889 "video game", 10+ sitelinks | 5,347 (of 30,650; 511 of Nintendo's 916, P123 Q8093) |
| Board and card games | P31/P279* Q131436 "board game" / Q142714 "card game" | 2,189 / 730 |
| Animated films | P31 Q202866 "animated film" / Q20650540 "anime film" | 1,923 / 691 (films typed P31 Q11424 with genre Q202866 add 337) |
| Anime series | P31 Q63952888 "anime television series" | 1,491 |
| Pop and K-pop groups | P31/P279* Q215380 "musical group", P136 Q37073 "pop music" or Q213665 "K-pop" | 2,486 (subgenres not yet counted) |
| Superheroes | P106 Q188784 "superhero" (occupation; P31 gives 45) | 962 |

## Claude's design (for the human's approval)
1. **Five Wikidata sets** in `scripts/base.ts`'s `SETS`, each fetched as the rivers and dog breeds are (a root item; members under it; English Wikipedia article; snapshot and manifest), loaded with 13e-5b's merges and shown names:
   - `wikidata-video-games`: P31 video game, 10+ sitelinks; facts `genre` (P136) and `publisher` (P123).
   - `wikidata-tabletop-games`: board games and card games, both under one root for one category: Q3244175 tabletop game, the parent of both (read 2026-10-27).
   - `wikidata-animated-films`: animated films and anime films; `wikidata-anime`: anime series and anime films (an anime film is one thing in both).
   - `wikidata-pop-groups`: musical groups with genre pop or K-pop; fact `genre`.
   - `wikidata-superheroes`: occupation superhero.
2. **Two new fact kinds,** `genre` and `publisher` (13e-4a's facts are country, continent, conservation status and population): a migration adding them to what subsets can filter on.
3. **Categories** (in `data/categories.json`): video game, Nintendo game (publisher subset), the video-game genres with 10+ members (racing, platform, role-playing, …: the list from the review), board or card game, animated film, anime, pop group, K-pop group (genre subset), superhero. Each with a bank question in `content/bank.json` (Claude writes them, as in 13e).
4. **Series and titles** (13e-5 items 5 and 6): a single-medium series (Wikidata's "part of the series", P179, with the series' class marking one kind of work) is a thing its entries are kind of, so a host saying "Mario Kart" catches "Mario Kart 8"; title aliases drop a leading "the"/"a"/"an", take the parts around a subtitle's colon, and spell numbers both ways; a short form two members share goes to the one with more sitelinks. If the series link takes more than one extra link or touches other categories, stop and ask (13e-5's condition).
5. **Review** as before (count, sample, flags, doubles), with the review's shared bank answers decided in chat; each set's size measured as it loads.

## Acceptance criteria
- [x] Each set's SOURCES.md row is in with the human's OK before its code (the classes and properties above, P179 and the series classes: "Wikidata pop culture (M13 13e-6)").
- [x] Five sets fetched and loaded; each set's size recorded; the total stays under 400 MB or the human is asked (316 MB).
- [x] The categories above are defined, each with 10+ members and a bank question; `npm run content:validate` OK (19).
- [x] "Name a Nintendo game" and at least the genre subsets with 10+ members draft (trial drafts: all 19).
- [x] A series catches its entries (a db test on fixtures, and "Mario Kart" on the full load); short titles answer ("Breath of the Wild").
- [x] The review's doubles list is decided in chat and applied; the simulator still drafts what it drafts today (39 of 40), or better: 39 of 40, after the human's "Strengthen the two (Recommended)" (it first drafted 37; Evidence).
- [x] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass (Evidence).

## Out of scope
- Superhero subsets (the human: "None for now"); cross-media franchises (13e-5).
- Live-action films and TV beyond anime; music beyond pop and K-pop groups.
- Loading plor.app's answer base (M15).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 10 sitelinks | A video game counts as well known | Human, 2026-10-27: "10+ languages (Recommended)" |
| English Wikipedia article | Every pop-culture item counts | Human, 2026-10-26 (13e-4): "English Wikipedia article (Recommended)" |
| 10 members | The smallest category (CATEGORY_MIN_MEMBERS) | 13e: the human, "10 members" |
| 400 MB | Stop and ask before loading past it | Human, 2026-10-27: "Go ahead, measure each (Recommended)" |

## Plan
1. The human approves this design. Claude reads each class and property page and brings the SOURCES.md rows.
2. **Hypothesis:** the five sets add 30–40 MB (about 320 MB in all) and give 15–25 categories with 10+ members. **Disproved if** the total passes 400 MB, or fewer than 10 categories reach 10 members: then stop and re-ask.
3. Migration: the `genre` and `publisher` facts. Then the five fetches, the series link and the title aliases, with unit tests.
4. Fetch, load, review, decide the doubles in chat; categories and bank questions; trial drafts and the simulator; the suites.
5. Review by the `reviewer` agent; blocking findings fixed, the rest to ROADMAP; one PR.

## Removes
- Nothing yet in code: it adds sets. It closes 13e-5's deferred items 5 and 6 (series and titles) and 13e-4's recorded pop-culture answers, moved here.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Design 1: each set's members by one query, as rivers are | IDs first (`idsWhere`), then labels by key in batches (`labelledIds`); the tabletop games one class a query | One query with labels timed out for tabletop games; a single VALUES list of every publisher failed with 400 |
| Design 1: pop groups whose genre is pop or K-pop | Pop or K-pop or any sub-genre of either (5,517 groups, not 2,486) | The human's answer on sub-genres; One Direction ("teen pop") was out |
| Design 2: genre facts as Wikidata gives them | Each game's genres plus their broader genres among those the set uses, walked up a level a query; racing not under sports | The human's answers on sub-genres and on sports; a single P279+ query timed out or ran to 13 MB |
| Design 4: a single-medium series catches its entries | Only series none of whose names (label or other names) is any member's name (`distinctSeries`) | The human: "Keep only distinct names"; the first build compared a series with its own linked entries' labels only and left 22 doubles ("Wii Sports", "Metal Gear Solid"; the review) |
| Design 4: title forms, "the parts around a subtitle's colon" (13e-5 item 6: "the part after a subtitle's colon and the part before it with the subtitle") | The part after the colon; not the part before it alone | The part before it *with* the subtitle is the whole title, typeable already once `normalize` drops the colon; the part before it alone ("Zelda") would name one game for a whole series |
| Design 4: title forms | A form that is another member's own name isn't given; a number-word run counts only when it spells its own number back | "the other keeps its full title" read as: no generated form takes another title's own name; the first build read "Million" as 0 ("0 machines"; the review) |
| — | `dropListed`: one board game left out and seven names dropped by ID | The human's answer on listed names (as `ANIMALS_DROP_LISTED_NAMES` in 13e-4b) |
| Design 3: categories with a bank question each | 19 categories, 19 questions; 30 answers by ID where a name fits several things (remakes, heroes sharing a mantle) | The draft refuses a name naming several members; the review's shared names were reviewed with the human |
| Plan 2 hypothesis: +30–40 MB | +30 MB (286 → 316 MB) | Held |

## Evidence (2026-10-27, the Windows PC)
- **SOURCES.md:** the "Wikidata pop culture (M13 13e-6)" row, from `wbgetentities` of each property and class; Q3244175 tabletop game read as the parent of board game and card game (P279).
- **Migration** `20261027090000_genre_publisher.sql`: `npx supabase migration up --local` → applied. `pop_culture.test.sql` (4: genre and publisher load, a genre subset, a publisher subset, a series catches its entries) PASS.
- **Fetches** (`npm run base -- fetch …`): `wikidata-video-games` 6,903 items (5,347 games with 10+ sitelinks, 282 series, 652 series left out for a shared name; genre on 5,309, publisher on 5,079) in 37 s; `wikidata-tabletop-games` 2,900 (2,188 board, 730 card); `wikidata-animated-films` 2,740 (19 series, 9 left out); `wikidata-anime` 2,181; `wikidata-pop-groups` 5,520; `wikidata-superheroes` 963; `wikidata-sameness` refreshed, 2,170 marked items.
- **Load** (fresh `db reset` + `load all`, 59 s): no circle refused, no hand decision stale; **316 MB** (286 before; the 400 MB line not reached).
- **Categories** (`npm run base -- review`, 19 keys): video game 5,629 members, board or card game 2,900, animated film 2,739, anime 2,180, pop or K-pop group 5,517, superhero 962, Nintendo game 511, racing 343, platform 617, shooter 900, fighting 381, role-playing 814, puzzle 297, sports 314 (racing left out; 6 games tagged both stay), horror 221, strategy 536, simulation 434, music or rhythm 84, K-pop group 548; none under 10. After the decisions: shared bank answers 0, P460 or fork pairs 0.
- **On the full load:** the Mario Kart series catches Mario Kart 8 (`descendants_now`); "breath of the wild" names The Legend of Zelda: Breath of the Wild; "mario kart eight" names Mario Kart 8.
- **Bank:** 19 questions, every answer one member of its category (a check query over all 228); 30 by ID. `npm run content:validate` → "CONTENT OK".
- **The simulator:** `npm run draft -- simulate` first → `DRAFTED 37 of 40; subset questions 78 of 259` (hypothesis 39 or better: disproved): 2027-01-31 blocked at "Name a flower that starts with V", 03-20 and 04-13 at "Name a monkey", as the new questions changed which seven a day picks. After the human's "Strengthen the two (Recommended)" (mandrill to the monkey host's answers; proboscis monkey, vervet monkey, rhesus macaque, woolly monkey, mangabey, uakari, drill, guenon, and four V flowers, to the uncommon ones, each one member): **`DRAFTED 39 of 40; subset questions 83 of 273`**, the one failure 2027-01-31 at the V flower (38 members); the poem day (2027-03-26), which failed before, now drafts.
- **After the review's fixes** (the five title sets and the marks re-fetched; a fresh `db reset` + `load all`): video games keep 238 series (696 left out), animated films 18 (10 left out); the junk number aliases gone (`0 machines` and the like: 0 rows; the 97 aliases with a "0" left are "Zero" spelled as a digit, e.g. "yakuza 0", "kentucky route 0"); one name still on two series, "F1" (EA Sports' and Codemasters' series, two different things); 316 MB; every bank answer one member; the review: shared bank answers 0, P460 or fork pairs 0; all 19 trial days draft; the simulator `DRAFTED 39 of 40; subset questions 83 of 273` (2027-01-31, the V flower); `npm test` 415; `npm run test:db` 266; `npx supabase test db` 28 files, 435, PASS; `npm run test:e2e` 60 of 61, the one failure passing on `--last-failed` ("1 passed").
- **Trial drafts** (each new question with six established ones, `npm run draft -- 2027-06-NN --questions …`, files deleted after): all 19 draft, e.g. `name-a-nintendo-game`: "DRAFTED … letters Q2 U, Q4 B, Q5 S, Q7 I"; the sports day first failed on an ID the racing cut had moved out (`SSX`), then drafted with the name.

## Review (`reviewer` agent, fresh context, 2026-10-27)
- Blocking findings and how each was fixed:
  - a lone scale word read as 0 and adjacent number words summed ("0 machines", "the 1 0 dollar signpost" loaded): a run counts only when it spells its own number back (unit tests);
  - the distinct-name rule missed series against games outside its one-series links and against its other names (22 doubles in `video_game`): a series is left out when any of its names is any member's name (`distinctSeries`, unit test);
  - the colon rule's left side was undocumented: recorded in the Source diff with its reason;
  - HANDOFF, ROADMAP and the ticket's Status were stale: updated.
- Its own checks: the migration differs from 20261027053000's `import_source` only in the two trait lists; `pop_culture.test.sql` 4/4; every new bank answer one member; sports and racing overlap on 6; the sitelinks cut-off's origin recorded.
- Deferred to ROADMAP "Next revision": For M13, "From the 13e-6 review".
