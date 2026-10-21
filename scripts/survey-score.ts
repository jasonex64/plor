// Scores the emailed survey (docs/milestones/M02-2g-survey.md) the way the game scores play:
// `npm run survey:score -- <responses.csv>`. Each typed answer becomes an entry the way the game reads typed text
// (resolveTyped: an exact name or alias, else one typo; docs/milestones/M13-game-mechanics.md); then matchAnswer
// decides whether the host caught it and buildInsights builds the same per-question report as the insights page
// (M03). Text that names no entry is listed for the human to judge.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parsePuzzle, type Puzzle } from "../src/content/puzzle.ts";
import { matchAnswer, resolveTyped } from "../src/game/matching.ts";
import { buildInsights, type AnswerRow, type DayInsights, type MissRow } from "../src/insights/report.ts";

// The puzzle each survey set asked, as in docs/survey/message.md (ticket D4).
export const SET_DATES: Record<string, string> = { "1": "2026-10-26", "2": "2026-10-27", "3": "2026-10-28" };
const HEADER = ["person", "set", "q1", "q2", "q3", "q4", "q5", "q6", "q7"];

export type Response = { person: string; set: string; answers: string[] };
export type Unmatched = { question: number; typed: string };

// RFC 4180 rows: commas inside double quotes, "" for a quote. Line ends may be \r\n or \n.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("the CSV ends inside a quoted field");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// The sheet's own layout (docs/survey/responses-template.csv). Google Sheets exports empty columns past q7; they
// are allowed only while every cell in them is blank, so nothing typed there is dropped silently.
export function readResponses(text: string): Response[] {
  const [header, ...rows] = parseCsv(text);
  if (!header || HEADER.some((name, i) => header[i]?.trim() !== name)) {
    throw new Error(`the header must start with ${HEADER.join(",")}; got ${header?.join(",")}`);
  }
  return rows
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells, i) => {
      const line = i + 2;
      const extra = cells.slice(HEADER.length).find((c) => c.trim() !== "");
      if (extra !== undefined) throw new Error(`line ${line}: "${extra}" is past q7`);
      const [person, set, ...answers] = cells.slice(0, HEADER.length).map((c) => c.trim());
      if (!/^\d+$/.test(person)) throw new Error(`line ${line}: person must be a number, got "${person}"`);
      if (!(set in SET_DATES)) throw new Error(`line ${line}: set must be one of ${Object.keys(SET_DATES).join(", ")}, got "${set}"`);
      return { person, set, answers };
    });
}

// One day's report from the responses to its set: text that names an entry becomes an answer, the rest a miss.
export function scoreSet(date: string, puzzle: Puzzle, responses: Response[]): { insights: DayInsights; unmatched: Unmatched[] } {
  const answers: AnswerRow[] = [];
  const misses: MissRow[] = [];
  const unmatched: Unmatched[] = [];
  for (const response of responses) {
    puzzle.questions.forEach((question, index) => {
      const typed = response.answers[index] ?? "";
      if (typed === "") return;
      // The survey asked without stolen letters, so none apply.
      const entryId = resolveTyped(question, typed, []);
      if (entryId) {
        answers.push({ question_idx: index, entry_id: entryId, matched: matchAnswer(question, entryId) === "matched" });
        return;
      }
      misses.push({ question_idx: index, typed });
      unmatched.push({ question: index + 1, typed });
    });
  }
  return { insights: buildInsights(date, true, puzzle, answers, misses), unmatched };
}

const percent = (share: number | null) => (share === null ? "—" : `${Math.round(share * 100)}%`);

function main() {
  const path = process.argv[2];
  if (!path) throw new Error("usage: npm run survey:score -- <responses.csv>");
  const responses = readResponses(readFileSync(path, "utf8"));
  for (const [set, date] of Object.entries(SET_DATES)) {
    const file = `offbeat/${date}.json`;
    const { puzzle, errors } = parsePuzzle(file, readFileSync(`content/${file}`, "utf8"));
    if (!puzzle) throw new Error(errors.join("\n"));
    const people = responses.filter((r) => r.set === set);
    const { insights, unmatched } = scoreSet(date, puzzle, people);
    console.log(`\nSET ${set} = ${date}: ${people.length} people`);
    for (const q of insights.questions) {
      const top = q.topAnswers.map((t) => `${t.answer.name} ${t.count}`).join(", ");
      console.log(
        `Q${q.index + 1} ${q.prompt} | host ${q.hostAnswers.map((h) => h.name).join(", ")} | caught ${q.caught}/${q.answered} ` +
          `(${percent(q.catchRate)})${q.tooFew ? " too few" : ""}${q.breaksShape ? " BREAKS SHAPE" : ""} | in host bank ${percent(q.hostBankShare)} | ${top}`,
      );
    }
    for (const u of unmatched) {
      console.log(`  not in list: Q${u.question} "${u.typed}"`);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
