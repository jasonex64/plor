// Game 2's cards and the pieces its screen shares (docs/milestones/M16-16g-2-midnight-brew-in-play2.md): the results at
// the end of a run, which stay cards (answer 1), the letters tracker, a word's points and why a try didn't count. The run
// itself plays in Midnight Brew (src/brew/brew.tsx), which replaced 16d-2's plain round and between-rounds views.
import type { PlayedRound, SubstringRun, TryOutcome } from "@/game/substring-state";
import kit from "./kit.module.css";
import { ordinal } from "./ordinal";
import styles from "./substrings.module.css";

export const WHY: Partial<Record<TryOutcome, (letters: string) => string>> = {
  locked: () => "Too quick. Try again in a moment.",
  not_a_word: () => "Not in the dictionary.",
  needs_letters: (letters) => `Needs the letters ${letters}.`,
  already_used: () => "Already used.",
};

// A word's points, with the bonus letter's when it holds it (M16 16e, answer 20).
export const scored = (round: PlayedRound) => `${round.points} points${round.bonus > 0 ? `, and ${round.bonus} for the bonus letter` : ""}`;

export const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

// Where the run stands so far today (M16 16e-2, answers 3 and 19): among the day's finished players once there are
// enough, and among the player's friends who've finished.
function Standing({ standing }: { standing: NonNullable<SubstringRun["standing"]> }) {
  return (
    <>
      {standing.percent !== null && <p>Better than {standing.percent}% of players so far today.</p>}
      {standing.friends && (
        <p>
          {ordinal(standing.friends.rank)} of {standing.friends.of} with your friends so far today.
        </p>
      )}
    </>
  );
}

export function Results({ run }: { run: SubstringRun }) {
  const score = run.score!;
  const bonusWords = run.rounds.filter((round) => round.bonus > 0).length;
  return (
    <>
      <h3 className={styles.heading}>Your score</h3>
      <dl className={styles.score}>
        <dt>Words</dt>
        <dd>{score.words}</dd>
        <dt>Bonus letter {run.bonusLetter}, in {bonusWords === 1 ? "1 word" : `${bonusWords} words`}</dt>
        <dd>{score.bonus}</dd>
        <dt>Different letters, {score.used.length} of {ALPHABET.length}</dt>
        <dd>{score.letters}</dd>
        <dt>Total</dt>
        <dd className={styles.total}>{score.total}</dd>
      </dl>
      {run.standing && <Standing standing={run.standing} />}
      <h3 className={styles.heading}>Your rounds</h3>
      <ol aria-label="Your rounds" className={styles.results}>
        {run.rounds.map((round) => (
          <li key={round.letters}>
            <span className={kit.chip}>{round.letters}</span> {round.word === null ? "Missed" : `${round.word}, ${scored(round)}`}
            {round.examples.length > 0 && <p className={styles.progress}>You could have played {round.examples.join(", ")}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}
