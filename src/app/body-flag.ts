"use client";

import { useLayoutEffect } from "react";

// A flag on <body> while the component that sets it is shown, for the room the shell, the clock bar and the right
// column leave on the page (globals.css), and for the served line an invite page drops on the player's own link
// (own-invite; docs/milestones/M14-14b-18-headings-today-invites-words.md, answer 10). Next.js keeps a visited page hidden rather than unmounting it, and a hidden
// page's elements still match a body:has(…) rule, so the room stayed after leaving (M14 14b-2c-1, items 12 and 43);
// a hidden page's layout effects are cleaned up, so the flag goes with it (Next.js, "Preserving UI state": Global
// styles, The :has selector). Counted, so a page shown before the one it replaces is hidden doesn't lose the flag
// when the old one's cleanup runs.
export type BodyFlag = "shell" | "clock" | "column" | "own-invite";
const counts = new Map<BodyFlag, number>();

export function useBodyFlag(flag: BodyFlag, on: boolean) {
  useLayoutEffect(() => {
    if (!on) return;
    counts.set(flag, (counts.get(flag) ?? 0) + 1);
    document.body.setAttribute(`data-${flag}`, "");
    return () => {
      const left = counts.get(flag)! - 1;
      counts.set(flag, left);
      if (left === 0) document.body.removeAttribute(`data-${flag}`);
    };
  }, [flag, on]);
}
