# M13 13e-6 — Pop culture

**Status:** planned (2026-10-27): the pop-culture answers recorded in 13e-4 (2026-10-26) and three rounds of guided questions (below); the design, its SOURCES.md rows and its new fact kinds wait for the human's approval.

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
   - `wikidata-tabletop-games`: board games and card games, both under one root for one category (*which root item covers both is read first*).
   - `wikidata-animated-films`: animated films and anime films; `wikidata-anime`: anime series and anime films (an anime film is one thing in both).
   - `wikidata-pop-groups`: musical groups with genre pop or K-pop; fact `genre`.
   - `wikidata-superheroes`: occupation superhero.
2. **Two new fact kinds,** `genre` and `publisher` (13e-4a's facts are country, continent, conservation status and population): a migration adding them to what subsets can filter on.
3. **Categories** (in `data/categories.json`): video game, Nintendo game (publisher subset), the video-game genres with 10+ members (racing, platform, role-playing, …: the list from the review), board or card game, animated film, anime, pop group, K-pop group (genre subset), superhero. Each with a bank question in `content/bank.json` (Claude writes them, as in 13e).
4. **Series and titles** (13e-5 items 5 and 6): a single-medium series (Wikidata's "part of the series", P179, with the series' class marking one kind of work) is a thing its entries are kind of, so a host saying "Mario Kart" catches "Mario Kart 8"; title aliases drop a leading "the"/"a"/"an", take the parts around a subtitle's colon, and spell numbers both ways; a short form two members share goes to the one with more sitelinks. If the series link takes more than one extra link or touches other categories, stop and ask (13e-5's condition).
5. **Review** as before (count, sample, flags, doubles), with the review's shared bank answers decided in chat; each set's size measured as it loads.

## Acceptance criteria
- [ ] Each set's SOURCES.md row is in with the human's OK before its code (the classes and properties above, P179 and the series class).
- [ ] Five sets fetched and loaded; each set's size recorded; the total stays under 400 MB or the human is asked.
- [ ] The categories above are defined, each with 10+ members and a bank question; `npm run content:validate` OK.
- [ ] "Name a Nintendo game" and at least the genre subsets with 10+ members draft (trial drafts).
- [ ] A series catches its entries (a db test on fixtures, and "Mario Kart" on the full load); short titles answer ("Breath of the Wild").
- [ ] The review's doubles list is decided in chat and applied; the simulator still drafts what it drafts today (39 of 40), or better.
- [ ] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass.

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

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
