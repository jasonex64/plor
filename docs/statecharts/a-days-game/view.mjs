// The /statechart view of DaysGame.tla: each game's screens as parent states, in the app's words.
export const title = "A day's game, Offbeat and Fragments";

const words = {
  notStarted: "Ready to Start",
  question: "A question, 20 seconds",
  safe: "Safe!",
  caught: "Caught",
  timeUp: "Time's up",
  survived: "You survived all 7!",
  round: "A round, 20 seconds",
  played: "You played a word",
  roundTimeUp: "Time's up",
  result: "Results",
};

export const state = (v) => (v.screen === "today" ? ["Today"] : [v.game, words[v.screen]]);

export const group = (v) => (v.game === "none" ? "today" : v.game);
export const colors = { today: "tan", Offbeat: "blue", Fragments: "teal" };

const steps = {
  PlayOffbeat: "you press Play on Offbeat",
  PlayFragments: "you press Play on Fragments",
  OffbeatStart: "you press Start",
  FragmentsStart: "you press Start",
  Safe: "your answer is safe",
  Caught: "the host takes your answer",
  TimeUp: "the 20 seconds run out",
  RoundTimeUp: "the 20 seconds run out",
  Accepted: "your word is accepted",
  OffbeatNext: "you press Next",
  FragmentsNext: "you press Next",
  OffbeatResults: "you press See results",
  FragmentsResults: "you press See results [after round 7]",
  Played: null,
};

export const step = (action, from, to) => {
  if (!(action in steps)) throw new Error(`no label for ${action}`);
  if (action === "Safe") return to.screen === "survived" ? "your seventh answer is safe" : steps.Safe;
  if (action === "FragmentsNext") return "you press Next [rounds 1 to 6]";
  return steps[action];
};
