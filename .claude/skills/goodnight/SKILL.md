---
name: goodnight
description: Overnight work while the human sleeps. Use when the human says they're going to sleep, going to bed, done for the night, "goodnight", or runs /goodnight.
---

# Goodnight

The human is going to sleep, and nobody can answer questions until morning. CLAUDE.md still applies in full, except where this file says otherwise. *(Human, 2026-11-10: "Same session keeps going", "Approved tickets only", "Move to another milestone"; DECISIONS.md log.)*

## Before the human leaves
1. Do CLAUDE.md's "First thing": `docs/HANDOFF.md` on every open branch, `git branch -a`, `gh pr list`.
2. **Build the night queue:** sub-tickets in `docs/milestones/` that the human has approved and that aren't built yet (Status `planned`). Approved means the ticket quotes the human approving it, such as "Approve, build it"; without that quote it isn't approved. Take at most one per milestone, in ROADMAP order. Skip a milestone whose sub-ticket PR is still open: its next sub-ticket waits for that merge (CLAUDE.md, "Branches and PRs").
3. **Ask one round** (up to four AskUserQuestion questions): confirm the queue, plus anything an item already needs from the human (a missing number, an unclear criterion). Drop any item still blocked after the round.
4. Call `request_keep_awake` with `until: "session_idle"`. Tell the human the app stays open, the PC stays plugged in and the lid stays open.

## Through the night
Work each item in its milestone's branch (its existing worktree, if one exists), following CLAUDE.md: "Before writing code", the verify loop, and "Done means", including the `reviewer` and fixing its blocking findings. Then open the sub-ticket's PR and move to the next item, on another milestone.

- **Decisions:** where you'd normally ask, take the option you'd mark (Recommended). Record it in the ticket as the next numbered answer, marked *Claude's overnight decision*, with the options you didn't take.
- **Stop an item, record why in its ticket, and move on** when a number is needed and nothing gives it, the work needs a security change, the source is missing or contradicts another, a hypothesis is disproved twice, or the work needs a design the ticket doesn't give.
- **Never at night:** merge a PR, push to the hosted database or plor.app, change auth, roles, grants, RLS or secret handling, draft or approve a ticket, delete a branch.

## When the queue is empty
1. Watch each PR opened tonight with `gh pr checks <number> --watch` in the background. A failing check on one of them is part of that item: fix it.
2. Remove scraps: stop every dev server and process you started. Leave the local Supabase stack as you found it.
3. Rewrite `docs/HANDOFF.md` on each branch you worked on (CLAUDE.md, "Last thing").
4. **The morning report** is your last message: for each item, done or stopped (and why), with its PR link; every overnight decision, one line each with its ticket and answer number; and what waits on the human.
