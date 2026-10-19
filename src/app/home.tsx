"use client";

// Sign-in, then picking a username, then the game. Every step goes through the API;
// errors are shown to the player and never retried silently (DECISIONS.md: Error handling).
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api-client";
import { Game } from "./game";
import { messageFor, messageForRedirect } from "./messages";

type Me = { signedIn: false } | { signedIn: true; username: string | null };

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

export function Home() {
  const redirectError = useSearchParams().get("error");
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api<Me>("/api/profile", { method: "GET" }).then(setMe, (err) => setLoadError(errorText(err)));
  }, []);

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!me) return <p>Loading…</p>;
  return (
    <>
      {redirectError && !me.signedIn && <p role="alert">{messageForRedirect(redirectError)}</p>}
      {!me.signedIn ? (
        <SignIn />
      ) : me.username === null ? (
        <PickUsername onDone={(username) => setMe({ signedIn: true, username })} />
      ) : (
        <SignedIn username={me.username} onSignedOut={() => setMe({ signedIn: false })} />
      )}
    </>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(event: FormEvent) {
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

  if (sentTo) return <p>Check {sentTo} for a sign-in link. You can open it on any device.</p>;
  return (
    <section>
      <h2>Sign in to play</h2>
      <button type="button" onClick={google} disabled={busy}>
        Continue with Google
      </button>
      <form onSubmit={sendLink}>
        <label>
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>
          Email me a sign-in link
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link href="/privacy">Privacy policy</Link>
      </p>
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

function SignedIn({ username, onSignedOut }: { username: string; onSignedOut: () => void }) {
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
      <footer>
        <p>Signed in as {username}.</p>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
        {error && <p role="alert">{error}</p>}
        <p>
          <Link href="/privacy">Privacy policy</Link>
        </p>
      </footer>
    </>
  );
}
