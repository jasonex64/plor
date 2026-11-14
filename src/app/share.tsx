import { useEffect, useRef, useState } from "react";
import kit from "./kit.module.css";
import styles from "./share.module.css";

// Sharing a link, for the result's Share (M05, S4) and a group's invite link: the phone's share sheet where the browser has one (MDN, Navigator.share), otherwise the clipboard (MDN,
// Clipboard.writeText). A cancelled sheet rejects with AbortError, which isn't a failure (MDN). A clipboard the page
// may not write to rejects with NotAllowedError (MDN), and the caller shows the text to copy by hand (CopyField; docs/
// milestones/M14-14b-18-headings-today-invites-words.md, answer 9). Anything else is thrown for the caller to show.
export type Shared = "shared" | "copied" | "refused";

export async function shareLink(text: string, url: string): Promise<Shared> {
  if (typeof navigator.share !== "function") {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") return "refused";
      throw err;
    }
    return "copied";
  }
  try {
    await navigator.share({ text, url });
  } catch (err) {
    // A cancelled sheet isn't a failure (MDN). A refused one, as Safari refuses a sheet opened without the tap's
    // activation (NotAllowedError, MDN), shows the text to copy, as a refused clipboard does
    // (docs/milestones/M14-14b-22-settings-and-invites.md, answer 2).
    if (err instanceof DOMException && err.name === "NotAllowedError") return "refused";
    if (!(err instanceof DOMException && err.name === "AbortError")) throw err;
  }
  return "shared";
}

// What a refused clipboard leaves: the text, read-only and selected, ready for the device's own copy (answer 9). A link
// is one line; the result's text and link are several.
export function CopyField({ value }: { value: string }) {
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    field.current!.focus();
    field.current!.select();
  }, []);
  const lines = value.split("\n").length;
  return (
    <p>
      <label className={styles.copy}>
        Copy it from here
        {lines === 1 ? <input ref={field} readOnly value={value} /> : <textarea ref={field} readOnly rows={lines} value={value} />}
      </label>
    </p>
  );
}

// Share (M05, S4) on a finished run's result, either game's: the text is the game's share text, and the link is today's
// game at the site's root (S3), from the page's own origin so it's right on any deployment.
export function ShareResult({ text }: { text: string }) {
  const [note, setNote] = useState<string | null>(null);
  const [copy, setCopy] = useState<string | null>(null);

  async function share() {
    setCopy(null);
    const url = `${window.location.origin}/`;
    try {
      const shared = await shareLink(text, url);
      if (shared === "copied") setNote("Copied");
      if (shared === "refused") setCopy(`${text}\n${url}`);
    } catch (err) {
      setNote(`Couldn't share: ${String(err)}`);
    }
  }

  return (
    <>
      <p>
        <button type="button" className={kit.primary} onClick={share}>
          Share
        </button>{" "}
        {note && <span role="status">{note}</span>}
      </p>
      {copy && <CopyField value={copy} />}
    </>
  );
}
