"use client";

import { useCallback, useSyncExternalStore } from "react";

// Whether the window is at least this wide, following resizes. The server's answer is false; the pages that use it
// render on the client, behind Suspense.
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
