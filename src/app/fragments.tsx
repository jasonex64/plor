"use client";

// Game 2's screen with its comments (docs/milestones/M16-16f-the-shared-pieces.md, 16f-3; human, 2026-11-13: "Each game
// its own"): the run, and once it's over Fragments' own thread, friends' and written to from its result, as Offbeat's
// screen has its own (src/app/offbeat.tsx). The thread follows the board's channel as Offbeat's does: the nudges for
// comments and reactions carry their game, and the thread reads again on any (16f-6).
import { useCallback, useState } from "react";
import { SUBSTRINGS, SUBSTRINGS_ID } from "@/platform/game";
import { PAYLOAD_VERSION, changesThread, useBoardChannel } from "./board-channel";
import { Comments } from "./comments";
import { LiveStatus } from "./live-status";
import { SideColumn } from "./side-column";
import { SubstringsScreen } from "./substrings";

const FRAGMENTS_ONLY = [SUBSTRINGS_ID] as const;

export function FragmentsScreen({ username, name }: { username: string; name: string }) {
  const [runOver, setRunOver] = useState(false);
  // While the run is in play the screen holds only the game, as Offbeat's does; the thread stays mounted, hidden, so a
  // draft in it stays.
  const [playing, setPlaying] = useState(false);
  const reportOver = useCallback((over: boolean) => setRunOver(over), []);
  const [commentsNudge, setCommentsNudge] = useState(0);
  const nudgeComments = useCallback(() => setCommentsNudge((n) => n + 1), []);
  const channel = useBoardChannel({
    joined: nudgeComments,
    changed: (message) => {
      if (message.v !== PAYLOAD_VERSION) console.error("board message with unknown version", message.v);
      if (changesThread(message, "feed")) nudgeComments();
    },
  });
  return (
    <>
      <SubstringsScreen onOver={reportOver} onPlaying={setPlaying} />
      <SideColumn label={`${SUBSTRINGS.name} comments`} inPlace hidden={playing}>
        <LiveStatus channel={channel} />
        <Comments username={username} name={name} runOver={runOver} nudge={commentsNudge} games={FRAGMENTS_ONLY} title={`${SUBSTRINGS.name} comments`} />
      </SideColumn>
    </>
  );
}
