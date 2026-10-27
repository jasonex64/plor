"use client";

// The player's own Realtime topic, `board:<user id>` (docs/milestones/M07-friends-and-live-board.md, 7c): friends'
// run states (M07), and nudges that comments or reactions changed (M08 8d), for the friends thread or a group's
// (M10 10d, G5). The browser's only Supabase connection is this Realtime one (M07 D5), one per page, shared by every
// part that listens.
import { RealtimeClient } from "@supabase/realtime-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { errorText } from "./messages";

type Session = { url: string; publishableKey: string; userId: string; accessToken: string; expiresAt: number };

// The payload versions these pages understand (M00 data design §2: an unknown v is logged and the page refetches):
// PAYLOAD_VERSION for the comment and reaction nudges, STATUS_VERSION for friends' run states, 2 since M12 12d added
// started (supabase/migrations/20261024031116_board_hides_progress.sql).
export const PAYLOAD_VERSION = 1;
export const STATUS_VERSION = 2;

// started: a friend's run began, sent to a player who hasn't finished that day instead of playing or finished (12d).
export type StatusMessage = {
  v: number;
  username: string;
  puzzleDate: string;
  state: "started" | "playing" | "finished";
  question: number | null;
};

// A comment or reaction changed on that day: in the group with groupId, or in the friends thread when there is none
// (supabase/migrations/20261023060640_group_thread.sql).
export type ChangedMessage = { v: number; type: "comments_changed" | "run_reactions_changed"; puzzleDate: string; groupId?: string };

// Whether a nudge means this list should be fetched again: a group's thread (its ID) for that group's nudges, or the
// friends feed (Today's, or a page's right column) for the friends thread's and every group's
// (docs/milestones/M11-home-screen.md, 11b). An unknown payload version reloads both (M00 data design §2).
export function changesThread(message: ChangedMessage, thread: "feed" | { group: string }): boolean {
  if (message.v !== PAYLOAD_VERSION) return true;
  return message.type === "comments_changed" && (thread === "feed" || message.groupId === thread.group);
}

// joined: the channel joined, the first time or after an interruption, when messages may have been missed, so the
// page refetches. The handlers may change between renders; the channel stays open for the component's life.
export type BoardChannelHandlers = {
  joined: (reason: "first" | "reconnect") => void;
  status?: (message: StatusMessage) => void;
  changed: (message: ChangedMessage) => void;
};

// What a listening page shows of the channel (LiveStatus, src/app/live-status.tsx). error: the channel couldn't be
// opened (closed), or a fresh token couldn't be fetched while it runs. retry: opens it again after it couldn't be
// opened, by the player's Try again (docs/milestones/M14-14b-2c-review-items.md, answer 14).
export type Failure = { error: string; closed: boolean };
export type BoardChannel = { paused: boolean; failure: Failure | null; retry: () => void };

// One connection to the channel per page, shared by every component that listens (the board, the feeds): the first
// listener opens it and the last one closes it, so a page holds one socket however many parts listen
// (docs/milestones/M14-14b-2b-1-shell.md; ROADMAP's "two sockets" item, M14 14a-2a). channel: the connection the
// listener is on now, which Try again moves it off.
type Listener = {
  handlers: { current: BoardChannelHandlers };
  setPaused: (paused: boolean) => void;
  setFailure: (failure: Failure | null) => void;
  channel: Shared;
};
type Shared = { listeners: Set<Listener>; joined: boolean; paused: boolean; failure: Failure | null; close: () => void };
let shared: Shared | null = null;

