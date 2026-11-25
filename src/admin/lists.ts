// The admin's review of the researched lists (docs/milestones/M23-23b-research-and-review.md, 23b-2): each list as the
// page shows it, and an admin's strike, undo, add or seen mark, through private.list_strike, list_unstrike, list_add,
// list_mark_seen and list_edits. The answers and their marks (tier, brand, borderline) live only in content/lists/, which
// the routes read (next.config.ts traces the folder); the database holds what the admin did to them. The routes check the
// admin first; the functions check again.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseError } from "pg";
import { TYPED_ANSWER_MAX_LENGTH } from "@/config/tunables";
import { formsOf, type ListEdit, type ListSeen } from "@/content/list-edits";
import { LISTS_DIR, parseList, type ListTier, type ResearchList } from "@/content/list";
import { CATEGORY_KEY, normalize } from "@/content/puzzle";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { STATUS } from "@/lib/status";
import { readBank } from "./bank";

// seen: the date the list was looked through, from the database or else the file. answers: its answers now, with the
// edits waiting to be written into the file counted in.
export type ListRow = { category: string; prompt: string; answers: number; borderline: number; brand: number; passes: 0 | 1 | 2; seen: string | null };
// struck: an answer struck and not yet gone from the file; undoUntil is when Undo stops working (the next midnight), or
// null once it has passed. added: an answer an admin added that the file doesn't have yet.
export type AnswerView = { name: string; tier: ListTier; brand: boolean; borderline: boolean; added: boolean; struck: { undoUntil: string | null } | null };
export type ListView = { list: ListRow; answers: AnswerView[] };

export const ACTIONS = ["strike", "unstrike", "add", "seen"] as const;
type Action = (typeof ACTIONS)[number];

// The functions' own admin check (OB007), and an edit that doesn't fit the list (OB012).
function mapError(err: unknown): never {
  if (err instanceof DatabaseError && err.code === "OB007") throw new AppError("admins_only", STATUS.forbidden);
  if (err instanceof DatabaseError && err.code === "OB012") throw new AppError("list_invalid", STATUS.conflict, err.message);
  throw err;
}

// CI validates every list, so one that fails here is a bug: it throws. The path is written out in full, as readDrafts
// does, so the build traces the files (next.config.ts).
function readLists(): ResearchList[] {
  const dir = join(process.cwd(), "content", "lists");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => {
    const { list, errors } = parseList(`${LISTS_DIR}/${f}`, readFileSync(join(dir, f), "utf8"), null);
    if (!list) throw new Error(`content/${LISTS_DIR}/${f} is invalid:\n${errors.join("\n")}`);
    return list;
  });
}

type Doing = { edits: (ListEdit & { undoUntil: string | null })[]; seen: { category: string; on: string }[] };

// What the admin has done that no load has marked folded. A strike can be undone until the midnight after it was made,
// which the database counts (private.day_of, private.next_reset); a list was seen on its day there too.
async function doing(db: Db, adminId: string): Promise<Doing> {
  try {
    const { rows } = await db.query<{ review: { edits: (ListEdit & { at: string })[]; seen: ListSeen[] } }>("select private.list_edits($1) as review", [adminId]);
    const { edits, seen } = rows[0].review;
    const { rows: day } = await db.query<{ today: string; ends: string; days: string[] }>(
      `select private.today()::text as today, private.next_reset() as ends,
        array(select private.day_of(t)::text from unnest($1::timestamptz[]) with ordinality as u(t, n) order by n) as days`,
      [[...edits, ...seen].map((e) => e.at)],
    );
    const { today, ends, days } = day[0];
    return {
      edits: edits.map((e, i) => ({ category: e.category, name: e.name, kind: e.kind, undoUntil: e.kind === "strike" && days[i] === today ? new Date(ends).toISOString() : null })),
      seen: seen.map((s, i) => ({ category: s.category, on: days[edits.length + i] })),
    };
  } catch (err) {
    mapError(err);
  }
}

