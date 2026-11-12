// The About page shows the notices the English Speller Database's licence requires of game 2's dictionary: its top
// notice and UKACD's, the latter verbatim (docs/milestones/M16-game-2-substrings.md, acceptance criterion on the About
// page; docs/SOURCES.md, English Speller Database). The expected text is cut from the licence file by its line numbers
// here, not by the page's own code, so a wrong cut shows up as a failed comparison.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import About from "./page";

const lines = readFileSync(new URL("../../../data/licences/english-speller-database-Copyright.txt", import.meta.url), "utf8").split("\n");
// 1-based, inclusive: the top notice is lines 1-22 (the "===" is line 24), UKACD's section lines 58-69 ("=== UKACD" is line 56, "=== WordNet" line 71).
const slice = (from: number, to: number) => lines.slice(from - 1, to).join("\n");
const TOP_NOTICE = slice(1, 22);
const UKACD_NOTICE = slice(58, 69);

const unescape = (html: string) => html.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const shown = [...renderToStaticMarkup(createElement(About)).matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map((m) => unescape(m[1]));

it("shows the licence's top notice and UKACD's notice, character for character", () => {
  expect(shown).toEqual([TOP_NOTICE, UKACD_NOTICE]);
});
