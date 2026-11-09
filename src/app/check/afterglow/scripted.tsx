"use client";

// The check's run (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-2, answer 44): the real Afterglow scene, its
// replies scripted from the mock's sample day (RIFF-mocks `themes/core/game-mock.js` at fcc11e4), so the check needs no
// database and its clock can run fast. The scene gets the check's probe, and only here (answer 45).
// ?q=N starts at question N, the earlier ones answered with the mock's scripted run: the game has no skip link and no
// New show, so a line that skipped ahead or played again opens the page where it needs to be (answer 46).
import { useRef, useState } from "react";
import { Afterglow } from "@/afterglow/afterglow";
import type { Io, Reply, Start } from "@/afterglow/scene";
import { QUESTIONS_PER_DAY } from "@/config/tunables";
import { DAY, RUN, TAKEN_AT, asked, judge, takenBy } from "./day";

function startAt(): Start {
  const raw = new URLSearchParams(location.search).get("q") ?? "1", q = Number(raw);
  if (!Number.isInteger(q) || q < 1 || q > QUESTIONS_PER_DAY) throw new Error(`?q must be a question, 1 to ${QUESTIONS_PER_DAY}: ${raw}`);
  const results = RUN.slice(0, q - 1).map((word, i) => judge(i + 1, word)!);
  return { total: QUESTIONS_PER_DAY, msQuestion: 20_000, results, at: { kind: "ask", asked: asked(q) } };
}

export function Scripted() {
  const [fault, setFault] = useState<string | null>(null);
  // The question in play, as the database would hold it.
  const at = useRef(0);
  const io: Io = {
    async answer(text) {
      const r = judge(at.current, text);
      if (!r) return { kind: "offList" } satisfies Reply;
      const over = r.caught || at.current === QUESTIONS_PER_DAY;
      const next = over ? null : { steals: TAKEN_AT[at.current + 1] ?? null, stolen: takenBy(at.current + 1) };
      return { kind: "listed", result: r, hostSaid: DAY[at.current - 1].host, next, over };
    },
    async next() { at.current++; return asked(at.current); },
    async timeUp() { return "over"; },
    seeResults() { document.body.dataset.left = "results"; },
    leave() { document.body.dataset.left = "out"; },
    fault(err) { console.error(err); setFault(String(err)); },
  };
  return (
    <Afterglow
      start={() => { const s = startAt(); at.current = s.results.length + 1; return s; }}
      io={io}
      out="Leave the check"
      notices={fault && <p role="alert">{fault}</p>}
      probe={{ attach: (core) => { (window as unknown as { __core: object }).__core = core; } }}
    />
  );
}
