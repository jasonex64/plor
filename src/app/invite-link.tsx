"use client";

// The player's own invite link (docs/milestones/M07-friends-and-live-board.md, 7b), under Today's board and in the
// Friends tab's friends list (docs/milestones/M12-12f-review-fixes.md, F1; docs/milestones/M14-14a-3b-settings.md),
// shared from a button and shown only when the clipboard refuses it (docs/milestones/M14-14b-3-invite-button.md;
// M14-14b-18-headings-today-invites-words.md, answer 9). Sharing is the share sheet or the
// clipboard, as the result's Share (src/app/share.tsx). Reset is offered only where canReset is set, the friends list.
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { errorText } from "./messages";
import kit from "./kit.module.css";
import { CopyField, shareLink } from "./share";
import { Line, Skeleton } from "./skeleton";

// The player's invite code, one for the whole page, so every Invite button shares the same live link and a Reset reaches
// them all (docs/milestones/M14-14b-22-settings-and-invites.md, answer 1). It's made as soon as a button shows, so the first tap shares at once:
// Safari refuses a share sheet opened after an awaited request (14b-20, answer 8). owner is the signed-in player's
// username: another player signed in on this tab starts again.
type InviteCode = { code: string | null; error: string | null; need: () => void; reset: () => Promise<void> };
const InviteContext = createContext<InviteCode | null>(null);

export function InviteCodeProvider({ owner, children }: { owner: string | null; children: ReactNode }) {
  const [held, setHeld] = useState<{ owner: string | null; code: string | null }>({ owner, code: null });
  const [error, setError] = useState<{ owner: string; message: string } | null>(null);
  // Whose code is being fetched now, so a second button (or the development server's second effect) doesn't ask again.
  const fetching = useRef<string | null>(null);
  // A player signed out, in or switched on this tab starts with no code (the same player signing in again asks again).
  if (held.owner !== owner) setHeld({ owner, code: null });
  const code = held.owner === owner ? held.code : null;
  const need = useCallback(() => {
    if (owner === null || code !== null || fetching.current === owner) return;
    fetching.current = owner;
    api<{ inviteCode: string | null }>("/api/friends", { method: "GET" })
      .then(async (r) => r.inviteCode ?? (await api<{ inviteCode: string }>("/api/friends/invite", { method: "POST", body: { reset: false } })).inviteCode)
      .then(
        // An answer for a player no longer signed in is dropped.
        (made) => setHeld((h) => (h.owner === owner ? { owner, code: made } : h)),
        (err) => setError({ owner, message: errorText(err) }),
      )
      .finally(() => {
        if (fetching.current === owner) fetching.current = null;
      });
  }, [owner, code]);
  const reset = useCallback(async () => {
    const { inviteCode } = await api<{ inviteCode: string }>("/api/friends/invite", { method: "POST", body: { reset: true } });
    setHeld((h) => (h.owner === owner ? { owner, code: inviteCode } : h));
  }, [owner]);
  return <InviteContext value={{ code, error: error?.owner === owner ? error.message : null, need, reset }}>{children}</InviteContext>;
}

export function InviteLink({ canReset }: { canReset: boolean }) {
  const invite = use(InviteContext);
  if (!invite) throw new Error("an invite link rendered outside the frame's InviteCodeProvider (src/app/home.tsx, Frame)");
  const { code, need } = invite;
  useEffect(need, [need]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // The link to copy by hand when the share sheet or the clipboard refused it (src/app/share.tsx).
  const [copy, setCopy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNote(null);
    setCopy(null);
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
  // code is already made, so nothing is awaited before the share (answer 1).
  const share = (current: string) =>
    run(async () => {
      const link = linkOf(current);
      const shared = await shareLink("Add me as a friend on Plor", link);
      if (shared === "copied") setNote("Copied.");
      if (shared === "refused") setCopy(link);
    });
  const reset = () =>
    run(async () => {
      await invite.reset();
      setNote("New link made. The old one no longer works.");
    });

  return (
    <section aria-label="Invite friends">
      <h3>Invite friends</h3>
      {/* Mockup 3: on the Friends tab, the accent small button with Reset as a minor one in the danger colour; under
          Today's board, the plain small one. */}
      <p className={kit.chips}>
        <button type="button" className={canReset ? `${kit.primary} ${kit.small}` : kit.small} disabled={busy || code === null} onClick={() => code && void share(code)}>
          Invite a friend
        </button>
        {/* Beside the button, on the Friends tab only, so a stray tap under Today's board can't break a link already sent
            (answer 8). */}
        {canReset && code && (
          <button type="button" className={`${kit.link} ${kit.danger}`} disabled={busy} onClick={() => void reset()}>
            Reset link
          </button>
        )}
        {note && <span role="status">{note}</span>}
      </p>
      {copy && <CopyField value={copy} />}
      {code === null && !invite.error && (
        <Skeleton label="Loading your invite link">
          <Line />
        </Skeleton>
      )}
      {(error ?? invite.error) && <p role="alert">{error ?? invite.error}</p>}
    </section>
  );
}
