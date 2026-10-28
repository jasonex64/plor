-- Subsets of any category (docs/milestones/M13-13e-4-subsets.md, 13e-4a; the baseline migration): facts
-- and numbers on import, each filter, the frozen `where`, answers as of a day, the letter rule, misses on subsets, and
-- the new table's grants. Run with `npm run test:sql`. now() is fixed inside this transaction, so "earlier" moments
-- are made by moving timestamps back.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(46);

-- The base: countries (UN members) with continents and populations, capitals with their country, animals with a status.
create function pg_temp.c(id text, name text, continent text, pop bigint, extra jsonb = '[]') returns jsonb language sql
  return jsonb_build_object('id', id, 'name', name, 'kind_of', jsonb_build_array('sb-country'), 'member_of', jsonb_build_array('sb-un'),
    'continent', jsonb_build_array(continent), 'population', jsonb_build_object('value', pop, 'as_of', '2025-01-01'),
    'aliases', jsonb_build_array(jsonb_build_object('alias', lower(name), 'kind', 'name')) || extra);
select is(private.import_source('wikidata', 'sb-1', jsonb_build_array(
  '{"id": "sb-country", "name": "country", "aliases": [{"alias": "sb country", "kind": "name"}]}'::jsonb,
  '{"id": "sb-un", "name": "United Nations", "aliases": []}'::jsonb,
  '{"id": "sb-africa", "name": "Africa", "aliases": [{"alias": "sb africa", "kind": "name"}]}'::jsonb,
  '{"id": "sb-europe", "name": "Europe", "aliases": [{"alias": "sb europe", "kind": "name"}]}'::jsonb,
  pg_temp.c('sb-kenya', 'Kenya', 'sb-africa', 50000000), pg_temp.c('sb-ghana', 'Ghana', 'sb-africa', 30000000),
  pg_temp.c('sb-egypt', 'Egypt', 'sb-africa', 100000000), pg_temp.c('sb-guinea', 'Guinea', 'sb-africa', 13000000),
  pg_temp.c('sb-djibouti', 'Djibouti', 'sb-africa', 1000000), pg_temp.c('sb-denmark', 'Denmark', 'sb-europe', 5000000),
  pg_temp.c('sb-greece', 'Greece', 'sb-europe', 10000000), pg_temp.c('sb-dominica', 'Dominica', 'sb-europe', 70000),
  pg_temp.c('sb-gambia', 'The Gambia', 'sb-africa', 2000000, '[{"alias": "gambia", "kind": "synonym"}]'),
  pg_temp.c('sb-germany', 'Germany', 'sb-europe', 80000000, '[{"alias": "deutschland", "kind": "synonym"}]'),
  '{"id": "sb-capital", "name": "capital city", "aliases": []}'::jsonb,
  '{"id": "sb-nairobi", "name": "Nairobi", "aliases": [{"alias": "nairobi", "kind": "name"}], "kind_of": ["sb-capital"], "country": ["sb-kenya"]}'::jsonb,
  '{"id": "sb-athens", "name": "Athens", "aliases": [{"alias": "athens", "kind": "name"}], "kind_of": ["sb-capital"], "country": ["sb-greece"]}'::jsonb,
  '{"id": "sb-animal", "name": "animal", "aliases": []}'::jsonb,
  '{"id": "sb-endangered", "name": "endangered", "aliases": [{"alias": "sb endangered", "kind": "name"}]}'::jsonb,
  '{"id": "sb-lc", "name": "least concern", "aliases": []}'::jsonb,
  '{"id": "sb-tiger", "name": "tiger", "aliases": [{"alias": "sb tiger", "kind": "name"}], "kind_of": ["sb-animal"], "conservation_status": ["sb-endangered"]}'::jsonb,
  '{"id": "sb-cat", "name": "cat", "aliases": [{"alias": "sb cat", "kind": "name"}], "kind_of": ["sb-animal"], "conservation_status": ["sb-lc"]}'::jsonb
)) -> 'numbers', '10'::jsonb, 'an import adds its populations as number facts');
select is((select count(*)::int from private.fact f join private.thing_source s on s.thing_id = f.thing_id and s.source_id like 'sb-%'
  where f.trait in ('country', 'continent', 'conservation_status')), 14, 'and its country, continent and status facts');

