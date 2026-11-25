---
name: verify-offbeat-run
description: Recheck the TLA+ model of an Offbeat (game 1) run on a clock whenever a change touches how a run starts, how an answer is checked or stored, how Next opens a question, how Finish ends a run, or how the run's clock or status is read — for a signed-in player or a guest. Use before calling such a change done.
---

# Verify an Offbeat run on a clock

A model of one player's run on a format 4 day (three questions on one clock; docs/milestones/M23-23c-the-run-on-a-clock.md),
played from two tabs at once, checked in every order of steps by TLC. An answer, a Next and a Finish are each one
insert whose trigger takes the run's row lock before it reads, so the check and the write are one step; the model also
holds the run without that lock, to show the rules need it (docs/milestones/PROCESS-formal-verification.md).

The seven-question run of a format 3 day is no longer modelled: 23c replaced its model with this one, and 23f removes
its code. Until then a change to `answer_rule`, `open_rule`, `check_run_event` or `run_status`'s first branch has no
check here.

## The rules

Each holds in the code today, in every order of steps, with each tab free to send any question number and any answer
(the request body is the browser's):

- **NoAnswerAfterEnd.** No answer is stored once the run is over: the clock has passed its end, or Finish. *Harm if
  broken:* a player keeps scoring after the end.
- **OnlyTheOpenQuestion.** An answer is stored only for the open question. *Harm if broken:* a player goes back to an
  earlier question, or answers one they haven't opened.
- **CountIncludesEveryEarlierAnswer.** Each answer's added time is worked out from a count of every answer stored
  before it. *Harm if broken:* two tabs answering at once both get the larger time, and the clock never shrinks.
- **NextOnlyForward.** Next opens only the question after the open one, never past the last, never on a run that is
  over.
- **FinishOnlyOnLast.** Finish is stored only on the last question.
- **AnswersOnlyForOpened.** Every stored answer belongs to a question that was opened. (That an answer counts once is
  the primary key on run, question and answer.)

Without the lock (`Locked = FALSE`), measured 2026-11-24, the first three break and the last three hold: an answer's
check can be passed, then a Finish or a Next or another answer land, then the answer's row. So the lock in Next's and
Finish's triggers is there for the answers' rules, not their own.

No rule is broken today: there are no findings.

## Does this change touch it?

Coverage (each step of `OffbeatRun.tla` names its code):

| File | What |
|---|---|
| `supabase/migrations/20261124235832_clock_run.sql` | `clock_facts` and `guest_clock_facts` (the lock and the reads), `clock_answer_rule`, `clock_open_rule`, `clock_finish_rule`, the six `check_*clock*` triggers, the four tables' primary keys, the clock branch of `private.run_status` and `private.guest_run_status` |
| `supabase/migrations/20261028140000_baseline.sql` | `private.run`, `private.question_open`'s primary key and its `question_idx > 0` check |
| `src/game/clock-play.ts` | `startClockRun`, `answerClock`, `nextClock`, `finishClock`, `stateOf` |
| `src/game/clock-runs.ts`, `src/game/guest-clock-runs.ts` | who is playing |

**Sync commit: `4084bd7`.** The model was last confirmed to describe the code at this commit. A change touches this check
when it edits anything above, or adds a migration that replaces one of those functions, views or keys. To see what
changed since: `git log --oneline 4084bd7..HEAD -- <the files above> supabase/migrations/`.

## Run it

```bash
npm run verify -- offbeat-run
```

Measured 2026-11-24 on the Windows PC: 233 states, about 1 second. It exits 0 when every rule holds. The first run on a
machine installs Java and TLC through mise.

To see the rules need the lock: set `Locked = FALSE` in `OffbeatRun.cfg`, run it (it must exit 1, naming a broken
rule), and set it back.

## When it fails

Read the failure with the `/statechart` skill, with this folder's `view.mjs` as the view: it gives the shortest path
to each broken rule in the player's words. Then decide which it is:

- **A real bug.** Replay the path against the real code, one step per action (two connections, as
  `src/game/clock-runs.plor-app.db.test.ts` does). If it happens, the change broke a rule: fix the change, not the model.
- **A model that no longer describes the code.** The change was meant to alter a rule. Edit the matching action in
  `OffbeatRun.tla` so each step is again one indivisible step in the code, rerun, and say in the PR what changed and why.

A rule the code breaks on purpose becomes a finding: move it to an `OffbeatRun.findings.cfg` (as
`verify-fragments-run` has) and record it in docs/ROADMAP.md "Next revision". Never weaken a rule or remove a step to
make the check pass.

Once the check passes and the model describes the code at the new commit, move the sync commit above to it.

## What it does not cover

- Which text was typed and how it resolves, misses (they write nothing a rule reads), the sizes of the times and points
  (`supabase/tests/clock_run.test.sql` checks those).
- The time between a trigger's check and its commit: a reader in those few milliseconds can see a run as over that an
  answer on its way then extends.
- The day ending at midnight, the guest purge, the ledger, the live board, more than two tabs.
- The seven-question run (above).
