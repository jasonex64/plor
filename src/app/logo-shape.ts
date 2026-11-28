// The shape of Plor's logo, the peeking o: a round ring, and inside it a white face whose top rises into one soft point
// on the side he looks to. Every number is the one drawn on the sheet the human picked from, version B
// (docs/research/mocks/20g/peeking-o.html; docs/milestones/M20-design-rules-and-clean-up.md, 20g, answers 127 and 128,
// and "lets' do B"), in a 64 by 64 box.
export const BOX = 64;

export type Drawing = {
  // The ring's outer radius, about the box's centre.
  ring: number;
  // The round of the white face, and the width of the white outline that softens its edge.
  face: { cx: number; cy: number; r: number };
  edge: number;
  // The point: how far it rises, how wide it is (radians), and how far its tip leans right, as a share of its height.
  point: { h: number; w: number; lean: number };
  // The two pupils, glancing right.
  eyes: { x: [number, number]; y: number; rx: number; ry: number };
};

// The sheet's full drawing: the mark at 180px and up, and the app's icons (docs/research/mocks/20g/peeking-o.html, `full` and version B's `f`).
export const FULL: Drawing = { ring: 28, face: { cx: 32, cy: 36, r: 14.5 }, edge: 2, point: { h: 6.2, w: 0.14, lean: 0.2 }, eyes: { x: [34, 42], y: 37, rx: 2.9, ry: 4.1 } };

// The sheet's small drawing, for 32px and under and for the word: a thinner ring, a bigger face and eyes, a taller
// point (docs/research/mocks/20g/peeking-o.html, `small` and version B's `s`).
export const SMALL: Drawing = { ring: 31, face: { cx: 32, cy: 37, r: 18 }, edge: 2, point: { h: 8, w: 0.14, lean: 0.2 }, eyes: { x: [31.5, 42], y: 39.5, rx: 3.8, ry: 5 } };

// The sheet's app icon: the full drawing at 84% in its square, so the ring is inside the maskable safe circle (web.dev,
// maskable icons, SOURCES.md: a radius of 40% of the icon's width; src/app/logo-shape.test.ts; docs/research/mocks/20g/peeking-o.html, `icon`).
export const ICON_SCALE = 0.84;

// The face's outline as the sheet's script draws it: a circle with one smooth bump added to its top, in short lines.
// The bump is centred 0.1 radians right of the top and falls off as (1 / (1 + u²))^1.2; where it has all but gone, one
// point in eight is kept.
export function facePoints({ face, point }: Drawing): [number, number][] {
  const points: [number, number][] = [];
  // 720 steps round the circle, half a degree each (docs/research/mocks/20g/peeking-o.html, `face`).
  for (let i = 0; i < 720; i++) {
    const angle = ((i - 360) * Math.PI) / 360;
    // docs/research/mocks/20g/peeking-o.html, `face`: the bump's centre.
    const u = (angle - 0.1) / point.w;
    // docs/research/mocks/20g/peeking-o.html, `face`: the bump's fall-off.
    const bump = Math.pow(1 / (1 + u * u), 1.2);
    // docs/research/mocks/20g/peeking-o.html, `face`: the points left out.
    if (i % 8 && bump < 0.002) continue;
    const r = face.r + point.h * bump;
    points.push([face.cx + r * Math.sin(angle) + point.h * point.lean * bump, face.cy - r * Math.cos(angle)]);
  }
  return points;
}

const two = (n: number) => Math.round(n * 100) / 100;
export const facePath = (drawing: Drawing) => `M${facePoints(drawing).map(([x, y]) => `${two(x)} ${two(y)}`).join("L")}Z`;
