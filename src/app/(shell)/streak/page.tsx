import { Signed, StreakTab } from "../../home";

// The streak's ranks, opened from the pill in the top bar or sidebar (docs/milestones/M14-14b-2a-streak-ranks.md).
// Signed out, it shows sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Signed>
      <StreakTab />
    </Signed>
  );
}
