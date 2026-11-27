import type { MetadataRoute } from "next";
import { MANIFEST_SIZES } from "./icon";

// The web app manifest (Next.js, "manifest.json"): the app's name and its icons, and nothing else. With no `display`, a
// phone's "Add to Home Screen" opens Plor in the browser as before (docs/milestones/M20-design-rules-and-clean-up.md, 20g,
// assumption 4). Each icon is named twice, as it is and as maskable: its drawing is inside the safe circle
// (src/app/logo-shape.test.ts), so one picture serves both.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plor",
    short_name: "Plor",
    icons: MANIFEST_SIZES.flatMap((px) =>
      (["any", "maskable"] as const).map((purpose) => ({ src: `/icon/${px}`, sizes: `${px}x${px}`, type: "image/png", purpose })),
    ),
  };
}
