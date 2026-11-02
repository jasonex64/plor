// Keeps a page from going back to older data (docs/milestones/M11-home-screen.md, H6): when loads of the same thing
// overlap (a nudge, a refetch, "Earlier day", a chip), only the newest one's answer is used. An answer, or an error,
// from a load that a newer one has replaced is dropped, so an old error can't stay up after a newer success either.
// The promise settles once the newest load's answer is handled, for a caller that waits on it (M14 14b-6b: a sent
// comment's shown copy goes once the thread is loaded again). A load a newer one replaced waits for that newer answer,
// or the copy would go before the thread that holds it lands (docs/milestones/M14-14b-20-comments-and-undo.md: the flicker).
export function latestOnly(): <T>(load: Promise<T>, onValue: (value: T) => void, onError: (err: unknown) => void) => Promise<void> {
  let newest = 0;
  let handled: Promise<void> = Promise.resolve();
  return (load, onValue, onError) => {
    const mine = ++newest;
    handled = load.then(
      (value) => {
        if (mine === newest) onValue(value);
      },
      (err) => {
        if (mine === newest) onError(err);
      },
    );
    const settled = async () => {
      // Until the newest load at the time has been handled, however many replaced it meanwhile.
      let waited: Promise<void>;
      do {
        waited = handled;
        await waited;
      } while (waited !== handled);
    };
    return settled();
  };
}
