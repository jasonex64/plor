// A place in words, as "2nd of 6 with your friends" (docs/milestones/M16-16e-points-and-boards.md, answer 3): 1st, 2nd,
// 3rd, 4th, and 11th, 12th, 13th, then 21st again.
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}
