// The player's theme on the page (docs/milestones/M14-14b-1-themes.md): <html data-theme="…"> for a picked one, none
// to follow the device. The account holds the theme; this browser keeps a copy under THEME_KEY, which THEME_SCRIPT
// applies in <head> before the first paint (Next.js, "Preventing flash before hydration", Themes; human, 2026-10-25:
// "Add it, copy in localStorage (Recommended)").
import type { Theme } from "@/lib/profile";

export const THEME_KEY = "plor.theme";

// Storage that can't be read holds no copy, so the page shows the device's theme until the profile loads and the frame
// applies the account's (the guide's own try/catch).
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

// This browser's copy, as THEME_SCRIPT reads it, or null when there's none or storage can't be read (the script's
// try/catch).
export function themeCopy(): string | null {
  try {
    return window.localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

// Applies the account's theme and keeps this browser's copy in step; null (signed out, or no profile yet) clears both.
export function applyTheme(theme: Theme | null): void {
  const html = document.documentElement;
  const picked = theme !== null && theme !== "device" ? theme : null;
  if (picked) html.setAttribute("data-theme", picked);
  else html.removeAttribute("data-theme");
  try {
    if (picked) window.localStorage.setItem(THEME_KEY, picked);
    else window.localStorage.removeItem(THEME_KEY);
  } catch {
    // No copy can be kept: the next load paints the device's theme until the profile loads, as on a new device.
  }
}
