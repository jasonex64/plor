import { Suspense } from "react";
import { Home } from "../../../home";
import { Footer } from "../../../footer";

// A group's invite link (docs/milestones/M10-groups.md, 10b; G7): sign in if needed, pick a username if needed, then
// join. The API checks the code; this page only passes it on.
export default function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <main>
      <h1>Plor</h1>
      <p>You were invited to a group on Plor, a small site with a daily word game. Everyone gets the same puzzle each day.</p>
      <Suspense fallback={<p>Loading…</p>}>
        <JoinHome params={params} />
      </Suspense>
      <Footer />
    </main>
  );
}

// params is runtime data under Cache Components, so it is read inside the Suspense boundary, as on the invite page.
async function JoinHome({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Home view={{ kind: "joinGroup", code }} />;
}
