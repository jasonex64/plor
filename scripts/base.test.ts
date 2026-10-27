// The answer database's import parsers (scripts/base.ts): what each source's rows become. Sources are untrusted input.
import { afterEach, describe, expect, it, vi } from "vitest";
import { thingId, uuidV5 } from "../src/content/thing-id.ts";
import { aliasesFor, foldLabels, latestNumber, linkToWikidata, localClient, oddJoins, oewnSubtree, parseCsv, parseLinks, riverShortNames, taxaToItems, usdaCheeses, withFact, withPopulation, type Item } from "./base.ts";

describe("thing IDs", () => {
  it("are RFC 4122 version 5 UUIDs", () => {
    // Python's documented example: uuid.uuid5(uuid.NAMESPACE_DNS, "python.org").
    expect(uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "python.org")).toBe("886313e1-3b8a-5372-9b90-0c9aee199e5d");
  });

  it("are the same for the same source entry, and differ between sources", () => {
    expect(thingId("wikidata", "Q144")).toBe(thingId("wikidata", "Q144"));
    expect(thingId("wikidata", "Q144")).not.toBe(thingId("oewn", "Q144"));
  });
});

describe("aliasesFor", () => {
  it("normalizes names, adds their plurals, then synonyms and scientific names, each alias once", () => {
    expect(aliasesFor(["Polar Bear"], ["White Bear", "polar bear"], ["Ursus maritimus"])).toEqual([
      { alias: "polar bear", kind: "name" },
      { alias: "polar bears", kind: "plural" },
      { alias: "white bear", kind: "synonym" },
      { alias: "ursus maritimus", kind: "scientific" },
    ]);
  });
});

describe("taxaToItems", () => {
  it("names a taxon by its English label when that is a common name, else its first English name in alphabetical order, whatever order the names came in, else its scientific name; root keeps no parents; parents outside are dropped", () => {
    const taxa = new Map([
      ["Q2", { names: ["bear"], synonyms: ["Bear"], scientific: ["Ursidae"], parents: new Set(["Q1"]) }],
      ["Q3", { names: [], synonyms: [], scientific: ["Ursus"], parents: new Set(["Q2", "Q9"]) }],
      ["Q1", { names: ["animal"], synonyms: [], scientific: [], parents: new Set(["Q0"]) }],
      ["Q4", { names: ["whitefish", "elephant shark"], synonyms: [], scientific: [], parents: new Set(["Q1"]) }],
      ["Q5", { names: ["Chochito", "vaquita"], synonyms: [], scientific: [], parents: new Set(["Q1"]), label: "Vaquita" }],
      ["Q6", { names: ["blue whale"], synonyms: [], scientific: [], parents: new Set(["Q1"]), label: "Balaenoptera musculus" }],
    ]);
    expect(taxaToItems(taxa, "Q1")).toEqual([
      { id: "Q2", name: "bear", aliases: [{ alias: "bear", kind: "name" }, { alias: "bears", kind: "plural" }, { alias: "ursidae", kind: "scientific" }], kind_of: ["Q1"] },
      { id: "Q3", name: "Ursus", aliases: [{ alias: "ursus", kind: "scientific" }], kind_of: ["Q2"] },
      { id: "Q1", name: "animal", aliases: [{ alias: "animal", kind: "name" }, { alias: "animals", kind: "plural" }], kind_of: [] },
      expect.objectContaining({ id: "Q4", name: "elephant shark" }),
      expect.objectContaining({ id: "Q5", name: "vaquita" }),
      expect.objectContaining({ id: "Q6", name: "blue whale" }),
    ]);
  });
});

describe("oewnSubtree", () => {
  it("takes a synset and everything under it, through hypernyms and instance hypernyms, once each", () => {
    const synsets = {
      food: { members: ["food"] },
      cheese: { members: ["cheese"], hypernym: ["food"] },
      cheddar: { members: ["cheddar", "cheddar cheese"], hypernym: ["cheese"] },
      velveeta: { members: ["Velveeta"], instance_hypernym: ["cheese", "food"] },
      bread: { members: ["bread"], hypernym: ["food"] },
    };
    expect(oewnSubtree(synsets, "cheese")).toEqual([
      { id: "cheese", name: "cheese", aliases: [{ alias: "cheese", kind: "name" }, { alias: "cheeses", kind: "plural" }], kind_of: [] },
      { id: "velveeta", name: "Velveeta", aliases: [{ alias: "velveeta", kind: "name" }, { alias: "velveetas", kind: "plural" }], kind_of: ["cheese"] },
      {
        id: "cheddar",
        name: "cheddar",
        aliases: [
          { alias: "cheddar", kind: "name" },
          { alias: "cheddar cheese", kind: "name" },
          { alias: "cheddars", kind: "plural" },
          { alias: "cheddar cheeses", kind: "plural" },
        ],
        kind_of: ["cheese"],
      },
    ]);
  });
});

