-- The admin's review of a researched list (docs/milestones/M23-23b-research-and-review.md, 23b-2): a strike ends an
-- answer at the next midnight and can be undone before it, an add counts, a list is marked seen, each for an admin
-- only. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(35);

-- A researched list of four hats, and a category that isn't researched.
select private.import_source('research', 'lr-test', '[
  {"id": "lr_hat", "name": "lr hat"},
  {"id": "lr_hat/beanie", "name": "lr beanie", "aliases": [{"alias": "lr beanie", "kind": "name"}], "kind_of": ["lr_hat"]},
  {"id": "lr_hat/fez", "name": "lr fez", "aliases": [{"alias": "lr fez", "kind": "name"}], "kind_of": ["lr_hat"]},
  {"id": "lr_hat/beret", "name": "lr beret", "aliases": [{"alias": "lr beret", "kind": "name"}], "kind_of": ["lr_hat"]}
]'::jsonb);
select private.define_category('lr_hat', 'lr hat', 'research', 'lr_hat', null);
select private.import_source('wikidata', 'lr-test', '[
  {"id": "lr-animal", "name": "lr animal"},
  {"id": "lr-bear", "name": "lr bear", "aliases": [{"alias": "lr bear", "kind": "name"}], "kind_of": ["lr-animal"]}
]'::jsonb);
select private.define_category('lr_animal', 'lr animal', 'wikidata', 'lr-animal', null);

create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@lists.example.test' from generate_series(1, 2) as s(n);
insert into private.admin (user_id) values (pg_temp.u(1));

-- Whether typed text is an answer of the list at a time, as a day that started then would judge it.
create function pg_temp.counts(p_text text, p_at timestamptz) returns boolean language sql
  return exists (select from private.resolve_in(
    jsonb_build_object('category', 'lr_hat', 'root', (select root from private.category where key = 'lr_hat')), p_at, array[p_text]));
create function pg_temp.tomorrow() returns timestamptz language sql return private.next_reset() + interval '1 second';

-- ---- Admins only ----
select throws_ok(format('select private.list_strike(%L, ''lr_hat'', ''lr beanie'')', pg_temp.u(2)), 'OB007', null, 'a non-admin cannot strike');
select throws_ok(format('select private.list_unstrike(%L, ''lr_hat'', ''lr beanie'')', pg_temp.u(2)), 'OB007', null, 'nor undo a strike');
select throws_ok(format('select private.list_add(%L, ''lr_hat'', ''Lr Cap'', ''lr cap'')', pg_temp.u(2)), 'OB007', null, 'nor add an answer');
select throws_ok(format('select private.list_mark_seen(%L, ''lr_hat'')', pg_temp.u(2)), 'OB007', null, 'nor mark a list seen');
select throws_ok(format('select private.list_edits(%L)', pg_temp.u(2)), 'OB007', null, 'nor read the edits');
select is((select count(*) from private.list_edit) + (select count(*) from private.list_seen), 0::bigint, 'and nothing was written');
select ok(pg_temp.counts('lr beanie', pg_temp.tomorrow()), 'the refused strike ended nothing');

-- ---- Only researched lists ----
select throws_ok(format('select private.list_strike(%L, ''lr_animal'', ''lr bear'')', pg_temp.u(1)), 'OB012', null, 'no strike in a category that is not a researched list');
select throws_ok(format('select private.list_add(%L, ''lr_animal'', ''Lr Wolf'', ''lr wolf'')', pg_temp.u(1)), 'OB012', null, 'no add there either');

