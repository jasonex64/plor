"use client";

// The right column (docs/milestones/M14-14b-2b-1-shell.md, criterion 2): from 1200px (L42) a 360px column on the right
// behind a line, in <body> beside the page's <main>, as the shell's navigation is. Below 1200px, inPlace keeps its
// content in the page's own flow (Today's circle, the game screen's feed), where className places it; otherwise
// there's nothing to show. hidden: mounted but not shown, and no room kept for it (the game screen's feed during a run,
// docs/milestones/M14-14b-19-controls-layout-and-state.md, answer 2).
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBodyFlag } from "./body-flag";
import { useMinWidth } from "./min-width";
import styles from "./side-column.module.css";

export function SideColumn({ label, inPlace, className, hidden = false, children }: {
  label: string;
  inPlace?: boolean;
  className?: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  const wide = useMinWidth(1200);
  useBodyFlag("column", wide && !hidden);
  // One box for the column's life, moved between <body> and its place in the page, so crossing 1200px moves the
  // column rather than remounting it, and a comment draft in it stays (docs/milestones/M14-14b-2c-review-items.md,
  // item 45).
  const [box] = useState(() => {
    const div = document.createElement("div");
    div.className = styles.contents;
    return div;
  });
  const place = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const parent = wide ? document.body : place.current;
    if (!parent) return;
    parent.appendChild(box);
    return () => box.remove();
  }, [wide, box]);
  if (!wide && !inPlace) return null;
  return (
    <>
      {inPlace && <div ref={place} className={styles.contents} />}
      {createPortal(
        <aside aria-label={label} className={wide ? styles.column : className} hidden={hidden}>
          {children}
        </aside>,
        box,
      )}
    </>
  );
}
