// Plor's own list beside LDNOOBW (docs/milestones/M13-13e-9b-the-word-list.md): slurs and insults LDNOOBW doesn't
// list, held wherever LDNOOBW's words are and dropped from every set at load (human, 2026-10-27: "Plor's own list
// (Recommended)"). Whole words and phrases, as LDNOOBW's are matched, so each plural and compound is its own entry.
// The Latin "caffer" and "caffra" stay off it, so species keep their formal names ("Keep Latin names (Recommended)").
// An insult goes on it when dropping its item alone would let players' misses bring it back (13e-10: "Add it to
// Plor's list (Recommended)"); "quack" stays off, as a duck's sound already keeps it out of the doctor category.
export const PLOR_LISTED: readonly string[] = [
  "kaffir", "kaffirs", "kafir", "kafirs", "kaffer", "kaffers", "caffre", "caffres", "kafferboom", "kafferbooms",
  "caffer cat", "caffer cats", "ambulance chaser", "ambulance chasers",
];
