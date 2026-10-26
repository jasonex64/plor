-- private.audit_near names what a waiting near-typo could be linked to (docs/milestones/M14-14b-2b-2-admin-build.md,
-- 14b-2b-2b; migration 20261026095252_audit_near.sql): admins only, the category's members now bearing one of the
-- given texts, and nothing for a review that isn't a waiting near-typo. Run with `npm run test:sql`. The route, as
-- plor_app, is src/app/api/admin/audit/route.db.test.ts.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(6);

select private.import_source('wikidata', 'an-test', '[
  {"id": "an-animal", "name": "animal", "aliases": [{"alias": "an animal", "kind": "name"}]},
  {"id": "an-bear", "name": "bear", "aliases": [{"alias": "an bear", "kind": "name"}, {"alias": "an bears", "kind": "plural"}], "kind_of": ["an-animal"]},
  {"id": "an-rock", "name": "rock", "aliases": [{"alias": "an beer", "kind": "name"}]}
]'::jsonb);
select private.define_category('an_animal', 'animal', 'wikidata', 'an-animal', null);

create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@near.example.test' from generate_series(1, 2) as s(n);
insert into private.admin (user_id) values (pg_temp.u(1));
-- A waiting near-typo, a decided one, and a waiting text of another kind.
insert into private.miss_review (id, category, text, outcome, players, answered) overriding system value values
  (-31, 'an_animal', 'an bearz', 'near_typo', 3, 3),
  (-33, 'an_animal', 'an bearx', 'held', 3, 3);
insert into private.miss_review (id, category, text, outcome, players, answered, decision, decided_by, decided_at) overriding system value
  values (-32, 'an_animal', 'an beary', 'near_typo', 3, 3, 'dismissed', pg_temp.u(1), now());
create function pg_temp.near(review bigint, texts text[]) returns jsonb language sql
  return private.audit_near(pg_temp.u(1), review, texts);
create function pg_temp.bear() returns jsonb language sql
  return jsonb_build_array(jsonb_build_object('id', (select thing_id from private.thing_alias where alias = 'an bear'), 'name', 'bear'));

select throws_ok(format('select private.audit_near(%L, -31, array[%L])', pg_temp.u(2), 'an bear'), 'OB007', null,
  'a player who isn''t an admin can''t ask');
select is(pg_temp.near(-31, array['an bear', 'an bears', 'an beer']), pg_temp.bear(),
  'a waiting near-typo: the category''s members with those names, each once; a thing outside it isn''t one');
select is(pg_temp.near(-32, array['an bear']), '[]'::jsonb, 'nothing for a decided near-typo');
select is(pg_temp.near(-33, array['an bear']), '[]'::jsonb, 'nothing for a text that isn''t a near-typo');
select is(pg_temp.near(-31, array['an bearz']), '[]'::jsonb, 'nothing when no member has those names');
update private.thing_alias set removed_at = now() where alias in ('an bear', 'an bears');
select is(pg_temp.near(-31, array['an bear', 'an bears']), '[]'::jsonb, 'a name removed from the base doesn''t count');

select * from finish();
rollback;
