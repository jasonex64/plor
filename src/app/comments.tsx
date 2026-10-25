"use client";

// Comments on the day's game (docs/milestones/M08-comments-and-reactions.md, 8a): the player's own and their
// friends', oldest first. Today's thread opens once the player's run is over; earlier days can be browsed one day at
// a time, read-only (D6), except one whose run the player is still finishing. Comments carry reactions (8b), which can
// be changed only where posting can. Other players' comments can be reported on any day shown, which hides them
// from the reporter (8c, D5). A group's page shows the group's thread instead, with the same rules (M10 10d, G4). On
// the home page, today is the feed: the friends thread's and the player's groups' comments in one list, each labelled,
// with only who commented and how many reactions until the run is over (docs/milestones/M11-home-screen.md, 11b; H2,
// H3); earlier days are the friends thread. Plain UI; the look is M14.
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Comment, Thread } from "@/comments/comments";
import type { Feed, FeedComment, FeedPreview } from "@/comments/feed";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import { previewText } from "@/comments/preview";
import type { Emoji } from "@/reactions/reactions";
import styles from "./comments.module.css";
import { errorText } from "./messages";
import { Reactions } from "./reactions";

// The calendar day before or after a YYYY-MM-DD date.
function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// runOver: the player's run today is over, so today's thread can open (src/app/game.tsx reports it). nudge: a count
// that goes up when comments or reactions changed in this thread, from the player's own Realtime topic (8d;
// src/app/board-channel.ts), so the day shown is fetched again. group: the group whose thread this is; none is the
// home page's feed.
export function Comments({ username, runOver, nudge, group }: { username: string; runOver: boolean; nudge: number; group?: string }) {
  // null shows today, whose date comes from the server (the day boundary is the server's: DECISIONS.md, Day boundary).
  const [date, setDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | Feed | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Loads overlap (nudges, "Earlier day", the run ending): only the newest answer is shown (M11 H6).
  const [latest] = useState(latestOnly);

  const load = useCallback(() => {
    const shown = (t: Thread | Feed) => {
      setThread(t);
      if (date === null) setToday(t.date);
      setError(null);
    };
    const failed = (err: unknown) => setError(errorText(err));
    if (!group && date === null) {
      latest(api<{ feed: Feed }>("/api/feed", { method: "GET" }), (r) => shown(r.feed), failed);
      return;
    }
    const query = new URLSearchParams();
    if (date) query.set("date", date);
    if (group) query.set("group", group);
    latest(api<{ thread: Thread }>(`/api/comments?${query}`, { method: "GET" }), (r) => shown(r.thread), failed);
  }, [date, group, latest]);
  // runOver and nudge are dependencies so the thread loads again when the run ends, and when a comment or reaction
  // changed. A nudge names its day, but any nudge reloads the day shown: one request, and nudges are rare.
  useEffect(load, [load, runOver, nudge]);

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
      await api("/api/comments", { method: "POST", body: { date: thread.date, body: draft, group } });
      setDraft("");
    });
  }

  const shown = thread?.date ?? null;
  const isToday = shown !== null && shown === today;
  const preview = thread && "preview" in thread ? thread.preview : null;
  return (
    <section aria-label={group ? "Comments" : "Feed"}>
      <h2>
        {group ? "Comments" : isToday || !shown ? "Feed" : "Friends' comments"}
        {shown && !isToday && ` on ${shown}`}
      </h2>
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
      {preview && <Preview preview={preview} />}
      {thread && thread.comments === null && !preview && (
        <p>
          Finish {isToday ? "today's" : "that day's"} puzzle to see {group ? "the group's" : "your friends'"} comments.
        </p>
      )}
      {thread?.comments && thread.comments.length === 0 && <p>No comments{isToday ? " yet" : " that day"}.</p>}
      {thread?.comments && thread.comments.length > 0 && (
        <ul>
          {thread.comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              label={"group" in c ? <ThreadLabel comment={c as FeedComment} /> : undefined}
              mine={c.username === username}
              busy={busy}
              onDelete={() => run(() => api("/api/comments/delete", { method: "POST", body: { id: c.id } }))}
              onReport={() => run(() => api("/api/comments/report", { method: "POST", body: { id: c.id } }))}
              onReact={
                thread.canPost
                  ? (emoji) => run(() => api("/api/reactions", { method: "POST", body: { date: thread.date, target: { type: "comment", id: c.id }, emoji } }))
                  : undefined
              }
            />
          ))}
        </ul>
      )}
      {thread?.canPost && (
        <form onSubmit={post}>
          <label>
            {/* The feed's box posts to the friends thread only (M11 H2 (a)), so it says so (M12 12f, F5). */}
            {group ? "Comment" : "Comment to your friends"}
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

// Before the player has played (docs/milestones/M14-14a-2a-today.md, L40): the names, blurred filler that holds none
// of their words (the server sends none, H3), and a link to Play; src/comments/preview.ts says what.
const FILLER = ["xxxx xx xxxx xxx xx", "xxxxxxx xxxx xx", "xxx xxxxx xxxx xxx"];

function Preview({ preview }: { preview: FeedPreview }) {
  const text = previewText(preview);
  if (text.read === null) {
    return (
      <>
        <p>No comments yet.</p>
        <p>Finish today&apos;s Offbeat to join in.</p>
      </>
    );
  }
  return (
    <>
      <p>
        <a href="#offbeat">{text.read}</a>
      </p>
      <ul className={styles.locked}>
        {/* By position: two friends can share a display name. */}
        {text.named.map((name, i) => (
          <li key={i}>
            <strong>{name}</strong> <span className={styles.filler} aria-hidden="true">{FILLER[i]}</span>
            <span className={styles.hidden}>comment hidden until you play</span>
          </li>
        ))}
      </ul>
      {text.more && <p>{text.more}</p>}
      <p>{preview.reactions === 1 ? "1 reaction" : `${preview.reactions} reactions`}</p>
    </>
  );
}

// Which thread a feed comment is in: the friends thread, or a group's, linking to its page.
function ThreadLabel({ comment }: { comment: FeedComment }) {
  return comment.group ? <Link href={`/groups/${comment.group.id}`}>{comment.group.name}</Link> : <>Friends</>;
}

function CommentItem({
  comment,
  label,
  mine,
  busy,
  onDelete,
  onReport,
  onReact,
}: {
  comment: Comment;
  label?: ReactNode;
  mine: boolean;
  busy: boolean;
  onDelete: () => void;
  onReport: () => void;
  onReact?: (emoji: Emoji | null) => void;
}) {
  return (
    <li>
      <strong>{comment.name}</strong> {label && <>· {label} </>}<time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
      <p>{comment.body}</p>
      <Reactions reactions={comment.reactions} busy={busy} onReact={onReact} />{" "}
      {mine ? (
        <button type="button" disabled={busy} onClick={onDelete}>
          Delete
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={onReport}>
          Report
        </button>
      )}
    </li>
  );
}
