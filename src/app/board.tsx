"use client";

// The live board (docs/milestones/M07-friends-and-live-board.md, 7c): friends' runs today, updated over the player's
// own Realtime topic (src/app/board-channel.ts). On Offbeat a friend shows their question and points as they play
// (docs/milestones/M23-23d-the-screens.md, answer 47). On Fragments, until the player's own run is over, a friend shows only
// whether they've started (M12 12d), then their round, and their score once both have finished: the HTTP board gives it once
// the player's own run is over, so nothing reaches the page early. So do reactions on runs (M08 8b), which the player can add
// to friends' runs from then on. The same channel carries nudges that comments or
// reactions changed (8d), with no content: the page refetches over HTTP, which decides what the player may see. The
// feed, on Today, listens to the channel itself (src/app/home.tsx). Each game has its own board (M16 16f-6): Offbeat's
// as above, and Fragments', where a friend shows "on round k of n" and, once they and the player have both finished,
// their score, and never their words. The board is a game's alone when its page names one, and otherwise has the game switch
// (answers 56 and 57).
import { useCallback, useEffect, useState } from "react";
import type { Board as BoardData, BoardFriend } from "@/friends/board";
import type { BoardGame } from "@/friends/leaderboard";
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
import { PlayerAvatar, PlayerName } from "./player-link";
import styles from "./board.module.css";
import kit from "./kit.module.css";
import { gameColour } from "./game-colour";
import { LiveStatus } from "./live-status";
import { errorText } from "./messages";
import { pointsText } from "./game";
import { GameSwitch } from "./leaderboard";
import { ReactMenu, Reactions, reactionText } from "./reactions";
import { GAME, GAME_ID, SUBSTRINGS } from "@/platform/game";
import { Line, Skeleton } from "./skeleton";
import { useHeldChanges, useUndo } from "./undo";

function reacted(board: BoardData | null, change: { friend: string; emoji: Emoji | null }): BoardData | null {
  if (!board) return board;
  return {
    ...board,
    friends: board.friends.map((f) => (f.username === change.friend && f.reactions ? { ...f, reactions: choose(f.reactions, change.emoji) } : f)),
  };
}

const NAMES = { [GAME.id]: GAME.name, [SUBSTRINGS.id]: SUBSTRINGS.name } as const;