describe("parseCsv", () => {
  it("reads quoted fields with commas, doubled quotes and CRLF line ends", () => {
    expect(parseCsv('"a","b, c"\r\n"say ""hi""",2\n')).toEqual([
      ["a", "b, c"],
      ['say "hi"', "2"],
    ]);
  });

  it("refuses a file that ends inside a quoted field", () => {
    expect(() => parseCsv('"open')).toThrow("quoted field");
  });
});

describe("usdaCheeses", () => {
  const categories = '"id","code","description"\n"1","0100","Dairy and Egg Products"\n"2","0200","Spices and Herbs"\n';
  const foods = [
    '"fdc_id","data_type","description","food_category_id","publication_date"',
    '"10","sr_legacy_food","Cheese, cheddar, sharp","1","2019-04-01"',
    '"11","sr_legacy_food","Cheese, cheddar, low fat","1","2019-04-01"',
    '"12","sr_legacy_food","Cheese, brick","1","2019-04-01"',
    `"15","sr_legacy_food","Cheese, cheddar (includes foods for USDA's Food Distribution Program)","1","2019-04-01"`,
    '"13","sr_legacy_food","Cheese puffs and twists","1","2019-04-01"',
    '"14","sr_legacy_food","Cheese, sauce mix","2","2019-04-01"',
    '"16","sr_legacy_food","Cheese, low fat, cheddar or colby","1","2019-04-01"',
  ].join("\n");
  const tree: Item[] = [{ id: "07868895-n", name: "cheddar", aliases: [{ alias: "cheddar", kind: "name" }], kind_of: [] }];

  it("takes each dairy 'Cheese, <kind>' once, skipping descriptions that aren't kinds, linking a WordNet match and putting the rest under WordNet's cheese", () => {
    expect(usdaCheeses(foods, categories, tree)).toEqual([
      { id: "10", name: "cheddar cheese", aliases: [{ alias: "cheddar cheese", kind: "name" }, { alias: "cheddar cheeses", kind: "plural" }, { alias: "cheddar", kind: "synonym" }], same_as: "oewn:07868895-n" },
      { id: "12", name: "brick cheese", aliases: [{ alias: "brick cheese", kind: "name" }, { alias: "brick cheeses", kind: "plural" }, { alias: "brick", kind: "synonym" }], kind_of: ["oewn:07866305-n"] },
    ]);
  });

  it("refuses files without the columns or the category it needs", () => {
    expect(() => usdaCheeses(foods, '"id","description"\n"1","Other"\n', tree)).toThrow("Dairy and Egg Products");
    expect(() => usdaCheeses('"id"\n"1"\n', categories, tree)).toThrow("fdc_id");
  });
});

