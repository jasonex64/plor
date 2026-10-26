// /streak, opened from the streak's pill (docs/milestones/M14-14b-2a-streak-ranks.md, criterion 3): how the streak
// counts, as src/game/streak.ts counts it, and its six ranks, each flower with its name and days, the player's own
// marked in words as well as by its border (WCAG 2.2 1.4.1).
import { RANKS, RankFlower, rankDays, rankFor } from "./ranks";
import styles from "./streak.module.css";

export function StreakRanks({ days }: { days: number }) {
  const current = rankFor(days);
  return (
    <section aria-label="Streak" className={styles.streak}>
      <h2 className={styles.heading}>Your streak: {days === 1 ? "1 day" : `${days} days`}</h2>
      <p>
        Your streak is the days in a row you&apos;ve played, finished or not. Today counts once you start, and until then
        your streak runs to yesterday, so it doesn&apos;t drop to 0 overnight. A day with no puzzle neither counts nor
        breaks it.
      </p>
      <p>Each rank is a flower. Keep playing to grow the next one.</p>
      <ol className={styles.ranks}>
        {RANKS.map((rank) => (
          <li key={rank.name} className={rank === current ? `${styles.rank} ${styles.current}` : styles.rank} aria-current={rank === current || undefined}>
            <RankFlower rank={rank} size={96} />
            <span className={styles.name}>{rank.name}</span>
            <span className={styles.days}>{rankDays(rank)}</span>
            {rank === current && <span className={styles.yours}>Your rank</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
