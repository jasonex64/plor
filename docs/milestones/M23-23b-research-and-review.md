# M23 23b — The research procedure, the first 21 lists, and the human's review page

**Status:** designed 2026-11-24 from answers 1 to 4, 15 and 17 to 30 in `M23-offbeat-on-a-clock.md`; **approved 2026-11-24, its security change included (the human: "Approve both", to "Approve both designs, including their two permission changes?")**. **23b-1 is built (2026-11-24): the skill, the validator's bank check, 21 lists at two passes; in its PR.** 23b-2 (the review page) is not started.

## Goal
Eighteen more questions get researched lists the same way each time, in two passes, and the human can read a list's doubtful answers on plor.app and strike or add one from a phone.

## Who uses it / what breaks without it
- Used by: Claude sessions researching a question; the human reviewing lists; 23e's draft, which may only use a question that passed both passes and was seen (answer 15).
- Breaks without it: only bed, acid and cake can be played, and nobody but a Claude session can take a wrong answer off a list.

## Source
- The human's answers (the M23 ticket): 1 to 4 (what a list is, borderline accepted and shown, two passes, Claude researches), 15 (only fully researched questions), 18 (no links), 19 and 23 (brands count, tiered), 20 (other meanings are borderline), 24 (keep unless clearly wrong), 25 (an admin page with strike buttons), 26 and "Yes, these 18" (which questions), 29 (a strike lives in the database, folded into the file later), 30 (reviewed on plor.app). Inbox #252 (add an answer to a pool), closed into this ticket.
- `docs/DECISIONS.md`: "Answer database imports" and "Accepted answers" (as 23a left them); the Log's security changes for admin functions (2026-10-21 `approve_puzzle`, 2026-11-15 `category_pool`), whose pattern the new functions follow.
- How the admin writes today, read by an Explore agent, 2026-11-24: every admin write is a `security definer` function with an empty `search_path` that checks `private.admin` and raises `OB007`, called by `plor_app` from a route that checks `isAdmin` first; `private.next_reset()` is the next midnight (America/Los_Angeles); a `removed_at` in the future is honoured by play and treated as gone by drafting; `supabase/tests/plor_app_role.test.sql` pins the role's grants. **Unverified by this session:** `private.add_player_thing`'s body, and how a server page on Vercel reads `content/lists/` (the bundled Next.js docs are read first).
- No source covers how to research a list. The procedure below is Claude's, from the pilot, for the human's approval here.

## Assumptions
1. Inbox #251 (edit or replace a question while approving a day) moves to 23e, where a day is approved; only #252 is built here.
2. A load brings back any answer the files still give. So a strike not yet copied into its file would be undone by the next load: the load refuses to run while such a strike exists (below).
3. The review page needs each answer's marks (brand, borderline, tier), which live in the file and not the database. The page reads them from the list files shipped with the site.

## Design
### Part 1: the research procedure (a skill, `research-list`)
One question at a time, two agents that never see each other's reasoning, both on `sonnet`:
- **Pass 1, the researcher.** Given the prompt, today's members, and what players typed and were refused. It searches the web widely (not only Wikipedia), and writes `content/lists/<key>.json`: every answer a fair player might give, each with its typed forms (short forms such as "king", spellings, plurals the loader doesn't make) and a tier. Rules it is given, from the answers: common is what players type first; brands count and get a tier like any answer, marked `brand`; an answer that fits another meaning of the word is kept and marked `borderline`, as is any doubtful fit; an old member that doesn't fit is left out; no links. It ends with `passes: 1`.
- **Pass 2, the checker.** A fresh agent given the list and the prompt only. It removes an answer only when it is clearly wrong (not a real thing, or plainly not an answer to the question); what it can't confirm stays (answer 24). It hunts for missing answers by a different route than pass 1 (other kinds of page, other regions' words), checks every refused answer from plor.app is either on the list or deliberately off it, fixes two answers sharing a typed form, and sets `passes: 2`.
- **After both:** `npm run content:validate`; the category becomes `"source": "research"` in `data/categories.json`; the bank question's own names (`host_bank`, `uncommon`) must all be on the list, which the validator now checks (23a's review item: the cake question still names brownie, cookie and waffle; fixed here).
- The 18 run in batches of six agents at a time. Refused answers are read from plor.app once, read-only, by the main session and handed to each agent.

