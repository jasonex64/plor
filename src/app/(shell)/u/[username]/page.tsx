import { Suspense } from "react";
import { PlayerTab, Signed } from "../../../home";
import { PageSkeleton } from "../../../skeleton";
import { Slide } from "../../../slide";

// A player's profile, /u/<username> (docs/milestones/M17-profiles-and-friend-requests.md, 17b; answer 9, E6), for
// signed-in players only (answer 1). The API decides what the viewer may see; this page only passes the name on. params
// is runtime data under Cache Components, so it is read inside the page's own Suspense boundary, as on a group's page.
export default function Page({ params }: PageProps<"/u/[username]">) {
  return (
    <Slide>
      <Suspense fallback={<PageSkeleton />}>
        <WithName params={params} />
      </Suspense>
    </Slide>
  );
}

async function WithName({ params }: { params: PageProps<"/u/[username]">["params"] }) {
  const { username } = await params;
  return (
    <Signed>
      <PlayerTab username={username} />
    </Signed>
  );
}
