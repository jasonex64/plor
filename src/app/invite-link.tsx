"use client";

// The player's own invite link (docs/milestones/M07-friends-and-live-board.md, 7b), under Today's board and in the
// Friends tab's friends list (docs/milestones/M12-12f-review-fixes.md, F1; docs/milestones/M14-14a-3b-settings.md),
// shared from a button and never shown (docs/milestones/M14-14b-3-invite-button.md). Sharing is the share sheet or the
// clipboard, as the result's Share (src/app/share.ts). Reset is offered only where canReset is set, the friends list.
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { errorText } from "./messages";
import { shareLink } from "./share";
import { Line, Skeleton } from "./skeleton";

export function InviteLink({ canReset }: { canReset: boolean }) {
  // undefined while loading; null when the player has no link yet.
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ inviteCode: string | null }>("/api/friends", { method: "GET" }).then(
      (r) => setCode(r.inviteCode),
      (err) => setError(errorText(err)),
    );
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const linkOf = (c: string) => `${window.location.origin}/i/${c}`;
  // Invite a friend: the share sheet, or the clipboard where there's none, with the link, which is never shown (human,
  // 2026-10-26: "An 'Invite a friend' button (Recommended)"; docs/milestones/M14-14b-3-invite-button.md, answer 1). The
  // first time, the player's code is made first.
  const invite = () =>
    run(async () => {
      const current = code ?? (await api<{ inviteCode: string }>("/api/friends/invite", { method: "POST", body: { reset: false } })).inviteCode;
      setCode(current);
      if (await shareLink("Add me as a friend on Plor", linkOf(current))) setNote("Copied.");
    });
  const reset = () =>
    run(async () => {
      const { inviteCode } = await api<{ inviteCode: string }>("/api/friends/invite", { method: "POST", body: { reset: true } });
      setCode(inviteCode);
      setNote("New link made. The old one no longer works.");
    });

  return (
    <section aria-label="Invite friends">
      <h3>Invite friends</h3>
      <p>
        <button type="button" disabled={busy || code === undefined} onClick={() => void invite()}>
          Invite a friend
        </button>
        {/* Beside the button, on the Friends tab only, so a stray tap under Today's board can't break a link already sent
            (answer 8). */}
        {canReset && code && (
          <>
            {" "}
            <button type="button" disabled={busy} onClick={() => void reset()}>
              Reset link
            </button>
          </>
        )}
        {note && <span role="status"> {note}</span>}
      </p>
      {code === undefined && !error && (
        <Skeleton label="Loading your invite link">
          <Line />
        </Skeleton>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
