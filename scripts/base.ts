// The answer database's imports (docs/milestones/M13-13a-the-base.md): `npm run base -- fetch|load <set>`,
// `npm run base -- load all` and `npm run base -- review <category>…`.
// - fetch: pulls one set from its source (SOURCES.md, M13 D2) into a snapshot outside git, data/snapshots/<set>/<date>.json,
//   and writes the committed manifest, data/manifests/<set>.json: source, date, method, item count and checksum.
// - load: loads the manifest's snapshot into the local stack with private.import_source. `load all` loads every set,
//   then the links in data/links.json (13e-2), then defines every category in data/categories.json, the one place
//   categories are defined (13e), and analyzes the base's tables (13e-5).
// - review: what the human reviews for an import or a batch of categories (human, 2026-10-24: "Summary + flags
//   (Recommended)", "Batches with flags (Recommended)"): each category's count, 20 random members, and flags.
// The local stack only (human, 2026-10-24: "Local only (Recommended)"): load and review refuse any other database.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import pluralize from "pluralize";
import { isLocalHost, readDatabaseUrl } from "../src/config/env.ts";
import { BASE_BATCH_IDS, BASE_PLACES_MIN_POPULATION, BASE_REVIEW_SAMPLE, BASE_VIDEO_GAME_MIN_SITELINKS, CATEGORY_MIN_MEMBERS } from "../src/config/tunables.ts";
import { parseBank, type Bank } from "../src/content/bank.ts";
import { CATEGORIES_FILE, filterOf, isSubset, parseCategories, type BaseCategory, type CategoryDef } from "../src/content/categories.ts";
import { normalize } from "../src/content/puzzle.ts";
import { thingId } from "../src/content/thing-id.ts";
import { isListed, isPlorListed } from "../src/game/misses.ts";

export type Alias = { alias: string; kind: "name" | "synonym" | "plural" | "scientific" };
// The facts subsets filter on (13e-4a, O2: "A core few") ride on an item beside its tree: thing-valued ones as source
// IDs, a population as a number with its point in time.
export type Population = { value: number; as_of: string | null };
export type FactTrait = "country" | "continent" | "conservation_status" | "genre" | "publisher";
export type Item = {
  id: string; name: string; aliases: Alias[]; kind_of?: string[]; member_of?: string[]; same_as?: string;
  country?: string[]; continent?: string[]; conservation_status?: string[]; genre?: string[]; publisher?: string[]; population?: Population;
  // Wikidata taxa a WordNet item could join, left unjoined because there are several (linkToWikidata); the review
  // prints them and import_source doesn't read them.
  unjoined?: string[];
  // A Wikidata item folded into the kept item of its set (13e-5b): it brings its names, not its facts.
  merged_into?: string;
};
type Source = "wikidata" | "oewn" | "usda";
type SetDef<T = Item> = { source: Source; method: string; fetch: () => Promise<T[]> };

// --- aliases ---

// A thing's aliases: each name normalized (src/content/puzzle.ts), with its plural (pluralize 8.0.0, as content
// plurals were: SOURCES.md), then synonyms and scientific names. The first kind an alias gets wins.
export function aliasesFor(names: string[], synonyms: string[] = [], scientific: string[] = []): Alias[] {
  const out = new Map<string, Alias["kind"]>();
  const add = (text: string, kind: Alias["kind"]) => {
    const alias = normalize(text);
    if (alias && !out.has(alias)) out.set(alias, kind);
  };
  for (const n of names) add(n, "name");
  for (const n of names) add(pluralize(n), "plural");
  for (const n of synonyms) add(n, "synonym");
  for (const n of scientific) add(n, "scientific");
  return [...out].map(([alias, kind]) => ({ alias, kind }));
}

// --- Wikidata (SOURCES.md, Wikidata: SPARQL limits 60 s, 5 parallel queries; queries here run one at a time) ---

const SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT = "PlorAnswerDatabase/0.1 (https://github.com/jasonex64/plor; M13 import)";
type Binding = Record<string, { value: string; "xml:lang"?: string }>;
let retries = 0;

