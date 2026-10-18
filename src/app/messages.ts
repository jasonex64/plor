// What the player reads for each error code the API or the sign-in redirects can return.
const MESSAGES: Record<string, string> = {
  email_invalid: "That doesn't look like an email address.",
  email_address_invalid: "That doesn't look like an email address.",
  email_address_not_authorized: "Sign-in emails can't be sent to this address yet.",
  over_email_send_rate_limit: "Too many sign-in emails were sent. Wait a while and try again.",
  over_request_rate_limit: "Too many attempts. Wait a while and try again.",
  otp_expired: "That sign-in link has expired or was already used. Ask for a new one.",
  link_invalid: "That sign-in link isn't valid. Ask for a new one.",
  access_denied: "Google sign-in was cancelled.",
  not_signed_in: "You're signed out. Please sign in again.",
  // The rules themselves are enforced by the database (docs/milestones/M02-sign-in-and-play.md, Numbers).
  username_invalid: "Usernames are 3 to 20 characters: lower-case letters, digits and _.",
  username_taken: "That username is taken. Try another.",
  profile_exists: "You already have a username.",
};

export function messageFor(code: string): string {
  return MESSAGES[code] ?? `Something went wrong (${code}). Try again.`;
}

// A code from the address bar can be made up by anyone, so only known ones are shown.
export function messageForRedirect(code: string): string {
  return MESSAGES[code] ?? "Sign-in didn't work. Try again.";
}
