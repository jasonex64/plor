// The share text must never spoil the day (docs/milestones/M05-share.md): no prompt, no player answer, no host
// answer. It shows the date and the rounds survived, whichever way the run ended (S1, S2).
import { describe, expect, it } from "vitest";
import type { AnsweredQuestion, RunState } from "./runs";
import { GAME } from "@/platform/game";
import { shareText } from "./share";

const PROMPTS = ["Name an animal", "Name a fruit", "Name a color", "Name a city", "Name a sport", "Name a tool", "Name a planet"];

// How a stop went: climbed with an answer that earned a rarity bonus, climbed with none, or caught there.
type Outcome = "rare" | "common" | "caught";

function answered(index: number, outcome: Outcome): AnsweredQuestion {
  return {
    index,
    prompt: PROMPTS[index],
    answer: { id: `you${index}`, name: `youranswer${index}` },
    matched: outcome === "caught",
    hostAnswers: [{ id: `host${index}`, name: `hostanswer${index}` }],
    points: 0,
    bonus: outcome === "rare" ? 5 : 0,
    share: null,
    inDay: true,
  };
}

function finished(status: RunState["status"], outcomes: Outcome[]): RunState {
  return {
    date: "2026-10-21",
    status,
    total: 7,
    answered: outcomes.map((outcome, i) => answered(i, outcome)),
    question: null,
    msLeft: null,
    next: null,
    points: 0,
    bonus: 0,
    msToReset: 0,
  };
}

// The share line's symbols (docs/milestones/M14-14c-1-name-and-words.md, criterion 4; the human's previews, rounds 6
// and 10).
describe("shareText", () => {
  it("marks each stop of a climb to the top rare or common", () => {
    expect(shareText(finished("survived", ["rare", "common", "rare", "common", "common", "rare", "common"]))).toBe(
      `${GAME.name} · Oct 21\n🟪🟩🟪🟩🟩🟪🟩 7/7`,
    );
  });

  it("shows a gust where the Wind caught the player, and the stops not reached", () => {
    expect(shareText(finished("died", ["rare", "common", "rare", "caught"]))).toBe(`${GAME.name} · Oct 21\n🟪🟩🟪💨⬜⬜⬜ 3/7`);
  });

  it("shows the frost where time ran out, on the stop after the last answer", () => {
    expect(shareText(finished("timed_out", ["rare", "common"]))).toBe(`${GAME.name} · Oct 21\n🟪🟩❄️⬜⬜⬜⬜ 2/7`);
  });

  it("shows a gust on stop 1 for a catch there", () => {
    expect(shareText(finished("died", ["caught"]))).toBe(`${GAME.name} · Oct 21\n💨⬜⬜⬜⬜⬜⬜ 0/7`);
  });

  it("holds no prompt, player answer or host answer from the run", () => {
    const run = finished("died", ["rare", "common", "common", "rare", "common", "common", "caught"]);
    const text = shareText(run);
    for (const a of run.answered) {
      for (const spoiler of [a.prompt, a.answer.name, ...a.hostAnswers.map((h) => h.name)]) {
        expect(text).not.toContain(spoiler);
      }
    }
  });
});
