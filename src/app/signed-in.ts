// Whether this browser is signed in, on <html data-signed-in>, so a signed-in player never sees Today's introduction,
// not even before the profile loads (docs/milestones/M14-14b-18-headings-today-invites-words.md, answer 6). The
// session lives in Supabase's cookies, which @supabase/ssr doesn't make httpOnly (its DEFAULT_COOKIE_OPTIONS), so
// SIGNED_IN_SCRIPT sees in <head>, before the first paint, whether one is there: by its name only, never its value
// (sb-<project>-auth-token, split into .0, .1… when long). The frame then sets the mark from the profile it reads, so a
// cookie whose session has ended shows the introduction again with the sign-in.
export const SIGNED_IN_SCRIPT = String.raw`(function(){if(/(?:^|; )sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie))document.documentElement.setAttribute("data-signed-in","")})()`;

export function markSignedIn(signedIn: boolean): void {
  document.documentElement.toggleAttribute("data-signed-in", signedIn);
}
