// The round slot by a player's name where their avatar will go (M14 L37: "a round slot by every name … holding the
// player's initial until avatars ship"; docs/milestones/M14-14a-3a-me.md). The name is always beside it, so screen
// readers skip it, and the initial is drawn by CSS from data-initial, so it isn't part of the row's text either (a
// row reads, and copies, as "sam: 25 points", not "Ssam: 25 points").
import styles from "./avatar.module.css";

// The name's first character, whole even outside the Basic Multilingual Plane; names are never empty (the username and
// display name rules).
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={large ? `${styles.slot} ${styles.large}` : styles.slot} aria-hidden="true" data-initial={[...name][0].toUpperCase()} />;
}