select private.define_category('sb_country', 'country', 'wikidata', 'sb-country', 'sb-un');
select private.define_category('sb_capital', 'capital', 'wikidata', 'sb-capital', null);
select private.define_category('sb_animal', 'animal', 'wikidata', 'sb-animal', null);
select private.define_subset('sb_african', 'African country', 'sb_country', 'wikidata', '{"trait": "continent", "values": ["sb-africa"]}');
select private.define_subset('sb_big', 'big country', 'sb_country', 'wikidata', '{"number": "population", "at_least": 40000000}');
select private.define_subset('sb_g', 'country starting with G', 'sb_country', 'wikidata', '{"starts_with": "g"}');
select private.define_subset('sb_d', 'country starting with D', 'sb_country', 'wikidata', '{"starts_with": "d"}');
select private.define_subset('sb_african_capital', 'African capital', 'sb_capital', 'wikidata',
  '{"trait": "continent", "values": ["sb-africa"], "via": "country"}');
select private.define_subset('sb_endangered', 'endangered animal', 'sb_animal', 'wikidata', '{"trait": "conservation_status", "values": ["sb-endangered"]}');

create function pg_temp.id(ref text) returns uuid language sql return private.thing_by_ref('wikidata', ref);
create function pg_temp.names(cat text) returns text language sql
  return (select string_agg(t.name, ', ' order by t.name) from private.category_members(cat) m join private.thing t on t.id = m);

select is((select (root, member_of)::text from private.category where key = 'sb_african'),
  (select (root, member_of)::text from private.category where key = 'sb_country'), 'a subset takes its base''s root and member_of');
select throws_ok($$ select private.define_subset('sb_x', 'x', 'sb_nope', 'wikidata', '{"starts_with": "x"}') $$, 'P0001', null,
  'a subset of an unknown base is refused');
select throws_ok($$ select private.define_subset('sb_x', 'x', 'sb_country', 'wikidata', '{"trait": "continent", "values": ["sb-mars"]}') $$,
  'P0001', null, 'a fact value that isn''t loaded is refused');
select throws_ok($$ insert into private.category (key, name, root, starts_with, number_trait, at_least)
  values ('sb_two', 'two', private.thing_by_ref('wikidata', 'sb-country'), 'a', 'population', 1) $$, '23514', null,
  'a category holds one filter at most');

-- Each filter's members.
select is(pg_temp.names('sb_african'), 'Djibouti, Egypt, Ghana, Guinea, Kenya, The Gambia', 'a fact filter');
select is(pg_temp.names('sb_big'), 'Egypt, Germany, Kenya', 'a number filter: at least');
select is(pg_temp.names('sb_g'), 'Germany, Ghana, Greece, Guinea, The Gambia', 'a letter filter, a leading "the" ignored');
select is(pg_temp.names('sb_d'), 'Denmark, Djibouti, Dominica, Germany', 'any of a thing''s names can start with the letter (deutschland)');
select is(pg_temp.names('sb_african_capital'), 'Nairobi', 'a continent through the thing''s country');
select is(pg_temp.names('sb_endangered'), 'tiger', 'a status filter');
select private.define_subset('sb_either', 'animal of either status', 'sb_animal', 'wikidata', '{"trait": "conservation_status", "values": ["sb-endangered", "sb-lc"]}');
select is(pg_temp.names('sb_either'), 'cat, tiger', 'a fact filter of several values takes any of them (13e-4b)');
select ok(private.in_category_now(pg_temp.id('sb-kenya'), 'sb_african') and not private.in_category_now(pg_temp.id('sb-denmark'), 'sb_african'),
  'in_category_now applies the filter');

-- Approval freezes the filter as `where` (A1); a category without one gets none.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000aaaa', 'admin@subsets.example.test');
insert into private.admin (user_id) values ('00000000-0000-0000-0000-00000000aaaa');
create function pg_temp.q(cat text, host text, levels text[]) returns jsonb language sql return jsonb_build_object(
  'prompt', 'Name one', 'category', cat, 'host_bank', jsonb_build_array(pg_temp.id(host)), 'host_answers', jsonb_build_array(pg_temp.id(host)),
  'levels', (select jsonb_object_agg(pg_temp.id(l), 'common') from unnest(levels) as l));
