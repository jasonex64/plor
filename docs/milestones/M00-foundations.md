# M00 — Foundations

**Status:** in progress

**Progress (2026-10-17):** stack A chosen and its sources pinned. Tooling rows proposed in DECISIONS.md, waiting on human approval. Hard-to-reverse design drafted in `M00-data-design.md`: review 1's blocking findings are fixed, and Q1–Q5 were answered by a human on 2026-10-17 (applied in revision 3). Review 2's blocking findings are fixed in revision 4, which is waiting on human sign-off.
**Toolchain (checked 2026-10-17):** Node v24.11.0, npm 11.6.1, Git 2.56.0 and Docker 29.8.2 are installed. **The Docker Desktop engine fails to start**, which blocks `supabase start`.
**Blocked on the human:** getting Docker Desktop running, approving the tooling rows, signing off on the data design, and moving to a permanent repo folder.

## Goal
Make the decisions every later milestone depends on, and prove the toolchain works end to end with a deploy to staging.

## Who uses it / what breaks without it
- Used by: every agent and every later milestone.
- Breaks without it: agents choose their own stack, logger and error style, so the code ends up with several ways of doing each thing. The hard-to-reverse formats (run events, ledger, content, identity) get decided by accident in M01–M02 and need migrations later.

## Source
None yet. Choosing and pinning sources is part of this milestone. Each stack choice gets a SOURCES.md entry (official docs, version pinned) **before** it's recorded in DECISIONS.md.

## Acceptance criteria
- [ ] Every `TBD` row in DECISIONS.md "Current" is filled in, with a reason and a source.
- [ ] Every row in DECISIONS.md "Hard to reverse" is filled in and has been reviewed by the `reviewer` agent and approved by a human.
- [ ] The "proposed" items in DECISIONS.md (client platform, sudden death, fixed sequence) are confirmed or replaced by a human.
- [ ] The repo has a single task runner entry point. `<runner> test` runs one real test and passes, and CI runs the same command.
- [ ] A hello-world client and server are deployed to staging and reachable at a recorded URL.
- [ ] `scripts/status` checks the staging deployment, exits non-zero when it's down, and its output is pasted as evidence for both the up and down cases.
- [ ] The debug procedure in DECISIONS.md has been followed once against staging, and the output is in Evidence.

## Out of scope
Any game logic, content format implementation, accounts or UI beyond hello-world.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Daily reset time and timezone rule | Day boundary decision | Midnight `America/Los_Angeles`, following DST (human, 2026-10-17) |
| Rough expected concurrent players at reset (for launch) | Supabase plan and spend-cap choice (the realtime limits are in the stack comparison) | _human_ |

## Plan
1. The human picks the stack. A comparison and recommendation are in `M00-stack-comparison.md`. Once a stack is picked, pin its sources in SOURCES.md.
2. Fill in DECISIONS.md "Current".
3. Draft the hard-to-reverse designs, run them past the reviewer, and get human sign-off.
4. Scaffold the repo, task runner, one test and CI.
5. Deploy to staging, then write and run `scripts/status`.

## Removes
Nothing. The repo has no code yet.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
