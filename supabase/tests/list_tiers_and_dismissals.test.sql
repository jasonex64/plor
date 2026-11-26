-- 23e-2 (docs/milestones/M23-23e-drafting-and-approving.md, design 7 and 8): an admin gives an answer of a researched list
-- another tier, a list edit that waits for the fold like a strike or an add; the texts typed on a list's clock days that
-- are on no list are read for the Lists page, and one can be dismissed. Each for an admin only. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(40);

select private.import_source('research', 'lt-test', '[
  {"id": "lt_hat", "name": "lt hat"},
  {"id": "lt_hat/beanie", "name": "lt beanie", "aliases": [{"alias": "lt beanie", "kind": "name"}], "kind_of": ["lt_hat"]},
  {"id": "lt_hat/fez", "name": "lt fez", "aliases": [{"alias": "lt fez", "kind": "name"}], "kind_of": ["lt_hat"]},
  {"id": "lt_hat/beret", "name": "lt beret", "aliases": [{"alias": "lt beret", "kind": "name"}], "kind_of": ["lt_hat"]}
]'::jsonb);
select private.define_category('lt_hat', 'lt hat', 'research', 'lt_hat', null);
select private.import_source('wikidata', 'lt-test', '[
  {"id": "lt-animal", "name": "lt animal"},
  {"id": "lt-bear", "name": "lt bear", "aliases": [{"alias": "lt bear", "kind": "name"}], "kind_of": ["lt-animal"]}
]'::jsonb);
select private.define_category('lt_animal', 'lt animal', 'wikidata', 'lt-animal', null);

create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@lt.example.test' from generate_series(1, 5) as s(n);
insert into private.admin (user_id) values (pg_temp.u(1));

-- ---- Admins only ----
select throws_ok(format('select private.list_set_tier(%L, ''lt_hat'', ''lt beanie'', ''rare'')', pg_temp.u(2)), 'OB007', null, 'a non-admin cannot change a tier');
select throws_ok(format('select private.list_unset_tier(%L, ''lt_hat'', ''lt beanie'')', pg_temp.u(2)), 'OB007', null, 'nor undo one');
select throws_ok(format('select private.list_dismiss(%L, ''lt_hat'', ''lt trilby'')', pg_temp.u(2)), 'OB007', null, 'nor dismiss a text');
select throws_ok(format('select private.list_unlisted(%L, ''lt_hat'')', pg_temp.u(2)), 'OB007', null, 'nor read the texts on no list');
select is((select count(*) from private.list_edit) + (select count(*) from private.list_dismissed), 0::bigint, 'and nothing was written');

-- ---- Only researched lists ----
select throws_ok(format('select private.list_set_tier(%L, ''lt_animal'', ''lt bear'', ''rare'')', pg_temp.u(1)), 'OB012', null, 'no tier change in a category that is not a researched list');
select throws_ok(format('select private.list_dismiss(%L, ''lt_animal'', ''lt wolf'')', pg_temp.u(1)), 'OB012', null, 'no dismissal there');
select throws_ok(format('select private.list_unlisted(%L, ''lt_animal'')', pg_temp.u(1)), 'OB012', null, 'nor a read of its texts');

