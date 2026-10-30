// The Insights chart's scale (docs/milestones/M14-14b-9-insights-axis.md, criterion 1).
import { describe, expect, it } from "vitest";
import { axisScale } from "./axis";

describe("axisScale", () => {
  it("keeps 5% steps on a quiet day, up to 25%", () => {
    expect(axisScale(20)).toEqual({ top: 20, ticks: [20, 15, 10, 5, 0] });
    expect(axisScale(25)).toEqual({ top: 25, ticks: [25, 20, 15, 10, 5, 0] });
  });

  it("takes 10% steps once 5% would need a seventh label", () => {
    expect(axisScale(26)).toEqual({ top: 30, ticks: [30, 20, 10, 0] });
    expect(axisScale(50)).toEqual({ top: 50, ticks: [50, 40, 30, 20, 10, 0] });
  });

  it("takes 25% steps past 50%, up to a full catch", () => {
    expect(axisScale(51)).toEqual({ top: 75, ticks: [75, 50, 25, 0] });
    expect(axisScale(100)).toEqual({ top: 100, ticks: [100, 75, 50, 25, 0] });
  });
});
