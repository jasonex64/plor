import { ImageResponse } from "next/og";
import { squareIcon, tabIcon } from "./logo";

// Plor's icons, drawn by the app from the logo (docs/milestones/M20-design-rules-and-clean-up.md, 20g, answer 130; Next.js,
// "favicon, icon, and apple-icon" and "generateImageMetadata"): the browser tab's, him alone, and the two sizes the
// manifest names (src/app/manifest.ts), him on a white square. 32px is the tab icon's size in Next's own example; 192px
// and 512px are the two sizes web.dev's maskable-icons article and the manifest's installability checks ask for.
const TAB = 32;
// https://web.dev/articles/maskable-icon; the 20g ticket's sketch sizes (docs/milestones/M20-design-rules-and-clean-up.md).
export const MANIFEST_SIZES = [192, 512];

export function generateImageMetadata() {
  return [TAB, ...MANIFEST_SIZES].map((px) => ({ id: String(px), size: { width: px, height: px }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const px = Number(await id);
  return new ImageResponse(px === TAB ? tabIcon(px) : squareIcon(px), { width: px, height: px });
}
