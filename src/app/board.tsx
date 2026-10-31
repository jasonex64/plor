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
import { choose } from "@/reactions/choose";
import type { Emoji } from "@/reactions/reactions";
import {
  PAYLOAD_VERSION,
  STATUS_VERSION,
  useBoardChannel,
  type ChangedMessage,
  type StatusMessage,
} from "./board-channel";
import { Avatar } from "./avatar";
import kit from "./kit.module.css";
import { InviteLink } from "./invite-link";
import { LiveStatus } from "./live-status";
import { errorText } from "./messages";
import { Reactions, reactionText } from "./reactions";
import { capitalized, caughtText, timedOutText } from "@/game/words";
import { Line, Skeleton } from "./skeleton";
import { useHeldChanges, useUndo } from "./undo";

function reacted(board: BoardData | null, change: { friend: string; emoji: Emoji | null }): BoardData | null {
  if (!board) return board;
  return {
    ...board,
    friends: board.friends.map((f) => (f.username === change.friend && f.reactions ? { ...f, reactions: choose(f.reactions, change.emoji) } : f)),
  };
}

// invite: the invite link, without Reset, under the board (M12 12f, F1); off on the Friends tab, whose friends list
// holds the link with Reset (docs/milestones/M14-14a-3b-settings.md).
export function Board({ username, invite }: { username: string; invite: boolean }) {
  const [board, setBoard] = useState<BoardData | null>(null);
  // A reaction on a friend's run shows at once while it's held for Undo and sent
  // (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b).
  const [shownBoard, showReaction] = useHeldChanges(board, reacted);
  const [error, setError] = useState<string | null>(null);
  const undo = useUndo();
  // Refetches overlap (nudges, a reconnect, a reaction): only the newest answer is shown (M11 H6).
  const [latest] = useState(latestOnly);

  const load = useCallback(
    (reason?: "reconnect") =>
      latest(
        api<{ board: BoardData }>(reason ? `/api/board?reason=${reason}` : "/api/board", { method: "GET" }),
        (r) => {
          setBoard(r.board);
          setError(null);
        },
        (err) => setError(errorText(err)),
      ),
    [latest],
  );
  useEffect(() => void load(), [load]);

  const channel = useBoardChannel({
    joined: (reason) => load(reason === "reconnect" ? "reconnect" : undefined),
    status: onStatus,
    changed: onChanged,
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

  // Once sent, the board is loaded again before the shown reaction is let go, so nothing flickers.
  // Only a friend whose run shows reactions has the buttons.
  function react(friend: BoardFriend, emoji: Emoji | null) {
    const day = board!.date;
    const held = undo.hold({
      key: `run ${friend.username}`,
      text: reactionText(friend.reactions!, emoji),
      failed: "Your reaction wasn't saved",
      send: (keepalive) => api("/api/reactions", { method: "POST", body: { date: day, target: { type: "run", username: friend.username }, emoji }, keepalive }),
    });
    showReaction({ friend: friend.username, emoji }, held.then((sent) => (sent ? load() : undefined)));
  }

  return (
    <section aria-label="Friends today" className={kit.card}>
      <h2>Friends today</h2>
      <LiveStatus channel={channel} />
      {shownBoard?.mine && <WhereEveryoneEnded username={username} mine={shownBoard.mine} friends={shownBoard.friends} />}
      {shownBoard?.reactionsOnMine && shownBoard.reactionsOnMine.counts.length > 0 && (
        <p>
          Reactions on your run: <Reactions reactions={shownBoard.reactionsOnMine} />
        </p>
      )}
      {/* L31: friendlier, and for any game (round 3's wording, provisional per L32). */}
      {shownBoard && shownBoard.friends.length === 0 && (
        <>
          <h3>{BETTER_WITH_FRIENDS.title}</h3>
          <p>{BETTER_WITH_FRIENDS.text}</p>
        </>
      )}
      {/* Mockup 3's rows: the avatar, the name, how the run stands as a chip, and the reactions on a line under them, as
          a comment's are (beside them, they covered the name on phones: M14 14b-8e). */}
      {shownBoard && shownBoard.friends.length > 0 && (
        <ul className={kit.rows}>
          {shownBoard.friends.map((f) => (
            <li key={f.username} className={kit.row}>
              <Avatar name={f.name} />
              <div className={kit.grow}>
                <b>{f.name}</b>
                <span className="sr-only">:</span> <span className={toneOf(f)}>{describe(f)}</span>{" "}
                {f.reactions && (
                  <div className={kit.below}>
                    <Reactions reactions={f.reactions} onReact={(emoji) => react(f, emoji)} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!shownBoard && !error && (
        <Skeleton label="Loading the live board">
          <Line />
        </Skeleton>
      )}
      {error && <p role="alert">{error}</p>}
      {/* Adding a friend starts here too (docs/milestones/M12-12f-review-fixes.md, F1). */}
      {invite && <InviteLink canReset={false} />}
    </section>
  );
}

// L31's wording (round 3's, provisional per L32), for a player with no friends yet: under the board, and on phones as
// Today's own card (docs/milestones/M14-14b-8-the-new-look.md, answer 13).
export const BETTER_WITH_FRIENDS = {
  title: "Plor is better with friends",
  text: "See how your friends did each day, talk about the puzzles, and compare scores every week, in whichever games you both play.",
};

// Phone Today's invite card when the player has no friends (mockup 3's soft tile; answer 13). From 768px the board says
// it instead.
export function FriendsInviteCard() {
  const [friends, setFriends] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ friends: unknown[] }>("/api/friends", { method: "GET" }).then(
      (r) => setFriends(r.friends.length),
      (err) => setError(errorText(err)),
    );
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (friends !== 0) return null;
  return (
    <section aria-label={BETTER_WITH_FRIENDS.title} className={`${kit.card} ${kit.soft}`}>
      <h2>{BETTER_WITH_FRIENDS.title}</h2>
      <p>{BETTER_WITH_FRIENDS.text}</p>
      <InviteLink canReset={false} />
    </section>
  );
}

// A friend's state as a chip: safe at the top, caught for a run that ended lower, plain otherwise.
function toneOf(f: BoardFriend): string {
  if (f.ended?.result === "survived") return `${kit.chip} ${kit.safe}`;
  if (f.ended) return `${kit.chip} ${kit.caught}`;
  return kit.chip;
}

function describe(f: BoardFriend): string {
  if (f.ended?.result === "caught") return `${caughtText(f.ended.question)} by "${f.ended.answer}"`;
  if (f.ended?.result === "survived") return "reached the top";
  if (f.ended?.result === "timed_out") return timedOutText(f.ended.question);
  if (f.state === "playing") return `on stop ${f.question}`;
  if (f.state === "started") return "started (you'll see how it's going once you finish)";
  return "hasn't played yet";
}

function placeLabel(place: Place): string {
  // Updraft's words by the stop's tier (docs/milestones/M14-14c-1-name-and-words.md, "The words").
  if (place.kind === "caught") return capitalized(caughtText(place.question));
  if (place.kind === "timed_out") return capitalized(timedOutText(place.question));
  return "Reached the top";
}

// "Where everyone ended" (M07 7d): one row per place, the player first, up to FRIENDS_PER_PLACE friends by name, then
// a count. Each row opens to its full list: a native <details>, so it works by tap and keyboard with no state. The full
// list has the avatar slot by every name, as the board's other rows do (L37, "Boards"; human, 2026-10-26: "Yes, add
// them (Recommended)"; docs/milestones/M14-14b-2c-review-items.md, answer 11).
function WhereEveryoneEnded({ username, mine, friends }: { username: string; mine: Ended; friends: BoardFriend[] }) {
  return (
    <section aria-label="Where everyone ended">
      <h3>Where everyone ended</h3>
      <ul className={kit.rows}>
        {placeRows(mine, friends).map((row) => (
          <li key={placeLabel(row.place)} className={row.you ? `${kit.row} ${kit.you}` : kit.row}>
            <details>
              <summary>
                {placeLabel(row.place)}: {[...(row.you ? ["You"] : []), ...row.named.map((p) => p.name)].join(", ")}
                {row.more > 0 && ` + ${row.more} more`}
              </summary>
              <ul>
                {row.you && (
                  <li>
                    <Avatar name={username} /> You
                  </li>
                )}
                {row.everyone.map((p) => (
                  <li key={p.username}>
                    <Avatar name={p.name} /> {p.name}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
