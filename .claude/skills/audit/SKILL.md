---
name: audit
description: The weekly codebase audit for bugs, bloat and unneeded text in .md files. A local scheduled task runs it every Sunday at 11 pm; also use it when the human asks for a codebase audit.
---

# Weekly audit

Report only: the audit changes the report and ROADMAP.md (step 5) and nothing else, not even `docs/HANDOFF.md` (CLAUDE.md, "Last thing"). *(Human, 2026-11-10: "Weekly", "Sunday night", "Report + Next revision (Recommended)", "Own branch + PR (Recommended)"; DECISIONS.md log.)*

1. **Start.** Do CLAUDE.md's "First thing". Then `git fetch origin` and work in a new worktree, so milestone sessions in other checkouts aren't disturbed: `git worktree add ../RIFF-audit-<date> -b audit-<date> origin/main`, with today's Pacific date.
2. **Scope:** `main`, plus each open PR's diff (`gh pr diff <number>`). Skip what the last report in `docs/audits/` or ROADMAP's "Next revision" already lists.
3. **Three read-only auditors in parallel** (Agent, `model: sonnet`). Each finding gives file:line evidence; anything not read or run is marked *unverified*.
   - **Bugs:** logic errors, unhandled failures, races, missing checks at boundaries (CLAUDE.md, "No defensive bloat"), tests that can't fail.
   - **Bloat:** dead code, unused exports, dependencies, config, flags or scripts, duplicate paths, a second way to do what DECISIONS.md settles, abstractions with a single use.
   - **Docs:** text in `*.md` (CLAUDE.md, `docs/`, `.claude/`) nobody will act on: closed items still listed, history that belongs in git, repeats of another doc, facts the code contradicts.
4. **Re-check** every finding you'll report by reading the cited lines yourself. Drop what doesn't hold.
5. **Write** `docs/audits/<date>-weekly-audit.md`: scope, method, then the findings ranked, each with an ID, kind, evidence, why it matters and the milestone it belongs to. Add each finding to ROADMAP's "Next revision" under that milestone (or "For the human"), in that section's format, citing the report. With no findings, the report says so and ROADMAP is unchanged.
6. **Ship:** commit as `audit: <date> weekly audit, <n> findings (removes: nothing; a report)`, push, and open a PR. Don't merge it. Remove the worktree (`git worktree remove`); the branch stays for the PR.
