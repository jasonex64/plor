---- MODULE FragmentsRun ----
\* One player's Fragments run on one day, played from two tabs. Each action below is one indivisible step in the
\* code, named in SKILL.md's coverage record. A signed-in player's run and a guest's share every rule here
\* (round_open_rule and judge_core in supabase/migrations/20261111120000_guest_play_data.sql); only the tables differ.
\*
\* Every rule in the code reads only the open round (judge_word's idx, round_open_rule's opened, run_status's c.idx),
\* so the model keeps only that round's word and clock; what happened to earlier rounds is kept as the flags below,
\* set at the step that breaks a rule.
\*
\* Left out: the 0.5 second lockout after a rejected try, which word was typed (a try is known by the round its tab
\* showed), "not a word" and "already used" rejections, and the day ending at midnight.
EXTENDS Integers

CONSTANTS Rounds, Tabs

None == -1
Idx == 0..(Rounds - 1)
Idle == [kind |-> "idle"]

VARIABLES
  started,    \* the private.run row exists
  opened,     \* max(question_open.question_idx); round 0 opens with Start
  word,       \* the open round's private.round_word row: the round its word was typed for, or None
  clockUp,    \* the open round's 20 seconds have passed (private.question_deadline)
  seen,       \* seen[t]: the round tab t last read from the server, or None before it has the run
  req,        \* req[t]: tab t's request on its way through the server
  openedEarly,\* some round opened while the round before it had no word and time left
  wordMoved,  \* some round got a word typed while another round showed
  misjudged   \* some try was judged against a round other than the one its tab showed

vars == <<started, opened, word, clockUp, seen, req, openedEarly, wordMoved, misjudged>>

Init ==
  /\ started = FALSE
  /\ opened = 0
  /\ word = None
  /\ clockUp = FALSE
  /\ seen = [t \in Tabs |-> None]
  /\ req = [t \in Tabs |-> Idle]
  /\ openedEarly = FALSE
  /\ wordMoved = FALSE
  /\ misjudged = FALSE

\* run_status's game 2 branch: a round is done with a word or past its clock.
Done == word # None \/ clockUp
Answered == opened + (IF Done THEN 1 ELSE 0)
Finished == started /\ Answered = Rounds

\* startSubstringRun: insert ... on conflict do nothing, then the run as stateOf reads it.
Start(t) ==
  /\ seen[t] = None /\ req[t] = Idle
  /\ started' = TRUE
  /\ seen' = [seen EXCEPT ![t] = opened]
  /\ UNCHANGED <<opened, word, clockUp, req, openedEarly, wordMoved, misjudged>>

\* A page load in a tab once the run exists (todaysRun).
Load(t) ==
  /\ started /\ req[t] = Idle
  /\ seen' = [seen EXCEPT ![t] = opened]
  /\ UNCHANGED <<started, opened, word, clockUp, req, openedEarly, wordMoved, misjudged>>

\* The open round's 20 seconds pass. Nothing is written; every rule reads the clock.
Tick ==
  /\ started /\ ~clockUp
  /\ clockUp' = TRUE
  /\ UNCHANGED <<started, opened, word, seen, req, openedEarly, wordMoved, misjudged>>

\* tryWord sends the typed word with no round: the server judges it against whatever round is open when it gets the
\* lock. statement_timestamp() is fixed here, when the statement starts, before judge_word waits for the run lock.
TryArrives(t) ==
  /\ seen[t] # None /\ req[t] = Idle
  /\ req' = [req EXCEPT ![t] = [kind |-> "try", stage |-> "waiting", typedFor |-> seen[t],
                                 atRound |-> opened, upAtArrival |-> clockUp]]
  /\ UNCHANGED <<started, opened, word, clockUp, seen, openedEarly, wordMoved, misjudged>>

LockFree == \A u \in Tabs : ~(req[u].kind = "try" /\ req[u].stage = "locked")

