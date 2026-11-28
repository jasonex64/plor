// Playing today's run on a clock through the route handlers, as whoever is signed in now (src/test/local-stack.ts, useSession), for the
// database tests that need a finished run to be there: a comment, a reaction, a board place and a feed item all wait on one. The
// test file mocks next/headers and next/server as src/test/request-scope.ts says.
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as finishRoute } from "@/app/api/run/finish/route";
import { POST as nextRoute } from "@/app/api/run/next/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { apiRequest } from "./request-scope";

type Reply = { status: number; body: { run: { status: string; points: number; answers: { answer: { name: string } }[] } } };

async function post(route: (request: Request) => Promise<Response>, path: string, body?: unknown): Promise<Reply> {
  const response = await route(apiRequest(path, { method: "POST", body }));
  return { status: response.status, body: await response.json() };
}

export const startTodaysRun = () => post(startRoute, "/api/run/start");

export const answerTodaysRun = (index: number, text: string) => post(answerRoute, "/api/run/answer", { index, text });

// Starts today's run if it isn't, answers the first question with `text` (the fixture's dog, a common answer, by default), goes
// to the last question and Finishes: the run is over with the points of that one answer.
export async function finishTodaysRun(text = "dog"): Promise<Reply> {
  await startTodaysRun();
  await answerTodaysRun(0, text);
  await post(nextRoute, "/api/run/next", { index: 0 });
  await post(nextRoute, "/api/run/next", { index: 1 });
  return post(finishRoute, "/api/run/finish");
}
