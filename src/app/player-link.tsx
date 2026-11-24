import Link from "next/link";
import { Avatar } from "./avatar";
import kit from "./kit.module.css";
import styles from "./player-link.module.css";

// A player's avatar and name as the one link to their profile (docs/milestones/M20-design-rules-and-clean-up.md, 20e and
// 20n-3; the human's answers 79 and 80: "Name opens profile", no Profile button). It takes the room its row has left and
// keeps the name on one line, cut with an ellipsis; the hover rule, as anything pressable.
export function PlayerLink({ name, username }: { name: string; username: string }) {
  return (
    <Link href={`/u/${username}`} className={`${styles.player} ${kit.hover}`}>
      <Avatar name={name} />
      <span className={styles.name}>{name}</span>
    </Link>
  );
}
