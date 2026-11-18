// The /statechart view of OffbeatRun.tla: states and steps in the player's words.
const None = -1;

export const title = "An Offbeat run, two tabs";

export const state = (v) => {
  if (!v.started) return "Not started";
  if (v.died) return "Caught";
  if (v.answered === 7) return "All seven survived";
  const q = `Question ${v.answered + 1}`;
  if (v.lastOpen < v.answered) return `Reveal before ${q}`;
  return v.clockUp ? `${q}: time up` : `${q}: clock running`;
};

export const group = (v) => (!v.started ? "start" : v.died ? "end" : v.answered === 7 ? "end" : "play");
export const colors = { start: "tan", play: "blue", end: "purple" };

export const step = (action, from, to) => {
  switch (action) {
    case "Start":
      return "you press Start";
    case "Tick":
      return "the 20 seconds run out";
    case "AnswerWrites":
      return to.died && !from.died ? "the host takes your answer" : "your answer is safe";
    case "NextWrites":
      return "the next question opens";
    case "Load":
      return "a tab loads the page";
    case "AnswerChecked":
      return "a tab sends an answer";
    case "NextReads":
      return "a tab presses Next";
    case "Responds":
      return "the tab shows the server's answer";
    case "RunOver":
      return null;
    default:
      throw new Error(`no label for ${action}`);
  }
};
