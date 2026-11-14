"use client";

// Game 2's screen with its comments (docs/milestones/M16-16f-the-shared-pieces.md, 16f-3; human, 2026-11-13: "Each game
// its own"): the run, and once it's over Fragments' own thread, friends' and written to from its result, as Offbeat's
// screen has its own (src/app/offbeat.tsx). Fragments' thread doesn't update live yet: the board's nudges skip game 2
// until 16f-6 (DECISIONS.md, Log 2026-11-07), so it loads with the page and when the run ends.
import { useCallback, useState } from "react";
import { SUBSTRINGS, SUBSTRINGS_ID } from "@/platform/game";
import { Comments } from "./comments";
import { SideColumn } from "./side-column";
import { SubstringsScreen } from "./substrings";

export function FragmentsScreen({ username, name }: { username: string; name: string }) {
  const [runOver, setRunOver] = useState(false);
  // While the run is in play the screen holds only the game, as Offbeat's does; the thread stays mounted, hidden, so a
  // draft in it stays.
  const [playing, setPlaying] = useState(false);
  const reportOver = useCallback((over: boolean) => setRunOver(over), []);
  return (
    <>
      <SubstringsScreen onOver={reportOver} onPlaying={setPlaying} />
      <SideColumn label={`${SUBSTRINGS.name} comments`} inPlace hidden={playing}>
        <Comments username={username} name={name} runOver={runOver} nudge={0} game={SUBSTRINGS_ID} title={`${SUBSTRINGS.name} comments`} />
      </SideColumn>
    </>
  );
}
