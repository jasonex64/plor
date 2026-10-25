-- M13 13d: the question bank (docs/milestones/M13-13d-the-question-bank.md). A day's questions come from
-- content/bank.json, picked by `npm run draft -- <date>`, so the admin page's "Write a day's questions" goes, and with it
-- the table it wrote and the guarded function that wrote it. Security change (DECISIONS.md Log; human, 2026-10-24: "I
-- approve 13d's design, its security change (dropping private.save_questions and its grant)"): plor_app loses its
-- execute grant on private.save_questions and its select on private.puzzle_questions, as both are dropped.
drop function private.save_questions(uuid, text, date, text[]);
drop table private.puzzle_questions;
