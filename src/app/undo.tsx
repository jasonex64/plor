"use client";

// The Undo toast (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b): comments and reactions show at once and are
// held for UNDO_SECONDS before they're sent (src/lib/hold.ts). It lives in the frame that stays across pages (14b-6a),
// so a held action outlives the section that made it; leaving the page, by another address or by closing the tab,
// sends it at once (P1).
import { usePathname } from "next/navigation";
import { createContext, Suspense, use, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { UNDO_SECONDS } from "@/config/tunables";
import { createHolder, type Holder, type Toast } from "@/lib/hold";
import { errorText } from "./messages";
import styles from "./undo.module.css";

const UndoContext = createContext<Holder | null>(null);

export function useUndo(): Holder {
  const holder = use(UndoContext);
  if (!holder) throw new Error("useUndo outside UndoProvider");
  return holder;
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>({ held: null, error: null });
  const [holder] = useState(() => createHolder(UNDO_SECONDS * 1000, setToast, errorText));
  // Each hold draws its line anew, so a live region reads the same words again ("Comment posted" twice)
  // (docs/milestones/M14-14b-21-screen-readers.md).
  const [holds, setHolds] = useState(0);
  const value = useMemo<Holder>(
    () => ({
      ...holder,
      hold: (action) => {
        setHolds((n) => n + 1);
        return holder.hold(action);
      },
    }),
    [holder],
  );
  // Where the player was before the toast, so Undo and Close put focus back there, or on the page's heading if it's
  // gone (answers 2 and 5): the last thing focused outside the toast.
  const toastBox = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const seen = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && !toastBox.current?.contains(event.target)) before.current = event.target;
    };
    document.addEventListener("focusin", seen);
    return () => document.removeEventListener("focusin", seen);
  }, []);
  function back(action: () => void) {
    action();
    const place = before.current;
    // Without scrolling, so the page stays where the player was (docs/milestones/M14-14b-23-small-jumps-and-finds.md, answer 8).
    if (place?.isConnected && place.checkVisibility()) place.focus({ preventScroll: true });
    else document.querySelector<HTMLElement>("main > h1")!.focus({ preventScroll: true });
  }
  useEffect(() => {
    const leave = () => holder.flush(true);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [holder]);
  return (
    <UndoContext value={value}>
      {children}
      {/* Reads the address bar, so behind its own Suspense: the frame itself mustn't (src/app/home.tsx, Frame). */}
      <Suspense fallback={null}>
        <SendOnLeaving holder={holder} />
      </Suspense>
      <div ref={toastBox} className={styles.place}>
        {/* Both always in the page, so screen readers announce what appears in them (WCAG 2.2, 4.1.3 Status messages):
            a failure at once, as an alert; what's held, as a status (answer 3). */}
        <div className={styles.toast}>
          <div role="alert">
            {toast.error && (
              <p className={styles.line}>
                <span>{toast.error}</span>
                <button type="button" onClick={() => back(holder.dismiss)}>
                  Close
                </button>
              </p>
            )}
          </div>
          <div role="status">
            {toast.held && (
              <p key={holds} className={styles.line}>
                <span>
                  {toast.held}
                  <span aria-hidden="true"> ·</span>
                </span>
                <button type="button" onClick={() => back(holder.undo)}>
                  Undo
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </UndoContext>
  );
}

// Changes shown over a section's loaded data while their actions are held and sent, each let go when its action
// settles: sent (after the section has loaded the data again, so nothing flickers), undone, replaced or failed. This
// is what useOptimistic does, without a transition left open for the window: React batches pending transitions, so a
// held one kept a navigation from finishing until the window ended (14b-6b's e2e: the address stayed on the game screen's).
export function useHeldChanges<T, C>(base: T, apply: (value: T, change: C) => T): [T, (change: C, settled: Promise<unknown>) => void] {
  const [changes, setChanges] = useState<{ key: number; change: C }[]>([]);
  const next = useRef(0);
  function show(change: C, settled: Promise<unknown>) {
    const key = next.current++;
    setChanges((shown) => [...shown, { key, change }]);
    void settled.finally(() => setChanges((shown) => shown.filter((c) => c.key !== key)));
  }
  return [changes.reduce((value, c) => apply(value, c.change), base), show];
}

// Another address is leaving the page too (P1), though the frame stays.
function SendOnLeaving({ holder }: { holder: Holder }) {
  const path = usePathname();
  const shown = useRef(path);
  useEffect(() => {
    if (path === shown.current) return;
    shown.current = path;
    holder.flush(true);
  }, [path, holder]);
  return null;
}