### Part 2: the review page, `/admin/lists`
- A list of the researched questions with, for each: how many answers, how many borderline and brand, whether both passes are done, and whether the human has seen it.
- A question's page shows its borderline answers and brands first, then every answer with a search box. Each has **Strike**; a struck answer shows **Undo** until midnight. **Add an answer** takes a name. **Seen** marks the list reviewed.
- Phone first, built from the admin's existing pieces (`admin.module.css`, the kit's buttons, the answer pool's search).

### Part 3: where a strike and an add live (answer 29)
- **A strike** ends the answer's membership at the next midnight (`private.next_reset()`), the way a load ends what the files stop giving, so a day being played never changes. It is recorded in a new table with who and when.
- **An add** uses the way an admin already accepts an answer for one category (`private.category_extra`, as the Audit page's "Accept as"): it counts at once.
- **Seen** is recorded per category with who and when.
- **Folding:** `npm run lists -- fold`, run by a Claude session, reads the recorded strikes, adds and seen dates from plor.app (read-only) and writes them into the list files: a struck line is deleted, an added answer becomes a line (rare, no marks), `borderline_seen` gets its date. The commit is the fold. After the next load the database marks those records folded.
- **The load's guard:** `npm run base -- hosted check` lists strikes and adds not yet in the files, and `hosted load` refuses while there are any, naming the fold command.

### The security change (needs the human's OK; recorded in DECISIONS.md's Log)
- Two new tables in `private`, RLS on, no grant to any role: `list_edit` (category, answer, strike or add, who, when, folded when) and `list_seen` (category, who, when).
- Four new functions `plor_app` may execute, each `security definer` with an empty `search_path`, each checking `private.admin` and raising `OB007` otherwise, each writing `private.base_log` with the admin as actor: `list_strike`, `list_unstrike`, `list_add`, `list_mark_seen`. One admin-only read function, `list_edits`, for the page and the fold.
- What an admin can newly do through the site: end or restore one answer's membership in one researched category, add one answer to one researched category, mark one list seen. Nothing else: no other table, no other category kind, no role or grant beyond these executes.
- What a non-admin can newly do: nothing (each function refuses; a db test per function proves it).

### Getting the lists onto plor.app (answer 30)
The human runs, once 23b's PR is merged: `npx supabase db push` (23a's and 23b's migrations), then `npm run base -- hosted load`. The session says in plain words beforehand what each will change. Until then the review page shows nothing on plor.app and works on the local site.

## Sub-parts, one PR each
- **23b-1:** the skill, the validator's bank check, and the 18 lists (content and docs only; no migration).
- **23b-2:** the review page, the two tables, the five functions, the fold, the load's guard.

## Acceptance criteria
23b-1
- [ ] 21 list files validate, each with `passes: 2` (`npm run content:validate`).
- [ ] For each of the 18, every answer players were refused last week is on the list or named in the PR as deliberately left off (a table in Evidence).
- [ ] Every name in a researched question's `host_bank` and `uncommon` is on its list (a validator unit test that fails on the cake question as it stands today).
- [ ] After `npm run base -- load all` locally, each researched category's members equal its file (the existing db test, over 21 keys).

23b-2
- [ ] A struck answer is still accepted today and refused from the next midnight; Undo before midnight restores it (db test with the clock moved).
- [ ] An added answer is accepted at once (db test).
- [ ] Each of the four writing functions refuses a non-admin with `OB007` and writes nothing (db tests); `plor_app_role.test.sql` lists exactly the five new executes.
- [ ] `npm run lists -- fold` turns a strike, an add and a seen mark into the file changes described (unit test on the fold's pure part).
- [ ] `hosted load`'s guard refuses when an unfolded strike exists (unit test on the check it runs).
- [ ] The page is used start to end in a browser at phone and desktop size: open a list, strike, undo, add, mark seen (e2e, `@visual`), and the videos are sent to the human.

## Out of scope
- Researching the other 204 questions; big sets' nicknames (a later sub-ticket).
- Editing an answer's tier or typed forms from the page (a session edits the file).
- #251 (moved to 23e), #260.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 2 | Passes per question | Human, 2026-11-23, answer 3 |
| 18 | Questions researched here | Human, 2026-11-24, "Yes, these 18" |
| 6 | Research agents at once | Claude's, to stay under the session's ten-agent guideline; not a product number |
| 8, 6 | Fewest searches or page reads for the researcher, fewest searches for the checker | Claude's (the skill); the checker's added after hat's first checker searched nothing |
| about 30 to 40 | Answers in a list's common tier | Claude's (the skill), a guide the lists run past: 32 to 94 |
| 10 | The most obvious answers, listed first in a file | Claude's (the skill), from the pilot's "first ten" |
| 1 in 5 | Removals and corrections by the checker above which pass 1's brief is fixed before more questions run | Claude's (this ticket's hypothesis) |

## Plan
23b-1
1. Write the skill from the pilot's prompt and the rules above → verify: run it on **hat** alone, both passes; the list validates and the human is shown its borderline list in chat as a sample before the other 17 run.
2. The validator's bank check, failing test first → verify: `npx vitest run scripts/content-validate.test.ts`; then fix the cake question's bank names.
3. Research the other 17 in three batches → verify after each batch: `npm run content:validate`.
4. `categories.json`, `npm run base -- load all`, the db test over 21 keys → verify: `npx vitest run scripts/research.db.test.ts --no-file-parallelism`.
5. Reviewer, PR.

23b-2: written as checks once 23b-1 is merged and `add_player_thing` has been read.

Hypothesis for step 1: the second pass changes fewer than one answer in five. If it rewrites more, pass 1's prompt is wrong and is fixed before the batch, not after.

## Removes
- The WordNet roots of the 18 categories in `data/categories.json`.
- 23a's review item on the cake bank names (ROADMAP), once fixed.

---
## Source diff
| Source says | We built | Why different |
|---|---|---|
| Answer 24: an answer the second pass can't confirm exists: "Keep it unless clearly wrong" | The checker removes a name with **no trace at all** when it searches for it, as "not a real thing"; a name it merely can't confirm stays | Claude's reading, made when two first researchers reported inventing placeholder rows under the generosity rule. Said to the human in chat the same day, not put to them as a question: theirs to overrule. Across 21 lists it removed about two dozen rows and typed forms |
| Answer 1: every old member is judged keep or remove | The skill also leaves out parts and accessories of the thing, and one-off proper names unless the prompt asks for them | Claude's rule for what "not an answer" means; borderline cases are kept and marked instead |
| Answer 34: "as generous as possible" | Colours, sizes and adjectives nobody names a thing by ("big hat") are not variations; rows are never built by combining words | Claude's line between generous and padded, after candy's first pass was built by a script |
| Answer 3: the second agent "tests it against what players typed" | Done in every run (each checker's brief held the refused texts), but the skill's text first gave them to the researcher only | Fixed in the skill after the review |
| The design: tiers by "what players type first" | Common tiers of 32 to 94 answers, by each agent's judgement; no data on what players type first exists yet | Play takes the tiers over after 50 players (answers 21, 22; 23e) |
| The design: 23b-1 has no migration | As designed | |

## Evidence
**Step 1, the skill proven on hat, 2026-11-24.** `.claude/skills/research-list/SKILL.md`. Pass 1 (about 11 searches and page reads, 129,000 tokens, 3 minutes): 33 old members → 201 answers; "beanie" (refused 3 times last week) is the fifth answer; one old member left out (millinery, the trade). Pass 2 (112,000 tokens, 1.5 minutes): removed nothing, added 24 answers and aliases to 10, re-tiered 2, marked 1 borderline: 37 of 201 changed, about 18%, under the hypothesis's one in five. Final: 226 answers (54 common, 89 uncommon, 83 rare), 27 borderline, 16 brands; `npm run content:validate` → `CONTENT OK content: 33 file(s)`. **Shortfall:** pass 2 searched nothing and added from memory, so its rarer additions are unconfirmed; the skill now requires at least six searches of the checker. Not yet done for hat: `categories.json`, the load, the db test (step 4, with the others).

**The rule changed after hat's sample** (answer 34, 2026-11-24: "as generous as possible, and specific variations of hats should count as diff types of hats"). The skill gained four rules as the batches ran, each from a report: a named variation is its own answer and is split out from the start (pasta's checker split 25); generous is not padded (candy's and cheese's first researchers built rows by script or invented placeholders and stripped them); the checker hunts invented entries first; the checker searches (hat's first checker did not). The hypothesis's "one in five" was restated to count removals and corrections only, since under answer 34 the checker is expected to add much: no list's checker removed or corrected more than 17% (tool); kitchen utensil's reported about a third counting its 92 splits, which the restated measure does not count.

**Criterion 1, 21 lists at two passes.** `npm run content:validate` → `CONTENT OK content: 50 file(s)`. Answers per list after both passes (old members in brackets): acid 308 (145), bag 305 (60), bed 307 (25), bone 219 (118), bread 721 (114), cake 422 (106), candy 910 (71), cheese 636 (48), color 1,355 (147), dance 960 (107), fabric 625 (290), footwear 564 (57), gemstone 586 (59), hat 465 (33), kitchen utensil 516 (121), knot 330 (32), pasta 271 (28), sandwich 682 (18), soup 557 (49), sport 857 (187), tool 908 (400): 12,504 in all, about 1,600 marked borderline and 1,100 brand. bed, acid and cake, written in 23a before answer 34, got a second pass under it.

**Criterion 2, last week's refused answers** (read from plor.app 2026-11-24, 14 texts over 5 of the 18; the others had none):
| Question | Typed | Now |
|---|---|---|
| hat | beanie (3) | accepted, the fifth answer |
| bag | sleeping, sling, plastic | accepted, as short forms |
| bone | pelvic (2), clavical, distal metatarsal | accepted (hip bone, clavicle, metatarsal) |
| kitchen utensil | air fryer | accepted, borderline |
| knot | dead, deadknot | accepted as dead knot (in wood), borderline; "deadknot" by the one-typo rule, not tested here |
| knot | ready, real, reddit, tigt | deliberately off: not knots |
The accepted ones are in `scripts/research.db.test.ts`'s "accepts" cases, with bed's "water" and cake's "tirimisu".

**Criterion 3, the bank's names.** `npx vitest run scripts/content-validate.test.ts` → 27 passed; the new case failed first (`expected [] to deeply equal [ Array(1) ]`). On the real content the check then found 17 problems, fixed in `content/bank.json`: brownie, cookie and waffle off the cake question; hotdog, tunaburger, four-poster and sunhat respelled as their lists have them; ten thing IDs (cheese 5, tool 2, dance 2, sport 1) replaced by the names they stood for.

**Criterion 4, members equal the files.** `npm run base -- load all` → `DEFINED 231 categories`, `ENDING at 2026-11-25T08:00:00+00:00, as the files no longer give them: 126 names, 0 facts`; `npx vitest run scripts/research.db.test.ts --no-file-parallelism` → 43 passed (21 membership cases, 17 accepts, 4 refusals, the old-day case). The two letter subsets on researched bases still have members (`sport_f` 75, `tool_w` 73). `npm test` → 878 passed; `npx tsc --noEmit` and eslint on the changed scripts clean.

**Not verified.** Most rare answers were not confirmed one by one: checkers searched the doubtful ones (cheese's ran 25 searches and removed 2), and gemstone's and dance's additions lean most on memory; by answer 24 what can't be confirmed stays. No list was looked at by the human except hat's sample in chat. The lists are on the local stack only.

## Review
23b-1: the `reviewer` agent, 2026-11-24, fresh context. It reran `content:validate` and the three test files (75 passed), sampled eight lists with its own script, and found no problem in the code, tests or commits.
- Blocking findings and how each was fixed: (1) the Source diff was empty: filled. (2) The skill's numbers had no recorded origin and its header called Claude's procedure the human's rules: Numbers rows added, the header rewritten. (3) Removing a name with "no trace at all" narrows answer 24 by Claude's reading: recorded in the Source diff as a deviation, with its reason, and told to the human in the PR and in chat as theirs to overrule; the skill now gives the refused texts to the checker too. (4) The handoff and ROADMAP said "in its PR" before one was open: the PR is opened with this commit.
- Deferred to ROADMAP "Next revision", For M23: the list findings for the human's review (candy's 497 brand rows, many product variants; makers that aren't tools; teeth and numbered vertebrae under bone; hair knots and a bird under knot; over-high tiers); the unchecked family links for knife, tooth and hat; the drafted days of Nov 24 to 30 that must not be approved.
- Unverified by the reviewer: plor.app's refusal counts; that each replaced thing ID was the name claimed (checked by the main session against the local database before replacing); the lists' rare entries; the checkers' percentages.
