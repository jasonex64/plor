import { Suspense } from "react";
import { FragmentsTestScreen } from "../../../../fragments-test";
import { Signed } from "../../../../home";
import { PageSkeleton } from "../../../../skeleton";
import { Slide } from "../../../../slide";

// A test run of a Fragments day (docs/milestones/M15-15f-fragments-test-run.md, 15f-2), as /admin/test is Offbeat's: an
// admin plays it on the game screen and nothing is saved. The page shows nothing private: the run comes from
// POST /api/admin/test/substrings, which checks the admin. params is runtime data under Cache Components, so it's read
// inside the page's own Suspense boundary, as /admin/test's is.
export default function Page({ params }: PageProps<"/admin/test2/[date]">) {
  return (
    <Slide>
      <Suspense fallback={<PageSkeleton />}>
        <WithDate params={params} />
      </Suspense>
    </Slide>
  );
}

async function WithDate({ params }: Pick<PageProps<"/admin/test2/[date]">, "params">) {
  const { date } = await params;
  return (
    <Signed>
      <FragmentsTestScreen date={date} />
    </Signed>
  );
}
