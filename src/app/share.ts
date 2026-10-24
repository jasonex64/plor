// Sharing a link, for the result's Share (M05, S4) and the invite link's (docs/milestones/M12-12f-review-fixes.md, F1):
// the phone's share sheet where the browser has one (MDN, Navigator.share), otherwise the clipboard (MDN,
// Clipboard.writeText). True when it was copied, so the caller can say so. A cancelled sheet rejects with AbortError,
// which isn't a failure (MDN); anything else is thrown for the caller to show.
export async function shareLink(text: string, url: string): Promise<boolean> {
  if (typeof navigator.share !== "function") {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return true;
  }
  try {
    await navigator.share({ text, url });
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) throw err;
  }
  return false;
}
