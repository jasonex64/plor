// The game's record (docs/milestones/M14-14b-4-game-name-record.md; human, 2026-10-26: "One place, in 14c-1", "Build
// it now, as Offbeat"): its permanent ID, stored with every run, run event, ledger row, comment and reaction
// (DECISIONS.md: Game 1), the name players see, and its address. The ID never changes ("Keep it (Recommended)"); the
// name and the address change freely: 14c-1's N1 named the game Updraft (human, 2026-10-27: "Updraft (Recommended)"),
// and the route folder, `src/app/(shell)/updraft/`, is renamed by hand with the address ("Rename by hand at N1"). One game: a list comes with M16's game 2. No imports, so the scripts can load
// it as the app does.
export const GAME = { id: "offbeat", name: "Updraft", path: "/updraft" } as const;

// The ID under the name the queries use.
export const GAME_ID = GAME.id;
