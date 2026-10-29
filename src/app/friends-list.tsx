"use client";

// The player's friends on the Friends tab (human, 2026-10-25: "friends list should be in the friends tab";
// docs/milestones/M14-14a-3b-settings.md), moved from the Me tab's account section (M12 12a): each with an avatar slot
// (L37) and Remove (M07 D4), which asks first, since a new invite link is the only way back
// (docs/milestones/M12-12f-review-fixes.md, F3); then the player's own invite link, with Reset ("Yes, with the list
// (Recommended)").
import { useEffect, useState } from "react";
import type { Friend } from "@/friends/friends";
import { api } from "@/lib/api-client";
import { Avatar } from "./avatar";
import { InviteLink } from "./invite-link";
import { errorText } from "./messages";
import { Line, Skeleton } from "./skeleton";

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ friends: Friend[] }>("/api/friends", { method: "GET" }).then(
      (r) => setFriends(r.friends),
      (err) => setError(errorText(err)),
    );
  }
  useEffect(load, []);

  async function removeFriend(friend: Friend) {
    if (!window.confirm(`Remove ${friend.name} as a friend? To be friends again, one of you opens the other's invite link.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/friends/remove", { method: "POST", body: { username: friend.username } });
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Your friends">
      <h2>Your friends</h2>
      {friends && friends.length === 0 && <p>No friends yet. Send someone your invite link.</p>}
      {friends && friends.length > 0 && (
        <ul>
          {friends.map((f) => (
            <li key={f.username}>
              <Avatar name={f.name} /> {f.name}{" "}
              <button type="button" disabled={busy} onClick={() => void removeFriend(f)}>
                Remove
              </button>
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
  );
}
