"use client";

// What a section shows while its data loads, in its own shape, instead of "Loading…" text
// (docs/milestones/M14-14b-6-feel-and-polish.md, design 2). The shapes are hidden from screen readers; the page says
// "Loading" once, however many sections load, from the frame's one status (LoadingStatus;
// docs/milestones/M14-14b-21-screen-readers.md, answer 1). label names the section for the tests and the page's code.
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import styles from "./skeleton.module.css";

const LoadingContext = createContext<((change: number) => void) | null>(null);

// The frame's one loading status, counting the skeletons shown in it.
export function LoadingStatus({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(0);
  const change = useCallback((by: number) => setShown((n) => n + by), []);
  return (
    <LoadingContext value={change}>
      {children}
      <p role="status" className="sr-only">
        {shown > 0 ? "Loading" : ""}
      </p>
    </LoadingContext>
  );
}

export function Skeleton({ label, children }: { label: string; children: ReactNode }) {
  const change = use(LoadingContext);
  if (!change) throw new Error("a skeleton rendered outside the frame's LoadingStatus (src/app/home.tsx, Frame)");
  useEffect(() => {
    change(1);
    return () => change(-1);
  }, [change]);
  return (
    <div data-loading={label} aria-hidden="true">
      {children}
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
