import Link from "next/link";

// Every page's footer: the privacy policy, and the About page with its credits (docs/milestones/M14-14b-1-themes.md;
// human, 2026-10-25: "Settings and footers (Recommended)"). Static, so signed-out visitors and Google's brand check
// see it in the served HTML (M02 2c).
export function Footer() {
  return (
    <footer>
      <p>
        <Link href="/privacy">Privacy policy</Link> · <Link href="/about">About Plor</Link>
      </p>
    </footer>
  );
}
