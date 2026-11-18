"use client";

// The feed (docs/milestones/M16-16f-the-shared-pieces.md, 16f-5; the human's answers 9, 12, 14, 23, 26, 27, 29, 46 to 54):
// comments and finished runs of both games in one list, newest first, 20 at a time from /api/feed/items. On Today under
// the game cards, and in other pages' right column. The next 20 load by themselves when the last loaded item comes on
// screen (answer 47), and the list follows the WAI-ARIA APG Feed pattern (docs/SOURCES.md; answer 46): the list is a feed
// holding articles, each focusable and named, Page Down and Page Up move between them, Control+End and Control+Home leave
// the list. Loading never moves focus. A friend's result of a game the player hasn't finished today comes blurred: their
// name, the game and the time, and "Play to see", which opens the game (answers 14, 26, 48, 51); it clears once the player
// finishes that game, because the feed is read again from the top when their run ends and on the new day. An earlier day
// begins with a date line inside its first article (answer 49). Reactions: today's items only (answer 54).
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { FeedCommentItem, FeedPage, FeedResultItem } from "@/comments/feed-page";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import { choose } from "@/reactions/choose";
import { gameColour } from "./game-colour";
import type { Emoji } from "@/reactions/reactions";
import type { Held } from "@/lib/hold";
import { GAME, GAME_ID, SUBSTRINGS } from "@/platform/game";
import { COMMENT_MAX_LENGTH } from "@/config/tunables";
import { Avatar } from "./avatar";
import { ButtonLink } from "./button-link";
import { Count, CommentContent, PENDING, characters, useArrived } from "./comments";
import commentStyles from "./comments.module.css";
import { endedText } from "./ended-text";
import { dateLine, gameName, instant, itemKey, mergeFirstPage, neighbourComment, postableGames } from "./feed-logic";
import styles from "./feed.module.css";
import kit from "./kit.module.css";
import { errorText } from "./messages";
import { ReactMenu, Reactions, reactionText } from "./reactions";
import { Line, Skeleton } from "./skeleton";
import { FORWARD } from "./slide";
import { useHeldChanges, useUndo } from "./undo";
import { pointsText } from "./game";

type Change =
  | { type: "post"; item: FeedCommentItem }
  | { type: "delete"; id: string }
  | { type: "react"; key: string; emoji: Emoji | null };

// What a change does to the feed as loaded: shown while its action is held, and kept once it is sent (a deeper page isn't
// read again, so nothing else would show it).
function changed(feed: FeedPage | null, change: Change): FeedPage | null {
  if (!feed) return feed;
  if (change.type === "post") {
    // A posted comment the loaded feed already has (a load landed before the post's own) isn't shown twice (14b-8b).
    const have = feed.items.some((i) => i.kind === "comment" && i.mine && i.body === change.item.body);
    return have ? feed : { ...feed, items: [change.item, ...feed.items] };
  }
  if (change.type === "delete") return { ...feed, items: feed.items.filter((i) => !(i.kind === "comment" && i.id === change.id)) };
  return { ...feed, items: feed.items.map((i) => (itemKey(i) === change.key && "reactions" in i ? { ...i, reactions: choose(i.reactions, change.emoji) } : i)) };
}

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The nearest focusable element after the feed, or before it (APG Feed: Control+End and Control+Home).
function beyond(feed: HTMLElement, forward: boolean): HTMLElement | null {
  const outside = [...document.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => !feed.contains(el) && !el.contains(feed) && el.checkVisibility());
  const side = forward ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING;
  const after = outside.filter((el) => feed.compareDocumentPosition(el) & side);
  return (forward ? after[0] : after.at(-1)) ?? null;
}