select lives_ok($$ select private.approve_puzzle('00000000-0000-0000-0000-00000000aaaa', jsonb_build_object('format', 3, 'game_id', 'offbeat',
  'date', '2099-02-01', 'questions', jsonb_build_array(
    pg_temp.q('sb_african', 'sb-kenya', array['sb-ghana', 'sb-egypt', 'sb-guinea']),
    pg_temp.q('sb_country', 'sb-denmark', array['sb-ghana', 'sb-egypt', 'sb-kenya']),
    pg_temp.q('sb_g', 'sb-ghana', array['sb-greece', 'sb-germany', 'sb-gambia'])))) $$, 'a day of subsets is approved');
create function pg_temp.approved(i int) returns jsonb language sql
  return (select content -> 'questions' -> i from private.puzzle where game_id = 'offbeat' and puzzle_date = '2099-02-01');
select is(pg_temp.approved(0) -> 'where', jsonb_build_object('trait', 'continent', 'values', jsonb_build_array(pg_temp.id('sb-africa'))), 'a fact filter is frozen');
select ok(not (pg_temp.approved(1) ? 'where'), 'a category without a filter gets no where');
select is(pg_temp.approved(2) -> 'where', '{"starts_with": "g"}'::jsonb, 'a letter is frozen');
select is((pg_temp.approved(0) ->> 'members')::int, 6, 'the member count is the subset''s');
-- Past Djibouti the host, D has Denmark, Dominica and Germany ("deutschland"): 3 familiar answers. With U stolen,
-- "deutschland" can't be typed, and "germany", though typeable, doesn't start with D, so only 2 are left (O4).
select lives_ok($$ select private.approve_puzzle('00000000-0000-0000-0000-00000000aaaa', jsonb_build_object('format', 3, 'game_id', 'offbeat',
  'date', '2099-02-02', 'questions', jsonb_build_array(pg_temp.q('sb_d', 'sb-djibouti', array['sb-denmark', 'sb-dominica', 'sb-germany'])))) $$,
  'a letter subset''s familiar answers count its names starting with the letter');
select throws_ok($$ select private.approve_puzzle('00000000-0000-0000-0000-00000000aaaa', jsonb_build_object('format', 3, 'game_id', 'offbeat',
  'date', '2099-02-03', 'questions', jsonb_build_array(pg_temp.q('sb_d', 'sb-djibouti', array['sb-denmark', 'sb-dominica', 'sb-germany'])
    || '{"steals": "u"}'::jsonb))) $$,
  'OB009', null, 'and only those: a name not starting with it doesn''t make up for one the letters block');

-- Answers, as of the day.
create function pg_temp.resolves(d date, i int, t text) returns text language sql
  return (select string_agg(x.name, ', ' order by x.name) from private.resolve_answer('offbeat', d, i, array[t]) r join private.thing x on x.id = r.thing_id);
select is(pg_temp.resolves('2099-02-01', 0, 'ghana'), 'Ghana', 'a member of the subset is an answer');
select is(pg_temp.resolves('2099-02-01', 0, 'denmark'), null, 'a member of the base outside the subset isn''t');
select is(pg_temp.resolves('2099-02-01', 2, 'the gambia') || ' / ' || pg_temp.resolves('2099-02-01', 2, 'gambia'), 'The Gambia / The Gambia',
  'a typed name starting with the letter, a leading "the" ignored');
select is(pg_temp.resolves('2099-02-01', 2, 'deutschland'), null, 'a typed name must start with the letter itself (O4)');
select is(pg_temp.resolves('2099-02-01', 2, 'germany'), 'Germany', 'whichever name the player types');

