import { GroupTab, Signed } from "../../../home";

// A group's page (docs/milestones/M10-groups.md, 10b; G7): its name, members and invite link, for members only. The API
// checks membership; this page only passes the ID on. params is runtime data under Cache Components, read inside the
// route's Suspense boundary, its loading.tsx (node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md,
// runtime APIs).
export default async function Page({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  return (
    <Signed>
      <GroupTab id={id} />
    </Signed>
  );
}
