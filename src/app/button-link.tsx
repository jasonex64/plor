import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./button-link.module.css";

// A link that looks like a button: no control on the site is a text link (human, 2026-10-26: "nothing on the screen
// should be like the blue underlined text link"; docs/milestones/M14-14b-2b-1-shell.md, criterion 4). It stays a link,
// so it goes where it says (WCAG 2.2 2.4.4); links remain only inside running text on the About and privacy pages.
// className: one of the kit's button kinds (kit.module.css: primary, small, danger), drawn on top of the link's button.
export function ButtonLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={className ? `${styles.button} ${className}` : styles.button} />;
}
