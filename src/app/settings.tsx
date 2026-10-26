"use client";

// The settings sheet (docs/milestones/M14-14a-3b-settings.md; M14 L44), opened from the shell's gear: a sheet at the
// bottom on phones and a side panel from 768px, as round 7 draws them. It holds the account (M12 12a, 12b, 12c: the
// username, once every 30 days; the display name friends see, M07 7a; Sign out; Delete account) and the two settings,
// Skip the game screen (L39) and Numbers on the calendar (L46), saved on the account; and the theme
// (docs/milestones/M14-14b-1-themes.md; L21, L47), with links to the privacy and About pages.
//
// A modal <dialog> opened with showModal() (MDN <dialog>, SOURCES.md): the page behind is inert, focus starts on the
// first focusable element, Close, and Escape closes it. The tap on the dimmed page is a click whose target is the
// dialog itself, since the sheet's content fills it (closedby="any" isn't in Safari).
import { ButtonLink } from "./button-link";
import { useState, type FormEvent, type ReactNode, type RefObject } from "react";
import type { Profile, Settings, Theme } from "@/lib/profile";
import { api } from "@/lib/api-client";
import { errorText } from "./messages";
import styles from "./settings.module.css";

export function SettingsSheet({
  dialog,
  profile,
  onChanged,
  onSettings,
  onSignedOut,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  profile: Profile;
  // The username or display name changed: the profile is read again.
  onChanged: () => void;
  onSettings: (settings: Settings) => void;
  onSignedOut: () => void;
}) {
  const close = () => dialog.current?.close();
  // Leaving the account closes the sheet first, so no modal dialog is left in the top layer.
  const signedOut = () => {
    close();
    onSignedOut();
  };
  return (
    <dialog
      ref={dialog}
      aria-labelledby="settings-title"
      className={styles.dialog}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className={styles.sheet}>
        <span className={styles.handle} aria-hidden="true" />
        <div className={styles.top}>
          <h2 id="settings-title" className={styles.title}>
            Settings
          </h2>
          <button type="button" className={styles.close} aria-label="Close settings" onClick={close}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <dl className={styles.fields}>
          <Username username={profile.username} changeableAt={profile.usernameChangeableAt} onChanged={onChanged} />
          <DisplayName name={profile.displayName} onChanged={onChanged} />
        </dl>
        <Preferences settings={profile.settings} onSettings={onSettings} />
        {/* About and the privacy policy in a box like Delete account's (human, 2026-10-26: "make it a little bubble thing
            like thedelete account"; docs/milestones/M14-14b-2b-1-shell.md, criterion 3). */}
        <div className={styles.about}>
          <p className={styles.aboutText}>
            <strong>About and privacy</strong>
            <span className={styles.muted}>What Plor is, its credits, and how your data is used.</span>
          </p>
          <div className={styles.aboutButtons}>
            <ButtonLink href="/about" onClick={close}>
              About Plor
            </ButtonLink>
            <ButtonLink href="/privacy" onClick={close}>
              Privacy policy
            </ButtonLink>
          </div>
        </div>
        <div className={styles.end}>
          <SignOut onSignedOut={signedOut} />
          <DeleteAccount username={profile.username} onDeleted={signedOut} />
        </div>
      </div>
    </dialog>
  );
}

// A field's row: its name, its value and the button that opens its form in that row (human, 2026-10-25: "Open the
// form in place (Recommended)").
function Field({ name, value, action, editing, onEdit, children }: {
  name: string;
  value: string;
  action: string;
  editing: boolean;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <dt className={styles.muted}>{name}</dt>
      <dd>
        {editing ? (
          children
        ) : (
          <>
            <strong>{value}</strong>{" "}
            <button type="button" className={styles.inline} onClick={onEdit}>
              {action}
              <span className={styles.sr}> {name.toLowerCase()}</span>
            </button>
          </>
        )}
      </dd>
    </div>
  );
}

// Changing the username (M12 A2): once every 30 days, the first change at once. The database decides; the row says
// when the next change is allowed, and the form shows the refusal if it's tried earlier.
function Username({ username, changeableAt, onChanged }: { username: string; changeableAt: string | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
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
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Field name="Username" value={username} action="Change" editing={editing} onEdit={() => setEditing(true)}>
        <form onSubmit={change}>
          <label>
            New username
            {/* Lower-cased as typed, like sign-up's box (src/app/home.tsx; M12 12f, F4). */}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.toLowerCase())}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <button type="submit" disabled={busy}>
            Change username
          </button>{" "}
          <button type="button" disabled={busy} onClick={() => setEditing(false)}>
            Cancel
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      </Field>
      {changeableAt && (
        <p className={styles.note}>
          You can change it again on{" "}
          {new Date(changeableAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}.
        </p>
      )}
    </>
  );
}

