import { useId } from "react";
import { ButtonLink } from "./button-link";
import styles from "./guest-peek.module.css";
import kit from "./kit.module.css";
import { SIGN_IN_HREF } from "./sign-in-open";
import { BACK } from "./slide";

// The calendar's four shades, in a fixed order: a drawing, not anyone's days.
const DAYS = [1, 3, 2, 4, 2, 1, 3, 4, 2, 3, 1, 4, 3, 2];

// Under a guest's result, in both games: what an account adds, as words over a drawn stand-in, blurred, of a streak, a
// friends board and a calendar (docs/milestones/M18-guest-play.md, answers 2 and 15; Design, "The peek and pages"). The
// stand-in is fixed shapes: nothing is fetched and it shows no one's data, so it is aria-hidden and a screen reader
// hears the words and the link alone. The link goes where every "Sign in" goes (answer 33).
export function GuestPeek() {
  const words = useId();
  return (
    <section aria-labelledby={words} className={styles.peek}>
      <div aria-hidden="true" className={styles.standIn}>
        <span className={styles.streak}>
          <span className={`${kit.badge} ${kit.hot}`} />
          <i />
        </span>
        <div className={kit.rows}>
          {[0, 1, 2].map((place) => (
            <div key={place} className={kit.row}>
              <span className={place === 0 ? `${kit.badge} ${kit.hot}` : kit.badge} />
              <i />
            </div>
          ))}
        </div>
        <div className={styles.calendar}>
          {DAYS.map((shade, i) => (
            <span key={i} data-shade={shade} />
          ))}
        </div>
      </div>
      <div className={`${kit.card} ${styles.ask}`}>
        <p id={words}>Make an account to keep your streak, see your friends and play today&apos;s game for points</p>
        <p>
          <ButtonLink href={SIGN_IN_HREF} transitionTypes={BACK} className={kit.primary}>
            Make an account
          </ButtonLink>
        </p>
      </div>
    </section>
  );
}
