# Process — Formal verification of three state machines; statecharts of three user flows

**Status:** drafted (2026-11-17), waiting for the human's approval. Eight questions answered (below, quoted); four open (end of "What the human decided"). Nothing installed or built.

## Goal
The three state machines where a bug costs players the most and tests reach the least each get a model that checks every order of steps, plus a project skill that tells the next agent when and how to recheck it. Three of the most important user flows get a statechart the human can read without knowing TLA+.

## Who uses it / what breaks without it
- **Used by:** every session that changes a Fragments run, an Offbeat run (signed in or guest) or group membership: the generated skill lists the files it covers, and the agent reruns its check before calling the work done. The human reads the statecharts and each check's findings in plain words.
- **Breaks without it:**
  - Races in these machines are found by reviews and then left untested: a retried word arriving after Next is judged on the next round (ROADMAP, "A retry of round k's word arriving after Next…", found in M16 16d-1); an Offbeat run's order rules sit in triggers with no row lock, so only primary keys guard two tabs (`supabase/migrations/20261111120000_guest_play_data.sql:78-127`); group membership's caps, last-member delete and creator handover race with account deletion (ROADMAP, "delete_account reads memberships once…").
  - Tests check the orderings someone thought to write; nothing checks the rest.
  - The human has no picture of how a player moves through the app; flows are only in code.

## What the human decided (2026-11-17, in chat)
The human asked: "use /create-formal-verification-skill to model these state machines, one skill per subsystem. and use /statechart to visualize my most important user flows", then gave the source: https://github.com/cursor/plugins/tree/main/pstack.

**Round 1**
1. **Which state machines:** **"Inventory first (Recommended)"**. A read-only survey found seven (a Fragments run, an Offbeat run, a guest's Offbeat run, the live board channel, a day's puzzle, a friend request and block, group membership), ranked in chat by harm against test reach.
2. **Tooling:** **"Install TLA+ here"**: mise, Java 25 and TLC on this PC, after the human OKs the downloads; fix or work around the Windows launcher.
3. **When a verify skill runs:** **"When code it covers changes (Recommended)"**: an agent touching a covered file reruns the check.
4. **Flows to draw:** **"New player's first day"**, **"A day's game, each game"**, **"Friends and groups"**.

**Round 2**
5. **Targets:** **"A Fragments run"**, **"An Offbeat run"** (signed in and guest as one model of the shared rules), **"Group membership"**. Not friend requests and blocks, the live board, or puzzle approval.
6. **Lane:** **"One process- branch"**: one ticket and one PR for all of it.
7. **Where the pstack skills live:** **"In the repo (Recommended)"**: copied into `.claude/skills`, MIT licence kept, pinned to pstack commit `2f87c85`, any Windows fix a reviewed change.
8. **Downloads:** **"Yes, all four"**: mise, Java Temurin 25, TLC 1.7.4's `tla2tools.jar`, and `pele@1.9.0`, onto this PC outside the repo.

**Open, for the human:**
- **A. Model bounds** (Numbers): how many tabs, players, rounds and members each model explores. The skill says keep them small; nothing gives the values.
- **B. Where the statecharts live:** in the repo (for example `docs/statecharts/`, Mermaid text plus SVG), or sent to the human and attached to the PR only.
- **C. The friends-and-groups chart:** friend requests get no verify skill (answer 5). Should their chart still model them (a model used only for the picture), or should the chart show groups only?
- **D. Adding the sources** (SOURCES.md: only a human adds one): the three rows under Source.

