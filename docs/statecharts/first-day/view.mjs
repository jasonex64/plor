// The /statechart view of FirstDay.tla: the screens a new player sees, in the app's words.
export const title = "A new player's first day";

const words = {
  front: "Front page",
  guestReady: "Guest game, ready to Start",
  botCheck: "The bot check",
  guestPlaying: "Playing as a guest",
  guestResult: "Guest result, with Make an account",
  signIn: "Sign in",
  code: "Enter your code",
  username: "Pick a username",
  today: "Today, signed in",
  playing: "Playing for points",
  result: "Result, with Share",
};

export const state = (v) => words[v.page];

export const group = (v) =>
  ["front", "guestReady", "botCheck", "guestPlaying", "guestResult"].includes(v.page)
    ? "guest"
    : ["signIn", "code", "username"].includes(v.page)
      ? "account"
      : "player";
export const colors = { guest: "tan", account: "purple", player: "teal" };

const steps = {
  PlayWithoutAccount: "you press Play without an account",
  GuestStart: "you press Start",
  CheckPasses: "the check passes",
  CheckFails: "the check doesn't pass",
  GuestRunEnds: "the run ends",
  Midnight: "midnight Pacific passes",
  MakeAccount: "you press Make an account",
  SignInLink: "you press Sign in",
  EmailCode: "you ask for a code by email",
  CodeRight: "you type the code",
  Google: "you continue with Google",
  SaveUsername: "you save a username",
  PlayForPoints: "you play today's game for points",
  AccountRunEnds: "the run ends",
  DayDone: null,
};

export const step = (action) => {
  if (!(action in steps)) throw new Error(`no label for ${action}`);
  return steps[action];
};
