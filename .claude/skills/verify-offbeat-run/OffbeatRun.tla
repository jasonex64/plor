---- MODULE OffbeatRun ----
\* One player's Offbeat run on a clock (a format 4 day; docs/milestones/M23-23c-the-run-on-a-clock.md), played from two
\* tabs. Each action below is one indivisible step in the code, named in SKILL.md's coverage record. A signed-in
\* player's run and a guest's share every rule here; only the tables differ.
\*
\* An answer, a Next and a Finish are each one insert whose trigger takes the run's row lock first, then reads the
\* run's rows and decides. So with the lock (Locked = TRUE, the code) the check and the write are one step. Locked =
\* FALSE is the run without that lock: the trigger reads at one moment and the row lands at a later one, with only the
\* primary keys in between. It is kept to show the rules need the lock (it breaks them; SKILL.md, "Run it").
\*
\* The clock is never stored: the run ends when the time passes its start plus 20 seconds plus what the accepted
\* answers added. Here that is one flag, clockUp, which only Tick sets: an answer is accepted only before it, and an
\* accepted answer moves the end later, so the flag stays down.
\*
\* A tab may send any question number and any answer, whatever it shows (the request body is the browser's).
\*
\* Left out: which text was typed and how it resolves (an answer is one of Answers), misses (they write nothing here),
\* the sizes of the times and points (the count each uses is kept, n), the day ending at midnight, the guest purge.
EXTENDS Integers, FiniteSets

CONSTANTS Questions, Tabs, Answers, Locked

None == -1
Idx == 0..(Questions - 1)
Idle == [kind |-> "idle"]

VARIABLES
  started,      \* the private.run row exists; question 0 opens with it
  lastOpen,     \* the highest question opened: 0 by Start, then by Next (private.question_open)
  finished,     \* the private.clock_finish row exists
  clockUp,      \* the time has passed the run's end
  got,          \* the private.clock_answer rows: <<question, answer>>
  req,          \* req[t]: tab t's request between its trigger's read and its write (only without the lock)
  answerAfterEnd,  \* an answer was stored for a run already over
  answerNotOpen,   \* an answer was stored for a question other than the open one
  wrongCount,      \* an answer's added time used a count that missed an earlier answer
  nextBad,         \* Next opened a question other than the one after the open one, or on a run already over
  finishBad        \* Finish was stored before the last question, or on a run already over

vars == <<started, lastOpen, finished, clockUp, got, req, answerAfterEnd, answerNotOpen, wrongCount, nextBad, finishBad>>
flags == <<answerAfterEnd, answerNotOpen, wrongCount, nextBad, finishBad>>

Init ==
  /\ started = FALSE
  /\ lastOpen = None
  /\ finished = FALSE
  /\ clockUp = FALSE
  /\ got = {}
  /\ req = [t \in Tabs |-> Idle]
  /\ answerAfterEnd = FALSE /\ answerNotOpen = FALSE /\ wrongCount = FALSE
  /\ nextBad = FALSE /\ finishBad = FALSE

Over == started /\ (clockUp \/ finished)
Live == started /\ ~Over

\* startRun: insert ... on conflict do nothing.
Start(t) ==
  /\ req[t] = Idle
  /\ started' = TRUE
  /\ lastOpen' = IF started THEN lastOpen ELSE 0
  /\ UNCHANGED <<finished, clockUp, got, req>> /\ UNCHANGED flags

\* The time passes the run's end. Nothing is written; the triggers and the state read the clock.
Tick ==
  /\ Live
  /\ clockUp' = TRUE
  /\ UNCHANGED <<started, lastOpen, finished, got, req>> /\ UNCHANGED flags

\* ---- An answer: the insert into private.clock_answer and its trigger (clock_answer_rule) ----

\* What the trigger reads: the run is live, the question is the open one, and n, the answers already stored.
AnswerPasses(q) == Live /\ q = lastOpen

\* The row lands. The primary key on (run, question, answer) refuses a repeat; with the lock the trigger has already
\* answered a repeat with no row.
AnswerStores(q, a, passed, n) ==
  LET stores == passed /\ <<q, a>> \notin got
  IN /\ got' = IF stores THEN got \cup {<<q, a>>} ELSE got
     /\ answerAfterEnd' = (answerAfterEnd \/ (stores /\ finished))
     /\ answerNotOpen' = (answerNotOpen \/ (stores /\ q # lastOpen))
     /\ wrongCount' = (wrongCount \/ (stores /\ n # Cardinality(got)))

\* With the lock: read and write in one step.
Answer(t) ==
  /\ Locked /\ started /\ req[t] = Idle
  /\ \E q \in Idx, a \in Answers : AnswerStores(q, a, AnswerPasses(q), Cardinality(got))
  /\ UNCHANGED <<started, lastOpen, finished, clockUp, req, nextBad, finishBad>>

\* Without it: the read, with the clock judged here (statement time) ...
AnswerChecked(t) ==
  /\ ~Locked /\ started /\ req[t] = Idle
  /\ \E q \in Idx, a \in Answers :
       req' = [req EXCEPT ![t] = [kind |-> "answer", q |-> q, a |-> a, passed |-> AnswerPasses(q), n |-> Cardinality(got)]]
  /\ UNCHANGED <<started, lastOpen, finished, clockUp, got>> /\ UNCHANGED flags

\* ... then the write.
AnswerWrites(t) ==
  /\ req[t].kind = "answer"
  /\ AnswerStores(req[t].q, req[t].a, req[t].passed, req[t].n)
  /\ req' = [req EXCEPT ![t] = Idle]
  /\ UNCHANGED <<started, lastOpen, finished, clockUp, nextBad, finishBad>>

\* ---- Next: the insert into private.question_open and its trigger (clock_open_rule) ----

\* Only the question after the open one, of a live run, never past the last. A second tap (i = lastOpen) writes nothing.
NextPasses(i) == Live /\ i = lastOpen + 1 /\ i < Questions

\* The primary key on (run, question) refuses a question already opened.
NextStores(i, passed) ==
  LET opens == passed /\ i > lastOpen
  IN /\ lastOpen' = IF opens THEN i ELSE lastOpen
     /\ nextBad' = (nextBad \/ (opens /\ (i # lastOpen + 1 \/ i >= Questions \/ finished)))

NextQ(t) ==
  /\ Locked /\ started /\ req[t] = Idle
  /\ \E i \in 0..Questions : NextStores(i, NextPasses(i))
  /\ UNCHANGED <<started, finished, clockUp, got, req, answerAfterEnd, answerNotOpen, wrongCount, finishBad>>

NextChecked(t) ==
  /\ ~Locked /\ started /\ req[t] = Idle
  /\ \E i \in 0..Questions : req' = [req EXCEPT ![t] = [kind |-> "next", i |-> i, passed |-> NextPasses(i)]]
  /\ UNCHANGED <<started, lastOpen, finished, clockUp, got>> /\ UNCHANGED flags

NextWrites(t) ==
  /\ req[t].kind = "next"
  /\ NextStores(req[t].i, req[t].passed)
  /\ req' = [req EXCEPT ![t] = Idle]
  /\ UNCHANGED <<started, finished, clockUp, got, answerAfterEnd, answerNotOpen, wrongCount, finishBad>>

\* ---- Finish: the insert into private.clock_finish and its trigger (clock_finish_rule) ----

\* Only on the last question of a live run. The primary key allows one Finish per run.
FinishPasses == Live /\ lastOpen = Questions - 1

FinishStores(passed) ==
  LET stores == passed /\ ~finished
  IN /\ finished' = (finished \/ stores)
     /\ finishBad' = (finishBad \/ (stores /\ lastOpen # Questions - 1))

Finish(t) ==
  /\ Locked /\ started /\ req[t] = Idle
  /\ FinishStores(FinishPasses)
  /\ UNCHANGED <<started, lastOpen, clockUp, got, req, answerAfterEnd, answerNotOpen, wrongCount, nextBad>>

FinishChecked(t) ==
  /\ ~Locked /\ started /\ req[t] = Idle
  /\ req' = [req EXCEPT ![t] = [kind |-> "finish", passed |-> FinishPasses]]
  /\ UNCHANGED <<started, lastOpen, finished, clockUp, got>> /\ UNCHANGED flags

FinishWrites(t) ==
  /\ req[t].kind = "finish"
  /\ FinishStores(req[t].passed)
  /\ req' = [req EXCEPT ![t] = Idle]
  /\ UNCHANGED <<started, lastOpen, clockUp, got, answerAfterEnd, answerNotOpen, wrongCount, nextBad>>

\* The run is over and no request is on its way: nothing more happens.
RunOver ==
  /\ Over /\ \A t \in Tabs : req[t] = Idle
  /\ UNCHANGED vars

Next ==
  \/ \E t \in Tabs : Start(t) \/ Answer(t) \/ AnswerChecked(t) \/ AnswerWrites(t)
                     \/ NextQ(t) \/ NextChecked(t) \/ NextWrites(t)
                     \/ Finish(t) \/ FinishChecked(t) \/ FinishWrites(t)
  \/ Tick
  \/ RunOver

Spec == Init /\ [][Next]_vars

\* ---- Rules ----

\* No answer is stored once the run is over: the clock has passed its end (judged when the trigger reads), or Finish.
NoAnswerAfterEnd == ~answerAfterEnd

\* An answer is stored only for the open question.
OnlyTheOpenQuestion == ~answerNotOpen

\* Each answer's added time is worked out from a count of every answer stored before it.
CountIncludesEveryEarlierAnswer == ~wrongCount

\* Next opens only the question after the open one, never past the last, never on a run that is over.
NextOnlyForward == ~nextBad /\ lastOpen < Questions

\* Finish is stored only on the last question.
FinishOnlyOnLast == ~finishBad

\* An answer counts once: the rows are a set by (question, answer), so got holding each pair once is the primary key
\* itself; this rule says the stored answers all belong to questions that were opened.
AnswersOnlyForOpened == \A p \in got : p[1] <= lastOpen
====
