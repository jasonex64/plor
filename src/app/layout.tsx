import type { Metadata } from "next";
import { Baloo_2, DM_Sans } from "next/font/google";
import "./globals.css";
import { KeepTheme } from "./keep-theme";
import { THEME_SCRIPT } from "./theme";

export const metadata: Metadata = {
  title: "Plor",
  description: "A daily social word game.",
};

// The shell's fonts (docs/milestones/M14-look-and-feel.md, L4), self-hosted by next/font so the browser asks Google
// for nothing (Next.js fonts, SOURCES.md), and exposed as CSS variables (DECISIONS.md: Styling). Young Serif, the
// game's own, comes with the first screen that uses it (14a-2).
const heading = Baloo_2({ subsets: ["latin"], weight: "800", variable: "--font-heading" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });

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
