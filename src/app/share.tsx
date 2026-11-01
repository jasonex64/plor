import { useEffect, useRef } from "react";
import styles from "./share.module.css";

// Sharing a link, for the result's Share (M05, S4), the invite link's (docs/milestones/M12-12f-review-fixes.md, F1) and a
// group's: the phone's share sheet where the browser has one (MDN, Navigator.share), otherwise the clipboard (MDN,
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