\* judge_word: select ... for update on the run row, then read the open round and its stored word.
JudgeReads(t) ==
  /\ req[t].kind = "try" /\ req[t].stage = "waiting" /\ LockFree
  /\ req' = [req EXCEPT ![t] = [kind |-> "try", stage |-> "locked", typedFor |-> req[t].typedFor,
                                 atRound |-> req[t].atRound, upAtArrival |-> req[t].upAtArrival,
                                 judgedOn |-> opened, hadWord |-> word # None]]
  /\ misjudged' = (misjudged \/ opened # req[t].typedFor)
  /\ UNCHANGED <<started, opened, word, clockUp, seen, openedEarly, wordMoved>>

\* judge_core, then judge_word's insert, still holding the lock. Statement time is the arrival's: a round opened after
\* the try arrived had not started then, so its clock cannot have passed. A try judged on another round is accepted
\* when its word happens to hold that round's letters too. A Next may have committed since JudgeReads; the word then
\* lands in a round that is no longer open, which no later rule reads.
JudgeWrites(t) ==
  /\ req[t].kind = "try" /\ req[t].stage = "locked"
  /\ LET r == req[t]
         j == r.judgedOn
         timeUp == IF j = r.atRound THEN r.upAtArrival ELSE FALSE
     IN \E fits \in (IF j = r.typedFor THEN {TRUE} ELSE BOOLEAN) :
          LET stores == ~r.hadWord /\ ~timeUp /\ fits IN
          /\ word' = IF stores /\ j = opened THEN r.typedFor ELSE word
          /\ wordMoved' = (wordMoved \/ (stores /\ j # r.typedFor))
  /\ req' = [req EXCEPT ![t] = [kind |-> "respond"]]
  /\ UNCHANGED <<started, opened, clockUp, seen, openedEarly, misjudged>>

\* nextRound, statement 1: read answered from run_status.
NextReads(t) ==
  /\ seen[t] # None /\ req[t] = Idle
  /\ req' = [req EXCEPT ![t] = [kind |-> "next", idx |-> Answered]]
  /\ UNCHANGED <<started, opened, word, clockUp, seen, openedEarly, wordMoved, misjudged>>

\* nextRound, statement 2: insert into question_open ... on conflict do nothing; check_question_open asks
\* round_open_rule. Any refusal (run_over, out_of_order, round_running) writes nothing. A new round starts with no
\* word and its clock running.
NextWrites(t) ==
  /\ req[t].kind = "next"
  /\ LET i == req[t].idx
         opens == i < Rounds /\ i = opened + 1 /\ Done
     IN /\ opened' = IF opens THEN i ELSE opened
        /\ word' = IF opens THEN None ELSE word
        /\ clockUp' = IF opens THEN FALSE ELSE clockUp
        /\ openedEarly' = (openedEarly \/ (opens /\ ~Done))
  /\ req' = [req EXCEPT ![t] = [kind |-> "respond"]]
  /\ UNCHANGED <<started, seen, wordMoved, misjudged>>

\* The route returns the run as stateOf reads it, in a statement of its own.
Responds(t) ==
  /\ req[t].kind = "respond"
  /\ seen' = [seen EXCEPT ![t] = opened]
  /\ req' = [req EXCEPT ![t] = Idle]
  /\ UNCHANGED <<started, opened, word, clockUp, openedEarly, wordMoved, misjudged>>

\* Every round done and no request on its way: the run is over and nothing more happens.
RunOver ==
  /\ Finished /\ \A t \in Tabs : req[t] = Idle
  /\ UNCHANGED vars

Next ==
  \/ \E t \in Tabs : Start(t) \/ Load(t) \/ TryArrives(t) \/ JudgeReads(t) \/ JudgeWrites(t)
                     \/ NextReads(t) \/ NextWrites(t) \/ Responds(t)
  \/ Tick
  \/ RunOver

Spec == Init /\ [][Next]_vars

\* ---- Rules ----

\* Next never opens a round past the day's last.
NeverPastLast == opened \in Idx

\* A round opens only once the round before it has a word or has run out of time.
RoundsOpenInOrder == ~openedEarly

\* A round's word is one the player typed while that round showed in their tab.
WordGoesToItsRound == ~wordMoved

\* Every try is judged against the round its tab showed when the player typed it.
TryJudgedOnItsRound == ~misjudged
====
