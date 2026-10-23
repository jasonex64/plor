-- private.profile enforces the username rules and follows its auth user
-- (docs/milestones/M02-sign-in-and-play.md, Numbers; M00 data design §3). Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(35);

select has_table('private', 'profile', 'private.profile exists');
select ok((select relrowsecurity from pg_class where oid = 'private.profile'::regclass), 'RLS is enabled');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.test');

select lives_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000a', 'a_1')$$,
  'lower-case letters, digits and underscore at the 3-character minimum are accepted');
select lives_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000b', 'abcdefghij0123456789')$$,
  'a 20-character username is accepted');

select throws_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000c', 'ab')$$,
  '23514', null, 'a 2-character username is rejected');
select throws_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000c', 'abcdefghij0123456789x')$$,
  '23514', null, 'a 21-character username is rejected');
select throws_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000c', 'Abc')$$,
  '23514', null, 'an upper-case letter is rejected (the check casts citext to text)');
select throws_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000c', 'a-b')$$,
  '23514', null, 'a character outside a-z 0-9 _ is rejected');
select throws_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000c', 'a_1')$$,
  '23505', null, 'a username that is taken is rejected');
select throws_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000a', 'other')$$,
  '23505', null, 'a second profile for the same user is rejected');
select throws_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-0000000000ff', 'nouser')$$,
  '23503', null, 'a profile needs an existing auth user');

-- M07 7a: the display name rules (docs/milestones/M07-friends-and-live-board.md, D1).
select is((select display_name from private.profile where user_id = '00000000-0000-0000-0000-00000000000b'), null, 'a new profile has no display name');
select lives_ok($$update private.profile set display_name = 'Zoë Ann-Marie O''Neil' where user_id = '00000000-0000-0000-0000-00000000000b'$$, 'letters with accents, a space, a hyphen and an apostrophe are accepted');
select lives_ok($$update private.profile set display_name = '名前 Łukasz 2.0_x' where user_id = '00000000-0000-0000-0000-00000000000b'$$, 'other scripts, digits, a dot and an underscore are accepted');
select lives_ok($$update private.profile set display_name = repeat('a', 24) where user_id = '00000000-0000-0000-0000-00000000000b'$$, 'a 24-character display name is accepted');
select throws_ok($$update private.profile set display_name = repeat('a', 25) where user_id = '00000000-0000-0000-0000-00000000000b'$$, '23514', null, 'a 25-character display name is rejected');
select throws_ok($$update private.profile set display_name = '' where user_id = '00000000-0000-0000-0000-00000000000b'$$, '23514', null, 'an empty display name is rejected (clearing is null)');
select throws_ok($$update private.profile set display_name = ' Zoe' where user_id = '00000000-0000-0000-0000-00000000000b'$$, '23514', null, 'a leading space is rejected');
select throws_ok($$update private.profile set display_name = 'Zoe  Ann' where user_id = '00000000-0000-0000-0000-00000000000b'$$, '23514', null, 'a double space is rejected');
select throws_ok($$update private.profile set display_name = 'Zoe 😀' where user_id = '00000000-0000-0000-0000-00000000000b'$$, '23514', null, 'an emoji is rejected');
select lives_ok($$update private.profile set display_name = U&'\00C5ngstr\00F6m' where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'the composed letter Å is accepted (control for the next test)');
select throws_ok($$update private.profile set display_name = U&'\212Bngstr\00F6m' where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  '23514', null, 'a name not in NFC is rejected: the Angstrom sign passes [[:alpha:]] but NFC turns it into Å');
select lives_ok($$update private.profile set display_name = 'Sam' where user_id in ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a')$$,
  'two players may share a display name');

-- M12 12b: a username changes at most once every 30 days, the first change at once (docs/milestones/M12-account.md, A2).
select is((select username_changed_at from private.profile where user_id = '00000000-0000-0000-0000-00000000000b'), null,
  'a username that has never changed has no change time');
select lives_ok($$update private.profile set username = 'b_new' where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'the first change is allowed at once, so a wrong pick at sign-up can be fixed');
select isnt((select username_changed_at from private.profile where user_id = '00000000-0000-0000-0000-00000000000b'), null,
  'a change records when it happened');
select lives_ok($$insert into private.profile (user_id, username) values ('00000000-0000-0000-0000-00000000000c', 'abcdefghij0123456789')$$,
  'the old username is free for anyone at once');
select throws_ok($$update private.profile set username = 'b_again' where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'OB011', null, 'a second change within 30 days of the last is refused');
update private.profile set username_changed_at = now() - interval '29 days 23:59:59' where user_id = '00000000-0000-0000-0000-00000000000b';
select throws_ok($$update private.profile set username = 'b_again' where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'OB011', null, 'a change a second short of 30 days after the last is refused');
update private.profile set username_changed_at = now() - interval '30 days 1 second' where user_id = '00000000-0000-0000-0000-00000000000b';
select lives_ok($$update private.profile set username = 'b_again' where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'a change more than 30 days after the last is allowed');
select throws_ok($$update private.profile set username = 'Bad' where user_id = '00000000-0000-0000-0000-00000000000c'$$,
  '23514', null, 'a change still follows the format rule');
select throws_ok($$update private.profile set username = 'b_again' where user_id = '00000000-0000-0000-0000-00000000000c'$$,
  '23505', null, 'a change to a taken username is refused');

-- The column type keeps uniqueness case-insensitive even if the format rule is ever relaxed.
select is((select data_type || '/' || udt_name from information_schema.columns
           where table_schema = 'private' and table_name = 'profile' and column_name = 'username'),
  'USER-DEFINED/citext', 'username is citext');

-- Account deletion (M12) relies on this cascade even though plor_app has no DELETE.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*)::int from private.profile where user_id = '00000000-0000-0000-0000-00000000000a'), 0,
  'deleting the auth user deletes the profile');
-- Only this test's users: the table may already hold real profiles (staging) or test:db leftovers (M02 review).
select is((select count(*)::int from private.profile where user_id in (
    '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c')),
  2, 'other profiles are untouched (b, and c from the username change tests)');

select * from finish();
rollback;
