// Plor's own list beside LDNOOBW (docs/milestones/M13-13e-9b-the-word-list.md): slurs and insults LDNOOBW doesn't
// list, held wherever LDNOOBW's words are and dropped from every set at load (human, 2026-10-27: "Plor's own list
// (Recommended)"). Whole words and phrases, as LDNOOBW's are matched, so each plural and compound is its own entry.
// The Latin "caffer" and "caffra" stay off it, so species keep their formal names ("Keep Latin names (Recommended)").
// An insult goes on it when dropping its item alone would let players' misses bring it back (13e-10: "Add it to
// Plor's list (Recommended)"); "quack" stays off, as a duck's sound already keeps it out of the doctor category.
// A slur that's also part of official place or species names (Squaw Lake, Hottentot Teal) goes on as the phrases that
// hold it in the base, not the bare word (13e-11: "Just the two phrases (Recommended)"). Crude and slang names players
// shouldn't be credited for go on too, so a miss can't bring them back (13f-1: "gypsy cab", "whorehouse", doctor slang,
// "torture chamber"; "List it too" for "shrink", whose only other use, "shrink-wrap", keeps its hyphen in the base;
// 13f-2: "Saturday night special" and "abortionist", which no other thing bears; toy's racist caricature and sex
// toys, cosmetic's blackface: "no sex toys and racist caricatures", "Yes, without blackface (Recommended)").
export const PLOR_LISTED: readonly string[] = [
  "kaffir", "kaffirs", "kafir", "kafirs", "kaffer", "kaffers", "caffre", "caffres", "kafferboom", "kafferbooms",
  "caffer cat", "caffer cats", "ambulance chaser", "ambulance chasers", "old squaw", "old squaws", "hottentot bread",
  "hottentot breads", "hottentots bread", "hottentots breads", "gypsy cab", "gypsy cabs", "whorehouse", "whorehouses",
  "headshrinker", "headshrinkers", "sawbones", "shrink", "shrinks", "torture chamber", "torture chambers",
  "saturday night special", "saturday night specials", "abortionist", "abortionists", "golliwog", "golliwogs", "golliwogg",
  "golliwoggs",
  "blackface", "blackfaces", "sex toy", "sex toys", "adult toy", "adult toys",
];
