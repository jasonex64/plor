"use client";

// Comments on a game's day (docs/milestones/M08-comments-and-reactions.md, 8a): the player's own and their friends',
// oldest first. Today's thread opens once the player's run is over; earlier days can be browsed one day at a time,
// read-only (D6), except one whose run the player is still finishing. Comments carry reactions (8b), which can be
// changed only where posting can. Other players' comments can be reported on any day shown, which hides them from the
// reporter (8c, D5). A group's page shows the group's threads instead, with the same rules (M10 10d, G4): both games'
// in one list, each comment tagged with its game, and the box picks the game among those the writer has finished
// (docs/milestones/M16-16f-the-shared-pieces.md, 16f-5; answer 50). Today's feed, with every game's comments and
// results in one list, is src/app/feed.tsx, which shows a comment as CommentContent does here.
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Comment, Thread } from "@/comments/comments";
import type { BoardGame } from "@/friends/leaderboard";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import { choose } from "@/reactions/choose";
import type { Emoji } from "@/reactions/reactions";
import type { Held } from "@/lib/hold";
import { Avatar } from "./avatar";
import kit from "./kit.module.css";
import styles from "./comments.module.css";
import { dayText, shiftDay } from "./day-text";
import { errorText } from "./messages";
import { ReactMenu, Reactions, reactionText } from "./reactions";
import { useHeldChanges, useUndo } from "./undo";
import { COMMENT_MAX_LENGTH } from "@/config/tunables";
import { gameName } from "./feed-logic";
import { Line, Skeleton } from "./skeleton";

// A comment with the game whose thread it is in, which a reaction on it names.
type Tagged = Comment & { game: BoardGame };

// The day's comments of every game shown, oldest first. canPost: the games the player may post to (the day is today and
// their run in that game is over); closed: the games whose thread is still hidden from them (comments is null when all are).
type Shown = { date: string; comments: Tagged[] | null; canPost: BoardGame[]; closed: BoardGame[] };

// A change shown before the server has it (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b): it lasts while the
// action is held for Undo and sent, then the thread loaded again shows it for real.
// date: the day of the thread it was made on, which it changes only (the player may move to an earlier day meanwhile).
type Change = { date: string } & ({ type: "post"; comment: Tagged } | { type: "delete"; id: string } | { type: "react"; id: string; emoji: Emoji | null });

// A posted comment's ID until it's sent, numbered so two held at once differ; shown without its buttons.
export const PENDING = "pending";

function changed(thread: Shown | null, change: Change): Shown | null {
  if (!thread?.comments || thread.date !== change.date) return thread;
  const comments = thread.comments;
  // A posted comment the loaded thread already has (another load landed before the post's own reload) isn't shown
  // twice (14b-8b: a race the e2e caught; ROADMAP's "a sent comment can flicker or show twice").
  if (change.type === "post" && comments.some((c) => c.username === change.comment.username && c.body === change.comment.body)) return thread;
  const next =
    change.type === "post"
      ? [...comments, change.comment]
      : change.type === "delete"
        ? comments.filter((c) => c.id !== change.id)
        : comments.map((c) => (c.id === change.id ? { ...c, reactions: choose(c.reactions, change.emoji) } : c));
  return { ...thread, comments: next };
}

