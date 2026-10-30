// The tests' answer database and format-3 day (docs/milestones/M13-13a-the-base.md): seven small categories loaded
// into the base through private.import_source, with the IDs every import computes (src/content/thing-id.ts), and a day
// that asks them. Shared by the database tests (src/test/puzzles.ts) and the e2e tests (e2e/puzzle.ts), so it takes the
// database client it's given. Its categories and source IDs start with "fixture", apart from any real data.
import type { ApprovedPuzzle, ApprovedQuestion, Puzzle } from "../content/puzzle.ts";
import { normalize } from "../content/puzzle.ts";
import { thingId } from "../content/thing-id.ts";

type Querier = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

// A member: its names (the first is its main name), and the member it sits under, if not the root.
type Member = { names: string[]; under?: string };
// host follows HOST_ANSWERS_PER_QUESTION; bank is the common level and uncommon the uncommon one, leaving at least
// FAMILIAR_SAFE_MIN of them typeable past the stolen letters and safe from the host (M13 13c).
type FixtureQuestion = { key: string; prompt: string; steals?: string; host: string[]; bank: string[]; uncommon: string[]; members: Record<string, Member> };

// Schedule A (M04 G8): Q2 and Q4 steal a medium letter, Q5 a heavy consonant, Q7 a vowel. Every host answer's main
// name avoids the letters stolen by then, and each question keeps answers the host doesn't catch.
export const FIXTURE: FixtureQuestion[] = [
  {
    key: "fixture_animal",
    prompt: "Name an animal",
    host: ["bear"],
    bank: ["bear", "dog"],
    uncommon: ["cat", "fish", "horse"],
    members: {
      bear: { names: ["bear", "bears"] },
      "polar-bear": { names: ["polar bear", "polar bears", "ursus maritimus"], under: "bear" },
      dog: { names: ["dog", "dogs"] },
      cat: { names: ["cat", "cats"] },
      fish: { names: ["fish"] },
      // One name at two ranks of one line: it resolves to the higher (13a evidence, "aardvark").
      "aardvark-genus": { names: ["aardvark", "aardvarks"] },
      "aardvark-species": { names: ["aardvark", "aardvarks", "orycteropus afer"], under: "aardvark-genus" },
      // One name on two unrelated members (human, 2026-10-24: "Caught if any meaning is").
      "american-robin": { names: ["american robin", "robin", "robins"] },
      "european-robin": { names: ["european robin", "robin", "robins"] },
      // Two members one typo from the same text ("horze" is one edit from both).
      horse: { names: ["horse", "horses"] },
      horde: { names: ["horde"] },
    },
  },
  {
    key: "fixture_fruit",
    prompt: "Name a fruit",
    steals: "c",
    host: ["apple"],
    bank: ["apple", "banana"],
    uncommon: ["kiwi", "mango"],
    members: {
      apple: { names: ["apple", "apples"] },
      banana: { names: ["banana", "bananas"] },
      kiwi: { names: ["kiwi", "kiwis"] },
      mango: { names: ["mango", "mangoes"] },
      cherry: { names: ["cherry", "cherries"] },
    },
  },
  {
    key: "fixture_color",
    prompt: "Name a color",
    host: ["red"],
    bank: ["red", "blue"],
    uncommon: ["green", "yellow"],
    members: {
      red: { names: ["red"] },
      blue: { names: ["blue"] },
      green: { names: ["green"] },
      yellow: { names: ["yellow"] },
      black: { names: ["black"] },
    },
  },
  {
    key: "fixture_country",
    prompt: "Name a country",
    steals: "p",
    host: ["italy"],
    bank: ["italy", "kenya"],
    uncommon: ["mali", "togo"],
    members: {
      italy: { names: ["Italy"] },
      kenya: { names: ["Kenya"] },
      france: { names: ["France"] },
      spain: { names: ["Spain"] },
      japan: { names: ["Japan"] },
      mali: { names: ["Mali"] },
      togo: { names: ["Togo"] },
    },
  },
  {
    key: "fixture_metal",
    prompt: "Name a metal",
    steals: "r",
    host: ["gold", "tin"],
    bank: ["gold", "tin"],
    uncommon: ["lead", "tungsten", "titanium"],
    members: {
      gold: { names: ["gold"] },
      tin: { names: ["tin"] },
      lead: { names: ["lead"] },
      iron: { names: ["iron"] },
      zinc: { names: ["zinc"] },
      tungsten: { names: ["tungsten"] },
      titanium: { names: ["titanium"] },
    },
  },
  {
    key: "fixture_sport",
    prompt: "Name a sport",
    host: ["golf", "tennis"],
    bank: ["golf", "tennis"],
    uncommon: ["boxing", "judo", "sumo"],
    members: {
      golf: { names: ["golf"] },
      tennis: { names: ["tennis"] },
      boxing: { names: ["boxing"] },
      judo: { names: ["judo"] },
      sumo: { names: ["sumo"] },
      hockey: { names: ["hockey"] },
    },
  },
  {
    key: "fixture_body_part",
    prompt: "Name a body part",
    steals: "o",
    host: ["hand", "head", "leg"],
    bank: ["hand", "head", "leg"],
    uncommon: ["knee", "eye", "skin"],
    members: {
      hand: { names: ["hand", "hands"] },
      head: { names: ["head", "heads"] },
      leg: { names: ["leg", "legs"] },
      knee: { names: ["knee", "knees"] },
      toe: { names: ["toe", "toes"] },
      eye: { names: ["eye", "eyes"] },
      skin: { names: ["skin"] },
    },
  },
];