describe("linkToWikidata", () => {
  const none = { split: new Set<string>(), pick: new Map<string, string>() };
  it("links each WordNet item to the loaded Wikidata thing its synset names, and the root to the category's root", () => {
    const synsets = { root: { members: ["animal"] }, bear: { members: ["bear"], wikidata: "Q1" }, yeti: { members: ["yeti"], wikidata: "Q9" } };
    const items = [
      { id: "root", name: "animal", aliases: [], kind_of: [] },
      { id: "bear", name: "bear", aliases: [], kind_of: ["root"] },
      { id: "yeti", name: "yeti", aliases: [], kind_of: ["root"] },
    ];
    expect(linkToWikidata(items, synsets, new Set(["Q1", "Q729"]), "root", "Q729", new Map(), none)).toEqual([
      { id: "root", name: "animal", aliases: [], kind_of: [], same_as: "wikidata:Q729" },
      { id: "bear", name: "bear", aliases: [], kind_of: ["root"], same_as: "wikidata:Q1" },
      { id: "yeti", name: "yeti", aliases: [], kind_of: ["root"] },
    ]);
  });

  it("joins a common-name item's one loaded taxon, and leaves one naming several loaded taxa unjoined, listing them", () => {
    const synsets = { root: { members: ["animal"] }, dog: { members: ["dog"], wikidata: "Q144" }, cat: { members: ["cat"], wikidata: "Q146" } };
    const items = [
      { id: "root", name: "animal", aliases: [], kind_of: [] },
      { id: "dog", name: "dog", aliases: [], kind_of: ["root"] },
      { id: "cat", name: "cat", aliases: [], kind_of: ["root"] },
    ];
    // Q144 names two taxa, one of them loaded; Q146 names two loaded ones and one that isn't.
    const taxaOf = new Map([["Q144", ["Q26972265", "Q20717272"]], ["Q146", ["Q20980826", "Q1867423", "Q99"]]]);
    expect(linkToWikidata(items, synsets, new Set(["Q729", "Q26972265", "Q20980826", "Q1867423"]), "root", "Q729", taxaOf, none)).toEqual([
      { id: "root", name: "animal", aliases: [], kind_of: [], same_as: "wikidata:Q729" },
      { id: "dog", name: "dog", aliases: [], kind_of: ["root"], same_as: "wikidata:Q26972265" },
      { id: "cat", name: "cat", aliases: [], kind_of: ["root"], unjoined: ["Q20980826", "Q1867423"] },
    ]);
  });

  it("reads a synset's list of IDs, joining when they name one loaded thing between them", () => {
    const synsets = { root: { members: ["animal"] }, owl: { members: ["owl"], wikidata: ["Q5", "Q6"] }, bat: { members: ["bat"], wikidata: ["Q7", "Q8"] } };
    const items = [
      { id: "root", name: "animal", aliases: [], kind_of: [] },
      { id: "owl", name: "owl", aliases: [], kind_of: ["root"] },
      { id: "bat", name: "bat", aliases: [], kind_of: ["root"] },
    ];
    expect(linkToWikidata(items, synsets, new Set(["Q729", "Q6", "Q7", "Q8"]), "root", "Q729", new Map([["Q5", ["Q6"]]]), none)).toEqual([
      { id: "root", name: "animal", aliases: [], kind_of: [], same_as: "wikidata:Q729" },
      { id: "owl", name: "owl", aliases: [], kind_of: ["root"], same_as: "wikidata:Q6" },
      { id: "bat", name: "bat", aliases: [], kind_of: ["root"], unjoined: ["Q7", "Q8"] },
    ]);
  });
  it("applies a person's splits and picks, and stops on one that no longer fits the data", () => {
    const synsets = { root: { members: ["animal"] }, sloth: { members: ["ground sloth"], wikidata: "Q1" }, cat: { members: ["cat"], wikidata: ["Q2", "Q3"] } };
    const items = [
      { id: "root", name: "animal", aliases: [], kind_of: [] },
      { id: "sloth", name: "ground sloth", aliases: [], kind_of: ["root"] },
      { id: "cat", name: "cat", aliases: [], kind_of: ["root"] },
    ];
    const known = new Set(["Q729", "Q1", "Q2", "Q3"]);
    const link = (split: string[], pick: [string, string][], from = items) => linkToWikidata(from, synsets, known, "root", "Q729", new Map(), { split: new Set(split), pick: new Map(pick) });
    expect(link(["sloth"], [["cat", "Q3"]])).toEqual([
      { id: "root", name: "animal", aliases: [], kind_of: [], same_as: "wikidata:Q729" },
      { id: "sloth", name: "ground sloth", aliases: [], kind_of: ["root"] },
      { id: "cat", name: "cat", aliases: [], kind_of: ["root"], same_as: "wikidata:Q3" },
    ]);
    expect(() => link([], [["cat", "Q9"]])).toThrow("hand pick cat (cat) → Q9: not among its loaded taxa (Q2, Q3)");
    expect(() => link([], [["sloth", "Q1"]])).toThrow("hand pick sloth");
    expect(() => link(["cat"], [])).toThrow("hand split cat (cat): it no longer joins one thing (2)");
    expect(() => link(["gone"], [], items)).toThrow("hand joins name synsets not in the tree: gone");
  });
});


describe("oddJoins", () => {
  it("lists WordNet items joined to a Wikidata item that shares none of their aliases", () => {
    const wikidata = new Map<string, Item>([
      ["Q1", { id: "Q1", name: "Dog", aliases: aliasesFor(["Dog"]) }],
      ["Q2", { id: "Q2", name: "Gliridae", aliases: aliasesFor(["Gliridae"]) }],
    ]);
    const wordnet: Item[] = [
      { id: "dog", name: "dog", aliases: aliasesFor(["dog", "domestic dog"]), same_as: "wikidata:Q1" },
      { id: "mouse", name: "mouse", aliases: aliasesFor(["mouse"]), same_as: "wikidata:Q2" },
      { id: "yeti", name: "yeti", aliases: aliasesFor(["yeti"]) },
    ];
    expect(oddJoins(wordnet, wikidata)).toEqual(new Map([["mouse", "Gliridae"]]));
  });
});

describe("parseLinks", () => {
  const link = { thing: "oewn:1-n", name: "tulip", kind_of: "oewn:2-n", kind_of_name: "flower" };
  it("takes a list of links, and refuses a link missing a field, holding an extra one, or with an empty name", () => {
    expect(parseLinks(JSON.stringify([link]))).toEqual([link]);
    expect(() => parseLinks(JSON.stringify({ link }))).toThrow("data/links.json: must be a list of links");
    const short = { thing: link.thing, name: link.name, kind_of: link.kind_of };
    for (const bad of [short, { ...link, note: "x" }, { ...link, name: " " }]) {
      expect(() => parseLinks(JSON.stringify([link, bad]))).toThrow("data/links.json link 2: must hold exactly thing, name, kind_of, kind_of_name, each as text");
    }
    expect(() => parseLinks(JSON.stringify([{ ...link, kind_of: "2-n" }]))).toThrow('data/links.json link 1: "thing" and "kind_of" must be refs as "source:id"');
  });
});

