---- MODULE FirstDay ----
\* A new player's first day: they open plor.app with no account, play as a guest, and may make an account. Drawn
\* from the code as of commit 4f9c441 (each action cites it); a picture of the flow, not a check of it.
EXTENDS Naturals

VARIABLES
  page,        \* what the player sees
  accountRun   \* the account's own run today: "none", "playing" or "over"

vars == <<page, accountRun>>

Init == page = "front" /\ accountRun = "none"

\* "Play Offbeat without an account" / "Play Fragments without an account" (src/app/home.tsx:308, 313).
PlayWithoutAccount == page = "front" /\ page' = "guestReady" /\ UNCHANGED accountRun
\* Start runs the bot check first (src/app/guest-game.tsx:94-103).
GuestStart == page = "guestReady" /\ page' = "botCheck" /\ UNCHANGED accountRun
\* POST /api/guest/run/start creates the run and its cookie (src/app/api/guest/run/start/route.ts:11-16).
CheckPasses == page = "botCheck" /\ page' = "guestPlaying" /\ UNCHANGED accountRun
\* "The check didn't pass. Try again." (src/app/messages.ts:77); nothing is created.
CheckFails == page = "botCheck" /\ page' = "guestReady" /\ UNCHANGED accountRun
\* Caught, time's up, or the last question or round (src/app/game.tsx:446-483; src/app/substrings.tsx:153-171).
GuestRunEnds == page = "guestPlaying" /\ page' = "guestResult" /\ UNCHANGED accountRun
\* After midnight Pacific the guest's cookie finds today not started (src/app/api/guest/run/route.ts:16-17).
Midnight == page = "guestResult" /\ page' = "guestReady" /\ UNCHANGED accountRun
\* The peek's "Make an account" (src/app/guest-peek.tsx:39-42), or a "Sign in" link (home.tsx:321).
MakeAccount == page = "guestResult" /\ page' = "signIn" /\ UNCHANGED accountRun
SignInLink == page \in {"front", "guestReady"} /\ page' = "signIn" /\ UNCHANGED accountRun
\* "Email me a sign-in code" (home.tsx:456-553, SignIn); a new address signs up on its first code.
EmailCode == page = "signIn" /\ page' = "code" /\ UNCHANGED accountRun
\* The right code from the email; a new account has no username yet.
CodeRight == page = "code" /\ page' = "username" /\ UNCHANGED accountRun
\* "Continue with Google", then /auth/callback (src/app/auth/callback/route.ts:21).
Google == page = "signIn" /\ page' = "username" /\ UNCHANGED accountRun
\* "Pick a username", Save (home.tsx:556-593, PickUsername).
SaveUsername == page = "username" /\ page' = "today" /\ UNCHANGED accountRun
\* Today's game for points: the guest's run is not carried over (e2e/guest-play.e2e.ts:176-177, 200-219).
PlayForPoints == page = "today" /\ accountRun = "none" /\ page' = "playing" /\ accountRun' = "playing"
AccountRunEnds == page = "playing" /\ page' = "result" /\ accountRun' = "over"
\* The result with Share and no peek: the day is played.
DayDone == page = "result" /\ UNCHANGED vars

Next ==
  \/ PlayWithoutAccount \/ GuestStart \/ CheckPasses \/ CheckFails \/ GuestRunEnds \/ Midnight
  \/ MakeAccount \/ SignInLink \/ EmailCode \/ CodeRight \/ Google \/ SaveUsername
  \/ PlayForPoints \/ AccountRunEnds \/ DayDone

Spec == Init /\ [][Next]_vars

\* A new account starts its day clean: nothing of the guest's run is in it.
AccountStartsClean == page \in {"username", "today"} => accountRun = "none"
====
