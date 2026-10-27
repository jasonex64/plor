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
import { BASE_BATCH_IDS, BASE_PLACES_MIN_POPULATION, BASE_REVIEW_SAMPLE, CATEGORY_MIN_MEMBERS } from "../src/config/tunables.ts";
import { parseBank, type Bank } from "../src/content/bank.ts";
import { CATEGORIES_FILE, filterOf, isSubset, parseCategories, type BaseCategory, type CategoryDef } from "../src/content/categories.ts";
import { normalize } from "../src/content/puzzle.ts";
import { thingId } from "../src/content/thing-id.ts";
import { isListed } from "../src/game/misses.ts";

export type Alias = { alias: string; kind: "name" | "synonym" | "plural" | "scientific" };
// The facts subsets filter on (13e-4a, O2: "A core few") ride on an item beside its tree: thing-valued ones as source
// IDs, a population as a number with its point in time.
export type Population = { value: number; as_of: string | null };
export type FactTrait = "country" | "continent" | "conservation_status";
export type Item = {
  id: string; name: string; aliases: Alias[]; kind_of?: string[]; member_of?: string[]; same_as?: string;
  country?: string[]; continent?: string[]; conservation_status?: string[]; population?: Population;
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
async function sparql(query: string): Promise<Binding[] | "timeout"> {
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
    if (response.ok) return (JSON.parse(text) as { results: { bindings: Binding[] } }).results.bindings;
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
// one: SOURCES.md, Wikidata properties). null when two values tie for latest (both undated, or the same date) and
// differ, as the import can't choose between them; the caller counts those.
export function latestNumber(given: Claim[]): Population | null {
  const sorted = [...given].sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
  const [top, next] = sorted;
  if (next && (next.time ?? "") === (top.time ?? "") && next.value !== top.value) return null;
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
function valueItems(found: Awaited<ReturnType<typeof labelled>>): Item[] {
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

// Rivers whose LDNOOBW-listed aliases are dropped at fetch: Pūkio Stream's Wikidata alias is a racial slur. Its other
// flagged names, and every other category's, stay typeable (human, 2026-10-25: "Drop the slur, keep rest
// (Recommended)"). Named by ID so the slur itself stays out of the repo.
const RIVERS_DROP_LISTED_ALIASES = ["Q32298578"];

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
// Taxa whose LDNOOBW-listed English names are dropped, named by ID so the word stays out of the repo: the kitefin
// shark's first English name is a racial slur (13e-4b review flags; human, 2026-10-26: "Drop the slur, keep the rest
// (Recommended)"), as Pūkio Stream's alias is for rivers.
const ANIMALS_DROP_LISTED_NAMES = ["Q1321783"];
const DOG = "Q26972265"; // Canis lupus familiaris: no taxon has the English common name "dog" (checked 2026-10-24)

// In load order: a set's refs and same_as name only sets above it (`npm run base -- load all` loads them in turn).
const SETS: Record<string, SetDef> = {
  "wikidata-animals": {
    source: "wikidata",
    method: `SPARQL by key, ${BASE_BATCH_IDS} IDs a query: the tree under ${ANIMALIA} read top-down by P171 parent taxon, each taxon's English common names (P1843), and for the taxa kept (those with an English name, plus their ancestors up to it) their scientific names (P225) and English labels (named by the label when it is one of the common names, else the first common name alphabetically); LDNOOBW-listed names of ${ANIMALS_DROP_LISTED_NAMES.join(", ")} dropped; each taxon's IUCN conservation status (P141, truthy) among the 9 of its one-of constraint, which are items of the set`,
    fetch: async () => {
      const taxa = await fetchTaxa(ANIMALIA);
      if (!taxa.has(DOG)) throw new Error(`${DOG} (the domestic dog) wasn't fetched`);
      for (const id of ANIMALS_DROP_LISTED_NAMES) {
        const t = taxa.get(id);
        if (t) [t.names, t.synonyms] = [t.names, t.synonyms].map((names) => names.filter((n) => !isListed(normalize(n))));
      }
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
    method: `SPARQL: instances of river (P31 Q4022) with an English Wikipedia article (schema:about, schema:isPartOf <https://en.wikipedia.org/>); each name "X River" or "River X" also gives "X" as a synonym unless another river gives it too; LDNOOBW-listed aliases of ${RIVERS_DROP_LISTED_ALIASES.join(", ")} dropped; each river's countries (P17, best rank, only the wikidata-countries snapshot's 193)`,
    fetch: async () => {
      const where = `?x wdt:P31 wd:Q4022 . ?article schema:about ?x ; schema:isPartOf <https://en.wikipedia.org/> .`;
      const found = await labelled(where);
      for (const id of RIVERS_DROP_LISTED_ALIASES) {
        const e = found.get(id);
        if (e) e.alts = e.alts.filter((a) => !isListed(normalize(a)));
      }
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

async function loadSet(set: string, def: SetDef): Promise<void> {
  const { manifest, items: read } = readSnapshot(set);
  const name = (id: string) => loadedWikidata().names.get(mergePlan().into.get(id) ?? id);
  const items = def.source === "wikidata" ? withMerges(read, mergePlan().into) : def.source === "oewn" ? shownNames(read, name) : read;
  const client = await localClient();
  try {
    await client.query("begin");
    const withIds = items.map((item) => ({ ...item, thing_id: thingId(def.source, item.id) }));
    const { rows } = await client.query("select private.import_source($1, $2, $3::jsonb) as counts", [def.source, manifest.snapshot, JSON.stringify(withIds)]);
    await client.query("commit");
    console.log(`LOADED ${set} (${manifest.snapshot}): ${JSON.stringify(rows[0].counts)}`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    await client.end();
  }
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

export function parseSameness(text: string): Sameness {
  const data: unknown = JSON.parse(text);
  const lists = Object.keys(SAMENESS_FIELDS) as (keyof Sameness)[];
  if (typeof data !== "object" || data === null || Array.isArray(data) || Object.keys(data).sort().join() !== [...lists].sort().join()) {
    throw new Error(`${SAMENESS_FILE}: must hold exactly ${lists.join(", ")}`);
  }
  for (const list of lists) {
    const rows = (data as Record<string, unknown>)[list];
    if (!Array.isArray(rows)) throw new Error(`${SAMENESS_FILE}: ${list} must be a list`);
    const fields = SAMENESS_FIELDS[list];
    rows.forEach((row, i) => {
      const ok = typeof row === "object" && row !== null && !Array.isArray(row) && Object.keys(row).length === fields.length
        && fields.every((f) => typeof (row as Record<string, unknown>)[f] === "string" && ((row as Record<string, string>)[f]).trim() !== "");
      if (!ok) throw new Error(`${SAMENESS_FILE} ${list} ${i + 1}: must hold exactly ${fields.join(", ")}, each as text`);
    });
    // What each row decides, once: an old item merges once, a pair is apart once, a category's name is reviewed once, a
    // synset is split, picked or joined once.
    const keys = rows.map((row) => SAMENESS_KEYS[list].map((f) => (row as Record<string, string>)[f]).join(" "));
    const twice = keys.filter((v, i) => keys.indexOf(v) !== i);
    if (twice.length) throw new Error(`${SAMENESS_FILE} ${list}: ${[...new Set(twice)].join(", ")} listed twice`);
  }
  return data as Sameness;
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

async function loadLinks(): Promise<void> {
  const links = parseLinks(readFileSync(LINKS_FILE, "utf8"));
  const client = await localClient();
  try {
    const { rows } = await client.query("select private.load_links($1::jsonb) as counts", [JSON.stringify(links)]);
    console.log(`LINKED ${LINKS_FILE}: ${JSON.stringify(rows[0].counts)}`);
  } finally {
    await client.end();
  }
}

function readCategories(): CategoryDef[] {
  const { categories, errors } = parseCategories(CATEGORIES_FILE, readFileSync(CATEGORIES_FILE, "utf8"));
  if (!categories) throw new Error(errors.join("\n"));
  return categories;
}

// Every category in data/categories.json, in one transaction: a root, member_of or filter value that isn't loaded fails
// them all. A subset follows its base (parseCategories checks the order).
async function defineCategories(): Promise<void> {
  const categories = readCategories();
  const client = await localClient();
  try {
    await client.query("begin");
    const bases = new Map(categories.filter((c): c is BaseCategory => !isSubset(c)).map((c) => [c.key, c]));
    for (const c of categories) {
      if (isSubset(c)) {
        await client.query("select private.define_subset($1, $2, $3, $4, $5::jsonb)", [c.key, c.name, c.of, bases.get(c.of)!.source, JSON.stringify(filterOf(c))]);
      } else {
        await client.query("select private.define_category($1, $2, $3, $4, $5)", [c.key, c.name, c.source, c.root, c.member_of ?? null]);
      }
    }
    await client.query("commit");
    console.log(`DEFINED ${categories.length} categories from ${CATEGORIES_FILE}`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    await client.end();
  }
}

// The planner's statistics for the base's tables. Right after a fresh `load all` they describe empty tables until
// autovacuum catches up, and a query over the animal category ran over 10 minutes; after ANALYZE, 2.6 s (13e-5 Evidence).
async function analyzeBase(): Promise<void> {
  const client = await localClient();
  try {
    await client.query("analyze private.thing, private.thing_source, private.thing_alias, private.fact, private.number_fact, private.category");
    console.log("ANALYZED the base's tables");
  } finally {
    await client.end();
  }
}

// What the human reviews, per category: the count, BASE_REVIEW_SAMPLE random members, and flags: fewer than
// CATEGORY_MIN_MEMBERS members (13e), members with an alias on the LDNOOBW list, for the human to decide per category
// (13e-2: "Flag; you decide each"), members under two parents (two meanings), aliases shared by two members
// (duplicates), things under the root with no English name (left out of the category), WordNet words joined to a
// Wikidata thing sharing no name, and words naming several taxa, left unjoined for a person to fix (13e-5).
// Joins are read from the loaded snapshots (13e-5 items 1 and 2): odd joins, and words naming several taxa, unjoined.
type Joins = { wordnet: Map<string, Item>; wikidata: Map<string, Item>; odd: Map<string, string> };
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

async function reviewOne(client: pg.Client, key: string, joins: Joins, doubles: Doubles): Promise<void> {
  const one = async (sql: string, params: unknown[] = [key]) => (await client.query(sql, params)).rows;
  const [{ n }] = await one("select count(*)::int as n from private.category_members($1)");
  if (n === 0) throw new Error(`category ${key} has no members (is it loaded?)`);
  const sample = await one(`select t.name from private.category_members($1) m join private.thing t on t.id = m order by random() limit $2`, [key, BASE_REVIEW_SAMPLE]);
  const twoParents = await one(`select t.name, count(*)::int as parents from private.category_members($1) m join private.thing t on t.id = m
    join private.fact f on f.thing_id = m and f.trait = 'kind_of' group by t.name having count(*) > 1 order by parents desc, t.name`);
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
  console.log(`  flag, an alias on the LDNOOBW list: ${listed.length}${listed.length ? ` (${listed.join("; ")})` : ""}`);
  console.log(`  flag, under two or more parents: ${twoParents.length}${twoParents.length ? ` (e.g. ${twoParents.slice(0, 10).map((r) => `${r.name} ×${r.parents}`).join("; ")})` : ""}`);
  console.log(`  flag, one alias on two or more members: ${shared.length}${shared.length ? ` (e.g. ${shared.slice(0, 10).map((r) => `"${r.alias}": ${r.things.join(" / ")}`).join("; ")})` : ""}`);
  console.log(`  flag, things under the root with no English name (not in the category): ${unnamed}`);
  const wordnetIds = (await one(`select s.source_id from private.category_members($1) m
    join private.thing_source s on s.thing_id = m and s.source = 'oewn'`)).map((r) => r.source_id as string);
  const odd = wordnetIds.filter((id) => joins.odd.has(id)).map((id) => `${joins.wordnet.get(id)!.name} = ${joins.odd.get(id)}`);
  const unjoined = wordnetIds.map((id) => joins.wordnet.get(id)).filter((i) => i?.unjoined)
    .map((i) => `${i!.name}: ${i!.unjoined!.map((t) => `${joins.wikidata.get(t)!.name} (${t})`).join(" / ")}`);
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
    .filter(([, p]) => p.every((id) => members.has(id)) && p.some((id) => sharedIds.has(id)));
  console.log(`  flag, a P460 pair or fork a bank answer names: ${pairs.length}${pairs.length ? ` (${pairs.map(([kind, p]) => `${kind} ${p.join(" / ")}`).join("; ")})` : ""}`);
}

async function main(): Promise<void> {
  const [command, name, ...more] = process.argv.slice(2);
  if (command === "review" && name) return review([name, ...more]);
  if (command === "load" && name === "all") {
    for (const [set, def] of Object.entries(SETS)) await loadSet(set, def);
    await loadLinks();
    await defineCategories();
    return analyzeBase();
  }
  if (command === "fetch" && name === MARKS_SET) return fetchSet(MARKS_SET, MARKS);
  const def = name ? SETS[name] : undefined;
  if ((command !== "fetch" && command !== "load") || !def) {
    console.error(`usage: npm run base -- fetch|load <${Object.keys(SETS).join("|")}>\n       npm run base -- fetch ${MARKS_SET}\n       npm run base -- load all\n       npm run base -- review <category key>…`);
    process.exit(2);
  }
  await (command === "fetch" ? fetchSet(name, def) : loadSet(name, def));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