const sourceId = (key: string, slug: string) => `${key}-${slug}`;
export const fixtureId = (index: number, slug: string) => thingId("wikidata", sourceId(FIXTURE[index].key, slug));

// Every thing's main name, by ID.
export const FIXTURE_NAMES = new Map<string, string>(
  FIXTURE.flatMap((q, i) => Object.entries(q.members).map(([slug, m]) => [fixtureId(i, slug), m.names[0]] as [string, string])),
);
// Every thing's names, by ID.
export const FIXTURE_ALIASES = new Map<string, string[]>(
  FIXTURE.flatMap((q, i) => Object.entries(q.members).map(([slug, m]) => [fixtureId(i, slug), m.names] as [string, string[]])),
);

// Loads the fixture into the base, as the owner (import_source adds only what's missing), and returns the database's
// time once it's there, the earliest a day can be approved as of.
export async function loadFixtureBase(db: Querier): Promise<string> {
  const items = FIXTURE.flatMap((q) => [
    { id: sourceId(q.key, "root"), name: `${q.key} root`, aliases: [], thing_id: thingId("wikidata", sourceId(q.key, "root")) },
    ...Object.entries(q.members).map(([slug, m]) => ({
      id: sourceId(q.key, slug),
      name: m.names[0],
      aliases: m.names.map((n) => ({ alias: normalize(n), kind: "name" })),
      kind_of: [sourceId(q.key, m.under ?? "root")],
      thing_id: thingId("wikidata", sourceId(q.key, slug)),
    })),
  ]);
  await db.query("select private.import_source('wikidata', 'fixture', $1::jsonb)", [JSON.stringify(items)]);
  for (const q of FIXTURE) {
    await db.query("select private.define_category($1, $2, 'wikidata', $3, null)", [q.key, q.prompt, sourceId(q.key, "root")]);
  }
  const { rows } = await db.query("select now()::text as now");
  return rows[0].now as string;
}

// Takes out of the base what a test imported, so the local base holds only real data once the suites are done (human,
// 2026-10-27: "Suites clean up (Recommended)"; 13f-3b-2): the categories whose keys match keys, then the things of the
// wikidata items whose IDs match ids, with every name, fact and link on them or naming them, and the log rows of the
// import and the categories. A row a test left behind elsewhere (a miss review, an admin's addition) refuses it.
export async function removeTestBase(db: Querier, ids: string, keys: string, snapshot: string): Promise<void> {
  await db.query("delete from private.category where key like $1", [keys]);
  // Its names, facts (on it or naming it), populations, sources and retired IDs go with it: every key from those
  // tables to private.thing cascades. A miss review or a category still naming it doesn't, and refuses the delete.
  await db.query(`delete from private.thing where id in (select thing_id from private.thing_source where source = 'wikidata' and source_id like $1)`, [ids]);
  await db.query(`delete from private.base_log where (action = 'import' and detail ->> 'snapshot' = $1)
    or (action = 'define_category' and detail ->> 'key' like $2)`, [snapshot, keys]);
}

// The fixture's own rows: every source ID and category key starts with "fixture_".
export const removeFixtureBase = (db: Querier) => removeTestBase(db, "fixture\\_%", "fixture\\_%", "fixture");

// The fixture day for a date, as private.approve_puzzle would store it, approved as of approvedAt (approved_at, which
// only SQL reads: src/content/puzzle.ts).
export function fixtureDay(date: string, approvedAt: string): ApprovedPuzzle & { approved_at: string } {
  return {
    format: 3,
    game_id: "offbeat",
    date,
    approved_at: approvedAt,
    questions: FIXTURE.map((q, i): ApprovedQuestion => ({
      prompt: q.prompt,
      category: q.key,
      host_bank: q.bank.map((slug) => fixtureId(i, slug)),
      host_answers: q.host.map((slug) => fixtureId(i, slug)),
      levels: Object.fromEntries([
        ...q.uncommon.map((slug) => [fixtureId(i, slug), "uncommon" as const]),
        ...q.bank.map((slug) => [fixtureId(i, slug), "common" as const]),
      ]),
      ...(q.steals ? { steals: q.steals } : {}),
      root: thingId("wikidata", sourceId(q.key, "root")),
      member_of: null,
      members: Object.keys(q.members).length,
    })),
  };
}

// Whether a day is the fixture's (its categories are the fixture's), so a test never plays someone's real day.
export const isFixtureDay = (p: { questions: { category: string }[] }) => p.questions.every((q, i) => q.category === FIXTURE[i]?.key);

// The fixture day as a drafting session would write it: before approval adds approved_at and each question's root,
// member_of and member count.
export function fixtureDraft(date: string): Puzzle {
  const day = fixtureDay(date, date);
  return {
    format: day.format,
    game_id: day.game_id,
    date: day.date,
    questions: day.questions.map((q) => ({
      prompt: q.prompt,
      category: q.category,
      host_bank: q.host_bank,
      host_answers: q.host_answers,
      levels: q.levels,
      ...(q.steals ? { steals: q.steals } : {}),
    })),
  };
}
