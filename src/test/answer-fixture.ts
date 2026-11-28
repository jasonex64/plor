// The tests' answer database and day on a clock (docs/milestones/M13-13a-the-base.md): seven small categories loaded
// into the base through private.import_source, with the IDs every import computes (src/content/thing-id.ts), and a day
// that asks the first three. Shared by the database tests (src/test/puzzles.ts) and the e2e tests (e2e/puzzle.ts), so it takes the
// database client it's given. Its categories and source IDs start with "fixture", apart from any real data.
import type { ClockPuzzle, Level } from "../content/puzzle.ts";
import { normalize } from "../content/puzzle.ts";
import { thingId } from "../content/thing-id.ts";
import { RARE_PER_CLOCK_QUESTION } from "../config/tunables.ts";

type Querier = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

// A member: its names (the first is its main name), and the member it sits under, if not the root.
type Member = { names: string[]; under?: string };
// common is the common level and uncommon the uncommon one; every other member is rare.
type FixtureQuestion = { key: string; prompt: string; common: string[]; uncommon: string[]; members: Record<string, Member> };

const FIXTURE: FixtureQuestion[] = [
  {
    key: "fixture_animal",
    prompt: "Name an animal",
    common: ["bear", "dog"],
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
    common: ["apple", "banana"],
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
    common: ["red", "blue"],
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
    common: ["italy", "kenya"],
    uncommon: ["mali", "togo"],
    members: {
      italy: { names: ["Italy"] },
      kenya: { names: ["Kenya"] },
      // A second name with none of the letters taken by question 4 (C, P), under a shown name that holds one: the
      // name can't be given (docs/milestones/M15-15h-taken-letters-follow-the-name.md).
      france: { names: ["France", "Gaul"] },
      spain: { names: ["Spain"] },
      japan: { names: ["Japan"] },
      mali: { names: ["Mali"] },
      togo: { names: ["Togo"] },
    },
  },
  {
    key: "fixture_metal",
    prompt: "Name a metal",
    common: ["gold", "tin"],
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
    common: ["golf", "tennis"],
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
    common: ["hand", "head", "leg"],
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

// Rare answers the clock day's fruit and color questions need beyond their members, which hold only one rare answer each
// (a day carries six per question: docs/milestones/M23-23d-the-screens.md, answer 49); the animals' lose the second "aardvark",
// whose main name is the first's, which the result would show as the same answer twice. They are things of the base that
// belong to no category, so the categories' member counts are unchanged.
const CLOCK_EXTRA_RARE: Record<number, string[]> = { 0: ["lynx"], 1: ["plum", "peach", "pear", "grape", "lime"], 2: ["white", "pink", "orange", "purple", "brown"] };
const clockExtraSlug = (name: string) => `clock-${name}`;
export const fixtureId = (index: number, slug: string) => thingId("wikidata", sourceId(FIXTURE[index].key, slug));

// Every thing's main name, by ID.
export const FIXTURE_NAMES = new Map<string, string>(
  FIXTURE.flatMap((q, i) => Object.entries(q.members).map(([slug, m]) => [fixtureId(i, slug), m.names[0]] as [string, string])),
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
  const extras = Object.entries(CLOCK_EXTRA_RARE).flatMap(([i, names]) =>
    names.map((name) => ({
      id: sourceId(FIXTURE[+i].key, clockExtraSlug(name)),
      name,
      aliases: [{ alias: normalize(name), kind: "name" }],
      thing_id: thingId("wikidata", sourceId(FIXTURE[+i].key, clockExtraSlug(name))),
    })),
  );
  await db.query("select private.import_source('wikidata', 'fixture', $1::jsonb)", [JSON.stringify([...items, ...extras])]);
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

// A fixture question's levels, as a day on a clock holds them: the common and uncommon members by ID.
const fixtureLevels = (index: number): Record<string, Level> =>
  Object.fromEntries([
    ...FIXTURE[index].uncommon.map((slug) => [fixtureId(index, slug), "uncommon" as const]),
    ...FIXTURE[index].common.map((slug) => [fixtureId(index, slug), "common" as const]),
  ]);

// Whether a day is the fixture's (its categories are the fixture's), so a test never plays someone's real day.
export const isFixtureDay = (p: { questions: { category: string }[] }) => p.questions.every((q, i) => q.category === FIXTURE[i]?.key);

// The first three questions of the fixture as a day on a clock (format 4; docs/milestones/M23-23c-the-run-on-a-clock.md): every
// member of the three categories can be typed, and its tier is the fixture's.
export function fixtureClockDay(date: string, approvedAt: string): ClockPuzzle & { approved_at: string } {
  return {
    format: 4,
    game_id: "offbeat",
    date,
    approved_at: approvedAt,
    questions: FIXTURE.slice(0, 3).map((q, i) => {
      const levels = fixtureLevels(i);
      const extra = CLOCK_EXTRA_RARE[i] ?? [];
      const rare = [
        ...Object.entries(FIXTURE[i].members)
          .filter(([slug, m], n, all) => !(fixtureId(i, slug) in levels) && all.findIndex(([, other]) => other.names[0] === m.names[0]) === n)
          .map(([slug]) => fixtureId(i, slug)),
        ...extra.map((name) => fixtureId(i, clockExtraSlug(name))),
      ].slice(0, RARE_PER_CLOCK_QUESTION);
      return { prompt: q.prompt, category: q.key, root: thingId("wikidata", sourceId(q.key, "root")), member_of: null, levels, rare, size: Object.keys(q.members).length + extra.length };
    }),
  };
}
