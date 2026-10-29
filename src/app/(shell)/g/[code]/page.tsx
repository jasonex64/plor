import { Suspense } from "react";
import { JoinGroup } from "../../../groups";
import { Signed } from "../../../home";
import { PageSkeleton } from "../../../skeleton";

// A group's invite link, /g/<code> (docs/milestones/M10-groups.md, 10b; G7; M14 14b-3): sign in if needed, pick a
// username if needed, then join. The API checks the code; this page only passes it on. params is runtime data under
// Cache Components, so it is read inside the page's own Suspense boundary, as on the invite page.
export default function Page({ params }: PageProps<"/g/[code]">) {
  return (
    <>
      <p>You were invited to a group on Plor, a small site with a daily word game. Everyone gets the same puzzle each day.</p>
      <Suspense fallback={<PageSkeleton />}>
        <WithCode params={params} />
      </Suspense>
    </>
  );
}

async function WithCode({ params }: { params: PageProps<"/g/[code]">["params"] }) {
  const { code } = await params;
  return (
    <Signed>
      <JoinGroup code={code} />
    </Signed>
  );
}
