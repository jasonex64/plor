# Process — Formal verification of three state machines; statecharts of three user flows

**Status:** done (2026-11-17): built, reviewed (three blocking items fixed), `main` merged in; one PR from `process-formal-verification`, for the human to merge. Approved 2026-11-17 (the human: "Approve it"); sixteen questions answered (below, quoted).

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

**Round 3** (the open questions A to D)
9. **Run bounds:** **"All 7, two tabs (Recommended)"**: the real day (`QUESTIONS_PER_DAY`, `src/config/tunables.ts:4`; `SUBSTRING_ROUNDS`, `:192`, seven rounds), played from two tabs at once.
10. **Group bounds:** **"Shrunk: 3 players, cap 2 (Recommended)"**: 3 players, a member cap of 2 and a groups-per-player cap of 1, in place of 50 and 10 (`src/config/tunables.ts:49-50`); the report says the caps were shrunk.
11. **Run time:** **"Under 1 minute (Recommended)"**.
12. **Where the statecharts live:** **"In the repo (Recommended)"**: `docs/statecharts/`, each chart's TLA+ spec, view, Mermaid and SVG.
13. **The friends-and-groups chart:** **"Both, chart-only model (Recommended)"**: a small model of friend requests and blocks written only for the picture, beside the groups model; its half of the chart is labelled "not verified".
14. **If a 7-round, two-tab model takes over a minute:** **"Keep 7, allow longer (Recommended)"**: the measured time goes in the skill.
15. **Sources:** **"Yes, add all three"**. Then: **"Approve it"**.
16. **The statechart tests** (2.9 MB, not the ~200 KB Claude had estimated): **"Without tests (Recommended)"**.

