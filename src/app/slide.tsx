import { ViewTransition, type ReactNode } from "react";

// A page that slides when a link into a detail page, or a detail page's back button, opens or leaves it
// (docs/milestones/M14-14b-6-feel-and-polish.md, design 6, 14b-6e; node_modules/next/dist/docs/01-app/02-guides/
// view-transitions.md, Step 3). In each page.tsx, not the layout, which stays across navigations so never enters or
// exits. Only a navigation tagged nav-forward or nav-back slides: tab switches and the browser's own back don't.
const DIRECTIONS = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

export function Slide({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECTIONS} exit={DIRECTIONS} default="none">
      {children}
    </ViewTransition>
  );
}

// The navigation's direction, for <Link transitionTypes> and router.push.
export const FORWARD = ["nav-forward"];
export const BACK = ["nav-back"];
