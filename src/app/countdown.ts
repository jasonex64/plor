"use client";

import { useEffect, useEffectEvent, useState } from "react";

// Milliseconds left, counted down from what the server measured, waking only when the shown whole second changes,
// so it needs no refresh rate of its own. At zero it calls onZero once. Shared by the game's timers and the clock bar
// on the other tabs (docs/milestones/M14-14a-2a-today.md).
export function useCountdown(ms: number, onZero: () => void): number {
  const [left, setLeft] = useState(ms);
  // Read when zero comes, not a reason to count again: a caller may pass a new function on each render, and a test
  // run's time-up does, so a redraw once restarted its count from the full time (docs/milestones/M14-14b-11-test-runs.md,
  // 14b-11b).
  const zero = useEffectEvent(onZero);
  useEffect(() => {
    const end = performance.now() + ms;
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const remaining = Math.max(0, end - performance.now());
      setLeft(remaining);
      if (remaining === 0) zero();
      else timer = setTimeout(tick, remaining % 1000 || 1000);
    }
    tick();
    return () => clearTimeout(timer);
  }, [ms]);
  return left;
}
