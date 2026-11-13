// Questions survived on each of the last days, as bars: the game screen's chart (docs/milestones/
// M14-14a-2b-game-screen.md, L35), and a friend's "recent results" on their profile
// (docs/milestones/M17-profiles-and-friend-requests.md, 17b, E3).
import { QUESTIONS_PER_DAY } from "@/config/tunables";
import type { Stats } from "@/game/offbeat";
import styles from "./offbeat.module.css";

// "Sat", from a calendar date read in UTC so it can't shift by a day.
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

export function SurvivedChart({ days }: { days: Stats["days"] }) {
  const today = days[days.length - 1].date;
  const said = days.map((d) => `${weekday(d.date)} ${d.survived ?? (d.date === today ? "not played yet" : "not played")}`);
  return (
    <figure className={styles.chart}>
      <figcaption>Questions survived, last 7 days</figcaption>
      {/* The bars are one image to a screen reader, whose label says each day's value (WCAG 2.2 1.1.1). */}
      <div role="img" aria-label={said.join(", ")} className={styles.bars}>
        {days.map((d) => (
          <div key={d.date} aria-hidden="true">
            <span className={styles.value}>{d.survived ?? "–"}</span>
            <i style={{ height: `${((d.survived ?? 0) / QUESTIONS_PER_DAY) * 100}%` }} />
            <span>{weekday(d.date)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
