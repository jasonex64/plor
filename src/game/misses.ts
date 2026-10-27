// Learning from misses (docs/milestones/M13-13b-learning-from-misses.md): the held-word check a miss gets before
// private.record_miss decides what it becomes, and the flag `npm run base -- review` raises on a category (13e-2).
// Relative-imported, as scripts/base.ts uses it too.
import { normalize } from "../content/puzzle.ts";
import { LDNOOBW_EN } from "./ldnoobw-en.ts";
import { PLOR_LISTED } from "./plor-listed.ts";

const words = (list: readonly string[]) => list.map(normalize).filter((w) => w !== "");
const PLOR = words(PLOR_LISTED);
const LISTED = [...words(LDNOOBW_EN), ...PLOR];

const holds = (list: string[], text: string) => list.some((w) => ` ${text} `.includes(` ${w} `));

// Whether a normalized text holds a word or phrase on either list as whole words, so "big butt" is held but "button"
// isn't (human, 2026-10-24: "Hold listed words (Recommended)"; Plor's list, 13e-9b).
export const isListed = (text: string): boolean => holds(LISTED, text);

// Whether it holds a word on Plor's list, which the load drops from every set (13e-9b). LDNOOBW's words are dropped
// only from the items data/listed.json names, as real titles and band names hold some of them.
export const isPlorListed = (text: string): boolean => holds(PLOR, text);
