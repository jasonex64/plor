"use client";

// The live board (docs/milestones/M07-friends-and-live-board.md, 7c): friends' runs today, updated over a Realtime
// channel on the player's own topic, `board:<user id>`. The browser's only Supabase connection is this Realtime one
// (M07 D5). Payloads say only playing or finished; how a friend's run ended comes from the HTTP board once the
// player's own run is over, so nothing reaches the page early.
import { RealtimeClient } from "@supabase/realtime-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Board as BoardData, BoardFriend, Ended } from "@/friends/board";
import { placeRows, type Place } from "@/friends/ended";
import { ApiError, api } from "@/lib/api-client";
import { messageFor } from "./messages";

type Session = { url: string; publishableKey: string; userId: string; accessToken: string; expiresAt: number };

// The payload version this page understands (M00 data design §2: an unknown v is logged and the board refetched).
const PAYLOAD_VERSION = 1;

type StatusMessage = { v: number; username: string; puzzleDate: string; state: "playing" | "finished"; question: number | null };

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

export function Board({ username }: { username: string }) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The channel's message handler lives as long as the channel, so it reads the latest board through a ref.
  const boardRef = useRef<BoardData | null>(null);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const load = useCallback((reason?: "reconnect") => {
    api<{ board: BoardData }>(reason ? `/api/board?reason=${reason}` : "/api/board", { method: "GET" }).then(
      (r) => {
        setBoard(r.board);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);

  useEffect(() => {
    load();
    let session: Session | null = null;
    let client: RealtimeClient | null = null;
    // realtime-js asks for the token on every heartbeat (RealtimeClient.ts: the 'sent' heartbeat calls setAuth). A
    // fresh one is fetched once the current one would expire before the next heartbeat; otherwise it is reused.
    async function token(): Promise<string> {
      if (!session || Date.now() >= session.expiresAt * 1000 - client!.heartbeatIntervalMs) {
        session = await api<Session>("/api/realtime/session", { method: "GET" });
      }
      return session.accessToken;
    }

    let cancelled = false;
    // The first SUBSCRIBED refetches the board, because anything sent between the first load and the join is
    // missed. After that, a subscribe callback reporting an error, a timeout or a close means messages may have
    // been missed while the channel was down, so the next SUBSCRIBED refetches too, logged as a reconnect
    // (delivery during a disconnect isn't documented; only Broadcast Replay is: Supabase Realtime /broadcast).
    let joined = false;
    let interrupted = false;

    (async () => {
      const first = await api<Session>("/api/realtime/session", { method: "GET" });
      if (cancelled) return;
      session = first;
      const endpoint = new URL("realtime/v1", first.url);
      endpoint.protocol = endpoint.protocol.replace("http", "ws");
      client = new RealtimeClient(endpoint.href, { params: { apikey: first.publishableKey }, accessToken: token });
      // The token must be in place before the join: otherwise the first join goes out without it and the own-board
      // policy refuses it as Unauthorized, until a rejoin (observed in the e2e test, 2026-10-22).
      await client.setAuth();
      if (cancelled) return;
      client
        .channel(`board:${first.userId}`, { config: { private: true } })
        .on("broadcast", { event: "friend_status" }, ({ payload }) => onStatus(payload as StatusMessage))
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            if (!joined) load();
            else if (interrupted) load("reconnect");
            joined = true;
            interrupted = false;
          } else if (!cancelled) {
            interrupted = true;
            console.error("board channel", status, err?.message);
          }
        });
    })().catch((err) => setError(errorText(err)));

    function onStatus(message: StatusMessage) {
      const current = boardRef.current;
      if (message.v !== PAYLOAD_VERSION) {
        console.error("board message with unknown version", message.v);
        load();
        return;
      }
      if (!current || message.puzzleDate !== current.date) return;
      // The player's own run ended: how friends' runs ended may now be shown.
      if (message.username === username) {
        if (message.state === "finished" && !current.finished) load();
        return;
      }
      // A friend finished while the player has finished too: fetch how their run ended.
      if (message.state === "finished" && current.finished) {
        load();
        return;
      }
      setBoard({
        ...current,
        friends: current.friends.map((f) =>
          f.username === message.username ? { ...f, state: message.state, question: message.question } : f,
        ),
      });
    }

    return () => {
      cancelled = true;
      if (client) {
        void client.removeAllChannels();
        client.disconnect();
      }
    };
  }, [load, username]);

  return (
    <section aria-label="Friends today">
      <h2>Friends today</h2>
      {board?.mine && <WhereEveryoneEnded mine={board.mine} friends={board.friends} />}
      {board && board.friends.length === 0 && <p>Add friends to see their runs here.</p>}
      {board && board.friends.length > 0 && (
        <ul>
          {board.friends.map((f) => (
            <li key={f.username}>
              {f.name}: {describe(f)}
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
