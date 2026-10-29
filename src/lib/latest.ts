// Keeps a page from going back to older data (docs/milestones/M11-home-screen.md, H6): when loads of the same thing
// overlap (a nudge, a refetch, "Earlier day", a chip), only the newest one's answer is used. An answer, or an error,
// from a load that a newer one has replaced is dropped, so an old error can't stay up after a newer success either.
// The promise settles once the answer is handled, for a caller that waits on it (M14 14b-6b: a sent comment's
// transition ends after the thread is loaded again, so nothing flickers).
export function latestOnly(): <T>(load: Promise<T>, onValue: (value: T) => void, onError: (err: unknown) => void) => Promise<void> {
  let newest = 0;
  return (load, onValue, onError) => {
    const mine = ++newest;
    return load.then(
      (value) => {
        if (mine === newest) onValue(value);
      },
      (err) => {
        if (mine === newest) onError(err);
      },
    );
  };
}
