"use client";

// Sign-in, then picking a username, then the game. Every step goes through the API;
// errors are shown to the player and never retried silently (DECISIONS.md: Error handling).
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api-client";
import { Game } from "./game";
import { messageFor, messageForRedirect } from "./messages";

type Me = { signedIn: false } | { signedIn: true; username: string | null; displayName: string | null };

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

export function Home() {
  const redirectError = useSearchParams().get("error");
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadMe() {
    api<Me>("/api/profile", { method: "GET" }).then(setMe, (err) => setLoadError(errorText(err)));
  }
  useEffect(loadMe, []);

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!me) return <p>Loading…</p>;
  return (
    <>
      {redirectError && !me.signedIn && <p role="alert">{messageForRedirect(redirectError)}</p>}
      {!me.signedIn ? (
        <SignIn onSignedIn={loadMe} />
      ) : me.username === null ? (
        <PickUsername onDone={(username) => setMe({ signedIn: true, username, displayName: null })} />
      ) : (
        <SignedIn username={me.username} displayName={me.displayName} onSignedOut={() => setMe({ signedIn: false })} />
      )}
    </>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
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
      <Game />
      {/* Not a <footer>: the page has one, with the privacy link (src/app/page.tsx; M02 2f, B5). */}
      <section aria-label="Account">
        <p>Signed in as {username}.</p>
        <DisplayName initial={displayName} />
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
