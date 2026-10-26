// The streak's ranks (docs/milestones/M14-14b-2a-streak-ranks.md): a flower for each, from a seed at 0 days to sakura
// from 90, drawn as the human approved them (2026-10-26: "Good, build these (Recommended)"). Drawn art keeps its own
// colours in every theme (DECISIONS.md: Styling). Each drawing is laid twice: once filled and stroked in its outline
// colour, details left out, under itself, so only the silhouette's edge shows as the dark outline.
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { STREAK_RANK_FROM } from "@/config/tunables";
import styles from "./ranks.module.css";

export type Rank = { name: string; from: number; outline: string; art: ReactNode };

const rot = (a: number) => `rotate(${a} 12 12)`;
const n = (v: number) => Math.round(v * 100) / 100;
const ring = (count: number, draw: (a: number) => ReactNode, offset = 0) =>
  Array.from({ length: count }, (_, i) => <Fragment key={i}>{draw(offset + (i * 360) / count)}</Fragment>);
// The light comes from the top right: petals pointing that way take the lighter shade.
const lit = (a: number) => {
  const d = ((a % 360) + 360) % 360;
  return d <= 110 || d >= 320;
};
// A pointed petal from (x, y), len long and w wide, turned a degrees about its base.
const tip = (x: number, y: number, a: number, len: number, w: number, fill: string, detail = false) => (
  <path
    className={detail ? styles.detail : undefined}
    d={`M${x} ${y}C${n(x - w)} ${n(y - len * 0.4)} ${n(x - w * 0.6)} ${n(y - len * 0.8)} ${x} ${n(y - len)}C${n(x + w * 0.6)} ${n(y - len * 0.8)} ${n(x + w)} ${n(y - len * 0.4)} ${x} ${y}Z`}
    fill={fill}
    transform={`rotate(${a} ${x} ${y})`}
  />
);
// A cherry petal from the centre, len long and w wide, with the notch at its end.
const notch = (a: number, len: number, w: number, fill: string) => (
  <path
    d={`M12 12C${n(12 - w)} ${n(12 - len * 0.3)} ${n(12 - w * 1.1)} ${n(12 - len * 0.75)} ${n(12 - w * 0.7)} ${n(12 - len)}L12 ${n(12 - len * 0.85)}L${n(12 + w * 0.7)} ${n(12 - len)}C${n(12 + w * 1.1)} ${n(12 - len * 0.75)} ${n(12 + w)} ${n(12 - len * 0.3)} 12 12Z`}
    fill={fill}
    transform={rot(a)}
  />
);

const WINE = "#2a0f1a";
const [SEED, DAISY, MORNING_GLORY, HIBISCUS, LOTUS, SAKURA] = STREAK_RANK_FROM;

