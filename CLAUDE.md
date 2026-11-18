# Agent Rules

This file is kept short on purpose. Read all of it before every task, and open the linked docs when a step tells you to.
**A mistake in code becomes a lint rule, not a sentence here:** a rule in `eslint-rules/` with a test that shows the mistake failing, switched on in `eslint.config.mjs` (`npm run lint`, run by CI). Only a mistake in what an agent *does* gets a line here, and only after an agent has made it or the human asks. *(Human, 2026-11-17; `docs/milestones/PROCESS-lint-rules.md`.)*

## Sessions are independent
Every session starts with no memory of earlier ones. Everything the next session needs is in the repo. *(Human, 2026-10-21.)*
- **First thing:** read `docs/HANDOFF.md`, then run `git branch -a` and `gh pr list`. If a milestone branch or PR is open, read `docs/HANDOFF.md` on that branch too; the most recently updated one wins.
- **Last thing:** before a session ends, or hands work to another agent, rewrite `docs/HANDOFF.md` and commit it on the branch you worked on (not on an `audit-` or `process-` branch, whose newer handoff would win over the milestones': its PR says where it stands). Say where things stand, what's half done, what waits on the human, anything left running, and the next step. Keep it short; history belongs in git.

## Ask before designing
For every ticket and every subject that needs the human's intent, ask guiding questions before proposing anything. *(Human, 2026-10-24: "let's do this process moving forward for every ticket and every subject that comes up so there's no confusion about what i want".)*
- **Rounds of up to four multiple-choice questions** (the AskUserQuestion tool). Start with the long-term picture, then narrow down to collisions between answers. Keep the questions inquisitive and concrete, give plain-language options that each state their trade-off, and let the human answer in their own words.
- **After each round,** say in a few lines what it settled. Then propose the design and record the answers in the ticket, quoted.
- **Overnight** nobody can answer: the `goodnight` skill says what to do instead.

## Before writing code
1. **Find the ticket.** All work happens against a milestone in `docs/milestones/`. If there's no ticket, stop and draft one for approval. The exceptions, each on its own branch with one PR: a quick fix ("Slots, lanes and the inbox", below), drafting a day's puzzle (DECISIONS.md, "Puzzle drafting"), the weekly audit (the `audit` skill), a docs-only tidy of an audit's findings, and changes to these rules (both on a `process-` branch, recorded in DECISIONS.md's log).
2. **Say where we are.** Give the current milestone, its status and what comes next, taken from `docs/ROADMAP.md`.
3. **Anchor to the source.** Read the cited sections in `docs/SOURCES.md` and name the sections you are following. If no source covers the work, stop and ask. Don't fill the gap from memory.
4. **Justify it.** The ticket must answer *Who uses this?* and *What breaks without it?* If the answer is "nothing yet", don't build it.
5. **Plan as checks.** Write each step as `<step> → verify: <check>`, where the check is a command whose output can fail. Run the check after each step; if it fails, fix and re-run it before the next step. A vague task becomes a check first.

## Hard rules
- **No invented numbers.** Every threshold, timeout, limit, rate, cost or tuning value comes from the source, the ticket or a human, and its origin is recorded in the ticket. If none of them gives the value, ask. Never pick a "reasonable default".
- **No assumptions stated as facts.** Before starting, state the assumptions the work rests on. If the task reads more than one way, list the readings and ask which one. If you didn't read it or run it, mark it *unverified*.
- **Hypothesis before experiment.** Before you run anything to "see what happens", write down what you expect, why, and what result would prove you wrong.
- **One way to do each thing.** Use what `docs/DECISIONS.md` specifies for logging, config, errors, tests, debugging and scripts. A second way needs a decision entry, and that same change removes the first way.
- **Keep the diff surgical.** Every changed line traces back to the ticket. Don't refactor, reformat or rename what isn't broken; record it under "Next revision" in ROADMAP.md instead.
- **Clean only your orphans.** Remove what your change made unused: imports, variables, functions, paths, flags, config, fields. Dead code that was already there is flagged under "Next revision", not deleted. Every commit lists what it removes, or why it removes nothing. *(Human, 2026-11-10.)*
- **Build for today.** Add no option, flag, field or stored data without a current caller, and no abstraction for code with a single use. The only exceptions are the items under "Hard to reverse" in DECISIONS.md.
- **Recovery needs a ticket.** Reconnect or retry is allowed only when the ticket specifies it, and it must be logged and counted. (Swallowed errors are the `local/fail-loudly` lint rule.)
- **No defensive bloat.** Validate at the boundaries: network, disk, user input and third-party APIs. Trust internal code, and don't guard against states that can't happen.
- **Never cheat a check.** Don't weaken, skip or delete a test or assertion, and don't mock the thing under test, just to get a green result. If a check is wrong, say so and fix it as its own change.
- **Comments explain why, not what.** When a source section or ticket explains the reason, link to it.
- **Repeated procedures are scripts.** If a multi-step procedure gets run twice, it becomes a script in `scripts/`, called through the task runner in DECISIONS.md. Don't hand-type a procedure that already has a script.
- **Leave no scraps.** Before you call a task done, remove temp files, debug code, experiment branches, stale artifacts and any processes you started.

