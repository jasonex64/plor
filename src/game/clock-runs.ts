// A signed-in player's run on a clock (docs/milestones/M23-23c-the-run-on-a-clock.md). The work is in clock-play.ts, shared with
// the guest's run; this says whose it is, and that the player's typed text that names nothing is logged as a miss
// (run-shared.ts, logMiss) while a guest's is not.
import type { Db } from "@/lib/db";
import { answerClock, finishClock, nextClock, playerSide, startClockRun, todaysClockState } from "./clock-play";
import { logMiss } from "./run-shared";

// The player's run in progress, or today's day not started; null when nothing is approved for it.
export const clockState = (db: Db, userId: string) => todaysClockState(db, playerSide(userId));

export const startClock = (db: Db, userId: string) => startClockRun(db, playerSide(userId));

export const answerClockRun = (db: Db, userId: string, index: number, typed: string) =>
  answerClock(db, playerSide(userId), index, typed, (puzzle, i, t) => logMiss(db, userId, puzzle.date, i, t));

export const nextClockRun = (db: Db, userId: string, fromIndex: number) => nextClock(db, playerSide(userId), fromIndex);

export const finishClockRun = (db: Db, userId: string) => finishClock(db, playerSide(userId));
