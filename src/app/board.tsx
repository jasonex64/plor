"use client";

// The live board (docs/milestones/M07-friends-and-live-board.md, 7c): friends' runs today, updated over the player's
// own Realtime topic (src/app/board-channel.ts). Payloads say only playing or finished; how a friend's run ended comes
// from the HTTP board once the player's own run is over, so nothing reaches the page early. So do reactions on runs
// (M08 8b), which the player can add to friends' runs from then on. The same channel carries nudges that comments or
// reactions changed (8d), with no content: the page refetches over HTTP, which decides what the player may see.
import { useCallback, useEffect, useState } from "react";
import type { Board as BoardData, BoardFriend, Ended } from "@/friends/board";
import { placeRows, type Place } from "@/friends/ended";
import { api } from "@/lib/api-client";
import type { Emoji } from "@/reactions/reactions";
import { PAYLOAD_VERSION, changesThread, useBoardChannel, type ChangedMessage, type StatusMessage } from "./board-channel";
import { errorText } from "./messages";
import { Reactions } from "./reactions";

// onCommentsChanged: the friends thread should be fetched again. A group's thread has its own page (M10 10d).
export function Board({ username, onCommentsChanged }: { username: string; onCommentsChanged: () => void }) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback((reason?: "reconnect") => {
    api<{ board: BoardData }>(reason ? `/api/board?reason=${reason}` : "/api/board", { method: "GET" }).then(
      (r) => {
        setBoard(r.board);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(load, [load]);

  useBoardChannel({
    // Comments may have changed while the channel was down too.
    joined: (reason) => {
      onCommentsChanged();
      load(reason === "reconnect" ? "reconnect" : undefined);
    },
    status: onStatus,
    changed: onChanged,
    failed: (err) => setError(errorText(err)),
  });

  function onChanged(message: ChangedMessage) {
    if (changesThread(message)) onCommentsChanged();
    if (message.v !== PAYLOAD_VERSION) {
      console.error("board message with unknown version", message.v);
      load();
      return;
    }
    // Reactions on runs are shown only once the player's own run today is over (src/friends/board.ts).
    if (message.type === "run_reactions_changed" && board?.finished && message.puzzleDate === board.date) load();
  }

  function onStatus(message: StatusMessage) {
    if (message.v !== PAYLOAD_VERSION) {
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
    // A friend finished while the player has finished too: fetch how their run ended.
    if (message.state === "finished" && board.finished) {
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
      {board?.mine && <WhereEveryoneEnded mine={board.mine} friends={board.friends} />}
      {board?.reactionsOnMine && board.reactionsOnMine.counts.length > 0 && (
        <p>
          Reactions on your run: <Reactions reactions={board.reactionsOnMine} />
        </p>
      )}
      {board && board.friends.length === 0 && <p>Add friends to see their runs here.</p>}
      {board && board.friends.length > 0 && (
        <ul>
          {board.friends.map((f) => (
            <li key={f.username}>
              {f.name}: {describe(f)}{" "}
              {f.reactions && <Reactions reactions={f.reactions} busy={busy} onReact={(emoji) => void react(f.username, emoji)} />}
            </li>
          ))}
        </ul>
      )}
      {!board && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function describe(f: BoardFriend): string {
  if (f.ended?.result === "caught") return `caught on question ${f.ended.question} by "${f.ended.answer}"`;
  if (f.ended?.result === "survived") return "survived every question";
  if (f.ended?.result === "timed_out") return `ran out of time on question ${f.ended.question}`;
  if (f.state === "playing") return `on question ${f.question}`;
  if (f.state === "finished") return "finished (you'll see how once you finish)";
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
