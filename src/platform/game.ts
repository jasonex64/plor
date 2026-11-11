// The game's record (docs/milestones/M14-14b-4-game-name-record.md; human, 2026-10-26: "One place, in 14c-1", "Build
// it now, as Offbeat"): its permanent ID, stored with every run, run event, ledger row, comment and reaction
// (DECISIONS.md: Game 1), the name players see, and its address. The ID never changes ("Keep it (Recommended)"); the
// name and the address change freely, and the route folder, `src/app/(shell)/play/`, is renamed by hand with the
// address ("Rename by hand at N1"). Each game's address is its name, so a link says which game it opens once there are
// several (14c-6, answers 12 and 13); the plain games carry placeholder names, "Game 1" at /play (human, 2026-11-10:
// "use placeholder names that are simple"; docs/milestones/M14-14c-8-plain-game-1.md, answer 3). No imports, so the
// scripts can load it as the app does.
export const GAME = { id: "offbeat", name: "Game 1", path: "/play" } as const;

// The ID under the name the queries use.
export const GAME_ID = GAME.id;

// Game 2's record: its permanent ID (human, 2026-11-06: "substrings (Recommended)"), and a working name and address that
// carry no theme, as game 1's (human, 2026-11-07: "Game number 2, /play2 (Recommended)"; docs/milestones/M16-16d-playing-it.md).
export const SUBSTRINGS = { id: "substrings", name: "Game number 2", path: "/play2" } as const;

export const SUBSTRINGS_ID = SUBSTRINGS.id;

// The overall board, both games' places (M16 16e-3b, docs/milestones/M16-16e-points-and-boards.md, answer 29): a
// board's third choice beside the two games, not a game.
export const OVERALL = { id: "overall", name: "Overall" } as const;
