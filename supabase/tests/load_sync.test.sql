-- Removal on load (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3a): a load ends the names, facts, links
-- and populations the files no longer give at the next midnight and erases them on a load after it, erases the
-- categories the file no longer lists, shows each thing the name the files give, and never erases a thing, a player's
-- row or an admin's decision. Run with `npm run test:sql`. load_finish ends rows across the whole base, so this runs in
-- a transaction rolled back, and sets a loaded base's names, facts and populations aside first: ending them all at each
-- finish took 95 s and left 7.6 million dead rows (1.7 GB) on the Mac's base after two runs, and would lock every row
-- of plor.app's base while it ran.
-- A truncate inside the transaction is undone by the rollback and leaves no dead rows.
begin;
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(23);
truncate private.thing_alias, private.fact, private.number_fact;

-- Two small trees: "ls" loaded from files A and then B, "lf" loaded fresh from B, in the same test sources' IDs. Each
-- has a WordNet item joining an item of another source (wikidata), whose name the thing shows.
create function pg_temp.files(p text, version text) returns jsonb language sql return (
  case version
  when 'A' then format('[
    {"id": "%1$s-root", "name": "%1$s root", "aliases": [{"alias": "%1$s root", "kind": "name"}]},
    {"id": "%1$s-a", "name": "%1$s a", "aliases": [{"alias": "%1$s a", "kind": "name"}, {"alias": "%1$s alpha", "kind": "synonym"}],
      "kind_of": ["%1$s-root"], "population": {"value": 5, "as_of": "2020-01-01"}},
    {"id": "%1$s-b", "name": "%1$s b", "aliases": [{"alias": "%1$s b", "kind": "name"}], "kind_of": ["%1$s-root"]},
    {"id": "%1$s-c", "name": "%1$s c", "aliases": [{"alias": "%1$s c", "kind": "name"}], "kind_of": ["%1$s-a"]},
    {"id": "%1$s-o", "name": "%1$s o", "aliases": [{"alias": "%1$s o", "kind": "name"}], "same_as": "wikidata:%1$s-w", "kind_of": ["%1$s-root"]}]', p)
  else format('[
    {"id": "%1$s-root", "name": "%1$s root", "aliases": [{"alias": "%1$s root", "kind": "name"}]},
    {"id": "%1$s-a", "name": "%1$s aye", "aliases": [{"alias": "%1$s a", "kind": "name"}, {"alias": "%1$s aye", "kind": "name"}],
      "kind_of": ["%1$s-root"]},
    {"id": "%1$s-c", "name": "%1$s c", "aliases": [{"alias": "%1$s c", "kind": "name"}], "kind_of": ["%1$s-a"],
      "population": {"value": 7, "as_of": "2020-01-01"}},
    {"id": "%1$s-o", "name": "%1$s oh", "aliases": [{"alias": "%1$s oh", "kind": "name"}], "same_as": "wikidata:%1$s-w", "kind_of": ["%1$s-root"]}]', p)
  end)::jsonb;
-- Files C: A with ls-c renamed.
create function pg_temp.files_c(p text) returns jsonb language sql return (
  select jsonb_agg(case when i->>'id' = p || '-c'
    then i || jsonb_build_object('name', p || ' see', 'aliases', jsonb_build_array(jsonb_build_object('alias', p || ' see', 'kind', 'name')))
    else i end) from jsonb_array_elements(pg_temp.files(p, 'A')) as i);
create function pg_temp.load(p text, version text) returns void language sql begin atomic
  select private.import_source('wikidata', 'load-sync-test', format('[{"id": "%1$s-w", "name": "%1$s w", "aliases": [{"alias": "%1$s w", "kind": "name"}]}]', p)::jsonb);
  select private.import_source('oewn', 'load-sync-test', case when version = 'C' then pg_temp.files_c(p) else pg_temp.files(p, version) end);
end;
create function pg_temp.link(p text, c_name text default 'c') returns jsonb language sql
  return private.load_links(format('[{"thing": "oewn:%1$s-c", "name": "%1$s %2$s", "kind_of": "oewn:%1$s-root", "kind_of_name": "%1$s root"}]', p, c_name)::jsonb);
create function pg_temp.id(ref text) returns uuid language sql return private.thing_by_ref('oewn', ref);
-- The names a thing has now.
create function pg_temp.names(ref text) returns text[] language sql
  return (select coalesce(array_agg(a.alias order by a.alias), '{}') from private.thing_alias a where a.thing_id = pg_temp.id(ref) and a.removed_at is null);
