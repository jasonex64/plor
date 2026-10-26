import { Suspense } from "react";
import { Home } from "../../home";
import { Footer } from "../../footer";

// A group's page (docs/milestones/M10-groups.md, 10b; G7): its name, members and invite link, for members only. The API
// checks membership; this page only passes the ID on.
export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <GroupHome params={params} />
      </Suspense>
      <Footer />
    </main>
  );
}

// params is runtime data under Cache Components, so it is read inside the Suspense boundary, as on the invite page.
async function GroupHome({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Home view={{ kind: "group", id }} />;
}
