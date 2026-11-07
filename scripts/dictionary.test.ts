// Game 2's dictionary (scripts/dictionary.ts): what the English Speller Database's table becomes, and what stays out.
import { describe, expect, it } from "vitest";
import { buildDictionary, type DictionaryEntry, fetchDictionary, parseScowl } from "./dictionary.ts";

const words = (table: string) => parseScowl(table).flatMap((g) => g.words.map((w) => w.key));
// The keys a build keeps, once each, in its order: what a player's stripped try is matched against (16a-2).
const keys = (entries: DictionaryEntry[]) => [...new Set(entries.map((e) => e.key))];
const spellingsOf = (entries: DictionaryEntry[], key: string) => entries.filter((e) => e.key === key).map((e) => e.spelling);

describe("parseScowl", () => {
  it("reads a lemma and its forms through normalize, and leaves out possessives", () => {
    expect(words("60: tuba <n>: tubas, tuba's, tubas'\n")).toEqual(["tuba", "tubas"]);
  });

  it("leaves out a possessive standing as its own lemma, and keeps a contraction", () => {
    expect(words("60: baker's\n\n60: chemist's <n>\n\n60: he's <s>\n\n60: don't <s>\n")).toEqual(["hes", "dont"]);
  });

  it("keeps a pronoun's form, which can be a contraction", () => {
    expect(words("35: something <pn>: -, -, -, something's\n")).toEqual(["something", "somethings"]);
  });

  it("reads a word at two sizes from the smaller, and leaves out one past the limit", () => {
    expect(words("70 [moby] 85 [ukacd]: gimbal <n>\n\n99: zzxjoanw <n>\n")).toEqual(["gimbal"]);
  });

  it("reads spelling codes, and leaves out a spelling that is only a misspelling", () => {
    expect(words("70 [moby] 80: B D: haematic <n>\n\n60: Ax: tommorow <n>\n")).toEqual(["haematic"]);
  });

  it("opens alternatives, keeps a dash's form and drops a marked misspelling and a missing form", () => {
    expect(words("35: thrust <v>: (thrust | -: thrusted), thrusting, thrusts # note: a comment\n")).toEqual(["thrust", "thrust", "thrusted", "thrusting", "thrusts"]);
    expect(words("60: gleam <v>: (gleamed | x: gleemed), -, gleaming\n")).toEqual(["gleam", "gleamed", "gleaming"]);
  });

  it("leaves out a form marked nearly non-existent, and keeps the rest of its group", () => {
    expect(words("60: gleam <v>: gleamed, gleaming!\n")).toEqual(["gleam", "gleamed"]);
  });

  it("leaves a whole group out when its lemma is marked, its other lines too", () => {
    expect(words("85 [ukacd]: !plotter <v>: plottered, plottering, plotters\n\n60: calm <n>\n")).toEqual(["calm"]);
    expect(words("50 [ukacd]: !twank <m>: -, -, twanks\n85 [ukacd]: - <m>: twanked, twanking, -\n")).toEqual([]);
  });

  it("leaves out proper nouns, abbreviations and word parts", () => {
    const table = ["50: Honduras <n/place>: Honduras's", "60: lowtag <n/surname>", "60 [name]: lowname <n>", "60: etcet <abbr>", "70: !anti <pre>", "70: ology <suf>", "70: xvii <x>"].join("\n\n");
    expect(words(table)).toEqual([]);
  });

  it("reads a class that has no part of speech before its slash", () => {
    expect(words("70 [3of6]: -etcet. </abbr?>\n\n60: o.n.o. </abbr?>\n\n60: lowname </name?>\n")).toEqual([]);
  });

  it("takes out a slashed form, as more than one word", () => {
    expect(words("60: s/he\n\n60: and/or\n")).toEqual([]);
  });

  it("takes phrases out, and joins hyphens as answer 4 says", () => {
    expect(words("60: ice cream <n>: ice creams\n\n60: well-known <aj>\n")).toEqual(["wellknown"]);
  });

  it("keeps a group's lines together until a blank line, with SCOWL's note", () => {
    const groups = parseScowl("60: A: blorp <n> (vulgar-1): blorps\n60: B: blorpe <n> (vulgar-1): blorpes\n\n60: calm <n>\n");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ marked: true, all: ["blorp", "blorps", "blorpe", "blorpes"] });
    expect(groups[1].marked).toBe(false);
  });

  it("keeps a too-rare or proper line's spellings for the blocking, not for play", () => {
    expect(parseScowl("99: sawbones <n>: sawboneses\n")[0]).toEqual({ words: [], all: ["sawbones", "sawboneses"], marked: false });
  });

  it("keeps each form's proper spelling beside its key: an apostrophe, a hyphen, an accent", () => {
    expect(parseScowl("60: it's <s>\n\n60: well-known <aj>\n\n60: café <n>: cafés\n").flatMap((g) => g.words)).toEqual([
      { key: "its", spelling: "it's" },
      { key: "wellknown", spelling: "well-known" },
      { key: "cafe", spelling: "café" },
      { key: "cafes", spelling: "cafés" },
    ]);
  });
});

