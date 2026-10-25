"use client";

// The live board (docs/milestones/M07-friends-and-live-board.md, 7c): friends' runs today, updated over the player's
// own Realtime topic (src/app/board-channel.ts). Until the player's own run is over, a friend shows only whether
// they've started (M12 12d); then their question, or that they've finished. How a friend's run ended comes from the
// HTTP board once the player's own run is over, so nothing reaches the page early. So do reactions on runs
// (M08 8b), which the player can add to friends' runs from then on. The same channel carries nudges that comments or
// reactions changed (8d), with no content: the page refetches over HTTP, which decides what the player may see. The
// feed, on Today, listens to the channel itself (src/app/home.tsx).
import { useCallback, useEffect, useState } from "react";
import type { Board as BoardData, BoardFriend, Ended } from "@/friends/board";
import { placeRows, type Place } from "@/friends/ended";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import type { Emoji } from "@/reactions/reactions";
import {
  PAUSED_TEXT,
  PAYLOAD_VERSION,
  STATUS_VERSION,
  useBoardChannel,
  type ChangedMessage,
  type StatusMessage,
} from "./board-channel";
import { Avatar } from "./avatar";
import { InviteLink } from "./invite-link";
import { errorText } from "./messages";
import { Reactions } from "./reactions";

export function Board({ username }: { username: string }) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Refetches overlap (nudges, a reconnect, a reaction): only the newest answer is shown (M11 H6).
  const [latest] = useState(latestOnly);

  const load = useCallback(
    (reason?: "reconnect") => {
      latest(
        api<{ board: BoardData }>(reason ? `/api/board?reason=${reason}` : "/api/board", { method: "GET" }),
        (r) => {
          setBoard(r.board);
          setError(null);
        },
        (err) => setError(errorText(err)),
      );
    },
    [latest],
  );
  useEffect(load, [load]);

  const { paused } = useBoardChannel({
    joined: (reason) => load(reason === "reconnect" ? "reconnect" : undefined),
    status: onStatus,
    changed: onChanged,
    failed: (err) => setError(errorText(err)),
  });

  function onChanged(message: ChangedMessage) {
    if (message.v !== PAYLOAD_VERSION) {
      console.error("board message with unknown version", message.v);
      load();
      return;
    }
    // Reactions on runs are shown only once the player's own run today is over (src/friends/board.ts).
    if (message.type === "run_reactions_changed" && board?.finished && message.puzzleDate === board.date) load();
  }

  function onStatus(message: StatusMessage) {
    if (message.v !== STATUS_VERSION) {
      console.error("board message with unknown version", message.v);
      load();
      return;
    }
    if (!board || message.puzzleDate !== board.date) return;
    // The player's own run ended: how friends' runs ended may now be shown.
    if (message.username === username) {
      if (message.state === "finished" && !board.finished) load();
      return;
    }
    // A friend finished: fetch how their run ended. Only a player who has finished is told (M12 12d), so this page's
    // own refetch for that may still be on its way.
    if (message.state === "finished") {
      load();
      return;
    }
    setBoard({
      ...board,
      friends: board.friends.map((f) => (f.username === message.username ? { ...f, state: message.state, question: message.question } : f)),
    });
  }

  async function react(friend: string, emoji: Emoji | null) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/reactions", { method: "POST", body: { date: board!.date, target: { type: "run", username: friend }, emoji } });
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Friends today">
      <h2>Friends today</h2>
      {paused && <p role="status">{PAUSED_TEXT}</p>}
      {board?.mine && <WhereEveryoneEnded mine={board.mine} friends={board.friends} />}
      {board?.reactionsOnMine && board.reactionsOnMine.counts.length > 0 && (
        <p>
          Reactions on your run: <Reactions reactions={board.reactionsOnMine} />
        </p>
      )}
      {/* L31: friendlier, and for any game (round 3's wording, provisional per L32). */}
      {board && board.friends.length === 0 && (
        <>
          <h3>Plor is better with friends</h3>
          <p>See how your friends did each day, talk about the puzzles, and compare scores every week, in whichever games you both play.</p>
        </>
      )}
      {board && board.friends.length > 0 && (
        <ul>
          {board.friends.map((f) => (
            <li key={f.username}>
              <Avatar name={f.name} /> {f.name}: {describe(f)}{" "}
              {f.reactions && <Reactions reactions={f.reactions} busy={busy} onReact={(emoji) => void react(f.username, emoji)} />}
            </li>
          ))}
        </ul>
      )}
      {!board && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {/* Adding a friend starts here, not only on the Me tab (docs/milestones/M12-12f-review-fixes.md, F1). */}
      <InviteLink canReset={false} />
    </section>
  );
}

function describe(f: BoardFriend): string {
  if (f.ended?.result === "caught") return `caught on question ${f.ended.question} by "${f.ended.answer}"`;
  if (f.ended?.result === "survived") return "survived every question";
  if (f.ended?.result === "timed_out") return `ran out of time on question ${f.ended.question}`;
  if (f.state === "playing") return `on question ${f.question}`;
  if (f.state === "started") return "started (you'll see how it's going once you finish)";
  return "hasn't played yet";
}

function placeLabel(place: Place): string {
  if (place.kind === "caught") return `Caught on question ${place.question}`;
  if (place.kind === "timed_out") return "Ran out of time";
  return "Survived";
}

// "Where everyone ended" (M07 7d): one row per place, the player first, up to FRIENDS_PER_PLACE friends by name, then
// a count. Each row opens to its full list: a native <details>, so it works by tap and keyboard with no state.
function WhereEveryoneEnded({ mine, friends }: { mine: Ended; friends: BoardFriend[] }) {
  return (
    <section aria-label="Where everyone ended">
      <h3>Where everyone ended</h3>
      <ul>
        {placeRows(mine, friends).map((row) => (
          <li key={placeLabel(row.place)}>
            <details>
              <summary>
                {placeLabel(row.place)}: {[...(row.you ? ["You"] : []), ...row.named.map((p) => p.name)].join(", ")}
                {row.more > 0 && ` + ${row.more} more`}
              </summary>
              <ul>
                {row.you && <li>You</li>}
                {row.everyone.map((p) => (
                  <li key={p.username}>{p.name}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
