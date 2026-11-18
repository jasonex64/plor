import { Suspense, type ReactNode } from "react";
import { Footer } from "./footer";
import { Frame } from "./home";
import { PAGE_BACK } from "./page-back";
import { PageName } from "./shell";

// Every player page's frame: the shell's layout and the 404 page (docs/milestones/M14-14b-16-not-found.md, answer 1)
// both draw it, so there's one. The layout keeps it across navigations, so a tab switch swaps only the page's own
// section and the shell never leaves the screen (docs/milestones/M14-14b-6-feel-and-polish.md, design 1; Next.js,
// loading.js: "Shared layouts remain interactive while new route segments load"). The heading, the page's static parts
// and the footer are in the served HTML before any script runs (M02 2c); the frame keeps what reads the session or the
// address bar on the client (src/app/home.tsx, Frame).
// lost: the 404 page, where no tab is current (Frame). The page's name joins the heading on the client, as it reads the
// address (PageName).
export function Shell({ children, lost = false }: { children: ReactNode; lost?: boolean }) {
  return (
    <main>
      {/* A detail page's Back ("‹ Groups"): beside the heading from 768px, in the top bar's wordmark's place on phones
          (docs/milestones/M20-design-rules-and-clean-up.md, answer 44; globals.css, .page-back). Filled by BackTo. */}
      <div id={PAGE_BACK} className="page-back" />
      {/* Focusable by the page's code only: where focus goes when the place it should go back to is gone
          (docs/milestones/M14-14b-21-screen-readers.md, answer 5). */}
      <h1 tabIndex={-1}>
        {/* From 768px with the shell, read and not shown: the sidebar shows "Plor" (globals.css, .site-name; M20 answer 7). */}
        <span className="site-name">Plor</span>
        <Suspense fallback={null}>
          <PageName lost={lost} />
        </Suspense>
      </h1>
      <Frame lost={lost}>{children}</Frame>
      <Footer />
    </main>
  );
}
