-- plor_app must be a plain login role with nothing beyond what a milestone explicitly grants
-- (DECISIONS.md: App database role). Run with `npm run test:sql`.
begin;
-- Remotely, `supabase test db --linked` logs in as cli_login_postgres, which has no USAGE on the
-- `extensions` schema where pgTAP lives and no `extensions` on its search_path. pgTAP's own functions
-- call each other unqualified, so both are needed; both are scoped to this transaction only.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_role('plor_app');
-- The rename left no login behind under the old name (migration 20261019070813).
select hasnt_role('riff_app');
select ok((select rolcanlogin from pg_roles where rolname = 'plor_app'), 'plor_app can log in');
select ok(
  not (select rolsuper or rolcreaterole or rolcreatedb or rolreplication or rolbypassrls or rolinherit
       from pg_roles where rolname = 'plor_app'),
  'plor_app has no admin attributes, no RLS bypass, and does not inherit');
select ok(has_database_privilege('plor_app', 'postgres', 'connect'), 'plor_app can connect');
select ok(not has_schema_privilege('plor_app', 'public', 'usage'), 'plor_app cannot use schema public');
select ok(not has_database_privilege('plor_app', 'postgres', 'temporary'), 'plor_app cannot create temp tables');

-- A function created by postgres after the migration must not be executable by plor_app by default.
create function public.tx_probe_fn() returns int language sql as 'select 1';
select ok(not has_function_privilege('plor_app', 'public.tx_probe_fn()', 'execute'),
  'new functions are not executable by plor_app by default');

-- Guard against breaking Supabase itself: the Data API roles keep their own grant on public.
select ok(has_schema_privilege('anon', 'public', 'usage'), 'anon still uses schema public');
select ok(has_schema_privilege('authenticated', 'public', 'usage'), 'authenticated still uses schema public');

-- M02: reading and creating a profile, and nothing else (docs/milestones/M02-sign-in-and-play.md).
select ok(has_schema_privilege('plor_app', 'private', 'usage'), 'plor_app can use schema private');
select ok(not has_schema_privilege('plor_app', 'private', 'create'), 'plor_app cannot create objects in private');
select ok(has_table_privilege('plor_app', 'private.profile', 'select'), 'plor_app can read profiles');
-- M12 12c, A10: a profile is created with its user ID and username only, never username_changed_at.
select ok(has_column_privilege('plor_app', 'private.profile', 'username', 'insert')
  and not has_column_privilege('plor_app', 'private.profile', 'username_changed_at', 'insert'),
  'plor_app can create profiles, naming only the user ID and username');
-- A comma list is true when any one privilege is held, so this asserts none of them is.
select ok(not has_table_privilege('plor_app', 'private.profile', 'update, delete, truncate, references, trigger'),
  'plor_app cannot change whole rows of, delete, truncate, reference or trigger on profiles');

