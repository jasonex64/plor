import { GAME, SUBSTRINGS } from "@/platform/game";
import styles from "./emblem.module.css";

// Each game's emblem, on its card on Today and on the signed-out front page (docs/milestones/
// M20-design-rules-and-clean-up.md, 20n-7, answers 76 and 100): Offbeat's is two answer cards, the front one out of line
// (answer 101); Fragments' a letter tile broken in two (answer 102). Drawn as the human picked them from
// docs/research/mocks/20n-7/emblems.png, in white lines with one yellow highlight (answer 103), on the band's game
// colour. Drawn art keeps its own colours in every theme (DECISIONS.md: Styling), as the streak's flowers do
// (src/app/ranks.tsx). A drawing beside the game's name, so a screen reader hears the name alone.
const LINE = "#ffffff";
const LIT = "#ffd84d";
const INK = "#1a1a1a";

export function Emblem({ game }: { game: typeof GAME.id | typeof SUBSTRINGS.id }) {
  return (
    <svg data-emblem={game} aria-hidden="true" viewBox="0 0 24 24" className={styles.emblem} fill="none" stroke={LINE} strokeWidth="1.6" strokeLinejoin="round">
      {game === GAME.id ? (
        <>
          <rect x="3" y="4" width="13" height="16" rx="2.2" />
          <g transform="rotate(14 15 13)">
            <rect x="9" y="5.5" width="12" height="15" rx="2.2" fill={LIT} />
            <path d="M12 10.5H18M12 14H16" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </>
      ) : (
        <>
          <path d="M5 3.5H12.5L10.5 8L13.5 11.5L10 15.5L12 20.5H5A2 2 0 0 1 3 18.5V5.5A2 2 0 0 1 5 3.5Z" fill={LIT} />
          <path d="M15.5 4.5H19.5A2 2 0 0 1 21.5 6.5V19.5A2 2 0 0 1 19.5 21.5H15L13 16.5L16.5 12.5L13.5 9Z" />
        </>
      )}
    </svg>
  );
}
