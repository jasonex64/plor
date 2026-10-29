"use client";

// Comments on the day's game (docs/milestones/M08-comments-and-reactions.md, 8a): the player's own and their friends',
// oldest first. Today's thread opens once the player's run is over; earlier days can be browsed one day at a time,
// read-only (D6), except one whose run the player is still finishing. Comments carry reactions (8b), which can be
// changed only where posting can. Other players' comments can be reported on any day shown, which hides them from the
// reporter (8c, D5). A group's page shows the group's thread instead, with the same rules (M10 10d, G4). On Today, and
// in other pages' right column, today is the feed: the friends thread's and the player's groups' comments in one list,
// each labelled, with only who commented and how many reactions until the run is over
// (docs/milestones/M11-home-screen.md, 11b; H2, H3); earlier days are the friends thread.
import { ButtonLink } from "./button-link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Comment, Thread } from "@/comments/comments";
import type { Feed, FeedComment, FeedPreview } from "@/comments/feed";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import { previewText } from "@/comments/preview";
import { choose } from "@/reactions/choose";
import type { Emoji } from "@/reactions/reactions";
import type { Held } from "@/lib/hold";
import { Avatar } from "./avatar";
import styles from "./comments.module.css";
import { errorText } from "./messages";
import { Reactions, reactionText } from "./reactions";
import { useHeldChanges, useUndo } from "./undo";
import { GAME } from "@/platform/game";
import { Line, Skeleton } from "./skeleton";

// The calendar day before or after a YYYY-MM-DD date.
function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// A change shown before the server has it (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b): it lasts while the
// action is held for Undo and sent, then the thread loaded again shows it for real.
// date: the day of the thread it was made on, which it changes only (the player may move to an earlier day meanwhile).
type Change = { date: string } & ({ type: "post"; comment: Comment } | { type: "delete"; id: string } | { type: "react"; id: string; emoji: Emoji | null });

// A posted comment's ID until it's sent, numbered so two held at once differ; shown without its buttons.
const PENDING = "pending";

function changed(thread: Thread | Feed | null, change: Change): Thread | Feed | null {
  if (!thread?.comments || thread.date !== change.date) return thread;
  const comments: Comment[] = thread.comments;
  const next =
    change.type === "post"
      ? [...comments, change.comment]
      : change.type === "delete"
        ? comments.filter((c) => c.id !== change.id)
        : comments.map((c) => (c.id === change.id ? { ...c, reactions: choose(c.reactions, change.emoji) } : c));
  // A feed's comments keep their thread labels: only the list changes.
  return { ...thread, comments: next } as Thread | Feed;
}

