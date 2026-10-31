"use client";

// How an open menu closes, the site's one way (docs/milestones/M14-14b-13-reactions-menu.md): Escape closes it and puts
// focus back on its button, and focus moving out of it closes it (WAI-ARIA APG, Disclosure Navigation Menu example,
// "Keyboard Support" and "Accessibility Features" item 3); a press outside it closes it too, as the admin phone menu's
// always has (14b-2c-3). The menu's root holds both its button and its panel.
import { useEffect, type RefObject } from "react";

export function useDismiss(open: boolean, close: () => void, root: RefObject<HTMLElement | null>, button: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => !root.current?.contains(event.target as Node);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      button.current?.focus();
    };
    const onLeave = (event: Event) => {
      if (outside(event)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onLeave);
    document.addEventListener("focusin", onLeave);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onLeave);
      document.removeEventListener("focusin", onLeave);
    };
  }, [open, close, root, button]);
}
