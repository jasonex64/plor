import { DISPLAY_NAME_MAX_LENGTH, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/config/tunables";

// What the player reads for each error code the API or the sign-in redirects can return.
const MESSAGES: Record<string, string> = {
  email_invalid: "That doesn't look like an email address.",
  email_address_invalid: "That doesn't look like an email address.",
  email_address_not_authorized: "Sign-in emails can't be sent to this address yet.",
  over_email_send_rate_limit: "Too many sign-in emails were sent. Wait a while and try again.",
  over_request_rate_limit: "Too many attempts. Wait a while and try again.",
  otp_expired: "That code is wrong, expired or already used. Check the newest email, or reload to get a new code.",
  code_invalid: "Enter the code from the email.",
  // Supabase Auth itself failed (docs/milestones/M02-2f-cleanup.md, A2). Wording approved by the human, 2026-10-20.
  auth_unavailable: "Sign-in isn't working on our side right now. Try again in a few minutes.",
  link_invalid: "That sign-in link isn't valid. Ask for a new one.",
  access_denied: "Google sign-in was cancelled.",
  not_signed_in: "You're signed out. Please sign in again.",
  // The rules themselves are enforced by the database (docs/milestones/M02-sign-in-and-play.md, Numbers).
  username_invalid: `Usernames are ${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters: lower-case letters, digits and _.`,
  username_taken: "That username is taken. Try another.",
  profile_exists: "You already have a username.",
  no_profile: "Pick a username before you play.",
  // The rules are the database's check (docs/milestones/M07-friends-and-live-board.md, D1).
  display_name_invalid: `Display names are 1 to ${DISPLAY_NAME_MAX_LENGTH} characters: letters, digits, single spaces and ' . _ -`,
  no_puzzle_today: "There's no puzzle today yet. Check back later.",
  no_run: "Start today's puzzle first.",
  run_over: "This run is already over.",
  out_of_order: "That question isn't the current one. Reload the page.",
  already_answered: "You already answered that question. Reload the page.",
  stolen_letter: "The Wind took one of those letters. Try another answer.",
  not_open: "Tap Next to see the next question.",
  no_reveal: "There is nothing to go on to yet.",
  not_current_question: "That question isn't the current one. Reload the page.",
  // The 40-character limit is the database's check (M02 ticket, Numbers).
  text_invalid: "That's too long to send. Try a shorter answer.",
  admins_only: "This page is for admins only.",
  not_available: "There's no report for that day yet.",
  // Puzzle entry (docs/milestones/M06-puzzle-entry.md).
  questions_invalid: "Fill in all 7 questions.",
  day_past: "That day is over.",
  puzzle_started: "That day has started, so its puzzle can't change.",
  no_draft: "There's no drafted puzzle for that day yet.",
  puzzle_invalid: "The puzzle breaks a content rule. See the problems listed.",
};

export function messageFor(code: string): string {
  return MESSAGES[code] ?? `Something went wrong (${code}). Try again.`;
}

// A code from the address bar can be made up by anyone, so only known ones are shown.
export function messageForRedirect(code: string): string {
  return MESSAGES[code] ?? "Sign-in didn't work. Try again.";
}