describe("buildDictionary", () => {
  it("merges, normalizes, removes duplicates and sorts", () => {
    expect(buildDictionary([["zebra", "apple\r"], ["apple", "it's"]], parseScowl("60: mango <n>\n"))).toEqual([
      { key: "apple", spelling: "apple" },
      { key: "its", spelling: "it's" },
      { key: "mango", spelling: "mango" },
      { key: "zebra", spelling: "zebra" },
    ]);
  });

  it("holds the shortest word at 3 letters", () => {
    expect(keys(buildDictionary([["at", "ate"]], []))).toEqual(["ate"]);
  });

  it("keeps out a listed word, every form in its group, and ENABLE's copy of them", () => {
    const groups = parseScowl("60: sawbones <n>: sawboneses\n");
    expect(keys(buildDictionary([["sawboneses", "sawbones", "calm"]], groups))).toEqual(["calm"]);
  });

  it("takes a phrase's listed group out too, whichever word of it the group's lines spell", () => {
    const groups = parseScowl("60: ambulance chaser <n>: ambulancechaser\n");
    expect(keys(buildDictionary([["ambulancechaser", "calm"]], groups))).toEqual(["calm"]);
  });

  it("takes a listed phrase's group out when the table hyphenates it", () => {
    const groups = parseScowl("85 [ukacd]: ambulance-chaser <n>: ambulance-chasers\n");
    expect(keys(buildDictionary([["ambulancechaser", "calm"]], groups))).toEqual(["calm"]);
  });

  it("keeps out a group SCOWL marks, even a form only rarer lines hold", () => {
    const groups = parseScowl("99: blorp <n> (offensive-1): blorps\n");
    expect(keys(buildDictionary([["blorps", "calm"]], groups))).toEqual(["calm"]);
  });

  it("takes a dropped word's whole group out, from every source", () => {
    const groups = parseScowl("60: blorp <n>: blorps, blorped\n");
    expect(keys(buildDictionary([["blorp", "blorps", "calm"]], groups, ["blorp"]))).toEqual(["calm"]);
  });

  it("takes a dropped word out when only a plain list holds it", () => {
    expect(keys(buildDictionary([["blorp", "calm"]], [], ["blorp"]))).toEqual(["calm"]);
  });

  it("stops on a drop that matches nothing, so a typo can't leave a word in", () => {
    expect(() => buildDictionary([["calm"]], [], ["clam"])).toThrow(/clam matched nothing/);
  });

  it("marks a word everyday from a table line of size 35 or less, whichever list also holds it", () => {
    const groups = parseScowl("35: apple <n>\n\n36: mango <n>\n\n70 [moby] 35: kiwi <n>\n");
    const built = buildDictionary([["apple", "plum"]], groups);
    expect(built).toEqual([
      { key: "apple", spelling: "apple", everyday: true },
      { key: "kiwi", spelling: "kiwi", everyday: true },
      { key: "mango", spelling: "mango" },
      { key: "plum", spelling: "plum" },
    ]);
  });

  it("keeps the mark whichever order a word's lines come in", () => {
    for (const table of ["35: apple <n>\n\n70: apple <v>\n", "70: apple <v>\n\n35: apple <n>\n"]) {
      expect(buildDictionary([], parseScowl(table))).toEqual([{ key: "apple", spelling: "apple", everyday: true }]);
    }
  });

  it("marks only a size 35 line's main spellings, as the README's default list has them", () => {
    const table = [
      "35: clip <v>: clipped, (clipped | ~: clipt), clips",
      "35: AV: sirup <n>: sirups",
      "35: A Cv DV: color <n>",
      "35: B C D: colour <n>",
      "35: A.: axe <n>",
      "35: AV Bv: adaptor <n>",
      "35: A= B: ambience <n>",
      "35: A=: analog <n>",
      "35: fish <n>: (fish | fishes*)",
      "35: dig <v>: dug, digged@, diggings-",
    ].join("\n\n");
    const marked = buildDictionary([], parseScowl(table)).filter((e) => e.everyday).map((e) => e.spelling);
    expect(marked).toEqual(["ambience", "axe", "clip", "clipped", "clips", "color", "colour", "dig", "dug", "fish", "fishes"]);
  });

  it("keeps an allowed word its list and group would take out, and only that word", () => {
    const table = parseScowl("60: finger <n>: fingers\n60: fingering <n>\n");
    const built = keys(buildDictionary([["finger", "fingers", "fingering"]], table, [], ["finger", "fingers"]));
    expect(built).toEqual(["finger", "fingers"]);
  });

  it("stops on an allow entry that matches nothing, isn't blocked or is also dropped", () => {
    const table = parseScowl("60: mango <n>\n");
    expect(() => buildDictionary([["mango"]], table, [], ["zzzzz"])).toThrow(/zzzzz/);
    expect(() => buildDictionary([["mango"]], table, [], ["mango"])).toThrow(/mango/);
    expect(() => buildDictionary([["mango"]], table, ["mango"], ["mango"])).toThrow(/mango/);
  });

  it("gives a key every proper spelling its sources hold, in code-point order (16a-2)", () => {
    const groups = parseScowl("60: it's <s>\n\n60: well-known <aj>\n\n60: café <n>\n");
    const built = buildDictionary([["its", "cafe", "wellknown"]], groups);
    expect(spellingsOf(built, "its")).toEqual(["it's", "its"]);
    expect(spellingsOf(built, "wellknown")).toEqual(["well-known", "wellknown"]);
    expect(spellingsOf(built, "cafe")).toEqual(["cafe", "café"]);
  });

  it("keeps a hyphen's spelling when no plain list joins it up", () => {
    expect(buildDictionary([["calm"]], parseScowl("60: well-known <aj>\n"))).toEqual([
      { key: "calm", spelling: "calm" },
      { key: "wellknown", spelling: "well-known" },
    ]);
  });

  it("is the same list whatever order its sources come in", () => {
    const groups = parseScowl("60: mango <n>\n");
    expect(buildDictionary([["pear"], ["fig", "kiwi"]], groups)).toEqual(buildDictionary([["kiwi", "fig"], ["pear"]], groups));
  });
});

describe("fetchDictionary", () => {
  it("refuses a download that isn't the pinned file", async () => {
    await expect(fetchDictionary(async () => Buffer.from("tampered"))).rejects.toThrow(/SHA-256/);
  });
});