// runOver: the player's run today is over, so today's thread can open (src/app/game.tsx reports it). nudge: a count
// that goes up when comments or reactions changed in this thread, from the player's own Realtime topic (8d;
// src/app/board-channel.ts), so the day shown is fetched again. group: the group whose thread this is; none is the
// friends feed. title names today's feed (its heading and region): "Feed" on Today, the game screen's own on
// Offbeat's (round 5: "Offbeat comments"; docs/milestones/M14-14a-2c-review-fixes.md).
export function Comments({
  username,
  name,
  runOver,
  nudge,
  group,
  title = "Feed",
}: {
  username: string;
  // The player's name as their comments show it, for one posted before the server has it.
  name: string;
  runOver: boolean;
  nudge: number;
  group?: string;
  title?: string;
}) {
  // null shows today, whose date comes from the server (the day boundary is the server's: DECISIONS.md, Day boundary).
  const [date, setDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | Feed | null>(null);
  const [shownThread, showChange] = useHeldChanges(thread, changed);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const undo = useUndo();
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
      return latest(api<{ feed: Feed }>("/api/feed", { method: "GET" }), (r) => shown(r.feed), failed);
    }
    const query = new URLSearchParams();
    if (date) query.set("date", date);
    if (group) query.set("group", group);
    return latest(api<{ thread: Thread }>(`/api/comments?${query}`, { method: "GET" }), (r) => shown(r.thread), failed);
  }, [date, group, latest]);
  // runOver and nudge are dependencies so the thread loads again when the run ends, and when a comment or reaction
  // changed. A nudge names its day, but any nudge reloads the day shown: one request, and nudges are rare.
  useEffect(() => void load(), [load, runOver, nudge]);

  // The load for the day shown now, which may not be the one an action was made on (Earlier day during its window).
  const loadShown = useRef(load);
  useEffect(() => {
    loadShown.current = load;
  }, [load]);
  const posted = useRef(0);

  // Shows the change at once and holds the action for Undo; once it's sent, the thread is loaded again before the
  // change is let go. Undone, replaced or failed, the change just goes (the toast says why).
  function act(change: Change, action: Held, onNotSent?: () => void) {
    showChange(change, undo.hold(action).then((sent) => (sent ? loadShown.current() : onNotSent?.())));
  }

  function post(event: FormEvent) {
    event.preventDefault();
    if (!thread) return;
    const body = draft.trim();
    const day = thread.date;
    setDraft("");
    const comment = { id: `${PENDING}-${posted.current++}`, username, name, body, createdAt: new Date().toISOString(), reactions: { counts: [], mine: null } };
    act(
      { date: day, type: "post", comment },
      {
        text: "Comment posted",
        failed: "Your comment wasn't posted",
        send: (keepalive) => api("/api/comments", { method: "POST", body: { date: day, body, group }, keepalive }),
      },
      // The text goes back in the box, unless the player has started another.
      () => setDraft((d) => (d === "" ? body : d)),
    );
  }

  function report(id: string) {
    setError(null);
    api("/api/comments/report", { method: "POST", body: { id } }).then(load, (err) => setError(errorText(err)));
  }

  const shown = shownThread?.date ?? null;
  const isToday = shown !== null && shown === today;
  const preview = shownThread && "preview" in shownThread ? shownThread.preview : null;
  return (
    <section aria-label={group ? "Comments" : title}>
      <h2>
        {group ? "Comments" : isToday || !shown ? title : "Friends' comments"}
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
      {shownThread && shownThread.comments === null && !preview && (
        <p>
          Finish {isToday ? "today's" : "that day's"} puzzle to see {group ? "the group's" : "your friends'"} comments.
        </p>
      )}
      {shownThread?.comments && shownThread.comments.length === 0 && <p>No comments{isToday ? " yet" : " that day"}.</p>}
      {shownThread?.comments && shownThread.comments.length > 0 && (
        <ul>
          {shownThread.comments.map((c) => {
            const day = shownThread.date;
            const react = (emoji: Emoji | null) =>
              act(
                { date: day, type: "react", id: c.id, emoji },
                {
                  key: `comment ${c.id}`,
                  text: reactionText(c.reactions, emoji),
                  failed: "Your reaction wasn't saved",
                  send: (keepalive) =>
                    api("/api/reactions", { method: "POST", body: { date: day, target: { type: "comment", id: c.id }, emoji }, keepalive }),
                },
              );
            const remove = () =>
              act(
                { date: day, type: "delete", id: c.id },
                {
                  text: "Comment deleted",
                  failed: "Your comment wasn't deleted",
                  send: (keepalive) => api("/api/comments/delete", { method: "POST", body: { id: c.id }, keepalive }),
                },
              );
            return (
              <CommentItem
                key={c.id}
                comment={c}
                label={"group" in c ? <ThreadLabel comment={c as FeedComment} /> : undefined}
                mine={c.username === username}
                pending={c.id.startsWith(PENDING)}
                onDelete={remove}
                onReport={() => report(c.id)}
                onReact={shownThread.canPost ? react : undefined}
              />
            );
          })}
        </ul>
      )}
      {shownThread?.canPost && (
        <form onSubmit={post}>
          <label>
            {/* The feed's box posts to the friends thread only (M11 H2 (a)), so it says so (M12 12f, F5). */}
            {group ? "Comment" : "Comment to your friends"}
            <textarea value={draft} required onChange={(e) => setDraft(e.target.value)} />
          </label>
          <button type="submit">Post</button>
        </form>
      )}
      {!shownThread && !error && (
        <Skeleton label="Loading comments">
          <Line />
        </Skeleton>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

// Before the player has played (docs/milestones/M14-14a-2a-today.md, L40): the names, blurred filler that holds none
// of their words (the server sends none, H3), and a link to the game screen; src/comments/preview.ts says what.
const FILLER = ["xxxx xx xxxx xxx xx", "xxxxxxx xxxx xx", "xxx xxxxx xxxx xxx"];

function Preview({ preview }: { preview: FeedPreview }) {
  const text = previewText(preview);
  if (text.read === null) {
    return (
      <>
        <p>No comments yet.</p>
        <p>Finish today&apos;s game to join in.</p>
      </>
    );
  }
  return (
    <>
      <p>
        <ButtonLink href={GAME.path}>{text.read}</ButtonLink>
      </p>
      <ul className={styles.locked}>
        {/* By position: two friends can share a display name. */}
        {text.named.map((name, i) => (
          <li key={i}>
            <Avatar name={name} /> <strong>{name}</strong> <span className={styles.filler} aria-hidden="true">{FILLER[i]}</span>
            <span className="sr-only">comment hidden until you play</span>
          </li>
        ))}
      </ul>
      {text.more && <p>{text.more}</p>}
      <p>{preview.reactions === 1 ? "1 reaction" : `${preview.reactions} reactions`}</p>
    </>
  );
}

// Which thread a feed comment is in: the friends thread, or a group's, by name; the group is on the Groups tab (no text
// links: docs/milestones/M14-14b-2b-1-shell.md, criterion 4).
function ThreadLabel({ comment }: { comment: FeedComment }) {
  return <>{comment.group ? comment.group.name : "Friends"}</>;
}

function CommentItem({
  comment,
  label,
  mine,
  pending,
  onDelete,
  onReport,
  onReact,
}: {
  comment: Comment;
  label?: ReactNode;
  mine: boolean;
  // Posted but held for Undo: nothing to react to, delete or report yet.
  pending: boolean;
  onDelete: () => void;
  onReport: () => void;
  onReact?: (emoji: Emoji | null) => void;
}) {
  return (
    <li>
      <Avatar name={comment.name} /> <strong>{comment.name}</strong> {label && <>· {label} </>}<time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
      <p>{comment.body}</p>
      {!pending && (
        <>
          <Reactions reactions={comment.reactions} onReact={onReact} />{" "}
          {mine ? (
            <button type="button" onClick={onDelete}>
              Delete
            </button>
          ) : (
            <button type="button" onClick={onReport}>
              Report
            </button>
          )}
        </>
      )}
    </li>
  );
}
