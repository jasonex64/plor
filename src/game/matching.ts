// Typed answers and the host (DECISIONS.md: Answer model; docs/milestones/M13-13a-the-base.md, "13a-2 and 13a-3").
// The player types free text and the server alone turns it into a thing of the question's category, as the answer
// database stood when the day was approved (private.resolve_answer). The only runtime rule is the deterministic
// one-typo auto-correct (human, 2026-10-21; M04 "Rules to build", rule 2).
import { avoids, normalize, type ApprovedPuzzle, type Level } from "../content/puzzle.ts";
import { TYPO_MAX_EDITS, TYPO_MIN_LETTERS } from "../config/tunables.ts";
import type { Db } from "../lib/db.ts";

// A member some typed text can name: the alias it bears, whether the host catches it, and its ancestors.
export type Candidate = { alias: string; thing_id: string; caught: boolean; ancestors: string[] };
export type Resolved = { thingId: string; caught: boolean };

// The characters a typo edit may insert or substitute: plain letters, digits and space, plus whatever the player
// typed. A normalized alias can hold others ("ø", "&"), which a typo reaches only if the player typed them
// (ROADMAP Next revision, 13a-2 review).
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789 ";

// Every text one edit from `text`: a letter missing, extra or wrong, or two neighbours swapped (optimal string
// alignment, as the typo rule always counted), normalized as aliases are.
export function oneEditAway(text: string): string[] {
  const letters = [...new Set([...ALPHABET, ...text])];
  const out = new Set<string>();
  for (let i = 0; i <= text.length; i++) {
    for (const c of letters) out.add(text.slice(0, i) + c + text.slice(i));
    if (i === text.length) continue;
    out.add(text.slice(0, i) + text.slice(i + 1));
    for (const c of letters) out.add(text.slice(0, i) + c + text.slice(i + 1));
    if (i + 1 < text.length) out.add(text.slice(0, i) + text[i + 1] + text[i] + text.slice(i + 2));
  }
  out.delete(text);
  return [...new Set([...out].map(normalize))].filter((t) => t && t !== text);
}

// Every text within TYPO_MAX_EDITS edits of `text`. The audit uses it too, to name a near-typo's near answers
// (src/admin/audit.ts).
export function withinTypo(text: string): string[] {
  let frontier = [text];
  const all = new Set<string>();
  for (let edit = 0; edit < TYPO_MAX_EDITS; edit++) {
    frontier = frontier.flatMap(oneEditAway).filter((t) => !all.has(t));
    for (const t of frontier) all.add(t);
  }
  all.delete(text);
  return [...all];
}

const RANK: Record<Level | "rare", number> = { common: 0, uncommon: 1, rare: 2 };

// The one answer some candidates of the same alias are. A host who catches any meaning of the name catches it (human,
// 2026-10-24: "Caught if any meaning is"); a name on one line of the tree is its highest member, which covers the rest;
// then the drafting session's level, then the smallest ID, so counts and the bonus always agree.
export function pickAnswer(candidates: Candidate[], levels: Record<string, Level>): Resolved | null {
  if (candidates.length === 0) return null;
  const caught = candidates.some((c) => c.caught);
  const pool = caught ? candidates.filter((c) => c.caught) : candidates;
  const ids = new Set(pool.map((c) => c.thing_id));
  const tops = pool.filter((c) => !c.ancestors.some((a) => a !== c.thing_id && ids.has(a)));
  const [best] = tops.sort(
    (a, b) => RANK[levels[a.thing_id] ?? "rare"] - RANK[levels[b.thing_id] ?? "rare"] || a.thing_id.localeCompare(b.thing_id),
  );
  return { thingId: best.thing_id, caught };
}

// How many separate answers some candidates are: names of one thing are one answer, and so is one name several things
// share (pickAnswer makes it one), so candidates linked by a thing or a name count once.
export function answersAmong(candidates: Candidate[]): number {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  for (const c of candidates) parent.set(find(`thing:${c.thing_id}`), find(`alias:${c.alias}`));
  return new Set(candidates.map((c) => find(`thing:${c.thing_id}`))).size;
}

// Where a question's members are looked up for some texts: a published day's through private.resolve_answer, or a
// draft's, which a test run plays as if approved now, through private.resolve_draft_answer, admins only
// (docs/milestones/M14-14b-11-test-runs.md). Both share one matching in SQL, private.resolve_in.
export type Lookup = (index: number, texts: string[]) => Promise<Candidate[]>;

const COLUMNS = "alias, thing_id::text, caught, ancestors::text[]";

export function dayLookup(db: Db, puzzle: ApprovedPuzzle): Lookup {
  return async (index, texts) =>
    (await db.query<Candidate>(`select ${COLUMNS} from private.resolve_answer($1, $2::date, $3, $4)`, [puzzle.game_id, puzzle.date, index, texts])).rows;
}

export function draftLookup(db: Db, userId: string, puzzle: ApprovedPuzzle): Lookup {
  return async (index, texts) =>
    (await db.query<Candidate>(`select ${COLUMNS} from private.resolve_draft_answer($1, $2, $3)`, [userId, puzzle.questions[index], texts])).rows;
}

// Whether text that named no answer is within a typo of a member of the question's category, whatever its length and
// past any stolen letter. Such a miss is a typo, never a new answer: it waits in the audit (M13 13b; human, 2026-10-24:
// "Audit only (Recommended)").
export async function isNearTypo(lookup: Lookup, index: number, typed: string): Promise<boolean> {
  const query = normalize(typed);
  if (!query) return false;
  return (await lookup(index, withinTypo(query))).length > 0;
}

// The answer the typed text names, or null when it names none ("not in our list, try again"). The caller has
// already refused text with a stolen letter. An exact name or alias wins before any typo, so "moose" is never read as
// a typo of "mouse". A typo counts only for text of 4+ letters (spaces and digits aren't letters: M02 2f B4; ROADMAP
// Next revision, M13), only onto a name
// that avoids every stolen letter (G12: "hors" is not horse once E is gone), and only when exactly one answer is that
// close (answersAmong): when two are, the server would be guessing which one the player meant.
export async function resolveTyped(lookup: Lookup, puzzle: ApprovedPuzzle, index: number, typed: string, stolen: string[]): Promise<Resolved | null> {
  const query = normalize(typed);
  if (!query) return null;
  const levels = puzzle.questions[index].levels;
  const exact = await lookup(index, [query]);
  if (exact.length) return pickAnswer(exact, levels);
  if (query.replace(/[^\p{L}]/gu, "").length < TYPO_MIN_LETTERS) return null;
  const near = (await lookup(index, withinTypo(query))).filter((c) => avoids(c.alias, stolen));
  return answersAmong(near) === 1 ? pickAnswer(near, levels) : null;
}
