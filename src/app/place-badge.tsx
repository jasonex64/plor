import kit from "./kit.module.css";
import styles from "./place-badge.module.css";

// A place on a board, as the kit's badge with the top three standing out (docs/milestones/M20-design-rules-and-clean-up.md,
// 20n-6a; inbox #268; the human's answers 90 and 94 to 96): 1st is the accent badge under a small tilted crown, 2nd and
// 3rd the ink badge over two ribbon tails, in the app's own colours; 4th and below the plain badge. The number is drawn
// from data-place (kit.module.css) and the whole badge is for the eye: the list's order says the place.
export function PlaceBadge({ place }: { place: number }) {
  return (
    <span className={place === 1 ? `${kit.badge} ${kit.hot} ${styles.place}` : `${kit.badge} ${styles.place}`} data-place={place} aria-hidden="true">
      {place === 1 && (
        <svg data-crown viewBox="-12 -12 24 24" className={styles.crown}>
          <path d="M-7.5 0 L-8 -7 L-3.8 -3.5 L0 -8.5 L3.8 -3.5 L8 -7 L7.5 0 Z" transform="translate(0 -11.5) rotate(-14) translate(-3 1)" />
        </svg>
      )}
      {(place === 2 || place === 3) && (
        <svg data-tails viewBox="-12 -12 24 24" className={styles.tails}>
          <path d="M-7 8 L-9 19 L-5 16.5 L-2.5 20 L-1 10 Z" />
          <path d="M7 8 L9 19 L5 16.5 L2.5 20 L1 10 Z" />
        </svg>
      )}
    </span>
  );
}
