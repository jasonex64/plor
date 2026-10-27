import { InviteTab, Signed } from "../../../home";

// An invite link, /i/<code> (docs/milestones/M07-friends-and-live-board.md, 7b; M14 14b-3): sign in if needed, pick a
// username if needed, then add the link's owner as a friend. The API checks the code; this page only passes it on.
// params is runtime data under Cache Components, read inside the route's Suspense boundary, its loading.tsx
// (node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md, runtime APIs).
export default async function Page({ params }: PageProps<"/i/[code]">) {
  const { code } = await params;
  return (
    <>
      <p>A friend invited you to Plor, a small site with a daily word game where friends see each other&apos;s runs.</p>
      <Signed>
        <InviteTab code={code} />
      </Signed>
    </>
  );
}
