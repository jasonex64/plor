// The /statechart view of OffbeatRun.tla: states and steps in the player's words.
export const title = "An Offbeat run on a clock, two tabs";

export const state = (v) => {
  if (!v.started) return "Not started";
  if (v.finished) return "Finished";
  if (v.clockUp) return "Time up";
  return `Question ${v.lastOpen + 1}: clock running`;
};

export const group = (v) => (!v.started ? "start" : v.finished || v.clockUp ? "end" : "play");
export const colors = { start: "tan", play: "blue", end: "purple" };

export const step = (action, from, to) => {
  switch (action) {
    case "Start":
      return "you press Start";
    case "Tick":
      return "the clock passes zero";
    case "Answer":
    case "AnswerWrites":
      return to.got.length > from.got.length ? "your answer counts" : "your answer changes nothing";
    case "NextQ":
    case "NextWrites":
      return to.lastOpen > from.lastOpen ? "the next question opens" : "Next changes nothing";
    case "Finish":
    case "FinishWrites":
      return to.finished && !from.finished ? "you press Finish" : "Finish changes nothing";
    case "AnswerChecked":
      return "a tab sends an answer";
    case "NextChecked":
      return "a tab presses Next";
    case "FinishChecked":
      return "a tab presses Finish";
    case "RunOver":
      return null;
    default:
      throw new Error(`no label for ${action}`);
  }
};
