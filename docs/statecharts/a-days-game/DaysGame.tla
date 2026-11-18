---- MODULE DaysGame ----
\* A signed-in player's day of each game, Offbeat and Fragments, from Today to the result. Drawn from the code as of
\* commit 4f9c441 (each action cites it); a picture of the flow, not a check of it. The checks of the runs underneath
\* are verify-offbeat-run and verify-fragments-run.
EXTENDS Naturals

Last == 7  \* QUESTIONS_PER_DAY and SUBSTRING_ROUNDS' seven (src/config/tunables.ts:4, :192)

VARIABLES
  game,    \* "none" on Today, then "Offbeat" or "Fragments"
  screen,  \* what the game shows
  n        \* the question or round, 1 to 7

vars == <<game, screen, n>>

Init == game = "none" /\ screen = "today" /\ n = 1

\* Today's "Play" on a game's card (src/app/game.tsx:119-127; src/app/today-fragments.tsx:15-47).
PlayOffbeat == screen = "today" /\ game' = "Offbeat" /\ screen' = "notStarted" /\ UNCHANGED n
PlayFragments == screen = "today" /\ game' = "Fragments" /\ screen' = "notStarted" /\ UNCHANGED n

\* ---- Offbeat (src/app/game.tsx) ----
\* Start, POST /api/run/start (game.tsx:94-105, 467-477).
OffbeatStart == game = "Offbeat" /\ screen = "notStarted" /\ screen' = "question" /\ UNCHANGED <<game, n>>
\* "Safe!" and Next (game.tsx:615-634); after the seventh, "You survived all 7!" (game.tsx:577).
Safe == game = "Offbeat" /\ screen = "question" /\ screen' = (IF n = Last THEN "survived" ELSE "safe") /\ UNCHANGED <<game, n>>
\* The host takes the answer: "Caught on question N" (game.tsx:578-581).
Caught == game = "Offbeat" /\ screen = "question" /\ screen' = "caught" /\ UNCHANGED <<game, n>>
\* The clock reaches 0 and the server says timed_out: "Time's up on question N" (game.tsx:224-234, 579).
TimeUp == game = "Offbeat" /\ screen = "question" /\ screen' = "timeUp" /\ UNCHANGED <<game, n>>
\* Next, POST /api/run/next (game.tsx:243).
OffbeatNext == game = "Offbeat" /\ screen = "safe" /\ screen' = "question" /\ n' = n + 1 /\ UNCHANGED game
\* The recap's "See results" (src/app/recap.tsx:42; game.tsx:456-459).
OffbeatResults == game = "Offbeat" /\ screen \in {"caught", "timeUp", "survived"} /\ screen' = "result" /\ UNCHANGED <<game, n>>

\* ---- Fragments (src/app/substrings.tsx) ----
\* Start, POST /api/substrings/start (substrings.tsx:107-123, 145-152).
FragmentsStart == game = "Fragments" /\ screen = "notStarted" /\ screen' = "round" /\ UNCHANGED <<game, n>>
\* Try, accepted: "You played {word}: {n} points." (substrings.tsx:192-218, 263). A rejected try ("Not in the
\* dictionary.", "Needs the letters …", "Already used.", "Too quick.") stays in the round.
Accepted == game = "Fragments" /\ screen = "round" /\ screen' = "played" /\ UNCHANGED <<game, n>>
\* The clock reaches 0: "Time's up." (substrings.tsx:156, 263).
RoundTimeUp == game = "Fragments" /\ screen = "round" /\ screen' = "roundTimeUp" /\ UNCHANGED <<game, n>>
\* Next, POST /api/substrings/next (substrings.tsx:158, 273).
FragmentsNext == game = "Fragments" /\ screen \in {"played", "roundTimeUp"} /\ n < Last /\ screen' = "round" /\ n' = n + 1 /\ UNCHANGED game
\* After round 7 the button reads "See results" (substrings.tsx:273, 321-355).
FragmentsResults == game = "Fragments" /\ screen \in {"played", "roundTimeUp"} /\ n = Last /\ screen' = "result" /\ UNCHANGED <<game, n>>

\* The result: the day of this game is played.
Played == screen = "result" /\ UNCHANGED vars

Next ==
  \/ PlayOffbeat \/ PlayFragments
  \/ OffbeatStart \/ Safe \/ Caught \/ TimeUp \/ OffbeatNext \/ OffbeatResults
  \/ FragmentsStart \/ Accepted \/ RoundTimeUp \/ FragmentsNext \/ FragmentsResults
  \/ Played

Spec == Init /\ [][Next]_vars

\* A day never has an eighth question or round.
SevenAtMost == n <= Last
====
