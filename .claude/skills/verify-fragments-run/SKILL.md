---
name: verify-fragments-run
description: Recheck the TLA+ model of a Fragments (game 2) run whenever a change touches how a run starts, how a try is judged, how Next opens a round, or how a round's clock is read — for a signed-in player or a guest. Use before calling such a change done.
---

# Verify a Fragments run

A model of one player's Fragments run, played from two tabs at once, checked in every order of steps by TLC. It
exists because the run's rules are spread over a route, a trigger and a judge that take different locks, and tests
only reach the orders someone thought to write (docs/milestones/PROCESS-formal-verification.md).

## The rules

Each holds in the code today, and the check proves it in every order of steps:

- **NeverPastLast.** Next never opens a round past the day's last. *Harm if broken:* a player gets an eighth round
  with no letters, and the day's score and boards count a round that doesn't exist.
- **RoundsOpenInOrder.** A round opens only once the round before it has a word or has run out of time. *Harm if
  broken:* a second tab skips a player's round while its clock is still running.

  It has two guards: `nextRound` asks for the round after `answered`, which counts a round only once it is done, and
  `round_open_rule` refuses a round whose predecessor's clock runs (OB014). Removing either one alone breaks nothing,
  because the other still holds; the check fails only when both go (found while proving this check, 2026-11-17).

The code breaks these today. They are findings (docs/ROADMAP.md, "Next revision", For M16, "A retry of round k's word…"), not to be
fixed without the human's word, and the check fails if they ever start to hold:

- **TryJudgedOnItsRound.** A try is judged against the round its tab showed. *Broken:* `tryWord` sends no round, so a
  word sent for round 1 that reaches `judge_word` after another tab opened round 2 is judged on round 2.
- **WordGoesToItsRound.** A round's word is one the player typed while that round showed. *Broken:* the word above,
  when it also holds round 2's letters, becomes round 2's word: round 2 is used up by a word typed for round 1, and
  round 1 loses a word sent in time.

  The shortest path (8 steps): tab A starts; A sends a word for round 1; tab B loads the run; round 1's 20 seconds
  run out; B presses Next and round 2 opens; the server judges A's word on round 2 and accepts it.

## Does this change touch it?

Coverage (each step of `FragmentsRun.tla` names its code):

| File | What |
|---|---|
| `src/game/substring-runs.ts` | `startSubstringRun`, `tryWord`, `nextRound`, `stateOf` |
| `src/game/guest-substring-runs.ts` | `startGuestSubstringRun`, `tryGuestWord`, `nextGuestRound`, `guestSubstringState` |
| `supabase/migrations/20261111120000_guest_play_data.sql` | `round_open_rule`, `check_question_open`, `judge_core`, `judge_word`, `guest_judge_word`, `check_guest_question_open`, `private.guest_run_status` |
| `supabase/migrations/20261107105151_game_2_rounds.sql` | `private.run_status`, its `substrings` branch |
| `supabase/migrations/20261028140000_baseline.sql` | `question_started_at`, `question_deadline` |
| `src/config/tunables.ts` | `SUBSTRING_ROUNDS` (seven rounds) |

**Sync commit: `d3c2c62`.** The model was last confirmed to describe the code at this commit. A change touches this
check when it edits anything above, or adds a migration that replaces one of those functions or the view. To see what
changed since: `git log --oneline d3c2c62..HEAD -- <the files above> supabase/migrations/`.

## Run it

```bash
npm run verify -- fragments-run
```

Measured 2026-11-17 on the Windows PC: 74,756 states, about 4 seconds in all. It prints one line per file and exits 0
when the rules hold and each finding still breaks. The first run on a machine installs Java and TLC through mise (the
ticket, plan step 3).

## When it fails

Read the failure with the `/statechart` skill, with this folder's `view.mjs` as the view: it gives the shortest path
to each broken rule in the player's words. Then decide which it is:

- **A real bug.** Replay the path against the real code, one step per action (two tabs, a test or a live repro). If it
  happens, the change broke a rule: fix the change, not the model.
- **A model that no longer describes the code.** The change was meant to alter a rule (a new lock, a round number in
  the try, a new refusal). Edit the matching action in `FragmentsRun.tla` so each step is again one indivisible step
  in the code, rerun, and say in the PR what changed and why.
- **A finding that now holds.** The code was fixed: move the rule from `FragmentsRun.findings.cfg` to
  `FragmentsRun.cfg` and tick its ROADMAP item.

Never weaken a rule or remove a step to make the check pass.

Once the check passes and the model describes the code at the new commit, move the sync commit above to it.

## What it does not cover

- The 0.5 second lockout after a rejected try, which word was typed, "not a word" and "already used" rejections.
- The day ending at midnight; the puzzle changing (it is frozen once its day starts).
- More than two tabs; scoring, boards and the live board.
- Earlier rounds' words and clocks are kept only as flags set at the step that breaks a rule: every rule in the code
  reads only the open round.
