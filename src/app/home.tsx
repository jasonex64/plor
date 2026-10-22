"use client";

// Sign-in, then picking a username, then the game, or on an invite link (/invite/<code>) the friend request. Every
// step goes through the API; errors are shown to the player and never retried silently (DECISIONS.md: Error handling).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { INVITE_CODE } from "@/friends/invite-code";
import { ApiError, api } from "@/lib/api-client";
import { Board } from "./board";
import { Comments } from "./comments";
import { Game } from "./game";
import { Leaderboard } from "./leaderboard";
import { messageFor, messageForRedirect } from "./messages";

type Me = { signedIn: false } | { signedIn: true; username: string | null; displayName: string | null };

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

// Google sign-in leaves the page and comes back to "/" (src/app/auth/callback/route.ts), so an invite link opened
// while signed out is remembered for that round trip in this tab's sessionStorage (M07 7b).
const PENDING_INVITE = "plor.pendingInvite";

export function Home({ invite }: { invite?: string }) {
  const redirectError = useSearchParams().get("error");
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadMe() {
    api<Me>("/api/profile", { method: "GET" }).then(setMe, (err) => setLoadError(errorText(err)));
  }
  useEffect(loadMe, []);

  // Back from Google with an invite pending: go back to its page. Storage that can't be read holds nothing, because
  // the write before leaving for Google would have failed and been shown to the player.
  useEffect(() => {
    if (invite || !me?.signedIn) return;
    let pending: string | null;
    try {
      pending = window.sessionStorage.getItem(PENDING_INVITE);
      window.sessionStorage.removeItem(PENDING_INVITE);
    } catch {
      return;
    }
    if (pending && INVITE_CODE.test(pending)) router.replace(`/invite/${pending}`);
  }, [invite, me, router]);

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!me) return <p>Loading…</p>;
  return (
    <>
      {redirectError && !me.signedIn && <p role="alert">{messageForRedirect(redirectError)}</p>}
      {!me.signedIn ? (
        <SignIn invite={invite} onSignedIn={loadMe} />
      ) : me.username === null ? (
        <PickUsername onDone={(username) => setMe({ signedIn: true, username, displayName: null })} />
      ) : invite ? (
        <AcceptInvite code={invite} />
      ) : (
        <SignedIn username={me.username} displayName={me.displayName} onSignedOut={() => setMe({ signedIn: false })} />
      )}
    </>
  );
}

function SignIn({ invite, onSignedIn }: { invite?: string; onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/email", { method: "POST", body: { email } });
      setSentTo(email);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  // The emailed code, not a link: mail scanners open links and use them up (docs/milestones/M02-2f-cleanup.md, A3).
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/email/verify", { method: "POST", body: { email: sentTo, code } });
      onSignedIn();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/auth/google", { method: "POST" });
      if (invite) window.sessionStorage.setItem(PENDING_INVITE, invite);
      window.location.assign(url);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <form onSubmit={verify}>
        <h2>Enter your code</h2>
        <p>We sent a sign-in code to {sentTo}.</p>
        <label>
          Code
          <input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>
          Sign in
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    );
  }
  return (
    <section>
      <h2>Sign in to play</h2>
      <button type="button" onClick={google} disabled={busy}>
        Continue with Google
      </button>
      <form onSubmit={sendCode}>
        <label>
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>
          Email me a sign-in code
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function PickUsername({ onDone }: { onDone: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ username: string }>("/api/profile", { method: "POST", body: { username } });
      onDone(created.username);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <h2>Pick a username</h2>
      <p>Your friends will see it. It can&apos;t be changed later.</p>
      <label>
        Username
        <input
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
        />
      </label>
      <button type="submit" disabled={busy}>
        Save
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function SignedIn({
  username,
  displayName,
  onSignedOut,
}: {
  username: string;
  displayName: string | null;
  onSignedOut: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [runOver, setRunOver] = useState(false);
  // Counts the board channel's nudges that comments changed (M08 8d).
  const [commentsNudge, setCommentsNudge] = useState(0);
  const nudgeComments = useCallback(() => setCommentsNudge((n) => n + 1), []);

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
      <Game onOver={setRunOver} />
      <Board username={username} onCommentsChanged={nudgeComments} />
      <Leaderboard />
      <Comments username={username} runOver={runOver} nudge={commentsNudge} />
      {/* Not a <footer>: the page has one, with the privacy link (src/app/page.tsx; M02 2f, B5). */}
      <section aria-label="Account">
        <p>Signed in as {username}.</p>
        <DisplayName initial={displayName} />
        <Friends />
        <button type="button" onClick={signOut}>
          Sign out
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    </>
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

// name is the display name if set, else the username: shown instead of the username (M07 7a; ROADMAP M07 row).
type Friend = { username: string; name: string };

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

// What an invite link opens, once signed in with a username (M07 7b).
function AcceptInvite({ code }: { code: string }) {
  const [inviter, setInviter] = useState<Friend | null>(null);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This invite is handled here, so a code remembered for a Google round trip that was cancelled is spent now;
    // otherwise the next visit to "/" would send the player back to this page (see Home). Unreadable storage holds
    // nothing to clear.
    try {
      window.sessionStorage.removeItem(PENDING_INVITE);
    } catch {}
    api<{ inviter: Friend }>(`/api/friends/preview?code=${encodeURIComponent(code)}`, { method: "GET" }).then(
      (r) => setInviter(r.inviter),
      (err) => setError(errorText(err)),
    );
  }, [code]);

  async function addFriend() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/friends/add", { method: "POST", body: { code } });
      setAdded(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Invite">
      {inviter && !added && (
        <>
          <h2>Add {inviter.name} as a friend?</h2>
          <button type="button" disabled={busy} onClick={() => void addFriend()}>
            Add friend
          </button>
        </>
      )}
      {inviter && added && <h2>You and {inviter.name} are now friends.</h2>}
      {error && <p role="alert">{error}</p>}
      <p>
        <Link href="/">Go to today&apos;s puzzle</Link>
      </p>
    </section>
  );
}
