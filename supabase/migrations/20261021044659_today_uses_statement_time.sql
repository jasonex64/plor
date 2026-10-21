-- M02 2f, B21: "today" is the day of the statement being run, not of its transaction. now() is fixed when a
-- transaction starts, so a content:publish transaction begun just before midnight Pacific would run its UPDATE
-- after midnight against yesterday's date, and the started-day guard (refuse_started_puzzle_change) would let a
-- change to the new day through. statement_timestamp() is the start of the current statement (PostgreSQL 17,
-- "Current Date/Time"), and it stays the same for every row and trigger of one statement.
-- create or replace keeps the function's grants to plor_app and plor_publisher.
create or replace function private.today() returns date
  language sql stable
  return private.day_of(statement_timestamp());
