---- MODULE OffbeatRun ----
\* One player's Offbeat run on one day, played from two tabs. Each action below is one indivisible step in the code,
\* named in SKILL.md's coverage record. A signed-in player's run and a guest's share every rule here (answer_rule and
\* open_rule in supabase/migrations/20261111120000_guest_play_data.sql); only the tables differ.
\*
\* An answer's trigger (check_run_event) reads the run's rows at its statement's start, without a lock, and the insert
\* lands later: another tab's answer can commit in between, and only the primary key on (run, question) stops two
\* answers to one question. So the check and the write are two steps here.
\*
\* Every rule reads only the run's count of answers, whether one was caught, and the open question's clock, so earlier
\* questions are kept only as those, and a broken rule as a flag set at the step that breaks it.
\*
\* Left out: which answer was typed (an answer is "caught" or "safe"), misses and taken letters (they write no answer),
\* the day ending at midnight, and the guest purge.
EXTENDS Integers

CONSTANTS Questions, Tabs

None == -1
Idx == 0..(Questions - 1)
Idle == [kind |-> "idle"]

VARIABLES
  started,      \* the private.run row exists; question 0 opens with it
  answered,     \* count of private.run_event rows
  died,         \* some run_event has matched (the host caught the answer)
  lastOpen,     \* the highest question opened: 0 by Start, then by Next (private.question_open)
  clockUp,      \* the open question's 20 seconds have passed
  seen,         \* seen[t]: the question tab t last read as next to answer, or None before it has the run
  req,          \* req[t]: tab t's request on its way through the server
  answerAfterEnd,  \* an answer was stored for a run already over
  answerOutOfOrder,\* an answer was stored at an index other than the next
  answerUnopened,  \* an answer was stored for a question not yet opened
  answerLate,      \* an answer was stored after its question's 20 seconds
  twoAnswers,      \* a question got a second answer
  openedEarly      \* Next opened a question before the one before it was answered and survived

vars == <<started, answered, died, lastOpen, clockUp, seen, req,
          answerAfterEnd, answerOutOfOrder, answerUnopened, answerLate, twoAnswers, openedEarly>>
flags == <<answerAfterEnd, answerOutOfOrder, answerUnopened, answerLate, twoAnswers, openedEarly>>

Init ==
  /\ started = FALSE
  /\ answered = 0
  /\ died = FALSE
  /\ lastOpen = None
  /\ clockUp = FALSE
  /\ seen = [t \in Tabs |-> None]
  /\ req = [t \in Tabs |-> Idle]
  /\ answerAfterEnd = FALSE /\ answerOutOfOrder = FALSE /\ answerUnopened = FALSE
  /\ answerLate = FALSE /\ twoAnswers = FALSE /\ openedEarly = FALSE

\* run_status, game 1: a question is open when it is the next to answer and has been opened; its clock is the only
\* one any rule reads.
Open == started /\ lastOpen = answered
TimedOut == Open /\ clockUp /\ ~died /\ answered < Questions
Over == died \/ answered = Questions \/ TimedOut

\* startRun: insert ... on conflict do nothing, then the run as todaysState reads it.
Start(t) ==
  /\ seen[t] = None /\ req[t] = Idle
  /\ started' = TRUE
  /\ lastOpen' = IF started THEN lastOpen ELSE 0
  /\ seen' = [seen EXCEPT ![t] = answered]
  /\ UNCHANGED <<answered, died, clockUp, req>> /\ UNCHANGED flags

\* A page load in a tab once the run exists (currentRun).
Load(t) ==
  /\ started /\ req[t] = Idle
  /\ seen' = [seen EXCEPT ![t] = answered]
  /\ UNCHANGED <<started, answered, died, lastOpen, clockUp, req>> /\ UNCHANGED flags

\* The open question's 20 seconds pass. Nothing is written; run_status and the trigger read the clock.
Tick ==
  /\ Open /\ ~clockUp /\ ~died /\ answered < Questions
  /\ clockUp' = TRUE
  /\ UNCHANGED <<started, answered, died, lastOpen, seen, req>> /\ UNCHANGED flags

