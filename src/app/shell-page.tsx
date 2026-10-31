import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Frame } from "./home";

// Every player page's frame: the shell's layout and the 404 page (docs/milestones/M14-14b-16-not-found.md, answer 1)
// both draw it, so there's one. The layout keeps it across navigations, so a tab switch swaps only the page's own
// section and the shell never leaves the screen (docs/milestones/M14-14b-6-feel-and-polish.md, design 1; Next.js,
// loading.js: "Shared layouts remain interactive while new route segments load"). The heading, the page's static parts
// and the footer are in the served HTML before any script runs (M02 2c); the frame keeps what reads the session or the
// address bar on the client (src/app/home.tsx, Frame).
export function Shell({ children }: { children: ReactNode }) {
  return (
    <main>
      <h1>Plor</h1>
      <Frame>{children}</Frame>
      <Footer />
    </main>
  );
}
