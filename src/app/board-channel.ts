"use client";

// The player's own Realtime topic, `board:<user id>` (docs/milestones/M07-friends-and-live-board.md, 7c): friends'
// run states (M07), and nudges that comments or reactions changed (M08 8d), for the friends thread or a group's
// (M10 10d, G5). The browser's only Supabase connection is this Realtime one (M07 D5). Shared by the home page's board
// and a group's page, so each opens the channel the same way.
import { RealtimeClient } from "@supabase/realtime-js";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api-client";

type Session = { url: string; publishableKey: string; userId: string; accessToken: string; expiresAt: number };

// The payload version these pages understand (M00 data design §2: an unknown v is logged and the page refetches).
export const PAYLOAD_VERSION = 1;

export type StatusMessage = { v: number; username: string; puzzleDate: string; state: "playing" | "finished"; question: number | null };

// A comment or reaction changed on that day: in the group with groupId, or in the friends thread when there is none
// (supabase/migrations/20261023060640_group_thread.sql).
export type ChangedMessage = { v: number; type: "comments_changed" | "run_reactions_changed"; puzzleDate: string; groupId?: string };

// Whether a nudge means this thread should be fetched again: a group's (its ID), or the friends thread (none). An
// unknown payload version reloads every thread (M00 data design §2).
export function changesThread(message: ChangedMessage, group?: string): boolean {
  return message.v !== PAYLOAD_VERSION || (message.type === "comments_changed" && message.groupId === group);
}

// joined: the channel joined, the first time or after an interruption, when messages may have been missed, so the
// page refetches. The handlers may change between renders; the channel stays open for the component's life.
export type BoardChannelHandlers = {
  joined: (reason: "first" | "reconnect") => void;
  status?: (message: StatusMessage) => void;
  changed: (message: ChangedMessage) => void;
  failed: (err: unknown) => void;
};

export function useBoardChannel(handlers: BoardChannelHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
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
    // The first SUBSCRIBED refetches, because anything sent between the page's first load and the join is missed.
    // After that, a subscribe callback reporting an error, a timeout or a close means messages may have been missed
    // while the channel was down, so the next SUBSCRIBED refetches too, as a reconnect (delivery during a disconnect
    // isn't documented; only Broadcast Replay is: Supabase Realtime /broadcast).
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
        .on("broadcast", { event: "friend_status" }, ({ payload }) => ref.current.status?.(payload as StatusMessage))
        .on("broadcast", { event: "comments_changed" }, ({ payload }) => ref.current.changed(payload as ChangedMessage))
        .on("broadcast", { event: "run_reactions_changed" }, ({ payload }) => ref.current.changed(payload as ChangedMessage))
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            if (!joined) ref.current.joined("first");
            else if (interrupted) ref.current.joined("reconnect");
            joined = true;
            interrupted = false;
          } else if (!cancelled) {
            interrupted = true;
            console.error("board channel", status, err?.message);
          }
        });
    })().catch((err) => ref.current.failed(err));

    return () => {
      cancelled = true;
      if (client) {
        void client.removeAllChannels();
        client.disconnect();
      }
    };
  }, []);
}
