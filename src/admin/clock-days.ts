// The admin's side of a day on a clock (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1): the day built from the
// researched lists for the picks the approval page holds, shown as the page shows it, and approved. Everything the page shows of a
// list comes from here, built by the one function the draft uses (src/content/clock-day.ts); the page never works from a list it
// holds itself. The routes check the admin first; private.build_puzzle checks again.
import { approvedDays, buildChecked, pickLists, rankLists, whenText, type ClockPick, type ClockSource, type UseDay } from "@/content/clock-day";
import { CATEGORY_KEY, type ClockDraft } from "@/content/puzzle";
import { QUESTIONS_PER_CLOCK_DAY } from "@/config/tunables";
import { shownName, thingNames } from "@/game/payload";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { STATUS } from "@/lib/status";
import { promptsOf, readLists, readReview } from "./lists";

// A question as the page shows it: its wording, its list's answers by tier (rare is the rest of the list's count) and the six rare
// examples, named.
export type ClockQuestionView = { category: string; prompt: string; common: number; uncommon: number; rare: number; examples: string[] };
// Every list, longest unused first, for the swap menu: its wording and when it last appeared (answer 55).
export type ClockMenuItem = { category: string; prompt: string; when: string };
// A day as built for some picks: the picks themselves, so the page can send them back with a change.
export type ClockDayView = { picks: ClockPick[]; questions: ClockQuestionView[]; menu: ClockMenuItem[] };
// What the page lists for a day on a clock: the draft as it would be approved now, and the day approved.
export type ClockSides = { draft: ClockDayView | null; live: ClockQuestionView[] | null };

// What a day is built from, and the days already asked, read once for a request.
export type ClockContext = { source: ClockSource; used: UseDay[] };

export async function clockContext(db: Db, adminId: string, drafts: Map<string, ClockDraft>): Promise<ClockContext> {
  const source: ClockSource = { lists: readLists(), edits: (await readReview(db, adminId)).edits, prompts: promptsOf() };
  // Every day asked so far, approved or drafted, for when each list last appeared.
  return { source, used: [...(await approvedDays(db)), ...drafts.values()] };
}

function questionView(q: { prompt: string; category: string; levels: Record<string, string>; size: number }, examples: string[]): ClockQuestionView {
  const tiers = Object.values(q.levels);
  const common = tiers.filter((t) => t === "common").length;
  const uncommon = tiers.length - common;
  return { category: q.category, prompt: q.prompt, common, uncommon, rare: q.size - common - uncommon, examples };
}

function menuOf(date: string, source: ClockSource, used: UseDay[]): ClockMenuItem[] {
  return rankLists(date, source.lists.map((l) => l.category), used).map((r) => ({ category: r.category, prompt: source.prompts.get(r.category) ?? r.category, when: whenText(date, r.last) }));
}

function viewOf(date: string, picks: ClockPick[], { source, used }: ClockContext): ClockDayView | { problems: string[] } {
  const result = buildChecked(date, picks, source);
  if ("problems" in result) return result;
  const { day, examples } = result.built;
  return { picks, questions: day.questions.map((q, i) => questionView(q, examples[i].map(shownName))), menu: menuOf(date, source, used) };
}

// The picks a drafted file stands for: its lists in order, a wording of its own where it differs from the bank's, and no re-rolls.
export function picksOfDraft(draft: ClockDraft, source: ClockSource): ClockPick[] {
  return draft.questions.map((q) => ({ category: q.category, ...(q.prompt === source.prompts.get(q.category) ? {} : { wording: q.prompt }), reroll: 0 }));
}

// The day to show for these picks (the page's change), or its problems.
export const previewDay = viewOf;

// A fresh day (Redraft): the lists the draft would pick, leaving out the ones the page has shown so far, so each Redraft is
// another three. Refused when fewer than three lists are left.
export function redraftDay(date: string, skip: string[], context: ClockContext): ClockDayView | { problems: string[] } {
  const lists = pickLists(date, context.source.lists.map((l) => l.category), context.used, skip);
  if (lists.length < QUESTIONS_PER_CLOCK_DAY) throw new AppError("no_lists_left", STATUS.conflict);
  return viewOf(date, lists.map((l) => ({ category: l.category, reroll: 0 })), context);
}

// The listing's view of a drafted day on a clock, built again now from its file's picks.
export function draftSide(draft: ClockDraft, context: ClockContext): ClockDayView {
  const view = viewOf(draft.date, picksOfDraft(draft, context.source), context);
  // A drafted file CI validated that the lists no longer build (a list struck below six rare answers) is a bug to see, not a day to hide.
  if ("problems" in view) throw new Error(`drafted day ${draft.date} no longer builds: ${view.problems.join("; ")}`);
  return view;
}

// An approved day on a clock as the page shows it: the counts its levels and size give, and the names of the six it holds.
export async function liveSide(db: Db, day: ClockDraft): Promise<ClockQuestionView[]> {
  const names = await thingNames(db, day.questions.flatMap((q) => q.rare));
  return day.questions.map((q) => questionView(q, q.rare.map((id) => names.get(id) ?? id)));
}

// The request's picks are user input: three objects with a category key, an optional wording and a count of re-rolls.
export function readPicks(v: unknown): ClockPick[] {
  if (!Array.isArray(v) || v.length !== QUESTIONS_PER_CLOCK_DAY) throw new AppError("bad_request", STATUS.badRequest, "questions");
  return v.map((p) => {
    if (typeof p !== "object" || p === null || Array.isArray(p)) throw new AppError("bad_request", STATUS.badRequest, "questions");
    const { category, wording, reroll } = p as Record<string, unknown>;
    if (typeof category !== "string" || !CATEGORY_KEY.test(category)) throw new AppError("bad_request", STATUS.badRequest, "category");
    if (wording !== undefined && typeof wording !== "string") throw new AppError("bad_request", STATUS.badRequest, "wording");
    if (!Number.isSafeInteger(reroll) || (reroll as number) < 0) throw new AppError("bad_request", STATUS.badRequest, "reroll");
    return { category, ...(wording === undefined ? {} : { wording: wording.trim() }), reroll: reroll as number };
  });
}
