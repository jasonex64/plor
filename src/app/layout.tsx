import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { KeepTheme } from "./keep-theme";
import { SIGNED_IN_SCRIPT } from "./signed-in";
import { THEME_SCRIPT } from "./theme";

export const metadata: Metadata = {
  title: "Plor",
  description: "A daily social word game.",
};

// Plor's one font, Baloo 2, for all text (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6d: its digits are
// tabular, the old body font's weren't), as a file in the repo so no build downloads it
// (docs/milestones/M14-14b-5-local-fonts.md: three CI runs failed when fonts.gstatic.com didn't answer), exposed as a
// CSS variable (DECISIONS.md: Styling). It's Google Fonts' one variable Latin file with its OFL licence beside it
// (src/app/fonts/; SOURCES.md, Google Fonts), declared at 400, 700 and 800 as Google's CSS declares it, so a weight
// between them renders as it did before.
const font = localFont({
  src: [
    { path: "./fonts/Baloo2-latin.woff2", weight: "400" },
    { path: "./fonts/Baloo2-latin.woff2", weight: "700" },
    { path: "./fonts/Baloo2-latin.woff2", weight: "800" },
  ],
  variable: "--font",
});

// The theme a player picked is applied before the first paint from this browser's copy (src/app/theme.ts), so <html>'s
// data-theme may differ from the server's render, which suppressHydrationWarning accepts (Next.js, "Preventing flash
// before hydration"). The sign-in mark is applied the same way (src/app/signed-in.ts).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SIGNED_IN_SCRIPT }} />
      </head>
      <body>
        <KeepTheme />
        {children}
      </body>
    </html>
  );
}
