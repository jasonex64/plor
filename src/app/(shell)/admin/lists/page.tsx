import { AdminTab, Signed } from "../../../home";

// The review of the researched lists (docs/milestones/M23-23b-research-and-review.md, 23b-2). In the admin area of Plor's
// shell. The page itself shows nothing private: its data comes from the admin API, which checks the signed-in user
// against private.admin.
export default function Page() {
  return (
    <Signed>
      <AdminTab page="lists" />
    </Signed>
  );
}
