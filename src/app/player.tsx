"use client";

// Another player's profile, at /u/<username>, which is also what Find a player opens
// (docs/milestones/M17-profiles-and-friend-requests.md, "17b design", E1 and E6): the cards the Me tab shows, as far as
// the viewer may see them (the server decides: a stranger's totals and game card, a friend's calendar, rarest answers
// and last days too), and one row of actions for how the two players stand, each calling 17a's routes.
import { useEffect, useState, type ReactNode } from "react";
import type { PlayerProfile } from "@/friends/players";
import { api, ApiError } from "@/lib/api-client";
import { ButtonLink } from "./button-link";
import { blockQuestion } from "./friends-list";
import kit from "./kit.module.css";
import { StatsCards } from "./me";
import { errorText } from "./messages";
import { Line, Skeleton } from "./skeleton";

// The lookup limit's refusal (answer 15), in its own words here: the shared text for the code speaks of sign-in codes.
const text = (err: unknown) =>
  err instanceof ApiError && err.code === "too_many_attempts" ? "You've looked up a lot of players. Wait a while and try again." : errorText(err);

// onRequestsChanged: a request was sent or answered here, so
// the Friends tab's count is read again (src/app/home.tsx).
export function PlayerPage({ username, onRequestsChanged }: { username: string; onRequestsChanged: () => void }) {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ player: PlayerProfile }>(`/api/players/${encodeURIComponent(username)}`, { method: "GET" }).then(
      (r) => setPlayer(r.player),
      (err) => {
        setPlayer(null);
        setError(text(err));
      },
    );
  }
  useEffect(load, [username]);

  // One change between the viewer and this player, then the profile again: what the viewer may see can change with it.
  // Removing a friend names the ID, not the username, which can change hands while the page is open (M19 19e).
  async function change(path: string, question?: string) {
    if (!player || (question && !window.confirm(question))) return;
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: "POST", body: path === "/api/friends/remove" ? { userId: player.userId } : { username: player.username } });
      load();
    } catch (err) {
      setError(text(err));
    } finally {
      onRequestsChanged();
      setBusy(false);
    }
  }

  if (!player) {
    if (error) return <p role="alert">{error}</p>;
    return (
      <Skeleton label="Loading the player">
        <section className={kit.card}>
          <Line />
        </section>
      </Skeleton>
    );
  }
  const action = (label: string, path: string, question?: string) => (
    <button type="button" className={kit.small} disabled={busy} onClick={() => void change(path, question)}>
      {label}
    </button>
  );
  const actions: Record<PlayerProfile["relation"], ReactNode> = {
    self: (
      <>
        <span className={kit.grow}>This is you.</span>
        <ButtonLink href="/me">Your Me page</ButtonLink>
      </>
    ),
    none: (
      <button type="button" className={`${kit.primary} ${kit.small}`} disabled={busy} onClick={() => void change("/api/friends/requests")}>
        Add friend
      </button>
    ),
    sent: (
      <>
        <span className={kit.grow}>Friend request sent.</span>
        {action("Cancel request", "/api/friends/requests/cancel")}
      </>
    ),
    received: (
      <>
        <span className={kit.grow}>{player.name} sent you a friend request.</span>
        {action("Accept", "/api/friends/requests/accept")}
        {action("Decline", "/api/friends/requests/decline")}
        {/* The block alone, as on the Friends page: a decline would tell the sender (answer 28). */}
        {action("Decline and block", "/api/friends/block", blockQuestion(player.name))}
      </>
    ),
    friend: (
      <>
        <span className={kit.grow}>You&apos;re friends.</span>
        {action("Remove", "/api/friends/remove", `Remove ${player.name} as a friend?`)}
        {action("Block", "/api/friends/block", blockQuestion(player.name))}
      </>
    ),
    blocked: (
      <>
        <span className={kit.grow}>You&apos;ve blocked this player.</span>
        {action("Unblock", "/api/friends/unblock")}
      </>
    ),
  };
  return (
    <StatsCards
      name={player.name}
      username={player.username}
      since={player.since}
      totals={player.totals}
      offbeat={player.offbeat}
      month={player.month}
      rarest={player.rarest}
      recent={player.recent}
    >
      <section aria-label="You and this player" className={kit.card}>
        <div className={kit.chips}>{actions[player.relation]}</div>
        {error && <p role="alert">{error}</p>}
      </section>
    </StatsCards>
  );
}
