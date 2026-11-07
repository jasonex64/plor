// Game 2's dictionary (docs/milestones/M16-16a-the-dictionary.md): `npm run base -- fetch dictionary` merges ENABLE,
// Moby's crossword lists and the English Speller Database into one list. Downloads are pinned by checksum (SOURCES.md).
// Sources are untrusted input from the network, so a changed file stops the fetch instead of changing the game.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DICTIONARY_EVERYDAY_SIZE, DICTIONARY_MAX_SIZE, DICTIONARY_MIN_LETTERS } from "../src/config/tunables.ts";
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

// Words game 2 keeps though a list or a group would take them out: everyday ones caught by accident and mild ones the
// human approved word by word (docs/milestones/M16-16a-3-possessives-and-mild-words.md). Game 1 doesn't read this file,
// so the answer base and misses stay as strict as they were.
export const DICTIONARY_ALLOW_FILE = "data/dictionary-allow.json";

export const DICTIONARY_METHOD = `ENABLE, Moby's crosswd.txt and crswd-d.txt, and the English Speller Database's scowl.txt to size ${DICTIONARY_MAX_SIZE} (SOURCES.md, pinned by SHA-256), through normalize, each word kept with every proper spelling its sources hold, lower-case; a to z, ${DICTIONARY_MIN_LETTERS} letters or more; no proper nouns, abbreviations, possessives, word parts or misspellings; every SCOWL group holding a listed word, a word in ${DICTIONARY_DROP_FILE}, or an offensive or vulgar note is out, but for the words in ${DICTIONARY_ALLOW_FILE}; a main spelling on a line of size ${DICTIONARY_EVERYDAY_SIZE} or less is marked everyday`;

// One group is one sense of a word (the table's README, "GROUP"). `words` are the ones a player may type; `all` is
// every spelling the table stands behind, kept so one listed word takes its whole group with it. A form marked "!"
// isn't in `all`: it would block a real word that shares a group with one, and a "!" lemma's group is out of play anyway.
export type ScowlGroup = { words: DictionaryEntry[]; all: string[]; marked: boolean };

// A word a player may type: `key` is what a try is matched on, `spelling` the proper word the screen shows
// (docs/milestones/M16-16a-2-proper-spellings.md; DECISIONS.md, Game 2, "Matching and showing").
// `everyday` is set only on a word from a table line of size DICTIONARY_EVERYDAY_SIZE or less: the picker's measure of
// a fair round, never shown (M16 S21).
export type DictionaryEntry = { key: string; spelling: string; everyday?: true };

// Not words a player would type (README, "POSes"), and classes that mark proper nouns the capital check can miss.
const NOT_WORDS = new Set(["abbr", "pre", "suf", "wp", "we", "x"]);
const PROPER_CLASSES = new Set(["person", "surname", "place", "name", "name?", "demonym", "trademark", "abbr", "abbr?", "upper", "upper?"]);
const PROPER_TAGS = /\[(name|lcacr|ucacr)\]/;
const OFFENSIVE_NOTE = /\((offensive|vulgar)-\d\)/;
// Possessives aren't accepted (M16 S20), whether a noun's form or their own lemma ("baker's"). The table tags a
// contraction <s>, which is how "he's" stays, and a pronoun's form can be one: "something's wrong" (16a-3, answer 5).
const POSSESSIVE = /('s|s')$/;
const KEEPS_ITS_APOSTROPHE = new Set(["s", "pn"]);
const VARIANT = /^((?:[ABZCD_][.=?v~V@x-]? ?)+(?:\{\d+\})?|\+): (.*)$/;

// A word with its marks taken off, or null when the marks say to leave it out: "!" is "nearly non-existent", and "-"
// alone holds a missing form's place (README, "ANNOTATION"). "-", "@", "~" and "*" stay, as answer 1 chose breadth. A
// leading "!" on a lemma marks its whole group (README, "Database structure"; libscowl's group_rank): see parseScowl.
function bare(token: string): string | null {
  const word = token.trim().replace(/†/g, "");
  if (word === "-" || word === "" || word.startsWith("!") || word.endsWith("!")) return null;
  return word.replace(/^[-@]/, "").replace(/[*\-@~]$/, "");
}