## Source
Proposed new SOURCES.md rows (open question D):
- **pstack `create-formal-verification-skill`**, https://github.com/cursor/plugins/tree/main/pstack/skills/create-formal-verification-skill, commit `2f87c854fe3e2fcda44ca86b46ede35aad3c46b7` (2026-11-16), read 2026-11-17: "Choose the target from the code", "Let the question choose the tool" (TLA+ for "whether events can happen in a bad order"), "What makes it good" (true to the code, able to fail, findings stay findings, honest about scope, cheap to rerun, a coverage record with a sync commit), "Generate the verify skill", "Prove it before you hand off".
- **pstack `statechart`**, same commit, `SKILL.md` and `references/render.md`: "Write the spec", "Pick the chart" (about 20 arrows, labels in the reader's words), "Read the report", "Show the chart" (500-state budget), rendering with Pele.
- **TLA+ tools**, https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4: `tla2tools.jar` 1.7.4, sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` (pinned in pstack's `statechart/scripts/run.ts:68`).

## Acceptance criteria
- [ ] `.claude/skills/statechart/` and `.claude/skills/create-formal-verification-skill/` match pstack at `2f87c85` byte for byte, except the Windows changes listed in Source diff, with pstack's LICENSE beside them.
- [ ] `statechart`'s own corpus example `Counter` runs on this PC and its `chart.mmd` matches the corpus copy.
- [ ] Three generated skills, one per target (a Fragments run, an Offbeat run, group membership), each with frontmatter, a coverage record (files and functions) and a sync commit; each is listed by the session's skill list.
- [ ] Each check runs with one `npm run` command (DECISIONS, Task runner) and passes, or fails only on findings reported in plain words.
- [ ] Each check is shown catching a scratch break in the real code (a removed check or a reordered step), then passes again once the break is dropped; the output of both runs is in Evidence.
- [ ] Each finding is in ROADMAP "Next revision" with its counterexample as numbered steps in the app's words, and is not fixed in this PR (CLAUDE.md, Done means 4; the skill's "Findings stay findings").
- [ ] Three statecharts (a new player's first day; a day's game in each game; friends and groups), each about 20 arrows or fewer, sent to the human as SVG with their Mermaid text.
- [ ] DECISIONS.md has a row for formal verification beside Tests (a second way to check needs an entry), and its Log records this ticket.
- [ ] The reviewer agent has reviewed the diff.

## Out of scope
- Fixing anything a check finds (answer 5's targets; findings go to ROADMAP).
- Friend requests and blocks, the live board, puzzle approval as verify targets (answer 5).
- Running the checks in CI (answer 3).
- pstack's other skills and agents, including `maintain-formal-verification-skill` (not asked for; the generated skills' own sync-commit steps cover keeping a check in line).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| pstack commit `2f87c85` | The skills copied into the repo | Human, 2026-11-17, answer 7 |
| TLC 1.7.4, sha256 `936a2620…0e88` | The model checker | pstack `statechart/scripts/run.ts:68` |
| Java Temurin 25 | TLC's runtime | pstack `statechart/scripts/run.ts:69` (`java@temurin-25`) |
| `pele@1.9.0`; render options `limit` 1,000,000, `outputLimit` 8,000,000, `maxEdges` 10,000 | Drawing the SVGs | pstack `statechart/references/render.md` |
| 500 states | Above it the chart draws only bug paths | pstack `statechart/SKILL.md`, "Show the chart" |
| 100,000 distinct states | Bound on each rerun after a rule breaks | pstack `statechart/SKILL.md`, "Read the report" |
| About 20 arrows | Chart readability target | pstack `statechart/SKILL.md`, "Pick the chart" |
| Node 22.18–22.x or ≥ 23.6 | Running the statechart scripts (this PC: 24.11.0) | pstack `statechart/scripts/statechart` |
| Rounds per Fragments day; questions per Offbeat day | Model size | From the code, read when modelling (cited in each spec) |
| Tabs per run, players per group, groups per player, rounds explored | Model bounds | **Open: question A** |
| How long a check may take to stay "cheap to rerun" | Each check's run time | **Open: ask with A** |

## Plan
1. Add the three Source rows to SOURCES.md, on the human's OK (D) → verify: `grep -c "2f87c854" docs/SOURCES.md` prints 2 or more.
2. Copy both skills from pstack at `2f87c85` into `.claude/skills/`, with LICENSE → verify: a script compares each file's git blob hash with `gh api repos/cursor/plugins/git/trees/2f87c85…?recursive=1` and prints no mismatch.
3. Install mise, then `mise install java@temurin-25` and TLC; install `pele@1.9.0` outside the repo → verify: `mise where` prints the TLC folder; `java -version` prints 25; `node -e "import('pele')"` from the install folder exits 0.
   *Hypothesis:* the launcher `scripts/statechart` runs under Git Bash's `sh`, and Node 24.11 runs `statechart.ts`; `run.ts` spawns `/bin/sh` to kill a timed-out TLC, which Node on Windows probably cannot find, so only the timeout path fails. *Disproved if* the Counter example fails before TLC runs, or the timeout path works.
4. Run the statechart test suite and the Counter example → verify: `npm test` in `.claude/skills/statechart/scripts` passes; the Counter `chart.mmd` matches the corpus. Any Windows fix is the smallest change that makes these pass, recorded in Source diff.
5. For each target, in order of value (a Fragments run, an Offbeat run, group membership): follow `create-formal-verification-skill` → verify: the generated `npm run` check prints a pass or the expected findings; a scratch break in the real code makes it fail; dropping the break restores the first result (both outputs in Evidence).
6. Write each finding into ROADMAP "Next revision" → verify: `grep` finds each by its rule name.
7. Write the three flow specs and views, draw them with `statechart`, render SVGs with Pele → verify: each `chart.mmd` exists and has 20 or fewer arrows (`grep -c -- "-->"`); send the SVGs and Mermaid to the human.
8. DECISIONS row and Log; ROADMAP row; this Status line → verify: `grep` for each.
9. Reviewer agent on the diff → verify: its report; fix only blocking findings.
10. Scraps: scratch folders removed; installed tools stay (they are what the checks run on) → verify: `git status` clean apart from the PR's files.

## Removes
Nothing: this adds tooling and skills. Nothing existing becomes unused.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
