import type { Metadata } from "next";
import { ButtonLink } from "./button-link";
import kit from "./kit.module.css";
import { Shell } from "./shell-page";

// Any address that isn't a page, old /offbeat links included (14c-1: no redirect), as Plor's own page in its shell,
// signed in or out, with one way home (docs/milestones/M14-14b-16-not-found.md, answers 1 to 4). Next.js answers 404
// and keeps it out of search (not-found.js, "Good to know").
export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Shell lost>
      <section className={kit.card}>
        <h2>Page not found</h2>
        <p>There&apos;s nothing at this address.</p>
        <ButtonLink href="/" className={kit.primary}>
          Go to Today
        </ButtonLink>
      </section>
    </Shell>
  );
}
