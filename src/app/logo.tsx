import type { ReactNode } from "react";
import styles from "./logo.module.css";
import { BOX, FULL, ICON_SCALE, SMALL, facePath, type Drawing } from "./logo-shape";

// Plor's logo: the peeking o, and the word with him as its o (docs/milestones/M20-design-rules-and-clean-up.md, 20g;
// drawn as the human picked it, version B of docs/research/mocks/20g/peeking-o.html). The same drawing makes the app's
// icons (src/app/icon.tsx, apple-icon.tsx), which have no stylesheet, so the ring's colour is given there.
const FACE = "#ffffff";
const PUPIL = "#1a1a18";
// Plor's blue on a light ground (answers 130 and 131): the icons' ring.
export const BLUE = "#2457d6";

function PeekingO({ drawing, ring }: { drawing: Drawing; ring?: string }) {
  const { eyes } = drawing;
  return (
    <>
      <circle data-ring="" className={ring ? undefined : styles.ring} fill={ring} cx={BOX / 2} cy={BOX / 2} r={drawing.ring} />
      <path d={facePath(drawing)} fill={FACE} stroke={FACE} strokeWidth={drawing.edge} strokeLinejoin="round" />
      {eyes.x.map((x) => (
        <ellipse key={x} cx={x} cy={eyes.y} rx={eyes.rx} ry={eyes.ry} fill={PUPIL} />
      ))}
    </>
  );
}

// The word, as the sheet's lockup draws it: P, l and r in round-ended strokes 8 wide, and he, the small drawing, 34 tall
// (the x-height and the strokes' round ends) with his centre at (69, 38). The box is cut to the letters, so the P's
// stem is its left edge and the l's top its top. A drawing beside the page's own "Plor" heading, which screen readers
// have (src/app/shell.tsx), so it is hidden from them.
// docs/research/mocks/20g/peeking-o.html, `word`: his half-height, 17.
const O_SCALE = 17 / SMALL.ring;
// docs/research/mocks/20g/peeking-o.html, `word`: his centre in the word's box.
const O_AT = [69, 38];
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg data-logo="" aria-hidden="true" viewBox="6 0 104 54" className={`${styles.word}${className ? ` ${className}` : ""}`} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <path data-part="P" d="M10 14V50M10 14h9a9.5 9.5 0 0 1 0 19H10" />
      <path data-part="l" d="M44 4V50" />
      {/* docs/research/mocks/20g/peeking-o.html, `word`: his centre, (69, 38). */}
      <g data-part="o" stroke="none" transform={`translate(${O_AT[0] - (BOX / 2) * O_SCALE} ${O_AT[1] - (BOX / 2) * O_SCALE}) scale(${O_SCALE})`}>
        <PeekingO drawing={SMALL} />
      </g>
      <path data-part="r" d="M94 26V50M94 37a11 11 0 0 1 11-11h1" />
    </svg>
  );
}

// For the app's icons (next/og draws them, with no stylesheet). The tab's icon is him alone, the small drawing, to the
// edges; the others are the full drawing on a white square (answer 130), inside the safe circle.
const picture = (px: number, children: ReactNode, ground?: string) => (
  <div style={{ display: "flex", width: "100%", height: "100%", background: ground }}>
    <svg width={px} height={px} viewBox={`0 0 ${BOX} ${BOX}`}>
      {children}
    </svg>
  </div>
);
export const tabIcon = (px: number) => picture(px, <PeekingO drawing={SMALL} ring={BLUE} />);
export const squareIcon = (px: number) =>
  picture(
    px,
    <g transform={`translate(${BOX / 2} ${BOX / 2}) scale(${ICON_SCALE}) translate(${-BOX / 2} ${-BOX / 2})`}>
      <PeekingO drawing={FULL} ring={BLUE} />
    </g>,
    FACE,
  );
