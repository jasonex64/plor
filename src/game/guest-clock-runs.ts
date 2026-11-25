// A guest's run on a clock (docs/milestones/M23-23c-the-run-on-a-clock.md; M18 guest play): the same run as a player's, on the
// guest tables keyed by the hash of the guest's token (clock-play.ts). The guest's run is always today's, it stays until the
// day's purge so its result can be read again, and text that names nothing is a free retry stored nowhere (M19 answer 19).
import type { Db } from "@/lib/db";
import { answerClock, finishClock, guestSide, isClockDay, nextClock, startClockRun, todaysClockState } from "./clock-play";

// Whether today's day is on a clock: the guest routes' choice between this module and guest-runs.ts.
export const isClockGuestRun = (db: Db) => isClockDay(db, guestSide(null));

// The guest's run, or today's day not started; null when nothing is approved for today. A null hash is a visitor with no run.
export const guestClockState = (db: Db, tokenHash: string | null) => todaysClockState(db, guestSide(tokenHash));

// Every start first deletes the guest runs of days that have closed, as startGuestRun does.
export async function startGuestClockRun(db: Db, tokenHash: string) {
  await db.query("select private.purge_guest_days()");
  return startClockRun(db, guestSide(tokenHash));
}

export const answerGuestClock = (db: Db, tokenHash: string, index: number, typed: string) => answerClock(db, guestSide(tokenHash), index, typed, null);

export const nextGuestClock = (db: Db, tokenHash: string, fromIndex: number) => nextClock(db, guestSide(tokenHash), fromIndex);

export const finishGuestClock = (db: Db, tokenHash: string) => finishClock(db, guestSide(tokenHash));
