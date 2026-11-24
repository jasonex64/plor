import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import kit from "./kit.module.css";
import styles from "./player-link.module.css";

// A player's name and avatar as the way to their profile (docs/milestones/M20-design-rules-and-clean-up.md, 20e and
// 20n-3; the human's answers 79 to 81: "Name opens profile", no Profile button, your own name opens Me). Each takes the
// hover rule, as anything pressable.
const hrefOf = (username: string, me: boolean) => (me ? "/me" : `/u/${username}`);

// A row that is only the player (Your friends): the avatar and the name as one link filling the row, the name on one
// line, cut with an ellipsis.
export function PlayerLink({ name, username }: { name: string; username: string }) {
  return (
    <Link href={hrefOf(username, false)} className={`${styles.player} ${kit.hover}`}>
      <Avatar name={name} />
      <span className={styles.name}>{name}</span>
    </Link>
  );
}

// Where a row lays the avatar and the name out apart (a board, a comment, a member): the name is the link, with the
// place's own class and whatever it says with the name ("(you)"); me: the viewer's own name.
export function PlayerName({ username, me = false, className, children }: { username: string; me?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link href={hrefOf(username, me)} className={className ? `${styles.inline} ${kit.hover} ${className}` : `${styles.inline} ${kit.hover}`}>
      {children}
    </Link>
  );
}

// The avatar beside that name goes the same way for a pointer or a finger; the name is the one stop for the keyboard
// and a screen reader, as the avatar alone says nothing (avatar.tsx).
export function PlayerAvatar({ name, username, me = false }: { name: string; username: string; me?: boolean }) {
  return (
    <Link href={hrefOf(username, me)} className={styles.avatar} aria-hidden="true" tabIndex={-1}>
      <Avatar name={name} />
    </Link>
  );
}
