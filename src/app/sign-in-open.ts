// Where every "Sign in" link goes: the front page, which shows the sign-in form when the address asks for it
// (docs/milestones/M18-guest-play.md, answers 32 and 33).
export const SIGN_IN_HREF = "/?sign-in";

// Whether the front page shows the sign-in form instead of its small "Sign in" link: when the address asks for it, or
// when a sign-in came back with an error (src/app/auth/callback/route.ts), so the error is shown above the form it
// failed. An empty error shows no message (RedirectError, src/app/home.tsx), so it opens nothing either.
export function signInOpen(params: Pick<URLSearchParams, "has" | "get">): boolean {
  return params.has("sign-in") || Boolean(params.get("error"));
}