-- A started day keeps what it had (answers as of the day: 13b). Everything in this base dates from 3 days ago, and
-- the old days' answers from 2; then a population, a continent and a name change now.
update private.thing_alias a set added_at = now() - interval '3 days' from private.thing_source s where s.thing_id = a.thing_id and s.source_id like 'sb-%';
update private.fact f set added_at = now() - interval '3 days' from private.thing_source s where s.thing_id = f.thing_id and s.source_id like 'sb-%';
update private.number_fact n set added_at = now() - interval '3 days' from private.thing_source s where s.thing_id = n.thing_id and s.source_id like 'sb-%';
select private.define_subset('sb_mid', 'country of 4,000,000+', 'sb_country', 'wikidata', '{"number": "population", "at_least": 4000000}');
create function pg_temp.old_day(d date, cat text) returns jsonb language sql return jsonb_build_object('format', 3, 'game_id', 'offbeat',
  'date', d, 'approved_at', now() - interval '2 days', 'questions', jsonb_build_array(jsonb_build_object('prompt', 'Name one',
  'category', cat, 'host_bank', '[]'::jsonb, 'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb,
  'root', pg_temp.id('sb-country'), 'member_of', pg_temp.id('sb-un'), 'members', 1,
  'where', (select private.category_where(c) from private.category c where c.key = cat))));
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', '2000-02-01', pg_temp.old_day('2000-02-01', 'sb_mid')),
  ('offbeat', '2000-02-02', pg_temp.old_day('2000-02-02', 'sb_african')),
  ('offbeat', '2000-02-03', pg_temp.old_day('2000-02-03', 'sb_d'));
select is(private.import_source('wikidata', 'sb-2', jsonb_build_array(pg_temp.c('sb-denmark', 'Denmark', 'sb-europe', 3000000))) -> 'numbers',
  '1'::jsonb, 'a changed population is a new number fact');
select is((select count(*)::int from private.number_fact where thing_id = pg_temp.id('sb-denmark') and removed_at = now()), 1, 'and the old one ends now');
select is(private.import_source('wikidata', 'sb-3', jsonb_build_array(pg_temp.c('sb-denmark', 'Denmark', 'sb-europe', 3000000))) -> 'numbers',
  '0'::jsonb, 'the same population again adds nothing');
update private.fact set removed_at = now() where thing_id = pg_temp.id('sb-kenya') and trait = 'continent';
update private.thing_alias set removed_at = now() where thing_id = pg_temp.id('sb-germany') and alias = 'deutschland';
select ok(not private.in_category_now(pg_temp.id('sb-denmark'), 'sb_mid'), 'the subset follows the new number');
select is(pg_temp.resolves('2000-02-01', 0, 'denmark'), 'Denmark', 'but a started day keeps the number it had');
select ok(not private.in_category_now(pg_temp.id('sb-kenya'), 'sb_african') and pg_temp.resolves('2000-02-02', 0, 'kenya') = 'Kenya',
  'and the facts');
select ok(not private.in_category_now(pg_temp.id('sb-germany'), 'sb_d') and pg_temp.resolves('2000-02-03', 0, 'deutschland') = 'Germany',
  'and the names a letter subset reads');

