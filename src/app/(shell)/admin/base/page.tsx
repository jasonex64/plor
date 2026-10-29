import { AdminTab, Signed } from "../../../home";

// The answer database (docs/milestones/M13-13a-the-base.md). In the admin area of Plor's shell
// (docs/milestones/M14-14b-2b-2-admin-build.md). The page itself shows
// nothing private: its data comes from the admin APIs, which check the signed-in user against private.admin.
export default function Page() {
  return (
    <Signed>
      <AdminTab page="base" />
    </Signed>
  );
}