// betterWithFriends: the words for a player with no friends, on the Friends tab, above Find a player; off on Today,
// where nothing stands in the invite link's place (docs/milestones/M17-profiles-and-friend-requests.md, 17c, answer 34).
// game: the game this board is for, with no switch (Today follows its front card, or has one game); otherwise the
// player picks, from the games with a day today, and the board opens on initial, Offbeat if none.
export function Board({
  username,
  betterWithFriends,
  game,
  initial = GAME_ID,
}: {
  username: string;
  betterWithFriends: boolean;
  game?: BoardGame;
  initial?: BoardGame;
}) {
  const [chosen, setChosen] = useState<BoardGame>(initial);
  const shown = game ?? chosen;
  const [loaded, setBoard] = useState<BoardData | null>(null);
  // Another game's board is no answer for this one: it shows as loading until its own comes.
  const board = loaded?.game === shown ? loaded : null;
  // A reaction on a friend's run shows at once while it's held for Undo and sent
  // (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b).
  const [shownBoard, showReaction] = useHeldChanges(board, reacted);
  const gameChoices = loaded?.games ?? [];
  const [error, setError] = useState<string | null>(null);
  const undo = useUndo();
  // Refetches overlap (nudges, a reconnect, a reaction): only the newest answer is shown (M11 H6).
  const [latest] = useState(latestOnly);

  const load = useCallback(
    (reason?: "reconnect") =>
      latest(
        api<{ board: BoardData }>(`/api/board?${reason ? `reason=${reason}&` : ""}game=${shown}`, { method: "GET" }),
        (r) => {
          setBoard(r.board);
          // A day with only one game: opened on the other, the board moves to the one there is.
          setChosen((c) => (r.board.games.includes(c) || r.board.games.length !== 1 ? c : r.board.games[0]));
          setError(null);
        },
        (err) => setError(errorText(err)),
      ),
    [latest, shown],
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
    // Another game's run says nothing about this board.
    if (!board || message.puzzleDate !== board.date || message.gameId !== board.game) return;
    // The player's own run ended: Fragments' scores may now be shown.
    if (message.username === username) {
      if (message.state === "finished" && !board.finished) load();
      return;
    }
    // A friend finished on Fragments: fetch their score. Only a player who has finished is told (M12 12d), so this page's
    // own refetch for that may still be on its way. Offbeat's message holds the points.
    if (message.state === "finished" && board.questions === null) {
      load();
      return;
    }
    setBoard({
      ...board,
      friends: board.friends.map((f) =>
        f.username === message.username ? { ...f, state: message.state, question: message.question, ...(board.questions === null ? {} : { points: message.points ?? 0 }) } : f,
      ),
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
      send: (keepalive) => api("/api/reactions", { method: "POST", body: { game: board!.game, date: day, target: { type: "run", userId: friend.userId }, emoji }, keepalive }),
    });
    showReaction({ friend: friend.username, emoji }, held.then((sent) => (sent ? load() : undefined)));
  }

  return (
    <section aria-label="Friends today" className={`${kit.card} ${gameColour(shown) ?? ""}`}>
      <h2>Friends today</h2>
      <LiveStatus channel={channel} />
      {/* The games with a day today, when the page doesn't name one and there are two (answers 56 and 57). */}
      {game === undefined && gameChoices.length > 1 && (
        <GameSwitch choices={gameChoices.map((id) => ({ id, name: NAMES[id] }))} value={shown} onChange={setChosen} />
      )}
      {shownBoard?.reactionsOnMine && shownBoard.reactionsOnMine.counts.length > 0 && (
        // Read once, as the group's name: "Reactions on your run, 😂 1" (docs/milestones/M14-14b-23-small-jumps-and-finds.md, answer 6).
        <p>
          <span aria-hidden>Reactions on your run: </span>
          <Reactions reactions={shownBoard.reactionsOnMine} name="Reactions on your run" />
        </p>
      )}
      {/* L31: friendlier, and for any game (round 3's wording, provisional per L32). */}
      {betterWithFriends && shownBoard && shownBoard.friends.length === 0 && (
        <>
          <h3>{BETTER_WITH_FRIENDS.title}</h3>
          <p>{BETTER_WITH_FRIENDS.text}</p>
        </>
      )}
      {/* Mockup 3's rows: the avatar, the name cut on one line, the ⋯ to react (14b-13, answer 3) and how the run stands
          as a chip, in its own column at the row's right edge, and the reactions used on a line under the name, as a
          comment's are (beside them, they covered the name on phones: M14 14b-8e). Short words in the chip (inbox #250;
          M20 answers 5 and 9). */}
      {shownBoard && shownBoard.friends.length > 0 && (
        <ul className={kit.rows}>
          {shownBoard.friends.map((f) => (
            <li key={f.username} className={`${kit.row} ${kit.board} ${styles.friend}`}>
              <PlayerAvatar name={f.name} username={f.username} />
              <PlayerName username={f.username} className={styles.name}>
                {f.name}
              </PlayerName>
              <span className="sr-only">:</span> <FadeIn value={describe(f, shownBoard.rounds, shownBoard.questions)} className={`${kit.chip} ${styles.status}`} />
              {f.reactions && (
                <div className={styles.reactions}>
                  <Reactions reactions={f.reactions} below />
                </div>
              )}
              {f.reactions && (
                <div className={styles.menu}>
                  <ReactMenu label={`React to ${f.name}'s run`} reactions={f.reactions} onReact={(emoji) => react(f, emoji)} />
                </div>
              )}
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
    </section>
  );
}

// L31's wording (round 3's, provisional per L32), for a player with no friends yet, under the Friends tab's board.
const BETTER_WITH_FRIENDS = {
  title: "Plor is better with friends",
  text: "See how your friends did each day, talk about the puzzles, and compare scores every week, in whichever games you both play.",
};

// rounds: Fragments' rounds today, which a friend's round is counted against; null on Offbeat's board, which has questions.
// questions: a day on a clock's questions, whose friends show their question and points from their first answer (answer 47).
function describe(f: BoardFriend, rounds: number | null, questions: number | null): string {
  if (f.score !== null) return pointsText(f.score);
  if (questions !== null && f.state === "playing") return `Question ${f.question} of ${questions} · ${pointsText(f.points ?? 0)}`;
  if (questions !== null && f.state === "finished") return pointsText(f.points ?? 0);
  if (f.state === "playing") return rounds === null ? `Question ${f.question}` : `on round ${f.question} of ${rounds}`;
  if (f.state === "started") return "started (you'll see how it's going once you finish)";
  return "Not yet";
}

// A friend's status that fades in each time it changes, not when the board first shows it (docs/milestones/
// M20-design-rules-and-clean-up.md, answers 57 and 59): only the chip moves, so a reaction menu open on the row stays
// open. Keyed by how often it has changed, so each change plays the fade again. The state follows the value as React's
// "adjusting some state when a prop changes" does, in render.
function FadeIn({ value, className }: { value: string; className: string }) {
  const [shown, setShown] = useState(value);
  const [changes, setChanges] = useState(0);
  if (value !== shown) {
    setShown(value);
    setChanges((n) => n + 1);
  }
  return (
    <span key={changes} className={changes > 0 ? `${className} ${kit.fade}` : className}>
      {value}
    </span>
  );
}