-- Every category but the test's, so a finish here erases only those.
create function pg_temp.categories(keep text[]) returns text[] language sql
  return array(select key from private.category where key not like 'ls\_%') || keep;
-- A tree's rows the load owns, as a day starting at the next midnight reads them: names, facts and populations by
-- shown names, and the shown name of each thing that has a name then, the prefix made "ls".
create function pg_temp.tree(p text) returns text[] language sql return (
  with m as (select (private.today() + 1)::timestamp at time zone 'America/Los_Angeles' as at),
  t as (select id, name from private.thing where name like p || ' %'),
  lines(line) as (
    select 'name ' || t.name || ': ' || a.alias || ' ' || a.kind from t
    join private.thing_alias a on a.thing_id = t.id cross join m
    where a.origin = 'source' and (a.removed_at is null or a.removed_at > m.at)
    union all
    select 'fact ' || t.name || ': ' || f.trait || ' ' || v.name || ' ' || f.origin from t
    join private.fact f on f.thing_id = t.id join private.thing v on v.id = f.value_thing cross join m
    where f.origin in ('source', 'ai') and (f.removed_at is null or f.removed_at > m.at)
    union all
    select 'number ' || t.name || ': ' || n.trait || ' ' || n.value from t
    join private.number_fact n on n.thing_id = t.id cross join m
    where n.origin = 'source' and (n.removed_at is null or n.removed_at > m.at)
  )
  select array_agg(x order by x) from (select replace(line, p || ' ', 'ls ') from lines) as l(x));

-- Load 1: files A for "ls", with a link, two categories, a player's name and an admin's fact no file gives.
select private.load_begin();
select pg_temp.load('ls', 'A');
select pg_temp.link('ls');
select private.define_category('ls_root', 'ls root', 'oewn', 'ls-root', null);
select private.define_category('ls_gone', 'ls gone', 'oewn', 'ls-root', null);
insert into private.thing_alias (thing_id, alias, kind, origin, source_ref) values (pg_temp.id('ls-a'), 'ls player', 'synonym', 'players', 'miss:ls_root');
insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (pg_temp.id('ls-b'), 'member_of', pg_temp.id('ls-root'), 'human', 'audit');
select private.load_finish(pg_temp.categories(array['ls_root', 'ls_gone']));

-- Load 2: files B for "ls" (ls-a drops "ls alpha" and its population and is renamed, ls-b leaves its snapshot, ls-c
-- gains a population, ls-o is renamed), no link, ls_gone out of the file; and "lf" loaded fresh from B.
select private.load_begin();
select pg_temp.load('ls', 'B');
select pg_temp.load('lf', 'B');
select is(private.load_finish(pg_temp.categories(array['ls_root'])) -> 'categories', '["ls_gone"]'::jsonb,
  'a category no longer in the file is erased');
select is(pg_temp.tree('ls'), pg_temp.tree('lf'), 'from the next midnight, the reloaded tree is the fresh one');
select ok(not exists (select from private.category where key = 'ls_gone'), 'the erased category is gone');

-- Today stays as it began: the ended rows are there, ending at the next midnight; the base as it is now no longer has them.
select is((select removed_at from private.thing_alias where thing_id = pg_temp.id('ls-a') and alias = 'ls alpha'),
  (private.today() + 1)::timestamp at time zone 'America/Los_Angeles', 'a dropped name ends at the next midnight, not now');
select is(pg_temp.names('ls-a'), array['ls a', 'ls aye', 'ls player'], 'the base as it is now: the dropped name gone, a player''s name kept');
select is((select count(*)::int from private.fact where thing_id = pg_temp.id('ls-c') and origin = 'ai' and source_ref = 'links' and removed_at > now()), 1,
  'a link links.json dropped ends at midnight');
select is((select count(*)::int from private.number_fact where thing_id = pg_temp.id('ls-a') and removed_at > now()), 1,
  'a population the files dropped ends at midnight');
select is(pg_temp.names('ls-b'), '{}'::text[], 'an item that left its snapshot has no names now');
select is((select name from private.thing where id = pg_temp.id('ls-b')), 'ls b', 'its thing row and shown name stay');
select is((select count(*)::int from private.fact where thing_id = pg_temp.id('ls-b') and origin = 'human' and removed_at is null), 1, 'an admin''s fact stays');
select is(array[(select name from private.thing where id = pg_temp.id('ls-a')), (select name from private.thing where id = pg_temp.id('ls-o'))],
  array['ls aye', 'ls oh'], 'shown names follow the files, a joining WordNet item''s too');

