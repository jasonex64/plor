"use client";

// The check's run (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-2, answer 44): the real Afterglow scene, its
// replies scripted from the mock's sample day (RIFF-mocks `themes/core/game-mock.js` at fcc11e4), so the check needs no
// database and its clock can run fast. The scene gets the check's probe, and only here (answer 45).
// ?q=N starts at question N, the earlier ones answered with the mock's scripted run: the game has no skip link and no
// New show, so a line that skipped ahead or played again opens the page where it needs to be (answer 46).
import { useRef, useState } from "react";
import { Afterglow } from "@/afterglow/afterglow";
import type { Asked, Io, Reply, Result, Start } from "@/afterglow/scene";
import { POINTS_PER_QUESTION, QUESTIONS_PER_DAY, RARITY_BONUS_FRACTION, RARITY_ZERO_SHARE } from "@/config/tunables";
import { normalize } from "@/content/puzzle";

// The mock's sample questions, host's picks and answer shares, with two answers it judged without listing them:
// "sydney harbour bridge" at Q1 (the mock's unlisted share, .01) and "sonic" at Q7 (which check.mjs added at .3). Every
// other text names no answer, as a typo does in the game.
const DAY = [
  { text: "Name something you take to the beach.", host: ["towel"],
    shares: { towel: .30, sunscreen: .22, umbrella: .12, sunglasses: .08, chair: .05, bucket: .04, book: .04, cooler: .03, frisbee: .02, kite: .01, snorkel: .01, "sydney harbour bridge": .01 } },
  { text: "Name a fruit that's yellow.", host: ["banana"],
    shares: { banana: .40, lemon: .25, pineapple: .10, mango: .06, pear: .03, grapefruit: .02, papaya: .02, starfruit: .01, quince: .005 } },
  { text: "Name a board game.", host: ["monopoly"],
    shares: { monopoly: .35, chess: .15, scrabble: .12, clue: .07, catan: .06, risk: .05, checkers: .05, sorry: .03, battleship: .03, othello: .01, go: .01 } },
  { text: "Name something with wheels.", host: ["car"],
    shares: { car: .40, bike: .20, bicycle: .05, bus: .08, truck: .07, skateboard: .05, train: .04, wheelchair: .02, tractor: .02, stroller: .02, wagon: .02, suitcase: .01, "office chair": .01 } },
  { text: "Name a famous bridge.", host: ["golden gate", "london bridge"],
    shares: { "golden gate": .35, "london bridge": .20, "brooklyn bridge": .12, "tower bridge": .10, "sydney harbour bridge": .05, rialto: .02, "ponte vecchio": .02, "charles bridge": .01, "millau viaduct": .005 } },
  { text: "Name a word that rhymes with cat.", host: ["hat", "bat"],
    shares: { hat: .25, bat: .20, mat: .10, rat: .10, sat: .06, fat: .05, pat: .04, chat: .02, flat: .02, splat: .01, acrobat: .005, cravat: .002 } },
  { text: "Name a superhero who can fly.", host: ["superman", "iron man", "thor"],
    shares: { superman: .30, "iron man": .15, thor: .10, "wonder woman": .08, "captain marvel": .06, storm: .03, "green lantern": .03, falcon: .02, vision: .02, "silver surfer": .01, starfire: .01, hawkman: .005, sonic: .3 } },
] as { text: string; host: string[]; shares: Record<string, number> }[];
// The mock's letters, at LETTER_SCHEDULE's questions (Q2, Q4, Q5, Q7).
const TAKEN_AT: Record<number, string> = { 2: "p", 4: "b", 5: "r", 7: "e" };
// The mock's tier line between uncommon and rare (game-mock.js, "mock-only ... proposed for review").
const RARE_BELOW = 0.05;
// check.mjs's scripted run, which answers the questions before ?q.
const RUN = ["sunscreen", "lemon", "chess", "truck", "millau viaduct", "mat", "hawkman"];

const takenBy = (q: number) => Object.keys(TAKEN_AT).map(Number).filter((k) => k <= q).map((k) => TAKEN_AT[k]);
const asked = (q: number): Asked => ({ prompt: DAY[q - 1].text, stolen: takenBy(q), msLeft: 20_000 });
// The mock's judge (game-mock.js): the host's answer is caught; a listed one is safe, its tier and bonus from its share.
function judge(q: number, text: string): Result | null {
  const answer = normalize(text), day = DAY[q - 1];
  if (day.host.includes(answer)) return { answer, caught: true, tier: "common", points: 0, total: 0 };
  const share = day.shares[answer];
  if (share === undefined) return null;
  const points = POINTS_PER_QUESTION[q - 1], bonus = Math.round(points * RARITY_BONUS_FRACTION * Math.max(0, 1 - share / RARITY_ZERO_SHARE));
  return { answer, caught: false, tier: share >= RARITY_ZERO_SHARE ? "common" : share >= RARE_BELOW ? "uncommon" : "rare", points, total: points + bonus };
}

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
