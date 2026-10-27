import { Suspense } from "react";
import { Home } from "../../home";
import { Footer } from "../../footer";

// An invite link, /i/<code> (docs/milestones/M07-friends-and-live-board.md, 7b; M14 14b-3): sign in if needed, pick a username if needed,
// then add the link's owner as a friend. The API checks the code; this page only passes it on.
export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <main>
      <h1>Plor</h1>
      <p>A friend invited you to Plor, a small site with a daily word game where friends see each other&apos;s runs.</p>
      <Suspense fallback={<p>Loading…</p>}>
        <InviteHome params={params} />
      </Suspense>
      <Footer />
    </main>
  );
}

// params is runtime data under Cache Components, so it is read inside the Suspense boundary
// (node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md, runtime APIs).
async function InviteHome({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Home view={{ kind: "invite", code }} />;
}
