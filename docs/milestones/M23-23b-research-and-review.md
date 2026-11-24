# M23 23b — The research procedure, the first 21 lists, and the human's review page

**Status:** designed 2026-11-24 from answers 1 to 4, 15 and 17 to 30 in `M23-offbeat-on-a-clock.md`; **approved 2026-11-24, its security change included (the human: "Approve both", to "Approve both designs, including their two permission changes?")**. 23b-1 is being built; 23b-2 follows it.

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

## Evidence

## Review
