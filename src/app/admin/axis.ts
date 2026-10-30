// The Insights chart's scale (docs/milestones/M14-14b-9-insights-axis.md): it reaches the highest rate or target,
// rounded up to a step of 5%, 10% or 25%, the smallest that keeps the axis to round 10's six labels (human,
// 2026-10-29: "Step grows, ≤6 labels (Recommended)").
const STEPS = [5, 10, 25];
const MOST_LABELS = 6;

// highest: the day's highest rate or target, in whole percent, so at least Q7's target (20%) and at most 100. ticks run
// from the top down to 0.
export function axisScale(highest: number): { top: number; ticks: number[] } {
  for (const step of STEPS) {
    const top = Math.ceil(highest / step) * step;
    if (top / step + 1 <= MOST_LABELS) return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => top - i * step) };
  }
  throw new Error(`No step keeps ${highest}% to ${MOST_LABELS} labels`);
}
