# M13 — The answer database

**Status:** planned (2026-10-24).
- **Where it came from.** It's rewritten around the database the human described in four rounds of guided questions (2026-10-24), replacing the 2026-10-23 draft's A1–A6. The human: "YES" to rewriting it around the design.
- **Decisions.** D1 and D3–D8 and every number are answered (human, 2026-10-24, in four more rounds of guided questions).
- **Waiting:** only D2, the sources, which Claude is researching for the human's OK. No code before they're in SOURCES.md.

## Goal
One growing database of things, their names and the facts about them. It decides which answers each question accepts, learns from what players type, and measures how rare each answer really is, so that an AI can later draft whole days that the human approves in under a minute.

## Who uses it / what breaks without it
- **Used by:**
  - every player, on every question;
  - the human, who approves days and audits what the game learned;
  - later, the AI that drafts days (ROADMAP Later) and future games that need meaning, not only words.
- **Breaks without it:**
  - **Fair answers are refused.** Each day's accepted list is typed by hand for that day (DECISIONS.md, Answer model), and a missing answer is "not in our list". WordNet held 223 of one day's 226 animals (M04), but it isn't a source.
  - **The game is too easy, in the wrong way.** In the M02 2g survey, 14 of 21 questions caught nobody. Obscure answers are always safe, and the rarity bonus pays extra for them (`M02-2g-survey.md`, Findings; ROADMAP, Design review, 1).
  - **Nothing learned carries over.** A missing answer found on one day is missing again the next time the same kind of question comes up. Rarity is guessed per day (M09 D11 (b): host bank = common).
  - **AI drafting has nothing to stand on.** The human wants the AI to draft the questions, the answer lists, the host's answers, the rarities and the stolen letters. That needs categories and facts a program can query, not hand-typed lists.

