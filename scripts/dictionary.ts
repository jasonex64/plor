// Game 2's dictionary (docs/milestones/M16-16a-the-dictionary.md): `npm run base -- fetch dictionary` merges ENABLE,
// Moby's crossword lists and the English Speller Database into one list. Downloads are pinned by checksum (SOURCES.md).
// Sources are untrusted input from the network, so a changed file stops the fetch instead of changing the game.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DICTIONARY_MAX_SIZE, DICTIONARY_MIN_LETTERS } from "../src/config/tunables.ts";
import { normalize } from "../src/content/puzzle.ts";
import { isListed, isListedWord } from "../src/game/misses.ts";

const RAW = "https://raw.githubusercontent.com";
const MOBY = "https://www.gutenberg.org/files/3201/files";
export const DICTIONARY_FILES = {
  enable: { url: `${RAW}/dolph/dictionary/694bf9529e986f9175dcbf5fe5875d111941b708/enable1.txt`, sha256: "3f16130220645692ed49c7134e24a18504c2ca55b3c012f7290e3e77c63b1a89" },
  mobyCrossword: { url: `${MOBY}/crosswd.txt`, sha256: "b134e7aba7aaeb79bbc1db45d13ddcd0b9399b780b74fbe9a81c0949575a3ce7" },
  mobyDelta: { url: `${MOBY}/crswd-d.txt`, sha256: "3abad4ac7b7fb73fc3eb2cc7eb2c5d2e1c6f6aa2a05727f3e332162a762a9b7d" },
  scowl: { url: `${RAW}/en-wl/wordlist-diff/71d7dd07676edb60ade43552e10b41314b7e9287/scowl.txt`, sha256: "3da811b80d7163069e9676537845c49161a33505f24ad6bfcead92fe2cf10e41" },
} as const;


// Words Claude read and took out (answer 2): forms and slurs no list names. They live here, not on Plor's list, as that
// list also drops names from the answer base at load, and game 1's data shouldn't change for game 2.
export const DICTIONARY_DROP_FILE = "data/dictionary-drop.json";

export const DICTIONARY_METHOD = `ENABLE, Moby's crosswd.txt and crswd-d.txt, and the English Speller Database's scowl.txt to size ${DICTIONARY_MAX_SIZE} (SOURCES.md, pinned by SHA-256), through normalize; a to z, ${DICTIONARY_MIN_LETTERS} letters or more; no proper nouns, abbreviations, word parts or misspellings; every SCOWL group holding a listed word, a word in ${DICTIONARY_DROP_FILE}, or an offensive or vulgar note is out`;

// One group is one sense of a word (the table's README, "GROUP"). `words` are the ones a player may type; `all` is
// every spelling on its lines, kept so one listed word takes its whole group with it.
export type ScowlGroup = { words: string[]; all: string[]; marked: boolean };

// Not words a player would type (README, "POSes"), and classes that mark proper nouns the capital check can miss.
const NOT_WORDS = new Set(["abbr", "pre", "suf", "wp", "we", "x"]);
const PROPER_CLASSES = new Set(["person", "surname", "place", "name", "name?", "demonym", "trademark", "abbr", "abbr?", "upper", "upper?"]);
const PROPER_TAGS = /\[(name|lcacr|ucacr)\]/;
const OFFENSIVE_NOTE = /\((offensive|vulgar)-\d\)/;
const VARIANT = /^((?:[ABZCD_][.=?v~V@x-]? ?)+(?:\{\d+\})?|\+): (.*)$/;

// A word with its marks taken off, or null when the marks say to leave it out: "!" is "nearly non-existent", and "-"
// alone holds a missing form's place (README, "ANNOTATION"). "-", "@", "~" and "*" stay, as answer 1 chose breadth.
function bare(token: string): string | null {
  const word = token.trim().replace(/†/g, "");
  if (word === "-" || word === "" || word.startsWith("!") || word.endsWith("!")) return null;
  return word.replace(/^[-@]/, "").replace(/[*\-@~]$/, "");
}

// The derived forms after a lemma, with "(A: one | B: other)" alternatives opened up. Commas inside parentheses
// don't split, and a form whose variant level is "x" is a misspelling (README, "VARIANT-LEVEL").
function derived(entries: string): string[] {
  const out: string[] = [];
  for (const entry of entries.split(/,\s*(?![^()]*\))/)) {
    const open = entry.trim().replace(/^\(|\)$/g, "");
    for (const alternative of open.split("|")) {
      const colon = alternative.lastIndexOf(":");
      if (colon >= 0 && alternative.slice(0, colon).split(" ").some((info) => info.endsWith("x"))) continue;
      const word = bare(alternative.slice(colon + 1));
      if (word !== null) out.push(word);
    }
  }
  return out;
}

const spellings = (lemma: string | null, entries: string) => (lemma === null ? [] : [lemma]).concat(entries ? derived(entries) : []);

