// What the client may see of a thing: its main name, as every screen shows it (DECISIONS.md: Game 1, "Server is
// authoritative"; Answer model).
import type { Db } from "@/lib/db";

export type Named = { id: string; name: string };
export type Names = Map<string, string>;

// A thing's name as every screen shows it: in lowercase, whatever the source's capitals (human, 2026-10-27: "every
// single thing should be displayed as al lowercase but how u store it is up to u"). The game's names come through
// thingNames; the admin pages' own readers (src/admin/base.ts) use it too.
export const shownName = (name: string): string => name.toLowerCase();

// The main names of these things, from the answer database (private.thing_names), as shown.
export async function thingNames(db: Db, ids: string[]): Promise<Names> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { rows } = await db.query<{ id: string; name: string }>("select id::text, name from private.thing_names($1::uuid[])", [unique]);
  return new Map(rows.map((r) => [r.id, shownName(r.name)]));
}

export function named(names: Names, id: string): Named {
  const name = names.get(id);
  // Stored answers were checked against the base when they were written, and things are never deleted.
  if (name === undefined) throw new Error(`thing ${id} has no name`);
  return { id, name };
}
