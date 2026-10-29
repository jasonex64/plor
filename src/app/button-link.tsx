import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./button-link.module.css";

// A link that looks like a button: no control on the site is a text link (human, 2026-10-26: "nothing on the screen
// should be like the blue underlined text link"; docs/milestones/M14-14b-2b-1-shell.md, criterion 4). It stays a link,
// so it goes where it says (WCAG 2.2 2.4.4); links remain only inside running text on the About and privacy pages.
// tone "offbeat": on Offbeat's banner, outlined and lettered in its colour (human, 2026-10-26: "ButtonLink gets
// Offbeat's colours (Recommended)"; docs/milestones/M14-14b-2c-review-items.md, answer 23).
// tone "danger": the admin's warning that tomorrow has no puzzle (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6f).
export function ButtonLink({ tone, ...props }: ComponentProps<typeof Link> & { tone?: "offbeat" | "danger" }) {
  return <Link {...props} className={tone ? `${styles.button} ${styles[tone]}` : styles.button} />;
}
