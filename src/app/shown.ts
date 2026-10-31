"use client";

// What this browser last showed the player, so a number counts up and a rank pops only when it has changed since
// (docs/milestones/M14-14b-10-calm-and-alive.md, 14b-10b, answer 27: "kept in the browser, like the theme copy").
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const PREFIX = "plor.shown.";
// The longest a count-up takes (answer 14).
export const COUNT_MS = 600;

// Storage that can't be read or written holds no copy, so nothing counts up or pops (theme.ts's way).
export function readShown(name: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + name);
  } catch {
    return null;
  }
}

export function writeShown(name: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + name, value);
  } catch {
    // No copy kept: the next visit shows the number as it is, without counting.
  }
}

// cubic-bezier(0.2, 0.8, 0.2, 1), the motion's one curve (globals.css --ease; answer 26), as a function of time 0 to 1:
// x(s) is solved for s by Newton's method, then y(s) is the progress.
const X1 = 0.2, Y1 = 0.8, X2 = 0.2, Y2 = 1;
const bezier = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3;
const slope = (a: number, b: number, s: number) => 3 * a * (1 - s) ** 2 + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s ** 2;
export function ease(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let s = t;
  for (let i = 0; i < 8; i++) {
    const d = slope(X1, X2, s);
    if (d === 0) break;
    s -= (bezier(X1, X2, s) - t) / d;
  }
  return bezier(Y1, Y2, s);
}

// The whole number shown at time t (0 to 1) of a count from one value to another.
export const countAt = (from: number, to: number, t: number) => Math.round(from + (to - from) * ease(t));

const lessMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The number to show now: the value, or, when this browser last showed another, a count up to it over COUNT_MS. The
// value is kept once the count ends, so a count cut short (the page left, React's development double-run) runs again.
export function useCountUp(name: string, value: number): number {
  // From the first paint: the number this browser last showed, when the count will run.
  const [shown, setShown] = useState(() => {
    const from = Number(readShown(name) ?? NaN);
    return Number.isFinite(from) && !lessMotion() ? from : value;
  });
  useLayoutEffect(() => {
    const from = Number(readShown(name) ?? NaN);
    if (!Number.isFinite(from) || from === value || lessMotion()) {
      setShown(value);
      writeShown(name, String(value));
      return;
    }
    setShown(from);
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / COUNT_MS);
      setShown(countAt(from, value, t));
      if (t < 1) frame = requestAnimationFrame(step);
      else writeShown(name, String(value));
    });
    return () => cancelAnimationFrame(frame);
  }, [name, value]);
  return shown;
}

// Whether a value is new: different from what this browser last showed, or changed while the page is open.
export function useNew(name: string, value: string): boolean {
  const [isNew, setNew] = useState(() => {
    const before = readShown(name);
    return before !== null && before !== value;
  });
  const seen = useRef(value);
  useEffect(() => {
    if (seen.current !== value) {
      seen.current = value;
      setNew(true);
    }
    writeShown(name, value);
  }, [name, value]);
  return isNew;
}