export const RANKS: Rank[] = [
  {
    name: "Seed",
    from: SEED,
    outline: "#2b1d12",
    art: (
      <>
        <path d="M12 3.5C15 7.5 17.5 11.5 17.5 15a5.5 5.5 0 0 1-11 0C6.5 11.5 9 7.5 12 3.5Z" fill="#8a6a4a" />
        <path className={styles.detail} d="M12 3.5C10.5 8 9.5 12 9.8 16.5c.2 2 1.2 3.2 2.2 3.9a5.5 5.5 0 0 1-5.5-5.4C6.5 11.5 9 7.5 12 3.5Z" fill="#6b4f35" />
        <ellipse className={styles.detail} cx="14.6" cy="12.2" rx="1" ry="2.4" transform="rotate(-18 14.6 12.2)" fill="#a8865f" />
      </>
    ),
  },
  {
    name: "Daisy",
    from: DAISY,
    outline: WINE,
    art: (
      <>
        {ring(16, (a) => (
          <path d="M12 12C11 10 10.5 6.4 10.9 4.2Q12 2.4 13.1 4.2C13.5 6.4 13 10 12 12Z" fill={lit(a) ? "#ffffff" : "#e4def0"} transform={rot(a)} />
        ))}
        {ring(16, (a) => (
          <path className={styles.detail} d="M12 9.6V5" stroke="#d6d0e4" strokeWidth=".45" strokeLinecap="round" transform={rot(a)} />
        ))}
        <circle cx="12" cy="12" r="3.4" fill="#f0b429" />
        <circle className={styles.detail} cx="12.9" cy="11.1" r="1.9" fill="#ffdf6e" />
        {ring(9, (a) => (
          <circle className={styles.detail} cx="12" cy="9.7" r=".38" fill="#c98a12" transform={rot(a)} />
        ))}
      </>
    ),
  },
  {
    name: "Morning glory",
    from: MORNING_GLORY,
    outline: WINE,
    art: (
      <>
        {ring(5, (a) => (
          <circle cx="12" cy="7.6" r="5.3" fill={lit(a) ? "#4a6ad6" : "#3a55b8"} transform={rot(a)} />
        ))}
        <circle className={styles.detail} cx="12" cy="12" r="6.4" fill="#86a2f5" />
        {ring(5, (a) => (
          <path className={styles.detail} d="M12 12 11.2 3.6 12 2.6 12.8 3.6Z" fill="#c7d4fb" transform={rot(a + 36)} />
        ))}
        <circle cx="12" cy="12" r="2.7" fill="#ffffff" />
        <circle cx="12" cy="12" r="1.2" fill="#ffdf6e" />
      </>
    ),
  },
  {
    name: "Hibiscus",
    from: HIBISCUS,
    outline: WINE,
    art: (
      <>
        {ring(5, (a) => (
          <path
            d="M12 12C9.4 9.2 6.8 5.6 8.6 3.3 9.8 2.2 10.9 3 12 2.5 13.1 3 14.2 2.2 15.4 3.3 17.2 5.6 14.6 9.2 12 12Z"
            fill={lit(a) ? "#f27373" : "#d23a48"}
            transform={rot(a)}
          />
        ))}
        {ring(5, (a) => (
          <path className={styles.detail} d="M12 11 10.6 5.6M12 11V4.6M12 11 13.4 5.6" stroke="#9e1f33" strokeWidth=".5" strokeLinecap="round" fill="none" transform={rot(a)} />
        ))}
        <circle cx="12" cy="12" r="2.3" fill="#9e1f33" />
        <path d="M12 12 17.4 5.8" stroke="#f6cdd8" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="17.7" cy="5.4" r=".85" fill="#f0b429" />
        <circle cx="16.6" cy="5" r=".7" fill="#f0b429" />
        <circle cx="18.4" cy="6.5" r=".7" fill="#f0b429" />
      </>
    ),
  },
  {
    name: "Lotus",
    from: LOTUS,
    outline: WINE,
    art: (
      <>
        <ellipse cx="12" cy="20.2" rx="9.2" ry="1.9" fill="#43a866" />
        <ellipse className={styles.detail} cx="13.5" cy="19.8" rx="5" ry=".8" fill="#5cc27e" />
        {tip(12, 19.2, -74, 8.6, 2.3, "#b9607c")}
        {tip(12, 19.2, 74, 8.6, 2.3, "#e8a0b4")}
        {tip(12, 19.2, -47, 11, 2.8, "#e8a0b4")}
        {tip(12, 19.2, 47, 11, 2.8, "#f6cdd8")}
        {tip(12, 19.2, -21, 12.6, 3.1, "#f6cdd8")}
        {tip(12, 19.2, 21, 12.6, 3.1, "#ffffff")}
        {tip(12, 19.2, 0, 14, 3.4, "#ffffff")}
        {tip(12, 10.2, 0, 5, 1.7, "#f6cdd8", true)}
        {tip(12, 19.2, 0, 6, 2, "#f6cdd8", true)}
      </>
    ),
  },
  {
    name: "Sakura",
    from: SAKURA,
    outline: WINE,
    art: (
      <>
        {ring(5, (a) => notch(a, 9.4, 3.8, lit(a) ? "#f6cdd8" : "#e8a0b4"))}
        {ring(5, (a) => (
          <ellipse className={styles.detail} cx="12" cy="9.8" rx="1.1" ry="2" fill="#e8a0b4" transform={rot(a)} />
        ))}
        <circle cx="12" cy="12" r="1.9" fill="#b9607c" />
        {ring(
          7,
          (a) => (
            <>
              <path className={styles.detail} d="M12 12V8.6" stroke="#b9607c" strokeWidth=".5" transform={rot(a)} />
              <circle className={styles.detail} cx="12" cy="8.4" r=".55" fill="#f0b429" transform={rot(a)} />
            </>
          ),
          10,
        )}
      </>
    ),
  },
];

// The highest rank the streak has reached.
export function rankFor(days: number): Rank {
  return RANKS.filter((r) => days >= r.from).at(-1)!;
}

// Its days, as /streak lists them: "0 days", "1–4 days", …, "90 days and up".
export function rankDays(rank: Rank): string {
  const next = RANKS[RANKS.indexOf(rank) + 1];
  if (!next) return `${rank.from} days and up`;
  if (next.from - 1 === rank.from) return `${rank.from} days`;
  return `${rank.from}–${next.from - 1} days`;
}

// The rank's flower, size pixels square; decoration, since the text beside it names the rank.
export function RankFlower({ rank, size }: { rank: Rank; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={styles.flower} style={{ "--outline": rank.outline } as CSSProperties}>
      <g className={styles.outline}>{rank.art}</g>
      <g>{rank.art}</g>
    </svg>
  );
}
