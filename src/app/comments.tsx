"use client";

// Comments on the day's game (docs/milestones/M08-comments-and-reactions.md, 8a): the player's own and their
// friends', oldest first. Today's thread opens once the player's run is over; earlier days can be browsed one day at
// a time, read-only (D6), except one whose run the player is still finishing. Plain UI; the look is M14.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Comment, Thread } from "@/comments/comments";
import { ApiError, api } from "@/lib/api-client";
import { messageFor } from "./messages";

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

// The calendar day before or after a YYYY-MM-DD date.
function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// runOver: the player's run today is over, so today's thread can open (src/app/game.tsx reports it).
export function Comments({ username, runOver }: { username: string; runOver: boolean }) {
  // null shows today, whose date comes from the server (the day boundary is the server's: DECISIONS.md, Day boundary).
  const [date, setDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ thread: Thread }>(date ? `/api/comments?date=${date}` : "/api/comments", { method: "GET" }).then(
      (r) => {
        setThread(r.thread);
        if (date === null) setToday(r.thread.date);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, [date]);
  // runOver is a dependency so today's thread loads again when the run ends.
  useEffect(load, [load, runOver]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function post(event: FormEvent) {
    event.preventDefault();
    if (!thread) return;
    void run(async () => {
      await api("/api/comments", { method: "POST", body: { date: thread.date, body: draft } });
      setDraft("");
    });
  }

  const shown = thread?.date ?? null;
  const isToday = shown !== null && shown === today;
  return (
    <section aria-label="Comments">
      <h2>Comments{shown && !isToday && ` on ${shown}`}</h2>
      {shown && (
        <p>
          <button type="button" onClick={() => setDate(shiftDay(shown, -1))}>
            Earlier day
          </button>{" "}
          {!isToday && today && (
            <button type="button" onClick={() => setDate(shiftDay(shown, 1) === today ? null : shiftDay(shown, 1))}>
              Later day
            </button>
          )}
        </p>
      )}
      {thread && thread.comments === null && (
        <p>Finish {isToday ? "today's" : "that day's"} puzzle to see your friends&apos; comments.</p>
      )}
      {thread?.comments && thread.comments.length === 0 && <p>No comments{isToday ? " yet" : " that day"}.</p>}
      {thread?.comments && thread.comments.length > 0 && (
        <ul>
          {thread.comments.map((c) => (
            <CommentItem key={c.id} comment={c} mine={c.username === username} busy={busy} onDelete={() => run(() => api("/api/comments/delete", { method: "POST", body: { id: c.id } }))} />
          ))}
        </ul>
      )}
      {thread?.canPost && (
        <form onSubmit={post}>
          <label>
            Comment
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <button type="submit" disabled={busy}>
            Post
          </button>
        </form>
      )}
      {!thread && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function CommentItem({ comment, mine, busy, onDelete }: { comment: Comment; mine: boolean; busy: boolean; onDelete: () => void }) {
  return (
    <li>
      <strong>{comment.name}</strong> <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
      <p>{comment.body}</p>
      {mine && (
        <button type="button" disabled={busy} onClick={onDelete}>
          Delete
        </button>
      )}
    </li>
  );
}
