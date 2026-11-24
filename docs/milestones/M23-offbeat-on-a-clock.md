# M23 — Offbeat on a clock, with researched answer lists

**Status:** approved 2026-11-23 (the human: "Approve M23"), from the sixteen answers below. Nothing is built; each sub-ticket is designed from its own questions first, 23a next. A pilot of the research ran on three questions (below). The beta is paused until this ships (answer 16).

## Goal
Replace Offbeat's seven sudden-death questions with one run a day on a clock, three questions long, where each answer adds time by its rarity, played against answer lists researched per question.

## Who uses it / what breaks without it
- Used by: every Offbeat player, and the human when approving days and lists.
- Breaks without it: the beta's first week (read from plor.app, 2026-11-23). Players per day fell 17, 8, 7, 3, 1, 2; the median Offbeat run scored 91 against a par of 1,250; 98 answers were refused that players thought right (bed 22, acid 10, world capital 9, cake 9). The human, 2026-11-23: "there is a huge database issue with the questions for Offbeat. We have a bunch of missing answers for every category. We have wrong things that shouldn't be in the category", and of the game: "I think it's flawed."

## Source
- **The game:** the human, 2026-11-23, in full: "we're going to change it from a 7-question round to one run a day. So each day is only going to have one question, or maybe we can do two or three... you're going to have a shorter timer, maybe not 20 seconds, maybe it's like 10 or 15 seconds. And you have the prompt, like, for example, name a type of cake. Each answer that you put down adds time to the timer depending on how rare the answer is. So a rarer answer will add more points to the timer in comparison to a common answer. It can also be kind of like worth more points or whatever. Eventually, the timer will run out, and that's when your total run will be scored. There could also be some sort of mechanic where, like, after a certain amount of time, they stop accepting common answers." And: "It would still use the same exact question and answers and the rarity. That all stays the same."
- **The lists:** the human, 2026-11-23: "Shouldn't it be you, Claude? I'm going to have you do like extensive research on each question. Like run some agents to scour stuff, not just using Wiki or WikiNet or WordNet. Just go through and find as many good answers as possible. And then later, once you add it to the database, you can kind of like sync questions, answers together if one answer can fit into multiple ones, or maybe sort of implement some sort of semantic search as well".
- **SOURCES.md today** names Wikidata, Open English WordNet and USDA as the only sources of answers. Web research is a new kind of source: its SOURCES.md entry and a DECISIONS.md entry ("Answer database imports") are part of 23a and need the human's OK there. No other source covers the game's rules: they are the human's answers below.

## The human's answers (2026-11-23), quoted
The lists:
1. What decides which answers count: "Researched list, big sets keep sources (Recommended)". For everyday questions (bed, cake, hat) only the researched list counts and every old member is judged keep or remove; huge factual sets (animals, countries, video games) keep Wikidata membership, with nicknames and series names researched on top.
2. Borderline answers (mattress as a bed, vinegar as an acid): "Accept, and show me the list (Recommended)". Accepted by default; each question's borderline list is shown to the human to strike any.
3. Depth: "Two passes, soonest days first (Recommended)". A researcher builds the list; a second agent that did not write it checks every unsourced entry, hunts for missing answers and tests it against what players typed on plor.app.
4. Who does the research: Claude sessions and their subagents (the quote under Source). Nothing calls an AI from the app.