// runOver: the player's run today is over, so today's thread can open (src/app/game.tsx reports it). nudge: a count
// that goes up when comments or reactions changed in this thread, from the player's own Realtime topic (8d;
// src/app/board-channel.ts), so the day shown is fetched again. group: the group whose thread this is; none is the
// friends thread. games: the games whose threads are shown, each with a thread of its own (M16 16f-3): one on a game's
// screen, both on a group's page. A constant, so the threads aren't loaded again at every render. title names the
// friends thread (its heading and region): the game screen's own (round 5: "Offbeat comments";
// docs/milestones/M14-14a-2c-review-fixes.md).
export function Comments({
  username,
  name,
  runOver,
  nudge,
  games,
  group,
  title = "Comments",
}: {
  username: string;
  // The player's name as their comments show it, for one posted before the server has it.
  name: string;
  runOver: boolean;
  nudge: number;
  games: readonly BoardGame[];
  group?: string;
  title?: string;
}) {
  // null shows today, whose date comes from the server (the day boundary is the server's: DECISIONS.md, Day boundary).
  const [date, setDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [thread, setThread] = useState<Shown | null>(null);
  const [shownThread, showChange] = useHeldChanges(thread, changed);
  const arrived = useArrived(shownThread?.comments ?? null, shownThread?.date);
  const [draft, setDraft] = useState("");
  // The game the box posts to, among those the player may post to (answer 50): the first until they pick another.
  const [picked, setPicked] = useState<BoardGame | null>(null);
  // Why Post did nothing, until the box changes (docs/milestones/M14-14b-20-comments-and-undo.md, answer 6).
  const [refused, setRefused] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const undo = useUndo();
  // Loads overlap (nudges, "Earlier day", the run ending): only the newest answer is shown (M11 H6).
  const [latest] = useState(latestOnly);

  const load = useCallback(() => {
    const shown = (t: Shown) => {
      setThread(t);
      if (date === null) setToday(t.date);
      setError(null);
    };
    const failed = (err: unknown) => setError(errorText(err));
    const read = async (): Promise<Shown> => {
      const threads = await Promise.all(
        games.map(async (game) => {
          const query = new URLSearchParams({ game });
          if (date) query.set("date", date);
          if (group) query.set("group", group);
          return { game, thread: (await api<{ thread: Thread }>(`/api/comments?${query}`, { method: "GET" })).thread };
        }),
      );
      // One request a game: a day boundary between them would put two days in one list.
      if (new Set(threads.map((t) => t.thread.date)).size > 1) throw new Error("The day changed while the comments loaded");
      const open = threads.filter((t) => t.thread.comments !== null);
      return {
        date: threads[0].thread.date,
        comments:
          open.length === 0
            ? null
            : open
                .flatMap((t) => t.thread.comments!.map((c) => ({ ...c, game: t.game })))
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
        canPost: threads.filter((t) => t.thread.canPost).map((t) => t.game),
        closed: threads.filter((t) => t.thread.comments === null).map((t) => t.game),
      };
    };
    return latest(read(), shown, failed);
  }, [date, games, group, latest]);
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

  const several = games.length > 1;
  // The game the box posts to now: the one picked if the player may still post to it, else the first they may.
  const postTo = thread && (picked && thread.canPost.includes(picked) ? picked : thread.canPost[0]);

  function post(event: FormEvent) {
    event.preventDefault();
    if (!thread || !postTo) return;
    const body = draft.trim();
    // Stopped here, as the database would refuse it once sent (comment_body_format), so nothing shows and then fails.
    const length = characters(body);
    if (length === 0 || length > COMMENT_MAX_LENGTH) {
      setRefused(length === 0 ? "Write something first" : `${COMMENT_MAX_LENGTH} characters at most`);
      return;
    }
    const day = thread.date;
    const game = postTo;
    setDraft("");
    const comment = { id: `${PENDING}-${posted.current++}`, game, username, name, body, createdAt: new Date().toISOString(), reactions: { counts: [], mine: null } };
    act(
      { date: day, type: "post", comment },
      {
        text: "Comment posted",
        failed: "Your comment wasn't posted",
        send: (keepalive) => api("/api/comments", { method: "POST", body: { game, date: day, body, group }, keepalive }),
      },
      // The text goes back in the box, unless the player has started another.
      () => setDraft((d) => (d === "" ? body : d)),
    );
  }

  function report(id: string) {
    setError(null);
    api("/api/comments/report", { method: "POST", body: { id } }).then(load, (err) => {
      // The comment stays, so focus has nowhere to move to.
      leaving.current = null;
      setError(errorText(err));
    });
  }

  // After Delete or Report, once the comment has left the list: focus on the next comment's ⋯, or the one before if it
  // was the last, or the feed's heading if none is left (docs/milestones/M14-14b-21-screen-readers.md, answer 4).
  const heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const leaving = useRef<{ id: string; day: string; next: string | null } | null>(null);
  useEffect(() => {
    const gone = leaving.current;
    if (!gone || !shownThread || shownThread.comments?.some((c) => c.id === gone.id)) return;
    leaving.current = null;
    // Another day shown first (Earlier day): the comment didn't leave, the list changed; focus stays where it is.
    if (shownThread.date !== gone.day) return;
    const next = gone.next && list.current?.querySelector<HTMLElement>(`li[data-comment="${gone.next}"] button[aria-expanded]`);
    (next || heading.current!).focus();
  }, [shownThread]);

  const shown = shownThread?.date ?? null;
  const isToday = shown !== null && shown === today;
  return (
    <section aria-label={group ? "Comments" : title} className={kit.card}>
      <h2 ref={heading} tabIndex={-1}>
        {group ? "Comments" : isToday || !shown ? title : "Friends' comments"}
        {shown && !isToday && ` on ${dayText(shown)}`}
      </h2>
      {shown && (
        <p>
          <button type="button" className={kit.link} onClick={() => setDate(shiftDay(shown, -1))}>
            Earlier day
          </button>{" "}
          {!isToday && today && (
            <button type="button" className={kit.link} onClick={() => setDate(shiftDay(shown, 1) === today ? null : shiftDay(shown, 1))}>
              Later day
            </button>
          )}
        </p>
      )}
      {shownThread && shownThread.comments === null && !several && (
        <p>
          Finish {isToday ? "today's" : "that day's"} puzzle to see {group ? "the group's" : "your friends'"} comments.
        </p>
      )}
      {shownThread && several && shownThread.closed.map((game) => (
        <p key={game}>
          Finish {isToday ? "today's" : "that day's"} {gameName(game)} to see the group&apos;s {gameName(game)} comments.
        </p>
      ))}
      {shownThread?.comments && shownThread.comments.length === 0 && <p>No comments{isToday ? " yet" : " that day"}.</p>}
      {shownThread?.comments && shownThread.comments.length > 0 && (
        <ul ref={list} className={kit.rows}>
          {shownThread.comments.map((c, i, all) => {
            const day = shownThread.date;
            const leave = () => (leaving.current = { id: c.id, day, next: (all[i + 1] ?? all[i - 1])?.id ?? null });
            const react = (emoji: Emoji | null) =>
              act(
                { date: day, type: "react", id: c.id, emoji },
                {
                  key: `comment ${c.id}`,
                  text: reactionText(c.reactions, emoji),
                  failed: "Your reaction wasn't saved",
                  send: (keepalive) =>
                    api("/api/reactions", { method: "POST", body: { game: c.game, date: day, target: { type: "comment", id: c.id }, emoji }, keepalive }),
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
              <li
                key={c.id}
                data-comment={c.id}
                className={arrived.has(c.id) ? `${kit.row} ${styles.comment} ${kit.pop}` : `${kit.row} ${styles.comment}`}
              >
                <CommentContent
                  comment={c}
                  label={several ? gameName(c.game) : undefined}
                  mine={c.username === username}
                  pending={c.id.startsWith(PENDING)}
                  onDelete={() => {
                    leave();
                    remove();
                  }}
                  onReport={() => {
                    leave();
                    report(c.id);
                  }}
                  onReact={shownThread.canPost.includes(c.game) ? react : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
      {shownThread && postTo && (
        <form onSubmit={post} className={styles.compose}>
          {shownThread.canPost.length > 1 && (
            <label>
              Game
              <select value={postTo} onChange={(e) => setPicked(e.target.value as BoardGame)}>
                {shownThread.canPost.map((game) => (
                  <option key={game} value={game}>
                    {gameName(game)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {/* The friends thread's box says so (M11 H2 (a); M12 12f, F5). */}
            {group ? "Comment" : "Comment to your friends"}
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setRefused(null);
              }}
            />
          </label>
          <Count text={draft} />
          {refused && <p role="alert">{refused}</p>}
          <button type="submit" className={`${kit.primary} ${kit.small}`}>
            Post
          </button>
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

// Characters as the database counts them (char_length): by code point, so an emoji is one (14b-6b dropped maxLength
// for counting it as two). Trimmed, as the comment is sent.
export const characters = (text: string) => Array.from(text.trim()).length;

// The count under the box, from 20 left (docs/milestones/M14-14b-20-comments-and-undo.md, answer 9); past the limit, how many too many, in
// the danger colour. A status, so screen readers hear it without leaving the box (WCAG 2.2, 4.1.3).
export function Count({ text }: { text: string }) {
  const left = COMMENT_MAX_LENGTH - characters(text);
  return (
    <p role="status" className={left < 0 ? `${styles.count} ${styles.over}` : styles.count}>
      {left <= 20 && (left >= 0 ? `${left} left` : `${-left} too many`)}
    </p>
  );
}

// The comments that have appeared since a day's thread was first shown: one that arrived, or the player's own as it's
// posted (14b-10b, answer 12). A posted comment shows at once under a pending id and comes back from the server under its
// own: beside the pending copy for a moment, or a load after it has gone (ROADMAP For M14, the flicker). That return is the
// same comment, so it doesn't pop again: each pending copy shown is remembered until a comment like it comes back.
export function useArrived(comments: Pick<Comment, "id" | "username" | "body">[] | null, day: string | undefined): Set<string> {
  // Kept from render to render, and updated while rendering when the comments change (React's "Storing information from
  // previous renders"): the ids seen, the pending copies not yet back, and the ones that pop. Compared by their ids, as the
  // list itself is a new array on every render.
  const [seen, setSeen] = useState<{ ids: string | null; day: string | undefined; known: Set<string>; posted: string[]; arrived: Set<string> }>(
    { ids: null, day, known: new Set(), posted: [], arrived: new Set() },
  );
  const ids = comments?.map((c) => c.id).join(" ") ?? null;
  if (ids === null || (ids === seen.ids && day === seen.day)) return seen.arrived;
  if (!comments) return seen.arrived;
  const key = (c: Pick<Comment, "username" | "body">) => `${c.username}
${c.body}`;
  const first = seen.ids === null || seen.day !== day;
  const known = new Set(first ? [] : seen.known);
  const posted = first ? [] : [...seen.posted];
  const arrived = new Set(first ? [] : seen.arrived);
  for (const c of comments) {
    if (known.has(c.id)) continue;
    known.add(c.id);
    const pending = c.id.startsWith(PENDING);
    if (pending) posted.push(key(c));
    if (first) continue;
    const back = pending ? -1 : posted.indexOf(key(c));
    if (back >= 0) posted.splice(back, 1);
    else arrived.add(c.id);
  }
  setSeen({ ids, day, known, posted, arrived });
  return arrived;
}

// What a comment's row holds (the thread's rows and the feed's items): the avatar, then the name with its label and time as
// a chip, the words, and the reactions used under them (mockup 3's comment row; M14 14b-8b); its ⋯ at the top right holds
// the reactions and Delete or Report (14b-13, answer 1). The row itself, its classes and element, is the caller's.
// ids: the elements a screen reader's name and description for the row are made from, when the caller has one (the feed's
// items, src/app/feed.tsx).
export function CommentContent({
  comment,
  label,
  mine,
  pending,
  ids,
  onDelete,
  onReport,
  onReact,
}: {
  comment: Comment;
  label?: ReactNode;
  mine: boolean;
  // Posted but held for Undo: nothing to react to, delete or report yet.
  pending: boolean;
  ids?: { name: string; time: string; body: string };
  onDelete: () => void;
  onReport: () => void;
  onReact?: (emoji: Emoji | null) => void;
}) {
  return (
    <>
      <Avatar name={comment.name} />
      <div className={kit.grow}>
        <div className={kit.head}>
          <strong id={ids?.name}>{comment.name}</strong>
          <span className={kit.chip}>
            {/* One flex item, so the chip's words wrap as text rather than as separate boxes. */}
            <span>
              {label && <>{label} · </>}
              <time id={ids?.time} dateTime={comment.createdAt} className={styles.nowrap}>
                {new Date(comment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </time>
            </span>
          </span>
        </div>
        <p id={ids?.body}>{comment.body}</p>
        <Reactions reactions={comment.reactions} below />
      </div>
      {!pending && (
        <ReactMenu
          label={`Actions for ${comment.name}'s comment`}
          reactions={comment.reactions}
          onReact={onReact}
          actions={[mine ? { name: "Delete", run: onDelete } : { name: "Report", run: onReport }]}
        />
      )}
    </>
  );
}
