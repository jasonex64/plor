// Afterglow's font, shared by the game and How to play's panel (Next.js, Font: "Using Multiple Fonts", a module that
// exports the font for each place that uses it).
import localFont from "next/font/local";

// Afterglow's one font (docs/milestones/M14-14c-4-five-themes-rebuilt.md: Handjet at weight 400, "Handjet heavier"),
// the mock's Latin file with its OFL licence beside it (src/app/fonts/OFL-Handjet.txt; licence read in 14c-4), a
// variable font. Blocked, as the mock had it, so no text shows in the fallback before the scene measures it.
// No adjusted fallback face (next/font/local's default is one from local("Arial"), Font: adjustFontFallback): where
// Arial isn't installed, as on CI's Linux, that face fails, and so does the scene's document.fonts.load of the family,
// which puts its fault over the game (PR #172's first e2e run). The fallback is the CSS's own (afterglow.module.css).
export const handjet = localFont({ src: "../app/fonts/Handjet.woff2", weight: "100 900", display: "block", variable: "--afterglow-font", adjustFontFallback: false });