-- ---- A tier change ----
select lives_ok(format('select private.list_set_tier(%L, ''lt_hat'', ''lt beanie'', ''rare'')', pg_temp.u(1)), 'an admin gives an answer another tier');
select is((select kind || ' ' || name || ' ' || tier from private.list_edit where category = 'lt_hat'), 'tier lt beanie rare', 'the change is recorded');
select is(private.list_edits(pg_temp.u(1)) #>> '{edits,0,tier}', 'rare', 'the page reads its tier');
select lives_ok(format('select private.list_set_tier(%L, ''lt_hat'', ''lt beanie'', ''uncommon'')', pg_temp.u(1)), 'a second change to the same answer');
select is((select count(*)::int || ' ' || min(tier) from private.list_edit where category = 'lt_hat'), '1 uncommon', 'replaces the first');
select throws_ok(format('select private.list_set_tier(%L, ''lt_hat'', ''lt beanie'', ''epic'')', pg_temp.u(1)), 'OB012', null, 'a tier is common, uncommon or rare');
select throws_ok(format('select private.list_set_tier(%L, ''lt_hat'', ''lt nothing'', ''rare'')', pg_temp.u(1)), 'OB012', null, 'text that names no answer has no tier');
select lives_ok(format('select private.list_unset_tier(%L, ''lt_hat'', ''lt beanie'')', pg_temp.u(1)), 'Undo takes it back');
select is((select count(*)::int from private.list_edit), 0, 'and no edit is left to fold');
select throws_ok(format('select private.list_unset_tier(%L, ''lt_hat'', ''lt beanie'')', pg_temp.u(1)), 'OB012', null, 'no change, nothing to undo');

-- An answer added here and not yet in the file, or struck, has no tier to change.
select private.list_add(pg_temp.u(1), 'lt_hat', 'Lt Cap', 'lt cap');
select throws_ok(format('select private.list_set_tier(%L, ''lt_hat'', ''lt cap'', ''common'')', pg_temp.u(1)), 'OB012', null, 'an added answer not yet in the file has no tier to change');
select private.list_strike(pg_temp.u(1), 'lt_hat', 'lt fez');
select throws_ok(format('select private.list_set_tier(%L, ''lt_hat'', ''lt fez'', ''common'')', pg_temp.u(1)), 'OB012', null, 'nor has a struck one');

-- A tier change and a strike of the same answer are two edits.
select private.list_set_tier(pg_temp.u(1), 'lt_hat', 'lt beret', 'rare');
select lives_ok(format('select private.list_strike(%L, ''lt_hat'', ''lt beret'')', pg_temp.u(1)), 'an answer with a tier change can be struck');
select is((select count(*)::int from private.list_edit where category = 'lt_hat' and kind in ('tier', 'strike') and name = 'lt beret'), 2, 'both are kept');

-- The loader's fold marks a tier change folded, and the answer can be given a tier again.
select private.list_set_tier(pg_temp.u(1), 'lt_hat', 'lt beanie', 'rare');
select private.list_fold(array(select id from private.list_edit));
select is((select count(*)::int from private.list_edit where folded_at is null), 0, 'a folded tier change is marked');
select lives_ok(format('select private.list_set_tier(%L, ''lt_hat'', ''lt beanie'', ''common'')', pg_temp.u(1)), 'the answer can be given a tier again');
select is((select tier || ' ' || (folded_at is null)::text from private.list_edit where kind = 'tier' and name = 'lt beanie'), 'common true', 'and the edit waits again');

-- ---- The texts on no list ----
-- A day on a clock asking the hats first and the animals second, a day of seven questions asking the hats, and a second clock day.
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', '2000-03-01', jsonb_build_object('format', 4, 'game_id', 'offbeat', 'date', '2000-03-01', 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'hats', 'category', 'lt_hat', 'levels', '{}'::jsonb, 'rare', '[]'::jsonb, 'size', 1),
    jsonb_build_object('prompt', 'animals', 'category', 'lt_animal', 'levels', '{}'::jsonb, 'rare', '[]'::jsonb, 'size', 1)))),
  ('offbeat', '2000-03-02', jsonb_build_object('format', 3, 'game_id', 'offbeat', 'date', '2000-03-02', 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'hats', 'category', 'lt_hat')))),
  ('offbeat', '2000-03-03', jsonb_build_object('format', 4, 'game_id', 'offbeat', 'date', '2000-03-03', 'questions', jsonb_build_array(
    jsonb_build_object('prompt', 'hats', 'category', 'lt_hat', 'levels', '{}'::jsonb, 'rare', '[]'::jsonb, 'size', 1))));
insert into private.run (user_id, game_id, puzzle_date)
  select pg_temp.u(n), 'offbeat', d from generate_series(3, 5) as s(n) cross join (values ('2000-03-01'::date), ('2000-03-02'), ('2000-03-03')) as t(d);
create function pg_temp.typed(n int, d date, idx int, typed text, normalized text) returns void language sql
  as $$ insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed, normalized) values (pg_temp.u(n), 'offbeat', d, idx, typed, normalized) $$;
