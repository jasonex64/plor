"use client";

// The player's account (docs/milestones/M12-account.md, 12a; A1): their username and all-time points, the display
// name others see (M07 7a), their friends and invite link (M07 7b), and Sign out. Moved off the home page, which is
// about the day (M11 H1). The username can change once every 30 days (12b, A2), and the account can be deleted (12c).
// Plain UI; the look is M14.
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Friend } from "@/friends/friends";
import { api } from "@/lib/api-client";
import { errorText } from "./messages";

// usernameChangeableAt: when the username may change again, or null if it may now.
type AccountData = { username: string; displayName: string | null; usernameChangeableAt: string | null; allTimePoints: number };

export function Account({ onSignedOut }: { onSignedOut: () => void }) {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ account: AccountData }>("/api/account", { method: "GET" }).then(
      (r) => setAccount(r.account),
      (err) => setError(errorText(err)),
    );
  }
  useEffect(load, []);

  return (
    <section aria-label="Your account">
      <h2>Your account</h2>
      {account && (
        <>
          <p>Username: {account.username}</p>
          <Username changeableAt={account.usernameChangeableAt} onChanged={load} />
          <p>All-time points: {account.allTimePoints === 1 ? "1 point" : `${account.allTimePoints} points`}</p>
          <DisplayName initial={account.displayName} />
          <Friends />
          <SignOut onSignedOut={onSignedOut} />
          <DeleteAccount username={account.username} onDeleted={onSignedOut} />
        </>
      )}
      {!account && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      <p>
        <Link href="/">Go to today&apos;s puzzle</Link>
      </p>
    </section>
  );
}

// Changing the username (A2): once every 30 days, the first change at once. The database decides; the page says when
// the next change is allowed, and shows the refusal if it's tried earlier.
function Username({ changeableAt, onChanged }: { changeableAt: string | null; onChanged: () => void }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/profile/username", { method: "POST", body: { username: draft } });
      setDraft("");
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={change}>
      <label>
        New username
        <input value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" />
      </label>
      <button type="submit" disabled={busy}>
        Change username
      </button>
      {changeableAt && (
        <p>
          You can change it again on{" "}
          {new Date(changeableAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

// Signs out of this device, on the home page and the account page alike.
export function SignOut({ onSignedOut }: { onSignedOut: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    try {
      await api("/api/auth/sign-out", { method: "POST" });
      onSignedOut();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

// Deleting the account (12c, A4): the button stays off until the box holds the player's own username, which the server
// checks again. Everything of theirs goes (A5), and this device is signed out (A9).
function DeleteAccount({ username, onDeleted }: { username: string; onDeleted: () => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/account/delete", { method: "POST", body: { username: typed } });
      onDeleted();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={remove}>
      <h3>Delete account</h3>
      <p>
        This deletes your account and everything in it for good: your games, points, comments, reactions and friends. A
        group you made passes to its longest-standing member.
      </p>
      <label>
        Type your username to confirm
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </label>
      <button type="submit" disabled={busy || typed !== username}>
        Delete my account
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

// The optional name friends see instead of the username, changeable any time (M07 7a).
function DisplayName({ initial }: { initial: string | null }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(displayName: string | null) {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ displayName: string | null }>("/api/profile/display-name", { method: "POST", body: { displayName } });
      setSaved(result.displayName);
      setDraft(result.displayName ?? "");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void send(draft);
      }}
    >
      <label>
        Display name (optional; friends see it instead of your username)
        <input value={draft} onChange={(e) => setDraft(e.target.value)} />
      </label>
      <button type="submit" disabled={busy}>
        Save
      </button>
      {saved !== null && (
        <button type="button" disabled={busy} onClick={() => void send(null)}>
          Clear
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

// Friends, with Remove (M07 D4), and the player's own invite link (7b).
function Friends() {
  const [state, setState] = useState<{ inviteCode: string | null; friends: Friend[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    api<{ inviteCode: string | null; friends: Friend[] }>("/api/friends", { method: "GET" }).then(setState, (err) =>
      setError(errorText(err)),
    );
  }
  useEffect(load, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setCopied(false);
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
      setState((s) => s && { ...s, inviteCode });
    });
  const removeFriend = (username: string) =>
    run(async () => {
      await api("/api/friends/remove", { method: "POST", body: { username } });
      load();
    });
  const link = state?.inviteCode ? `${window.location.origin}/invite/${state.inviteCode}` : null;

  return (
    <section aria-label="Friends">
      <h2>Friends</h2>
      {state && state.friends.length === 0 && <p>No friends yet. Send someone your invite link.</p>}
      {state && state.friends.length > 0 && (
        <ul>
          {state.friends.map((f) => (
            <li key={f.username}>
              {f.name}{" "}
              <button type="button" disabled={busy} onClick={() => void removeFriend(f.username)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {state && link && (
        <p>
          Your invite link: <code>{link}</code>{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              })
            }
          >
            Copy
          </button>{" "}
          <button type="button" disabled={busy} onClick={() => void issue(true)}>
            Reset link
          </button>
          {copied && " Copied."}
        </p>
      )}
      {state && !link && (
        <button type="button" disabled={busy} onClick={() => void issue(false)}>
          Make my invite link
        </button>
      )}
      {!state && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