## Security
- **Secrets never leave their home.** Passwords, connection strings, keys and tokens never appear in chat, commits, logs, test output or docs. When you check one, print only derived facts (host, port, "is set"). Never ask the human to paste a secret to you.
- **Staging and production secrets live only in Vercel env vars and the human's password manager.** Local files such as `.env.local` point only at the local stack. *(Added after an agent had the human put the staging master password in `.env.local`.)*
- **Least privilege.** App code connects as a dedicated role with only the grants it needs, never as `postgres` or with the `service_role` key, unless DECISIONS.md says otherwise.
- **Verify, don't disable.** Remote connections use verified TLS. Never turn off a security check to make something work; stop and ask instead.
- **Security changes need a human.** Changes to auth, roles, grants, RLS, network exposure or secret handling are proposed first and recorded in DECISIONS.md.
- **The Supabase connector: read freely, change only on the human's word.** A session may read the hosted database through the Supabase connector, which the human signs in to with their own Supabase account (human, 2026-11-14: "Full access"). Every change through it (a write, a setting, pausing or creating a project, anything that costs money) needs the human's go-ahead in that conversation for that one action, after the session has said in plain words what it will do. Migrations still reach the hosted database by `npx supabase db push`, and list loads by the human's own `npm run base -- hosted load` ("No, keep loads by hand"), until DECISIONS.md says otherwise. The connector holds no password and none is ever asked for.

## Stop and ask when
- the source is missing, ambiguous or contradicts another source
- a number is needed and nothing gives it
- you would have to break a rule above to continue
- an experiment has disproved your hypothesis twice (re-plan instead of trying random things)

## Testing
- Test what can actually break: branching logic, serialization and network messages, persistence and migrations, economy and currency math, concurrency, and anything that has broken before.
- A bug fix starts with a test that reproduces the bug and fails. Then make it pass.
- Use the cheapest test that catches the break. While iterating, run the targeted tests, not the full suite.
- Don't test getters, constants, framework behaviour or mocks.
- Long-running systems (servers, matchmaking, sessions, jobs) must be verified **running under realistic conditions**. That means started, reachable and doing real work, with evidence such as `scripts/status` output or log lines. "It compiled" and "it started" don't count as "it works".

## Done means
1. Every acceptance criterion has evidence (the command and its output, not a description).
2. The ticket's **Source diff** is filled in, and every deviation from the source has a reason.
3. The `reviewer` agent has reviewed the diff. It runs in a fresh context and did not write the code.
4. Only **blocking** findings get fixed now. Everything else is recorded under "Next revision" in ROADMAP.md *before* anything is done about it.
5. Scraps are removed.

**Every PR**, not just a milestone's last one, updates its ticket's **Status** line and its ROADMAP row in the same PR, before it is merged. *(Added after the M02 ticket and ROADMAP row fell three PRs behind, 2026-10-20.)*

Commits: `M##: <what changed> (removes: <what>)`; on an `audit-` or `process-` branch, `audit:` or `process:` in place of `M##:`.

