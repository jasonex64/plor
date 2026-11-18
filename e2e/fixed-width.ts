// The width a bar fixed to both edges of the window gets: the shell's bars and the right column are fixed. It is the
// window's less the scrollbar's room the page keeps (docs/milestones/M20-design-rules-and-clean-up.md, answer 43),
// which Chromium keeps for fixed bars even with its scrollbars hidden, while clientWidth still gives the window's.
import type { Page } from "@playwright/test";

export const fixedWidth = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position: fixed; left: 0; right: 0; top: 0; height: 1px";
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  });
