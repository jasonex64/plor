import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { KeepTheme } from "./keep-theme";
import { THEME_SCRIPT } from "./theme";

export const metadata: Metadata = {
  title: "Plor",
  description: "A daily social word game.",
};

// The shell's fonts (docs/milestones/M14-look-and-feel.md, L4) as files in the repo, so no build downloads them
// (docs/milestones/M14-14b-5-local-fonts.md: three CI runs failed when fonts.gstatic.com didn't answer), and exposed
// as CSS variables (DECISIONS.md: Styling). They're Google Fonts' Latin files with their OFL licences beside them
// (src/app/fonts/; SOURCES.md, Google Fonts). DM Sans is one variable file, declared at 400 and 700 as Google's CSS
// declares it.
const heading = localFont({ src: "./fonts/Baloo2-800-latin.woff2", weight: "800", variable: "--font-heading" });
const body = localFont({
  src: [
    { path: "./fonts/DMSans-latin.woff2", weight: "400" },
    { path: "./fonts/DMSans-latin.woff2", weight: "700" },
  ],
  variable: "--font-body",
});

// The theme a player picked is applied before the first paint from this browser's copy (src/app/theme.ts), so <html>'s
// data-theme may differ from the server's render, which suppressHydrationWarning accepts (Next.js, "Preventing flash
// before hydration").
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <KeepTheme />
        {children}
      </body>
    </html>
  );
}