The game:
5. A day: "Three questions on one clock".
6. What ends a run: "Time added shrinks as you go (Recommended)".
7. A wrong or repeated answer: "Nothing, the clock keeps running (Recommended)".
8. The host and taken letters: "Drop it for now (Recommended)".
9. Moving on: "A Next button, no going back (Recommended)".
10. The clock: "Generous: 20s start". Common adds 3 seconds, uncommon 5, rare 8, each shrinking about 5% per answer given. A starting point, tuned by playing.
11. The score: "Points per answer by rarity (Recommended)". Common 10, uncommon 25, rare 50, to tune.
12. Rollout: "Replace Offbeat straight away".
13. A day's three: "Three different areas, biggest list first (Recommended)".
14. Old scores: "Start fresh from the switch (Recommended)". Offbeat's and the overall boards count from the switch day; earlier days stay in each player's history; Offbeat's par is set after a week of real runs and until then it counts on its own board only.
15. Which questions may be used: "Only fully researched ones (Recommended)". Both passes done and its borderline list seen by the human.
16. Until it ships: "Pause the beta". No days are approved in either game. (This replaces the same day's earlier "Approve as drafted".)

Carried from 2026-11-17 (the bed-question session; HANDOFF of that date), still standing: a good list is "What players type first"; a prompt that reads two ways: "Drop such questions"; additions go through the "Admin page (#252)".

## The pilot (2026-11-23)
One sonnet agent per question, about 120,000 tokens and 3 minutes each, 5 to 11 web searches. Its three lists are `docs/research/research_notes/m23-pilot-bed.json`, `-acid.json` and `-cake.json`.

| Question | Before | After | Old members judged out | Refused last week, now accepted |
|---|---|---|---|---|
| Name a kind of bed | 25 | 109 | couch; deathbed, sickbed, marriage bed lean out | king, twin, twin XL, California king, Alaskan king, box bed, tatami bed |
| Name an acid | 145 | 177 | 13 (lansoprazole, vanadium pentoxide, cyanamide, …) | citric, nitric, stomach acid |
| Name a kind of cake | 106 | 138 | 68 (cookies, pancakes, doughnuts, tortilla, tostada, dog biscuit) | bundt, chocolate, vanilla, jello cake, tiramisu, mooncake |

What it showed: most of the gain is short forms ("king", "citric", "chocolate"); the obscure tail is about 60 to 70% complete by the agents' own estimate; a quarter to a half of the rare entries are from memory with no source; no agent found data on what people type first, so the tiers are judgement. The second pass (answer 3) exists for these gaps.

## Design
**Why the lists are wrong today** (read by an Explore agent, 2026-11-23): 188 of 231 categories are every word under one WordNet synset (`scripts/base.ts`, `oewnSubtree`), membership is a tree walk (`private.category_members`), and no check compares a list with what players type. The admin pages can only accept a miss after the fact (`/admin/audit`).

**A researched list** is one file per question, in git: each answer's shown name, its other typed forms, its tier (common, uncommon, rare: the three the game already has; the pilot's "first ten" are the common tier's head), whether it is borderline, and where it was found. For an everyday question the file is the whole list. For a big factual set the file adds names to things the source already holds. How the file reaches the database, and whether a question's list replaces its category or sits beside it, is 23a's design and likely a migration.

**A run** (all judged and timed by the server, as today): Start opens question 1 with 20 seconds. Each accepted answer adds its tier's seconds times 0.95 to the power of the answers already accepted in the run, and its tier's points. An answer already given, or not on the list, changes nothing and is logged as a miss as today. Next closes the question for good and opens the next with the clock as it stands; after question 3 there is no Next. The run ends when the clock reaches zero. The one-typo rule and "every alias counts" stay (DECISIONS).

**A day** is three bank questions from three different families, the longest list first, none used in the last 30 days (the current gap), each fully researched (answer 15).

**The switch** (answer 12 and 14): the new game takes Offbeat's place on one day; the old game's code, the host, taken letters and sudden death are removed with it; boards count from that day.

## Sub-tickets, in order (one PR each)
- **23a, the list's format and its way into the database.** The file's shape, the loader, how an everyday question's list replaces its tree, SOURCES.md and DECISIONS.md entries. The three pilot lists are its test data.
- **23b, the research procedure and the first 21 questions.** A skill or script so each question is researched the same way in two passes; the human's borderline review; the admin's add an answer (#252) and edit or replace a question (#251).
- **23c, the run on a clock.** Tables and functions for a run, an answer, Next and the end; guests; the TLA+ model of an Offbeat run rebuilt (`verify-offbeat-run`), since this replaces what it models. A security-relevant change only in that it adds functions `plor_app` may execute: proposed in its own questions.
- **23d, the screens.** The play screen, the result screen, the share text, the live board's wording.
- **23e, drafting and approving a day.** `npm run draft` for three questions, the admin's approval of the new format.
- **23f, the switch.** Boards from the switch day, Offbeat off the overall board until its par is set, the old game removed, the old drafted days (Nov 23 to 30) dropped.

## Acceptance criteria
- [ ] Every question a day uses has a researched list that passed both passes, and the human has seen its borderline list (a check in the draft that refuses a question without one).
- [ ] For bed, acid and cake, every answer the pilot marks "should accept" from last week's refusals is accepted, and every old member judged out is refused (a db test).
- [ ] A run starts at 20 seconds; an accepted answer adds its tier's seconds, shrinking per answer; a wrong or repeated answer changes neither clock nor score (unit tests on the arithmetic, db tests on the run).
- [ ] Next closes a question for good; a late answer to a closed question is refused (db test; the rebuilt TLA+ check passes).
- [ ] The run ends at zero by the server's clock, whatever the browser says (db test).
- [ ] A day's draft holds three questions from three families, longest list first, none within 30 days (unit test on the draft).
- [ ] From the switch day, Offbeat's boards and the overall board count no earlier run; earlier days still show in a player's history (db test).
- [ ] Nothing of the host, taken letters or sudden death is left in `src/`, `scripts/`, `content/` or the migrations' live functions (a grep with no hits).
- [ ] The new game is played start to end in a browser on a built app, by a signed-in player and a guest (e2e).

## Out of scope
- Linking one answer across several questions, and semantic search (the human: "later, once you add it to the database").
- The site building a list for a question typed in the admin (#260): it needs an AI call from the app, a key in Vercel and its own decision.
- "After a certain amount of time, they stop accepting common answers": not chosen (answer 6).
- A private test page before launch: not chosen (answer 12).
- Researching all 225 questions before launch: the game starts with the questions that are ready (answer 15).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 3 | Questions in a day | Human, 2026-11-23, answer 5 |
| 20 s | The clock at Start | Human, 2026-11-23, answer 10 |
| 3, 5, 8 s | Time a common, uncommon, rare answer adds | Human, 2026-11-23, answer 10; to tune |
| 5% per accepted answer | How fast the added time shrinks | Human, 2026-11-23, answer 10 ("about 5%"); to tune |
| 10, 25, 50 | Points for a common, uncommon, rare answer | Human, 2026-11-23, answer 11; to tune |
| 30 days | Gap before a question's category repeats | Existing (`bank.ts`); kept |
| 2 | Research passes a question needs | Human, 2026-11-23, answer 3 |
| 21 | Questions researched before the first week can be drafted | 7 days of 3 (answer 5) |
| | Offbeat's new par | Blank: the human picks after the first week of real runs (answer 14) |
| | Whether the shrink has a floor (a least time an answer adds) | Blank: ask in 23c |
| | How many days must be ready before the switch | Blank: ask in 23f |

## Still to ask (each in its sub-ticket, before that part is designed)
- 23a: where a tier comes from once players' shares exist (today rarity is pooled per category from play); what a brand and an "other reading" do.
- 23c: guests (the same run, or a shorter one); what a second tab or a lost connection does to a running clock.
- 23d: what the result screen shows (every answer given with its tier, the answers missed); the share text; what "on question 2 of 3" reads on the live board.
- 23f: what plor.app shows while the beta is paused.

Settled outside the sub-tickets: the two Fragments runs of 21,740 and 21,120 points stay in the ledger. The human, 2026-11-23: "Leave them". #295 changes the rule only; the weekly and overall boards keep those points, while the feed and the friends' board work a past day out again at the new rule (ROADMAP, "For quick fixes").

## Plan
Each sub-ticket writes its own steps as `<step> → verify: <check>` once its questions are answered. Order: 23a, then 23b and 23c side by side (different files: content and research against the run's tables), then 23d, 23e, 23f.

Hypothesis the first week tests: with the shrink at 5%, a strong run lasts two to six minutes. If the longest runs pass ten minutes, the shrink is too slow and the human picks a new rate.

## Removes
At the switch (23f): the seven-question day format, the host's answers and `HOST_ANSWERS_PER_QUESTION`, `LETTER_SCHEDULE` and taken letters, sudden death, the catch-rate guide in the draft, `content/offbeat/` days in the old format, and the old Offbeat TLA+ model. For everyday questions, their WordNet membership (23a). Each sub-ticket lists exactly what it deletes.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
