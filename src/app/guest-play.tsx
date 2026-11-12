import { Suspense } from "react";
import { connection } from "next/server";
import { readServerEnv } from "@/config/env";
import { GuestGame } from "./guest-game";

// The site key reaches the browser from the server at request time, never as NEXT_PUBLIC_, so the build doesn't fix it
// (docs/milestones/M18-guest-play.md, Design, "The bot check"; node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md).
async function GuestWithKey({ game }: { game: "offbeat" | "substrings" }) {
  await connection();
  return <GuestGame siteKey={readServerEnv().turnstile.siteKey} game={game} />;
}

export function GuestPlay({ game }: { game: "offbeat" | "substrings" }) {
  return (
    <Suspense fallback={null}>
      <GuestWithKey game={game} />
    </Suspense>
  );
}
