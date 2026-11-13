-- A group's invite code is 10 base64url characters (docs/milestones/M14-14b-3-invite-button.md; friend codes ended in M17 17c;
-- supabase/migrations/20261028140000_baseline.sql). Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000014b3', 'invite-codes@example.test');

select lives_ok($$insert into private.player_group (id, name, creator_id, invite_code)
  values ('00000000-0000-0000-0000-00000000a14b', 'Codes', '00000000-0000-0000-0000-0000000014b3', 'bZ09_-bZ09')$$,
  'a group code of 10 base64url characters is accepted');
select throws_ok($$update private.player_group set invite_code = 'abcdefghijklmnopqrstuv' where id = '00000000-0000-0000-0000-00000000a14b'$$,
  '23514', null, 'a 22-character group code, the old size, is refused');
select throws_ok($$update private.player_group set invite_code = 'abcdefghi!' where id = '00000000-0000-0000-0000-00000000a14b'$$,
  '23514', null, 'a group code with a character outside base64url is refused');

select * from finish();
rollback;
