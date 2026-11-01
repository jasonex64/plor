import { Suspense } from "react";
import { InviteTab, Signed } from "../../../home";
import { PageSkeleton } from "../../../skeleton";

// An invite link, /i/<code> (docs/milestones/M07-friends-and-live-board.md, 7b; M14 14b-3): sign in if needed, pick a
// username if needed, then add the link's owner as a friend. The API checks the code; this page only passes it on.
// params is runtime data under Cache Components, so it is read inside the page's own Suspense boundary
// (node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md, runtime APIs).
export default function Page({ params }: PageProps<"/i/[code]">) {
  return (
    <>
      {/* Not on the player's own link (globals.css, body[data-own-invite]). */}
      <p data-invite-line>A friend invited you to Plor, a small site with a daily word game where friends see each other&apos;s runs.</p>
      <Suspense fallback={<PageSkeleton />}>
        <WithCode params={params} />
      </Suspense>
    </>
  );
}

async function WithCode({ params }: { params: PageProps<"/i/[code]">["params"] }) {
  const { code } = await params;
  return (
    <Signed>
      <InviteTab code={code} />
    </Signed>
  );
}