// runOver: the player's run on this page is over, so the feed is read again from the top: a game they have finished
// clears its blurred items (answer 22). nudge: a count that goes up when comments or reactions changed, from the player's own
// Realtime topic (M08 8d; src/app/board-channel.ts): the first page is read again and merged into what is loaded.
export function Feed({ username, name, runOver, nudge }: { username: string; name: string; runOver: boolean; nudge: number }) {
  const [feed, setFeed] = useState<FeedPage | null>(null);
  const [shown, showChange] = useHeldChanges(feed, changed);
  const [adding, setAdding] = useState(false);
  // The newest item when the feed first loaded ("" if it held none): a comment after it popped in, as in a thread
  // (14b-10b, answer 12), and one on a page added by scrolling did not.
  const [since, setSince] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const undo = useUndo();
  // Reads of the first page overlap (a nudge, a run ending): only the newest answer is used (M11 H6).
  const [latest] = useState(latestOnly);
  // How many times the feed has been read again from the top; a page added from before that is dropped.
  const generation = useRef(0);
  const ids = useId();

  // replace: from the top, forgetting what is loaded (mount, a run ending); merge: a nudge, which keeps the reader's place.
  const readFirst = useCallback(
    (mode: "replace" | "merge") => {
      if (mode === "replace") generation.current++;
      return latest(
        api<{ feed: FeedPage }>("/api/feed/items", { method: "GET" }),
        (r) => {
          setFeed((was) => (mode === "merge" && was ? { ...r.feed, ...mergeFirstPage(was, r.feed) } : r.feed));
          setSince((s) => s ?? r.feed.items[0]?.at ?? "");
          setError(null);
        },
        (err) => setError(errorText(err)),
      );
    },
    [latest],
  );
  useEffect(() => void readFirst("replace"), [readFirst, runOver]);
  const nudged = useRef(nudge);
  useEffect(() => {
    if (nudged.current === nudge) return;
    nudged.current = nudge;
    void readFirst("merge");
  }, [nudge, readFirst]);

  const arrived = useArrived(
    shown && since !== null ? shown.items.flatMap((i) => (i.kind === "comment" && i.at > since ? [i] : [])) : null,
    "feed",
  );

  const next = feed?.next ?? null;
  const addPage = useCallback(() => {
    if (next === null || adding) return;
    const mine = generation.current;
    setAdding(true);
    api<{ feed: FeedPage }>(`/api/feed/items?cursor=${encodeURIComponent(next)}`, { method: "GET" }).then(
      (r) => {
        if (mine !== generation.current) return;
        // An item a merge already put in the loaded list is not added twice.
        setFeed((was) => was && { ...was, items: [...was.items, ...r.feed.items.filter((i) => !was.items.some((w) => itemKey(w) === itemKey(i)))], next: r.feed.next });
        setError(null);
        setAdding(false);
      },
      (err) => {
        setError(errorText(err));
        setAdding(false);
      },
    );
  }, [next, adding]);

  // The last loaded item coming on screen loads the next page (answer 47), whether it was scrolled to or focused.
  const last = useRef<HTMLElement>(null);
  const lastKey = shown && shown.items.length > 0 ? itemKey(shown.items.at(-1)!) : null;
  useEffect(() => {
    const el = last.current;
    if (!el || next === null || adding || error) return;
    const watch = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) addPage();
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, [lastKey, next, adding, error, addPage]);

  function act(change: Change, action: Held, onNotSent?: () => void) {
    showChange(
      change,
      undo.hold(action).then((sent) => {
        if (!sent) return onNotSent?.();
        if (change.type !== "post") setFeed((was) => changed(was, change));
        return readFirst("merge");
      }),
    );
  }

  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  // Why Post did nothing, until the box changes (docs/milestones/M14-14b-20-comments-and-undo.md, answer 6).
  const [refused, setRefused] = useState<string | null>(null);
  const posted = useRef(0);
  const games = shown ? postableGames(shown.finishedToday) : [];
  const postTo = games.find((g) => g.id === picked) ?? games[0];
  function post(event: FormEvent) {
    event.preventDefault();
    if (!shown || !postTo) return;
    const body = draft.trim();
    const length = characters(body);
    if (length === 0 || length > COMMENT_MAX_LENGTH) {
      setRefused(length === 0 ? "Write something first" : `${COMMENT_MAX_LENGTH} characters at most`);
      return;
    }
    const game = postTo.id;
    setDraft("");
    const item: FeedCommentItem = {
      kind: "comment",
      game,
      date: shown.today,
      at: new Date().toISOString(),
      username,
      name,
      mine: true,
      id: `${PENDING}-${posted.current++}`,
      body,
      group: null,
      reactions: { counts: [], mine: null },
    };
    act(
      { type: "post", item },
      {
        text: "Comment posted",
        failed: "Your comment wasn't posted",
        send: (keepalive) => api("/api/comments", { method: "POST", body: { game, date: shown.today, body }, keepalive }),
      },
      // The text goes back in the box, unless the player has started another.
      () => setDraft((d) => (d === "" ? body : d)),
    );
  }

  // After Delete or Report, once the comment has left the list: focus on the next comment's ⋯, or the one before if it was
  // the last, or the feed's heading if none is left (docs/milestones/M14-14b-21-screen-readers.md, answer 4).
  const heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const leaving = useRef<{ id: string; next: string | null } | null>(null);
  useEffect(() => {
    const gone = leaving.current;
    if (!gone || !shown || shown.items.some((i) => i.kind === "comment" && i.id === gone.id)) return;
    leaving.current = null;
    const item = gone.next && list.current?.querySelector<HTMLElement>(`[data-item="${CSS.escape(gone.next)}"]`);
    (item ? (item.querySelector<HTMLElement>("button[aria-expanded]") ?? item) : heading.current!).focus();
  }, [shown]);

  function report(id: string) {
    setError(null);
    api("/api/comments/report", { method: "POST", body: { id } }).then(
      () => {
        setFeed((was) => was && { ...was, items: was.items.filter((i) => !(i.kind === "comment" && i.id === id)) });
        return readFirst("merge");
      },
      (err) => {
        // The comment stays, so focus has nowhere to move to.
        leaving.current = null;
        setError(errorText(err));
      },
    );
  }

  // Page Down and Page Up move focus to the next and previous article, from anywhere inside one; Control+End and
  // Control+Home to the nearest focusable element after and before the feed (APG Feed, "Keyboard Interaction").
  function keys(event: KeyboardEvent<HTMLDivElement>) {
    const article = (event.target as HTMLElement).closest<HTMLElement>("article");
    if (!article) return;
    if (event.key === "PageDown" || event.key === "PageUp") {
      const to = event.key === "PageDown" ? article.nextElementSibling : article.previousElementSibling;
      if (to instanceof HTMLElement) {
        event.preventDefault();
        to.focus();
      }
    } else if (event.ctrlKey && (event.key === "End" || event.key === "Home")) {
      const to = beyond(event.currentTarget, event.key === "End");
      if (to) {
        event.preventDefault();
        to.focus();
      }
    }
  }

  const items = shown?.items ?? [];
  // The ⋯ menu's actions on item i. A deleted or reported comment leaves, so focus goes to a neighbour (see `leaving`).
  const leave = (id: string, i: number) => (leaving.current = { id, next: neighbourComment(items, i) });
  function deleteComment(c: FeedCommentItem, i: number) {
    leave(c.id, i);
    act(
      { type: "delete", id: c.id },
      {
        text: "Comment deleted",
        failed: "Your comment wasn't deleted",
        send: (keepalive) => api("/api/comments/delete", { method: "POST", body: { id: c.id }, keepalive }),
      },
    );
  }
  function reportComment(c: FeedCommentItem, i: number) {
    leave(c.id, i);
    report(c.id);
  }
  function reactComment(c: FeedCommentItem, key: string, emoji: Emoji | null) {
    act(
      { type: "react", key, emoji },
      {
        key: `comment ${c.id}`,
        text: reactionText(c.reactions, emoji),
        failed: "Your reaction wasn't saved",
        send: (keepalive) => api("/api/reactions", { method: "POST", body: { game: c.game, date: c.date, target: { type: "comment", id: c.id }, emoji }, keepalive }),
      },
    );
  }
  function reactResult(r: FeedResultItem, key: string, emoji: Emoji | null) {
    if (r.blurred) return;
    act(
      { type: "react", key, emoji },
      {
        key: `run ${r.game} ${r.userId}`,
        text: reactionText(r.reactions, emoji),
        failed: "Your reaction wasn't saved",
        send: (keepalive) => api("/api/reactions", { method: "POST", body: { game: r.game, date: r.date, target: { type: "run", userId: r.userId }, emoji }, keepalive }),
      },
    );
  }
  return (
    <section aria-label="Feed" className={kit.card}>
      <h2 ref={heading} tabIndex={-1}>
        Feed
      </h2>
      {shown && games.length === 0 && <p>Finish today&apos;s game to join in.</p>}
      {shown && postTo && (
        <form onSubmit={post} className={commentStyles.compose}>
          {games.length > 1 && (
            <label>
              Game
              <select value={postTo.id} onChange={(e) => setPicked(e.target.value)}>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {/* The box posts to the friends thread only (M11 H2 (a)), so it says so (M12 12f, F5). */}
            Comment to your friends
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
          <button type="submit">
            Post
          </button>
        </form>
      )}
      {shown && items.length === 0 && <p>No comments yet.</p>}
      {items.length > 0 && (
        // One list under one name, whose articles hold everything, the date lines included (APG Feed).
        <div ref={list} role="feed" aria-label="Feed" aria-busy={adding} className={styles.items} onKeyDown={keys}>
          {items.map((item, i) => {
            const key = itemKey(item);
            const line = dateLine(item.date, shown!.today);
            const id = `${ids}${key}`;
            const today = item.date === shown!.today;
            return (
              <article
                key={key}
                ref={i === items.length - 1 ? last : undefined}
                data-item={key}
                // Focusable so a keyboard moves through the items (APG Feed, "Role, Property, State, and Tabindex Attributes").
                tabIndex={0}
                aria-labelledby={`${id}-name ${id}-game ${id}-time`}
                aria-describedby={`${id}-body`}
                aria-posinset={i + 1}
                aria-setsize={items.length}
                className={item.kind === "comment" && arrived.has(item.id) ? `${styles.item} ${kit.pop}` : styles.item}
              >
                {line && <p className={styles.date}>{line}</p>}
                {/* A result carries its game's colour and a comment no box, so the two don't look alike (inbox #243;
                    docs/milestones/M20-design-rules-and-clean-up.md, answers 19, 34 and 56). */}
                <div
                  className={
                    item.kind === "comment"
                      ? `${kit.row} ${kit.bare} ${commentStyles.comment}`
                      : `${kit.row} ${commentStyles.comment} ${kit.edge} ${gameColour(item.game)}`
                  }
                >
                  {item.kind === "comment" ? (
                    <CommentContent
                      comment={{ id: item.id, username: item.username, name: item.name, body: item.body, createdAt: instant(item.at), reactions: item.reactions }}
                      label={
                        <>
                          <span id={`${id}-game`} className={commentStyles.nowrap}>{gameName(item.game)}</span> · {item.group ? item.group.name : "Friends"}
                        </>
                      }
                      ids={{ name: `${id}-name`, time: `${id}-time`, body: `${id}-body` }}
                      mine={item.mine}
                      pending={item.id.startsWith(PENDING)}
                      onDelete={() => deleteComment(item, i)}
                      onReport={() => reportComment(item, i)}
                      onReact={today && shown!.finishedToday.includes(item.game) ? (emoji) => reactComment(item, key, emoji) : undefined}
                    />
                  ) : (
                    <ResultContent item={item} ids={id} reactable={today && !item.mine} react={(emoji) => reactResult(item, key, emoji)} />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {adding && <p role="status">Loading more</p>}
      {!feed && !error && (
        <Skeleton label="Loading the feed">
          <Line />
        </Skeleton>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => (feed ? addPage() : void readFirst("replace"))}>
            Try again
          </button>
        </p>
      )}
    </section>
  );
}

// A finished run's row: the name, the game and time as a chip, how it went, the reactions used and the ⋯; or, blurred, the
// name, the game and time and "Play to see" in place of the result (answers 14, 26, 48 and 51).
function ResultContent({ item, ids, reactable, react }: { item: FeedResultItem; ids: string; reactable: boolean; react: (emoji: Emoji | null) => void }): ReactNode {
  const game = item.game === GAME_ID ? GAME : SUBSTRINGS;
  return (
    <>
      <Avatar name={item.name} />
      <div className={kit.grow}>
        <div className={kit.head}>
          <strong id={`${ids}-name`}>{item.name}</strong>
          <span className={kit.chip}>
            <span>
              <span id={`${ids}-game`} className={commentStyles.nowrap}>{game.name}</span> ·{" "}
              <time id={`${ids}-time`} dateTime={instant(item.at)} className={commentStyles.nowrap}>
                {new Date(instant(item.at)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </time>
            </span>
          </span>
        </div>
        {item.blurred ? (
          <p id={`${ids}-body`}>
            <ButtonLink href={game.path} transitionTypes={FORWARD}>
              Play to see
            </ButtonLink>
          </p>
        ) : (
          <>
            <p id={`${ids}-body`}>{item.game === GAME_ID ? endedText(item.ended) : pointsText(item.score)}</p>
            <Reactions reactions={item.reactions} below />
          </>
        )}
      </div>
      {!item.blurred && reactable && <ReactMenu label={`React to ${item.name}'s ${game.name} run`} reactions={item.reactions} onReact={react} />}
    </>
  );
}