// A spelling a player can type (`bare`), and whether it's a main one. The README's default list takes no variant level
// but "." ("VARIANT-LEVEL"), and each code speaks for one English, so "A Cv DV: color" is main because it is in
// American. "-", "@" and "~" mark an uncommon, archaic or inapplicable form ("ANNOTATION"); "*" only says a plural can
// match its singular, so "rhinoceroses*" is a main form. The everyday mark reads this.
type Form = { word: string; main: boolean };
const RARE_MARK = /^[-@]|[\-@~]†?$/;
const mainVariants = (infos: string[]) => infos.length === 0 || infos.some((info) => /^[ABZCD_]?\.?$/.test(info));

// The derived forms after a lemma, with "(A: one | B: other)" alternatives opened up. Commas inside parentheses
// don't split, and a form whose variant level is "x" is a misspelling (README, "VARIANT-LEVEL").
function derived(entries: string): Form[] {
  const out: Form[] = [];
  for (const entry of entries.split(/,\s*(?![^()]*\))/)) {
    const open = entry.trim().replace(/^\(|\)$/g, "");
    for (const alternative of open.split("|")) {
      const colon = alternative.lastIndexOf(":");
      const infos = colon < 0 ? [] : alternative.slice(0, colon).trim().split(" ");
      if (infos.some((info) => info.endsWith("x"))) continue;
      const token = alternative.slice(colon + 1).trim();
      const word = bare(token);
      if (word !== null) out.push({ word, main: mainVariants(infos) && !RARE_MARK.test(token) });
    }
  }
  return out;
}

const spellings = (lemma: Form | null, entries: string): Form[] => (lemma === null ? [] : [lemma]).concat(entries ? derived(entries) : []);

// A word a player may type, or null. A space means a phrase and a slash two words at once (`and/or`, `s/he`); anything
// else `normalize` leaves outside a to z (a digit) isn't a word. The spelling is NFC so one accented word has one
// spelling, whichever way its source encodes it.
function playable(word: string): DictionaryEntry | null {
  if (/[\s/]/.test(word)) return null;
  const key = normalize(word);
  return /^[a-z]+$/.test(key) && key.length >= DICTIONARY_MIN_LETTERS ? { key, spelling: word.normalize("NFC").toLowerCase() } : null;
}

// Code-point order on the key, then the spelling, so two runs give the same checksum. Every character a kept word
// has is in the Basic Multilingual Plane, where JavaScript's comparison and SQL's `collate "C"` agree.
const byKeyThenSpelling = (a: DictionaryEntry, b: DictionaryEntry) =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : a.spelling < b.spelling ? -1 : a.spelling > b.spelling ? 1 : 0;

function readLine(line: string): (ScowlGroup & { outOfPlay: boolean }) | null {
  const text = line.split("#")[0].trimEnd();
  const head = /^(\d[^:]*): (.*)$/.exec(text);
  if (!head) return null;
  const info = head[1];
  const variant = VARIANT.exec(head[2]);
  const rest = variant ? variant[2] : head[2];
  const colon = rest.indexOf(": ");
  const lemmaInfo = colon < 0 ? rest.replace(/:$/, "") : rest.slice(0, colon);
  const entries = colon < 0 ? "" : rest.slice(colon + 2);
  // The part of speech can be empty: the table writes "</abbr?>" where it isn't sure of one (M16 16a-2).
  const [, pos, posClass] = /<([^>/]*)(?:\/([^>]+))?>/.exec(lemmaInfo) ?? [];
  const lemmaText = lemmaInfo.replace(/ [<{(].*$/, "");
  const lemma = bare(lemmaText);
  const outOfPlay = lemmaText.trim().startsWith("!");
  // "+" overrides a line's sizes and carries no variant level (README, "Grammar").
  const mainLine = variant === null || variant[1] === "+" || mainVariants(variant[1].replace(/\{\d+\}/, "").trim().split(" "));
  const forms = spellings(lemma === null ? null : { word: lemma, main: !RARE_MARK.test(lemmaText.trim()) }, entries);
  const all = forms.map((f) => normalize(f.word)).filter((w) => w !== "");
  const marked = OFFENSIVE_NOTE.test(lemmaInfo);

  // A word at two sizes reads "70 [moby] 85 [ukacd]": it's in the list from the smaller one.
  const size = Math.min(...[...info.replace(/\[[^\]]*\]/g, " ").matchAll(/\d+/g)].map((m) => Number(m[0])));
  const misspelt = variant !== null && variant[1].split(" ").every((v) => v.endsWith("x"));
  const proper = PROPER_TAGS.test(info) || PROPER_CLASSES.has(posClass ?? "") || /[A-Z]/.test(lemmaText);
  if (size > DICTIONARY_MAX_SIZE || misspelt || proper || NOT_WORDS.has(pos ?? "")) return { words: [], all, marked, outOfPlay };
  const words = forms
    .filter((f) => !/[A-Z]/.test(f.word) && (KEEPS_ITS_APOSTROPHE.has(pos ?? "") || !POSSESSIVE.test(f.word)))
    .flatMap((f) => {
      const entry = playable(f.word);
      if (entry === null) return [];
      return size <= DICTIONARY_EVERYDAY_SIZE && mainLine && f.main ? [{ ...entry, everyday: true as const }] : [entry];
    });
  return { words, all, marked, outOfPlay };
}

export function parseScowl(text: string): ScowlGroup[] {
  const groups: ScowlGroup[] = [];
  let group: ScowlGroup = { words: [], all: [], marked: false };
  let outOfPlay = false;
  const close = () => {
    if (group.all.length) groups.push(outOfPlay ? { ...group, words: [] } : group);
    group = { words: [], all: [], marked: false };
    outOfPlay = false;
  };
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") {
      close();
      continue;
    }
    const read = readLine(line);
    if (!read) continue;
    group.words.push(...read.words);
    group.all.push(...read.all);
    group.marked ||= read.marked;
    outOfPlay ||= read.outOfPlay;
  }
  close();
  return groups;
}