-- "lt trilby" by three players (on two clock days), "lt boater" by one, "lt beret" (a hat on the list) by two, "lt fedora" on the
-- day of seven questions only, "lt wolf" on the animal question, a text with no normal form, and an empty one.
select pg_temp.typed(3, '2000-03-01', 0, 'Lt Trilby', 'lt trilby'), pg_temp.typed(4, '2000-03-01', 0, 'Lt Trilby', 'lt trilby'), pg_temp.typed(5, '2000-03-03', 0, 'lt trilby', 'lt trilby'),
  pg_temp.typed(3, '2000-03-03', 0, 'lt boater', 'lt boater'), pg_temp.typed(3, '2000-03-01', 0, 'lt beret', 'lt beret'), pg_temp.typed(4, '2000-03-01', 0, 'lt beret', 'lt beret'),
  pg_temp.typed(3, '2000-03-02', 0, 'lt fedora', 'lt fedora'), pg_temp.typed(3, '2000-03-01', 1, 'lt wolf', 'lt wolf'),
  pg_temp.typed(4, '2000-03-03', 0, 'old', null), pg_temp.typed(4, '2000-03-03', 0, '!', '');
select is(private.list_unlisted(pg_temp.u(1), 'lt_hat'),
  '[{"name": "Lt Trilby", "text": "lt trilby", "players": 3}, {"name": "lt boater", "text": "lt boater", "players": 1}]'::jsonb,
  'the texts typed on the list''s clock days that are on no list, most players first, each with its players');
select is(private.list_unlisted(pg_temp.u(1), 'lt_hat') #>> '{0,players}', '3', 'the players are counted once each');

select lives_ok(format('select private.list_dismiss(%L, ''lt_hat'', ''lt boater'')', pg_temp.u(1)), 'an admin dismisses a text');
select is(jsonb_array_length(private.list_unlisted(pg_temp.u(1), 'lt_hat')), 1, 'it stops showing');
select pg_temp.typed(4, '2000-03-03', 0, 'lt boater', 'lt boater'), pg_temp.typed(5, '2000-03-01', 0, 'lt boater', 'lt boater');
select is(private.list_unlisted(pg_temp.u(1), 'lt_hat') #>> '{0,text}', 'lt trilby', 'typed again by more players it stays dismissed');
select is(jsonb_array_length(private.list_unlisted(pg_temp.u(1), 'lt_hat')), 1, 'and is not listed');
select lives_ok(format('select private.list_dismiss(%L, ''lt_hat'', ''lt boater'')', pg_temp.u(1)), 'dismissing it again is no error');
select throws_ok(format('select private.list_dismiss(%L, ''lt_hat'', '''')', pg_temp.u(1)), 'OB012', null, 'an empty text cannot be dismissed');
select is((select count(*)::int from private.base_log where action = 'list' and detail ->> 'action' = 'dismiss'), 1, 'a dismissal is logged once');
select lives_ok(format('select private.list_add(%L, ''lt_hat'', ''Lt Trilby'', ''lt trilby'')', pg_temp.u(1)), 'an admin adds a text that is on no list');
select is(private.list_unlisted(pg_temp.u(1), 'lt_hat'), '[]'::jsonb, 'and it no longer shows');

-- ---- Who may run what ----
select ok(has_function_privilege('plor_app', 'private.list_set_tier(uuid, text, text, text)', 'execute')
  and has_function_privilege('plor_app', 'private.list_unset_tier(uuid, text, text)', 'execute')
  and has_function_privilege('plor_app', 'private.list_dismiss(uuid, text, text)', 'execute')
  and has_function_privilege('plor_app', 'private.list_unlisted(uuid, text)', 'execute'), 'the app role runs the four functions');
select ok(not (has_function_privilege('anon', 'private.list_set_tier(uuid, text, text, text)', 'execute')
  or has_function_privilege('authenticated', 'private.list_unset_tier(uuid, text, text)', 'execute')
  or has_function_privilege('service_role', 'private.list_dismiss(uuid, text, text)', 'execute')
  or has_function_privilege('anon', 'private.list_unlisted(uuid, text)', 'execute')), 'no other role does');
select ok(not (has_table_privilege('plor_app', 'private.list_dismissed', 'select') or has_table_privilege('anon', 'private.list_dismissed', 'select')
  or has_table_privilege('authenticated', 'private.list_dismissed', 'select') or has_table_privilege('service_role', 'private.list_dismissed', 'select')),
  'no role reads the table of dismissals');
select ok((select relrowsecurity from pg_class where oid = 'private.list_dismissed'::regclass), 'the table has row-level security on');

select * from finish();
rollback;
