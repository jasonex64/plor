import type { Metadata } from "next";
import { Baloo_2, DM_Sans } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plor",
  description: "A daily social word game.",
};

// The shell's fonts (docs/milestones/M14-look-and-feel.md, L4), self-hosted by next/font so the browser asks Google
// for nothing (Next.js fonts, SOURCES.md), and exposed as CSS variables (DECISIONS.md: Styling). Young Serif, the
// game's own, comes with the first screen that uses it (14a-2).
const heading = Baloo_2({ subsets: ["latin"], weight: "800", variable: "--font-heading" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
