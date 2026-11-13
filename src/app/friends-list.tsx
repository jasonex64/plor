"use client";

// The player's friends on the Friends tab (human, 2026-10-25: "friends list should be in the friends tab";
// docs/milestones/M14-14a-3b-settings.md), moved from the Me tab's account section (M12 12a): each with an avatar slot
// (L37) and Remove (M07 D4), which asks first, since a new invite link is the only way back
// (docs/milestones/M12-12f-review-fixes.md, F3); then the player's own invite link, with Reset ("Yes, with the list
// (Recommended)"). Above them, while there are any, the friend requests waiting for the player's answer and the ones
// they sent, and on each friend a Block (docs/milestones/M17-profiles-and-friend-requests.md, 17a, D7).
import { useEffect, useState } from "react";
import type { Friend } from "@/friends/friends";
import { api } from "@/lib/api-client";
import { Avatar } from "./avatar";
import { InviteLink } from "./invite-link";
import kit from "./kit.module.css";
import { errorText } from "./messages";
import { Line, Skeleton } from "./skeleton";

type Lists = { friends: Friend[]; requests: Friend[]; sent: Friend[] };

// What a block does, said before it happens, as it ends a friendship and is undone only from Settings (answers 12, 13,
// 20 and 21).
const blockQuestion = (name: string) =>
  `Block ${name}? You won't be friends, and you won't see each other's comments or reactions. They won't be told. You can unblock them in Settings.`;

// onRequestsChanged: a request was answered here, so the Friends tab's count is read again (src/app/home.tsx).
export function FriendsList({ onRequestsChanged }: { onRequestsChanged: () => void }) {
  const [lists, setLists] = useState<Lists | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<Lists>("/api/friends", { method: "GET" }).then(
      (r) => setLists({ friends: r.friends, requests: r.requests, sent: r.sent }),
      (err) => setError(errorText(err)),
    );
  }
  useEffect(load, []);

  // One change to a player, by username, then the lists again. A refusal is shown, and the lists are still read again:
  // it usually means they changed elsewhere (a request its sender cancelled).
  async function change(path: string, player: Friend, question?: string) {
    if (question && !window.confirm(question)) return;
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: "POST", body: { username: player.username } });
    } catch (err) {
      setError(errorText(err));
    } finally {
      load();
      onRequestsChanged();
      setBusy(false);
    }
  }

  const friends = lists?.friends;
  const action = (label: string, path: string, player: Friend, question?: string) => (
    <button type="button" className={kit.link} disabled={busy} onClick={() => void change(path, player, question)}>
      {label}
    </button>
  );
  return (
    <>
      {lists && lists.requests.length + lists.sent.length > 0 && (
        <section aria-label="Friend requests" className={kit.card}>
          <div className={kit.head}>
            <h2>Friend requests</h2>
            {lists.requests.length > 0 && (
              <span className={kit.chip}>
                {lists.requests.length}
                <span className="sr-only"> waiting for your answer</span>
              </span>
            )}
          </div>
          {lists.requests.length > 0 && (
            <ul className={kit.rows} aria-label="Requests to you">
              {lists.requests.map((p) => (
                <li key={p.username} className={kit.row}>
                  <Avatar name={p.name} />
                  <div className={kit.grow}>
                    {p.name}
                    <div className={kit.below}>
                      {action("Accept", "/api/friends/requests/accept", p)}
                      {action("Decline", "/api/friends/requests/decline", p)}
                      {/* The block alone: a decline would tell the sender, whose request must look unanswered (answer 28). */}
                      {action("Decline and block", "/api/friends/block", p, blockQuestion(p.name))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {lists.sent.length > 0 && (
            <>
              <h3>Sent, waiting for an answer</h3>
              <ul className={kit.rows} aria-label="Requests you sent">
                {lists.sent.map((p) => (
                  <li key={p.username} className={kit.row}>
                    <Avatar name={p.name} />
                    <span className={kit.grow}>{p.name}</span>
                    {action("Cancel", "/api/friends/requests/cancel", p)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      {/* Mockup 3's "Your friends": a card, its count as a chip, a row for each friend with Remove as a minor button. */}
      <section aria-label="Your friends" className={kit.card}>
        <div className={kit.head}>
          <h2>Your friends</h2>
          {friends && (
            <span className={kit.chip}>
              {friends.length}
              <span className="sr-only"> {friends.length === 1 ? "friend" : "friends"}</span>
            </span>
          )}
        </div>
        {friends && friends.length === 0 && <p>No friends yet. Send someone your invite link.</p>}
        {friends && friends.length > 0 && (
          <ul className={kit.rows}>
            {friends.map((f) => (
              <li key={f.username} className={kit.row}>
                <Avatar name={f.name} />
                <span className={kit.grow}>{f.name}</span>
                {action(
                  "Remove",
                  "/api/friends/remove",
                  f,
                  `Remove ${f.name} as a friend? To be friends again, one of you opens the other's invite link.`,
                )}
                {action("Block", "/api/friends/block", f, blockQuestion(f.name))}
              </li>
            ))}
          </ul>
        )}
        {!friends && !error && (
          <Skeleton label="Loading your friends">
            <Line />
          </Skeleton>
        )}
        {error && <p role="alert">{error}</p>}
        <InviteLink canReset />
      </section>
    </>
  );
}
