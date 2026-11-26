# M23 — Offbeat on a clock, with researched answer lists

**Status:** approved 2026-11-23 (the human: "Approve M23"), from the sixteen answers below. 23a is merged (#298); 23b-1 (the research skill and 21 lists) is merged (#302); 23c (the run on a clock, the server's side) is merged (#305); 23b-2 (the review page) is merged (#307); 23b-3 (the lists-only load onto plor.app, answers 36 to 39) is merged (#310). Each sub-ticket is designed from its own questions first; 23b and 23c next. A pilot of the research ran on three questions (below). The beta is paused until this ships (answer 16).

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

23a's first round (2026-11-23, after "Approve M23"):
17. Where a tier comes from once players have played: "Research first, play takes over (Recommended)". The researcher's tier holds until enough players have answered a question; then it follows what players typed.
18. Web research by Claude's agents as a source of answers, and what an answer carries: "Yes; no links kept". The list holds answers only; the pilot files' links are not carried into the format.
19. A brand typed for an everyday question (Tempur-Pedic, Twinkie): "brands should always count" (the human's own words, in place of the options).
20. An answer that fits another meaning of the word (flower bed, urinal cake): "Accept, as borderline (Recommended)". On the borderline list, accepted by default, shown to the human to strike.

23a's second round (2026-11-23):
21. How many players must have answered a question before play takes over its tiers: "50 players". At the beta's size (17 on its busiest day) most questions stay on the researched tiers for months; said in the option, chosen knowingly.
22. How a tier is read from play: "Only ever move one step". By rank (the ten most-typed answers common, the next twenty uncommon, the rest rare; 10 and 20 are Claude's starting numbers, to tune), an answer nobody has typed keeps its researched tier, and no answer moves more than one tier from what research said.
23. How far brands go and what one is worth: "Any real brand, tiered like any answer (Recommended)". A brand the research missed is refused until added, like any missed answer.
24. What the second pass does with an answer it can't confirm exists: "Keep it unless clearly wrong". The option's stated cost: an answer an agent invented could be accepted in play.

23b's and 23c's first round (2026-11-24, after #298 merged):
25. 23b, how the human reviews a question's borderline answers and brands: "An admin page with strike buttons (Recommended)". A write from the admin: its security change is proposed in 23b.
26. 23b, which 21 questions are researched first: "Claude picks everyday ones, you veto (Recommended)". Big sets wait.
27. 23c, a guest's run: "The same full run (Recommended)".
28. 23c, a lost connection or closed tab: "Clock keeps running (Recommended)". The server's clock never stops; coming back before zero carries on with what is left.

Second round (2026-11-24):
29. 23b, where a strike on the admin page lives: "In the database, folded into the file later (Recommended)". It takes effect at the next midnight; a later Claude session copies strikes into the list files, so git stays the full record.
30. 23b, where the review happens: "On plor.app's admin (Recommended)". The researched lists are loaded into plor.app's database before the switch, by the human's own load command (and the migration by `npx supabase db push`). This changes the earlier "nothing to the hosted database until the switch" for the lists alone; the beta is paused, so no player sees it.
31. 23c, the least time an answer adds: "Never less than 1 second". Not the recommended option: its stated cost is that a fast typist can keep a run going a long time. Commons reach the floor after about 22 accepted answers, rares after about 41.
32. 23c, a second tab or device on a running run: "Both show the same run (Recommended)".

33. 23c, a player who has run dry with time left: "A Finish button, on the last question (Recommended)". On question 3 Finish ends the run at once with the score as it stands; time left is worth nothing.

34. On hat's sample list (226 answers), 2026-11-24, in the human's words: "i want it to be as generous as possible, and specific variations of hats should count as diff types of hats. this must be balanced by the amt of tokens it costs obviously but theres no downsides to more answers". Claude's reading, said back to the human: a named variation (straw cowboy hat, wool beanie, fitted cap) is its own answer with its own time and points, not a typed form of its parent; lists lean to including; the two passes stay two, with no extra agents per question.

35. 2026-11-24, asked in chat with 23b-1's PR: "Should checkers keep removing names with no trace at all, or keep everything as you first answered?" The human: "Yes, keep that". So the checker removes a name that leaves no trace at all when searched for; a name it merely can't confirm stays (answer 24).
36. 2026-11-24, after 23b-2 merged (#307): "The 21 researched answer lists can't reach plor.app: the load command only fills an empty database, and plor.app's already has answers. How should the lists get there?" The human: "New lists-only load (Recommended)" (a new command the human runs themselves that adds only the researched lists, with the same type-the-host-name guard, leaving every existing answer untouched).
37. Same round: "Where do you want to do your review of the roughly 1,600 doubtful answers and 1,100 brands?" The human: "On plor.app".
38. Same round: "If the lists go onto plor.app before the new Offbeat ships, should today's old-style Offbeat days be able to use them?" The human: "No, keep them apart (Recommended)". Collision, for 23b-3's design: `data/categories.json` points 21 category keys (cheese, bread, ...) at the researched lists, so defining them on plor.app would make an old-style day drafted on one of those questions judge by its list. Days already played judge by the answers as they stood then and do not change.
39. 2026-11-24, the collision put to the human: "How should 'keep them apart' hold?" The human: "The pause is enough (Recommended)" (no old-style day is approved while the beta is paused; nothing extra is built).

23d's first round (2026-11-25, after #310 merged and the human's own lists load onto plor.app):
40. Which look 23d builds the screens in: "App's own look first (Recommended)". A style of its own comes later as its own ticket, once the human has judged M20 20m's mocks.
41. What the play screen shows of the answers already given on a question: "Just the last one". Not the recommended option (a growing list): the player cannot check what they have already typed.
42. What the result shows of the answers missed: "A sample of each rarity".
43. The share text: "Score and squares (Recommended)". One row of coloured squares per question, one square per answer by rarity, no words.

Second round (2026-11-25):
44. What typing a repeat shows: "\"Already said\" (Recommended)", a note different from the one for text that is not an answer.
45. Which missed answers, and how many: "3 each, same for everyone (Recommended)". Three common, three uncommon, three rare per question, picked once per day.
46. A long question's squares in the share text: "Wrap every 10 (Recommended)".

23d-2's round (2026-11-25, after #312 merged), on the finding that a day holds no rare answers:
48. Where the result's three rare missed answers come from: "Chosen when the day is drafted (Recommended)". Each day carries a short ordered list of rare answers per question, picked at drafting and seen by the human at approval; no new database permission.
49. How many the day holds per question: "6 per question (Recommended)". A player who gave up to three of them still sees three.
47. A friend's row on the live board mid-run: "Question and points (Recommended)", as "Question 2 of 3 · 180 points". The option's stated cost: a friend still to play sees scores before their own run.

23e's rounds (2026-11-25, "Start 23e"):

50. How the draft chooses a clock day's three questions from the researched lists: "Least recently used, random". Not "Easiest first, hardest last", not "I name them".
51. What the human can do with a question while approving (inbox #251), all four chosen: "Swap for another list", "Edit the wording", "Move questions up or down", "Redraft the whole day".
52. Whether what players type changes the tiers: "No, research decides (Recommended)". A tier that feels wrong is changed by the human on the Lists page.
53. A text enough players type that is on no list, on a clock day: "Queue them for your review (Recommended)". Still logged; the Lists page shows the most typed for Add or dismiss; nothing joins a list without the human.
54. Repeats while the lists are few (21 lists, three a day, round again in 7 days): "Repeat, and warn me (Recommended)". The draft says how many days ago each list last appeared.
55. How a swapped question's replacement is chosen: "I pick from a menu (Recommended)", least recently used first, with when each last appeared.
56. Where an edited wording goes: "That day only". Not the recommended "The list keeps it": the list's wording comes back the next time it is drafted.
57. How the six rare examples are chosen: "At random, I can re-roll (Recommended)". The same six for a date every time; the approval page shows them with a button to draw again.

The human's lists load, 2026-11-25 ("ok its ndone"): read back through the Supabase connector, plor.app's database holds 12,525 research things (12,504 answers and the 21 roots), 23 categories pointed at lists, all three migrations (last `20261125011243`), no list edits, and no day from today on.

Carried from 2026-11-17 (the bed-question session; HANDOFF of that date), still standing: a good list is "What players type first"; a prompt that reads two ways: "Drop such questions"; additions go through the "Admin page (#252)".

## The pilot (2026-11-23)
One sonnet agent per question, about 120,000 tokens and 3 minutes each, 5 to 11 web searches. Its three lists are `docs/research/research_notes/m23-pilot-bed.json`, `-acid.json` and `-cake.json`.

| Question | Before | After | Old members judged out | Refused last week, now accepted |
|---|---|---|---|---|
| Name a kind of bed | 25 | 109 | couch; deathbed, sickbed, marriage bed lean out | king, twin, twin XL, California king, Alaskan king, box bed, tatami bed |
| Name an acid | 145 | 177 | 13 (lansoprazole, vanadium pentoxide, cyanamide, …) | citric, nitric, stomach acid |
| Name a kind of cake | 106 | 138 | 68 (cookies, pancakes, doughnuts, tortilla, tostada, dog biscuit) | bundt, chocolate, vanilla, jello cake, tiramisu, mooncake |

What it showed: most of the gain is short forms ("king", "citric", "chocolate"); the obscure tail is about 60 to 70% complete by the agents' own estimate; a quarter to a half of the rare entries are from memory with no source; no agent found data on what people type first, so the tiers are judgement. The second pass (answer 3) exists for these gaps.

## The first 21 questions (proposed by Claude 2026-11-24, answer 26; the human, 2026-11-24: "Yes, these 18")
Done in 23a: bed, acid, cake. Proposed next, all everyday questions on WordNet lists today, at most seven per area so each day can take three areas:
- **Food (7 with cake):** cheese, bread, pasta, soup, candy, sandwich.
- **Wearing (4):** hat, bag, footwear, fabric.
- **Home (4 with bed):** kitchen utensil, tool, knot.
- **Science and body (4 with acid):** bone, gemstone, color.
- **Doing (2):** sport, dance.

Chosen for last week's refusals where there were any (knot 6, bone 4, hat 3, bag 3, kitchen utensil 1; read from plor.app 2026-11-24) and otherwise for being things most players can name ten of. Left for later: animals, places and games (big sets, answer 26), and book, language and world capital (factual sets with refusals: they need the nickname procedure).

## Design
**Why the lists are wrong today** (read by an Explore agent, 2026-11-23): 188 of 231 categories are every word under one WordNet synset (`scripts/base.ts`, `oewnSubtree`), membership is a tree walk (`private.category_members`), and no check compares a list with what players type. The admin pages can only accept a miss after the fact (`/admin/audit`).

**A researched list** is one file per question, in git: each answer's shown name, its other typed forms, its tier (common, uncommon, rare: the three the game already has; the pilot's "first ten" are the common tier's head), whether it is borderline, and where it was found. For an everyday question the file is the whole list. For a big factual set the file adds names to things the source already holds. How the file reaches the database, and whether a question's list replaces its category or sits beside it, is 23a's design and likely a migration.

**A run** (all judged and timed by the server, as today): Start opens question 1 with 20 seconds. Each accepted answer adds its tier's seconds times 0.95 to the power of the answers already accepted in the run, and its tier's points. An answer already given, or not on the list, changes nothing and is logged as a miss as today. Next closes the question for good and opens the next with the clock as it stands; after question 3 there is no Next. The run ends when the clock reaches zero. The one-typo rule and "every alias counts" stay (DECISIONS).

**A day** is three bank questions from three different families, the longest list first, none used in the last 30 days (the current gap), each fully researched (answer 15).

**The switch** (answer 12 and 14): the new game takes Offbeat's place on one day; the old game's code, the host, taken letters and sudden death are removed with it; boards count from that day.

## Sub-tickets, in order (one PR each)
- **23a, the list's format and its way into the database** (`M23-23a-researched-lists.md`, built and reviewed). The file's shape, the loader, how an everyday question's list replaces its tree, SOURCES.md and DECISIONS.md entries. The three pilot lists are its test data.
- **23b, the research procedure, the first 21 lists and the review page** (`M23-23b-research-and-review.md`, approved; 23b-1 merged, #302; 23b-2 merged, #307): a two-pass research skill, the 18 lists, the admin's review page with Strike, Add (#252) and Seen. #251 (edit or replace a question while approving) moves to 23e.
- **23c, the run on a clock, the server's side** (`M23-23c-the-run-on-a-clock.md`, approved, not started): tables and rules for a run, an answer, Next and Finish; guests; the TLA+ model rebuilt.
- **23d, the screens** (`M23-23d-the-screens.md`, approved 2026-11-25, "Approve 23d"; 23d-1 merged, #312; 23d-2 merged, #316). The play screen, the result screen, the share text, the live board's wording.
- **23e, drafting and approving a day** (`M23-23e-drafting-and-approving.md`, designed 2026-11-25 from answers 50 to 57, waits on the human's approval). `npm run draft` for three questions, the admin's approval of the new format, #251, texts on no list.
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
| 1 s | The least time an accepted answer adds | Human, 2026-11-24, answer 31 |
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
