-- private.friend_invite and private.friendship keep their rules in the database
-- (docs/milestones/M07-friends-and-live-board.md, 7b). Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'f1@example.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'f2@example.test');

select lives_ok($$insert into private.friend_invite (user_id, code) values ('00000000-0000-0000-0000-0000000000f1', 'abcdefgh-_')$$,
  'a 10-character base64url code is accepted (M14 14b-3)');
select throws_ok($$insert into private.friend_invite (user_id, code) values ('00000000-0000-0000-0000-0000000000f2', 'abcdefgh-')$$,
  '23514', null, 'a 9-character code is rejected');
select throws_ok($$insert into private.friend_invite (user_id, code) values ('00000000-0000-0000-0000-0000000000f2', 'abcdefgh+/')$$,
  '23514', null, 'a code with characters outside base64url is rejected');
select throws_ok($$insert into private.friend_invite (user_id, code) values ('00000000-0000-0000-0000-0000000000f2', 'abcdefgh-_')$$,
  '23505', null, 'two players cannot share a code');
select throws_ok($$insert into private.friend_invite (user_id, code) values ('00000000-0000-0000-0000-0000000000f1', 'ABCDEFGH-_')$$,
  '23505', null, 'a player has one code (reset replaces it)');

select lives_ok($$insert into private.friendship (user_a, user_b) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2')$$,
  'a pair stored smaller ID first is accepted');
select throws_ok($$insert into private.friendship (user_a, user_b) values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1')$$,
  '23514', null, 'the same pair the other way round is rejected');
select throws_ok($$insert into private.friendship (user_a, user_b) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1')$$,
  '23514', null, 'a player cannot be their own friend');
select throws_ok($$insert into private.friendship (user_a, user_b) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2')$$,
  '23505', null, 'a pair is stored once');
select throws_ok($$insert into private.friendship (user_a, user_b) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000ff')$$,
  '23503', null, 'a friend must be an existing auth user');

-- Account deletion (M12) relies on these cascades.
delete from auth.users where id = '00000000-0000-0000-0000-0000000000f2';
select is((select count(*)::int from private.friendship where '00000000-0000-0000-0000-0000000000f2' in (user_a, user_b)), 0,
  'deleting a user deletes their friendships');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000f1';
select is((select count(*)::int from private.friend_invite where user_id = '00000000-0000-0000-0000-0000000000f1'), 0,
  'deleting a user deletes their invite code');

select * from finish();
rollback;
