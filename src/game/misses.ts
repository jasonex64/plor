// Learning from misses (docs/milestones/M13-13b-learning-from-misses.md): the held-word check a miss gets before
// private.record_miss decides what it becomes.
import { normalize } from "@/content/puzzle";
import { LDNOOBW_EN } from "./ldnoobw-en";

const LISTED = LDNOOBW_EN.map(normalize).filter((w) => w !== "");

// Whether a normalized text holds a listed word or phrase as whole words, so "big butt" is held but "button" isn't
// (human, 2026-10-24: "Hold listed words (Recommended)").
export function isListed(text: string): boolean {
  const padded = ` ${text} `;
  return LISTED.some((w) => padded.includes(` ${w} `));
}
