// How many of a question's players gave an answer (M11 H5), as the result and the Me tab's rarest answers say it
// (docs/milestones/M14-14a-3a-me.md). null: too few have answered for a share. Under 1% doesn't round to a misleading 0%.
export function givenText(share: number | null): string {
  if (share === null) return "too few players yet";
  return share < 0.01 ? "under 1% gave this" : `${Math.round(share * 100)}% gave this`;
}
