// A board's order (M09 D4), shared by the server's boards and the screen, which ranks the overall board's Average itself
// (M16 16e-3b, answer 29): highest first, ties alphabetically by name, then by username so the order is stable.
export function ranked<T extends { name: string; username: string }>(entries: T[], score: (e: T) => number): T[] {
  return entries.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name) || a.username.localeCompare(b.username));
}