Branches and PRs:
- **One branch per milestone.** Before starting, run `git branch -a`. If a branch for this milestone already exists, check it out and continue there. Never create a second one.
- **One PR per sub-ticket** (2a, 2b, …), opened from the milestone branch.
- **Merge or close the open PR before starting the next sub-ticket.** Delete the branch once the milestone is merged.
- *(Added 2026-10-20, after M02 2e was done on new `claude/…` branches and its evidence was stranded on the old `m02-sign-in-and-play` branch.)*

## Slots, lanes and the inbox
*(Human, 2026-11-15; `docs/milestones/PROCESS-parallel-sessions.md`.)*
- **Slots.** Work happens in one of three slot folders: `RIFF`, `plor-2` and `plor-3`, each with its own dev port and local database. Run `npm run slots` to see them; `npm run slots -- take <branch>` puts your branch in a free slot and resets that slot's database to the branch's migrations. Never make another folder or worktree. When the PR merges, `npm run slots -- free <n>`. Run only one e2e run at a time on a machine, full or targeted: on the PC, two or three at once time out tests that pass alone. Dev servers and db tests may run in every slot together.
- **Two lanes.** *Quick fix:* a change that needs no migration and no design input from the human. It gets its own `fix-<short-name>` branch off `main`, one PR, and a line in the PR saying what it fixes and who sees it (Who uses this / What breaks). No milestone, no ticket. *Milestone:* everything else, as now. If a quick fix turns out to need a migration or the human's input, stop and move it to a milestone.
- **The inbox** is GitHub issues labelled `inbox`, on no branch, so every slot and the Mac see an item at once *(human, 2026-11-16: "GitHub issues")*. "inbox: <thing>" from the human opens one issue per separate thing, `gh issue create --label inbox --label <gameplay|ui|other> --title "<the thing, short, in the human's words>" --body "The human, <YYYY-MM-DD>: \"<their exact words>\""`, and builds nothing. "Go through the inbox" (`gh issue list --label inbox`) sorts each item into a quick fix or a milestone, asking the human what's unclear, and closes it once it has a branch or a ticket (`gh issue close <n> --comment "<branch or ticket>"`). The repo is public, so the issues are too.

## Agent setup
*(Human, 2026-11-10.)*
- **The main session** (planning, milestones, integrating review) runs on the model the human picks in the app, at **high** effort.
- **Independent work goes to background subagents, in parallel:** searches, reviews, test runs, and edits to files no other step touches. Launch them in one message, and don't also do the delegated work yourself.
- **Subagents run at medium effort** unless their agent file says otherwise, **and every Agent call passes `model`:**
  - `sonnet`: the `reviewer`, audits, anything that judges code.
  - `haiku`: search (`Explore`) and mechanical edits.
  - `fable`: design and art: the `impeccable-*` agents, pixel art, mocks, visual direction.
- **A design session** (its task is visual design or art): tell the human to switch the session's model to Fable. Don't switch it yourself.

## Overnight and the weekly audit
*(Human, 2026-11-10.)*
- When the human says they're going to sleep, run the `goodnight` skill: it builds only approved tickets, records each decision it makes, never merges, and ends with a morning report.
- Every Sunday at 11 pm a local scheduled task on the human's PC runs the `audit` skill: bugs, bloat and unneeded doc text, reported in `docs/audits/` and ROADMAP's "Next revision" on an `audit-<date>` branch and PR. It changes no code.

## Docs
| File | Purpose |
|---|---|
| `docs/ROADMAP.md` | Milestone order and status, plus deferred "Next revision" items |
| `docs/HANDOFF.md` | Where the last session stopped: read first, rewritten last |
| `docs/milestones/` | One ticket per milestone, plus a file per large sub-ticket (copy `_TEMPLATE.md`) |
| `docs/SOURCES.md` | The only authoritative sources |
| `docs/DECISIONS.md` | The single chosen way for each concern, plus the hard-to-reverse designs |
| `docs/DESIGN.md` | The interface as built, each value cited to its file and line. A PR that changes what it describes updates it |
| `.claude/agents/reviewer.md` | Independent milestone reviewer |
| `.claude/skills/goodnight/`, `.claude/skills/audit/` | Overnight work; the weekly audit |
| `docs/audits/` | One report per audit |
| `AGENTS.md` | The Next.js rule that `next dev` writes: read the bundled Next.js docs before writing Next.js code. Imported below so every session loads it |

@AGENTS.md