-- Load 3, the same day: files A again (ls-c renamed "ls see", as the link now names it) bring back what load 2 ended.
select private.load_begin();
select pg_temp.load('ls', 'C');
select lives_ok($$ select pg_temp.link('ls', 'see') $$, 'a link naming a thing by the name this load gives it loads on a loaded base');
select private.load_finish(pg_temp.categories(array['ls_root']));
select is((select name from private.thing where id = pg_temp.id('ls-c')), 'ls see', 'and the rename lands');
select is((select removed_at from private.thing_alias where thing_id = pg_temp.id('ls-a') and alias = 'ls alpha'), null,
  'a name the files give again before midnight stays');
select is((select count(*)::int from private.number_fact where thing_id = pg_temp.id('ls-a') and removed_at is null), 1,
  'and a population, once');

-- Load 4 ends them again (files B). A load that fails half-way (a begin, an import, no finish) brings back only what
-- its imports give.
select private.load_begin();
select pg_temp.load('ls', 'B');
select private.load_finish(pg_temp.categories(array['ls_root']));
select private.load_begin();
select pg_temp.load('ls', 'B');
select is((select removed_at > now() from private.thing_alias where thing_id = pg_temp.id('ls-a') and alias = 'ls alpha'), true,
  'a load that never finishes brings back nothing its files don''t give');
-- Then midnight passes (the ended rows' times moved a day back): a load keeps them a day more, for a run finished late.
create function pg_temp.pass_a_day() returns void language sql begin atomic
  update private.thing_alias set added_at = added_at - interval '1 day', removed_at = removed_at - interval '1 day' where removed_at > now() - interval '1 day';
  update private.fact set added_at = added_at - interval '1 day', removed_at = removed_at - interval '1 day' where removed_at > now() - interval '1 day';
  update private.number_fact set added_at = added_at - interval '1 day', removed_at = removed_at - interval '1 day' where removed_at > now() - interval '1 day';
end;
select pg_temp.pass_a_day();
select private.load_begin();
select ok(exists (select from private.thing_alias where thing_id = pg_temp.id('ls-a') and alias = 'ls alpha'), 'the day after it ended, the name is still there');
-- A day later, a load erases them.
select pg_temp.pass_a_day();
select ok((private.load_begin() ->> 'aliases')::int > 0, 'a load a day after that erases what ended');
select ok(not exists (select from private.thing_alias where thing_id = pg_temp.id('ls-a') and alias = 'ls alpha'), 'the dropped name is erased');
select ok(not exists (select from private.fact where thing_id = pg_temp.id('ls-b') and origin = 'source'), 'the facts of an item that left are erased');
select ok(not exists (select from private.number_fact where thing_id = pg_temp.id('ls-a') and removed_at is not null), 'the dropped population is erased');
select is((select count(*)::int from private.thing_alias where origin = 'players' and alias = 'ls player'), 1, 'a player''s name is never erased');

-- Categories the file dropped are kept while a player's miss, an admin's addition or a day from yesterday on uses them.
select private.define_category('ls_extra', 'ls extra', 'oewn', 'ls-root', null);
select private.define_category('ls_day', 'ls day', 'oewn', 'ls-root', null);
select private.define_category('ls_old', 'ls old', 'oewn', 'ls-root', null);
insert into private.miss_review (category, text, outcome, thing_id, players, answered) values ('ls_root', 'ls typed', 'held', null, 3, 3);
insert into private.category_extra (category, thing_id, added_by) values ('ls_extra', pg_temp.id('ls-a'), gen_random_uuid());
insert into private.puzzle (game_id, puzzle_date, content) values
  ('offbeat', private.today() - 1, jsonb_build_object('format', 2, 'game_id', 'offbeat', 'date', (private.today() - 1)::text, 'questions', '[{"category": "ls_day"}]'::jsonb)),
  ('offbeat', private.today() - 2, jsonb_build_object('format', 2, 'game_id', 'offbeat', 'date', (private.today() - 2)::text, 'questions', '[{"category": "ls_old"}]'::jsonb));
select is(private.load_finish(pg_temp.categories(array[]::text[])) - 'at' - 'aliases' - 'facts' - 'links' - 'numbers' - 'renamed',
  '{"categories": ["ls_old"], "kept_categories": ["ls_day", "ls_extra", "ls_root"]}'::jsonb,
  'kept: a player''s miss, an admin''s addition, yesterday''s day; erased: one only an older day names');

select * from finish();
rollback;