-- ---- A strike, and its undo ----
select lives_ok(format('select private.list_strike(%L, ''lr_hat'', ''lr beanie'')', pg_temp.u(1)), 'an admin strikes an answer');
select ok(pg_temp.counts('lr beanie', now()), 'it is still an answer today');
select ok(not pg_temp.counts('lr beanie', pg_temp.tomorrow()), 'and not from the next midnight');
select is((select kind || ' ' || name from private.list_edit where category = 'lr_hat'), 'strike lr beanie', 'the strike is recorded');
select throws_ok(format('select private.list_strike(%L, ''lr_hat'', ''lr beanie'')', pg_temp.u(1)), 'OB012', null, 'an answer is not struck twice');
select throws_ok(format('select private.list_strike(%L, ''lr_hat'', ''lr nothing'')', pg_temp.u(1)), 'OB012', null, 'text that names no answer cannot be struck');
select lives_ok(format('select private.list_unstrike(%L, ''lr_hat'', ''lr beanie'')', pg_temp.u(1)), 'Undo before midnight');
select ok(pg_temp.counts('lr beanie', pg_temp.tomorrow()), 'it is an answer after midnight again');
select is((select count(*) from private.list_edit), 0::bigint, 'and no edit is left to fold');
select throws_ok(format('select private.list_unstrike(%L, ''lr_hat'', ''lr beanie'')', pg_temp.u(1)), 'OB012', null, 'no strike, nothing to undo');

-- A strike whose midnight has passed (its end moved to now) can no longer be undone.
select lives_ok(format('select private.list_strike(%L, ''lr_hat'', ''lr fez'')', pg_temp.u(1)), 'a second strike');
update private.fact set removed_at = now() where removed_at = private.next_reset()
  and thing_id = (select thing_id from private.thing_alias where alias = 'lr fez');
select throws_ok(format('select private.list_unstrike(%L, ''lr_hat'', ''lr fez'')', pg_temp.u(1)), 'OB012', null, 'no Undo once the answer has stopped');

-- ---- An add ----
select lives_ok(format('select private.list_add(%L, ''lr_hat'', '' Lr Party Hat '', ''lr party hat'')', pg_temp.u(1)), 'an admin adds an answer');
select ok(pg_temp.counts('lr party hat', now()), 'it is an answer at once');
select is((select kind || ' ' || name from private.list_edit where category = 'lr_hat' and kind = 'add'), 'add Lr Party Hat', 'the add is recorded with the name as written');
select throws_ok(format('select private.list_add(%L, ''lr_hat'', ''Lr Party Hat'', ''lr party hat'')', pg_temp.u(1)), 'OB012', null, 'an answer is not added twice');
select throws_ok(format('select private.list_add(%L, ''lr_hat'', ''Lr Beret'', ''lr beret'')', pg_temp.u(1)), 'OB012', null, 'nor one the list already has');
select throws_ok(format('select private.list_add(%L, ''lr_hat'', '' '', '''')', pg_temp.u(1)), 'OB012', null, 'nor one with no name');
select lives_ok(format('select private.list_strike(%L, ''lr_hat'', ''lr party hat'')', pg_temp.u(1)), 'striking an added answer');
select is((select count(*) from private.list_edit where kind = 'add'), 0::bigint, 'takes the add back: nothing of it is left to fold');

-- ---- Seen, and the page's read ----
select lives_ok(format('select private.list_mark_seen(%L, ''lr_hat'')', pg_temp.u(1)), 'an admin marks the list seen');
select lives_ok(format('select private.list_mark_seen(%L, ''lr_hat'')', pg_temp.u(1)), 'and again');
select is(private.list_edits(pg_temp.u(1)) #>> '{edits,0,name}', 'lr fez', 'the page reads the edit not yet folded');
select is(jsonb_array_length(private.list_edits(pg_temp.u(1)) -> 'seen'), 1, 'and the one list seen');

-- ---- The loader's fold ----
select private.list_add(pg_temp.u(1), 'lr_hat', 'Lr Top Hat', 'lr top hat');
select private.list_fold(array(select id from private.list_edit));
select is((select count(*) from private.list_edit where folded_at is null), 0::bigint, 'folded edits are marked');
select ok(pg_temp.counts('lr top hat', now()) and not pg_temp.counts('lr top hat', pg_temp.tomorrow()),
  'a folded add''s own thing stops at midnight, when the file''s line takes over');

select * from finish();
rollback;
