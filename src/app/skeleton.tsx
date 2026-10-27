// What a section shows while its data loads, in its own shape, instead of "Loading…" text
// (docs/milestones/M14-14b-6-feel-and-polish.md, design 2). Screen readers hear the label once; the shapes are hidden
// from them.
import type { ReactNode } from "react";
import styles from "./skeleton.module.css";

export function Skeleton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

// One line of text.
export function Line() {
  return <span className={styles.bone} />;
}

// A page before the player's profile has loaded, whichever page it is: its heading and one line.
export function PageSkeleton() {
  return (
    <Skeleton label="Loading Plor">
      <h2>
        <Line />
      </h2>
      <p>
        <Line />
      </p>
    </Skeleton>
  );
}
