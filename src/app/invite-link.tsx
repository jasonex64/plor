"use client";

// The player's own invite link (docs/milestones/M07-friends-and-live-board.md, 7b), on the home page's board and the
// account page (docs/milestones/M12-12f-review-fixes.md, F1). Share is the share sheet or the clipboard, as the
// result's Share (src/app/share.ts). Reset is offered only where canReset is set, the account page, so a stray tap on
// the home page can't break a link already sent.
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { errorText } from "./messages";
import { shareLink } from "./share";

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

  const issue = (reset: boolean) =>
    run(async () => {
      const { inviteCode } = await api<{ inviteCode: string }>("/api/friends/invite", { method: "POST", body: { reset } });
      setCode(inviteCode);
    });
  const link = code ? `${window.location.origin}/invite/${code}` : null;

  return (
    <section aria-label="Invite friends">
      <h3>Invite friends</h3>
      {link && (
        <p>
          Your invite link: <code>{link}</code>{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (await shareLink("Add me as a friend on Plor", link)) setNote("Copied.");
              })
            }
          >
            Share
          </button>{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await navigator.clipboard.writeText(link);
                setNote("Copied.");
              })
            }
          >
            Copy
          </button>
          {canReset && (
            <>
              {" "}
              <button type="button" disabled={busy} onClick={() => void issue(true)}>
                Reset link
              </button>
            </>
          )}
          {note && <span role="status"> {note}</span>}
        </p>
      )}
      {code === null && (
        <button type="button" disabled={busy} onClick={() => void issue(false)}>
          Make my invite link
        </button>
      )}
      {code === undefined && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