// One query. A timeout (the service answers an error page, not JSON) returns "timeout"; every caller stops on it. HTTP 429 waits the Retry-After the service names and asks again, printed and counted (the 13a ticket).
// A 200 the service cut off and ended with its timeout error is a timeout too, not a JSON error (13f-3b-2).
export async function sparql(query: string): Promise<Binding[] | "timeout"> {
  for (;;) {
    const response = await fetch(SPARQL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/sparql-results+json", "user-agent": USER_AGENT },
      body: new URLSearchParams({ query }),
    });
    if (response.status === 429) {
      // Number(null) and Number("") are 0, so the header is checked before it's read as seconds.
      const header = response.headers.get("retry-after")?.trim();
      const wait = header ? Number(header) : NaN;
      if (!Number.isFinite(wait) || wait < 0) throw new Error(`SPARQL 429 without a usable Retry-After (${JSON.stringify(header ?? null)})`);
      retries++;
      console.log(`SPARQL 429: waiting ${wait} s as asked (retry ${retries})`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    const text = await response.text();
    if (response.ok) {
      try {
        return (JSON.parse(text) as { results: { bindings: Binding[] } }).results.bindings;
      } catch (err) {
        if (!(err instanceof SyntaxError)) throw err;
        if (/timeout|TimeoutException/i.test(text)) return "timeout";
        throw new Error(`SPARQL ${response.status}: the reply isn't JSON: ${text.slice(-300)}`);
      }
    }
    if (/timeout|TimeoutException/i.test(text)) return "timeout";
    throw new Error(`SPARQL ${response.status}: ${text.slice(0, 300)}`);
  }
}

const qid = (uri: string) => uri.replace("http://www.wikidata.org/entity/", "");

// --- facts for subsets (13e-4a; SOURCES.md, Wikidata properties) ---

// IUCN's categories, P141's one-of constraint (SOURCES.md, Wikidata properties).
const IUCN_STATUSES = ["Q211005", "Q719675", "Q278113", "Q96377276", "Q219127", "Q239509", "Q237350", "Q3245245", "Q3350324"];

export type Claim = { value: string; time?: string };

// Each item's best-rank statements of a property (wikibase:BestRank: the preferred ones, else the normal ones, as
// wdt: reads them), with their point in time (P585), for the items `where` selects as ?x.
async function claims(where: string, property: string): Promise<Map<string, Claim[]>> {
  const rows = await sparql(`SELECT ?x ?v ?t WHERE { ${where}
    ?x p:${property} ?claim . ?claim a wikibase:BestRank ; ps:${property} ?v . OPTIONAL { ?claim pq:P585 ?t } }`);
  if (rows === "timeout") throw new Error(`the ${property} query timed out`);
  const out = new Map<string, Claim[]>();
  for (const r of rows) {
    const id = qid(r.x.value);
    out.set(id, [...(out.get(id) ?? []), { value: qid(r.v.value), ...(r.t ? { time: r.t.value } : {}) }]);
  }
  return out;
}

// Each item with the values its claims give a fact, keeping only those in allowed (things the import loads): a
// country outside the 193 is dropped and counted (human, 2026-10-26, A3: "Drop and count them (Recommended)").
export function withFact(items: Item[], trait: FactTrait, given: Map<string, Claim[]>, allowed: Set<string>): { items: Item[]; dropped: number } {
  let dropped = 0;
  const out = items.map((item) => {
    const values = [...new Set((given.get(item.id) ?? []).map((c) => c.value))];
    const kept = values.filter((v) => allowed.has(v));
    dropped += values.length - kept.length;
    return kept.length ? { ...item, [trait]: kept } : item;
  });
  return { items: out, dropped };
}

// The population a thing is given: among its best-rank values, the one with the latest point in time (P1082 requires
// one: SOURCES.md, Wikidata properties). null when values tie for latest (undated, or the same date) and any of them
// differ, as the import can't choose between them; the caller counts those.
export function latestNumber(given: Claim[]): Population | null {
  const sorted = [...given].sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
  const [top] = sorted;
  if (sorted.some((c) => (c.time ?? "") === (top.time ?? "") && c.value !== top.value)) return null;
  const value = Number(top.value);
  // Third-party data: a value that isn't a whole number of people stops the fetch.
  if (!Number.isInteger(value) || value < 0) throw new Error(`population ${JSON.stringify(top.value)} is not a whole number of people`);
  return { value, as_of: top.time ? top.time.slice(0, 10) : null };
}

// Each item with its population, and how many had values the import can't choose between.
export function withPopulation(items: Item[], given: Map<string, Claim[]>): { items: Item[]; ambiguous: number } {
  let ambiguous = 0;
  const out = items.map((item) => {
    const values = given.get(item.id);
    if (!values) return item;
    const population = latestNumber(values);
    if (!population) ambiguous++;
    return population ? { ...item, population } : item;
  });
  return { items: out, ambiguous };
}

// Things a fact names (continents, IUCN statuses), by their label alone: their alternative labels are codes and
// plurals ("na", "lc", "003 un m49 code", "endangereds") that would make those misses "rejected" in every category
// (13e-4b design 4).
export function valueItems(found: Awaited<ReturnType<typeof labelled>>): Item[] {
  return [...found].map(([id, e]) => ({ id, name: e.label, aliases: [{ alias: normalize(e.label), kind: "name" as const }] }));
}

// A set's facts, printed with what was dropped, as each fetch reports them.
async function factsFor(set: string, items: Item[], where: string, facts: { trait: FactTrait; property: string; allowed: Set<string> }[], population: boolean): Promise<Item[]> {
  let out = items;
  for (const f of facts) {
    const { items: next, dropped } = withFact(out, f.trait, await claims(where, f.property), f.allowed);
    out = next;
    console.log(`${set}: ${f.trait} on ${out.filter((i) => i[f.trait]).length} of ${out.length} items${dropped ? `, ${dropped} values outside the things loaded dropped` : ""}`);
  }
  if (population) {
    const { items: next, ambiguous } = withPopulation(out, await claims(where, "P1082"));
    out = next;
    console.log(`${set}: population on ${out.filter((i) => i.population).length} of ${out.length} items${ambiguous ? `, ${ambiguous} left out with two latest values` : ""}`);
  }
  return out;
}

// The 193 countries of the wikidata-countries snapshot, the only countries a fact may name (A3).
function countryIds(): Set<string> {
  const ids = readSnapshot("wikidata-countries").items.filter((i) => i.member_of?.includes("Q1065")).map((i) => i.id);
  if (ids.length !== 193) throw new Error(`wikidata-countries holds ${ids.length} countries, expected 193`);
  return new Set(ids);
}

// The continents the countries' facts name, by ID: wherever a set loads one (the places set too), it's named by its
// label alone, as valueItems names it in the countries set (13e-4b review; 13f-4b).
function continentIds(): Set<string> {
  return new Set(readSnapshot("wikidata-countries").items.flatMap((i) => i.continent ?? []));
}

type Taxon = { names: string[]; synonyms: string[]; scientific: string[]; parents: Set<string>; label?: string };

// A query asked about Wikidata IDs, BASE_BATCH_IDS at a time: `pattern` gets the batch as a VALUES list. By key, never by
// position: reading the index in pages (bd:slice offsets) skipped and repeated rows, as each query server orders its
// index by its own internal IDs and the servers differ (SOURCES.md, Wikidata Query Service behaviour), and each read
// lost a different branch of the tree (13e-4c).
async function byIds(ids: string[], label: string, pattern: (values: string) => string, onRows: (rows: Binding[]) => void): Promise<void> {
  for (let i = 0; i < ids.length; i += BASE_BATCH_IDS) {
    const rows = await sparql(pattern(ids.slice(i, i + BASE_BATCH_IDS).map((id) => `wd:${id}`).join(" ")));
    if (rows === "timeout") throw new Error(`${label}: the batch at ${i} of ${ids.length} IDs timed out`);
    onRows(rows);
  }
}

// Every taxon under root (P171 parent taxon, followed down from root) that has an English common name (P1843),
// with every ancestor between them and root; their scientific names (P225). US English (human, 2026-10-24): "en"
// and "en-us" names are names, other English variants synonyms. The tree is read top-down, the children of each
// level's taxa by key, each taxon asked about once, so a cycle in the source can't loop (13e-4c).
async function fetchTaxa(root: string): Promise<Map<string, Taxon>> {
  const parents = new Map<string, string[]>();
  const under = new Set([root]);
  let level = [root];
  for (let depth = 1; level.length; depth++) {
    const next: string[] = [];
    await byIds(level, "P171", (v) => `SELECT ?t ?p WHERE { VALUES ?p { ${v} } ?t wdt:P171 ?p . }`, (rows) => {
      for (const r of rows) {
        const [t, p] = [qid(r.t.value), qid(r.p.value)];
        parents.set(t, [...(parents.get(t) ?? []), p]);
        if (!under.has(t)) {
          under.add(t);
          next.push(t);
        }
      }
    });
    console.log(`P171: level ${depth}, ${next.length} new taxa, ${under.size} in all`);
    level = next;
  }
  console.log(`${under.size} taxa under ${root}`);

  const taxa = new Map<string, Taxon>();
  const taxon = (id: string) => {
    let t = taxa.get(id);
    if (!t) taxa.set(id, (t = { names: [], synonyms: [], scientific: [], parents: new Set((parents.get(id) ?? []).filter((p) => under.has(p))) }));
    return t;
  };
  await byIds([...under], "P1843", (v) => `SELECT ?t ?name WHERE { VALUES ?t { ${v} } ?t wdt:P1843 ?name . }`, (rows) => {
    for (const r of rows) {
      const id = qid(r.t.value);
      const lang = r.name["xml:lang"] ?? "";
      if (!lang.startsWith("en")) continue;
      const t = taxon(id);
      const list = lang === "en" || lang === "en-us" ? t.names : t.synonyms;
      if (!list.includes(r.name.value)) list.push(r.name.value);
    }
  });
  // Ancestors of the named taxa, up to root: the tree a host answer covers.
  const climb = [...taxa.keys()];
  while (climb.length) {
    const id = climb.pop()!;
    if (id === root) continue;
    for (const p of taxon(id).parents) {
      if (taxa.has(p)) continue;
      taxon(p);
      climb.push(p);
    }
  }
  taxon(root);
  await byIds([...taxa.keys()], "P225", (v) => `SELECT ?t ?sci WHERE { VALUES ?t { ${v} } ?t wdt:P225 ?sci . }`, (rows) => {
    for (const r of rows) {
      const t = taxa.get(qid(r.t.value))!;
      if (!t.scientific.includes(r.sci.value)) t.scientific.push(r.sci.value);
    }
  });
  // Each kept taxon's English label, which names it when it is one of its common names (human, 2026-10-26: "Wikidata's
  // English label first (Recommended)").
  await byIds([...taxa.keys()], "rdfs:label", (v) => `SELECT ?t ?l WHERE { VALUES ?t { ${v} } ?t rdfs:label ?l . FILTER(LANG(?l) = "en") }`, (rows) => {
    for (const r of rows) taxa.get(qid(r.t.value))!.label = r.l.value;
  });
  console.log(`${taxa.size} taxa kept, ${[...taxa.values()].filter((t) => t.names.length).length} with an English name`);
  return taxa;
}

// Taxa into items. A taxon's name is its English label when that is one of its English common names (human,
// 2026-10-26: "Wikidata's English label first (Recommended)": "vaquita", not the alphabetical "Chochito"), else its first
// English name in alphabetical order, else its scientific name (it then has no 'name' alias, so it can't be answered:
// private.category_members). The query service returns a taxon's names in no fixed order, so "first as returned"
// named the elephant shark "Ghost Shark" on one fetch and "Whitefish" on the next (13e-4c). root keeps no parents;
// every other parent is in the map.
export function taxaToItems(taxa: Map<string, Taxon>, root: string): Item[] {
  return [...taxa].map(([id, t]) => ({
    id,
    name: t.names.find((n) => t.label !== undefined && normalize(n) === normalize(t.label)) ?? [...t.names].sort((a, b) => a.localeCompare(b, "en"))[0] ?? t.scientific[0] ?? id,
    aliases: aliasesFor(t.names, t.synonyms, t.scientific),
    kind_of: id === root ? [] : [...t.parents].filter((p) => taxa.has(p)),
  }));
}

// Labelled items: ?x with its English label, else its "mul" label, and its English and "mul" alternative labels
// (skos:altLabel), as synonyms. "mul" is Wikidata's default for all languages, where English falls back to it when it
// has no label of its own (SOURCES.md, Wikidata default labels; human, 2026-10-25: "Use mul when no English
// (Recommended)").
async function labelled(where: string): Promise<Map<string, { label: string; alts: string[]; parents: Set<string> }>> {
  const rows = await sparql(`SELECT ?x ?label ?alt ?parent WHERE { ${where}
    ?x rdfs:label ?label . FILTER(LANG(?label) = "en" || LANG(?label) = "mul")
    OPTIONAL { ?x skos:altLabel ?alt . FILTER(LANG(?alt) = "en" || LANG(?alt) = "mul") } }`);
  if (rows === "timeout") throw new Error("query timed out");
  return foldLabels(rows);
}

// The query's rows, one per label and alternative label, into one entry per item: the English label wins over the
// mul one whatever the row order, and each alternative label is kept once.
export function foldLabels(rows: Binding[]): Map<string, { label: string; alts: string[]; parents: Set<string> }> {
  const out = new Map<string, { label: string; alts: string[]; parents: Set<string> }>();
  const english = new Set<string>();
  for (const r of rows) {
    const id = qid(r.x.value);
    const entry = out.get(id) ?? { label: r.label.value, alts: [], parents: new Set<string>() };
    if (r.label["xml:lang"] === "en" && !english.has(id)) {
      english.add(id);
      entry.label = r.label.value;
    }
    if (r.alt && !entry.alts.includes(r.alt.value)) entry.alts.push(r.alt.value);
    if (r.parent) entry.parents.add(qid(r.parent.value));
    out.set(id, entry);
  }
  return out;
}

async function rootItem(id: string, expected: string): Promise<Item> {
  const found = await labelled(`VALUES ?x { wd:${id} }`);
  const label = found.get(id)?.label;
  if (label !== expected) throw new Error(`${id} is labelled ${JSON.stringify(label)}, expected ${JSON.stringify(expected)}`);
  return { id, name: label, aliases: aliasesFor([label]) };
}

function labelledItems(found: Awaited<ReturnType<typeof labelled>>, kindOf: (id: string, parents: Set<string>) => string[], memberOf: string[] = [], more: (id: string) => string[] = () => []): Item[] {
  return [...found].map(([id, e]) => ({ id, name: e.label, aliases: aliasesFor([e.label], [...e.alts, ...more(id)]), kind_of: kindOf(id, e.parents), member_of: memberOf }));
}

// Each river's short names, as players type them: "Mississippi" for "Mississippi River", "Thames" for "River Thames"
// (human, 2026-10-25: "Yes, for rivers (Recommended)"). A short name two or more rivers give is skipped: "Little"
// from 64 rivers would make a generic word a river, a dodge (human, 2026-10-25: "Skip shared names (Recommended)").
export function riverShortNames(rivers: string[][]): string[][] {
  const short = rivers.map((names) => names.flatMap((n) => {
    const m = /^(.+) River$/i.exec(n) ?? /^River (.+)$/i.exec(n);
    return m ? [m[1]] : [];
  }));
  const givenBy = new Map<string, Set<number>>();
  short.forEach((names, i) => names.forEach((n) => givenBy.set(normalize(n), (givenBy.get(normalize(n)) ?? new Set()).add(i))));
  return short.map((names) => names.filter((n) => givenBy.get(normalize(n))!.size === 1));
}

// --- Open English WordNet 2025 (SOURCES.md) and USDA FoodData Central SR Legacy (SOURCES.md) ---

const OEWN_ZIP = "https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025-json.zip";
const USDA_ZIP = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip";
const OEWN_CHEESE = "07866305-n"; // "a solid food prepared from the pressed curd of milk" (noun.food.json)

const OEWN_ANIMAL = "00015568-n"; // "a living organism characterized by voluntary movement" (noun.Tops.json)
const OEWN_ENTITY = "00001740-n"; // "entity": the root every noun synset is under (noun.Tops.json)

type Synset = { members: string[]; hypernym?: string[]; instance_hypernym?: string[]; wikidata?: string | string[] };

// A synset and everything under it, through hypernym and instance_hypernym links. root keeps no parents.
export function oewnSubtree(synsets: Record<string, Synset>, root: string): Item[] {
  const children = new Map<string, string[]>();
  for (const [id, s] of Object.entries(synsets))
    for (const h of [...(s.hypernym ?? []), ...(s.instance_hypernym ?? [])]) children.set(h, [...(children.get(h) ?? []), id]);
  const ids = new Set<string>();
  const stack = [root];
  while (stack.length) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return [...ids].map((id) => {
    const s = synsets[id];
    const parents = [...(s.hypernym ?? []), ...(s.instance_hypernym ?? [])].filter((h) => ids.has(h));
    return { id, name: s.members[0], aliases: aliasesFor(s.members), kind_of: id === root ? [] : parents };
  });
}

const wikidataIds = (synset: Synset) => [synset.wikidata ?? []].flat();

// Links WordNet items to the Wikidata things they name (a synset may carry its Wikidata ID), when that thing is
// already loaded (known), so the two trees join. root is linked to rootLink, the category's Wikidata root.
// A synset naming a common-name item (Q144 "dog") joins the taxon taxaOf gives it by P13176 when exactly one of them
// is loaded; one naming several loaded taxa (cat, cattle, rabbit) stays its own thing and keeps them as unjoined, for
// the review (13e-5 item 1; SOURCES.md, Wikidata common-name link; human, 2026-10-26: "Join only clear cases").
// A synset may give a list of IDs (["Q124657158", "Q664443"]): the same rule holds over all they name.
// hand holds a person's decisions from the review: joins to split, each with the thing it rejects, the taxon an
// unjoined word joins, and the thing a synset naming no loaded Wikidata item joins (13e-5b). Each must
// still fit the data, or the fetch stops naming it, so a re-fetch can't apply a stale decision silently.
export type HandJoins = { split: Map<string, string>; pick: Map<string, string>; join: Map<string, string> };
export function linkToWikidata(items: Item[], synsets: Record<string, Synset>, known: Set<string>, root: string, rootLink: string, taxaOf: Map<string, string[]>, hand: HandJoins): Item[] {
  const used = new Set<string>();
  const linked = items.map((item) => {
    if (item.id === root) return { ...item, same_as: `wikidata:${rootLink}` };
    const taxa = [...new Set(wikidataIds(synsets[item.id]).flatMap((id) => (known.has(id) ? [id] : (taxaOf.get(id) ?? []).filter((t) => known.has(t)))))];
    const rejected = hand.split.get(item.id);
    if (rejected) {
      if (taxa.length !== 1 || taxa[0] !== rejected) throw new Error(`hand split ${item.id} (${item.name}) from ${rejected}: it now joins ${taxa.join(", ") || "nothing"}`);
      used.add(item.id);
      return item;
    }
    const pick = hand.pick.get(item.id);
    if (pick) {
      if (taxa.length < 2 || !taxa.includes(pick)) throw new Error(`hand pick ${item.id} (${item.name}) → ${pick}: not among its loaded taxa (${taxa.join(", ") || "none"})`);
      used.add(item.id);
      return { ...item, same_as: `wikidata:${pick}` };
    }
    const join = hand.join.get(item.id);
    if (join) {
      if (taxa.length || !known.has(join)) throw new Error(`hand join ${item.id} (${item.name}) → ${join}: ${taxa.length ? `it already names ${taxa.join(", ")}` : "not loaded"}`);
      used.add(item.id);
      return { ...item, same_as: `wikidata:${join}` };
    }
    if (taxa.length === 1) return { ...item, same_as: `wikidata:${taxa[0]}` };
    return taxa.length ? { ...item, unjoined: taxa } : item;
  });
  const unused = [...hand.split.keys(), ...hand.pick.keys(), ...hand.join.keys()].filter((id) => !used.has(id));
  if (unused.length) throw new Error(`hand joins name synsets not in the tree: ${unused.join(", ")}`);
  return linked;
}

// Joins whose two sides share no alias, for the review (13e-5 item 2): the WordNet item and the Wikidata item it's
// same_as. Only Wikidata joins are checked: USDA's cheeses join WordNet's by a shared name (usdaCheeses).
export function oddJoins(wordnet: Item[], wikidata: Map<string, Item>): Map<string, string> {
  const odd = new Map<string, string>();
  for (const item of wordnet) {
    const target = item.same_as?.startsWith("wikidata:") ? wikidata.get(item.same_as.slice("wikidata:".length)) : undefined;
    if (!target) continue;
    const names = new Set(target.aliases.map((a) => a.alias));
    if (!item.aliases.some((a) => names.has(a.alias))) odd.set(item.id, target.name);
  }
  return odd;
}

// RFC 4180 rows: quoted fields may hold commas and doubled quotes. The file is untrusted input from disk.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endField();
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (quoted) throw new Error("CSV ends inside a quoted field");
  if (field || row.length) {
    endField();
    rows.push(row);
  }
  return rows;
}

// SR Legacy descriptions whose first part describes a cheese instead of naming a kind: processing, origin, color,
// freshness, fat and salt (human, 2026-10-24: "Keep real kinds only (Recommended)"; the list is in the 13a ticket).
export const USDA_NOT_KINDS = new Set(["pasteurized process", "mexican", "mexican blend", "american cheddar", "dry white", "white", "fresh", "low fat", "low-sodium"]);

// SR Legacy cheeses: foods in "Dairy and Egg Products" described "Cheese, <kind>, ...". Each kind once, linked to
// the WordNet cheese with the same name (as "<kind>" or "<kind> cheese") if there is one, else a new cheese under
// WordNet's cheese.
export function usdaCheeses(foodCsv: string, categoryCsv: string, cheeseTree: Item[]): Item[] {
  const [catHeader, ...cats] = parseCsv(categoryCsv);
  const dairy = cats.find((r) => r[catHeader.indexOf("description")] === "Dairy and Egg Products")?.[catHeader.indexOf("id")];
  if (!dairy) throw new Error("food_category.csv has no Dairy and Egg Products");
  const [header, ...foods] = parseCsv(foodCsv);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`food.csv has no ${name} column`);
    return i;
  };
  const [idCol, descCol, catCol] = [col("fdc_id"), col("description"), col("food_category_id")];
  const byAlias = new Map<string, string>();
  for (const item of cheeseTree) for (const a of item.aliases) if (!byAlias.has(a.alias)) byAlias.set(a.alias, item.id);
  const out = new Map<string, Item>();
  for (const f of foods) {
    if (f[catCol] !== dairy || !f[descCol]?.startsWith("Cheese, ")) continue;
    // A note in parentheses ("cheddar (includes foods for USDA's food distribution program)") isn't part of the name.
    const kind = f[descCol].split(",")[1].replace(/\([^)]*\)/g, "").trim().toLowerCase();
    if (!kind || out.has(kind) || USDA_NOT_KINDS.has(kind)) continue;
    const name = kind.endsWith("cheese") ? kind : `${kind} cheese`;
    const same = byAlias.get(normalize(kind)) ?? byAlias.get(normalize(name));
    out.set(kind, {
      id: f[idCol],
      name,
      aliases: aliasesFor([name], name === kind ? [] : [kind]),
      ...(same ? { same_as: `oewn:${same}` } : { kind_of: [`oewn:${OEWN_CHEESE}`] }),
    });
  }
  return [...out.values()];
}

