// The chip's two versions, for the human to pick on this page before any player screen changes
// (docs/milestones/M20-design-rules-and-clean-up.md, 20n-8; answers 75 and 104 to 107): outlined, as built, beside
// soft-filled, the theme's tint with no outline, in the five themes at once. Each version sits where finding 9 saw the
// sameness: in a card's head beside a flat button, on a row, on your own tinted row, then the kinds and the badges.
import kit from "../../kit.module.css";
import admin from "../admin.module.css";
import styles from "./chip-versions.module.css";

// Each strip carries its theme as the settings sheet's tiles do (globals.css, [data-theme]).
const THEMES = [
  ["paper", "Paper"],
  ["night", "Night"],
  ["sky", "Sky"],
  ["moonlit", "Moonlit"],
  ["ink", "Ink"],
] as const;

const VERSIONS = [
  ["outlined", "Outlined, as built"],
  ["soft", "Soft-filled"],
] as const;

// data-piece marks what the soft version restyles (chip-versions.module.css): a plain chip, a plain badge, or a kind
// that keeps its own fill and only loses its outline.
function Sample({ version, label }: { version: (typeof VERSIONS)[number][0]; label: string }) {
  return (
    <div role="group" aria-label={label}>
      <p className={styles.label}>{label}</p>
      <div className={`${kit.card} ${styles[version]}`}>
        <div className={kit.head}>
          <span className={kit.chips}>
            <strong>Friend requests</strong>
            <span className={kit.chip} data-piece="chip">2</span>
          </span>
          <button type="button">See all</button>
        </div>
        <ul className={kit.rows}>
          <li className={kit.row}>
            <span className={`${kit.badge} ${kit.hot}`} data-piece="kind" data-place="1" />
            <span className={kit.grow}>A friend</span>
            <span className={kit.chip} data-piece="chip">Question 3</span>
          </li>
          <li className={`${kit.row} ${kit.you}`}>
            <span className={kit.badge} data-piece="badge" data-place="2" />
            <span className={kit.grow}>You</span>
            <span className={kit.chip} data-piece="chip">620</span>
          </li>
        </ul>
        <div className={kit.chips}>
          <span className={kit.chip} data-piece="chip">7 rounds</span>
          <span className={`${kit.chip} ${kit.dark}`} data-piece="kind">Question 1 of 7</span>
          <span className={`${kit.chip} ${kit.safe}`} data-piece="kind">Safe</span>
          <span className={`${kit.chip} ${kit.caught}`} data-piece="kind">Caught</span>
        </div>
      </div>
    </div>
  );
}

export function ChipVersions() {
  return (
    <section aria-label="Chip versions" className={kit.card}>
      <h3 className={admin.cardTitle}>Chip versions</h3>
      <p className={styles.about}>
        Chips, counts, flat buttons and rows all share the white fill and the ink outline. Here is the chip and the badge as built, and with the theme&apos;s
        tint and no outline, in the five themes. Nothing on a player&apos;s screen has changed.
      </p>
      <div className={styles.themes}>
        {THEMES.map(([theme, name]) => (
          <div key={theme} role="group" aria-label={name} data-theme={theme} className={styles.theme}>
            <h4 className={styles.name}>{name}</h4>
            <div className={styles.versions}>
              {VERSIONS.map(([version, label]) => (
                <Sample key={version} version={version} label={label} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