function openShared(): Shared {
  const state: Shared = { listeners: new Set(), joined: false, paused: false, failure: null, close: () => {} };
  const each = (f: (l: Listener) => void) => state.listeners.forEach(f);
  const setFailure = (failure: Failure | null) => {
    state.failure = failure;
    each((l) => l.setFailure(failure));
  };
  const failed = (err: unknown, closed: boolean) => setFailure({ error: errorText(err), closed });
  let session: Session | null = null;
  let client: RealtimeClient | null = null;
  // realtime-js asks for the token on every heartbeat (RealtimeClient.ts: the 'sent' heartbeat calls setAuth). A
  // fresh one is fetched once the current one would expire before the next heartbeat; otherwise it is reused.
  // A failed fetch is shown (H6, "fail loudly"). realtime-js catches the rethrow and goes on with the old token
  // (RealtimeClient._performAuth), so the channel runs until the server refuses that token, and then shows paused.
  async function token(): Promise<string> {
    if (!session || Date.now() >= session.expiresAt * 1000 - client!.heartbeatIntervalMs) {
      try {
        session = await api<Session>("/api/realtime/session", { method: "GET" });
      } catch (err) {
        failed(err, false);
        throw err;
      }
    }
    return session.accessToken;
  }

  let cancelled = false;
  // The first SUBSCRIBED refetches, because anything sent between the page's first load and the join is missed.
  // After that, a subscribe callback reporting an error, a timeout or a close means messages may have been missed
  // while the channel was down, so the next SUBSCRIBED refetches too, as a reconnect (delivery during a disconnect
  // isn't documented; only Broadcast Replay is: Supabase Realtime /broadcast).
  let interrupted = false;
  const setPaused = (paused: boolean) => {
    state.paused = paused;
    each((l) => l.setPaused(paused));
  };

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
      .on("broadcast", { event: "friend_status" }, ({ payload }) => each((l) => l.handlers.current.status?.(payload as StatusMessage)))
      .on("broadcast", { event: "comments_changed" }, ({ payload }) => each((l) => l.handlers.current.changed(payload as ChangedMessage)))
      .on("broadcast", { event: "run_reactions_changed" }, ({ payload }) => each((l) => l.handlers.current.changed(payload as ChangedMessage)))
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          if (!state.joined) each((l) => l.handlers.current.joined("first"));
          else if (interrupted) each((l) => l.handlers.current.joined("reconnect"));
          state.joined = true;
          interrupted = false;
          setPaused(false);
          // Joined with a token in hand: an earlier token error is over.
          setFailure(null);
        } else if (!cancelled) {
          interrupted = true;
          setPaused(true);
          console.error("board channel", status, err?.message);
        }
      });
  })().catch((err) => {
    // Opening failed: these listeners show it with Try again, and the connection is dropped so the next part to
    // listen opens a fresh one, rather than joining one that never came up (14b-2b-1 review).
    failed(err, true);
    if (shared === state) shared = null;
  });

  state.close = () => {
    cancelled = true;
    if (client) {
      void client.removeAllChannels();
      client.disconnect();
    }
  };
  return state;
}

// Moves every listener on a connection that couldn't be opened to a fresh one, which tells each "first" once it joins,
// so each part refetches what it missed.
function reopen(dead: Shared) {
  if (!dead.failure?.closed) return;
  const fresh = (shared ??= openShared());
  for (const listener of dead.listeners) {
    listener.channel = fresh;
    fresh.listeners.add(listener);
    listener.setPaused(fresh.paused);
    listener.setFailure(fresh.failure);
    // A part that listened after the failure may have opened and joined it already.
    if (fresh.joined) listener.handlers.current.joined("first");
  }
  dead.listeners.clear();
}

// paused: the channel is down (it dropped, or its join failed) and realtime-js is retrying, so the page shows that
// live updates are paused until it's joined (docs/milestones/M11-home-screen.md, H6: "fail loudly"). A listener that
// arrives after the join is told "first" at once, as its own data was loaded before it listened.
export function useBoardChannel(handlers: BoardChannelHandlers): BoardChannel {
  const ref = useRef(handlers);
  const [paused, setPaused] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const listening = useRef<Listener | null>(null);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    shared ??= openShared();
    const listener: Listener = { handlers: ref, setPaused, setFailure, channel: shared };
    listening.current = listener;
    shared.listeners.add(listener);
    // Read once the listener is in place, so a change between this part's render and now isn't missed (14b-2b-1
    // review): a page already listening may be paused, or its token may have failed.
    listener.setPaused(shared.paused);
    listener.setFailure(shared.failure);
    if (shared.joined) ref.current.joined("first");
    return () => {
      // The connection it's on now: Try again may have moved it.
      const channel = listener.channel;
      channel.listeners.delete(listener);
      if (channel.listeners.size === 0) {
        channel.close();
        if (shared === channel) shared = null;
      }
    };
  }, []);
  const retry = useCallback(() => {
    if (listening.current) reopen(listening.current.channel);
  }, []);
  return { paused, failure, retry };
}