describe("riverShortNames", () => {
  it("gives the short name of an \"X River\" or \"River X\", and nothing for other names", () => {
    expect(riverShortNames([["Mississippi River", "River Thames", "Nile", "Rio Grande", "Red river"]])).toEqual([["Mississippi", "Thames", "Red"]]);
  });
  it("skips a short name two rivers give, however written, but not one a single river gives twice", () => {
    expect(riverShortNames([["Little River"], ["River Little"], ["little river", "Ohio River"], ["Hudson River", "River Hudson"]]))
      .toEqual([[], [], ["Ohio"], ["Hudson", "Hudson"]]);
  });
});

describe("foldLabels", () => {
  const row = (id: string, label: string, lang: string, alt?: string) => ({
    x: { value: `http://www.wikidata.org/entity/${id}` },
    label: { value: label, "xml:lang": lang },
    ...(alt ? { alt: { value: alt } } : {}),
  });
  it("takes the English label over the mul one in either row order, the mul one alone, and each alternative once", () => {
    const folded = foldLabels([
      row("Q1", "Mul Name", "mul", "a"), row("Q1", "English Name", "en", "a"), row("Q1", "Mul Name", "mul", "b"),
      row("Q2", "English Two", "en"), row("Q2", "Mul Two", "mul"),
      row("Q3", "Juneau", "mul", "City and Borough of Juneau"),
    ]);
    expect([...folded].map(([id, e]) => [id, e.label, e.alts])).toEqual([
      ["Q1", "English Name", ["a", "b"]],
      ["Q2", "English Two", []],
      ["Q3", "Juneau", ["City and Borough of Juneau"]],
    ]);
  });
});

describe("facts for subsets", () => {
  const items: Item[] = [
    { id: "Q1", name: "Nile", aliases: [] },
    { id: "Q2", name: "Rhine", aliases: [] },
    { id: "Q3", name: "Amur", aliases: [] },
  ];
  it("keeps a fact's values among the things loaded, and counts the rest", () => {
    const given = new Map([["Q1", [{ value: "QEgypt" }, { value: "QSudan" }, { value: "QSudan" }]], ["Q2", [{ value: "QOld" }]]]);
    const { items: out, dropped } = withFact(items, "country", given, new Set(["QEgypt", "QSudan"]));
    expect(out.map((i) => i.country)).toEqual([["QEgypt", "QSudan"], undefined, undefined]);
    expect(dropped).toBe(1);
  });

  it("takes the population with the latest point in time, and leaves out a tie it can't choose", () => {
    expect(latestNumber([{ value: "10", time: "2010-01-01T00:00:00Z" }, { value: "12", time: "2020-07-01T00:00:00Z" }, { value: "9" }])).toEqual({ value: 12, as_of: "2020-07-01" });
    expect(latestNumber([{ value: "7" }])).toEqual({ value: 7, as_of: null });
    expect(latestNumber([{ value: "7" }, { value: "8" }])).toBeNull();
    expect(latestNumber([{ value: "7", time: "2020-01-01T00:00:00Z" }, { value: "7", time: "2020-01-01T00:00:00Z" }])).toEqual({ value: 7, as_of: "2020-01-01" });
    expect(() => latestNumber([{ value: "1.5" }])).toThrow("not a whole number of people");
    const { items: out, ambiguous } = withPopulation(items, new Map([["Q1", [{ value: "5" }]], ["Q2", [{ value: "1" }, { value: "2" }]]]));
    expect(out.map((i) => i.population?.value)).toEqual([5, undefined, undefined]);
    expect(ambiguous).toBe(1);
  });
});

describe("localClient", () => {
  afterEach(() => vi.unstubAllEnvs());

  // Its guard read the URL's host while pg read ?host=, so this URL passed and pg went elsewhere (M13 13e-5, item 7).
  // .invalid never resolves (RFC 6761), so a regression fails on DNS without sending credentials anywhere.
  it("refuses a query parameter that would send pg to another host, before connecting", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres?host=elsewhere.invalid");
    await expect(localClient()).rejects.toThrow(/must not contain query parameters/);
  });

  it("refuses a database that isn't this machine", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@elsewhere.invalid:5432/postgres");
    await expect(localClient()).rejects.toThrow(/^refusing elsewhere\.invalid/);
  });
});
