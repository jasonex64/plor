// Afterglow's font, shared by the game and How to play's panel (Next.js, Font: "Using Multiple Fonts", a module that
// exports the font for each place that uses it).
import localFont from "next/font/local";

// Afterglow's one font (docs/milestones/M14-14c-4-five-themes-rebuilt.md: Handjet at weight 400, "Handjet heavier"),
// the mock's Latin file with its OFL licence beside it (src/app/fonts/OFL-Handjet.txt; licence read in 14c-4), a
// variable font. Blocked, as the mock had it, so no text shows in the fallback before the scene measures it.
export const handjet = localFont({ src: "../app/fonts/Handjet.woff2", weight: "100 900", display: "block", variable: "--afterglow-font" });
