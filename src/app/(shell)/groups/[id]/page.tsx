import { Suspense } from "react";
import { GroupTab, Signed } from "../../../home";
import { PageSkeleton } from "../../../skeleton";
import { Slide } from "../../../slide";

// A group's page (docs/milestones/M10-groups.md, 10b; G7): its name, members and invite link, for members only. The API
// checks membership; this page only passes the ID on. params is runtime data under Cache Components, so it is read
// inside the page's own Suspense boundary (node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md, runtime
// APIs).
export default function Page({ params }: PageProps<"/groups/[id]">) {
  return (
    <Slide>
      <Suspense fallback={<PageSkeleton />}>
        <WithCode params={params} />
      </Suspense>
    </Slide>
  );
}

async function WithCode({ params }: { params: PageProps<"/groups/[id]">["params"] }) {
  const { id } = await params;
  return (
    <Signed>
      <GroupTab id={id} />
    </Signed>
  );
}
