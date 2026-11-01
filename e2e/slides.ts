// The view transitions a page starts, for the e2e files that check a slide's direction (M14 14b-6e; 14b-18).
import { expect, type Page } from "@playwright/test";

type Slide = { types: string[]; animations: { pseudo: string; name: string; duration: number }[] };

// Records each view transition the page starts: its types, and once it's ready the animations it runs.
export async function watchSlides(page: Page): Promise<() => Promise<Slide[]>> {
  await page.evaluate(() => {
    const w = window as unknown as { slides: Slide[] };
    w.slides = [];
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((update: Parameters<typeof start>[0]) => {
      const transition = start(update);
      const slide: Slide = { types: [...transition.types], animations: [] };
      w.slides.push(slide);
      void transition.ready.then(() => {
        slide.animations = document.getAnimations().map((a) => ({
          pseudo: (a.effect as KeyframeEffect).pseudoElement ?? "",
          name: (a as CSSAnimation).animationName,
          duration: Number(a.effect!.getTiming().duration),
        }));
      });
      return transition;
    }) as typeof document.startViewTransition;
  });
  return () => page.evaluate(() => (window as unknown as { slides: Slide[] }).slides);
}

// The new page's slide in the transition a navigation started, once its animations are known.
export async function slideOf(slides: () => Promise<Slide[]>, count: number) {
  await expect.poll(async () => (await slides()).length).toBeGreaterThanOrEqual(count);
  await expect.poll(async () => (await slides())[count - 1].animations.length).toBeGreaterThan(0);
  const slide = (await slides())[count - 1];
  return { types: slide.types, slide: slide.animations.find((a) => a.name === "slide" && a.pseudo.startsWith("::view-transition-new"))?.duration };
}
