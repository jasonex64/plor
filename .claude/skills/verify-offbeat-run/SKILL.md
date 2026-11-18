---
name: verify-offbeat-run
description: Recheck the TLA+ model of an Offbeat (game 1) run whenever a change touches how a run starts, how an answer is checked or stored, how Next opens a question, or how a question's clock or the run's status is read — for a signed-in player or a guest. Use before calling such a change done.
---

# Verify an Offbeat run

A model of one player's Offbeat run, played from two tabs at once, checked in every order of steps by TLC. An
answer's trigger reads the run without a lock and its insert lands later, so another tab can commit in between; only
the primary key and the order of the checks keep the run sound (docs/milestones/PROCESS-formal-verification.md).

## The rules

Each holds in the code today, in every order of steps, with each tab free to send any question number (the route takes
it from the request body):

- **NoAnswerAfterEnd.** No answer is stored once the run is over. *Harm if broken:* a caught player keeps scoring.
- **AnswersInOrder.** Answers are stored in question order. *Harm if broken:* a player skips a question.
- **OnlyOpenQuestions.** An answer is stored only for a question Start or Next opened. *Harm if broken:* a player
  answers the next question during the reveal, before its clock starts.
- **NoLateAnswer.** An answer is stored only inside its question's 20 seconds, judged on the statement's start, as
  the code judges it. *Harm if broken:* time never runs out.
- **OneAnswerPerQuestion.** Each question holds at most one answer. *Harm if broken:* two tabs both answer one
  question, one caught and one safe.
- **NextOnlyAfterReveal.** Next opens a question only after the one before it was answered and survived. *Harm if
  broken:* a caught run gets more questions.

Some refusals are a second guard behind another, so removing one alone breaks nothing (found while proving this check,
2026-11-17): `answer_rule`'s `out_of_order` (OB002) is covered by `not_open` (OB006) for a later question and by the
primary key for an earlier one; `answer_rule`'s `run_over` (OB003) is covered by `open_rule`'s, as no question opens
after the end. A change that removes the other guard too is caught.

No rule is broken today: there are no findings.

## Does this change touch it?

Coverage (each step of `OffbeatRun.tla` names its code):

| File | What |
|---|---|
| `src/game/runs.ts` | `startRun`, `answer`, `openNext`, `settledAnswer`, `stateOf`, `todaysState` |
| `src/game/guest-runs.ts` | `startGuestRun`, `answerGuest`, `openNextGuest`, `settledAnswer`, `stateOf`, `guestTodaysState` |
| `supabase/migrations/20261111120000_guest_play_data.sql` | `answer_rule`, `open_rule`, `check_run_event`, `check_question_open` (game 1), `check_guest_run_event`, `check_guest_question_open`, `private.guest_run_event`'s primary key, `private.guest_run_status` |
| `supabase/migrations/20261107105151_game_2_rounds.sql` | `private.run_status`, its game 1 branch |
| `supabase/migrations/20261028140000_baseline.sql` | `private.run_event`'s primary key, `private.question_open`'s `question_idx > 0` check, `question_started_at`, `question_deadline` |
| `src/config/tunables.ts` | `QUESTIONS_PER_DAY` (seven) |

**Sync commit: `d3c2c62`.** The model was last confirmed to describe the code at this commit. A change touches this
check when it edits anything above, or adds a migration that replaces one of those functions, views or keys. To see
what changed since: `git log --oneline d3c2c62..HEAD -- <the files above> supabase/migrations/`.

## Run it

```bash
npm run verify -- offbeat-run
```

Measured 2026-11-17 on the Windows PC: 12,043 states, about 4 seconds in all. It exits 0 when every rule holds. The
first run on a machine installs Java and TLC through mise (the ticket, plan step 3).

## When it fails

Read the failure with the `/statechart` skill, with this folder's `view.mjs` as the view: it gives the shortest path
to each broken rule in the player's words. Then decide which it is:

- **A real bug.** Replay the path against the real code, one step per action (two tabs, a test or a live repro). If it
  happens, the change broke a rule: fix the change, not the model.
- **A model that no longer describes the code.** The change was meant to alter a rule (a new lock, a new refusal, the
  index no longer from the client). Edit the matching action in `OffbeatRun.tla` so each step is again one indivisible
  step in the code, rerun, and say in the PR what changed and why.

A rule the code breaks on purpose becomes a finding: move it to an `OffbeatRun.findings.cfg` (as
`verify-fragments-run` has) and record it in docs/ROADMAP.md "Next revision". Never weaken a rule or remove a step to
make the check pass.

Once the check passes and the model describes the code at the new commit, move the sync commit above to it.

## What it does not cover

- Which answer was typed (an answer is "caught" or "safe"), misses and taken letters (they write no answer).
- The day ending at midnight, the guest purge, the admin test run.
- More than two tabs; scoring, boards, and the live board's timeout (nothing is written when time runs out: ROADMAP).
- Earlier questions are kept only as the answer count, whether one was caught, and flags set at the step that breaks a
  rule: every rule in the code reads only those and the open question's clock.
