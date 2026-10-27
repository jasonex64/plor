import { Suspense } from "react";
import { Footer } from "../footer";
import { Frame } from "../home";
import { PageSkeleton } from "../skeleton";

// Every player page's frame, kept across navigations so a tab switch swaps only the page's own section and the shell
// never leaves the screen (docs/milestones/M14-14b-6-feel-and-polish.md, design 1; Next.js, loading.js: "Shared
// layouts remain interactive while new route segments load"). The heading and the footer are static, in the served
// HTML before any script runs (M02 ticket, 2c); the frame reads the session and the address bar, so it renders on the
// client behind Suspense (node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
export default function ShellLayout({ children }: LayoutProps<"/">) {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Frame>{children}</Frame>
      </Suspense>
      <Footer />
    </main>
  );
}
