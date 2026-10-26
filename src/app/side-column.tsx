"use client";

// The right column (docs/milestones/M14-14b-2b-1-shell.md, criterion 2): from 1200px (L42) a 360px column on the right
// behind a line, rendered into <body> beside the page's <main>, as the shell's navigation is. Below 1200px, inPlace
// keeps its content in the page's own flow (Today's circle, the game screen's feed), where className places it;
// otherwise there's nothing to show.
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMinWidth } from "./min-width";
import styles from "./side-column.module.css";

export function SideColumn({ label, inPlace, className, children }: { label: string; inPlace?: boolean; className?: string; children: ReactNode }) {
  const wide = useMinWidth(1200);
  if (wide) {
    return createPortal(
      <aside aria-label={label} className={styles.column}>
        {children}
      </aside>,
      document.body,
    );
  }
  return inPlace ? (
    <aside aria-label={label} className={className}>
      {children}
    </aside>
  ) : null;
}