## What the human wants (guided questions, 2026-10-24)
| Subject | The human's answer |
|---|---|
| Who writes days, long term | "ideally AI would write them and I veto them", with "a way for me to manually write a puzzle if i ever want to, as well as the host's specific answer". The AI always drafts "what letters get removed each day, as well as the answer bank, host answer bank, and rarities of answers" |
| Repeating questions | "I would not mind reusing specific questions asked in the past before if enough time has passed"; the gap: "About a month" |
| Unlisted answers players type | "automatically accepted after N players type, but with an easy way for me to audit what's added and remove if needed. i would manually audit these" |
| When an addition counts | "From the next time": a started day's list doesn't change |
| How many players | "A share of players" |
| Question mix | "Mostly concrete" |
| Other games | Word games (game 2) keep their own dictionary, but "i could see offbeat's database being used for a future game that i develop later as well" |
| Rarity | Pooled per category, recent days weighted, "if it's not too difficult to implement and interferes with other aspects of design. but this seems most ideal". Later, once the pooling across a category's questions was explained: "All history equal" (D5) |
| New questions from traits | "Yes, combine traits" (e.g. animal + lives in Africa) |
| Player stats from history | Low priority; "specifically answer trends and firsts and records" are worth keeping possible |
| Whose truth | "Technically correct" (a spider isn't an insect) |
| Facts against the crowd | "Facts win": a miss the database knows is wrong never auto-accepts |
| Leniency | "very lenient only if it's not too difficult to implement. if it is, then go common nicknames" |
| Audience | "US English" |
| Review time per day | "Under a minute" |
| Themed days | "Yes, sometimes" |

## Source
- **SOURCES.md has no source for answers or facts.** D2 asks the human to add one or more. Until then, nothing is built from one (CLAUDE.md: "If no source covers the work, stop and ask").
- **Kept as they are:**
  - **DECISIONS.md, Game 1 and the Answer model:** sudden death, the fixed sequence, the server as the only holder of host answers, one level of detail per question, match groups, normalization at authoring, and the typed-text rule.
  - **DECISIONS.md, Puzzle content format** (Hard to reverse): "an approved day … can't be changed once its day has started". D3 changes the format, not that rule.
  - **DECISIONS.md, Points ledger** and **M09:** the bonus formula (N1–N4). D5 replaces only where the expected share comes from (D11, N5).
  - **Unicode normalization** (UAX #15, UAX #44) and **pluralize** 8.0.0, for aliases.
  - **PostgreSQL 17** and **Supabase keys and RLS / database roles**, for the new tables and their grants (D1).

## Claude's design (for the human to approve)
The database has five parts. Each day takes a frozen copy when it's approved.

1. **Things.**
   - Each answer exists once, with a permanent ID (D3) and its US English name.
   - It has **aliases**: plurals, other spellings, nicknames ("Cali", "Chevy", "NYC"), brand-for-generic ("Kleenex") and slang.
   - Leniency comes from aliases. The typo rule stays at one letter, because looser typo matching hits the wrong thing once lists hold thousands of entries (D6).
2. **Facts.**
   - Each fact is a thing, a trait and a value: axolotl, is a kind of, salamander; axolotl, lives in, Mexico; eagle, can fly, yes.
   - Each fact names its origin (a reference source, the AI, players or the human) and when it was added.
   - "Is a kind of" links make a tree: salamander → amphibian → animal.
   - "Technically correct" means the reference source decides. A fact from the source outranks one from players (Facts win).
3. **Categories as recipes.**
   - A category is a rule over facts, not a typed list: "animal" is everything under animal in the tree; "African animal" is animal and lives in Africa.
   - That's what lets the AI combine traits into new questions.
   - Open-ended categories ("something you'd bring to a potluck") are the exception: a kept list of members, since no reference can decide them. The human said there will be few of those ("Mostly concrete").
4. **The question bank.**
   - Each question has its prompt, its category recipe, theme tags (Thanksgiving, animal week), the days it was used and how it performed.
   - A question may return after the repeat gap (D7).
5. **History.**
   - Each answer a player gives points at a thing's permanent ID. That's already true of the day's entries today (`private.run_event`), but only within one day.
   - Misses keep their typed text (`private.missed_answer`, M02).
   - Every addition or removal is logged: what, by whom (the source, the AI, the players' rule or the human) and when. The audit page reads that log and can undo an entry.

**How a day uses it.**
- At approval, the day stores its 7 questions with their full accepted lists (every member of each category with its aliases), the host bank, the host answers, the stolen letters and each entry's expected share, all keyed by thing ID.
- Matching then works on the day's copy as today, and a started day never changes. A fix made later reaches only days approved after it.

**How it learns (D4).**
- **A miss the facts reject** goes to the audit list and is never accepted automatically. For example, "spider" for "Name an insect", when the source files spiders under arachnids.
- **A miss the database has never heard of** is counted by distinct players, and becomes a member from the next day that uses the category. The trigger is the share of players in D4.
- **An alias** is a miss one typo away from nothing that names a known thing ("hippo"). It joins the same flow as an alias.

**How rarity works (D5).**
- Each answer's expected share for a question comes from its category's pooled history: every day the category or its question was asked, all counted equally (D5).
- The AI's first guess is used until enough players have answered.
- The provisional and final bonus then work as in M09.
- The host anticipating the dodge (Design review, 1) uses the same numbers. When a question's plain host answers can't reach its catch target, the drafting AI adds a popular dodge, so dodges get likelier toward Q7 (D5).

**What it makes possible later.** These aren't M13 scope; they need nothing more than the history above:
- **Firsts and records:** the earliest answer per thing per category.
- **Answer trends:** a thing's share over time.
- **Personal collections:** distinct things per player per category.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| D1 | **Where the database lives.** (a) **Postgres tables in `private`**, read and written only through guarded functions, as puzzles are (M06); the admin pages audit and edit it. (b) Files in the repo, changed by pull requests | (a). Auto-accepting misses (the human's rule) has to write while players play, and files can't. New tables, functions and `plor_app` grants are a security change, recorded in DECISIONS.md when built | **(a), the database** (human, 2026-10-24: "Database (Recommended)", after Claude laid out both sides). Security change: the tables, functions and grants are proposed in 13a and recorded in DECISIONS.md |
| D2 | **The sources** (the human adds each to SOURCES.md). (a) **Wikidata** for facts and traits (taxonomy, where things live, colors, counts); its license and how to pull a subset are read before it's proposed (*unverified*). (b) **WordNet** for the "kind of" tree of everyday nouns and their synonyms (aliases); its license is *unverified* too. (c) Both | (c), (a) for facts and (b) for everyday words. Only the subsets the categories need are imported, by a script whose output is reviewed. Claude reads each license and brings the SOURCES.md rows for the human's OK | **Research first** (human, 2026-10-24: "yes both and others too feel free to do as much research as u want"). Claude compares Wikidata, WordNet and other candidates (licenses, coverage, how to pull subsets) and brings SOURCES.md rows for the human's OK. Pending |
| D3 | **Hard to reverse: permanent thing IDs and content format 3.** Each thing gets a permanent ID that answers, history and days refer to forever. Format 3 is the day's frozen copy keyed by thing IDs, with expected shares and the question's category recipe. (a) **IDs owned by Plor** (a random ID per thing), each linked to its source's own ID where there is one. (b) The source's IDs as ours | (a). A thing that's in no source (a curated or player-added answer) still needs an ID, and a source can change or merge its IDs | **(a), Plor's own IDs** (human, 2026-10-24: "Plor's own IDs (Recommended)") |
| D4 | **Auto-accepting a miss.** (a) **Accepted once the share of distinct players who typed it, among the players who answered that category's questions, reaches X%, and at least M players typed it**, counted across days, from the next day on, unless the facts reject it (then audit only). (b) Per day: X% of one day's players | (a). Pooling across days lets a small beta reach the share. The minimum M stops one player out of one counting as 100%. X and M are human numbers | **(a), with X = 1% and M = 3** (human, 2026-10-24: "1%", "3 players") |
| D5 | **Rarity from play, with recency.** (a) **Pooled per category and weighted by age:** an answer given *h* days ago counts half as much as one today (a half-life *h*), blended with the AI's first guess until enough players have answered (M09 N1's role). The host may pick a dodge from question *q* on. (b) Pooled, unweighted. (c) Per day only, as now | (a), as the human asked, provided it's simple. It is: one weighted count per answer per category. *h* and *q* are human numbers, and the AI's first-guess shares per level (common, uncommon, rare) replace N5 | **Pooled per category with no fading:** every answer ever counts the same (human, 2026-10-24: "All history equal", after asking what fading meant). So (b), which drops *h*. The AI's first guesses are **40% / 40% / 20%** of players giving some common / uncommon / rare answer ("40 / 40 / 20"). **Dodges are tied to difficulty:** the drafting AI picks a popular dodge when the plain answers can't reach a question's catch target, so dodges get likelier toward Q7 and vary day to day (human: "random", then "Random, later more likely", then "Tied to difficulty (Recommended)"). So *q* isn't needed |
| D6 | **Leniency.** (a) **Lenient aliases, typo rule unchanged:** nicknames, brand-for-generic and slang as aliases (from the sources, the AI and players); still one typo for 4+ letters, with two-entry ties a retry. (b) Also widen the typo rule | (a). It's "very lenient" through data, which is easy. A wider typo rule is the hard part the human said to skip if hard | **(a)** (human, 2026-10-24: "Lenient aliases, 1 typo (Recommended)") |
| D7 | **The question bank's repeat gap and themes.** (a) **A question may repeat once 30 days have passed since its last use** ("About a month"), and themes are tags on questions. (b) Another gap | (a), if "about a month" means 30 days: a human number to confirm | **At least 30 days between uses** of a question; the AI may wait longer (human, 2026-10-24: "not saying it should be EXACTLY 30 days just at least 30 days"). Themes are tags |
| D8 | **What happens to today's format-2 days and their history.** (a) **Start fresh:** the drafted days (public in the repo, and never played but by the human and the survey) are retired, and M15 drafts the beta's days in format 3. Old runs keep their per-day entry IDs; pooled history starts with format 3. (b) Map old entries to thing IDs | (a). No player history worth keeping exists yet, and the human said to draft the beta's days in M15 | **(a), start fresh** (human, 2026-10-24: "Start fresh (Recommended)") |

## Sub-tickets (Claude's order, each its own PR on this branch)
- **13a, the base.**
  - Things, aliases, facts, the "kind of" tree, categories as recipes, and the audit log (D1, D3, D6), with tables and functions, pgTAP and grants.
  - The import from the D2 sources for the categories the first test days use, reviewed.
  - Approval freezes format 3 into a day, and matching runs on it.
  - The Next revision matching items for M13: plural aliases, digits, zero-width characters.
- **13b, learning from misses** (D4): the facts check, the auto-accept rule with its share and minimum, and the audit page with undo.
- **13c, rarity and the host** (D5): pooled shares in the bonus; the dodging host; the letter picker keeping enough familiar answers safe (M04 G9).
- **13d, the question bank and tuning** (D7, M04 G3): questions with recipes, themes and the repeat gap; difficulty tuned with the human toward a target catch rate per question.

## Acceptance criteria
Each sub-ticket's criteria are written before its code, once D1–D8 are answered. They'll cover:
- **13a:** a category recipe returns the source's members, with the import reviewed in the diff; a day approved in format 3 plays end to end (db tests and e2e); the grants (pgTAP).
- **13b:** a miss reaching the threshold is a member the next day, not today; a fact-rejected miss never is; an undo removes it from later days only (db tests).
- **13c:** the bonus uses the pooled share, a dodge is picked only when the plain host answers miss the question's target, and the picker refuses a day leaving fewer than 3 familiar answers (unit and db tests).
- **13d:** a question isn't offered again within the gap; the sample days meet the catch-rate targets (recorded table).

## Out of scope
- **The AI that drafts days** (ROADMAP Later: needs an API key in Vercel and its own ticket). M13 builds what it stands on.
- **Player-facing stats** (trends, firsts, collections): ROADMAP Later, made possible by M13's history.
- **The beta's days, the parked days, and private drafts:** M15.
- **Game 2's dictionary** (M16): word games keep their own (human, 2026-10-24).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| X = **1%** of the players who answered the category's questions | Auto-accept (D4) | Human, 2026-10-24: "1%" |
| M = **3** distinct players at least | Auto-accept (D4) | Human, 2026-10-24: "3 players" |
| No fading: every answer counts equally | Rarity (D5) | Human, 2026-10-24: "All history equal" |
| AI first guesses: **40% / 40% / 20%** of players give some common / uncommon / rare answer | Rarity before data (D5; replaces N5's 50% for the host bank) | Human, 2026-10-24: "40 / 40 / 20" |
| Dodge picks: no odds of their own, used when needed to reach a question's catch target | The host (D5) | Human, 2026-10-24: "Tied to difficulty (Recommended)" |
| Repeat gap: **at least 30 days** | The question bank (D7) | Human, 2026-10-24: "just at least 30 days" |
| Target catch rate per question, Q1–Q7: **3, 5, 7, 10, 13, 16, 20** caught per 100 players ("Gentle"; about 45% finish all 7, by Claude's multiplication) | Tuning (13d) | Human, 2026-10-24: "Gentle: 3→20%, ~45% finish". It changes DECISIONS.md, Game 1's "most players should usually finish". 13d records the change there when it's built |
| Fewest familiar (common or uncommon) answers still typeable after stolen letters: **3** | The letter picker (13c; M04 G9) | Human, 2026-10-24: "3" |

## Plan
1. ~~The human answers D1–D8 and the numbers.~~ Done 2026-10-24, except D2. Claude researches the sources and brings the SOURCES.md rows for the human's OK.
2. **13a** with one category end to end: animals, the one M04 measured.
   - *Hypothesis:* the source's animal subtree holds at least the 223 of 226 animals M04 counted.
   - *Disproved* if it holds fewer, which would mean M04 measured a different version.
   - Then the categories of the first test days.
3. **13b**, **13c** and **13d** in order, each with its criteria before its code.

## Removes
- The 2026-10-23 draft's A1–A6, replaced by D1–D8.
- Once 13a–13c ship:
  - hand-typed per-day accepted banks (`content/offbeat/*.json` as the drafting format; D8);
  - the "host bank = common" expectation (M09 D11 (b), N5);
  - the per-day-only rarity.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
