// The game's record (docs/milestones/M14-14b-4-game-name-record.md; human, 2026-10-26: "One place, in 14c-1", "Build
// it now, as Offbeat"): its permanent ID, stored with every run, run event, ledger row, comment and reaction
// (DECISIONS.md: Game 1), the name players see, and its address. The ID never changes ("Keep it (Recommended)"); the
// name and the address change freely, and the route folder, `src/app/(shell)/play/`, is renamed by hand with the
// address ("Rename by hand at N1"). Both are working ones until the game's design names it (docs/milestones/M14-14c-2-neutral-words.md,
// answers 12 and 13: "game number 1", "/play"). No imports, so the scripts
// can load it as the app does.
export const GAME = { id: "offbeat", name: "Game number 1", path: "/play" } as const;

// The ID under the name the queries use.
export const GAME_ID = GAME.id;

// Game 2's permanent ID (human, 2026-11-06: "substrings (Recommended)"). Its name and address join a record when
// something shows them (docs/milestones/M16-16c-a-day-of-game-2.md).
export const SUBSTRINGS_ID = "substrings";