-- M02 2b, M03 and M06: everything plor_app may do in `private`, listed exactly (M02 ticket: "only the
-- grants these routes need"). A new grant has to be added here on purpose.
create function pg_temp.grants(who text) returns text[] language sql return (
  select array_agg(g order by g) from (
    select format('%s %s', c.oid::regclass, p.priv) as g
    from pg_class c
    cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate'), ('references'), ('trigger')) as p(priv)
    where c.relnamespace = 'private'::regnamespace and c.relkind in ('r', 'v', 'm', 'p', 'f')
      and has_table_privilege(who, c.oid, p.priv)
    union all
    select format('%s execute', f.oid::regprocedure)
    from pg_proc f
    where f.pronamespace = 'private'::regnamespace and has_function_privilege(who, f.oid, 'execute')
    union all
    -- Column grants (M07 7a), which has_table_privilege doesn't see.
    select format('%s.%s %s', c.oid::regclass, a.attname, p.priv)
    from pg_class c
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    cross join (values ('select'), ('insert'), ('update'), ('references')) as p(priv)
    where c.relnamespace = 'private'::regnamespace and c.relkind in ('r', 'v', 'm', 'p', 'f')
      and has_column_privilege(who, c.oid, a.attnum, p.priv) and not has_table_privilege(who, c.oid, p.priv)
  ) as held);
select is(pg_temp.grants('plor_app'), array[
  'private.admin select',
  -- Puzzle entry (M06): an admin's approval goes through a guarded function, never the table (M13 13d dropped the
  -- questions an admin typed, and their function).
  'private.approve_puzzle(uuid,jsonb) execute',
  -- The audit of what was learned from misses (M13 13b): admin-only functions read it, count what waits, and decide.
  'private.audit_decide(uuid,bigint,text,uuid) execute', 'private.audit_list(uuid) execute', 'private.audit_open_count(uuid) execute',
  -- The answer database (M13 13a, D1 a): no table grant; an admin's lookup goes through one guarded function.
  'private.base_lookup(uuid,text) execute',
  -- Sign-in code limits (M12 12e, L1 a): one function counts attempts per hashed key, one clears a key.
  'private.clear_auth_attempts(text,text) execute',
  -- Comments (M08 8a, D8): read, post, and delete your own (the route scopes the delete to the signed-in player).
  'private.comment delete', 'private.comment insert', 'private.comment select',
  -- An admin's deletion of a reported comment and its record are one guarded function; plor_app only reads the
  -- record (M12 12d, D1 a).
  'private.comment_deletion select',
  -- Reports (M08 8c, D8): a player reports; the routes read a player's own, to hide what they reported, and an admin
  -- reads them all. Deleting the comment removes its reports (cascade), so none is deleted directly.
  'private.comment_report insert', 'private.comment_report select',
  'private.day_of(timestamp with time zone) execute',
  -- Deleting your own account (M12 12c, A7): one guarded function, never Auth's table.
  'private.delete_account(uuid,text) execute',
  'private.delete_reported_comment(uuid,bigint) execute',
  -- Invite links and friends (M07 7b): a code is created and replaced on reset; friendships are added and removed.
  'private.friend_invite insert', 'private.friend_invite select',
  'private.friend_invite.code update',
  'private.friendship delete', 'private.friendship insert', 'private.friendship select',
  'private.give_back_auth_attempt(text,text) execute',
  -- Groups (M10 10b, G10): members join, leave and are removed; the handover trigger, not plor_app, sets the creator.
  'private.group_member delete', 'private.group_member insert', 'private.group_member select',
  -- Misses are read for the insights; one is logged only through private.record_miss (M13 13b).
  'private.missed_answer select',
  -- The reset countdown (M04 13c-4).
  'private.next_reset() execute',
  -- A group is created, read and deleted; its creator renames it and resets its link (M10 10b, G10).
  'private.player_group delete', 'private.player_group insert', 'private.player_group select',
  'private.player_group.invite_code update', 'private.player_group.name update',
  -- The points ledger (M09 9a, D7): append-only, written by settling and read by the leaderboard.
  'private.points_ledger insert', 'private.points_ledger select',
  'private.profile select',
  -- The display name (M07 7a) and the username (M12 12b, A2: once every 30 days, a trigger's rule) are the columns a
  -- player changes; a profile is created naming only its user ID and username (M12 12c, A10).
  'private.profile.display_name update', 'private.profile.user_id insert', 'private.profile.username insert',
  'private.profile.username update',
  'private.puzzle select',
  -- The status view and the answer trigger compute each question's deadline as plor_app (M04 13c-2), from when it
  -- was opened with Next (13c-4).
  'private.question_deadline(timestamp with time zone) execute',
  'private.question_open insert', 'private.question_open select',
  'private.question_started_at(uuid,text,date,integer) execute',
  -- Reactions (M08 8b, D8): read, react, and remove or replace your own (no update: a replace is a delete and an
  -- insert; the route scopes both to the signed-in player).
  'private.reaction delete', 'private.reaction insert', 'private.reaction select',
  -- Logging a miss, and learning from it once enough players typed it (M13 13b, D4).
  'private.record_miss(uuid,text,date,integer,text,text,boolean,boolean,integer,numeric) execute',
  -- A format-3 day's answers are resolved against the base, and named, through two guarded read-only functions (M13 13a-2).
  'private.resolve_answer(text,date,integer,text[]) execute',
  'private.run insert', 'private.run select',
  'private.run_event insert', 'private.run_event select',
  'private.run_status select',
  'private.take_auth_attempt(text,text,integer,interval) execute',
  'private.thing_names(uuid[]) execute',
  'private.today() execute'], 'plor_app holds exactly the grants the routes need');
select ok(not exists (select from pg_roles where rolname = 'plor_publisher'), 'plor_publisher is gone (M06: puzzles get in through the admin page)');

select * from finish();
rollback;
