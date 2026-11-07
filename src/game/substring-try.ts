// What a typed try becomes before the database judges it (DECISIONS.md, Game 2, "Matching and showing"). Relative
// imports, as scripts/base.ts uses this too.
import { normalize } from "../content/puzzle.ts";

// A try's letters alone: "app3le" is apple, and "well---known" and "well known" are wellknown. normalize stays as it
// is for game 1, which matches through it and keeps digits, so the last step is game 2's own.
export const tryKey = (typed: string) => normalize(typed).replace(/[^a-z]/g, "");

// The text the shown spelling's steps read: digits, symbols and spaces out, apostrophes and hyphens kept, so a player's
// "he's" stands, and "caf3e" reads as cafe.
export const cleanedTry = (typed: string) => typed.normalize("NFC").toLowerCase().trim().replace(/[^\p{L}'-]/gu, "");

export const plainText = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "");
