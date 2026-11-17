"use client";

// The moments in four looks (docs/milestones/M20-design-rules-and-clean-up.md, 20a; answers 18 to 24): as built, and
// three proposals from restrained to bold, for the human to pick on this page before any player screen changes (20k).
// Each look draws the same moments: Today's two game cards, a result, a board with your own row, the feed's comment
// beside a friend's result, and a reaction. The levers are answer 18's: each game's colour, a bigger size, a motion;
// every value is one already in the app (looks.module.css). Then the motions, each at the timings on the ticket's menu.
import { useState } from "react";
import kit from "../../kit.module.css";
import admin from "../admin.module.css";
import styles from "./looks.module.css";

type Look = { name: string; key: "built" | "restrained" | "balanced" | "bold"; about: string };

const LOOKS: Look[] = [
  { name: "As built", key: "built", about: "Today's look: every moment is the same white card and bordered row." },
  {
    name: "Restrained",
    key: "restrained",
    about: "Each game's colour as a 4px edge on its own things; scores at the card heading's size; a comment loses its box.",
  },
  {
    name: "Balanced",
    key: "balanced",
    about: "Game cards and results get a band in their game's colour; scores larger; board rows carry their game's edge; your row an accent edge.",
  },
  {
    name: "Bold",
    key: "bold",
    about: "Game cards and results filled with their game's colour; scores at the largest size in use; results in the feed filled too.",
  },
];

function Moments({ look }: { look: Look["key"] }) {
  const v = styles[look];
  return (
    <div className={`${styles.moments} ${v}`}>
      <div className={styles.games}>
        <article className={`${kit.card} ${styles.game} ${styles.offbeat}`}>
          <p className={styles.band}>Offbeat · Tue 17 Nov</p>
          <p className={styles.score}>1,140</p>
          <p className={styles.meta}>Survived all 7 · better than 72% of players</p>
          <p className={styles.meta}>Next puzzle in 6h 12m</p>
        </article>
        <article className={`${kit.card} ${styles.game} ${styles.fragments}`}>
          <p className={styles.band}>Fragments · Tue 17 Nov</p>
          <p className={styles.score}>1,380</p>
          <p className={styles.meta}>7 rounds · 19 of 26 letters</p>
          <p className={styles.meta}>Next puzzle in 6h 12m</p>
        </article>
      </div>
      <section aria-label={`${look} board`} className={kit.card}>
        <h2>Friends today</h2>
        <ul className={kit.rows}>
          <li className={`${kit.row} ${styles.boardRow} ${styles.offbeat}`}>
            <span className={`${kit.badge} ${kit.hot}`} data-place="1" />
            <span className={`${kit.grow} ${styles.name}`}>Alexandria</span>
            <span className={styles.points}>1,210</span>
          </li>
          <li className={`${kit.row} ${kit.you} ${styles.boardRow} ${styles.you} ${styles.offbeat}`}>
            <span className={kit.badge} data-place="2" />
            <span className={`${kit.grow} ${styles.name}`}>You</span>
            <span className={styles.points}>1,140</span>
          </li>
          <li className={`${kit.row} ${styles.boardRow} ${styles.offbeat}`}>
            <span className={kit.badge} data-place="3" />
            <span className={`${kit.grow} ${styles.name}`}>Sam</span>
            <span className={`${kit.chip} ${styles.status}`}>Not yet</span>
          </li>
        </ul>
      </section>
      <section aria-label={`${look} feed`} className={kit.card}>
        <h2>Feed</h2>
        <div className={`${styles.comment}`}>
          <p className={styles.who}>Sam</p>
          <p>that last question was brutal</p>
          <p className={styles.reactions}>
            <span className={styles.reaction}>😂 2</span>
          </p>
        </div>
        <div className={`${styles.result} ${styles.fragments}`}>
          <p className={styles.who}>Alexandria</p>
          <p className={styles.resultLine}>
            <span className={styles.resultScore}>1,520</span> in Fragments
          </p>
          <p className={styles.reactions}>
            <span className={`${styles.reaction} ${styles.reactionMine}`}>🔥 3</span>
          </p>
        </div>
      </section>
    </div>
  );
}

// The motion menu: the ticket's Numbers, from docs/research/reports/Game look directions for Plor.md ("Try Route 1
// first"), docs/research/research_notes/2026-11-17 calm frame, loud moments.md ("Motion menu") and Plor's own --quick. Each plays on Replay; under reduced motion nothing moves (looks.module.css).
const MOTIONS: { name: string; className: string; timings: { ms: number; from: string }[] }[] = [
  {
    name: "Pop in (a reaction added, a result arriving)",
    className: "pop",
    timings: [
      { ms: 100, from: "Wordle's pop" },
      { ms: 200, from: "Plor's --quick" },
      { ms: 300, from: "Connections' bounce" },
    ],
  },
  {
    name: "Fade in (a new item in the feed or on a board)",
    className: "slide",
    timings: [
      { ms: 240, from: "Carbon's moderate-02" },
      { ms: 250, from: "Material's medium1" },
      { ms: 400, from: "Atlassian's xlong" },
    ],
  },
];

function Motions() {
  const [run, setRun] = useState(0);
  return (
    <section aria-label="Motion" className={kit.card}>
      <h3 className={admin.cardTitle}>Motion</h3>
      <p className={styles.about}>Each motion at each timing on the menu. Pick the ones that feel right; Replay plays them again.</p>
      <button type="button" className={kit.link} onClick={() => setRun((n) => n + 1)}>
        Replay
      </button>
      {MOTIONS.map((m) => (
        <div key={m.name} className={styles.motion}>
          <p className={styles.meta}>{m.name}</p>
          <div className={kit.chips}>
            {m.timings.map((t) => (
              <span key={`${t.ms}-${run}`} className={`${kit.chip} ${styles[m.className]}`} style={{ animationDuration: `${t.ms}ms` }}>
                {t.ms}ms · {t.from}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function Looks() {
  return (
    <>
      {LOOKS.map((look) => (
        <section key={look.key} aria-label={look.name} className={kit.card}>
          <h3 className={admin.cardTitle}>{look.name}</h3>
          <p className={styles.about}>{look.about}</p>
          <Moments look={look.key} />
        </section>
      ))}
      <Motions />
    </>
  );
}
