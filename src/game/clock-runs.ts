// A signed-in player's run on a clock (docs/milestones/M23-23c-the-run-on-a-clock.md). The work is in clock-play.ts, shared with
// the guest's run; this says whose it is, and that the player's typed text that names nothing is logged as a miss
// (runs.ts, logMiss) while a guest's is not.
import type { Db } from "@/lib/db";
import { answerClock, finishClock, isClockDay, nextClock, playerSide, startClockRun, todaysClockState } from "./clock-play";
import { logMiss } from "./runs";

// Whether the player's run today, or the one in progress from before midnight, is on a clock: the routes' choice between
// this module and runs.ts.
export const isClockRun = (db: Db, userId: string) => isClockDay(db, playerSide(userId));

// The player's run in progress, or today's day not started; null when nothing is approved for it.
export const clockState = (db: Db, userId: string) => todaysClockState(db, playerSide(userId));

export const startClock = (db: Db, userId: string) => startClockRun(db, playerSide(userId));

export const answerClockRun = (db: Db, userId: string, index: number, typed: string) =>
  answerClock(db, playerSide(userId), index, typed, (puzzle, i, t) => logMiss(db, userId, puzzle, i, t));

export const nextClockRun = (db: Db, userId: string, fromIndex: number) => nextClock(db, playerSide(userId), fromIndex);

export const finishClockRun = (db: Db, userId: string) => finishClock(db, playerSide(userId));
