import { AdminTab, Signed } from "../../../home";

// The kit's sample page (docs/milestones/M20-design-rules-and-clean-up.md, 20a). In the admin area of Plor's shell; a
// player who isn't an admin gets the admin pages' refusal (admin-area.tsx).
export default function Page() {
  return (
    <Signed>
      <AdminTab page="kit" />
    </Signed>
  );
}