\* answer(): the route's reads (run_status for not_open, settledAnswer) and check_run_event's answer_rule, all at the
\* statement's start, against what is committed. The tab sends the index it shows, and the host catches the answer or
\* not. A refusal (run_over, out_of_order, not_open, time_up, or a stored answer) ends the request here. The 20 seconds
\* are judged on statement time, so whether the answer was in time is fixed here. The index comes from the request
\* body, checked only against the day's length, so a tab may send any question, not just the one it shows.
AnswerChecked(t) ==
  /\ seen[t] # None /\ req[t] = Idle
  /\ \E i \in Idx, caught \in BOOLEAN :
       LET passes == ~died /\ answered < Questions /\ i = answered /\ lastOpen >= i /\ ~clockUp
       IN req' = [req EXCEPT ![t] = IF passes THEN [kind |-> "insert", idx |-> i, caught |-> caught,
                                                    inTime |-> ~(clockUp /\ lastOpen = i)]
                                               ELSE [kind |-> "respond"]]
  /\ UNCHANGED <<started, answered, died, lastOpen, clockUp, seen>> /\ UNCHANGED flags

\* The insert into private.run_event lands. The primary key on (run, question) refuses a second answer to a question
\* (23505, then settledAnswer); nothing else is checked again here.
AnswerWrites(t) ==
  /\ req[t].kind = "insert"
  /\ LET i == req[t].idx
         hasAnswer == i < answered
         stores == ~hasAnswer   \* the primary key
     IN /\ answered' = IF stores THEN answered + 1 ELSE answered
        /\ died' = IF stores THEN (died \/ req[t].caught) ELSE died
        \* The next question has no clock until Next opens it.
        /\ clockUp' = IF stores THEN FALSE ELSE clockUp
        /\ answerAfterEnd' = (answerAfterEnd \/ (stores /\ (died \/ answered >= Questions)))
        /\ answerOutOfOrder' = (answerOutOfOrder \/ (stores /\ i # answered))
        /\ answerUnopened' = (answerUnopened \/ (stores /\ lastOpen < i))
        /\ answerLate' = (answerLate \/ (stores /\ ~req[t].inTime))
        /\ twoAnswers' = (twoAnswers \/ (stores /\ hasAnswer))
  /\ req' = [req EXCEPT ![t] = [kind |-> "respond"]]
  /\ UNCHANGED <<started, lastOpen, seen, openedEarly>>

\* openNext, statement 1: read answered from run_status.
NextReads(t) ==
  /\ seen[t] # None /\ req[t] = Idle
  /\ req' = [req EXCEPT ![t] = [kind |-> "next", idx |-> answered]]
  /\ UNCHANGED <<started, answered, died, lastOpen, clockUp, seen>> /\ UNCHANGED flags

\* openNext, statement 2: insert into question_open ... on conflict do nothing; check_question_open asks open_rule, and
\* question_idx must be over 0. A refusal (run_over, out_of_order, no_reveal) writes nothing.
NextWrites(t) ==
  /\ req[t].kind = "next"
  /\ LET i == req[t].idx
         opens == ~died /\ answered < Questions /\ i = answered /\ i > 0 /\ i > lastOpen
     IN /\ lastOpen' = IF opens THEN i ELSE lastOpen
        /\ clockUp' = IF opens THEN FALSE ELSE clockUp
        /\ openedEarly' = (openedEarly \/ (opens /\ (died \/ i > answered)))
  /\ req' = [req EXCEPT ![t] = [kind |-> "respond"]]
  /\ UNCHANGED <<started, answered, died, seen, answerAfterEnd, answerOutOfOrder, answerUnopened, answerLate, twoAnswers>>

\* The route returns the run as stateOf reads it, in a statement of its own.
Responds(t) ==
  /\ req[t].kind = "respond"
  /\ seen' = [seen EXCEPT ![t] = answered]
  /\ req' = [req EXCEPT ![t] = Idle]
  /\ UNCHANGED <<started, answered, died, lastOpen, clockUp>> /\ UNCHANGED flags

\* The run is over and no request is on its way: nothing more happens.
RunOver ==
  /\ started /\ Over /\ \A t \in Tabs : req[t] = Idle
  /\ UNCHANGED vars

Next ==
  \/ \E t \in Tabs : Start(t) \/ Load(t) \/ AnswerChecked(t) \/ AnswerWrites(t)
                     \/ NextReads(t) \/ NextWrites(t) \/ Responds(t)
  \/ Tick
  \/ RunOver

Spec == Init /\ [][Next]_vars

\* ---- Rules ----

\* No answer is stored once the run is over: caught, every question answered, or out of time.
NoAnswerAfterEnd == ~answerAfterEnd

\* Answers are stored in question order, one index after the last.
AnswersInOrder == ~answerOutOfOrder

\* An answer is stored only for a question that Start or Next opened.
OnlyOpenQuestions == ~answerUnopened

\* An answer is stored only inside its question's 20 seconds.
NoLateAnswer == ~answerLate

\* Each question holds at most one answer.
OneAnswerPerQuestion == ~twoAnswers

\* Next opens a question only after the one before it was answered and the host missed it.
NextOnlyAfterReveal == ~openedEarly
====
