"use client";

// A number that counts up when it has changed since this browser last showed it (shown.ts; docs/milestones/
// M14-14b-10-calm-and-alive.md, answer 27). While it counts, screen readers hear the value once, not every step; after,
// the number is plain text again, as it was before.
import { useCountUp } from "./shown";

export function CountUp({ name, value }: { name: string; value: number }) {
  const shown = useCountUp(name, value);
  if (shown === value) return value.toLocaleString("en-US");
  return (
    <>
      <span aria-hidden="true">{shown.toLocaleString("en-US")}</span>
      <span className="sr-only">{value.toLocaleString("en-US")}</span>
    </>
  );
}
