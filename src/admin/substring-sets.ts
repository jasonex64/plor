// What the admin page and the server share about game 2's days. No server imports, as the page is client code
// (src/admin/substrings.ts holds the server's side).
export type SubstringSets = { rounds: string[]; bonusLetter: string };
export type SubstringDayView = { date: string; draft: SubstringSets | null; live: SubstringSets | null; started: boolean };

// Whether a redraft changed a day after its approval: players get the approved one until it's approved again.
export const setsDiffer = (a: SubstringSets, b: SubstringSets) => a.bonusLetter !== b.bonusLetter || a.rounds.join() !== b.rounds.join();