// Writes a downloaded zip into a new empty directory and extracts the files pick chooses from its listing with bsdtar (Windows' tar.exe and macOS
// tar read zips; GNU tar doesn't). Returns their text.
function unzip(url: string, zip: Buffer, pick: (listed: string[]) => string[]): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), "plor-base-"));
  try {
    writeFileSync(join(dir, "download.zip"), zip);
    const tar = process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
    const listing = spawnSync(tar, ["-tf", "download.zip"], { cwd: dir, encoding: "utf8" });
    if (listing.status !== 0) throw new Error(`listing ${url}: ${listing.stderr || listing.error}`);
    const names = pick(listing.stdout.split(/\r?\n/).filter(Boolean));
    if (!names.length) throw new Error(`${url}: nothing to extract`);
    const result = spawnSync(tar, ["-xf", "download.zip", ...names], { cwd: dir, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`extracting ${url}: ${result.stderr || result.error}`);
    return Object.fromEntries(names.map((n) => [n, readFileSync(join(dir, n), "utf8")]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// --- the sets for the 13a test day (T1) ---

const ANIMALIA = "Q729"; // labelled "animal"
const DOG = "Q26972265"; // Canis lupus familiaris: no taxon has the English common name "dog" (checked 2026-10-24)

// --- pop culture (13e-6; SOURCES.md, Wikidata pop culture) ---

// English words for a whole number, and back ("Mario Kart 8" ↔ "Mario Kart Eight": 13e-5 item 6, numbers both ways).
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
  "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES: [number, string][] = [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"], [100, "hundred"]];
export function numberWords(n: number): string {
  for (const [size, word] of SCALES) {
    if (n >= size) return `${numberWords(Math.floor(n / size))} ${word}${n % size ? ` ${numberWords(n % size)}` : ""}`;
  }
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}
// A run of number words counts only if it spells its own number back ("sixty four", not "hundred" or "one one").
export function wordsNumber(words: string[]): number | null {
  const n = parseWords(words);
  return n !== null && numberWords(n) === words.join(" ") ? n : null;
}
function parseWords(words: string[]): number | null {
  let total = 0;
  let part = 0;
  for (const w of words) {
    const scale = SCALES.find(([, name]) => name === w)?.[0];
    if (ONES.includes(w)) part += ONES.indexOf(w);
    else if (TENS.indexOf(w) > 1) part += TENS.indexOf(w) * 10;
    else if (scale === 100) part *= 100;
    else if (scale) {
      total += part * scale;
      part = 0;
    } else return null;
  }
  return total + part;
}

// A title's other forms (13e-5 item 6; human, 2026-10-26: "Very lenient (Recommended)"): without a leading "the", "a"
// or "an" ("The Lion King" → "Lion King"), the part after a subtitle's colon ("Zelda: Breath of the Wild" → "Breath of
// the Wild"), and its numbers in the other spelling ("Mario Kart 8" ↔ "Mario Kart Eight").
export function titleForms(title: string): string[] {
  const forms = new Set<string>();
  const add = (t: string) => {
    const bare = t.trim().replace(/^(the|a|an)\s+/i, "");
    if (bare) forms.add(bare);
    if (bare !== t.trim()) forms.add(t.trim());
  };
  add(title);
  const colon = title.indexOf(":");
  if (colon > 0 && colon < title.length - 1) add(title.slice(colon + 1));
  for (const f of [...forms]) {
    if (/\d/.test(f)) forms.add(f.replace(/\d+/g, (d) => numberWords(Number(d))));
    const words = f.split(/(\s+)/);
    let changed = false;
    const out: string[] = [];
    for (let i = 0; i < words.length; ) {
      let j = i;
      const run: string[] = [];
      while (j < words.length && (/^\s+$/.test(words[j]) ? run.length > 0 : parseWords([words[j].toLowerCase()]) !== null)) {
        if (!/^\s+$/.test(words[j])) run.push(words[j].toLowerCase());
        j++;
      }
      const value = run.length ? wordsNumber(run) : null;
      if (value !== null) {
        out.push(String(value), ...(/^\s+$/.test(words[j - 1] ?? "") ? [words[j - 1]] : []));
        changed = true;
        i = j;
      } else {
        out.push(words[i]);
        i++;
      }
    }
    if (changed) forms.add(out.join("").trim());
  }
  forms.delete(title.trim());
  return [...forms];
}

// Titled items: each label and its other names, and the title forms; a form two items share goes to the one with more
// sitelinks, and no form another item has as its own name is given (13e-5 item 6: "the other keeps its full title").
export function titledItems(found: Map<string, { label: string; alts: string[]; parents: Set<string> }>, sitelinks: Map<string, number>, kindOf: (id: string, parents: Set<string>) => string[]): Item[] {
  const own = new Map<string, string[]>();
  for (const [id, e] of found) own.set(id, [e.label, ...e.alts].map(normalize));
  const ownNames = new Set([...own.values()].flat());
  const forms = new Map<string, string[]>();
  for (const [id, e] of found) for (const t of [e.label, ...e.alts]) for (const f of titleForms(t)) {
    const n = normalize(f);
    if (!n || own.get(id)!.includes(n) || ownNames.has(n)) continue;
    forms.set(n, [...new Set([...(forms.get(n) ?? []), id])]);
  }
  const extra = new Map<string, string[]>();
  for (const [form, ids] of forms) {
    const ranked = [...ids].sort((a, b) => (sitelinks.get(b) ?? 0) - (sitelinks.get(a) ?? 0));
    if (ranked.length > 1 && (sitelinks.get(ranked[0]) ?? 0) === (sitelinks.get(ranked[1]) ?? 0)) continue;
    extra.set(ranked[0], [...(extra.get(ranked[0]) ?? []), form]);
  }
  return [...found].map(([id, e]) => ({ id, name: e.label, aliases: aliasesFor([e.label], [...e.alts, ...(extra.get(id) ?? [])]), kind_of: kindOf(id, e.parents) }));
}

const ENWIKI = "?article schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> .";

// Labels for many IDs, by key in batches (one query listing every label timed out for tabletop games); parents, when
// given, ride along as labelled's do.
async function labelledIds(ids: string[], parents: Map<string, Set<string>> = new Map()): Promise<Map<string, { label: string; alts: string[]; parents: Set<string> }>> {
  const rows: Binding[] = [];
  await byIds(ids, "labels", (v) => `SELECT ?x ?label ?alt WHERE { VALUES ?x { ${v} } ?x rdfs:label ?label . FILTER(LANG(?label) = "en" || LANG(?label) = "mul")
    OPTIONAL { ?x skos:altLabel ?alt . FILTER(LANG(?alt) = "en" || LANG(?alt) = "mul") } }`, (r) => rows.push(...r));
  const found = foldLabels(rows);
  for (const [id, e] of found) e.parents = parents.get(id) ?? new Set();
  return found;
}

// The IDs a pattern finds, with the values of ?parent when it binds one, without labels.
async function idsWhere(where: string): Promise<Map<string, Set<string>>> {
  const rows = await sparql(`SELECT ?x ?parent WHERE { ${where} }`);
  if (rows === "timeout") throw new Error("query timed out");
  const out = new Map<string, Set<string>>();
  for (const r of rows) {
    const id = qid(r.x.value);
    if (!out.has(id)) out.set(id, new Set());
    if (r.parent) out.get(id)!.add(qid(r.parent.value));
  }
  return out;
}

async function sitelinksOf(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  await byIds(ids, "sitelinks", (v) => `SELECT ?x ?n WHERE { VALUES ?x { ${v} } ?x wikibase:sitelinks ?n . }`, (rows) => {
    for (const r of rows) out.set(qid(r.x.value), Number(r.n.value));
  });
  return out;
}

// Each member's single-medium series (P179 to an item of seriesClass that's no Q196600 media franchise: 13e-5 item 5;
// human, 2026-10-26: "Skip cross-media series"), so a host saying "Mario Kart" catches "Mario Kart 8".
async function seriesOf(ids: string[], seriesClass: string): Promise<Map<string, string>> {
  const all = new Map<string, Set<string>>();
  // Two queries: each member's series, then which of them are seriesClass and no franchise (one query with both timed
  // out on 5,347 video games, 2026-10-27).
  await byIds(ids, "P179", (v) => `SELECT ?x ?s WHERE { VALUES ?x { ${v} } ?x wdt:P179 ?s . }`, (rows) => {
    for (const r of rows) all.set(qid(r.x.value), new Set([...(all.get(qid(r.x.value)) ?? []), qid(r.s.value)]));
  });
  const single = new Set<string>();
  await byIds([...new Set([...all.values()].flatMap((s) => [...s]))], "series class", (v) => `SELECT ?s WHERE { VALUES ?s { ${v} } ?s wdt:P31 wd:${seriesClass} .
    FILTER NOT EXISTS { ?s wdt:P31 wd:Q196600 } }`, (rows) => {
    for (const r of rows) single.add(qid(r.s.value));
  });
  // One series each: a member in two (rare) stays under the root, so no series catches a member it doesn't own.
  return new Map([...all].map(([id, s]) => [id, [...s].filter((x) => single.has(x))] as const).filter(([, s]) => s.length === 1).map(([id, s]) => [id, s[0]]));
}

// The series none of whose names (label or other names) is a member's name, so no name names a series and a title.
export function distinctSeries<T extends { label: string; alts: string[] }>(series: Map<string, T>, members: Map<string, { label: string; alts: string[] }>): Map<string, T> {
  const names = new Set([...members.values()].flatMap((e) => [e.label, ...e.alts].map(normalize)));
  return new Map([...series].filter(([, e]) => ![e.label, ...e.alts].some((n) => names.has(normalize(n)))));
}

// A set of titles under root: the members where finds, their single-medium series (when seriesClass names one) under
// root with the members under them, title forms, and the facts asked for, whose values are items of the set.
// A genre counts its sub-genres (human, 2026-10-27: "Yes, count sub-genres (Recommended)"): each value's broader
// values among within, so "platform fighter" also gives "fighting game". The class tree is walked up a level a query
// (each class's P279 parents), as the animal tree is read by key: one P279+ query over every genre timed out.
// Genre links not followed: racing games aren't sports games here (human, 2026-10-27: "Leave racing out
// (Recommended)"), though Wikidata files racing video game (Q860750) under sports video game (Q868217).
const GENRE_LINKS_CUT = new Set(["Q860750 Q868217"]);

async function broaderWithin(values: string[], within: Set<string>): Promise<Map<string, string[]>> {
  const parents = new Map<string, string[]>();
  let level = [...new Set(values)];
  while (level.length) {
    const next = new Set<string>();
    await byIds(level, "P279", (v) => `SELECT ?g ?p WHERE { VALUES ?g { ${v} } ?g wdt:P279 ?p . }`, (rows) => {
      for (const r of rows) {
        const [g, p] = [qid(r.g.value), qid(r.p.value)];
        if (GENRE_LINKS_CUT.has(`${g} ${p}`)) continue;
        parents.set(g, [...(parents.get(g) ?? []), p]);
        next.add(p);
      }
    });
    for (const g of level) if (!parents.has(g)) parents.set(g, []);
    level = [...next].filter((p) => !parents.has(p));
  }
  const up = new Map<string, string[]>();
  for (const v of values) {
    const seen = new Set<string>();
    const stack = [...(parents.get(v) ?? [])];
    while (stack.length) {
      const p = stack.pop()!;
      if (seen.has(p)) continue;
      seen.add(p);
      stack.push(...(parents.get(p) ?? []));
    }
    const broader = [...seen].filter((p) => within.has(p) && p !== v);
    if (broader.length) up.set(v, broader);
  }
  return up;
}

async function titleSet(set: string, root: Item, where: string, seriesClass: string | null, facts: { trait: FactTrait; property: string; only?: string[]; broader?: boolean }[]): Promise<Item[]> {
  const found = await labelledIds([...(await idsWhere(where)).keys()]);
  const ids = [...found.keys()];
  const linked = seriesClass ? await seriesOf(ids, seriesClass) : new Map<string, string>();
  const seriesIds = [...new Set(linked.values())].filter((s) => !found.has(s));
  const allSeries = seriesIds.length ? await labelledIds(seriesIds) : new Map<string, { label: string; alts: string[]; parents: Set<string> }>();
  // A series that shares a name with a member would give that name two things ("Minecraft"), so it's left out and its
  // entries sit under the root (human, 2026-10-27: "Keep only distinct names (Recommended)").
  const seriesFound = distinctSeries(allSeries, found);
  const series = new Map([...linked].filter(([, s]) => seriesFound.has(s) || found.has(s)));
  const links = await sitelinksOf([...ids, ...seriesFound.keys()]);
  const both = new Map([...found, ...seriesFound]);
  let items = titledItems(both, links, (id) => (series.has(id) && both.has(series.get(id)!) ? [series.get(id)!] : [root.id]));
  const valueItems: Item[] = [];
  for (const f of facts) {
    const given = new Map<string, Claim[]>();
    // Only item values: an "unknown value" comes back as a generated .well-known/genid IRI, which names nothing to load.
    await byIds(ids, f.property, (v) => `SELECT ?x ?v WHERE { VALUES ?x { ${v} } ?x wdt:${f.property} ?v .
      FILTER(STRSTARTS(STR(?v), "http://www.wikidata.org/entity/Q")) }`, (rows) => {
      for (const r of rows) given.set(qid(r.x.value), [...(given.get(qid(r.x.value)) ?? []), { value: qid(r.v.value) }]);
    });
    const used = [...new Set([...given.values()].flat().map((c) => c.value))];
    if (f.broader) {
      const up = await broaderWithin(used, new Set(f.only ?? used));
      for (const [id, claims] of given) given.set(id, [...claims, ...claims.flatMap((c) => (up.get(c.value) ?? []).map((value) => ({ value })))]);
    }
    const values = f.only ?? used;
    const labelledValues = values.length ? await labelledIds(values) : new Map();
    for (const [id, e] of labelledValues) if (!both.has(id) && id !== root.id) valueItems.push({ id, name: e.label, aliases: aliasesFor([e.label], e.alts) });
    const { items: next, dropped } = withFact(items, f.trait, given, new Set(labelledValues.keys()));
    items = next;
    console.log(`${set}: ${f.trait} on ${items.filter((i) => i[f.trait]).length} of ${items.length} items${dropped ? `, ${dropped} values dropped (${f.only ? "outside the set's own values" : "no English or mul label"})` : ""}`);
  }
  console.log(`${set}: ${found.size} members, ${seriesFound.size} series (${allSeries.size - seriesFound.size} left out, named like an entry)`);
  return [root, ...valueItems.filter((v, i, all) => all.findIndex((o) => o.id === v.id) === i), ...items];
}

// In load order: a set's refs and same_as name only sets above it (`npm run base -- load all` loads them in turn).
const SETS: Record<string, SetDef> = {
  "wikidata-animals": {
    source: "wikidata",
    method: `SPARQL by key, ${BASE_BATCH_IDS} IDs a query: the tree under ${ANIMALIA} read top-down by P171 parent taxon, each taxon's English common names (P1843), and for the taxa kept (those with an English name, plus their ancestors up to it) their scientific names (P225) and English labels (named by the label when it is one of the common names, else the first common name alphabetically); each taxon's IUCN conservation status (P141, truthy) among the 9 of its one-of constraint, which are items of the set`,
    fetch: async () => {
      const taxa = await fetchTaxa(ANIMALIA);
      if (!taxa.has(DOG)) throw new Error(`${DOG} (the domestic dog) wasn't fetched`);
      const statuses = new Map<string, Claim[]>();
      await byIds([...taxa.keys()], "P141", (v) => `SELECT ?t ?s WHERE { VALUES ?t { ${v} } ?t wdt:P141 ?s . }`, (rows) => {
        for (const r of rows) {
          const t = qid(r.t.value);
          statuses.set(t, [...(statuses.get(t) ?? []), { value: qid(r.s.value) }]);
        }
      });
      const statusItems = valueItems(await labelled(`VALUES ?x { ${IUCN_STATUSES.map((id) => `wd:${id}`).join(" ")} }`));
      if (statusItems.length !== IUCN_STATUSES.length) throw new Error(`${statusItems.length} IUCN statuses labelled, expected ${IUCN_STATUSES.length}`);
      const { items, dropped } = withFact(taxaToItems(taxa, ANIMALIA), "conservation_status", statuses, new Set(IUCN_STATUSES));
      console.log(`wikidata-animals: conservation_status on ${items.filter((i) => i.conservation_status).length} of ${items.length} items${dropped ? `, ${dropped} values outside the 9 dropped` : ""}`);
      return [...statusItems, ...items];
    },
  },
  "wikidata-dog-breeds": {
    source: "wikidata",
    method: "SPARQL: instances of dog breed (P31 Q39367), each under dog breed and under the domestic dog taxon",
    fetch: async () => [await rootItem("Q39367", "dog breed"), ...labelledItems(await labelled("?x wdt:P31 wd:Q39367 ."), () => ["Q39367", DOG])],
  },
  "wikidata-countries": {
    source: "wikidata",
    method: "SPARQL: sovereign states (P31 Q3624078), not dissolved (no P576), with a UN membership (P463 Q1065) that has no end time (P582); each one's continents (P30, best rank, every one listed), which are items of the set, and its population (P1082, the best-rank value with the latest point in time P585)",
    fetch: async () => {
      const where = `?x p:P463 ?st . ?st ps:P463 wd:Q1065 . FILTER NOT EXISTS { ?st pq:P582 ?end }
          ?x wdt:P31 wd:Q3624078 . FILTER NOT EXISTS { ?x wdt:P576 ?dissolved }`;
      const countries = labelledItems(await labelled(where), () => ["Q6256"], ["Q1065"]);
      const continents = await claims(where, "P30");
      const values = [...new Set([...continents.values()].flat().map((c) => c.value))];
      const continentItems = valueItems(await labelled(`VALUES ?x { ${values.map((id) => `wd:${id}`).join(" ")} }`));
      const { items, dropped } = withFact(countries, "continent", continents, new Set(continentItems.map((i) => i.id)));
      console.log(`wikidata-countries: continent on ${items.filter((i) => i.continent).length} of ${items.length} items${dropped ? `, ${dropped} values with no label dropped` : ""}`);
      return [
        await rootItem("Q6256", "country"),
        await rootItem("Q1065", "United Nations"),
        ...continentItems,
        ...(await factsFor("wikidata-countries", items, where, [], true)),
      ];
    },
  },
  "wikidata-elements": {
    source: "wikidata",
    // 118: the known elements, one per atomic number up to 118 (checked 2026-10-24: 118 items, 118 numbers).
    method: "SPARQL: chemical elements (P31 Q11344) with an atomic number (P1086) of at most 118",
    fetch: async () => [
      await rootItem("Q11344", "chemical element"),
      ...labelledItems(await labelled("?x wdt:P31 wd:Q11344 ; wdt:P1086 ?z . FILTER(?z <= 118)"), () => ["Q11344"]),
    ],
  },
  "wikidata-us-states": {
    source: "wikidata",
    method: "SPARQL: instances of U.S. state (P31 Q35657), with each one's population (P1082, the best-rank value with the latest point in time P585)",
    fetch: async () => {
      const where = "?x wdt:P31 wd:Q35657 .";
      return [await rootItem("Q35657", "U.S. state"), ...(await factsFor("wikidata-us-states", labelledItems(await labelled(where), () => ["Q35657"]), where, [], true))];
    },
  },
  "wikidata-fruit": {
    source: "wikidata",
    method: "SPARQL: everything that is an instance or subclass (P31|P279) of a subclass of fruit (P279* Q1364), with its parents in that tree",
    fetch: async () => {
      const found = await labelled("?x wdt:P31|wdt:P279 ?parent . ?parent wdt:P279* wd:Q1364 .");
      return [await rootItem("Q1364", "fruit"), ...labelledItems(found, (id, parents) => [...parents].filter((p) => p === "Q1364" || found.has(p)))];
    },
  },
  // Places, so 13b's facts check knows "Paris" names a city, not an animal: WordNet 2025 holds no place names (13b
  // Evidence). Names only, with no kind_of, so no place joins a category (human, 2026-10-24: "check how much storage
  // it'd take if its not too much then yes import", then "100,000+ people (Recommended)").
  "wikidata-places": {
    source: "wikidata",
    method: `SPARQL: items with a population (P1082) of at least ${BASE_PLACES_MIN_POPULATION} in any statement, and an English label`,
    fetch: async () => labelledItems(await labelled(`?x wdt:P1082 ?population . FILTER(?population >= ${BASE_PLACES_MIN_POPULATION})`), () => []),
  },
  // Places as categories (13e-3; human, 2026-10-25: "One of each (Recommended)"). Each item is put under the set's
  // root, as dog breeds are. Capitals are read from the countries and states already fetched, so the lists agree.
  "wikidata-capitals": {
    source: "wikidata",
    method: "SPARQL: the capital (P36) of each country in the wikidata-countries snapshot, under capital city (Q5119); a country with several capitals keeps them all; each capital's country (P17, best rank, only the snapshot's 193) and population (P1082, the best-rank value with the latest point in time P585)",
    fetch: async () => {
      const countries = countryIds();
      const where = `VALUES ?country { ${[...countries].map((id) => `wd:${id}`).join(" ")} } ?country wdt:P36 ?x .`;
      const capitals = labelledItems(await labelled(where), () => ["Q5119"]);
      return [await rootItem("Q5119", "capital city"), ...(await factsFor("wikidata-capitals", capitals, where, [{ trait: "country", property: "P17", allowed: countries }], true))];
    },
  },
  "wikidata-us-state-capitals": {
    source: "wikidata",
    method: "SPARQL: the capital (P36) of each state in the wikidata-us-states snapshot, under state capital (Q11271835), with each one's population (P1082, the best-rank value with the latest point in time P585)",
    fetch: async () => {
      const states = readSnapshot("wikidata-us-states").items.filter((i) => i.id !== "Q35657").map((i) => `wd:${i.id}`);
      const where = `VALUES ?state { ${states.join(" ")} } ?state wdt:P36 ?x .`;
      const found = await labelled(where);
      if (found.size !== states.length) throw new Error(`${found.size} capitals for ${states.length} states`);
      return [await rootItem("Q11271835", "state capital"), ...(await factsFor("wikidata-us-state-capitals", labelledItems(found, () => ["Q11271835"]), where, [], true))];
    },
  },
  // Big sets keep only items with an English Wikipedia article (human, 2026-10-25: "English Wikipedia article
  // (Recommended)"; SOURCES.md, Wikibase RDF Dump Format, Sitelinks).
  "wikidata-us-cities": {
    source: "wikidata",
    method: "SPARQL: instances of city in the United States or a subclass of it (P31/P279* Q1093829, so charter cities such as Los Angeles count) with an English Wikipedia article (schema:about, schema:isPartOf <https://en.wikipedia.org/>), with each one's population (P1082, the best-rank value with the latest point in time P585)",
    fetch: async () => {
      const where = `?x wdt:P31/wdt:P279* wd:Q1093829 . ?article schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> .`;
      return [await rootItem("Q1093829", "city in the United States"), ...(await factsFor("wikidata-us-cities", labelledItems(await labelled(where), () => ["Q1093829"]), where, [], true))];
    },
  },
  "wikidata-rivers": {
    source: "wikidata",
    method: `SPARQL: instances of river (P31 Q4022) with an English Wikipedia article (schema:about, schema:isPartOf <https://en.wikipedia.org/>); each name "X River" or "River X" also gives "X" as a synonym unless another river gives it too; each river's countries (P17, best rank, only the wikidata-countries snapshot's 193)`,
    fetch: async () => {
      const where = `?x wdt:P31 wd:Q4022 . ?article schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> .`;
      const found = await labelled(where);
      const ids = [...found.keys()];
      const short = riverShortNames(ids.map((id) => [found.get(id)!.label, ...found.get(id)!.alts]));
      const shortOf = new Map(ids.map((id, i) => [id, short[i]]));
      const rivers = labelledItems(found, () => ["Q4022"], [], (id) => shortOf.get(id)!);
      return [await rootItem("Q4022", "river"), ...(await factsFor("wikidata-rivers", rivers, where, [{ trait: "country", property: "P17", allowed: countryIds() }], false))];
    },
  },
  "wikidata-canadian-provinces": {
    source: "wikidata",
    method: "SPARQL: instances of province of Canada (P31 Q11828004) or territory of Canada (P31 Q9357527), not dissolved (no P576), under province or territory of Canada (Q2879), with each one's population (P1082, the best-rank value with the latest point in time P585)",
    fetch: async () => {
      const where = "VALUES ?kind { wd:Q11828004 wd:Q9357527 } ?x wdt:P31 ?kind . FILTER NOT EXISTS { ?x wdt:P576 ?dissolved }";
      const found = await labelled(where);
      if (found.size !== 13) throw new Error(`${found.size} provinces and territories, expected 13`);
      return [await rootItem("Q2879", "province or territory of Canada"), ...(await factsFor("wikidata-canadian-provinces", labelledItems(found, () => ["Q2879"]), where, [], true))];
    },
  },
  // Pop culture (13e-6; human, 2026-10-26 and 2026-10-27, docs/milestones/M13-13e-6-pop-culture.md): each item with an
  // English Wikipedia article ("English Wikipedia article (Recommended)").
  "wikidata-video-games": {
    source: "wikidata",
    method: `SPARQL: instances of video game (P31 Q7889) with an English Wikipedia article and at least ${BASE_VIDEO_GAME_MIN_SITELINKS} sitelinks, under video game; each one's single-medium series (P179 to a P31 Q7058673 video game series, no Q196600 media franchise, one series each, none named like one of its games) under video game with its games under it; title forms; genre (P136, with each genre's broader genres P279+ among those the set uses, racing not under sports) and publisher (P123), whose values are items of the set; a short form two games share goes to the one with more sitelinks`,
    fetch: async () => titleSet("wikidata-video-games", await rootItem("Q7889", "video game"),
      `?x wdt:P31 wd:Q7889 ; wikibase:sitelinks ?links . FILTER(?links >= ${BASE_VIDEO_GAME_MIN_SITELINKS}) ${ENWIKI}`, "Q7058673",
      [{ trait: "genre", property: "P136", broader: true }, { trait: "publisher", property: "P123" }]),
  },
  "wikidata-tabletop-games": {
    source: "wikidata",
    method: `SPARQL: instances of board game (P31/P279* Q131436) or card game (P31/P279* Q142714) with an English Wikipedia article, each under the one it is (or both), both under tabletop game (Q3244175, their parent); title forms; a short form two games share goes to the one with more sitelinks`,
    fetch: async () => {
      const root = await rootItem("Q3244175", "tabletop game");
      const classes = [await rootItem("Q131436", "board game"), await rootItem("Q142714", "card game")].map((c) => ({ ...c, kind_of: [root.id] }));
      // One class a query: both in one VALUES list timed out (2026-10-27).
      const parents = new Map<string, Set<string>>();
      for (const c of ["Q131436", "Q142714"]) {
        for (const [id] of await idsWhere(`?x wdt:P31/wdt:P279* wd:${c} . ${ENWIKI}`)) parents.set(id, new Set([...(parents.get(id) ?? []), c]));
      }
      const found = await labelledIds([...parents.keys()], parents);
      for (const c of classes) found.delete(c.id);
      const items = titledItems(found, await sitelinksOf([...found.keys()]), (_, parents) => [...parents]);
      console.log(`wikidata-tabletop-games: ${items.filter((i) => i.kind_of?.includes("Q131436")).length} board games, ${items.filter((i) => i.kind_of?.includes("Q142714")).length} card games`);
      return [root, ...classes, ...items];
    },
  },
  "wikidata-animated-films": {
    source: "wikidata",
    method: "SPARQL: instances of animated film (P31 Q202866) or anime film (P31 Q20650540), or films (P31 Q11424) whose genre (P136) is animated film, with an English Wikipedia article, under animated film; each one's single-medium series (P179 to a P31 Q24856 film series, no Q196600 media franchise, one series each, none named like one of its films) under animated film with its films under it; title forms; a short form two films share goes to the one with more sitelinks",
    fetch: async () => titleSet("wikidata-animated-films", await rootItem("Q202866", "animated film"),
      `{ ?x wdt:P31 wd:Q202866 } UNION { ?x wdt:P31 wd:Q20650540 } UNION { ?x wdt:P31 wd:Q11424 ; wdt:P136 wd:Q202866 } ${ENWIKI}`, "Q24856", []),
  },
  "wikidata-anime": {
    source: "wikidata",
    method: "SPARQL: instances of anime television series (P31 Q63952888) or anime film (P31 Q20650540) with an English Wikipedia article, under anime (Q1107); title forms; a short form two share goes to the one with more sitelinks",
    fetch: async () => titleSet("wikidata-anime", await rootItem("Q1107", "anime"),
      `{ ?x wdt:P31 wd:Q63952888 } UNION { ?x wdt:P31 wd:Q20650540 } ${ENWIKI}`, null, []),
  },
  "wikidata-pop-groups": {
    source: "wikidata",
    method: "SPARQL: musical groups (P31/P279* Q215380) whose genre (P136) is pop music (Q37073) or K-pop (Q213665) or a sub-genre of either (P279*), with an English Wikipedia article, under musical group; genre (pop music and K-pop, a sub-genre counting for its broader one), which are items of the set",
    fetch: async () => titleSet("wikidata-pop-groups", await rootItem("Q215380", "musical group"),
      `{ ?x wdt:P31/wdt:P279* wd:Q215380 ; wdt:P136/wdt:P279* wd:Q37073 . } UNION { ?x wdt:P31/wdt:P279* wd:Q215380 ; wdt:P136/wdt:P279* wd:Q213665 . } ${ENWIKI}`, null,
      [{ trait: "genre", property: "P136", only: ["Q37073", "Q213665"], broader: true }]),
  },
  "wikidata-superheroes": {
    source: "wikidata",
    method: "SPARQL: characters whose occupation (P106) is superhero (Q188784), with an English Wikipedia article, under superhero",
    fetch: async () => {
      const root = await rootItem("Q188784", "superhero");
      return [root, ...labelledItems(await labelledIds([...(await idsWhere(`?x wdt:P106 wd:Q188784 . ${ENWIKI}`)).keys()]), () => [root.id])];
    },
  },
  "oewn-animals": {
    source: "oewn",
    method: `${OEWN_ZIP}: every noun.*.json, synset ${OEWN_ANIMAL} and its hyponyms, each linked to the wikidata-animals or wikidata-dog-breeds thing its Wikidata ID names; ${OEWN_ANIMAL} itself to ${ANIMALIA}, as it carries no Wikidata ID (Claude, 2026-10-24); a Wikidata ID that isn't loaded linked instead to the one loaded taxon its P13176 (truthy) names, and left unjoined, its loaded taxa listed, when it names several; the human's hand decisions in data/sameness.json (wordnet_split, wordnet_pick, wordnet_join) applied`,
    fetch: async () => {
      const files = unzip(OEWN_ZIP, await download(OEWN_ZIP), (listed) => listed.filter((n) => /^noun\.[^/]+\.json$/.test(n)));
      const synsets: Record<string, Synset> = Object.assign({}, ...Object.values(files).map((t) => JSON.parse(t) as Record<string, Synset>));
      const known = new Set([...readSnapshot("wikidata-animals").items, ...readSnapshot("wikidata-dog-breeds").items].map((i) => i.id));
      const tree = oewnSubtree(synsets, OEWN_ANIMAL);
      const unloaded = [...new Set(tree.flatMap((i) => wikidataIds(synsets[i.id])).filter((w) => !known.has(w)))];
      const taxaOf = new Map<string, string[]>();
      await byIds(unloaded, "P13176", (v) => `SELECT ?c ?t WHERE { VALUES ?c { ${v} } ?c wdt:P13176 ?t . }`, (rows) => {
        for (const r of rows) taxaOf.set(qid(r.c.value), [...(taxaOf.get(qid(r.c.value)) ?? []), qid(r.t.value)]);
      });
      const items = linkToWikidata(tree, synsets, known, OEWN_ANIMAL, ANIMALIA, taxaOf, handJoins(readSameness()));
      const byP13176 = items.filter((i) => i.id !== OEWN_ANIMAL && i.same_as && !wikidataIds(synsets[i.id]).includes(i.same_as.slice("wikidata:".length))).length;
      console.log(`oewn-animals: ${unloaded.length} Wikidata IDs not loaded, ${taxaOf.size} of them with P13176; ${byP13176} joined by it, ${items.filter((i) => i.unjoined).length} unjoined`);
      return items;
    },
  },
  // Every noun, so 13b's facts check knows "Paris" names a city, not an animal (human, 2026-10-24: "Import all of
  // WordNet (Recommended)"). Merged by WordNet's own IDs only: linking more of WordNet to Wikidata would put WordNet's
  // trees under Wikidata's category roots (all of WordNet's "country" under the 193 countries).
  "oewn-nouns": {
    source: "oewn",
    method: `${OEWN_ZIP}: every noun.*.json, synset ${OEWN_ENTITY} ("entity") and everything under it, merged with oewn-animals and oewn-cheese by synset ID, for 13b's facts check`,
    fetch: async () => {
      const files = unzip(OEWN_ZIP, await download(OEWN_ZIP), (listed) => listed.filter((n) => /^noun.[^/]+.json$/.test(n)));
      const synsets: Record<string, Synset> = Object.assign({}, ...Object.values(files).map((t) => JSON.parse(t) as Record<string, Synset>));
      if (synsets[OEWN_ENTITY]?.members[0] !== "entity") throw new Error(`${OEWN_ENTITY} isn't "entity" in this edition`);
      const items = oewnSubtree(synsets, OEWN_ENTITY);
      console.log(`${Object.keys(synsets).length} noun synsets, ${items.length} under ${OEWN_ENTITY}`);
      return items;
    },
  },
  "oewn-cheese": {
    source: "oewn",
    method: `${OEWN_ZIP}: noun.food.json, synset ${OEWN_CHEESE} and its hyponyms`,
    fetch: async () => {
      const files = unzip(OEWN_ZIP, await download(OEWN_ZIP), () => ["noun.food.json"]);
      return oewnSubtree(JSON.parse(files["noun.food.json"]) as Record<string, Synset>, OEWN_CHEESE);
    },
  },
  "usda-cheese": {
    source: "usda",
    method: `${USDA_ZIP}: food.csv and food_category.csv, "Cheese, <kind>" in Dairy and Egg Products, matched to oewn-cheese`,
    fetch: async () => {
      const dir = "FoodData_Central_sr_legacy_food_csv_2018-04";
      const files = unzip(USDA_ZIP, await download(USDA_ZIP), () => [`${dir}/food.csv`, `${dir}/food_category.csv`]);
      return usdaCheeses(files[`${dir}/food.csv`], files[`${dir}/food_category.csv`], readSnapshot("oewn-cheese").items);
    },
  },
};

// --- snapshots, manifests, loading and review ---

type Manifest = { set: string; source: Source; snapshot: string; retrieved_at: string; method: string; items: number; sha256: string };
const manifestPath = (set: string) => join("data", "manifests", `${set}.json`);
const snapshotPath = (set: string, snapshot: string) => join("data", "snapshots", set, `${snapshot}.json`);

function readSnapshot<T = Item>(set: string): { manifest: Manifest; items: T[] } {
  const manifest = JSON.parse(readFileSync(manifestPath(set), "utf8")) as Manifest;
  const text = readFileSync(snapshotPath(set, manifest.snapshot), "utf8");
  const sha256 = createHash("sha256").update(text).digest("hex");
  if (sha256 !== manifest.sha256) throw new Error(`${set}: snapshot ${manifest.snapshot} doesn't match its manifest's checksum`);
  return { manifest, items: JSON.parse(text) as T[] };
}

async function fetchSet<T>(set: string, def: SetDef<T>): Promise<void> {
  const items = await def.fetch();
  const snapshot = new Date().toISOString().slice(0, 10);
  const text = JSON.stringify(items);
  mkdirSync(join("data", "snapshots", set), { recursive: true });
  mkdirSync(join("data", "manifests"), { recursive: true });
  writeFileSync(snapshotPath(set, snapshot), text);
  const manifest: Manifest = {
    set,
    source: def.source,
    snapshot,
    retrieved_at: new Date().toISOString(),
    method: def.method,
    items: items.length,
    sha256: createHash("sha256").update(text).digest("hex"),
  };
  writeFileSync(manifestPath(set), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`FETCHED ${set}: ${items.length} items, snapshot ${snapshot}${retries ? `, ${retries} SPARQL retries after 429` : ""}`);
}

// The local stack only: DATABASE_URL must point at this machine (13a, "Local only"). It's parsed as the app parses it
// and pg gets its fields, never the URL, so a query parameter can't send pg to another host (DECISIONS.md, Database
// access from route handlers; M13 13e-5 item 7).
export async function localClient(): Promise<pg.Client> {
  const database = readDatabaseUrl();
  if (!isLocalHost(database.host)) throw new Error(`refusing ${database.host}: 13a loads the local stack only`);
  const client = new pg.Client(database);
  await client.connect();
  return client;
}

async function loadSet(client: pg.Client, set: string, def: SetDef): Promise<void> {
  const { manifest, items: read } = readSnapshot(set);
  const name = (id: string) => loadedWikidata().names.get(mergePlan().into.get(id) ?? id);
  const named = def.source === "wikidata" ? withMerges(read, mergePlan().into) : def.source === "oewn" ? shownNames(read, name) : read;
  const { listed, names } = readHandFiles();
  // Countries load from the places set too, with the same codes, so the codes go wherever a country loads.
  const { items: handled, used } = withHandNames(def.source, withValueNamesOnly(withoutCountryCodes(withNormalizedAliases(named), countryIds()), continentIds()), names);
  for (const k of used) handNamesUsed.add(k);
  const { items, aliases, dropped } = withoutListed(def.source, set, handled, listed, names.rename);
  try {
    await client.query("begin");
    const withIds = items.map((item) => ({ ...item, thing_id: thingId(def.source, item.id) }));
    const { rows } = await client.query("select private.import_source($1, $2, $3::jsonb) as counts", [def.source, manifest.snapshot, JSON.stringify(withIds)]);
    await client.query("commit");
    console.log(`LOADED ${set} (${manifest.snapshot}): ${JSON.stringify(rows[0].counts)}${aliases || dropped ? `, listed words: ${aliases} names and ${dropped} items dropped` : ""}`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

// --- hand decisions on names: listed words dropped (data/listed.json, 13e-9b), names added and renamed
// (data/names.json, 13f-1) ---

const SOURCE_REF = /^(wikidata|oewn|usda):./;
function checkRefs(file: string, refs: string[]): void {
  const bad = refs.filter((ref) => !SOURCE_REF.test(ref));
  if (bad.length) throw new Error(`${file}: ${bad.join(", ")} must be refs as "source:id"`);
}
// The rows of one source, keyed by the item's ID within it.
const bySource = <R extends { ref: string }>(source: Source, rows: R[]) =>
  rows.filter((r) => r.ref.startsWith(`${source}:`)).map((r) => ({ ...r, id: r.ref.slice(source.length + 1) }));

// Every hand decision about listed words (docs/milestones/M13-13e-9b-the-word-list.md), and about insults found when
// a category's members are read (13e-10: "quack" for a doctor), each item named as "source:id": items dropped whole,
// and items whose LDNOOBW-listed names go while their real names stay (LDNOOBW's words are in real titles and band
// names, so they're dropped only where a person named the item). A listed shown name's new name is in names.json.
export const LISTED_FILE = "data/listed.json";
export type Listed = {
  drop: { ref: string; why: string }[];
  // An item dropped from one set only, kept in the others: a borough the US cities set counts as a city, still a place
  // in wikidata-places, so the facts check keeps refusing it as a city (13f-2; human, 2026-10-27: "Boroughs as cities").
  drop_from_set: { ref: string; set: string; why: string }[];
  drop_listed_names: { ref: string; why: string }[];
};

export function parseListed(text: string): Listed {
  const listed = parseLists<Listed>(
    LISTED_FILE,
    { drop: ["ref", "why"], drop_from_set: ["ref", "set", "why"], drop_listed_names: ["ref", "why"] },
    { drop: ["ref"], drop_from_set: ["ref", "set"], drop_listed_names: ["ref"] },
    text,
  );
  checkRefs(LISTED_FILE, [...listed.drop, ...listed.drop_from_set, ...listed.drop_listed_names].map((r) => r.ref));
  const dropped = new Set(listed.drop.map((r) => r.ref));
  const both = listed.drop_listed_names.filter((r) => dropped.has(r.ref)).map((r) => r.ref);
  if (both.length) throw new Error(`${LISTED_FILE}: ${both.join(", ")} both dropped and kept`);
  // A set's name with a typo drops nothing, and a ref dropped everywhere needs no set's drop (13f-2 review; 13f-3b-2).
  const unknownSets = listed.drop_from_set.filter((r) => !(r.set in SETS)).map((r) => `${r.ref} (${r.set})`);
  if (unknownSets.length) throw new Error(`${LISTED_FILE}: drop_from_set names no set: ${unknownSets.join(", ")}`);
  const twice = listed.drop_from_set.filter((r) => dropped.has(r.ref)).map((r) => r.ref);
  if (twice.length) throw new Error(`${LISTED_FILE}: ${twice.join(", ")} both in drop and in drop_from_set`);
  return listed;
}

// Every hand decision on an item's names (docs/milestones/M13-13f-1-player-scoring.md; human, 2026-10-27: "A hand file
// of names (Recommended)", "One names file (Recommended)"): a name the sources lack, added to the item its prompt means
// ("china" for the People's Republic, which the facts check would never let players' misses add, as "china" names
// porcelain); and the shown name an item takes instead of its source's, one of its names: for a listed shown name
// (13e-9b: "Rename it (Recommended)") or WordNet's first word ("cornet" for the trumpet: "Rename by hand (Recommended)").
export const NAMES_FILE = "data/names.json";
export type Names = {
  add: { ref: string; name: string; why: string }[];
  // A name taken off one item, for a word other things rightly bear, which Plor's list would strip from all of them
  // (13f-2: schoolmarm's "mistress"; "ununnilium" on the element it doesn't name).
  remove: { ref: string; name: string; why: string }[];
  rename: { ref: string; name: string; why: string }[];
};

export function parseNames(text: string): Names {
  const names = parseLists<Names>(
    NAMES_FILE,
    { add: ["ref", "name", "why"], remove: ["ref", "name", "why"], rename: ["ref", "name", "why"] },
    { add: ["ref", "name"], remove: ["ref", "name"], rename: ["ref"] },
    text,
  );
  checkRefs(NAMES_FILE, [...names.add, ...names.remove, ...names.rename].map((r) => r.ref));
  return names;
}

// The two hand files together (13f-1 review): no line may decide nothing. A name added or renamed on an item
// listed.json drops; an added name on LDNOOBW's or Plor's list, which the load would drop again; and two added names
// that normalize alike ("China" and "china") are each refused.
export function checkHandFiles(listed: Listed, names: Names): void {
  const dropped = new Set(listed.drop.map((r) => r.ref));
  const onDropped = [...names.add, ...names.remove, ...names.rename].filter((r) => dropped.has(r.ref)).map((r) => r.ref);
  if (onDropped.length) throw new Error(`${NAMES_FILE}: ${[...new Set(onDropped)].join(", ")} dropped by ${LISTED_FILE}`);
  const listedAdds = names.add.filter((r) => isListed(normalize(r.name))).map((r) => r.ref);
  if (listedAdds.length) throw new Error(`${NAMES_FILE} add ${listedAdds.join(", ")}: the name is listed`);
  const keys = names.add.map((r) => `${r.ref} ${normalize(r.name)}`);
  const twice = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (twice.length) throw new Error(`${NAMES_FILE} add: ${[...new Set(twice)].join(", ")} added twice`);
}

// One set's items with every name normalized as today's normalize writes it: snapshots hold the names normalized when
// they were fetched, so a change to normalize (13f-1 folds ł, ß, ø and the like) reaches them only here. Two names that
// now normalize alike become one, a name over a synonym or plural, as a category's members need a name.
export function withNormalizedAliases(items: Item[]): Item[] {
  const rank: Record<Alias["kind"], number> = { name: 0, synonym: 1, scientific: 2, plural: 3 };
  return items.map((item) => {
    const by = new Map<string, Alias>();
    for (const a of item.aliases) {
      const alias = normalize(a.alias);
      const had = by.get(alias);
      if (alias && (!had || rank[a.kind] < rank[had.kind])) by.set(alias, { alias, kind: a.kind });
    }
    const aliases = [...by.values()];
    return aliases.length === item.aliases.length && aliases.every((a, i) => a.alias === item.aliases[i].alias && a.kind === item.aliases[i].kind) ? item : { ...item, aliases };
  });
}

// A hand name row's key, for counting the rows a load used.
export const handNameKey = (list: "add" | "remove", ref: string, name: string) => `${list} ${ref} "${normalize(name)}"`;

// One set's items with the names added and removed for them, and the rows that did something here: an add where the
// item lacked the name, a remove where it bore it. An item can load from several sets with different names (Insular
// Oceania's "oceania" is in the places set only), so a row is checked across the whole load: one that does nothing in
// every set stops `load all` (unusedHandNames), and the file never carries a line that does nothing.
export function withHandNames(source: Source, items: Item[], names: Pick<Names, "add" | "remove">): { items: Item[]; used: string[] } {
  const rows = (list: Names["add"]) => {
    const by = new Map<string, string[]>();
    for (const r of bySource(source, list)) by.set(r.id, [...(by.get(r.id) ?? []), normalize(r.name)]);
    return by;
  };
  const adds = rows(names.add);
  const removes = rows(names.remove);
  const used: string[] = [];
  const out = items.map((item) => {
    const ref = `${source}:${item.id}`;
    const has = (n: string) => item.aliases.some((a) => a.alias === n);
    const added = (adds.get(item.id) ?? []).filter((n) => !has(n));
    const removed = (removes.get(item.id) ?? []).filter(has);
    if (!added.length && !removed.length) return item;
    used.push(...added.map((n) => handNameKey("add", ref, n)), ...removed.map((n) => handNameKey("remove", ref, n)));
    const kept = item.aliases.filter((a) => !removed.includes(a.alias));
    return { ...item, aliases: [...kept, ...added.map((alias) => ({ alias, kind: "synonym" as const }))] };
  });
  return { items: out, used };
}

// The add and remove rows no set used, after `load all`.
// The add and remove rows only one set can apply: their item is in it and in no other set, so a single `load <set>`
// judges them as `load all` judges every row (13f-2 review; 13f-3b-2).
export function handNamesOnlyIn(names: Pick<Names, "add" | "remove">, mine: ReadonlySet<string>, elsewhere: ReadonlySet<string>): Pick<Names, "add" | "remove"> {
  const only = (r: { ref: string }) => mine.has(r.ref) && !elsewhere.has(r.ref);
  return { add: names.add.filter(only), remove: names.remove.filter(only) };
}

export function unusedHandNames(names: Pick<Names, "add" | "remove">, used: ReadonlySet<string>): string[] {
  return [
    ...names.add.map((r) => handNameKey("add", r.ref, r.name)),
    ...names.remove.map((r) => handNameKey("remove", r.ref, r.name)),
  ].filter((k) => !used.has(k));
}

// The country codes Wikidata gives as alternative labels ("bh", "can", "car"), which answer as countries though no
// country is named by them, except the abbreviations players type as names (human, 2026-10-27: "Remove the codes
// (Recommended)", then "Keep the common ones (Recommended)"). No country's name is three letters or fewer.
const KEPT_COUNTRY_ABBREVIATIONS = new Set(["us", "uk", "usa", "uae", "prc", "drc"]);

// A thing a fact names, wherever it loads, answers to its label alone: the places set gives North America "na", "noam"
// and "003 un m49 code", which would answer as a continent in every continent question (13e-4b design 4 and review;
// the human, 2026-10-28: "Fix the three, close the last (Recommended)"). A hand name (data/names.json) comes after.
export function withValueNamesOnly(items: Item[], values: ReadonlySet<string>): Item[] {
  return items.map((item) => (values.has(item.id) ? { ...item, aliases: [{ alias: normalize(item.name), kind: "name" as const }] } : item));
}
export function withoutCountryCodes(items: Item[], countries: ReadonlySet<string>): Item[] {
  return items.map((item) => {
    if (!countries.has(item.id)) return item;
    const aliases = item.aliases.filter((a) => !/^[a-z]{2,3}$/.test(a.alias) || KEPT_COUNTRY_ABBREVIATIONS.has(a.alias));
    return aliases.length === item.aliases.length ? item : { ...item, aliases };
  });
}

// One set's items without the listed words, then renamed: every alias holding a word on Plor's list goes, from every
// item; the drop_listed_names items also lose their LDNOOBW-listed names; drop items go, and so does an item left with
// no names. A rename makes one of the item's names left its shown name; an item whose shown name went needs one, or a
// drop, or the load stops, naming its ID and the names left, never the word.
export function withoutListed(source: Source, set: string, items: Item[], listed: Listed, renames: Names["rename"]): { items: Item[]; aliases: number; dropped: number } {
  const drop = new Set([...bySource(source, listed.drop), ...bySource(source, listed.drop_from_set).filter((r) => r.set === set)].map((r) => r.id));
  const names = new Set(bySource(source, listed.drop_listed_names).map((r) => r.id));
  const rename = new Map(bySource(source, renames).map((r) => [r.id, r.name]));
  const kept: Item[] = [];
  let aliases = 0;
  for (const item of items) {
    if (drop.has(item.id)) continue;
    const gone = (text: string) => isPlorListed(normalize(text)) || (names.has(item.id) && isListed(normalize(text)));
    const left = item.aliases.filter((a) => !gone(a.alias));
    aliases += item.aliases.length - left.length;
    // Gone when the list took every name; an ancestor taxon kept for the tree has none to begin with and stays.
    if (!left.length && item.aliases.length) continue;
    const to = rename.get(item.id);
    const ref = `${source}:${item.id}`;
    if (to === undefined) {
      if (gone(item.name)) throw new Error(`${ref}: its shown name is listed; ${NAMES_FILE} needs a rename or ${LISTED_FILE} a drop (names left: ${left.map((a) => a.alias).join(", ")})`);
      kept.push(left.length === item.aliases.length ? item : { ...item, aliases: left });
      continue;
    }
    if (to === item.name) throw new Error(`${NAMES_FILE} rename ${ref}: it already shows "${to}"`);
    if (!left.some((a) => a.alias === normalize(to))) throw new Error(`${NAMES_FILE} rename ${ref}: "${to}" isn't one of its names left`);
    // The new shown name becomes a name, not a synonym: a category's members need one (private.category_members).
    kept.push({ ...item, name: to, aliases: left.map((a) => (a.alias === normalize(to) ? { ...a, kind: "name" } : a)) });
  }
  // A dropped item can't be another's parent: its facts would name a thing never loaded.
  const keptIds = new Set(kept.map((i) => i.id));
  const goneIds = new Set(items.map((i) => i.id).filter((id) => !keptIds.has(id)));
  for (const item of kept) {
    const parent = [...(item.kind_of ?? []), ...(item.member_of ?? [])].find((p) => goneIds.has(p));
    if (parent) throw new Error(`${source}:${item.id} is under ${source}:${parent}, which the listed words drop`);
  }
  return { items: kept, aliases, dropped: items.length - kept.length };
}

// The hand name rows the sets loaded so far used (withHandNames), checked after `load all`.
const handNamesUsed = new Set<string>();

// The refs every loaded set holds, read once for the hand files' checks.
let loadedRefsOnce: Set<string> | undefined;
const loadedRefs = () =>
  (loadedRefsOnce ??= new Set(Object.entries(SETS).flatMap(([set, def]) => readSnapshot(set).items.map((i) => `${def.source}:${i.id}`))));

// The hand files, read and checked once: a drop_listed_names, add or rename row must name a loaded item, or it decides
// nothing; a drop may name one today's snapshots don't hold (an item dropped at fetch before 13e-9b), printed (human,
// 2026-10-27: "Strict, except drops (Recommended)").
let handFiles: { listed: Listed; names: Names } | undefined;
function readHandFiles(): { listed: Listed; names: Names } {
  if (handFiles) return handFiles;
  const listed = parseListed(readFileSync(LISTED_FILE, "utf8"));
  const names = parseNames(readFileSync(NAMES_FILE, "utf8"));
  checkHandFiles(listed, names);
  for (const [file, rows] of [[LISTED_FILE, [...listed.drop_listed_names, ...listed.drop_from_set]], [NAMES_FILE, [...names.add, ...names.remove, ...names.rename]]] as const) {
    const missing = rows.map((r) => r.ref).filter((ref) => !loadedRefs().has(ref));
    if (missing.length) throw new Error(`${file}: ${missing.join(", ")} isn't in any loaded set`);
  }
  const absent = listed.drop.map((r) => r.ref).filter((ref) => !loadedRefs().has(ref));
  if (absent.length) console.log(`${LISTED_FILE}: ${absent.length} drop not in today's snapshots: ${absent.join(", ")}`);
  handFiles = { listed, names };
  return handFiles;
}

// --- sameness: Wikidata's own doubles and the human's decisions (13e-5b) ---

// Every hand decision on what is one thing (docs/milestones/M13-13e-5b-wikidata-doubles.md): merges of two Wikidata
// items, pairs kept apart, bank answers whose name was reviewed and fits different things (so the review doesn't ask
// again), and WordNet's splits and picks (13e-5). Disk input, checked here.
export const SAMENESS_FILE = "data/sameness.json";
export type Sameness = {
  merge: { old: string; kept: string; why: string }[];
  apart: { a: string; b: string; why: string }[];
  reviewed: { category: string; name: string; why: string }[];
  wordnet_split: { synset: string; from: string; why: string }[];
  wordnet_pick: { synset: string; taxon: string; why: string }[];
  wordnet_join: { synset: string; taxon: string; why: string }[];
};
const SAMENESS_FIELDS: Record<keyof Sameness, string[]> = {
  merge: ["old", "kept", "why"],
  apart: ["a", "b", "why"],
  reviewed: ["category", "name", "why"],
  wordnet_split: ["synset", "from", "why"],
  wordnet_pick: ["synset", "taxon", "why"],
  wordnet_join: ["synset", "taxon", "why"],
};

const SAMENESS_KEYS: Record<keyof Sameness, string[]> = {
  merge: ["old"], apart: ["a", "b"], reviewed: ["category", "name"], wordnet_split: ["synset"], wordnet_pick: ["synset"], wordnet_join: ["synset"],
};

// A hand file of named lists of rows, every field text (disk input, checked here): exactly the lists named, each row
// exactly its list's fields, and what each row decides (its key fields) at most once in its list.
function parseLists<T>(file: string, fieldsOf: Record<string, string[]>, keysOf: Record<string, string[]>, text: string): T {
  const data: unknown = JSON.parse(text);
  const lists = Object.keys(fieldsOf);
  if (typeof data !== "object" || data === null || Array.isArray(data) || Object.keys(data).sort().join() !== [...lists].sort().join()) {
    throw new Error(`${file}: must hold exactly ${lists.join(", ")}`);
  }
  for (const list of lists) {
    const rows = (data as Record<string, unknown>)[list];
    if (!Array.isArray(rows)) throw new Error(`${file}: ${list} must be a list`);
    const fields = fieldsOf[list];
    rows.forEach((row, i) => {
      const ok = typeof row === "object" && row !== null && !Array.isArray(row) && Object.keys(row).length === fields.length
        && fields.every((f) => typeof (row as Record<string, unknown>)[f] === "string" && ((row as Record<string, string>)[f]).trim() !== "");
      if (!ok) throw new Error(`${file} ${list} ${i + 1}: must hold exactly ${fields.join(", ")}, each as text`);
    });
    const keys = rows.map((row) => keysOf[list].map((f) => (row as Record<string, string>)[f]).join(" "));
    const twice = keys.filter((v, i) => keys.indexOf(v) !== i);
    if (twice.length) throw new Error(`${file} ${list}: ${[...new Set(twice)].join(", ")} listed twice`);
  }
  return data as T;
}

// What each row decides, once: an old item merges once, a pair is apart once, a category's name is reviewed once, a
// synset is split, picked or joined once, across the three lists too: linkToWikidata reads a split first, so a pick
// or join beside it would be ignored without a word (13e-5 second review; 13f-3b-2).
export function parseSameness(text: string): Sameness {
  const s = parseLists<Sameness>(SAMENESS_FILE, SAMENESS_FIELDS, SAMENESS_KEYS, text);
  const synsets = [...s.wordnet_split, ...s.wordnet_pick, ...s.wordnet_join].map((r) => r.synset);
  const twice = [...new Set(synsets.filter((v, i) => synsets.indexOf(v) !== i))];
  if (twice.length) throw new Error(`${SAMENESS_FILE}: ${twice.join(", ")} decided in more than one of wordnet_split, wordnet_pick and wordnet_join`);
  return s;
}

const readSameness = () => parseSameness(readFileSync(SAMENESS_FILE, "utf8"));

export function handJoins(s: Sameness): HandJoins {
  return {
    split: new Map(s.wordnet_split.map((r) => [r.synset, r.from])), pick: new Map(s.wordnet_pick.map((r) => [r.synset, r.taxon])),
    join: new Map(s.wordnet_join.map((r) => [r.synset, r.taxon])),
  };
}

// What Wikidata marks about a loaded item, among loaded items: the preferred names it's a taxon synonym of (P12763, and
// P1420 read from the other side), its permanent duplicates (P2959), the items said to be the same (P460, for the
// review only) and its sitelink count (SOURCES.md, Wikidata sameness marks).
export type Mark = { id: string; synonym_of: string[]; duplicates: string[]; said_same: string[]; sitelinks: number };

// Which item each merged one folds into. Taxon synonyms point old to kept; chains fold to their end. Where no side is
// named (a P2959 pair, or two items each marked the other's synonym) the one with more sitelinks keeps its ID, and a
// tie is a fork. A fork (an item pointing at two kept items) doesn't merge and goes to the review; so does a longer
// circle. The human's merges add pairs and must agree with Wikidata's marks; their apart pairs never merge. A merge
// across two sets stops (none on 2026-10-27; build for today). Every decision must still fit the loaded items.
export type MergePlan = { into: Map<string, string>; forks: string[][]; saidSame: string[][] };
export function planMerges(marks: Mark[], setOf: Map<string, string>, s: Sameness): MergePlan {
  const links = new Map(marks.map((m) => [m.id, m.sitelinks]));
  const byId = new Map(marks.map((m) => [m.id, m]));
  const apart = new Set(s.apart.flatMap((r) => [`${r.a} ${r.b}`, `${r.b} ${r.a}`]));
  const edges = new Map<string, Set<string>>();
  const forks: string[][] = [];
  const add = (from: string, to: string) => {
    if (from === to || apart.has(`${from} ${to}`)) return;
    edges.set(from, new Set([...(edges.get(from) ?? []), to]));
  };
  const undirected = (a: string, b: string) => {
    const [la, lb] = [links.get(a) ?? 0, links.get(b) ?? 0];
    if (la === lb) forks.push([a, b].sort());
    else if (la > lb) add(b, a);
    else add(a, b);
  };
  for (const m of marks) for (const t of m.synonym_of) {
    if (byId.get(t)?.synonym_of.includes(m.id)) {
      if (m.id < t) undirected(m.id, t);
    } else add(m.id, t);
  }
  for (const m of marks) for (const d of m.duplicates) if (m.id < d) undirected(m.id, d);
  for (const r of s.merge) {
    for (const id of [r.old, r.kept]) if (!setOf.has(id)) throw new Error(`${SAMENESS_FILE} merge ${r.old} → ${r.kept}: ${id} isn't loaded`);
    if (apart.has(`${r.old} ${r.kept}`)) throw new Error(`${SAMENESS_FILE}: ${r.old} and ${r.kept} are both merged and apart`);
    if (edges.get(r.kept)?.has(r.old)) throw new Error(`${SAMENESS_FILE} merge ${r.old} → ${r.kept}: Wikidata keeps ${r.old} instead`);
    add(r.old, r.kept);
  }
  for (const r of s.apart) for (const id of [r.a, r.b]) if (!setOf.has(id)) throw new Error(`${SAMENESS_FILE} apart ${r.a} / ${r.b}: ${id} isn't loaded`);
  const origins = new Set([...edges].filter(([, to]) => to.size > 1).map(([from]) => from));
  for (const from of origins) forks.push([from, ...[...edges.get(from)!].sort()]);
  const into = new Map<string, string>();
  const circled = new Set<string>();
  for (const from of edges.keys()) {
    if (origins.has(from) || circled.has(from)) continue;
    const path = [from];
    let circle = false;
    while (edges.get(path[path.length - 1])?.size === 1) {
      const next = [...edges.get(path[path.length - 1])!][0];
      if (path.includes(next)) {
        circle = true;
        break;
      }
      path.push(next);
    }
    if (circle) {
      for (const id of path) circled.add(id);
      forks.push(path);
      continue;
    }
    const kept = path[path.length - 1];
    if (setOf.get(from) !== setOf.get(kept)) throw new Error(`a merge across two sets: ${from} (${setOf.get(from)}) into ${kept} (${setOf.get(kept)})`);
    into.set(from, kept);
  }
  // Every decision must hold in the plan, or the load stops naming it: a person's merge folds its old item (into its
  // kept one, or past it along a chain), and no apart pair ends as one thing, even through a chain.
  const end = (id: string) => into.get(id) ?? id;
  for (const r of s.merge) {
    if (end(r.old) !== end(r.kept)) throw new Error(`${SAMENESS_FILE} merge ${r.old} → ${r.kept} no longer holds: Wikidata's marks now make it a fork or a circle`);
  }
  for (const r of s.apart) if (end(r.a) === end(r.b)) throw new Error(`${SAMENESS_FILE} apart ${r.a} / ${r.b}: Wikidata's marks now merge them into ${end(r.a)}`);
  const saidSame = marks.flatMap((m) => m.said_same.filter((t) => m.id < t).map((t) => [m.id, t]));
  return { into, forks, saidSame };
}

// A merged item keeps its ID, name and names; its facts go, as the kept item's win (human, 2026-10-27: "Kept item's
// facts win (Recommended)").
export function withMerges(items: Item[], into: Map<string, string>): Item[] {
  return items.map((item) => {
    const kept = into.get(item.id);
    return kept ? { id: item.id, name: item.name, aliases: item.aliases, merged_into: `wikidata:${kept}` } : item;
  });
}

const MARKS_SET = "wikidata-sameness";
const wikidataSets = () => Object.entries(SETS).filter(([, d]) => d.source === "wikidata").map(([set]) => set);

// Each loaded Wikidata item's set and name, read once, and whether that name is its scientific name.
type Named = { name: string; scientific: boolean };
let loaded: { setOf: Map<string, string>; names: Map<string, Named> } | undefined;
function loadedWikidata(): { setOf: Map<string, string>; names: Map<string, Named> } {
  if (!loaded) {
    loaded = { setOf: new Map(), names: new Map() };
    for (const set of wikidataSets()) for (const item of readSnapshot(set).items) {
      if (loaded.setOf.has(item.id)) continue;
      loaded.setOf.set(item.id, set);
      loaded.names.set(item.id, { name: item.name, scientific: item.aliases.some((a) => a.kind === "scientific" && a.alias === normalize(item.name)) });
    }
  }
  return loaded;
}

// The shown name of a thing WordNet joins (13e-5b; human, 2026-10-27: "Wikidata's common name (Recommended)", after
// WordNet's first word renamed the fruit fly "drosophila"): Wikidata's name, in WordNet's spelling when the two differ
// only in capitals or marks ("Dog" → "dog"), and WordNet's word when Wikidata's is a scientific name ("Ursus
// maritimus" → "polar bear"). import_source gives a joined WordNet item's name to the thing.
export function shownNames(items: Item[], wikidataName: (id: string) => Named | undefined): Item[] {
  return items.map((item) => {
    const target = item.same_as?.startsWith("wikidata:") ? wikidataName(item.same_as.slice("wikidata:".length)) : undefined;
    if (!target || target.scientific || normalize(target.name) === normalize(item.name)) return item;
    return { ...item, name: target.name };
  });
}

let plan: MergePlan | undefined;
function mergePlan(): MergePlan {
  plan ??= planMerges(readSnapshot<Mark>(MARKS_SET).items, loadedWikidata().setOf, readSameness());
  return plan;
}

const MARKS: SetDef<Mark> = {
  source: "wikidata",
  method: `SPARQL by key, ${BASE_BATCH_IDS} IDs a query, over every item of the Wikidata snapshots: P12763 taxon synonym of, P1420 taxon synonym (read from the other side), P2959 permanent duplicated item and P460 said to be the same as (truthy) between two loaded items, and each marked item's sitelink count`,
  fetch: async () => {
    const { setOf } = loadedWikidata();
    const marks = new Map<string, Mark>();
    const mark = (id: string) => {
      if (!marks.has(id)) marks.set(id, { id, synonym_of: [], duplicates: [], said_same: [], sitelinks: 0 });
      return marks.get(id)!;
    };
    const field = { P12763: "synonym_of", P2959: "duplicates", P460: "said_same" } as const;
    await byIds([...setOf.keys()], "sameness", (v) => `SELECT ?a ?p ?b WHERE { VALUES ?a { ${v} } VALUES ?p { wdt:P12763 wdt:P1420 wdt:P2959 wdt:P460 } ?a ?p ?b . }`, (rows) => {
      for (const r of rows) {
        const [a, p, b] = [qid(r.a.value), r.p.value.split("/").pop()!, qid(r.b.value)];
        if (a === b || !setOf.has(b)) continue;
        if (p === "P1420") mark(b).synonym_of.push(a);
        else mark(a)[field[p as keyof typeof field]].push(b);
        mark(p === "P1420" ? a : b);
      }
    });
    await byIds([...marks.keys()], "sitelinks", (v) => `SELECT ?x ?n WHERE { VALUES ?x { ${v} } ?x wikibase:sitelinks ?n . }`, (rows) => {
      for (const r of rows) mark(qid(r.x.value)).sitelinks = Number(r.n.value);
    });
    const sorted = [...marks.values()].map((m) => ({ ...m, synonym_of: [...new Set(m.synonym_of)].sort(), duplicates: [...new Set(m.duplicates)].sort(), said_same: [...new Set(m.said_same)].sort() }));
    return sorted.sort((x, y) => x.id.localeCompare(y.id));
  },
};

// Links (13e-2; human, 2026-10-25: "Links as facts (Recommended)"): reviewed kind_of facts filling gaps in a source's
// tree, each naming both things as the base names them, so a wrong ID is refused by private.load_links.
export type Link = { thing: string; name: string; kind_of: string; kind_of_name: string };
export const LINKS_FILE = "data/links.json";

// The links file is disk input: a list of links, each with exactly its four fields as text, refs as "source:id".
export function parseLinks(text: string): Link[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error(`${LINKS_FILE}: must be a list of links`);
  const fields = ["thing", "name", "kind_of", "kind_of_name"];
  data.forEach((v, i) => {
    const ok = typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === fields.length
      && fields.every((f) => typeof (v as Record<string, unknown>)[f] === "string" && (v as Record<string, string>)[f].trim() !== "");
    if (!ok) throw new Error(`${LINKS_FILE} link ${i + 1}: must hold exactly ${fields.join(", ")}, each as text`);
    const { thing, kind_of } = v as Link;
    if (![thing, kind_of].every((ref) => /^[a-z]+:./.test(ref))) throw new Error(`${LINKS_FILE} link ${i + 1}: "thing" and "kind_of" must be refs as "source:id"`);
  });
  return data as Link[];
}

async function loadLinks(client: pg.Client): Promise<void> {
  const links = parseLinks(readFileSync(LINKS_FILE, "utf8"));
  const { rows } = await client.query("select private.load_links($1::jsonb) as counts", [JSON.stringify(links)]);
  console.log(`LINKED ${LINKS_FILE}: ${JSON.stringify(rows[0].counts)}`);
}

function readCategories(): CategoryDef[] {
  const { categories, errors } = parseCategories(CATEGORIES_FILE, readFileSync(CATEGORIES_FILE, "utf8"));
  if (!categories) throw new Error(errors.join("\n"));
  return categories;
}

// A category data/categories.json puts within another must have its root under the other's, or the draft would treat
// two unrelated categories as one family (13e-7).
export async function checkWithin(client: pg.Client, key: string, within: string): Promise<void> {
  const { rows } = await client.query(`select c.root in (select private.descendants_now(array[w.root])) as inside
    from private.category c, private.category w where c.key = $1 and w.key = $2`, [key, within]);
  if (!rows[0]?.inside) throw new Error(`${CATEGORIES_FILE}: ${key} says it's within ${within}, but its root isn't under ${within}'s`);
}

// Every category in data/categories.json, in one transaction: a root, member_of or filter value that isn't loaded fails
// them all. A subset follows its base (parseCategories checks the order).
async function defineCategories(client: pg.Client): Promise<void> {
  const categories = readCategories();
  try {
    await client.query("begin");
    const bases = new Map(categories.filter((c): c is BaseCategory => !isSubset(c)).map((c) => [c.key, c]));
    for (const c of categories) {
      if (isSubset(c)) {
        await client.query("select private.define_subset($1, $2, $3, $4, $5::jsonb)", [c.key, c.name, c.of, bases.get(c.of)!.source, JSON.stringify(filterOf(c))]);
      } else {
        await client.query("select private.define_category($1, $2, $3, $4, $5)", [c.key, c.name, c.source, c.root, c.member_of ?? null]);
        if (c.within) await checkWithin(client, c.key, c.within);
      }
    }
    await client.query("commit");
    console.log(`DEFINED ${categories.length} categories from ${CATEGORIES_FILE}`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

// Removal on load (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3a; human, 2026-10-27: "Build it now
// (Recommended)", "Erase it", "Erase at the next midnight (Recommended)"): `load all` opens a load, every set and link
// marks what the files give, and the finish ends the owned names, facts, links and populations no file gave at the next
// midnight (Los Angeles), shows each thing the name the files give it, and erases the categories the file no longer
// lists, keeping the things themselves, players' rows and the admin's decisions (migration
// 20261027233000_load_sync.sql). A load a day after that midnight erases the ended rows, as a run can be finished the
// next day ("Wait one more day (Recommended)"). A single `load <set>` doesn't erase: it sees one set, not what the
// others give, so it marks nothing (13f-3b-1). The load is its session's (migration 20261028060000_load_gaps.sql):
// `load all` runs on one connection from load_begin to load_finish, holding the load lock, so a second load is refused
// while it runs, and the lock goes with the connection if the script dies.
async function beginLoad(client: pg.Client): Promise<void> {
  const { rows } = await client.query<{ erased: { aliases: number; facts: number; numbers: number } }>(
    "select private.load_begin() as erased");
  const e = rows[0].erased;
  if (e.aliases + e.facts + e.numbers > 0) {
    console.log(`ERASED what ended before yesterday: ${e.aliases} names, ${e.facts} facts and links, ${e.numbers} populations`);
  }
}

async function finishLoad(client: pg.Client): Promise<void> {
  const keys = readCategories().map((c) => c.key);
  const { rows } = await client.query<{ e: {
    at: string; aliases: number; facts: number; links: number; numbers: number; renamed: number;
    categories: string[]; kept_categories: string[];
    touched: { date: string; question: number; answer: string; changes: string[] }[];
  } }>("select private.load_finish($1::text[]) as e", [keys]);
  const e = rows[0].e;
  if (e.aliases + e.facts + e.links + e.numbers > 0) {
    console.log(`ENDING at ${e.at}, as the files no longer give them: ${e.aliases} names, ${e.facts} facts, ${e.links} links, ${e.numbers} populations`);
  }
  if (e.renamed > 0) console.log(`RENAMED ${e.renamed} things to the names the files give`);
  if (e.categories.length) console.log(`ERASED ${e.categories.length} categories: ${e.categories.join(", ")}`);
  if (e.kept_categories.length) {
    console.log(`KEPT categories the file dropped, as players' misses, the admin's additions, a day from yesterday on or an unfinished run use them: ${e.kept_categories.join(", ")}`);
  }
  // Approved days not started yet read the base as it is at their start, so the admin checks each one again on the
  // Puzzles page (human, 2026-10-28: "Name them, keep going (Recommended)").
  for (const t of e.touched) {
    console.log(`CHANGED approved day ${t.date}, question ${t.question}: host answer "${t.answer}" (${t.changes.join(", ")}); check it on the Puzzles page`);
  }
}

// The planner's statistics for the base's tables. Right after a fresh `load all` they describe empty tables until
// autovacuum catches up, and a query over the animal category ran over 10 minutes; after ANALYZE, 2.6 s (13e-5 Evidence).
async function analyzeBase(client: pg.Client): Promise<void> {
  await client.query("analyze private.thing, private.thing_source, private.thing_alias, private.fact, private.number_fact, private.category");
  console.log("ANALYZED the base's tables");
  // The database's size after each load, so the base's growth toward the plan's limit is seen on every machine
  // (human, 2026-10-27: "30 and keep track of database size", "load all prints it (Recommended)"; DECISIONS.md Log,
  // Storage: warned near 500 MB).
  const { rows } = await client.query<{ size: string }>("select pg_size_pretty(pg_database_size(current_database())) as size");
  console.log(`DATABASE ${rows[0].size}`);
}

// A set's items under nothing: no parent in the tree, not the set's root, not a value another item's facts name, and
// not joined or merged into another item's thing. Such an item is outside every category of the tree and outside the
// review's "unnamed" count (13a-1 review: a fruit item whose parents all lack an English label; 13f-3b-2).
export function parentless(items: Item[], root: string): Item[] {
  const values = new Set(items.flatMap((i) => [...(i.kind_of ?? []), ...(i.member_of ?? []), ...(i.country ?? []), ...(i.continent ?? []),
    ...(i.conservation_status ?? []), ...(i.genre ?? []), ...(i.publisher ?? [])]));
  return items.filter((i) => i.id !== root && !i.kind_of?.length && !i.same_as && !i.merged_into && !values.has(i.id));
}

// An unjoined word's taxon, by the animal snapshots the review reads: one a re-fetch dropped while the WordNet
// snapshot still names it stops the review by name, not with a TypeError (13e-5 second review; 13f-3b-2).
export function taxonName(joins: Joins, taxon: string): string {
  const item = joins.wikidata.get(taxon);
  if (!item) throw new Error(`review: the WordNet snapshot leaves a word unjoined to ${taxon}, which no loaded animal snapshot holds; fetch both again`);
  return item.name;
}

// What the human reviews, per category: the count, BASE_REVIEW_SAMPLE random members, and flags: fewer than
// CATEGORY_MIN_MEMBERS members (13e), members with an alias on the LDNOOBW list or Plor's (13e-9b), for the human to
// decide per category (13e-2: "Flag; you decide each"), members under two parents (two meanings), aliases shared by
// two members (duplicates), things under the root with no English name (left out of the category), WordNet words
// joined to a Wikidata thing sharing no name, and words naming several taxa, left unjoined for a person to fix (13e-5).
// Joins are read from the loaded snapshots (13e-5 items 1 and 2): odd joins, and words naming several taxa, unjoined.
export type Joins = { wordnet: Map<string, Item>; wikidata: Map<string, Item>; odd: Map<string, string> };
// What the doubles list reads (13e-5b): the bank, the pairs a person kept apart, and the merge plan's forks and P460 pairs.
type Doubles = { bank: Bank; apart: Set<string>; reviewed: Set<string>; plan: MergePlan };

async function review(keys: string[]): Promise<void> {
  const wordnet = readSnapshot("oewn-animals").items;
  const wikidata = new Map([...readSnapshot("wikidata-animals").items, ...readSnapshot("wikidata-dog-breeds").items].map((i) => [i.id, i]));
  const joins: Joins = { wordnet: new Map(wordnet.map((i) => [i.id, i])), wikidata, odd: oddJoins(wordnet, wikidata) };
  const { bank, errors } = parseBank("bank.json", readFileSync(join("content", "bank.json"), "utf8"));
  if (!bank) throw new Error(errors.join("\n"));
  const sameness = readSameness();
  const doubles: Doubles = {
    bank, apart: new Set(sameness.apart.map((r) => [r.a, r.b].sort().join(" "))), reviewed: new Set(sameness.reviewed.map((r) => `${r.category} ${normalize(r.name)}`)), plan: mergePlan(),
  };
  const client = await localClient();
  try {
    for (const key of keys) await reviewOne(client, key, joins, doubles);
  } finally {
    await client.end();
  }
}

// The items of each set holding a category's root (a subset's base's), with that root's ID.
function rootSetItems(key: string): { items: Item[]; root: string }[] {
  const categories = readCategories();
  const c = categories.find((x) => x.key === key)!;
  const base = (isSubset(c) ? categories.find((x) => x.key === c.of)! : c) as BaseCategory;
  return Object.entries(SETS).filter(([, def]) => def.source === base.source)
    .map(([set]) => readSnapshot(set).items).filter((items) => items.some((i) => i.id === base.root)).map((items) => ({ items, root: base.root }));
}

async function reviewOne(client: pg.Client, key: string, joins: Joins, doubles: Doubles): Promise<void> {
  const one = async (sql: string, params: unknown[] = [key]) => (await client.query(sql, params)).rows;
  const [{ n }] = await one("select count(*)::int as n from private.category_members($1)");
  if (n === 0) throw new Error(`category ${key} has no members (is it loaded?)`);
  const sample = await one(`select t.name from private.category_members($1) m join private.thing t on t.id = m order by random() limit $2`, [key, BASE_REVIEW_SAMPLE]);
  const twoParents = await one(`select t.name, count(*)::int as parents from private.category_members($1) m join private.thing t on t.id = m
    join private.fact f on f.thing_id = m and f.trait = 'kind_of' and f.removed_at is null group by t.name having count(*) > 1 order by parents desc, t.name`);
  const aliases = await one(`select t.name, a.alias from private.category_members($1) m join private.thing t on t.id = m
    join private.thing_alias a on a.thing_id = m and a.removed_at is null`);
  const listedBy = new Map<string, string[]>();
  for (const r of aliases) if (isListed(r.alias)) listedBy.set(r.name, [...(listedBy.get(r.name) ?? []), `"${r.alias}"`]);
  const listed = [...listedBy].map(([name, hits]) => `${name} (${hits.join(", ")})`);
  const shared = await one(`select a.alias, array_agg(t.name order by t.name) as things from private.category_members($1) m
    join private.thing_alias a on a.thing_id = m join private.thing t on t.id = m group by a.alias having count(*) > 1 order by a.alias`);
  const [{ unnamed }] = await one(`select count(*)::int as unnamed from private.category c cross join private.descendants_now(array[c.root]) as u(id)
    where c.key = $1 and not exists (select from private.thing_alias a where a.thing_id = u.id and a.kind = 'name')`);
  console.log(`REVIEW ${key}: ${n} members`);
  if (n < CATEGORY_MIN_MEMBERS) console.log(`  flag, fewer than ${CATEGORY_MIN_MEMBERS} members: ${n}`);
  console.log(`  sample: ${sample.map((r) => r.name).join("; ")}`);
  console.log(`  flag, an alias on the LDNOOBW list or Plor's: ${listed.length}${listed.length ? ` (${listed.join("; ")})` : ""}`);
  console.log(`  flag, under two or more parents: ${twoParents.length}${twoParents.length ? ` (e.g. ${twoParents.slice(0, 10).map((r) => `${r.name} ×${r.parents}`).join("; ")})` : ""}`);
  console.log(`  flag, one alias on two or more members: ${shared.length}${shared.length ? ` (e.g. ${shared.slice(0, 10).map((r) => `"${r.alias}": ${r.things.join(" / ")}`).join("; ")})` : ""}`);
  console.log(`  flag, things under the root with no English name (not in the category): ${unnamed}`);
  const noParent = rootSetItems(key).flatMap(({ items, root }) => parentless(items, root)).map((i) => i.name);
  console.log(`  flag, items of the root's set under nothing (not in the category): ${noParent.length}${noParent.length ? ` (${noParent.sort().join("; ")})` : ""}`);
  const wordnetIds = (await one(`select s.source_id from private.category_members($1) m
    join private.thing_source s on s.thing_id = m and s.source = 'oewn'`)).map((r) => r.source_id as string);
  const odd = wordnetIds.filter((id) => joins.odd.has(id)).map((id) => `${joins.wordnet.get(id)!.name} = ${joins.odd.get(id)}`);
  const unjoined = wordnetIds.map((id) => joins.wordnet.get(id)).filter((i) => i?.unjoined)
    .map((i) => `${i!.name}: ${i!.unjoined!.map((t) => `${taxonName(joins, t)} (${t})`).join(" / ")}`);
  console.log(`  flag, a WordNet word joined to a Wikidata thing sharing no name: ${odd.length}${odd.length ? ` (${odd.sort().join("; ")})` : ""}`);
  console.log(`  flag, a WordNet word naming several loaded taxa, unjoined: ${unjoined.length}${unjoined.length ? ` (${unjoined.sort().join("; ")})` : ""}`);
  // Doubles players meet (13e-5b; human, 2026-10-27: "Bank answers (Recommended)"): a bank answer of this category,
  // by name or by ID, whose names are on two or more members, and Wikidata's P460 pairs and forks among members that
  // a bank answer names; names and pairs data/sameness.json already decides are left out.
  const answers = doubles.bank.questions.filter((q) => q.category === key).flatMap((q) => [...q.host_bank, ...q.uncommon]);
  const ids = answers.filter((a) => a.startsWith("#")).map((a) => a.slice(1));
  const doubled = await one(`with m as (select m as id from private.category_members($1) m),
      named as (select distinct a.alias from m join private.thing_alias a on a.thing_id = m.id and a.removed_at is null
        where a.alias = any($2) or m.id in (select private.thing_now(x) from unnest($3::uuid[]) as x) and a.kind = 'name')
    select n.alias, array_agg(distinct t.name || ' (' || coalesce((select string_agg(s.source || ':' || s.source_id, ' ' order by s.source)
        from private.thing_source s where s.thing_id = t.id), '') || ')') as things,
      array_agg(distinct s.source_id) filter (where s.source = 'wikidata') as qids
    from named n join private.thing_alias a on a.alias = n.alias and a.removed_at is null join m on m.id = a.thing_id
    join private.thing t on t.id = m.id left join private.thing_source s on s.thing_id = m.id
    group by n.alias having count(distinct m.id) > 1 order by n.alias`, [key, answers.filter((a) => !a.startsWith("#")).map(normalize), ids]);
  const open = doubled.filter((r) => !doubles.reviewed.has(`${key} ${r.alias}`) && !(r.qids?.length === 2 && doubles.apart.has([...r.qids].sort().join(" "))));
  console.log(`  flag, a bank answer naming two or more members: ${open.length}${open.length ? ` (${open.map((r) => `"${r.alias}": ${r.things.join(" / ")}`).join("; ")})` : ""}`);
  const members = new Set((await one(`select s.source_id from private.category_members($1) m
    join private.thing_source s on s.thing_id = m and s.source = 'wikidata'`)).map((r) => r.source_id as string));
  const sharedIds = new Set(open.flatMap((r) => r.qids ?? []));
  const pairs = [...doubles.plan.saidSame.map((p) => ["P460", p] as const), ...doubles.plan.forks.map((p) => ["fork", p] as const)]
    .filter(([, p]) => p.every((id) => members.has(id)) && p.some((id) => sharedIds.has(id)) && !(p.length === 2 && doubles.apart.has([...p].sort().join(" "))));
  console.log(`  flag, a P460 pair or fork a bank answer names: ${pairs.length}${pairs.length ? ` (${pairs.map(([kind, p]) => `${kind} ${p.join(" / ")}`).join("; ")})` : ""}`);
}

async function main(): Promise<void> {
  const [command, name, ...more] = process.argv.slice(2);
  if (command === "review" && name) return review([name, ...more]);
  if (command === "load" && name === "all") {
    const client = await localClient();
    try {
      await beginLoad(client);
      for (const [set, def] of Object.entries(SETS)) await loadSet(client, set, def);
      const unused = unusedHandNames(readHandFiles().names, handNamesUsed);
      if (unused.length) throw new Error(`${NAMES_FILE}: ${unused.join(", ")} did nothing in any set (the item already had the name, or lacked the one removed)`);
      await loadLinks(client);
      await defineCategories(client);
      await finishLoad(client);
      return await analyzeBase(client);
    } finally {
      await client.end();
    }
  }
  if (command === "fetch" && name === MARKS_SET) return fetchSet(MARKS_SET, MARKS);
  const def = name ? SETS[name] : undefined;
  if ((command !== "fetch" && command !== "load") || !def) {
    console.error(`usage: npm run base -- fetch|load <${Object.keys(SETS).join("|")}>\n       npm run base -- fetch ${MARKS_SET}\n       npm run base -- load all\n       npm run base -- review <category key>…`);
    process.exit(2);
  }
  if (command === "fetch") return fetchSet(name, def);
  const client = await localClient();
  try {
    await loadSet(client, name, def);
  } finally {
    await client.end();
  }
  const refsOf = (set: string) => readSnapshot(set).items.map((i) => `${SETS[set].source}:${i.id}`);
  const own = handNamesOnlyIn(readHandFiles().names, new Set(refsOf(name)), new Set(Object.keys(SETS).filter((s) => s !== name).flatMap(refsOf)));
  const unused = unusedHandNames(own, handNamesUsed);
  if (unused.length) throw new Error(`${NAMES_FILE}: ${unused.join(", ")} did nothing in ${name} (the item already had the name, or lacked the one removed)`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
