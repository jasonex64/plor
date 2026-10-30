import { Suspense } from "react";
import { Signed, TestTab } from "../../../../home";
import { PageSkeleton } from "../../../../skeleton";
import { Slide } from "../../../../slide";

// A test run of a day (docs/milestones/M14-14b-11-test-runs.md): an admin plays it on the game screen and nothing is
// saved. ?hosts= carries a draft's host answers from the admin puzzles page. The page shows nothing private: the run
// comes from POST /api/admin/test, which checks the admin. params and searchParams are runtime data under Cache
// Components, so they're read inside the page's own Suspense boundary, as the group page does.
export default function Page({ params, searchParams }: PageProps<"/admin/test/[date]">) {
  return (
    <Slide>
      <Suspense fallback={<PageSkeleton />}>
        <WithDate params={params} searchParams={searchParams} />
      </Suspense>
    </Slide>
  );
}

async function WithDate({ params, searchParams }: Pick<PageProps<"/admin/test/[date]">, "params" | "searchParams">) {
  const { date } = await params;
  const { hosts } = await searchParams;
  return (
    <Signed>
      <TestTab date={date} hosts={typeof hosts === "string" ? hosts : null} />
    </Signed>
  );
}