// One list of (key, spelling) pairs. A blocked word leaves ENABLE's and Moby's copies too, and a word
// that shares its spelling with an offensive group goes with it: answer 2 accepted losing a few innocent words. A drop
// that matches nothing stops the build, so a typo can't leave the word in the game. An allowed word comes through all
// of that, and only it: its group's other words stay out. One that isn't blocked stops the build too, so the file can't
// go stale.
export function buildDictionary(plainLists: string[][], groups: ScowlGroup[], drops: string[] = [], allows: string[] = []): DictionaryEntry[] {
  const dropped = new Set(drops);
  const allowed = new Set(allows);
  const held = (text: string) => dropped.has(text) || (text.includes(" ") ? isListed(text) : isListedWord(text));
  const blocked = new Set<string>();
  for (const group of groups) {
    if (group.marked || group.all.some(held)) for (const word of group.all) blocked.add(word);
  }
  const entries = new Map<string, DictionaryEntry>();
  const add = (entry: DictionaryEntry) => {
    const id = `${entry.key} ${entry.spelling}`;
    entries.set(id, entries.get(id)?.everyday ? { ...entry, everyday: true } : entry);
  };
  for (const list of plainLists) {
    for (const line of list) {
      const entry = line.trim() === "" ? null : playable(line.trim());
      if (entry !== null) add(entry);
    }
  }
  for (const group of groups) for (const entry of group.words) add(entry);
  const keys = new Set([...entries.values()].map((entry) => entry.key));
  const unused = drops.filter((word) => !keys.has(word));
  if (unused.length) throw new Error(`${DICTIONARY_DROP_FILE}: ${unused.join(", ")} matched nothing`);
  const out = (key: string) => blocked.has(key) || held(key);
  const stale = allows.filter((word) => !keys.has(word) || !out(word) || dropped.has(word));
  if (stale.length) throw new Error(`${DICTIONARY_ALLOW_FILE}: ${stale.join(", ")} isn't a blocked word, or is also dropped`);
  // Filters judge the key, so a word kept or left out goes with all its spellings or none.
  return [...entries.values()].filter((entry) => allowed.has(entry.key) || !out(entry.key)).sort(byKeyThenSpelling);
}

function wordList(file: string): string[] {
  const words: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(words) || !words.every((word) => typeof word === "string")) throw new Error(`${file}: not a list of words`);
  return words;
}

// The download goes through scripts/base.ts's one `download`, passed in as that file imports this one.
export async function fetchDictionary(download: (url: string) => Promise<Buffer>): Promise<DictionaryEntry[]> {
  const pinned = async ({ url, sha256 }: { url: string; sha256: string }) => {
    const file = await download(url);
    const got = createHash("sha256").update(file).digest("hex");
    if (got !== sha256) throw new Error(`${url}: its SHA-256 is ${got}, not the pinned ${sha256} (SOURCES.md)`);
    return file;
  };
  const { enable, mobyCrossword, mobyDelta, scowl } = DICTIONARY_FILES;
  const plain = await Promise.all([enable, mobyCrossword, mobyDelta].map(async (file) => (await pinned(file)).toString("latin1").split(/\r?\n/)));
  return buildDictionary(plain, parseScowl((await pinned(scowl)).toString("utf8")), wordList(DICTIONARY_DROP_FILE), wordList(DICTIONARY_ALLOW_FILE));
}
