import { JoinGroup } from "../../../groups";
import { Signed } from "../../../home";

// A group's invite link, /g/<code> (docs/milestones/M10-groups.md, 10b; G7; M14 14b-3): sign in if needed, pick a
// username if needed, then join. The API checks the code; this page only passes it on. params is runtime data under
// Cache Components, read inside the route's Suspense boundary, its loading.tsx.
export default async function Page({ params }: PageProps<"/g/[code]">) {
  const { code } = await params;
  return (
    <>
      <p>You were invited to a group on Plor, a small site with a daily word game. Everyone gets the same puzzle each day.</p>
      <Signed>
        <JoinGroup code={code} />
      </Signed>
    </>
  );
}
