"use client";

// The Undo toast (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b): comments and reactions show at once and are
// held for UNDO_SECONDS before they're sent (src/lib/hold.ts). It lives in the frame that stays across pages (14b-6a),
// so a held action outlives the section that made it; leaving the page, by another address or by closing the tab,
// sends it at once (P1).
import { usePathname } from "next/navigation";
import { createContext, Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
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
  useEffect(() => {
    const leave = () => holder.flush(true);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [holder]);
  return (
    <UndoContext value={holder}>
      {children}
      {/* Reads the address bar, so behind its own Suspense: the frame itself mustn't (src/app/home.tsx, Frame). */}
      <Suspense fallback={null}>
        <SendOnLeaving holder={holder} />
      </Suspense>
      <div className={styles.place}>
        {/* Always in the page, so screen readers announce what appears in it (WCAG 2.2, 4.1.3 Status messages). */}
        <div role="status" className={styles.toast}>
          {toast.error && (
            <p className={styles.line}>
              <span>{toast.error}</span>
              <button type="button" onClick={holder.dismiss}>
                Close
              </button>
            </p>
          )}
          {toast.held && (
            <p className={styles.line}>
              <span>
                {toast.held}
                <span aria-hidden="true"> ·</span>
              </span>
              <button type="button" onClick={holder.undo}>
                Undo
              </button>
            </p>
          )}
        </div>
      </div>
    </UndoContext>
  );
}

// Changes shown over a section's loaded data while their actions are held and sent, each let go when its action
// settles: sent (after the section has loaded the data again, so nothing flickers), undone, replaced or failed. This
// is what useOptimistic does, without a transition left open for the window: React batches pending transitions, so a
// held one kept a navigation from finishing until the window ended (14b-6b's e2e: the address stayed on /updraft).
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
