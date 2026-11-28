import { ImageResponse } from "next/og";
import { squareIcon } from "./logo";

// The icon a phone puts on its home screen (M20 20g, answer 130): the logo on a white square. 180px is the size Apple's
// touch icon is asked for at (the 20g ticket's sketch sizes; Apple HIG, app icons, SOURCES.md).
const PX = 180;
export const size = { width: PX, height: PX };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(squareIcon(PX), size);
}