// The optional name friends see instead of the username, changeable any time (M07 7a).
function DisplayName({ name, onChanged }: { name: string | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(displayName: string | null) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/profile/display-name", { method: "POST", body: { displayName } });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field
      name="Display name"
      value={name ?? "Not set"}
      action={name === null ? "Set" : "Change"}
      editing={editing}
      onEdit={() => {
        setDraft(name ?? "");
        setEditing(true);
      }}
    >
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
        </button>{" "}
        {name !== null && (
          <>
            <button type="button" disabled={busy} onClick={() => void send(null)}>
              Clear
            </button>{" "}
          </>
        )}
        <button type="button" disabled={busy} onClick={() => setEditing(false)}>
          Cancel
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </Field>
  );
}

const SWITCHES: { key: "skipGameScreen" | "calendarNumbers"; label: string; line: string }[] = [
  { key: "skipGameScreen", label: "Skip the game screen", line: "Play goes straight to question 1." },
  { key: "calendarNumbers", label: "Numbers on the calendar", line: "Show how many questions you survived each day." },
];

// The six themes (L21), each tile drawn in its own theme's background and accent through its data-theme; Follow
// device is drawn as Paper, with round 7's half-moon.
const TILES: { theme: Theme; label: string; drawn: Exclude<Theme, "device"> }[] = [
  { theme: "device", label: "Follow device", drawn: "paper" },
  { theme: "paper", label: "Paper", drawn: "paper" },
  { theme: "night", label: "Night", drawn: "night" },
  { theme: "sky", label: "Sky", drawn: "sky" },
  { theme: "moonlit", label: "Moonlit", drawn: "moonlit" },
  { theme: "ink", label: "Ink", drawn: "ink" },
];

// Round 7's two switches, in its wording (provisional, L32), and its theme picker: radio buttons, so the chosen one is
// announced as checked, and drawn with a thick outline alone (L47). Each is saved as it's changed; the page follows
// the saved value, so a refused change shows the control as it was.
function Preferences({ settings, onSettings }: { settings: Settings; onSettings: (settings: Settings) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(change: Partial<Settings>) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ settings: Settings }>("/api/profile/settings", { method: "POST", body: change });
      onSettings(r.settings);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.switches}>
      {SWITCHES.map((s) => (
        <label key={s.key} className={styles.switchRow}>
          <span>
            <strong>{s.label}</strong>
            <span className={styles.line}>{s.line}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className={styles.switch}
            checked={settings[s.key]}
            disabled={busy}
            onChange={(e) => void save({ [s.key]: e.target.checked })}
          />
        </label>
      ))}
      <fieldset className={styles.themes}>
        <legend>Theme</legend>
        <div className={styles.tiles}>
          {TILES.map((t) => (
            <label key={t.theme} className={styles.tile}>
              <input
                type="radio"
                name="theme"
                className={styles.sr}
                checked={settings.theme === t.theme}
                disabled={busy}
                onChange={() => void save({ theme: t.theme })}
              />
              <span data-theme={t.drawn} className={styles.swatch}>
                {t.theme === "device" && <span aria-hidden="true">◐ </span>}
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

// Signs out of this device (M12 A3).
function SignOut({ onSignedOut }: { onSignedOut: () => void }) {
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
      <button type="button" className={styles.secondary} onClick={signOut}>
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

// Deleting the account (M12 12c, A4): "Delete…" opens the confirm form, whose button stays off until the box holds the
// player's own username, which the server checks again. Everything of theirs goes (A5), and this device is signed out
// (A9).
function DeleteAccount({ username, onDeleted }: { username: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
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
    <section aria-label="Delete account" className={styles.danger}>
      <div className={styles.dangerHead}>
        <span>
          <strong className={styles.dangerText}>Delete account</strong>
          <span className={styles.line}>You&apos;ll be asked to confirm.</span>
        </span>
        {!open && (
          <button type="button" className={`${styles.secondary} ${styles.dangerButton}`} onClick={() => setOpen(true)}>
            Delete…
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={remove}>
          <p>
            This deletes your account and everything in it for good: your games, points, comments, reactions and friends.
            A group you made passes to its longest-standing member.
          </p>
          <label>
            Type your username to confirm
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <button type="submit" className={styles.dangerButton} disabled={busy || typed !== username}>
            Delete my account
          </button>{" "}
          <button type="button" disabled={busy} onClick={() => setOpen(false)}>
            Cancel
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
