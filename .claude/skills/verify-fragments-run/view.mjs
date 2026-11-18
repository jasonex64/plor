// The /statechart view of FragmentsRun.tla: states and steps in the player's words.
const None = -1;

export const title = "A Fragments run, two tabs";

export const state = (v) => {
  if (!v.started) return "Not started";
  const round = `Round ${v.opened + 1}`;
  if (v.word !== None) return `${round}: has a word`;
  return v.clockUp ? `${round}: time up` : `${round}: clock running`;
};

export const group = (v) => (!v.started ? "start" : v.opened % 2 === 0 ? "even" : "odd");
export const colors = { start: "tan", even: "blue", odd: "teal" };

export const step = (action, from, to) => {
  switch (action) {
    case "Start":
      return "you press Start";
    case "Tick":
      return "the 20 seconds run out";
    case "JudgeWrites":
      return to.word !== None && to.word !== to.opened ? "a word typed for an earlier round is accepted" : "your word is accepted";
    case "NextWrites":
      return "the next round opens";
    case "Load":
      return "a tab loads the page";
    case "TryArrives":
      return "a tab sends a word";
    case "JudgeReads":
      return "the server picks the open round to judge it on";
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