-- Misses on subsets (A2: "Learn only if it fits (Recommended)"): days asking each subset in question 1.
create function pg_temp.u(n int) returns uuid language sql immutable
  return ('00000000-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid;
insert into auth.users (id, email) select pg_temp.u(n), n || '@subsets.example.test' from generate_series(1, 3) as s(n);
insert into private.puzzle (game_id, puzzle_date, content)
  select 'offbeat', d, jsonb_build_object('format', 3, 'game_id', 'offbeat', 'date', d, 'approved_at', now() - interval '2 days',
    'questions', jsonb_build_array(jsonb_build_object('prompt', 'Name one', 'category', cat, 'host_bank', '[]'::jsonb,
      'host_answers', '[]'::jsonb, 'levels', '{}'::jsonb, 'root', (select root from private.category where key = cat),
      'member_of', (select member_of from private.category where key = cat), 'members', 1,
      'where', (select private.category_where(c) from private.category c where c.key = cat))))
  from (values ('2000-03-01'::date, 'sb_d'), ('2000-03-02', 'sb_african_capital'), ('2000-03-03', 'sb_african'), ('2000-03-04', 'sb_big'), ('2000-03-05', 'sb_either')) as v(d, cat);
insert into private.run (user_id, game_id, puzzle_date)
  select pg_temp.u(n), 'offbeat', d from generate_series(1, 3) as s(n)
  cross join (values ('2000-03-01'::date), ('2000-03-02'), ('2000-03-03'), ('2000-03-04'), ('2000-03-05')) as t(d);
create function pg_temp.missed3(d date, t text, listed boolean = false) returns void language sql
  return (select count(private.record_miss(pg_temp.u(n), 'offbeat', d, 0, t, t, false, listed, 3, 1)) from generate_series(1, 3) as s(n));
create function pg_temp.review(cat text, t text) returns private.miss_review language sql
  return (select r from private.miss_review r where r.category = cat and r.text = t);

select pg_temp.missed3('2000-03-01', 'zubrowka');
select is((pg_temp.review('sb_d', 'zubrowka')).id, null, 'a letter subset learns nothing from a text without its letter');
select pg_temp.missed3('2000-03-01', 'dragonia');
select is((pg_temp.review('sb_d', 'dragonia')).outcome, 'accepted', 'but learns one with it');
select ok(private.in_category_now((pg_temp.review('sb_d', 'dragonia')).thing_id, 'sb_d'), 'which is then a member of the subset');
select pg_temp.missed3('2000-03-03', 'sbwakandia');
select is((pg_temp.review('sb_african', 'sbwakandia')).outcome, 'accepted', 'a direct fact filter learns');
select ok(private.in_category_now((pg_temp.review('sb_african', 'sbwakandia')).thing_id, 'sb_african'), 'the new thing carries the fact');
select pg_temp.missed3('2000-03-02', 'sbmombasia');
select pg_temp.missed3('2000-03-04', 'sbatlantia');
select is((pg_temp.review('sb_african_capital', 'sbmombasia')).outcome || ' / ' || (pg_temp.review('sb_big', 'sbatlantia')).outcome,
  'held_subset / held_subset', 'a filter a new thing can''t carry (via, a number) holds the text for the human');
select private.audit_decide('00000000-0000-0000-0000-00000000aaaa', (pg_temp.review('sb_african_capital', 'sbmombasia')).id, 'accept', null);
select ok(private.in_category_now((pg_temp.review('sb_african_capital', 'sbmombasia')).thing_id, 'sb_african_capital'),
  'accepted by the human, it''s a member of the subset');
select private.audit_decide('00000000-0000-0000-0000-00000000aaaa', (pg_temp.review('sb_african_capital', 'sbmombasia')).id, 'undo', null);
select ok(not private.in_category_now((pg_temp.review('sb_african_capital', 'sbmombasia')).thing_id, 'sb_african_capital'),
  'and undoing it ends that');
-- A new thing can't be given one of several values: held, and the human's Accept makes it a member (13e-4b).
select pg_temp.missed3('2000-03-05', 'sbeitheria');
select is((pg_temp.review('sb_either', 'sbeitheria')).outcome, 'held_subset', 'a subset of several values holds the text');
select private.audit_decide('00000000-0000-0000-0000-00000000aaaa', (pg_temp.review('sb_either', 'sbeitheria')).id, 'accept', null);
select ok(private.in_category_now((pg_temp.review('sb_either', 'sbeitheria')).thing_id, 'sb_either'), 'and, accepted, it is a member');
-- A text held for the offensive-word list on such a subset joins it too once accepted (13e-4a review).
select pg_temp.missed3('2000-03-02', 'sblistedia', true);
select is((pg_temp.review('sb_african_capital', 'sblistedia')).outcome, 'held', 'a listed text is held as before');
select private.audit_decide('00000000-0000-0000-0000-00000000aaaa', (pg_temp.review('sb_african_capital', 'sblistedia')).id, 'accept', null);
select ok(private.in_category_now((pg_temp.review('sb_african_capital', 'sblistedia')).thing_id, 'sb_african_capital'),
  'and, accepted, is a member of the subset its filter can''t be checked on');

-- The new table holds no grant for the app (the functions plor_app runs read it as their owner).
select ok(not has_table_privilege('plor_app', 'private.number_fact', 'select') and not has_table_privilege('plor_app', 'private.number_fact', 'insert'),
  'plor_app can''t read or write number facts');

select * from finish();
rollback;
