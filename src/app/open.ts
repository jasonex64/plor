// A part of a page that opens on a tap and is closed again on each visit (docs/milestones/M25-less-on-the-page.md,
// answers 3 and 13). A reload starts it closed by itself; a tab the player left is only hidden, with its state kept
// (node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md, "Expandable UI"), so it is closed as the page
// is hidden, in a layout effect's cleanup, before it could show open on the way back.
import { useLayoutEffect, useState } from "react";

export function useOpen(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => () => setOpen(false), []);
  return [open, setOpen];
}
