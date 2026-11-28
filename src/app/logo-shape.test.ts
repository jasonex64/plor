import { describe, expect, it } from "vitest";
import { BOX, FULL, ICON_SCALE, SMALL, facePoints } from "./logo-shape";

describe("the peeking o's shape", () => {
  // web.dev, maskable icons (SOURCES.md): what matters sits in a centred circle whose radius is 40% of the icon's width.
  it("is inside the maskable icon's safe circle", () => {
    expect((FULL.ring * ICON_SCALE) / BOX).toBeLessThanOrEqual(0.4);
  });

  it.each([["full", FULL], ["small", SMALL]] as const)("keeps the %s drawing's white inside its ring, point and all", (_name, drawing) => {
    const far = Math.max(...facePoints(drawing).map(([x, y]) => Math.hypot(x - BOX / 2, y - BOX / 2)));
    // The white's own edge is half of its outline's width further out (logo.tsx strokes it).
    expect(far + drawing.edge / 2).toBeLessThan(drawing.ring);
  });

  it("raises the point above the round of the white, on the side he looks to", () => {
    const top = facePoints(FULL).reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(FULL.face.cy - top[1]).toBeGreaterThan(FULL.face.r + FULL.point.h * 0.9);
    expect(top[0]).toBeGreaterThan(BOX / 2);
  });
});
