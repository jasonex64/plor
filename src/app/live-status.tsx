"use client";

// What a page that listens to the board's channel shows of it (src/app/board-channel.ts): that live updates are paused
// while realtime-js reconnects, and the channel's error, with Try again once it couldn't be opened at all
// (docs/milestones/M14-14b-2c-review-items.md, answer 14: the player decides, so nothing retries by itself).
import type { BoardChannel } from "./board-channel";

export function LiveStatus({ channel }: { channel: BoardChannel }) {
  return (
    <>
      {channel.paused && <p role="status">Live updates paused, reconnecting…</p>}
      {channel.failure && (
        <p role="alert">
          {channel.failure.error}
          {channel.failure.closed && (
            <>
              {" "}
              <button type="button" onClick={channel.retry}>
                Try again
              </button>
            </>
          )}
        </p>
      )}
    </>
  );
}