// A normalized word a player may type, or null. A space means a phrase; anything else `normalize` leaves outside a to
// z (a digit) isn't a word.
function playable(word: string): string | null {
  if (/\s/.test(word)) return null;
  const text = normalize(word);
  return /^[a-z]+$/.test(text) && text.length >= DICTIONARY_MIN_LETTERS ? text : null;
}

function readLine(line: string): { words: string[]; all: string[]; marked: boolean } | null {
  const text = line.split("#")[0].trimEnd();
  const head = /^(\d[^:]*): (.*)$/.exec(text);
  if (!head) return null;
  const info = head[1];
  const variant = VARIANT.exec(head[2]);
  const rest = variant ? variant[2] : head[2];
  const colon = rest.indexOf(": ");
  const lemmaInfo = colon < 0 ? rest.replace(/:$/, "") : rest.slice(0, colon);
  const entries = colon < 0 ? "" : rest.slice(colon + 2);
  const [, pos, posClass] = /<([^>/]+)(?:\/([^>]+))?>/.exec(lemmaInfo) ?? [];
  const lemma = bare(lemmaInfo.replace(/ [<{(].*$/, ""));
  const forms = spellings(lemma, entries);
  const all = forms.map((w) => normalize(w)).filter((w) => w !== "");
  const marked = OFFENSIVE_NOTE.test(lemmaInfo);

  // A word at two sizes reads "70 [moby] 85 [ukacd]": it's in the list from the smaller one.
  const size = Math.min(...[...info.replace(/\[[^\]]*\]/g, " ").matchAll(/\d+/g)].map((m) => Number(m[0])));
  const misspelt = variant !== null && variant[1].split(" ").every((v) => v.endsWith("x"));
  const proper = PROPER_TAGS.test(info) || PROPER_CLASSES.has(posClass ?? "") || /[A-Z]/.test(lemmaInfo.replace(/ [<{(].*$/, ""));
  if (size > DICTIONARY_MAX_SIZE || misspelt || proper || NOT_WORDS.has(pos ?? "")) return { words: [], all, marked };
  const words = forms.filter((w) => !/[A-Z]/.test(w)).flatMap((w) => playable(w) ?? []);
  return { words, all, marked };
}

export function parseScowl(text: string): ScowlGroup[] {
  const groups: ScowlGroup[] = [];
  let group: ScowlGroup = { words: [], all: [], marked: false };
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") {
      if (group.all.length) groups.push(group);
      group = { words: [], all: [], marked: false };
      continue;
    }
    const read = readLine(line);
    if (!read) continue;
    group.words.push(...read.words);
    group.all.push(...read.all);
    group.marked ||= read.marked;
  }
  if (group.all.length) groups.push(group);
  return groups;
}

// One list, sorted so two runs give the same checksum. A blocked word leaves ENABLE's and Moby's copies too, and a word
// that shares its spelling with an offensive group goes with it: answer 2 accepted losing a few innocent words. A drop
// that matches nothing stops the build, so a typo can't leave the word in the game.
export function buildDictionary(plainLists: string[][], groups: ScowlGroup[], drops: string[] = []): string[] {
  const dropped = new Set(drops);
  const held = (text: string) => dropped.has(text) || (text.includes(" ") ? isListed(text) : isListedWord(text));
  const blocked = new Set<string>();
  for (const group of groups) {
    if (group.marked || group.all.some(held)) for (const word of group.all) blocked.add(word);
  }
  const words = new Set<string>();
  for (const list of plainLists) {
    for (const line of list) {
      const word = line.trim() === "" ? null : playable(line.trim());
      if (word !== null) words.add(word);
    }
  }
  for (const group of groups) for (const word of group.words) words.add(word);
  const unused = drops.filter((word) => !words.has(word));
  if (unused.length) throw new Error(`${DICTIONARY_DROP_FILE}: ${unused.join(", ")} matched nothing`);
  return [...words].filter((word) => !blocked.has(word) && !isListedWord(word)).sort();
}

// The download goes through scripts/base.ts's one `download`, passed in as that file imports this one.
export async function fetchDictionary(download: (url: string) => Promise<Buffer>): Promise<string[]> {
  const pinned = async ({ url, sha256 }: { url: string; sha256: string }) => {
    const file = await download(url);
    const got = createHash("sha256").update(file).digest("hex");
    if (got !== sha256) throw new Error(`${url}: its SHA-256 is ${got}, not the pinned ${sha256} (SOURCES.md)`);
    return file;
  };
  const { enable, mobyCrossword, mobyDelta, scowl } = DICTIONARY_FILES;
  const plain = await Promise.all([enable, mobyCrossword, mobyDelta].map(async (file) => (await pinned(file)).toString("latin1").split(/\r?\n/)));
  const drops: unknown = JSON.parse(readFileSync(DICTIONARY_DROP_FILE, "utf8"));
  if (!Array.isArray(drops) || !drops.every((word) => typeof word === "string")) throw new Error(`${DICTIONARY_DROP_FILE}: not a list of words`);
  return buildDictionary(plain, parseScowl((await pinned(scowl)).toString("utf8")), drops);
}
