"use client";

// Re-applies this browser's copy of the theme on every page, after React's development remount clears the attribute
// the <head> script set (Next.js, "Preventing flash before hydration", "Re-applying attributes in development"; a
// no-op in production). Home then applies the account's own once the profile loads (src/app/home.tsx).
import { useLayoutEffect } from "react";
import { themeCopy } from "./theme";

export function KeepTheme() {
  useLayoutEffect(() => {
    const copy = themeCopy();
    if (copy) document.documentElement.setAttribute("data-theme", copy);
  }, []);
  return null;
}