## Source
New SOURCES.md rows (answer 15):
- **pstack `create-formal-verification-skill`**, https://github.com/cursor/plugins/tree/main/pstack/skills/create-formal-verification-skill, commit `2f87c854fe3e2fcda44ca86b46ede35aad3c46b7` (2026-11-16), read 2026-11-17: "Choose the target from the code", "Let the question choose the tool" (TLA+ for "whether events can happen in a bad order"), "What makes it good" (true to the code, able to fail, findings stay findings, honest about scope, cheap to rerun, a coverage record with a sync commit), "Generate the verify skill", "Prove it before you hand off".
- **pstack `statechart`**, same commit, `SKILL.md` and `references/render.md`: "Write the spec", "Pick the chart" (about 20 arrows, labels in the reader's words), "Read the report", "Show the chart" (500-state budget), rendering with Pele.
- **TLA+ tools**, https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4: `tla2tools.jar` 1.7.4, sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` (pinned in pstack's `statechart/scripts/run.ts:68`).

## Acceptance criteria
- [x] `.claude/skills/statechart/` and `.claude/skills/create-formal-verification-skill/` match pstack at `2f87c85` byte for byte, except the Windows changes listed in Source diff and the statechart tests (answer 16), with pstack's LICENSE beside them.
- [x] `statechart`'s own corpus example `Counter` runs on this PC and its `chart.mmd` matches the corpus copy.
- [x] Three generated skills, one per target (a Fragments run, an Offbeat run, group membership), each with frontmatter, a coverage record (files and functions) and a sync commit; each is listed by the session's skill list.
- [x] Each check runs with one `npm run` command (DECISIONS, Task runner) and passes, or fails only on findings reported in plain words.
- [x] Each check is shown catching a scratch break in the real code (a removed check or a reordered step), then passes again once the break is dropped; the output of both runs is in Evidence.
- [x] Each finding is in ROADMAP "Next revision" with its counterexample as numbered steps in the app's words, and is not fixed in this PR (CLAUDE.md, Done means 4; the skill's "Findings stay findings").
- [x] Three statecharts (a new player's first day; a day's game in each game; friends and groups), each about 20 arrows or fewer, in `docs/statecharts/` with spec, view, Mermaid and SVG, and sent to the human. The friends half of the third is labelled "not verified" (answer 13).
- [x] DECISIONS.md has a row for formal verification beside Tests (a second way to check needs an entry), and its Log records this ticket.
- [x] The reviewer agent has reviewed the diff.

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
| 7 questions (Offbeat), 7 rounds (Fragments), two tabs | Run model bounds | `src/config/tunables.ts:4`, `:192`; human, 2026-11-17, answer 9 |
| 3 players, member cap 2, groups-per-player cap 1 | Group model bounds | Human, 2026-11-17, answer 10 |
| Under 1 minute per check; a run model over it keeps 7 rounds | "Cheap to rerun" | Human, 2026-11-17, answers 11 and 14 |

## Plan
1. Add the three Source rows to SOURCES.md (answer 15) → verify: `grep -c "2f87c854" docs/SOURCES.md` prints 2 or more.
2. Copy both skills from pstack at `2f87c85` into `.claude/skills/`, with LICENSE → verify: a script compares each file's git blob hash with `gh api repos/cursor/plugins/git/trees/2f87c85…?recursive=1` and prints no mismatch.
3. Install mise, then `mise install java@temurin-25` and TLC; install `pele@1.9.0` outside the repo → verify: `mise where` prints the TLC folder; `java -version` prints 25; `node -e "import('pele')"` from the install folder exits 0.
   *Hypothesis:* the launcher `scripts/statechart` runs under Git Bash's `sh`, and Node 24.11 runs `statechart.ts`; `run.ts` spawns `/bin/sh` to kill a timed-out TLC, which Node on Windows probably cannot find, so only the timeout path fails. *Disproved if* the Counter example fails before TLC runs, or the timeout path works.
4. Run the statechart test suite and the Counter example → verify: `npm test` in `.claude/skills/statechart/scripts` passes; the Counter `chart.mmd` matches the corpus. Any Windows fix is the smallest change that makes these pass, recorded in Source diff.
5. For each target, in order of value (a Fragments run, an Offbeat run, group membership): follow `create-formal-verification-skill` → verify: the generated `npm run` check prints a pass or the expected findings; a scratch break in the real code makes it fail; dropping the break restores the first result (both outputs in Evidence).
6. Write each finding into ROADMAP "Next revision" → verify: `grep` finds each by its rule name.
7. Write the three flow specs and views in `docs/statecharts/`, draw them with `statechart`, render SVGs with Pele → verify: each `chart.mmd` exists and has 20 or fewer arrows (`grep -c -- "-->"`); send the SVGs and Mermaid to the human.
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
| statechart: copy as published (`2f87c85`) | Without `scripts/test/` (2.9 MB, 410 files with it; 226 KB, 34 files without) | The human, 2026-11-17: "Without tests (Recommended)", after Claude's ~200 KB estimate proved wrong. The suite is run from a scratch clone instead (Evidence) |
| statechart `run.ts` `killGroup`: `/bin/sh -c 'kill -s KILL -- "-$1"'` | On Windows, `taskkill /PID <pid> /T /F`; elsewhere unchanged | Windows has no `/bin/sh` for Node to spawn and no process groups; `/T` ends the same tree. Hypothesis 1 (only the timeout path fails) was disproved: every run starts the janitor |
| statechart `statechart.ts`: a `/bin/sh` janitor that waits for the parent's stdin to close, then kills the worker's group and removes two folders; the worker's `TMPDIR` set to the run's temp folder | On Windows, the same janitor as a `node -e` one-liner using `taskkill /T` and `fs.rmSync`; the worker also gets `TEMP` and `TMP`, and `windowsHide` | As above; Node on Windows reads `TEMP`/`TMP`, not `TMPDIR`, so the worker's temp files would escape the cleanup. On POSIX `TMPDIR` still wins, so nothing changes there |
| statechart `run.ts`: TLC's output split on `\n` | Split on `\r?\n` | TLC on Windows ends lines with `\r\n`, so `verdict.ts`'s `/^Invariant (.+) is violated\.$/m` never matched and every broken rule read as "names no rule" |
| create-formal-verification-skill: refer to `/statechart` by name and copy none of its commands into the generated skill or its scripts | `scripts/verify.ts` runs TLC directly, with the same tool pins as statechart's `run.ts:68-69` (TLC 1.7.4 by checksum, `java@temurin-25`) | A check needs a plain pass or fail per rule and "this finding still breaks"; statechart is for reading a failure, and the skills tell the agent to read with it by name. The pins are written twice (here and in the copied statechart); a bump changes both |
| create-formal-verification-skill: show each property failing on a broken variant | 14 of the 18 rules seen failing: Fragments' two kept rules and all six of Offbeat's on scratch breaks of the real code, Fragments' two findings on today's code, four of the eight group rules on breaks; the other four listed in `verify-group-membership` with the reason | A rule held by two guards fails only when both go (shown); a rule whose break needs bigger bounds than answer 10 (group handover order; a double join the groups cap refuses first) or rests on a foreign key's cascade is named, not faked |
| create-formal-verification-skill: one indivisible step in the model is one in the code | Each model keeps only the open round or question and the counts the rules read; earlier rounds are flags set at the breaking step | Every rule in the code reads only those (each skill's "What it does not cover"); the full history made the Fragments model 69 million states and 8 min 19 s, the folded one 74,756 states and 1.5 s (Evidence) |
| statechart: work in a scratch folder outside the repo | Each check's model and view live in its skill folder; the flow charts in `docs/statecharts/` | The checks must be rerun by the next agent (answer 3); the charts' place is answer 12. statechart's own output still goes to a scratch `--out` |

## Evidence
All on the Windows PC, 2026-11-17.

**Sources (step 1).** `grep -c "2f87c854" docs/SOURCES.md` → `2`.

**The copied skills (step 2).** Every committed blob's git hash compared with pstack's tree at `2f87c85`
(`gh api repos/cursor/plugins/git/trees/2f87c85…?recursive=1`, `scripts/test/` left out) → `blob hashes identical`,
33 distinct files plus the licence twice. The working copy was then checked out again from the commit so the
`sh` launcher has LF line ends (`file …/scripts/statechart` → `POSIX shell script, ASCII text executable`).

**Installs (step 3).** mise v2026.11.9 from its GitHub release, `sha256sum -c` → `mise-v2026.11.9-windows-x64.zip: OK`;
`mise install java@temurin-25 "http:tla2tools[…checksum=sha256:936a…]@1.7.4"` → `✓ http:tla2tools@1.7.4`,
`openjdk version "25.0.5" 2026-10-20 LTS`; mise's folder added to the user PATH; `pele@1.9.0` in
`%LOCALAPPDATA%\pele` → `import('pele')` lists `render`. TLC's exit codes read from runs: `0` when every rule holds,
`12` when an invariant breaks.

**statechart on Windows (step 4).** Counter from pstack's corpus, before the changes: `spawn /bin/sh ENOENT`. After the
first two: exit 0, and `diff --strip-trailing-cr` against the corpus copies → `chart.mmd identical`, `report.md
identical`. pstack's own test suite, from an LF clone at `2f87c85` with `TLA2TOOLS` and `JAVA` set, TAP output, 25
minutes each: as published, 59 ok and 134 not ok before the timeout; with the three changes, 87 ok and 91 not ok, and
no test that passed as published fails (`comm -12` of the two lists is empty). Neither run finished: the signal tests
wait out their timeouts. The failures left are the tests' own POSIX assumptions: 74 `spawn EFTYPE` (they run the `sh`
launcher directly, which Windows can't; the skills run it through `sh`), 7 `EPERM` on `symlink` (Windows needs
Developer Mode), and the SIGINT/SIGTERM tests. The third change: the Fragments findings first read "TLC exited 12 … but its output names no rule that
broke"; after it, "TryJudgedOnItsRound breaks … The shortest path has 7 steps".

**The checks (steps 5 to 7).** `npm run verify -- <name>`, with the code as committed:
```
FragmentsRun.cfg: every rule holds (74756 distinct states, 1.5 s)
finding WordGoesToItsRound: still breaks, as recorded (0.9 s)
finding TryJudgedOnItsRound: still breaks, as recorded (0.9 s)
OffbeatRun.cfg: every rule holds (12043 distinct states, 1.1 s)
GroupMembership.cfg: every rule holds (97961 distinct states, 27.2 s)
```
Before folding history into flags, the Fragments model took `68891751 distinct states … Finished in 08min 19s`;
before SYMMETRY, the group model took 417 s.

Scratch breaks: each edits the real code and mirrors it in the model, runs the check, and is undone with
`git checkout` (`git status` clean of them after each batch):

| Break | Check's result |
|---|---|
| Fragments: no `run_over` in `round_open_rule` | exit 1, `Invariant NeverPastLast is violated` |
| Fragments: no `round_running` (OB014) alone | exit 0: the route only asks for the round after a done one |
| Fragments: OB014 gone and the route asks for `answered + 1` | exit 1, `Invariant RoundsOpenInOrder is violated` |
| Offbeat: no `time_up` | exit 1, `NoLateAnswer` |
| Offbeat: no primary key on `run_event` | exit 1, `AnswersInOrder` (alone: `OneAnswerPerQuestion is violated`) |
| Offbeat: no `run_over` in `open_rule` | exit 1, `NextOnlyAfterReveal` |
| Offbeat: no `not_open`, route and trigger | exit 1, `OnlyOpenQuestions` |
| Offbeat: no `out_of_order` alone | exit 0, 36,907 states: `not_open` and the key cover it |
| Offbeat: no `out_of_order` and no `not_open` | exit 1, `AnswersInOrder` |
| Offbeat: no `run_over` in `answer_rule` alone | exit 0: no question opens after the end |
| Offbeat: no `run_over` in either | exit 1, `NextOnlyAfterReveal` (alone: `NoAnswerAfterEnd is violated`) |
| Groups: no member cap (OB009) | exit 1, `MembersUnderCap` |
| Groups: no groups cap (OB010) | exit 1, `GroupsUnderCap` |
| Groups: no group lock in `group_member_guard` | exit 1, `MembersUnderCap` |
| Groups: no handover and no `player_group_creator_is_member` | exit 1, `CreatorIsMember` |
| Groups: `removeMember` without `g.creator_id = $1` | exit 1, `OnlyCreatorActs` |

The three skills registered: the session's skill list showed `verify-fragments-run`, `verify-offbeat-run` and
`verify-group-membership` as each was written.

**The statecharts (step 7).** `/statechart` on each spec: first day "Rules that hold: AccountStartsClean, NoDeadlock",
15 arrows; a day's game "SevenAtMost, NoDeadlock", 18 arrows; friends and groups "OneRelation, NoDeadlock", 15 arrows
in two regions. Rendered with pele 1.9.0, no `PeleError`; `a-days-game/chart.svg` looked at in the browser pane.

## Review
The `reviewer` agent (sonnet, fresh context), 2026-11-17: no defect in the three models (each action checked against
the code it cites), the Fragments finding real, the Windows changes correct; reran the three checks (exit 0, the same
state counts).
- Blocking findings and how each was fixed:
  - The handoff's section was a placeholder: rewritten.
  - This Status line, the unticked criteria and this section: filled in.
  - `main` had moved again (#276, lint rule 2): merged; lint clean on every tracked file (`local/no-invented-numbers`
    covers only `src/`, so `scripts/verify.ts` is outside it; `fail-loudly` passes); the statechart ignore sits beside
    #276's edits to `eslint.config.mjs`.
  - Not blocking but an acceptance criterion: the finding's path is now numbered steps, and leads with the likelier
    path (a tab left behind sends its word after the other tab's Next).
- Deferred to ROADMAP "Next revision" (For the agent rules): `scripts/verify.ts`'s loose ends (no INVARIANTS block,
  the silent "?", a raw ENOENT, `maxBuffer` without an origin); `TEMP`/`TMP` also set on POSIX and `taskkill /T` after
  the worker dies; the group skill's 28 s against the reviewer's 10.8 s; rules that hold only by the model's own guards
  until a guard goes.