// A list's answers with the admin's edits in. A struck answer is the one that bears the struck typed form; an add the
// file already holds is the file's line now.
function answersOf(list: ResearchList, edits: Doing["edits"]): AnswerView[] {
  const struck = edits.filter((e) => e.kind === "strike");
  const rows = list.answers.map((a): AnswerView => {
    const hit = struck.find((e) => formsOf(a).includes(normalize(e.name)));
    return { name: a.name, tier: a.tier, brand: a.brand === true, borderline: a.borderline === true, added: false, struck: hit ? { undoUntil: hit.undoUntil } : null };
  });
  const added = edits
    .filter((e) => e.kind === "add" && !list.answers.some((a) => formsOf(a).includes(normalize(e.name))))
    .map((e): AnswerView => ({ name: e.name, tier: "rare", brand: false, borderline: false, added: true, struck: null }));
  return [...rows, ...added];
}

function rowOf(list: ResearchList, answers: AnswerView[], prompts: Map<string, string>, seen: Doing["seen"]): ListRow {
  const standing = answers.filter((a) => !a.struck);
  const done = seen.find((s) => s.category === list.category)?.on ?? list.borderline_seen;
  return {
    category: list.category,
    prompt: prompts.get(list.category) ?? list.category.replaceAll("_", " "),
    answers: standing.length,
    borderline: standing.filter((a) => a.borderline).length,
    brand: standing.filter((a) => a.brand).length,
    passes: list.passes,
    seen: done,
  };
}

const promptsOf = () => new Map(readBank().questions.map((q) => [q.category, q.prompt]));

export async function listRows(db: Db, adminId: string): Promise<ListRow[]> {
  const { edits, seen } = await doing(db, adminId);
  const prompts = promptsOf();
  return readLists().map((list) => rowOf(list, answersOf(list, edits.filter((e) => e.category === list.category)), prompts, seen));
}

// The category is user input: one of the lists' files.
export async function listView(db: Db, adminId: string, category: string): Promise<ListView> {
  const { edits, seen } = await doing(db, adminId);
  const list = readLists().find((l) => l.category === category);
  if (!list) throw new AppError("bad_request", STATUS.badRequest, "category");
  const answers = answersOf(list, edits.filter((e) => e.category === category));
  return { list: rowOf(list, answers, promptsOf(), seen), answers };
}

// The request body is user input: one of ACTIONS, a category, and for the three that name an answer, its name. A typed
// form is what the database keeps, and an added name can be no longer than a player can type.
export async function edit(db: Db, adminId: string, body: Record<string, unknown>): Promise<void> {
  const { action, category, name } = body;
  if (typeof action !== "string" || !(ACTIONS as readonly string[]).includes(action)) throw new AppError("bad_request", STATUS.badRequest, "action");
  if (typeof category !== "string" || !CATEGORY_KEY.test(category)) throw new AppError("bad_request", STATUS.badRequest, "category");
  const named = action !== "seen";
  if (named ? typeof name !== "string" || name.includes("\0") || normalize(name) === "" : name !== undefined) throw new AppError("bad_request", STATUS.badRequest, "name");
  const typed = typeof name === "string" ? name.trim() : "";
  if (action === "add" && typed.length > TYPED_ANSWER_MAX_LENGTH) throw new AppError("bad_request", STATUS.badRequest, "name");
  const call: Record<Action, [string, unknown[]]> = {
    strike: ["private.list_strike($1, $2, $3)", [adminId, category, normalize(typed)]],
    unstrike: ["private.list_unstrike($1, $2, $3)", [adminId, category, normalize(typed)]],
    add: ["private.list_add($1, $2, $3, $4)", [adminId, category, typed, normalize(typed)]],
    seen: ["private.list_mark_seen($1, $2)", [adminId, category]],
  };
  const [sql, params] = call[action as Action];
  try {
    await db.query(`select ${sql}`, params);
  } catch (err) {
    mapError(err);
  }
}
